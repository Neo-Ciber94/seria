import { describe, bench } from "vitest";
import * as seria from "../src";
import * as superjson from "superjson";
import * as devalue from "devalue";
import * as seroval from "seroval";

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

describe("Benchmark stringify", () => {
  bench("seria.stringify", () => {
    const _json = seria.stringify(obj);
  });

  bench("superjson.stringify", () => {
    const _json = superjson.stringify(obj);
  });

  bench("devalue.stringify", () => {
    const _json = devalue.stringify(obj);
  });

  bench("seroval.serialize", () => {
    const _json = seroval.serialize(obj);
  });
});

describe("Benchmark parse", () => {
  const seriaJson = seria.stringify(obj);
  const superjsonJson = superjson.stringify(obj);
  const devalueJson = devalue.stringify(obj);
  const serovalJson = seroval.serialize(obj);

  bench("seria.parse", () => {
    const _value = seria.parse(seriaJson);
  });

  bench("superjson.parse", () => {
    const _value = superjson.parse(superjsonJson);
  });

  bench("devalue.parse", () => {
    const _value = devalue.parse(devalueJson);
  });

  bench("seroval.deserialize", () => {
    const _value = seroval.deserialize(serovalJson);
  });
});
