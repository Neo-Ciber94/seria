/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, test, vi } from "vitest";
import { stringify, stringifyToStream, stringifyAsync } from "./stringify";
import { parse, parseFromStream, internal_parseFromStream } from "./parse";
import { type TrackingAsyncIterable } from "../trackingAsyncIterable";
import { delay } from "../utils";

describe("Parse value", () => {
  test("Parse string", () => {
    const encoded = stringify("hello");
    const decoded = parse(encoded);
    expect(decoded).toStrictEqual("hello");
  });

  test("Parse number", () => {
    const encoded = stringify(42);
    const decoded = parse(encoded);
    expect(decoded).toStrictEqual(42);
  });

  test("Parse NaN", () => {
    const encoded = stringify(NaN);
    const decoded = parse(encoded);
    expect(decoded).toBeNaN();
  });

  test("Parse -Infinity", () => {
    const encoded = stringify(-Infinity);
    const decoded = parse(encoded);
    expect(decoded).toBe(-Infinity);
  });

  test("Parse Infinity", () => {
    const encoded = stringify(Infinity);
    const decoded = parse(encoded);
    expect(decoded).toBe(Infinity);
  });

  test("Parse -0", () => {
    const encoded = stringify(-0);
    const decoded = parse(encoded);
    expect(decoded).toBe(-0);
  });

  test("Parse boolean", () => {
    const encoded = stringify(true);
    const decoded = parse(encoded);
    expect(decoded).toStrictEqual(true);
  });

  test("Parse null", () => {
    const encoded = stringify(null);
    const decoded = parse(encoded);
    expect(decoded).toStrictEqual(null);
  });

  test("Parse undefined", () => {
    const encoded = stringify(undefined);
    const decoded = parse(encoded);
    expect(decoded).toStrictEqual(undefined);
  });

  test("Parse Set", () => {
    const encoded = stringify(new Set([1, "set", true]));
    const decoded = parse(encoded);
    expect(decoded).toEqual(new Set([1, "set", true]));
  });

  test("Parse Map", () => {
    const encoded = stringify(new Map([["key", "value"]]));
    const decoded = parse(encoded);
    expect(decoded).toEqual(new Map([["key", "value"]]));
  });

  test("Parse object", () => {
    const encoded = stringify({ x: 1, y: "world", z: false });
    const decoded = parse(encoded);
    expect(decoded).toStrictEqual({ x: 1, y: "world", z: false });
  });

  test("Parse resolved Promise", async () => {
    const encoded = await stringifyAsync(Promise.resolve("adios amigos"));
    const decoded = parse(encoded);
    await expect(decoded).resolves.toStrictEqual("adios amigos");
  });
});

describe("Parse object", async () => {
  test("Parse complex", async () => {
    const obj = {
      str: "hello",
      num: 42,
      null: null,
      undefined: undefined,
      truthty: true,
      set: new Set([1, "set", true]),
      map: new Map([["key", "value"]]),
      obj: { x: 1, y: "world", z: false },
      promise: Promise.resolve("adios amigos"),
    };

    const json = await stringifyAsync(obj);
    const raw: any = parse(json);

    expect(raw.str).toStrictEqual("hello");
    expect(raw.num).toStrictEqual(42);
    expect(raw.truthty).toStrictEqual(true);
    expect(raw.null).toStrictEqual(null);
    expect(raw.undefined).toStrictEqual(undefined);
    expect(raw.set).toEqual(new Set([1, "set", true]));
    expect(raw.map).toEqual(new Map([["key", "value"]]));
    expect(raw.obj).toStrictEqual({ x: 1, y: "world", z: false });
    await expect(raw.promise).resolves.toStrictEqual("adios amigos");
  });

  test("Parse promises", async () => {
    const promises = {
      num: Promise.resolve(42),
      bool: Promise.resolve(true),
      null: Promise.resolve(null),
      undefined: Promise.resolve(undefined),
      array: Promise.resolve([1, 2, 3]),
    };

    const json = await stringifyAsync(promises);

    const decoded: any = parse(json);

    await expect(decoded.num).resolves.toStrictEqual(42);
    await expect(decoded.bool).resolves.toStrictEqual(true);
    await expect(decoded.null).resolves.toStrictEqual(null);
    await expect(decoded.undefined).resolves.toStrictEqual(undefined);
    await expect(decoded.array).resolves.toStrictEqual([1, 2, 3]);
  });

  test("Parse array of promises", async () => {});
});

type IndexableBuffer<T> = {
  [index: number]: T;
  readonly length: number;
};

describe("Parse buffer", () => {
  function fillBuffer<T>(buffer: IndexableBuffer<T>, set: (idx: number) => T) {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = set(i);
    }
  }

  test("Parse ArrayBuffer", async () => {
    const buffer = new ArrayBuffer(8);
    fillBuffer(new Uint8Array(buffer), (x) => x % 256);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as ArrayBuffer;

    const src = new DataView(buffer);
    const dst = new DataView(decoded);
    for (let i = 0; i < decoded.byteLength; i++) {
      expect(src.getUint8(i)).toStrictEqual(dst.getUint8(i));
    }
  });

  test("Parse Int8Array", async () => {
    const buffer = new Int8Array(new ArrayBuffer(8));
    fillBuffer(buffer, (x) => x % 256);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as Int8Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse Uint8Array", async () => {
    const buffer = new Uint8Array(new ArrayBuffer(8));
    fillBuffer(buffer, (x) => x % 256);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as Uint8Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse Uint8ClampedArray", async () => {
    const buffer = new Uint8ClampedArray(new ArrayBuffer(8));
    fillBuffer(buffer, (x) => x);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as Uint8ClampedArray;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse Int16Array", async () => {
    const buffer = new Int16Array(new ArrayBuffer(16));
    fillBuffer(buffer, (x) => x);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as Int16Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse Uint16Array", async () => {
    const buffer = new Uint16Array(new ArrayBuffer(16));
    fillBuffer(buffer, (x) => x);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as Uint16Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse Int32Array", async () => {
    const buffer = new Int32Array(new ArrayBuffer(32));
    fillBuffer(buffer, (x) => x);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as Int32Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse Uint32Array", async () => {
    const buffer = new Uint32Array(new ArrayBuffer(32));
    fillBuffer(buffer, (x) => x);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as Uint32Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse Float32Array", async () => {
    const buffer = new Float32Array(new ArrayBuffer(32));
    fillBuffer(buffer, (x) => x * 0.1);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as Float32Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse Float64Array", async () => {
    const buffer = new Float64Array(new ArrayBuffer(64));
    fillBuffer(buffer, (x) => x * 0.1);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as Float64Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse BigInt64Array", async () => {
    const buffer = new BigInt64Array(new ArrayBuffer(64));
    fillBuffer(buffer, (x) => BigInt(x));

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as BigInt64Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse BigUint64Array", async () => {
    const buffer = new BigUint64Array(new ArrayBuffer(64));
    fillBuffer(buffer, (x) => BigInt(x));

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as BigUint64Array;

    for (let i = 0; i < decoded.byteLength; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Parse DataView", async () => {
    const data = new ArrayBuffer(16);
    const buffer = new DataView(data);
    fillBuffer(new Uint8Array(data), (x) => x);

    const encoded = stringify(buffer);
    const decoded = parse(encoded) as DataView;

    for (let i = 0; i < decoded.byteLength; i++) {
      expect(buffer.getInt8(i)).toStrictEqual(decoded.getInt8(i));
    }
  });
});

describe("Parse stream", () => {
  test("Parse ReadableStream", async () => {
    const obj = {
      num: 203,
      text: "Ayaka",
      promise: (async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        return { x: 5, y: -2 };
      })(),
    };

    const stream = stringifyToStream(obj);
    const parsed = internal_parseFromStream(stream);

    const reader = parsed.getReader();
    const firstChunk: any = (await reader.read())?.value;

    expect(firstChunk.num).toStrictEqual(203);
    expect(firstChunk.text).toStrictEqual("Ayaka");

    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    const secondChunk = (await reader.read())?.value as Promise<any>;
    await expect(secondChunk).resolves.toStrictEqual({ x: 5, y: -2 });
    expect((await reader.read())?.done).toBeTruthy();
  });

  test("Parse object with promises", async () => {
    const obj = {
      num: Promise.resolve(45),
      text: Promise.resolve("Ayaka"),
      promise: (async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        return { alive: true };
      })(),
    };

    const stream = stringifyToStream(obj);
    const parsed = internal_parseFromStream(stream);

    const reader = parsed.getReader();

    // Read all the chunks until the object is exhausted
    const firstChunk: any = (await reader.read())?.value;
    await reader.read();
    await reader.read();
    await reader.read();

    // Check the resolved object
    await expect(firstChunk.num).resolves.toStrictEqual(45);
    await expect(firstChunk.text).resolves.toStrictEqual("Ayaka");
    await expect(firstChunk.promise).resolves.toStrictEqual({ alive: true });

    expect((await reader.read())?.done).toBeTruthy();
  });

  test("Parse stream to value", async () => {
    const obj = {
      hero: Promise.resolve("Himmel"),
      alive: Promise.resolve(false),
      partner: (async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        return { name: "Fieren" };
      })(),
    };

    const stream = stringifyToStream(obj);
    const parsed: any = await parseFromStream(stream);

    // Check the resolved object
    await expect(parsed.hero).resolves.toStrictEqual("Himmel");
    await expect(parsed.alive).resolves.toStrictEqual(false);
    await expect(parsed.partner).resolves.toStrictEqual({ name: "Fieren" });
  });
});

describe("Parse promises", () => {
  test("Parse stream for array of promises", async () => {
    const arr = [
      Promise.resolve("hello"),
      Promise.resolve(new Set([1, 2, 3])),
      delay(100).then(() => BigInt(120_000_000)),
    ] as const;

    const json = await stringifyAsync(arr);
    const parsed = parse(json) as typeof arr;

    await expect(parsed[0]).resolves.toStrictEqual("hello");
    await expect(parsed[1]).resolves.toEqual(new Set([1, 2, 3]));
    await expect(parsed[2]).resolves.toStrictEqual(120_000_000n);
  });

  test("Parse promises with complex types", async () => {
    const obj = {
      map: delay(40).then(
        () =>
          new Map([
            ["fruit", "mango"],
            ["color", "yellow"],
          ])
      ),
      set: Promise.resolve(new Set(["fire", "water", "rock"])),
      nested: Promise.resolve({
        num: Promise.resolve(999n),
        date: delay(1).then(() => new Date(0)),
        obj_with_symbol: Promise.resolve({
          symbol: delay(2).then(() => Symbol.for("this_is_a_promise")),
        }),
      }),
    };

    const json = await stringifyAsync(obj);
    const parsed = parse(json) as typeof obj;

    await expect(parsed.map).resolves.toEqual(
      new Map([
        ["fruit", "mango"],
        ["color", "yellow"],
      ])
    );

    await expect(parsed.set).resolves.toEqual(
      new Set(["fire", "water", "rock"])
    );

    const nested = await parsed.nested;

    await expect(nested.num).resolves.toStrictEqual(999n);
    await expect(nested.date).resolves.toStrictEqual(new Date(0));

    const obj_with_symbol = await nested.obj_with_symbol;
    await expect(obj_with_symbol.symbol).resolves.toStrictEqual(
      Symbol.for("this_is_a_promise")
    );
  });
});

describe("Custom parser with reviver and replacer", () => {
  test("Parse URL and regex", async () => {
    const obj = {
      url: new URL("http://127.0.0.1:3000/custom?text=hello&num=34"),
      regex: /^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})*$/i,
    };

    const json = stringify(obj, (val) => {
      if (val instanceof URL) {
        return `$1${val.href}`; // `$1` as tag for URL
      }

      if (val instanceof RegExp) {
        return `$2${val.toString()}`; // `$2` as tag for RegExp
      }

      return undefined;
    });

    const value: any = parse(json, (val) => {
      if (typeof val === "string" && val.startsWith("$1")) {
        return new URL(val.slice(2));
      }

      if (typeof val === "string" && val.startsWith("$2")) {
        const parts = val.slice(2);
        const body = parts.slice(1, parts.lastIndexOf("/"));
        const flags = parts.slice(parts.lastIndexOf("/") + 1);
        return new RegExp(body, flags);
      }

      return undefined;
    });

    expect(value).toStrictEqual({
      url: new URL("http://127.0.0.1:3000/custom?text=hello&num=34"),
      regex: /^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})*$/i,
    });
  });
});

describe("Parse async iterator", () => {
  test("Should parse async iterator", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
    }

    const json = await stringifyAsync(gen());
    const asyncIterator = parse(json) as AsyncIterator<unknown>;

    expect((await asyncIterator.next()).value).toStrictEqual(1);
    expect((await asyncIterator.next()).value).toStrictEqual(2);
    expect((await asyncIterator.next()).value).toStrictEqual(3);
    expect((await asyncIterator.next()).done).toBeTruthy();
  });

  test("Should parse async iterator with promise", async () => {
    async function* gen() {
      yield delay(40).then(() => 99);

      yield delay(40).then(() => 98);

      await delay(100);
      yield Promise.resolve(97);
    }

    const json = await stringifyAsync(gen());
    const value = parse(json) as AsyncIterable<unknown>;
    const iter = value[Symbol.asyncIterator]();

    expect((await iter.next()).value).toStrictEqual(99);
    expect((await iter.next()).value).toStrictEqual(98);
    expect((await iter.next()).value).toStrictEqual(97);
    expect((await iter.next()).done).toBeTruthy();
  });

  test("Should parse async iterator with streaming", async () => {
    async function* gen() {
      yield { kouhai: "Koito Yui" };
      yield { senpai: "Touko Nanami" };
    }

    const stream = stringifyToStream(gen());
    const value = (await parseFromStream(
      stream
    )) as TrackingAsyncIterable<unknown>;
    const iter = value[Symbol.asyncIterator]();

    expect((await iter.next()).value).toStrictEqual({ kouhai: "Koito Yui" });
    expect((await iter.next()).value).toStrictEqual({ senpai: "Touko Nanami" });
    expect((await iter.next()).done).toBeTruthy();
  });

  test("Should parse promise resolving to async iterator", async () => {
    async function* gen() {
      yield 1;
      yield 2;
      yield 3;
    }

    const promise = Promise.resolve(gen());
    const json = await stringifyAsync(promise);
    const value = parse(json) as typeof promise;
    const iterable = await value;
    const asyncIterator = iterable[Symbol.asyncIterator]();

    expect((await asyncIterator.next()).value).toStrictEqual(1);
    expect((await asyncIterator.next()).value).toStrictEqual(2);
    expect((await asyncIterator.next()).value).toStrictEqual(3);
    expect((await asyncIterator.next()).done).toBeTruthy();
  });

  test("Should parse promise returning async iterator with streaming", async () => {
    async function* gen() {
      yield { kouhai: "Koito Yui" };
      yield { senpai: "Touko Nanami" };
    }

    const promise = Promise.resolve(gen());
    const stream = stringifyToStream(promise);
    const value = (await parseFromStream(stream)) as typeof promise;
    const iterable = await value;
    const iter = iterable[Symbol.asyncIterator]();

    expect((await iter.next()).value).toStrictEqual({ kouhai: "Koito Yui" });
    expect((await iter.next()).value).toStrictEqual({ senpai: "Touko Nanami" });
    expect((await iter.next()).done).toBeTruthy();
  });

  test("Should parse object with async iterators", async () => {
    async function* range(from: number, to: number) {
      for (let i = from; i <= to; i++) {
        yield i;
      }
    }

    const obj = {
      zeroToFive: range(0, 5),
      oneToThree: range(1, 3),
      fiveToNine: range(5, 9),
    };

    const json = await stringifyAsync(obj);
    const value = parse(json) as typeof obj;

    await expect(value.zeroToFive).toMatchSequence([0, 1, 2, 3, 4, 5]);
    await expect(value.oneToThree).toMatchSequence([1, 2, 3]);
    await expect(value.fiveToNine).toMatchSequence([5, 6, 7, 8, 9]);
  });
});

describe("Streaming using timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  test("Should parse async iterators from stream with timers", async () => {
    async function* range(to: number) {
      for (let i = 0; i <= to; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        yield i;
      }
    }

    const stream = stringifyToStream(range(3));
    const iter = (await parseFromStream(
      stream
    )) as AsyncIterableIterator<number>;

    vi.advanceTimersByTime(1000);
    expect((await iter.next()).value).toStrictEqual(0);

    vi.advanceTimersByTime(1000);
    expect((await iter.next()).value).toStrictEqual(1);

    vi.advanceTimersByTime(1000);
    expect((await iter.next()).value).toStrictEqual(2);

    vi.advanceTimersByTime(1000);
    expect((await iter.next()).value).toStrictEqual(3);

    expect((await iter.next()).done).toBeTruthy();

    vi.clearAllTimers();
  });
});
