/* eslint-disable @typescript-eslint/no-explicit-any */

import { Tag, isTypedArrayTag } from "../tag";
import {
  type Replacers,
  internal_serialize,
} from "../json/stringify";
import { type Revivers } from "../json/parse";
import { isPlainObject } from "../utils";
import { base64ToBuffer } from "../utils";
import { SeriaError } from "../error";

// The browser `FormData` is assignable to this one
import type { FormData as UndiciFormData } from "undici";

/**
 * Encodes a value into a `FormData`.
 * @param value The value to encode.
 * @param replacer Converts a value to string.
 * @returns The value encoded as `FormData`.
 * @throws If the value is or have any promise.
 */
export function encode(value: unknown, replacers?: Replacers): FormData {
  const formData = new FormData();
  const { output, pendingPromises, pendingIterators } = internal_encodeFormData(
    value,
    {
      formData,
      replacers,
    }
  );

  if (pendingPromises.length > 0) {
    throw new SeriaError("Serialiation result have pending promises");
  }

  if (pendingIterators.length > 0) {
    throw new SeriaError("Serialiation result have pending async iterators");
  }

  for (let i = 0; i < output.length; i++) {
    formData.set(String(i), JSON.stringify(output[i]));
  }

  return formData;
}

/**
 * Encodes a value into a `FormData`, resolving all it's promises if any.
 * @param value The value to encode.
 * @param replacers Converts a custom value.
 * @returns The value encoded as `FormData`.
 */
export async function encodeAsync(
  value: unknown,
  replacers?: Replacers
): Promise<FormData> {
  const formData = new FormData();
  const result = internal_encodeFormData(value, {
    formData,
    replacers,
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
    replacers?: Replacers;
  }
) {
  return internal_serialize(value, opts);
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
 * @param encoded The formData to decode.
 * @param reviver Converts a value.
 * @returns The decoded value.
 */
export function decode(
  encoded: FormData,
  revivers?: Revivers | null,
  opts?: DecodeOptions
): unknown {
  const { types } = opts || {};
  const { FormData: FormDataConstructor = globalThis.FormData } = types || {};
  const references = new Map<string, any>();

  const value = (function () {
    const entry = encoded.get("0");

    if (!entry) {
      throw new SeriaError("Empty value to decode");
    }

    try {
      return JSON.parse(String(entry));
    } catch {
      throw new SeriaError(`Failed to parse base value: ${entry}`);
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

            const id = maybeTag.slice(type.length + 2)
            const raw = JSON.parse(String(encoded.get(id)))
            const val = deserialize(raw);
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
            case maybeTag[0] === Tag.Object: {
              const id = input.slice(2);
              if (references.has(id)) {
                return references.get(id)
              }

              const raw = encoded.get(id);
              const value = JSON.parse(String(raw)); // This is stored as an Array<string>
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
              const id = input.slice(2);
              const arr: any[] = [];
              const raw = encoded.get(id);
              const values = JSON.parse(String(raw)); // This is stored as an Array<string>

              if (Array.isArray(values)) {
                for (const item of values) {
                  arr.push(deserialize(item));
                }
              }

              return arr;
            }
            case maybeTag[0] === Tag.Set: {
              const id = input.slice(2);
              const set = new Set<any>();

              const values = encoded.get(id);
              if (values) {
                const data = JSON.parse(String(values)); // This is stored as an Array<string>
                if (Array.isArray(data)) {
                  for (const item of data) {
                    set.add(deserialize(item));
                  }
                }
              }

              return set;
            }
            case maybeTag[0] === Tag.Map: {
              const id = input.slice(2);
              const map = new Map<any, any>();

              const values = encoded.get(id);
              if (values) {
                const data = JSON.parse(String(values)); // This is stored as an Array<[string, string]>
                if (Array.isArray(data)) {
                  for (const [key, value] of data) {
                    const decodedKey = deserialize(key);
                    const decodedValue = deserialize(value);
                    map.set(decodedKey, decodedValue);
                  }
                }
              }

              return map;
            }
            case maybeTag[0] === Tag.Promise: {
              const id = input.slice(2);
              const rawValue = encoded.get(id);

              if (!rawValue) {
                throw new SeriaError("Failed to find promise resolved value");
              }

              try {
                const resolvedValue = deserialize(
                  JSON.parse(String(rawValue))
                );
                return Promise.resolve(resolvedValue);
              } catch {
                throw new SeriaError("Unable to resolve promise value");
              }
            }
            case maybeTag[0] === Tag.AsyncIterator: {
              const id = input.slice(2);
              const json = encoded.get(id);

              if (!json) {
                throw new SeriaError(`Unable to get async iterator '${id}'`);
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
                    const resolvedValue = deserialize(item);
                    yield resolvedValue;
                  }
                })();

                return generator;
              } else {
                throw new SeriaError(
                  "Failed to parse async iterator, expected array of values"
                );
              }
            }
            case maybeTag[0] === Tag.FormData: {
              const formData = new FormDataConstructor();
              const id = input.slice(2);

              encoded.forEach((entry, key) => {
                const entryKey = `${id}_`;
                if (key.startsWith(entryKey)) {
                  const fieldName = key.slice(entryKey.length);
                  formData.set(fieldName, entry);
                }
              });

              return formData;
            }
            case maybeTag[0] === Tag.File: {
              const id = input.slice(2);
              const file = encoded.get(`${id}_file`);

              if (!file) {
                throw new SeriaError(`File '${id}_file' was not found`);
              }

              return file;
            }
            case isTypedArrayTag(maybeTag[0]): {
              return deserializeBuffer(maybeTag[0], input, {
                references: encoded,
              });
            }
            default:
              throw new SeriaError(`Unknown reference value: ${input}`);
          }
        } else {
          throw new SeriaError(`Invalid reference value: ${input}`);
        }
      }
      case "object": {
        if (input === null) {
          return null;
        }
        else {
          throw new SeriaError(`Invalid object value: ${JSON.stringify(input)}`);
        }
      }
      default:
        throw new SeriaError(`Invalid value: ${input}`);
    }
  };

  return deserialize(value);
}

function deserializeBuffer(tag: Tag, input: string, context: DecodeContext) {
  const getBufferData = () => {
    const id = input.slice(2);
    const data = context.references.get(id);
    if (!data) {
      throw new SeriaError(`Unable to get '${input}' buffer data`);
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
      throw new SeriaError(`Unknown typed array buffer: ${input}`);
  }
}