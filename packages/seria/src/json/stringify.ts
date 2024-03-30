/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type TrackingPromise,
  trackPromise,
  forEachPromise,
} from "../trackingPromise";
import { bufferToBase64, isPlainObject } from "../utils";
import { Tag } from "../tag";
import {
  trackAsyncIterable,
  type TrackingAsyncIterable,
} from "../trackingAsyncIterable";
import { createChannel } from "../channel";

type SerializeContext = {
  output: unknown[];
  writtenValues: Map<number, unknown>;
  pendingPromisesMap: Map<number, TrackingPromise<any>>;
  pendingAsyncIteratorMap: Map<number, TrackingAsyncIterable<any>>;
  space?: string | number;
  nextId: () => number;
  encodeValue: (input: any) => unknown;
  checkWrittenValues: () => void;
};

export type Replacer = (
  value: any,
  context: SerializeContext
) => string | undefined;

/**
 * Converts a value to a json string.
 * @param value The value to convert.
 * @param replacer A function that encode a custom value.
 * @param space Adds indentation, white space to the json values line-breaks.
 * @returns The json string.
 * @throws If the promise contains any promise. Use `stringifyAsync` or `stringifyToStream` to convert value with promises.
 */
export function stringify(
  value: unknown,
  replacer?: Replacer | null,
  space?: number | string
) {
  const { output, pendingPromises, pendingGenerators } = internal_serialize(
    value,
    {
      replacer,
      space,
    }
  );

  if (pendingPromises.length > 0) {
    throw new Error("Serialiation result have pending promises");
  }

  if (pendingGenerators.length > 0) {
    throw new Error("Serialiation result have pending async generators");
  }

  return JSON.stringify(output, null, space);
}

/**
 * Converts a value to a json string and resolve all its promises.
 * @param value The value to convert.
 * @param replacer A function that encode a custom value.
 * @param space Adds indentation, white space to the json values line-breaks.
 * @returns The json string.
 */
export async function stringifyAsync(
  value: unknown,
  replacer?: Replacer | null,
  space?: number | string
) {
  const result = internal_serialize(value, {
    replacer,
    space,
  });

  // We need to resolve promises first in case any return an async iterator
  await Promise.all(result.pendingPromises);

  // Then we drain all the values on the iterators
  const generatorPromises = result.pendingGenerators.map(async (gen) => {
    for await (const _ of gen) {
      // nothing
    }
  });

  await Promise.all(generatorPromises);
  return JSON.stringify(result.output, null, space);
}

/**
 * Convert a value to a `ReadableStream` that stringify each value.
 * @param value The value to convert.
 * @param replacer A function that encode a custom value.
 * @param space Adds indentation, white space to the json values line-breaks.
 * @returns A stream that stringify each value.
 */
export function stringifyToStream(
  value: unknown,
  replacer?: Replacer | null,
  space?: number | string
) {
  const result = internal_serialize(value, {
    replacer,
    space,
  });

  return new ReadableStream<string>({
    async start(controller) {
      const json = JSON.stringify(result.output, null, space);
      const pendingAsyncIteratorsMap = new Map<
        number,
        TrackingAsyncIterable<unknown>
      >();
      controller.enqueue(`${json}\n\n`);

      await forEachPromise(result.pendingPromises, {
        async onResolved({ data, id }) {
          const resolved = trackPromise(id, Promise.resolve(data));

          // `stringifyAsync` with an initial `id`
          // We use the initial to set the promise on the correct slot
          const serializedPromise = internal_serialize(resolved, {
            replacer,
            initialID: id,
          });

          await Promise.all(serializedPromise.pendingPromises);
          const promiseJson = JSON.stringify(
            serializedPromise.output,
            null,
            space
          );

          if (serializedPromise.pendingGenerators.length > 0) {
            for (const gen of serializedPromise.pendingGenerators) {
              pendingAsyncIteratorsMap.set(gen.id, gen);
            }
          }

          controller.enqueue(`${promiseJson}\n\n`);
        },
      });

      if (result.pendingGenerators.length > 0) {
        for (const gen of result.pendingGenerators) {
          pendingAsyncIteratorsMap.set(gen.id, gen);
        }
      }

      const pendingAsyncIterators = Array.from(
        pendingAsyncIteratorsMap.values()
      );

      const resolveGeneratorPromise = pendingAsyncIterators.map(
        async (iter) => {
          for await (const item of iter) {
            const asyncIteratorOutput = unsafe_writeOutput(
              Tag.AsyncIterator,
              iter.id,
              [item]
            );

            const genJson = JSON.stringify(asyncIteratorOutput, null, space);
            controller.enqueue(`${genJson}\n\n`);
          }
        }
      );

      await Promise.all(resolveGeneratorPromise);
      controller.close();
    },
  });
}

/**
 * @internal
 */
export function internal_serialize(
  value: unknown,
  opts: {
    replacer?: Replacer | null;
    initialID?: number;
    space?: number | string;
  }
) {
  const { replacer, space, initialID = 1 } = opts;
  const writtenValues = new Map<number, unknown>();
  const pendingPromisesMap = new Map<number, TrackingPromise<any>>();
  const pendingAsyncIteratorMap = new Map<number, TrackingAsyncIterable<any>>();
  const output: unknown[] = [];
  let id = initialID;

  // Get the next id
  const nextId = () => {
    return id++;
  };

  // Update the references of the written values
  const checkWrittenValues = () => {
    for (const [id, value] of writtenValues) {
      output[id] = value;
    }
  };

  const context: SerializeContext = {
    output,
    writtenValues,
    pendingPromisesMap,
    pendingAsyncIteratorMap,
    space,
    nextId,
    encodeValue,
    checkWrittenValues,
  };

  function encodeValue(input: any) {
    // Custom serializer
    if (replacer) {
      const serialized = replacer(input, context);
      if (serialized !== undefined) {
        return serialized;
      }
    }

    // Default serializer
    switch (typeof input) {
      case "string":
        return `$$${input}`;
      case "boolean":
        return input;
      case "number":
        return serializeNumber(input);
      case "symbol":
        return serializeSymbol(input);
      case "undefined":
        return "$undefined";
      case "bigint":
        return serializeBigInt(input);
      case "object": {
        if (input === null) {
          return null;
        } else if (input instanceof Date) {
          return serializeDate(input);
        } else if (input instanceof Map) {
          return serializeMap(input, context);
        } else if (input instanceof Set) {
          return serializeSet(input, context);
        } else if (Array.isArray(input)) {
          return serializeArray(input, context);
        } else if (isPlainObject(input)) {
          return serializePlainObject(input, context);
        } else if (input instanceof Promise) {
          return serializePromise(input, context);
        } else if (isAsyncIterable(input)) {
          return serializeAsyncIterable(input, context);
        }
        // Serialize typed arrrays
        else if (input instanceof ArrayBuffer) {
          return serializeArrayBuffer(input, context);
        } else if (input instanceof Int8Array) {
          return serializeTypedArray(Tag.Int8Array, input, context);
        } else if (input instanceof Uint8Array) {
          return serializeTypedArray(Tag.Uint8Array, input, context);
        } else if (input instanceof Uint8ClampedArray) {
          return serializeTypedArray(Tag.Uint8ClampedArray, input, context);
        } else if (input instanceof Int16Array) {
          return serializeTypedArray(Tag.Int16Array, input, context);
        } else if (input instanceof Uint16Array) {
          return serializeTypedArray(Tag.Uint16Array, input, context);
        } else if (input instanceof Int32Array) {
          return serializeTypedArray(Tag.Int32Array, input, context);
        } else if (input instanceof Uint32Array) {
          return serializeTypedArray(Tag.Uint32Array, input, context);
        } else if (input instanceof Float32Array) {
          return serializeTypedArray(Tag.Float32Array, input, context);
        } else if (input instanceof Float64Array) {
          return serializeTypedArray(Tag.Float64Array, input, context);
        } else if (input instanceof BigInt64Array) {
          return serializeTypedArray(Tag.BigInt64Array, input, context);
        } else if (input instanceof BigUint64Array) {
          return serializeTypedArray(Tag.BigUint64Array, input, context);
        } else if (input instanceof DataView) {
          return serializeTypedArray(Tag.DataView, input, context);
        } else {
          throw new Error(
            `Unable to serialize value: ${JSON.stringify(input)}`
          );
        }
      }
      case "function": {
        throw new Error("Functions cannot be serialized");
      }
      default:
        throw new Error(
          `Unreachable. Reaching this code should be considered a bug`
        );
    }
  }

  // The base value contains all the references ids
  const baseValue = encodeValue(value);
  output[0] = baseValue;

  checkWrittenValues();

  return {
    output,
    get pendingPromises() {
      return Array.from(pendingPromisesMap.values());
    },
    get pendingGenerators() {
      return Array.from(pendingAsyncIteratorMap.values());
    },
  };
}

function serializeNumber(input: number) {
  if (Number.isFinite(input)) {
    if (input === 0 && 1 / input === -Infinity) {
      return serializeTagValue(Tag.NegativeZero);
    } else {
      return input;
    }
  } else {
    if (input === Infinity) {
      return serializeTagValue(Tag.Infinity_);
    } else if (input === -Infinity) {
      return serializeTagValue(Tag.NegativeInfinity);
    } else {
      return serializeTagValue(Tag.NaN_);
    }
  }
}

function serializeSymbol(input: symbol) {
  return serializeTagValue(Tag.Symbol, input.description);
}

function serializeBigInt(input: bigint) {
  return serializeTagValue(Tag.BigInt, String(input));
}

function serializeDate(input: Date) {
  return serializeTagValue(Tag.Date, input.toJSON());
}

function serializeArray(input: Array<any>, context: SerializeContext) {
  const items: unknown[] = [];

  for (const val of input) {
    items.push(context.encodeValue(val));
  }

  return items;
}

function serializeSet(input: Set<any>, context: SerializeContext) {
  const { writtenValues: referencesMap } = context;
  const items: unknown[] = [];

  for (const val of input) {
    items.push(context.encodeValue(val));
  }

  const id = context.nextId();
  referencesMap.set(id, items);
  return serializeTagValue(Tag.Set, id);
}

function serializeMap(input: Map<any, any>, context: SerializeContext) {
  const { writtenValues: referencesMap } = context;
  const items: [unknown, unknown][] = [];

  for (const [k, v] of input) {
    const encodedKey = context.encodeValue(k);
    const encodedValue = context.encodeValue(v);
    items.push([encodedKey, encodedValue]);
  }

  const id = context.nextId();
  referencesMap.set(id, items);
  return serializeTagValue(Tag.Map, id);
}

function serializePlainObject(
  input: Record<string, unknown>,
  context: SerializeContext
) {
  const obj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    obj[key] = context.encodeValue(value);
  }

  return obj;
}

function serializePromise(input: Promise<any>, context: SerializeContext) {
  const id = context.nextId();

  // We create a new promise that resolve to the serialized value
  const resolvingPromise = input.then((value) => {
    const ret = context.encodeValue(value);
    context.writtenValues.set(id, ret);
    context.checkWrittenValues(); // Update the values with the new one
    return value;
  });

  const trackingPromise = trackPromise(id, resolvingPromise);
  context.pendingPromisesMap.set(id, trackingPromise);
  return serializeTagValue(Tag.Promise, id);
}

function serializeArrayBuffer(input: ArrayBuffer, context: SerializeContext) {
  return serializeTypedArray(Tag.ArrayBuffer, new Uint8Array(input), context);
}

function serializeTypedArray(
  tag: Tag,
  input: ArrayBufferView,
  context: SerializeContext
) {
  const id = context.nextId();
  const buffer = bufferToBase64(input.buffer);
  context.writtenValues.set(id, buffer);
  return serializeTagValue(tag, id);
}

function serializeAsyncIterable(
  input: AsyncIterable<unknown>,
  context: SerializeContext
) {
  const id = context.nextId();
  const [sender, receiver] = createChannel({ id: 1 });

  // We emit the iterable to the receiver and flatten any nested async iterable.
  // TODO: Check if this behaviour makes sense or we should:
  // 1. Throw an exception and don't handle nested async iterables
  // 2. Try to parse nested async iterables
  async function playbackAsyncIterable(iter: AsyncIterable<unknown>) {
    for await (const item of iter) {
      if (isAsyncIterable(item)) {
        await playbackAsyncIterable(item);
      } else {
        sender.send(item);
      }
    }
  }

  const generator = (async function* () {
    // for await (const item of input) {
    //   const ret = context.encodeValue(item);

    //   // Push the new generated value
    //   const items = [...((context.output[id] as any[]) || []), ret];
    //   context.writtenValues.set(id, items);
    //   context.checkWrittenValues();
    //   yield ret;
    // }

    try {
      await playbackAsyncIterable(input);
    } finally {
      sender.close();
    }

    for await (const item of receiver) {
      const ret = context.encodeValue(item);
      const items = [...((context.output[id] as any[]) || []), ret];
      context.writtenValues.set(id, items);
      context.checkWrittenValues();
      yield ret;
    }

    // Notify is done
    const items = [...((context.output[id] as any[]) || []), "done"];
    context.writtenValues.set(id, items);
    context.checkWrittenValues();
    yield "done";
  })();

  const tracked = trackAsyncIterable(id, generator);
  context.pendingAsyncIteratorMap.set(id, tracked);
  return serializeTagValue(Tag.AsyncIterator, id);
}

/**
 * @internal
 */
export function serializeTagValue(tag: Tag, value?: number | string) {
  return value ? `$${tag}${value}` : `$${tag}`;
}

function unsafe_writeOutput(tag: Tag, id: number, value: unknown) {
  const output: unknown[] = [serializeTagValue(tag, id)];
  output[id] = value;
  return output;
}

function isAsyncIterable(value: any): value is AsyncIterable<unknown> {
  return value != null && typeof value[Symbol.asyncIterator] === "function";
}
