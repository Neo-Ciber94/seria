import { internal_serialize } from "./internal/serialize";
import { type Replacers } from "./stringify";

/**
 * Converts a value to a json string and resolve all its promises.
 * @param value The value to convert.
 * @param replacers A function that encode a custom value.
 * @param space Adds indentation, white space to the json values line-breaks.
 * @returns The json string.
 */
export async function stringifyAsync(
  value: unknown,
  replacers?: Replacers | null,
  space?: number | string,
) {
  const result = internal_serialize(value, {
    replacers,
    space,
  });

  // We need to resolve promises first in case any return an async iterator
  await Promise.all(result.pendingPromises);

  // Then we drain all the values on the async iterators
  const iteratorPromises = result.pendingIterators.map(async (gen) => {
    for await (const _ of gen) {
      // nothing
    }
  });

  await Promise.all(iteratorPromises);
  return JSON.stringify(result.output, null, space);
}
