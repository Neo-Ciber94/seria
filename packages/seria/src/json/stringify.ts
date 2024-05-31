/* eslint-disable @typescript-eslint/no-explicit-any */
import { SeriaError } from "../error";
import { internal_serialize, type SerializeContext } from "./internal/serialize";

export type Replacers = {
  [tag: string]: (value: unknown, ctx: SerializeContext) => unknown | void;
}

/**
 * Converts a value to a json string.
 * @param value The value to convert.
 * @param replacers A function that encode a custom value.
 * @param space Adds indentation, white space to the json values line-breaks.
 * @returns The json string.
 * @throws If the promise contains any promise. Use `stringifyAsync` or `stringifyToStream` to convert value with promises.
 */
export function stringify(
  value: unknown,
  replacers?: Replacers | null,
  space?: number | string
) {
  const { output, pendingPromises, pendingIterators } = internal_serialize(
    value,
    {
      replacers,
      space,
    }
  );

  if (pendingPromises.length > 0) {
    throw new SeriaError("Serialiation result have pending promises");
  }

  if (pendingIterators.length > 0) {
    throw new SeriaError("Serialiation result have pending async iterators");
  }

  return JSON.stringify(output, null, space);
}

