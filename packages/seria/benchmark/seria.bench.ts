import { describe, bench } from "vitest";
import * as seria from "../src";
import * as seriaFormData from "../src/form-data";

const obj = {
  string: "Hello, world!",
  number: 42,
  boolean: true,
  nullValue: null,
  array: [1, 2, 3],
  object: { key: "value" },
  undefinedValue: undefined,
  bigintValue: BigInt(123456789),
  date: new Date(),
  set: new Set([1, 2, 3]),
  map: new Map([
    [1, "one"],
    [2, "two"],
    [3, "three"],
  ]),
} as const;

describe("Benchmark FormData encode", async () => {
  bench("seriaFormData.encode", () => {
    const _value = seriaFormData.encode(obj);
  });

  bench("seria.stringify", () => {
    const _value = seria.stringify(obj);
  });
});

describe("Benchmark FormData decode", async () => {
  const formData = seriaFormData.encode(obj);
  const json = seria.stringify(obj);

  bench("seriaFormData.decode", () => {
    const _value = seriaFormData.decode(formData);
  });

  bench("seria.parse", () => {
    const _value = seria.parse(json);
  });
});
