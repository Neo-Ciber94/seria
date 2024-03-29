/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type TrackingPromise,
  trackPromise,
  forEachPromise,
  isTrackingPromise,
} from "../trackingPromise";
import { bufferToBase64, isPlainObject } from "../utils";
import { Tag } from "../tag";
import {
  trackAsyncIterator,
  type TrackingAsyncIterator,
} from "../trackingAsyncIterator";

type SerializeContext = {
  output: unknown[];
  writtenValues: Map<number, unknown>;
  pendingPromisesMap: Map<number, TrackingPromise<any>>;
  pendingAsyncIteratorMap: Map<number, TrackingAsyncIterator<any>>;
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
  const { output, pendingPromises, pendingGenerators } = internal_serialize(
    value,
    {
      replacer,
      space,
    }
  );

  const generatorPromises = pendingGenerators.map(async (gen) => {
    for await (const _ of gen) {
      /* nothing */
    }
  });

  await Promise.all([...pendingPromises, ...generatorPromises]);
  return JSON.stringify(output, null, space);
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
  const { output, pendingPromises, pendingGenerators } = internal_serialize(
    value,
    {
      replacer,
      space,
    }
  );

  return new ReadableStream<string>({
    async start(controller) {
      const json = JSON.stringify(output, null, space);
      controller.enqueue(`${json}\n\n`);

      const resolveGeneratorPromise = pendingGenerators.map(async (gen) => {
        for await (const item of gen) {
          const asyncIteratorOutput = unsafe_writeOutput(
            Tag.AsyncIterator,
            gen.id,
            [item]
          );

          const genJson = JSON.stringify(asyncIteratorOutput, null, space);
          controller.enqueue(`${genJson}\n\n`);
        }
      });

      const resolvePendingPromise = forEachPromise(pendingPromises, {
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

          controller.enqueue(`${promiseJson}\n\n`);
        },
      });

      await Promise.all([resolvePendingPromise, ...resolveGeneratorPromise]);

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
  const pendingAsyncIteratorMap = new Map<number, TrackingAsyncIterator<any>>();
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
          if (isTrackingPromise(input) && input.status.state !== "pending") {
            return serializeResolvedPromise(input, context);
          }

          return serializePromise(input, context);
        } else if (isAsyncIterator(input)) {
          return serializeAsyncIterator(input, context);
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
      case "function":
        throw new Error("Functions cannot be serialized");
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
  const pendingPromises = Array.from(pendingPromisesMap.values());
  const pendingGenerators = Array.from(pendingAsyncIteratorMap.values());

  return { output, pendingPromises, pendingGenerators };
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

// FIXME: Is this even being called?
function serializeResolvedPromise(
  input: TrackingPromise<any>,
  context: SerializeContext
) {
  const id = input.id;
  const status = input.status;

  switch (status.state) {
    case "resolved": {
      const ret = context.encodeValue(status.data);
      context.writtenValues.set(id, ret);
      context.checkWrittenValues(); // Update the values with the new one
      break;
    }
    case "rejected": {
      throw status.error;
    }
    default:
      throw new Error(`Promise still pending: ${id}`);
  }
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

function serializeAsyncIterator(
  input: AsyncGenerator,
  context: SerializeContext
) {
  const id = context.nextId();
  const generator = (async function* () {
    for await (const item of input) {
      const ret = context.encodeValue(item);

      // Push the new generated value
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

  const trackingIterator = trackAsyncIterator(id, generator);
  context.pendingAsyncIteratorMap.set(id, trackingIterator);
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

function isAsyncIterator(value: any): value is AsyncGenerator {
  return (
    value != null &&
    typeof value === "object" &&
    typeof value[Symbol.asyncIterator] === "function"
  );
}
