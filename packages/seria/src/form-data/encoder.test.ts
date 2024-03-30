import { describe, expect, test } from "vitest";
import { encodeAsync, encode } from ".";

describe("Encode value", () => {
  test("Encode string", async () => {
    const value = await encodeAsync("hello world");
    expect(value.get("0")).toStrictEqual(`"$$hello world"`);
  });

  test("Encode boolean", async () => {
    const value = await encodeAsync(true);
    expect(value.get("0")).toStrictEqual(`true`);
  });

  test("Encode null", async () => {
    const value = await encodeAsync(null);
    expect(value.get("0")).toStrictEqual(`null`);
  });

  test("Encode undefined", async () => {
    const value = await encodeAsync(undefined);
    expect(value.get("0")).toStrictEqual(`"$undefined"`);
  });

  test("Encode positive number", async () => {
    const value = await encodeAsync(42);
    expect(value.get("0")).toStrictEqual(`42`);
  });

  test("Encode negative number", async () => {
    const value = await encodeAsync(-69);
    expect(value.get("0")).toStrictEqual(`-69`);
  });

  test("Encode negative 0", async () => {
    const value = await encodeAsync(-0);
    expect(value.get("0")).toStrictEqual(`"$-0"`);
  });

  test("Encode infinity", async () => {
    const value = await encodeAsync(Infinity);
    expect(value.get("0")).toStrictEqual(`"$Infinity"`);
  });

  test("Encode negative infinity", async () => {
    const value = await encodeAsync(-Infinity);
    expect(value.get("0")).toStrictEqual(`"$-Infinity"`);
  });

  test("Encode NaN", async () => {
    const value = await encodeAsync(NaN);
    expect(value.get("0")).toStrictEqual(`"$NaN"`);
  });

  test("Encode date", async () => {
    const value = await encodeAsync(new Date(2024, 2, 15, 20, 35, 15));
    const isoDate = new Date(2024, 2, 15, 20, 35, 15).toJSON();
    expect(value.get("0")).toStrictEqual(`"$D${isoDate}"`);
  });

  test("Encode symbol", async () => {
    const value = await encodeAsync(Symbol.for("Ayaka"));
    expect(value.get("0")).toStrictEqual(`"$SAyaka"`);
  });

  test("Encode bigint", async () => {
    const value = await encodeAsync(250n);
    expect(value.get("0")).toStrictEqual(`"$n${250}"`);
  });

  test("Encode array", async () => {
    const array = [1, 2, 3];

    const value = await encodeAsync(array);
    expect(value.get("0")).toStrictEqual(`[1,2,3]`);
  });

  test("Encode set", async () => {
    const set = new Set([1, "Mimimi", true, null, undefined]);

    const value = await encodeAsync(set);
    expect(value.get("0")).toStrictEqual(`"$W1"`);
    expect(value.get("1")).toStrictEqual(
      `[1,"$$Mimimi",true,null,"$undefined"]`
    );
  });

  test("Encode map", async () => {
    const map = new Map<unknown, unknown>([
      ["number", 1],
      ["text", "hello"],
      ["boolean", true],
      ["null", null],
      ["undefined", undefined],
    ]);

    const value = await encodeAsync(map);
    expect(value.get("0")).toStrictEqual(`"$Q1"`);
    expect(value.get("1")).toStrictEqual(
      `[["$$number",1],["$$text","$$hello"],["$$boolean",true],["$$null",null],["$$undefined","$undefined"]]`
    );
  });

  test("Encode plain object", async () => {
    const obj = { x: "bear", y: 23, z: true };

    const value = await encodeAsync(obj);
    expect(value.get("0")).toStrictEqual(`{"x":"$$bear","y":23,"z":true}`);
  });

  test("Encode promise", async () => {
    const promise = Promise.resolve(69);
    const value = await encodeAsync(promise);
    expect(value.get("0")).toStrictEqual(`"$@1"`);
    expect(value.get("1")).toStrictEqual(`69`);
  });

  test("Encode FormData", async () => {
    const formData = new FormData();
    formData.set("fruit", "10");
    formData.set("color", "red");

    const value = await encodeAsync(formData);
    expect(value.get("0")).toStrictEqual(`"$K1"`);
    expect(value.get("1_fruit")).toStrictEqual(`10`);
    expect(value.get("1_color")).toStrictEqual(`red`);
  });

  test("Encode FormData with blob", async () => {
    const formData = new FormData();
    formData.set("fruit", "10");
    formData.set("file", new Blob(["hello world"], { type: "text/plain" }));

    const value = await encodeAsync(formData);
    expect(value.get("0")).toStrictEqual(`"$K1"`);
    expect(value.get("1_fruit")).toStrictEqual(`10`);
    expect(value.get("1_file")).toBeInstanceOf(Blob);
  });

  test("Encode File", async () => {
    const file = new File(["hello world"], "hello.txt", {
      type: "text/plain",
    });

    const value = await encodeAsync(file);
    expect(value.get("0")).toStrictEqual(`"$k1"`);
    expect(value.get("1_file")).instanceOf(File);
  });
});

describe("Encode buffers", () => {
  test("Encode ArrayBuffer", async () => {
    const buffer = new ArrayBuffer(8);
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$A1"`);
  });

  test("Encode Int8Array", async () => {
    const buffer = new Int8Array(new ArrayBuffer(8));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$C1"`);
  });

  test("Encode Uint8Array", async () => {
    const buffer = new Uint8Array(new ArrayBuffer(8));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$c1"`);
  });

  test("Encode Uint8ClampedArray", async () => {
    const buffer = new Uint8ClampedArray(new ArrayBuffer(8));

    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$U1"`);
  });

  test("Encode Int16Array", async () => {
    const buffer = new Int16Array(new ArrayBuffer(16));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$P1"`);
  });

  test("Encode Uint16Array", async () => {
    const buffer = new Uint16Array(new ArrayBuffer(8));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$p1"`);
  });

  test("Encode Int32Array", async () => {
    const buffer = new Int32Array(new ArrayBuffer(8));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$L1"`);
  });

  test("Encode Uint32Array", async () => {
    const buffer = new Uint32Array(new ArrayBuffer(8));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$l1"`);
  });

  test("Encode Float32Array", async () => {
    const buffer = new Float32Array(new ArrayBuffer(8));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$F1"`);
  });

  test("Encode Float64Array", async () => {
    const buffer = new Float64Array(new ArrayBuffer(8));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$d1"`);
  });

  test("Encode BigInt64Array", async () => {
    const buffer = new BigInt64Array(new ArrayBuffer(8));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$N1"`);
  });

  test("Encode BigUint64Array", async () => {
    const buffer = new BigUint64Array(new ArrayBuffer(8));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$m1"`);
  });

  test("Encode DataView", async () => {
    const buffer = new DataView(new ArrayBuffer(8));
    const value = await encodeAsync(buffer);
    expect(value.get("0")).toStrictEqual(`"$V1"`);
  });
});

describe("Encode sync", () => {
  test("Encode sync plain object", () => {
    const obj = { x: "bear", y: 23, z: true };

    const value = encode(obj);
    expect(value.get("0")).toStrictEqual(`{"x":"$$bear","y":23,"z":true}`);
  });

  test("Should throw if value contains promise", () => {
    const obj = {
      promise: Promise.resolve(10),
    };

    expect(() => {
      encode(obj);
    }).toThrow();
  });
});
