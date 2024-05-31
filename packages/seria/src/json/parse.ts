/* eslint-disable @typescript-eslint/no-explicit-any */
import { internal_deserialize } from "./internal/deserialize";

/**
 * A function that convert a value.
 */
export type Revivers = {
  [tag: string]: (value: any) => unknown;
};

/**
 * Parse a `json` string to a value.
 * @param value The `json` value to parse.
 * @param revivers A function to convert a value.
 * @returns The parsed value.
 */
export function parse(value: string, revivers?: Revivers): unknown {
  const result = internal_deserialize(value, { revivers });
  return result.data;
}

