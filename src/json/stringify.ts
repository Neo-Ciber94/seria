/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type TrackingPromise,
  trackPromise,
  forEachPromise,
  isTrackingPromise,
} from "../trackingPromise";
import { bufferToBase64, isPlainObject } from "../utils";
import { Tag } from "../tag";

type Context = {
  output: string[];
  referencesMap: Map<number, string>;
  pendingPromisesMap: Map<number, TrackingPromise<any>>;
  nextId: () => number;
  serializeToString: (input: any) => string;
  encodeValue: (input: any) => unknown;
};

export type Replacer = (value: any, context: Context) => string | undefined;

/**
 * Converts a value to a json string.
 * @param value The value to convert.
 * @param replacer A function that encode a custom value.
 * @returns The json string.
 * @throws If the promise contains any promise. Use `stringifyWithPromises` or `stringifyToStream`
 * to convert value with promises.
 */
export function stringify(value: unknown, replacer?: Replacer) {
  const { output, pendingPromises } = internal_serialize(value, { replacer });

  if (pendingPromises.length > 0) {
    throw new Error("Serialiation result have pending promises");
  }

  return JSON.stringify(output);
}

/**
 * Converts a value to a json string and resolve all its promises.
 * @param value The value to convert.
 * @param replacer A function that encode a custom value.
 * @returns The json string.
 */
export async function stringifyWithPromises(
  value: unknown,
  replacer?: Replacer
) {
  const { output, pendingPromises } = internal_serialize(value, { replacer });
  await Promise.all(pendingPromises);
  return JSON.stringify(output);
}

/**
 * Convert a value to a `ReadableStream` that stringify each value.
 * @param value The value to convert.
 * @param replacer A function that encode a custom value.
 * @returns A stream that stringify each value.
 */
export function stringifyToStream(value: unknown, replacer?: Replacer) {
  const { output, pendingPromises } = internal_serialize(value, { replacer });
  return new ReadableStream<string>({
    async start(controller) {
      controller.enqueue(JSON.stringify(output));

      await forEachPromise(pendingPromises, {
        async onResolved({ data, id }) {
          const resolved = trackPromise(id, Promise.resolve(data));

          // `stringifyWithPromises` with an initial `id`
          // We use the initial to set the promise on the correct array slot
          const { output, pendingPromises } = internal_serialize(resolved, {
            replacer,
            initialID: id,
          });

          await Promise.all(pendingPromises);
          const str = JSON.stringify(output);
          controller.enqueue(str);
        },
      });

      controller.close();
    },
  });
}

/**
 * @internal
 */
export function internal_serialize(
  value: unknown,
  opts: { replacer?: Replacer; initialID?: number }
) {
  const { replacer, initialID = 1 } = opts;
  const referencesMap = new Map<number, string>();
  const pendingPromisesMap = new Map<number, TrackingPromise<any>>();
  const output: string[] = [];
  let id = initialID;

  const nextId = () => {
    return id++;
  };

  const context: Context = {
    output,
    referencesMap,
    pendingPromisesMap,
    nextId,
    serializeToString,
    encodeValue,
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
        throw new Error("Functions cannot be serialized as action payload");
      default:
        throw new Error(
          `Unreachable. Reaching this code should be considered a bug`
        );
    }
  }

  // The encoded value should be able to be decoded back with JSON.parse
  function serializeToString(input: any): string {
    const value = encodeValue(input);
    return JSON.stringify(value);
  }

  // The base value contains all the references ids
  const baseValue = serializeToString(value);
  output[0] = baseValue;

  // Set each reference value
  for (const [id, value] of referencesMap) {
    output[id] = value;
  }

  const pendingPromises = Array.from(pendingPromisesMap.values());

  return { output, pendingPromises };
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

function serializeArray(input: Array<any>, context: Context) {
  const items: unknown[] = [];

  for (const val of input) {
    items.push(context.encodeValue(val));
  }

  return items;
}

function serializeSet(input: Set<any>, context: Context) {
  const { referencesMap } = context;
  const items: unknown[] = [];

  for (const val of input) {
    items.push(context.encodeValue(val));
  }

  const id = context.nextId();
  referencesMap.set(id, JSON.stringify(items));
  return serializeTagValue(Tag.Set, id);
}

function serializeMap(input: Map<any, any>, context: Context) {
  const { referencesMap } = context;
  const items: [unknown, unknown][] = [];

  for (const [k, v] of input) {
    const encodedKey = context.encodeValue(k);
    const encodedValue = context.encodeValue(v);
    items.push([encodedKey, encodedValue]);
  }

  const id = context.nextId();
  referencesMap.set(id, JSON.stringify(items));
  return serializeTagValue(Tag.Map, id);
}

function serializePlainObject(
  input: Record<string, unknown>,
  context: Context
) {
  const obj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    obj[key] = context.encodeValue(value);
  }

  return obj;
}

function serializePromise(input: Promise<any>, context: Context) {
  const id = context.nextId();

  // We create a new promise that resolve to the serialized value
  void input.then((value) => {
    const ret = context.serializeToString(value);
    context.referencesMap.set(id, ret);
    context.output[id] = ret;
  });

  const trackingPromise = trackPromise(id, input);
  context.pendingPromisesMap.set(id, trackingPromise);
  return serializeTagValue(Tag.Promise, id);
}

function serializeResolvedPromise(
  input: TrackingPromise<any>,
  context: Context
) {
  const id = input.id;
  const status = input.status;

  switch (status.state) {
    case "resolved": {
      const ret = context.serializeToString(status.data);
      context.referencesMap.set(id, ret);
      context.output[id] = status.data;
      break;
    }
    case "rejected": {
      throw status.error;
    }
    default:
      throw new Error(`Promise still pending: ${id}`);
  }
}

function serializeArrayBuffer(input: ArrayBuffer, context: Context) {
  return serializeTypedArray(Tag.ArrayBuffer, new Uint8Array(input), context);
}

function serializeTypedArray(
  tag: Tag,
  input: ArrayBufferView,
  context: Context
) {
  const id = context.nextId();
  const buffer = bufferToBase64(input.buffer);
  context.referencesMap.set(id, buffer);
  return serializeTagValue(tag, id);
}

function serializeTagValue(tag: Tag, value?: number | string) {
  return value ? `$${tag}${value}` : `$${tag}`;
}
