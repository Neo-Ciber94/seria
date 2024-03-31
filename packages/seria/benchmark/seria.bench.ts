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

describe("Benchmark stringify", () => {
  bench("seria.stringify", () => {
    const _json = seria.stringify(obj, seriaReplacer);
  });

  bench("superjson.stringify", () => {
    const _json = superjson.stringify(obj);
  });

  bench("devalue.stringify", () => {
    const _json = devalue.stringify(obj);
  });
});

describe("Benchmark parse", () => {
  const seriaJson = seria.stringify(obj, seriaReplacer);
  const superjsonJson = superjson.stringify(obj);
  const devalueJson = devalue.stringify(obj);

  bench("seria.parse", () => {
    const _value = seria.parse(seriaJson, seriaReviver);
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
    const _value = seriaFormData.encode(obj, seriaReplacer);
  });
});

describe("Benchmark FormData decode", async () => {
  const formData = seriaFormData.encode(obj, seriaReplacer);

  bench("seriaFormData.decode", () => {
    const _value = seriaFormData.decode(formData, seriaReviver);
  });
});

// Seria do not support Regex, URL or Error currently

function seriaReplacer(value: unknown) {
  if (value instanceof RegExp) {
    return `$2${value.toString()}`; // `$2` as tag for RegExp
  }

  return undefined;
}

function seriaReviver(value: unknown) {
  if (typeof value === "string" && value.startsWith("$2")) {
    const parts = value.slice(2);
    const split = parts.lastIndexOf("/");
    const body = parts.slice(1, split);
    const flags = parts.slice(split + 1);
    return new RegExp(body, flags);
  }

  return undefined;
}
