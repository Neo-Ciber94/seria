/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, test, vi } from "vitest";

import { type TrackingAsyncIterable } from "../trackingAsyncIterable";
import { delay } from "../utils";
import { parseFromStream } from "./parseFromStream";
import { stringifyAsync } from "./stringifyAsync";
import { stringifyToStream } from "./stringifyToStream";
import { parse, stringify } from "..";

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

describe("Parse promises", () => {
  test("Parse array of promises", async () => {
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
          ]),
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
      ]),
    );

    await expect(parsed.set).resolves.toEqual(new Set(["fire", "water", "rock"]));

    const nested = await parsed.nested;

    await expect(nested.num).resolves.toStrictEqual(999n);
    await expect(nested.date).resolves.toStrictEqual(new Date(0));

    const obj_with_symbol = await nested.obj_with_symbol;
    await expect(obj_with_symbol.symbol).resolves.toStrictEqual(Symbol.for("this_is_a_promise"));
  });

  test("Parse resolved Promise", async () => {
    const encoded = await stringifyAsync(Promise.resolve("adios amigos"));
    const decoded = parse(encoded);
    await expect(decoded).resolves.toStrictEqual("adios amigos");
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

  test("Parse array of promises", async () => {
    const promisesArray = [
      Promise.resolve(42),
      Promise.resolve(true),
      Promise.resolve(null),
      Promise.resolve(undefined),
      Promise.resolve([1, 2, 3]),
    ];

    const json = await stringifyAsync(promisesArray);

    const decodedArray = parse(json) as typeof promisesArray;

    await Promise.all(
      decodedArray.map(async (promise, index) => {
        await expect(promise).resolves.toStrictEqual(await promisesArray[index]);
      }),
    );
  });
});

describe("Parse promises from streams", () => {
  test("Parse stream to value", async () => {
    const obj = { x: 1, y: "Hello", z: [1, false, 12n] };
    const stream = stringifyToStream(obj);

    const value = (await parseFromStream(stream)) as typeof obj;
    expect(value).toStrictEqual({ x: 1, y: "Hello", z: [1, false, 12n] });
  });

  test("Parse stream to resolved promise", async () => {
    const p = Promise.resolve(23);
    const stream = stringifyToStream(p);

    const value = parseFromStream(stream);
    await expect(value).resolves.toStrictEqual(23);
  });

  test("Parse stream to rejected promise", async () => {
    const p = Promise.reject("Error");
    const stream = stringifyToStream(p);

    const value = parseFromStream(stream);
    await expect(value).rejects.toStrictEqual("Error");
  });

  test("Parse stream with promises to value", async () => {
    const obj = {
      num: Promise.resolve(23),
      text: Promise.resolve("Adios"),
      array: Promise.resolve([]),
      nested: {
        x: delay(200).then(() => 2),
        y: delay(100).then(() => true),
      },
    };

    const stream = stringifyToStream(obj);
    const value = (await parseFromStream(stream)) as typeof obj;

    await expect(value.num).resolves.toStrictEqual(23);
    await expect(value.text).resolves.toStrictEqual("Adios");
    await expect(value.array).resolves.toStrictEqual([]);
    await expect(value.nested.x).resolves.toStrictEqual(2);
    await expect(value.nested.y).resolves.toStrictEqual(true);
  });

  test("Parse stream of object with promises", async () => {
    const obj = {
      s: Promise.resolve(21),
      f: Promise.reject("Failure"),
    };

    const stream = stringifyToStream(obj);
    const value = (await parseFromStream(stream)) as typeof obj;

    await expect(value.s).resolves.toStrictEqual(21);
    await expect(value.f).rejects.toStrictEqual("Failure");
  });

  // FIXME: Currently we are unable to resolve a promise that return an object with other promises,
  // is a weird scenario but it may cause the promise to never resolve
  test("Parse stream of promise than return other promise", async () => {
    const p = delay(200).then(() => ({ x: delay(100).then(() => "I'm here") }));

    const stream = stringifyToStream(p);
    const value = (await parseFromStream(stream)) as typeof p;

    const inner = await value;
    await expect(inner.x).resolves.toStrictEqual("I'm here");
  });
});

describe("Custom parser with reviver and replacer", () => {
  test("Parse URL and regex", async () => {
    const obj = {
      url: new URL("http://127.0.0.1:3000/custom?text=hello&num=34"),
      regex: /^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})*$/i,
    };

    const json = stringify(obj, {
      URL: (value) => (value instanceof URL ? value.href : undefined),
      RegExp: (value) => (value instanceof RegExp ? value.toString() : undefined),
    });

    const value = parse(json, {
      URL: (raw) => {
        return new URL(raw as string);
      },
      RegExp: (raw) => {
        const value = raw as string;
        const body = value.slice(1, value.lastIndexOf("/"));
        const flags = value.slice(value.lastIndexOf("/") + 1);
        return new RegExp(body, flags);
      },
    }) as typeof obj;

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
      yield { x: 2 };
      yield false;
    }

    const json = await stringifyAsync(gen());
    const asyncIterator = parse(json) as AsyncIterator<unknown>;

    expect((await asyncIterator.next()).value).toStrictEqual(1);
    expect((await asyncIterator.next()).value).toStrictEqual({ x: 2 });
    expect((await asyncIterator.next()).value).toStrictEqual(false);
    expect((await asyncIterator.next()).done).toBeTruthy();
  });

  test("Should parse async iterator with promise", async () => {
    async function* gen() {
      yield delay(40).then(() => 99);

      yield delay(40).then(() => true);

      await delay(100);
      yield Promise.resolve([1, 2, 3]);
    }

    const json = await stringifyAsync(gen());
    const value = parse(json) as AsyncIterable<unknown>;
    const iter = value[Symbol.asyncIterator]();

    expect((await iter.next()).value).toStrictEqual(99);
    expect((await iter.next()).value).toStrictEqual(true);
    expect((await iter.next()).value).toStrictEqual([1, 2, 3]);
    expect((await iter.next()).done).toBeTruthy();
  });

  test("Should parse async iterator with streaming", async () => {
    async function* gen() {
      yield 1;
      yield { kouhai: "Koito Yuu" };
      yield true;
      yield { senpai: "Touko Nanami" };
    }

    const stream = stringifyToStream(gen());
    const value = (await parseFromStream(stream)) as TrackingAsyncIterable<unknown>;
    const iter = value[Symbol.asyncIterator]();

    expect((await iter.next()).value).toStrictEqual(1);
    expect((await iter.next()).value).toStrictEqual({ kouhai: "Koito Yuu" });
    expect((await iter.next()).value).toStrictEqual(true);
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
      yield { kouhai: "Koito Yuu" };
      yield { senpai: "Touko Nanami" };
    }

    const promise = Promise.resolve(gen());
    const stream = stringifyToStream(promise);
    const value = (await parseFromStream(stream)) as typeof promise;
    const iterable = await value;
    const iter = iterable[Symbol.asyncIterator]();

    expect((await iter.next()).value).toStrictEqual({ kouhai: "Koito Yuu" });
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
    const iter = (await parseFromStream(stream)) as AsyncIterableIterator<number>;

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
