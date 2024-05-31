import { SeriaError } from "../error";
import { internal_serialize } from "../json/internal/serialize";
import { type Replacers } from "../json/stringify";

/**
 * Encodes a value into a `FormData`.
 * @param value The value to encode.
 * @param replacer Converts a value to string.
 * @returns The value encoded as `FormData`.
 * @throws If the value is or have any promise.
 */
export function encode(value: unknown, replacers?: Replacers): FormData {
  const formData = new FormData();
  const { output, pendingPromises, pendingIterators } = internal_encodeFormData(value, {
    formData,
    replacers,
  });

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
export async function encodeAsync(value: unknown, replacers?: Replacers): Promise<FormData> {
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
  },
) {
  return internal_serialize(value, opts);
}
