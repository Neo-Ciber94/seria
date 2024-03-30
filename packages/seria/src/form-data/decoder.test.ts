/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test } from "vitest";
import { encodeAsync } from ".";
import { decode } from ".";
import { delay } from "../utils";

describe("Decode value", () => {
  test("Decode string", async () => {
    const encoded = await encodeAsync("hello");
    const decoded = decode(encoded);
    expect(decoded).toStrictEqual("hello");
  });

  test("Decode number", async () => {
    const encoded = await encodeAsync(42);
    const decoded = decode(encoded);
    expect(decoded).toStrictEqual(42);
  });

  test("Decode NaN", async () => {
    const encoded = await encodeAsync(NaN);
    const decoded = decode(encoded);
    expect(decoded).toBeNaN();
  });

  test("Decode -Infinity", async () => {
    const encoded = await encodeAsync(-Infinity);
    const decoded = decode(encoded);
    expect(decoded).toBe(-Infinity);
  });

  test("Decode Infinity", async () => {
    const encoded = await encodeAsync(Infinity);
    const decoded = decode(encoded);
    expect(decoded).toBe(Infinity);
  });

  test("Decode -0", async () => {
    const encoded = await encodeAsync(-0);
    const decoded = decode(encoded);
    expect(decoded).toBe(-0);
  });

  test("Decode boolean", async () => {
    const encoded = await encodeAsync(true);
    const decoded = decode(encoded);
    expect(decoded).toStrictEqual(true);
  });

  test("Decode null", async () => {
    const encoded = await encodeAsync(null);
    const decoded = decode(encoded);
    expect(decoded).toStrictEqual(null);
  });

  test("Decode undefined", async () => {
    const encoded = await encodeAsync(undefined);
    const decoded = decode(encoded);
    expect(decoded).toStrictEqual(undefined);
  });

  test("Decode Set", async () => {
    const encoded = await encodeAsync(new Set([1, "set", true]));
    const decoded = decode(encoded);
    expect(decoded).toEqual(new Set([1, "set", true]));
  });

  test("Decode Map", async () => {
    const encoded = await encodeAsync(new Map([["key", "value"]]));
    const decoded = decode(encoded);
    expect(decoded).toEqual(new Map([["key", "value"]]));
  });

  test("Decode object", async () => {
    const encoded = await encodeAsync({ x: 1, y: "world", z: false });
    const decoded = decode(encoded);
    expect(decoded).toStrictEqual({ x: 1, y: "world", z: false });
  });

  test("Decode Promise", async () => {
    const encoded = await encodeAsync(Promise.resolve("adios amigos"));
    const decoded = decode(encoded);
    await expect(decoded).resolves.toStrictEqual("adios amigos");
  });
});

describe("Decode object", async () => {
  test("Decode complex", async () => {
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

    const encoded = await encodeAsync(obj);
    const decoded: any = decode(encoded);

    expect(decoded.str).toStrictEqual("hello");
    expect(decoded.num).toStrictEqual(42);
    expect(decoded.truthty).toStrictEqual(true);
    expect(decoded.null).toStrictEqual(null);
    expect(decoded.undefined).toStrictEqual(undefined);
    expect(decoded.set).toEqual(new Set([1, "set", true]));
    expect(decoded.map).toEqual(new Map([["key", "value"]]));
    expect(decoded.obj).toStrictEqual({ x: 1, y: "world", z: false });
    await expect(decoded.promise).resolves.toStrictEqual("adios amigos");
  });

  test("Decode promises", async () => {
    const promises = {
      num: Promise.resolve(42),
      bool: Promise.resolve(true),
      null: Promise.resolve(null),
      undefined: Promise.resolve(undefined),
      array: Promise.resolve([1, 2, 3]),
    };

    const encoded = await encodeAsync(promises);
    const decoded: any = decode(encoded);

    await expect(decoded.num).resolves.toStrictEqual(42);
    await expect(decoded.bool).resolves.toStrictEqual(true);
    await expect(decoded.null).resolves.toStrictEqual(null);
    await expect(decoded.undefined).resolves.toStrictEqual(undefined);
    await expect(decoded.array).resolves.toStrictEqual([1, 2, 3]);
  });

  test("Decode promises with falsy", async () => {
    const promises = {
      zero: Promise.resolve(0),
      empty: Promise.resolve(""),
      bigzero: Promise.resolve(0n),
      false: Promise.resolve(false),
      null: Promise.resolve(null),
      undefined: Promise.resolve(undefined),
    };

    const encoded = await encodeAsync(promises);
    const decoded: any = decode(encoded);

    await expect(decoded.zero).resolves.toStrictEqual(0);
    await expect(decoded.empty).resolves.toStrictEqual("");
    await expect(decoded.bigzero).resolves.toStrictEqual(0n);
    await expect(decoded.false).resolves.toStrictEqual(false);
    await expect(decoded.null).resolves.toStrictEqual(null);
    await expect(decoded.undefined).resolves.toStrictEqual(undefined);
  });

  test("Decode promises with complex types", async () => {
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

    const formData = await encodeAsync(obj);
    const parsed = decode(formData) as typeof obj;

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

  test("Decode obj with form", async () => {
    const obj = {
      formData: (() => {
        const f = new FormData();
        f.set("fruit", "orange");
        f.set("color", "purple");
        return f;
      })(),
    };

    const encoded = await encodeAsync(obj);
    const decoded: any = decode(encoded);

    const formData: FormData = decoded.formData;
    expect(formData).instanceOf(FormData);
    expect(formData).toBeTruthy();
    expect(formData.get("fruit")).toStrictEqual("orange");
    expect(formData.get("color")).toStrictEqual("purple");
  });

  test("Decode form with file", async () => {
    const obj = {
      formData: (() => {
        const f = new FormData();
        f.set("fruit", "orange");
        f.set("file", new File(["hello"], "hello.txt", { type: "text/plain" }));
        return f;
      })(),
    };

    const encoded = await encodeAsync(obj);
    const decoded: any = decode(encoded);

    const formData: FormData = decoded.formData;
    expect(formData).instanceOf(FormData);
    expect(formData).toBeTruthy();
    expect(formData.get("fruit")).toStrictEqual("orange");
    expect(formData.get("file")).instanceOf(Blob);

    const file = formData.get("file") as File;
    expect(file.name).toStrictEqual("hello.txt");
    await expect(file.text()).resolves.toStrictEqual("hello");
  });
});

type IndexableBuffer<T> = {
  [index: number]: T;
  readonly length: number;
};

describe("Decode buffer", () => {
  function fillBuffer<T>(buffer: IndexableBuffer<T>, set: (idx: number) => T) {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = set(i);
    }
  }

  test("Decode ArrayBuffer", async () => {
    const buffer = new ArrayBuffer(8);
    fillBuffer(new Uint8Array(buffer), (x) => x % 256);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as ArrayBuffer;

    const src = new DataView(buffer);
    const dst = new DataView(decoded);
    for (let i = 0; i < decoded.byteLength; i++) {
      expect(src.getUint8(i)).toStrictEqual(dst.getUint8(i));
    }
  });

  test("Decode Int8Array", async () => {
    const buffer = new Int8Array(new ArrayBuffer(8));
    fillBuffer(buffer, (x) => x % 256);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as Int8Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode Uint8Array", async () => {
    const buffer = new Uint8Array(new ArrayBuffer(8));
    fillBuffer(buffer, (x) => x % 256);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as Uint8Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode Uint8ClampedArray", async () => {
    const buffer = new Uint8ClampedArray(new ArrayBuffer(8));
    fillBuffer(buffer, (x) => x);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as Uint8ClampedArray;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode Int16Array", async () => {
    const buffer = new Int16Array(new ArrayBuffer(16));
    fillBuffer(buffer, (x) => x);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as Int16Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode Uint16Array", async () => {
    const buffer = new Uint16Array(new ArrayBuffer(16));
    fillBuffer(buffer, (x) => x);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as Uint16Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode Int32Array", async () => {
    const buffer = new Int32Array(new ArrayBuffer(32));
    fillBuffer(buffer, (x) => x);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as Int32Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode Uint32Array", async () => {
    const buffer = new Uint32Array(new ArrayBuffer(32));
    fillBuffer(buffer, (x) => x);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as Uint32Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode Float32Array", async () => {
    const buffer = new Float32Array(new ArrayBuffer(32));
    fillBuffer(buffer, (x) => x * 0.1);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as Float32Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode Float64Array", async () => {
    const buffer = new Float64Array(new ArrayBuffer(64));
    fillBuffer(buffer, (x) => x * 0.1);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as Float64Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode BigInt64Array", async () => {
    const buffer = new BigInt64Array(new ArrayBuffer(64));
    fillBuffer(buffer, (x) => BigInt(x));

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as BigInt64Array;

    for (let i = 0; i < decoded.length; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode BigUint64Array", async () => {
    const buffer = new BigUint64Array(new ArrayBuffer(64));
    fillBuffer(buffer, (x) => BigInt(x));

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as BigUint64Array;

    for (let i = 0; i < decoded.byteLength; i++) {
      expect(buffer[i]).toStrictEqual(decoded[i]);
    }
  });

  test("Decode DataView", async () => {
    const data = new ArrayBuffer(16);
    const buffer = new DataView(data);
    fillBuffer(new Uint8Array(data), (x) => x);

    const encoded = await encodeAsync(buffer);
    const decoded = decode(encoded) as DataView;

    for (let i = 0; i < decoded.byteLength; i++) {
      expect(buffer.getInt8(i)).toStrictEqual(decoded.getInt8(i));
    }
  });
});

describe("Decode with reviver and replacer", () => {
  test("Decode URL and regex", async () => {
    const obj = {
      url: new URL("http://127.0.0.1:3000/custom?text=hello&num=34"),
      regex: /^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})*$/i,
    };

    const formData = await encodeAsync(obj, (val) => {
      if (val instanceof URL) {
        return `$1${val.href}`; // `$1` as tag for URL
      }

      if (val instanceof RegExp) {
        return `$2${val.toString()}`; // `$2` as tag for RegExp
      }

      return undefined;
    });

    const value: any = decode(formData, (val) => {
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

describe("Decode async iterator", async () => {
  test("Should decode async iterator", async () => {
    async function* gen() {
      yield 1;
      yield 2;
    }

    const formData = await encodeAsync(gen());
    const value = decode(formData) as ReturnType<typeof gen>;

    expect((await value.next()).value).toStrictEqual(1);
    expect((await value.next()).value).toStrictEqual(2);
    expect((await value.next()).done).toBeTruthy();
  });
});
