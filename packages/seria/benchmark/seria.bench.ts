import { describe, bench } from "vitest";
import * as seria from "../src";
import * as seriaFormData from "../src/form-data";
import * as superjson from "superjson";
import * as devalue from "devalue";

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
  regExp: /\w+/gi,
} as const;

// Seria do not support Regex, URL or Error currently

const RegExp_Tag = "1";

const replacers = {
  [RegExp_Tag]: (value: unknown) => value instanceof RegExp ? value.toString() : undefined
}

const revivers = {
  [RegExp_Tag]: (raw: unknown) => {
    const parts = String(raw).slice(2);
    const split = parts.lastIndexOf("/");
    const body = parts.slice(1, split);
    const flags = parts.slice(split + 1);
    return new RegExp(body, flags);
  }
}

describe("Benchmark stringify", () => {
  bench("seria.stringify", () => {
    const _json = seria.stringify(obj, replacers);
  });

  bench("superjson.stringify", () => {
    const _json = superjson.stringify(obj);
  });

  bench("devalue.stringify", () => {
    const _json = devalue.stringify(obj);
  });
});

describe("Benchmark parse", () => {
  const seriaJson = seria.stringify(obj, replacers);
  const superjsonJson = superjson.stringify(obj);
  const devalueJson = devalue.stringify(obj);

  bench("seria.parse", () => {
    const _value = seria.parse(seriaJson, revivers);
  });

  bench("superjson.parse", () => {
    const _value = superjson.parse(superjsonJson);
  });

  bench("devalue.parse", () => {
    const _value = devalue.parse(devalueJson);
  });
});

describe("Benchmark FormData encode", async () => {
  bench("seriaFormData.encode", () => {
    const _value = seriaFormData.encode(obj, replacers);
  });
});

describe("Benchmark FormData decode", async () => {
  const formData = seriaFormData.encode(obj, replacers);

  bench("seriaFormData.decode", () => {
    const _value = seriaFormData.decode(formData, revivers);
  });
});


