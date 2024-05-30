/* eslint-disable @typescript-eslint/no-explicit-any */
import { serialize } from "v8";
import { createChannel, type Sender } from "../channel";
import { deferredPromise, type DeferredPromise } from "../deferredPromise";
import { SeriaError } from "../error";
import { Tag, isTypedArrayTag } from "../tag";
import {
  isTrackingAsyncIterable,
  trackAsyncIterable,
} from "../trackingAsyncIterable";
import { isTrackingPromise, trackPromise } from "../trackingPromise";
import { base64ToBuffer, isPlainObject } from "../utils";

type Context = {
  references: readonly unknown[];
};

/**
 * A function that convert a value.
 */
export type Revivers = {
  [tag: string]: (value: any) => unknown;
}

/**
 * Parse a `json` string to a value.
 * @param value The `json` value to parse.
 * @param revivers A function to convert a value.
 * @returns The parsed value.
 */
export function parse(value: string, revivers?: Revivers): unknown {
  const result = internal_parse(value, { revivers });
  return result.data;
}

/**
 * Takes a stream and parse each value until it resolves.
 * @param stream The stream to parse.
 * @param revivers A function to convert a value.
 * @returns A promise that resolve to the parsed value.
 */
export async function parseFromStream(
  stream: ReadableStream<string>,
  revivers?: Revivers
) {
  const reader = internal_parseFromStream(stream, revivers).getReader();
  let resolved = false;
  const deferred = deferredPromise();

  void Promise.resolve().then(async () => {
    const promises: Promise<any>[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done || value === undefined) {
        break;
      }

      if (!resolved) {
        resolved = true;
        deferred.resolve(value);
      }

      if (value instanceof Promise) {
        promises.push(value);
      }
    }

    if (!resolved) {
      deferred.reject(new SeriaError("Unable to find resolved value"));
    }

    await Promise.all(promises);
  });

  return deferred.promise;
}

/**
 * @internal
 */
export function internal_parseFromStream(
  stream: ReadableStream<string>,
  reviver?: Revivers
) {
  const promisesMap = new Map<number, DeferredPromise<unknown>>();
  const channelsMap = new Map<number, Sender<unknown>>();
  const reader = stream.getReader();

  return new ReadableStream<unknown>({
    async start(controller) {
      async function processChunk(jsonChunk: string) {
        const { data, pendingPromises, pendingChannels } = internal_parse(
          jsonChunk,
          {
            deferPromises: true,
            revivers: reviver,
          }
        );

        // Send the value
        controller.enqueue(data);

        // Handle promises
        {
          for (const [id, deferred] of pendingPromises.entries()) {
            promisesMap.set(id, deferred);
          }

          // Resolve a pending promise
          if (isTrackingPromise(data)) {
            const deferred = promisesMap.get(data.id);

            if (!deferred) {
              throw new SeriaError(`Promise with id: '${data.id}' was not found`);
            }

            try {
              const returnValue = await data;
              deferred.resolve(returnValue);
            } catch (err) {
              deferred.reject(err);
            }
          }
        }

        // Handle async iterators
        {
          if (pendingChannels.size > 0) {
            for (const [id, channelSender] of pendingChannels.entries()) {
              channelsMap.set(id, channelSender);
            }
          }

          if (isTrackingAsyncIterable(data)) {
            const sender = channelsMap.get(data.id);

            if (!sender) {
              throw new SeriaError(
                `AsyncIterator sender with id '${data.id}' was not found`
              );
            }

            const isDone = data.context === "done";
            for await (const item of data) {
              sender.send(item);
            }

            if (isDone) {
              sender.close();
            }
          }
        }
      }

      while (true) {
        const { done, value: raw } = await reader.read();
        if (done || raw === undefined) {
          break;
        }

        const chunks = raw.split("\n\n").filter(Boolean);

        // We process all chunks at once if possible
        if (chunks.length > 1) {
          const promises = chunks.map(processChunk);
          await Promise.all(promises);
        } else {
          await processChunk(chunks[0]);
        }
      }

      controller.close();
    },
  });
}

type Options = {
  deferPromises?: boolean;
  revivers?: Revivers;
};

function internal_parse(value: string, opts?: Options) {
  const { deferPromises = false, revivers } = opts || {};
  const pendingPromises = new Map<number, DeferredPromise<unknown>>();
  const pendingChannels = new Map<number, Sender<unknown>>();
  const references = new Map<number, any>();

  const { indices, base } = (function () {
    try {
      const indices = JSON.parse(value) as readonly unknown[];
      return { indices, base: indices[0] };
    } catch {
      throw new SeriaError(`Failed to parse base value: ${value}`);
    }
  })();

  const deserialize = (input: any): unknown => {
    switch (typeof input) {
      case "number":
        return input;
      case "boolean":
        return input;
      case "string": {
        if (input[0] === "$") {
          const maybeTag = input.slice(1);

          // Custom keys are in the form of: `$_{key}_`
          if (revivers && maybeTag.startsWith("_")) {
            const type = maybeTag.slice(1, maybeTag.lastIndexOf("_"))
            const reviver = revivers[type];

            if (reviver == null) {
              throw new SeriaError(`Reviver for key '${type}' was not found`)
            }

            const rawId = maybeTag.slice(type.length + 2)
            const id = parseTagId(rawId);
            const val = deserialize(indices[id]);
            return reviver(val);
          }

          switch (true) {
            case maybeTag[0] === Tag.String: {
              return input.slice(2);
            }
            case maybeTag[0] === Tag.Symbol: {
              return Symbol.for(input.slice(2));
            }
            case maybeTag[0] === Tag.Date: {
              return new Date(input.slice(2));
            }
            case maybeTag[0] === Tag.BigInt: {
              return BigInt(input.slice(2));
            }
            case maybeTag === Tag.Undefined: {
              return undefined;
            }
            case maybeTag === Tag.Infinity_: {
              return Infinity;
            }
            case maybeTag === Tag.NegativeInfinity: {
              return -Infinity;
            }
            case maybeTag === Tag.NegativeZero: {
              return -0;
            }
            case maybeTag === Tag.NaN_: {
              return NaN;
            }
            case maybeTag[0] === Tag.Set: {
              const id = parseTagId(input.slice(2));
              const set = new Set<any>();
              const values = indices[id];

              if (values && Array.isArray(values)) {
                for (const item of values) {
                  set.add(deserialize(item));
                }
              }

              return set;
            }
            case maybeTag[0] === Tag.Map: {
              const id = parseTagId(input.slice(2));
              const map = new Map<any, any>();
              const values = indices[id];

              if (values && Array.isArray(values)) {
                for (const [key, value] of values) {
                  const decodedKey = deserialize(key);
                  const decodedValue = deserialize(value);
                  map.set(decodedKey, decodedValue);
                }
              }

              return map;
            }
            case maybeTag[0] === Tag.Object: {
              const id = parseTagId(input.slice(2));
              if (references.has(id)) {
                return references.get(id)
              }

              const value = indices[id];
              const obj: Record<string, unknown> = {};
              references.set(id, obj);

              if (isPlainObject(value)) {
                for (const [k, v] of Object.entries(value)) {
                  obj[k] = deserialize(v);
                }
              }

              return obj;
            }
            case maybeTag[0] === Tag.Array: {
              const id = parseTagId(input.slice(2));
              const arr: any[] = [];
              const values = indices[id];

              if (Array.isArray(values)) {
                for (const item of values) {
                  arr.push(deserialize(item));
                }
              }

              return arr;
            }
            case maybeTag[0] === Tag.Promise: {
              const id = parseTagId(input.slice(2));
              const rawValue = indices[id];

              if (rawValue === undefined) {
                if (deferPromises) {
                  const deferred = deferredPromise();
                  pendingPromises.set(id, deferred);
                  return deferred.promise;
                }

                throw new SeriaError("Failed to find promise resolved value");
              }

              try {
                const resolvedValue = deserialize(rawValue);
                return trackPromise(id, Promise.resolve(resolvedValue));
              } catch {
                throw new SeriaError("Unable to resolve promise value");
              }
            }
            case maybeTag[0] === Tag.AsyncIterator: {
              const id = parseTagId(input.slice(2));
              const asyncIteratorValues = indices[id];

              if (!asyncIteratorValues) {
                const [sender, receiver] = createChannel({ id });
                pendingChannels.set(id, sender);
                return receiver;
              }

              if (Array.isArray(asyncIteratorValues)) {
                const length = asyncIteratorValues.length - 1;
                const isDone = asyncIteratorValues[length] === "done";

                const values = isDone
                  ? asyncIteratorValues.slice(0, -1)
                  : asyncIteratorValues;

                const generator = (async function* () {
                  for (const item of values) {
                    const resolvedValue = deserialize(item);
                    yield resolvedValue;
                  }
                })();

                const trackedAsyncIterator = trackAsyncIterable(
                  id,
                  generator,
                  isDone ? "done" : undefined
                );

                return trackedAsyncIterator;
              } else {
                throw new SeriaError(
                  "Failed to parse async iterator, expected array of values"
                );
              }
            }
            case isTypedArrayTag(maybeTag[0]): {
              return deserializeBuffer(maybeTag[0], input, {
                references: indices,
              });
            }
            default:
              {
                throw new SeriaError(`Unknown value: ${input}`);
              }
          }
        } else {
          throw new SeriaError(`Invalid reference value: ${input}`);
        }
      }
      case "object": {
        if (input === null) {
          return null;
        } else if (Array.isArray(input)) {
          const arr: any[] = [];
          for (const item of input) {
            arr.push(deserialize(item));
          }
          return arr;
        } else if (isPlainObject(input)) {
          const obj: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(input)) {
            obj[key] = deserialize(value);
          }

          return obj;
        } else {
          throw new SeriaError(`Invalid object value: ${JSON.stringify(input)}`);
        }
      }
      default:
        throw new SeriaError(`Invalid value: ${input}`);
    }
  };

  const data = deserialize(base);
  return { data, pendingPromises, pendingChannels };
}

function deserializeBuffer(tag: Tag, input: string, context: Context) {
  const getBufferData = () => {
    const id = parseTagId(input.slice(2));
    const data = context.references[id];
    if (!data) {
      throw new SeriaError(`Unable to get '${input}' buffer data`);
    }
    return String(data);
  };

  switch (tag) {
    case Tag.ArrayBuffer: {
      const bytes = base64ToBuffer(getBufferData(), Uint8Array);
      return bytes.buffer;
    }
    case Tag.Int8Array:
      return base64ToBuffer(getBufferData(), Int8Array);
    case Tag.Uint8Array:
      return base64ToBuffer(getBufferData(), Uint8Array);
    case Tag.Uint8ClampedArray:
      return base64ToBuffer(getBufferData(), Uint8ClampedArray);
    case Tag.Int16Array:
      return base64ToBuffer(getBufferData(), Int16Array);
    case Tag.Uint16Array:
      return base64ToBuffer(getBufferData(), Uint16Array);
    case Tag.Int32Array:
      return base64ToBuffer(getBufferData(), Int32Array);
    case Tag.Uint32Array:
      return base64ToBuffer(getBufferData(), Uint32Array);
    case Tag.Float32Array:
      return base64ToBuffer(getBufferData(), Float32Array);
    case Tag.Float64Array:
      return base64ToBuffer(getBufferData(), Float64Array);
    case Tag.BigInt64Array: {
      const bytes = base64ToBuffer(getBufferData(), Uint8Array);
      return new BigInt64Array(bytes.buffer);
    }
    case Tag.BigUint64Array: {
      const bytes = base64ToBuffer(getBufferData(), Uint8Array);
      return new BigUint64Array(bytes.buffer);
    }
    case Tag.DataView: {
      const bytes = base64ToBuffer(getBufferData(), Uint8Array);
      return new DataView(bytes.buffer);
    }
    default:
      throw new SeriaError(`Unknown typed array buffer: ${input}`);
  }
}

function parseTagId(input: string) {
  const id = parseInt(input);

  if (!Number.isFinite(id) || Number.isNaN(id)) {
    throw new SeriaError(`Invalid tag id: '${input}'`);
  }

  return id;
}
