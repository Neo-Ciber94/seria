/* eslint-disable @typescript-eslint/no-explicit-any */
import { deferredPromise, type DeferredPromise } from "../deferredPromise";
import { Tag, isTypedArray } from "../tag";
import { isTrackingPromise, trackPromise } from "../trackingPromise";
import { base64ToBuffer, isPlainObject } from "../utils";

type Context = {
  references: readonly string[];
};

/**
 * A function that convert a value.
 */
export type Reviver = (value: any) => any | undefined;

/**
 * Parse a `json` string to a value.
 * @param value The `json` value to parse.
 * @param reviver A function to convert a value.
 * @returns The parsed value.
 */
export function parse(value: string, reviver?: Reviver): unknown {
  const result = internal_parseValue(value, { reviver });
  return result.data;
}

/**
 * Takes a stream and parse each value until it resolves.
 * @param stream The stream to parse.
 * @param reviver A function to convert a value.
 * @returns A promise that resolve to the parsed value.
 */
export async function parseFromStream(
  stream: ReadableStream<string>,
  reviver?: Reviver
) {
  const reader = internal_parseFromStream(stream, reviver).getReader();
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
      deferred.reject(new Error("Unable to find resolved value"));
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
  reviver?: Reviver
) {
  const promisesMap = new Map<number, DeferredPromise<unknown>>();
  const reader = stream.getReader();

  return new ReadableStream<unknown>({
    async start(controller) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value: json } = await reader.read();
        if (done || json === undefined) {
          break;
        }

        const { data, pendingPromises } = internal_parseValue(json, {
          deferPromises: true,
          reviver,
        });

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
              throw new Error(`Promise with id: '${data.id}' was not found`);
            }

            try {
              const returnValue = await data;
              deferred.resolve(returnValue);
            } catch (err) {
              deferred.reject(err);
            }
          }
        }
      }

      controller.close();
    },
  });
}

type Options = {
  deferPromises?: boolean;
  reviver?: Reviver;
};

function internal_parseValue(value: string, opts?: Options) {
  const { deferPromises = false, reviver } = opts || {};
  const pendingPromises = new Map<number, DeferredPromise<unknown>>();
  const { references, base } = (function () {
    try {
      const references = JSON.parse(value) as readonly string[];
      const base = JSON.parse(references[0]!);
      return { references, base };
    } catch {
      throw new Error(`Failed to parse base value: ${value}`);
    }
  })();

  const deserizalizeValue = (input: any): unknown => {
    if (reviver) {
      const ret = reviver(input);
      if (ret !== undefined) {
        return ret;
      }
    }

    switch (typeof input) {
      case "number":
        return input;
      case "boolean":
        return input;
      case "string": {
        if (input[0] === "$") {
          const tag = input.slice(1);

          switch (true) {
            case tag[0] === Tag.String: {
              return input.slice(2);
            }
            case tag[0] === Tag.Symbol: {
              return Symbol.for(input.slice(2));
            }
            case tag[0] === Tag.Date: {
              return new Date(input.slice(2));
            }
            case tag[0] === Tag.BigInt: {
              return BigInt(input.slice(2));
            }
            case tag === Tag.Undefined: {
              return undefined;
            }
            case tag === Tag.Infinity_: {
              return Infinity;
            }
            case tag === Tag.NegativeInfinity: {
              return -Infinity;
            }
            case tag === Tag.NegativeZero: {
              return -0;
            }
            case tag === Tag.NaN_: {
              return NaN;
            }
            case tag[0] === Tag.Set: {
              const id = parseTagId(input.slice(2));
              const set = new Set<any>();

              try {
                const values = references[id];
                if (values) {
                  const data = JSON.parse(values); // This is stored as an Array<string>
                  if (Array.isArray(data)) {
                    for (const item of data) {
                      set.add(deserizalizeValue(item));
                    }
                  }
                }
              } catch (err) {
                // failed to parse
                console.error(err);
              }

              return set;
            }
            case tag[0] === Tag.Map: {
              const id = parseTagId(input.slice(2));
              const map = new Map<any, any>();

              try {
                const values = references[id];
                if (values) {
                  const data = JSON.parse(values); // This is stored as an Array<[string, string]>
                  if (Array.isArray(data)) {
                    for (const [key, value] of data) {
                      const decodedKey = deserizalizeValue(key);
                      const decodedValue = deserizalizeValue(value);
                      map.set(decodedKey, decodedValue);
                    }
                  }
                }
              } catch (err) {
                // failed to parse
                console.error(err);
              }

              return map;
            }
            case tag[0] === Tag.Promise: {
              const id = parseTagId(input.slice(2));
              const rawValue = references[id];

              if (!rawValue) {
                if (deferPromises) {
                  const deferred = deferredPromise();
                  pendingPromises.set(id, deferred);
                  return trackPromise(id, deferred.promise);
                }

                throw new Error("Failed to find promise resolved value");
              }

              try {
                const resolvedValue = deserizalizeValue(JSON.parse(rawValue));
                return trackPromise(id, Promise.resolve(resolvedValue));
              } catch {
                throw new Error("Unable to resolve promise value");
              }
            }
            case isTypedArray(tag[0]): {
              return deserializeBuffer(tag[0], input, {
                references,
              });
            }
            default:
              throw new Error(`Unknown reference value: ${input}`);
          }
        } else {
          throw new Error(`Invalid reference value: ${input}`);
        }
      }
      case "object": {
        if (input === null) {
          return null;
        } else if (Array.isArray(input)) {
          const arr: any[] = [];
          for (const item of input) {
            arr.push(deserizalizeValue(item));
          }
          return arr;
        } else if (isPlainObject(input)) {
          const obj: Record<string, unknown> = {};

          for (const [key, value] of Object.entries(input)) {
            obj[key] = deserizalizeValue(value);
          }

          return obj;
        } else {
          throw new Error(`Invalid object value: ${JSON.stringify(input)}`);
        }
      }
      default:
        throw new Error(`Invalid value: ${input}`);
    }
  };

  const data = deserizalizeValue(base);
  return { data, pendingPromises };
}

function deserializeBuffer(tag: Tag, input: string, context: Context) {
  const getBufferData = () => {
    const id = parseTagId(input.slice(2));
    const data = context.references[id];
    if (!data) {
      throw new Error(`Unable to get '${input}' buffer data`);
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
      throw new Error(`Unknown typed array buffer: ${input}`);
  }
}

function parseTagId(input: string) {
  const id = parseInt(input);

  if (!Number.isFinite(id) || Number.isNaN(id)) {
    throw new Error(`Invalid tag id: '${input}'`);
  }

  return id;
}
