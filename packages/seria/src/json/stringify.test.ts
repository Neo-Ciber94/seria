import { describe, test, expect } from "vitest";
import {
  stringify,
  stringifyToStream,
  stringifyAsync,
} from "./stringify";

describe("stringify value", () => {
  test("stringify string", async () => {
    const data = stringify("hello world");
    expect(JSON.parse(data)[0]).toStrictEqual(`"$$hello world"`);
  });

  test("stringify boolean", async () => {
    const data = stringify(true);
    expect(JSON.parse(data)[0]).toStrictEqual(`true`);
  });

  test("stringify null", async () => {
    const data = stringify(null);
    expect(JSON.parse(data)[0]).toStrictEqual(`null`);
  });

  test("stringify undefined", async () => {
    const data = stringify(undefined);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$undefined"`);
  });

  test("stringify positive number", async () => {
    const data = stringify(42);
    expect(JSON.parse(data)[0]).toStrictEqual(`42`);
  });

  test("stringify negative number", async () => {
    const data = stringify(-69);
    expect(JSON.parse(data)[0]).toStrictEqual(`-69`);
  });

  test("stringify negative 0", async () => {
    const data = stringify(-0);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$-0"`);
  });

  test("stringify infinity", async () => {
    const data = stringify(Infinity);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$Infinity"`);
  });

  test("stringify negative infinity", async () => {
    const data = stringify(-Infinity);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$-Infinity"`);
  });

  test("stringify NaN", async () => {
    const data = stringify(NaN);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$NaN"`);
  });

  test("stringify date", async () => {
    const data = stringify(new Date(2024, 2, 15, 20, 35, 15));
    const isoDate = new Date(2024, 2, 15, 20, 35, 15).toJSON();
    expect(JSON.parse(data)[0]).toStrictEqual(`"$D${isoDate}"`);
  });

  test("stringify symbol", async () => {
    const data = stringify(Symbol.for("Ayaka"));
    expect(JSON.parse(data)[0]).toStrictEqual(`"$SAyaka"`);
  });

  test("stringify bigint", async () => {
    const data = stringify(250n);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$n${250}"`);
  });

  test("stringify array", async () => {
    const array = [1, 2, 3];
    const data = stringify(array);
    expect(JSON.parse(data)[0]).toStrictEqual(`[1,2,3]`);
  });

  test("stringify set", async () => {
    const set = new Set([1, "Mimimi", true, null, undefined]);

    const data = stringify(set);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$W1"`);
    expect(JSON.parse(data)[1]).toStrictEqual(
      `[1,"$$Mimimi",true,null,"$undefined"]`
    );
  });

  test("stringify map", async () => {
    const map = new Map<unknown, unknown>([
      ["number", 1],
      ["text", "hello"],
      ["boolean", true],
      ["null", null],
      ["undefined", undefined],
    ]);

    const data = stringify(map);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$Q1"`);
    expect(JSON.parse(data)[1]).toStrictEqual(
      `[["$$number",1],["$$text","$$hello"],["$$boolean",true],["$$null",null],["$$undefined","$undefined"]]`
    );
  });

  test("stringify plain object", async () => {
    const obj = { x: "bear", y: 23, z: true };
    const data = stringify(obj);
    expect(JSON.parse(data)[0]).toStrictEqual(`{"x":"$$bear","y":23,"z":true}`);
  });

  test("stringify promise", async () => {
    const promise = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 69;
    })();

    const data = await stringifyAsync(promise);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$@1"`);
    expect(JSON.parse(data)[1]).toStrictEqual("69");
  });

  test("stringify resolved promise", async () => {
    const promise = Promise.resolve(42);
    const data = await stringifyAsync(promise);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$@1"`);
    expect(JSON.parse(data)[1]).toStrictEqual("42");
  });

  test("stringify promise with promise", async () => {
    const promise = Promise.resolve(
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new Promise<number>((resolve) => resolve(34));
      })()
    );

    const data = await stringifyAsync(promise);
    expect(JSON.parse(data)[0]).toStrictEqual(`"$@1"`);
    expect(JSON.parse(data)[1]).toStrictEqual("34");
  });

  test("stringify to stream", async () => {
    const objWithPromise = {
      num: 24,
      text: "hello",
      promise: (async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 200;
      })(),
    };

    const stream = stringifyToStream(objWithPromise);
    const reader = stream.getReader();

    const firstChunk = (await reader.read()).value!;
    expect(firstChunk).toStrictEqual(
      `["{\\"num\\":24,\\"text\\":\\"$$hello\\",\\"promise\\":\\"$@1\\"}"]`
    );

    const p1 = JSON.parse(firstChunk)[0];
    expect(JSON.parse(p1)).toBeTruthy();
    expect(JSON.parse(p1).num).toStrictEqual(24);
    expect(JSON.parse(p1).text).toStrictEqual(`$$hello`);

    // Await for promises for complete
    await new Promise((resolve) => setTimeout(resolve, 50));
    const secondChunk = (await reader.read()).value!;
    expect(secondChunk).toStrictEqual(`["\\"$@1\\"","200"]`);

    const p2 = JSON.parse(secondChunk);
    expect(p2[1]).toStrictEqual("200");
    expect((await reader.read()).done).toBeTruthy();
  });

  test("stringify objet with promises", async () => {
    const objWithPromise = {
      num: Promise.resolve(49),
      text: Promise.resolve("Ice Cream"),
      promise: (async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { name: "Ayaka" };
      })(),
    };

    const stream = stringifyToStream(objWithPromise);
    const reader = stream.getReader();

    const firstChunk = (await reader.read()).value!;
    expect(firstChunk).toStrictEqual(
      `["{\\"num\\":\\"$@1\\",\\"text\\":\\"$@2\\",\\"promise\\":\\"$@3\\"}"]`
    );

    const secondChunk = (await reader.read()).value!;
    expect(secondChunk).toStrictEqual(`["\\"$@1\\"","49"]`);

    const thirdChunk = (await reader.read()).value!;
    expect(thirdChunk).toStrictEqual(`["\\"$@2\\"",null,"\\"$$Ice Cream\\""]`);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const forthChunk = (await reader.read()).value!;
    expect(forthChunk).toStrictEqual(
      `["\\"$@3\\"",null,null,"{\\"name\\":\\"$$Ayaka\\"}"]`
    );

    expect((await reader.read()).done).toBeTruthy();
  });
});
