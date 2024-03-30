/* eslint-disable @typescript-eslint/no-explicit-any */

import { Tag, isTypedArrayTag } from "../tag";
import {
  type Replacer,
  internal_serialize,
  serializeTagValue,
} from "../json/stringify";
import { type Reviver } from "../json/parse";
import { isPlainObject } from "../utils";
import { base64ToBuffer } from "../utils";

// The browser `FormData` is assignable to this one
import type { FormData as UndiciFormData } from "undici";

/**
 * Encodes a value into a `FormData`.
 * @param value The value to encode.
 * @param replacer Converts a value to string.
 * @returns The value encoded as `FormData`.
 * @throws If the value is or have any promise.
 */
export function encode(value: unknown, replacer?: Replacer): FormData {
  const formData = new FormData();
  const { output, pendingPromises, pendingIterators } = internal_encodeFormData(
    value,
    {
      formData,
      replacer,
    }
  );

  if (pendingPromises.length > 0) {
    throw new Error("Serialiation result have pending promises");
  }

  if (pendingIterators.length > 0) {
    throw new Error("Serialiation result have pending async iterators");
  }

  for (let i = 0; i < output.length; i++) {
    formData.set(String(i), JSON.stringify(output[i]));
  }

  return formData;
}

/**
 * Encodes a value into a `FormData`, resolving all it's promises if any.
 * @param value The value to encode.
 * @param replacer Converts a value to string.
 * @returns The value encoded as `FormData`.
 */
export async function encodeAsync(
  value: unknown,
  replacer?: Replacer
): Promise<FormData> {
  const formData = new FormData();
  const result = internal_encodeFormData(value, {
    formData,
    replacer,
  });

  await Promise.all(result.pendingPromises);

  // Then we drain all the values on the async iterators
  const iteratorPromises = result.pendingIterators.map(async (iter) => {
    for await (const _ of iter) {
      // nothing
    }
  });

  await Promise.all(iteratorPromises);

  for (let i = 0; i < result.output.length; i++) {
    formData.set(String(i), JSON.stringify(result.output[i]));
  }

  return formData;
}

function internal_encodeFormData(
  value: unknown,
  opts: {
    formData: FormData;
    replacer?: Replacer;
  }
) {
  const { formData, replacer: _replacer } = opts;
  return internal_serialize(value, {
    replacer: (input, ctx) => {
      if (_replacer) {
        const ret = _replacer(input, ctx);
        if (ret !== undefined) {
          return ret;
        }
      }

      if (input instanceof FormData) {
        const id = ctx.nextId();

        for (const [key, entry] of input) {
          const fieldName = `${id}_${key}`;
          formData.set(fieldName, entry);
        }

        return serializeTagValue(Tag.FormData, id);
      }

      if (input instanceof File) {
        const id = ctx.nextId();
        formData.set(`${id}_file`, input);
        return serializeTagValue(Tag.File, id);
      }

      return undefined;
    },
  });
}

// Inspired on: https://github.com/facebook/react/blob/1293047d6063f3508af15e68cca916660ded791e/packages/react-server/src/ReactFlightReplyServer.js#L379-L380

type DecodeContext = {
  references: FormData;
};

type DecodeOptions = {
  /**
   * Custom type constructors to use.
   */
  types?: {
    /**
     * `FormData` constructor, this defaults to `globalThis.FormData`.
     */
    FormData: typeof UndiciFormData;
  };
};

/**
 * Decode a `FormData` into a value.
 * @param value The formData to decode.
 * @param reviver Converts a value.
 * @returns The decoded value.
 */
export function decode(
  value: FormData,
  reviver?: Reviver | null,
  opts?: DecodeOptions
): unknown {
  const { types } = opts || {};
  const { FormData: FormDataConstructor = globalThis.FormData } = types || {};

  const baseValue = (function () {
    const entry = value.get("0");

    if (!entry) {
      throw new Error("Empty value to decode");
    }

    try {
      return JSON.parse(String(entry));
    } catch {
      throw new Error(`Failed to parse base value: ${entry}`);
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
          const maybeTag = input.slice(1);

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
              const id = input.slice(2);
              const set = new Set<any>();

              try {
                const values = value.get(id);
                if (values) {
                  const data = JSON.parse(String(values)); // This is stored as an Array<string>
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
            case maybeTag[0] === Tag.Map: {
              const id = input.slice(2);
              const map = new Map<any, any>();

              try {
                const values = value.get(id);
                if (values) {
                  const data = JSON.parse(String(values)); // This is stored as an Array<[string, string]>
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
            case maybeTag[0] === Tag.Promise: {
              const id = input.slice(2);
              const rawValue = value.get(id);

              if (!rawValue) {
                throw new Error("Failed to find promise resolved value");
              }

              try {
                const resolvedValue = deserizalizeValue(
                  JSON.parse(String(rawValue))
                );
                return Promise.resolve(resolvedValue);
              } catch {
                throw new Error("Unable to resolve promise value");
              }
            }
            case maybeTag[0] === Tag.AsyncIterator: {
              const id = input.slice(2);
              const json = value.get(id);

              if (!json) {
                throw new Error(`Unable to get async iterator '${id}'`);
              }

              const asyncIteratorValues = JSON.parse(String(json));

              if (Array.isArray(asyncIteratorValues)) {
                const length = asyncIteratorValues.length - 1;
                const isDone = asyncIteratorValues[length] === "done";

                const values = isDone
                  ? asyncIteratorValues.slice(0, -1)
                  : asyncIteratorValues;

                const generator = (async function* () {
                  for (const item of values) {
                    const resolvedValue = deserizalizeValue(item);
                    yield resolvedValue;
                  }
                })();

                return generator;
              } else {
                throw new Error(
                  "Failed to parse async iterator, expected array of values"
                );
              }
            }
            case maybeTag[0] === Tag.FormData: {
              const formData = new FormDataConstructor();
              const id = input.slice(2);

              value.forEach((entry, key) => {
                const entryKey = `${id}_`;
                if (key.startsWith(entryKey)) {
                  const fieldName = key.slice(entryKey.length);
                  formData.set(fieldName, entry);
                }
              });

              return formData;
            }
            case isTypedArrayTag(maybeTag[0]): {
              return deserializeBuffer(maybeTag[0], input, {
                references: value,
              });
            }
            case maybeTag[0] === Tag.File: {
              const id = input.slice(2);
              const file = value.get(`${id}_file`);

              if (!file) {
                throw new Error(`File '${id}_file' was not found`);
              }

              return file;
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

  return deserizalizeValue(baseValue);
}

function deserializeBuffer(tag: Tag, input: string, context: DecodeContext) {
  const getBufferData = () => {
    const id = input.slice(2);
    const data = context.references.get(id);
    if (!data) {
      throw new Error(`Unable to get '${input}' buffer data`);
    }
    return JSON.parse(String(data));
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
