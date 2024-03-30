import { describe, test, expect } from "vitest";
import { stringify, stringifyToStream, stringifyAsync } from "./stringify";

describe("stringify value", () => {
  test("stringify string", async () => {
    const data = stringify("hello world");
    expect(JSON.parse(data)[0]).toStrictEqual(`$$hello world`);
  });

  test("stringify boolean", async () => {
    const data = stringify(true);
    expect(JSON.parse(data)[0]).toStrictEqual(true);
  });

  test("stringify null", async () => {
    const data = stringify(null);
    expect(JSON.parse(data)[0]).toStrictEqual(null);
  });

  test("stringify undefined", async () => {
    const data = stringify(undefined);
    expect(JSON.parse(data)[0]).toStrictEqual("$undefined");
  });

  test("stringify positive number", async () => {
    const data = stringify(42);
    expect(JSON.parse(data)[0]).toStrictEqual(42);
  });

  test("stringify negative number", async () => {
    const data = stringify(-69);
    expect(JSON.parse(data)[0]).toStrictEqual(-69);
  });

  test("stringify negative 0", async () => {
    const data = stringify(-0);
    expect(JSON.parse(data)[0]).toStrictEqual(`$-0`);
  });

  test("stringify infinity", async () => {
    const data = stringify(Infinity);
    expect(JSON.parse(data)[0]).toStrictEqual(`$Infinity`);
  });

  test("stringify negative infinity", async () => {
    const data = stringify(-Infinity);
    expect(JSON.parse(data)[0]).toStrictEqual(`$-Infinity`);
  });

  test("stringify NaN", async () => {
    const data = stringify(NaN);
    expect(JSON.parse(data)[0]).toStrictEqual(`$NaN`);
  });

  test("stringify date", async () => {
    const data = stringify(new Date(2024, 2, 15, 20, 35, 15));
    const isoDate = new Date(2024, 2, 15, 20, 35, 15).toJSON();
    expect(JSON.parse(data)[0]).toStrictEqual(`$D${isoDate}`);
  });

  test("stringify symbol", async () => {
    const data = stringify(Symbol.for("Ayaka"));
    expect(JSON.parse(data)[0]).toStrictEqual(`$SAyaka`);
  });

  test("stringify bigint", async () => {
    const data = stringify(250n);
    expect(JSON.parse(data)[0]).toStrictEqual(`$n${250}`);
  });

  test("stringify array", async () => {
    const array = [1, 2, 3];
    const data = stringify(array);
    expect(JSON.parse(data)[0]).toStrictEqual([1, 2, 3]);
  });

  test("stringify set", async () => {
    const set = new Set([1, "Mimimi", true, null, undefined]);

    const data = stringify(set);
    expect(JSON.parse(data)[0]).toStrictEqual(`$W1`);
    expect(JSON.parse(data)[1]).toStrictEqual([
      1,
      "$$Mimimi",
      true,
      null,
      "$undefined",
    ]);
  });

  test("stringify map", async () => {
    const map = new Map<unknown, unknown>([
      ["number", 1],
      ["text", "hello"],
      ["boolean", true],
      ["null", null],
      ["undefined", undefined],
    ]);

    const data = JSON.parse(stringify(map));
    expect(data[0]).toStrictEqual(`$Q1`);
    expect(data[1]).toStrictEqual([
      ["$$number", 1],
      ["$$text", "$$hello"],
      ["$$boolean", true],
      ["$$null", null],
      ["$$undefined", "$undefined"],
    ]);
  });

  test("stringify plain object", async () => {
    const obj = { x: "bear", y: 23, z: true };
    const data = stringify(obj);
    expect(JSON.parse(data)[0]).toStrictEqual({ x: "$$bear", y: 23, z: true });
  });

  test("stringify complex object", async () => {
    const obj = {
      string: "hello",
      boolean: true,
      nullValue: null,
      undefinedValue: undefined,
      positiveNumber: 42,
      negativeNumber: -69,
      negativeZero: -0,
      infinity: Infinity,
      negativeInfinity: -Infinity,
      nan: NaN,
      date: new Date(0),
      symbol: Symbol.for("Ayaka"),
      bigint: 250n,
      array: [1, 2, 3],
      set: new Set([1, "Erika", true, null, undefined]),
      map: new Map<unknown, unknown>([
        ["number", 1],
        ["text", "hello"],
        ["boolean", true],
        ["null", null],
        ["undefined", undefined],
      ]),
      nestedObject: { x: "bear", y: 23, z: true },
    };

    const data = stringify(obj);
    const written = JSON.parse(data);
    const parsedObj = written[0];

    expect(parsedObj.string).toStrictEqual("$$hello");
    expect(parsedObj.boolean).toStrictEqual(true);
    expect(parsedObj.nullValue).toStrictEqual(null);
    expect(parsedObj.undefinedValue).toStrictEqual("$undefined");
    expect(parsedObj.positiveNumber).toStrictEqual(42);
    expect(parsedObj.negativeNumber).toStrictEqual(-69);
    expect(parsedObj.negativeZero).toStrictEqual("$-0");
    expect(parsedObj.infinity).toStrictEqual("$Infinity");
    expect(parsedObj.negativeInfinity).toStrictEqual("$-Infinity");
    expect(parsedObj.nan).toStrictEqual("$NaN");
    expect(parsedObj.date).toStrictEqual(`$D${new Date(0).toISOString()}`);
    expect(parsedObj.symbol).toStrictEqual("$SAyaka");
    expect(parsedObj.bigint).toStrictEqual("$n250");
    expect(parsedObj.array).toStrictEqual([1, 2, 3]);
    expect(parsedObj.set).toStrictEqual("$W1");
    expect(parsedObj.map).toStrictEqual("$Q2");
    expect(parsedObj.nestedObject).toStrictEqual({
      x: "$$bear",
      y: 23,
      z: true,
    });

    // references
    expect(written[1]).toStrictEqual([1, "$$Erika", true, null, "$undefined"]);

    expect(written[2]).toStrictEqual([
      ["$$number", 1],
      ["$$text", "$$hello"],
      ["$$boolean", true],
      ["$$null", null],
      ["$$undefined", "$undefined"],
    ]);
  });
});

describe("stringify promise", () => {
  test("Should throw on pending promise", () => {
    expect(() => stringify(Promise.resolve(99))).toThrow();
  });

  test("stringify promise", async () => {
    const promise = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 69;
    })();

    const data = await stringifyAsync(promise);
    expect(JSON.parse(data)[0]).toStrictEqual(`$@1`);
    expect(JSON.parse(data)[1]).toStrictEqual(69);
  });

  test("stringify resolved promise", async () => {
    const promise = Promise.resolve(42);
    const data = await stringifyAsync(promise);
    expect(JSON.parse(data)[0]).toStrictEqual(`$@1`);
    expect(JSON.parse(data)[1]).toStrictEqual(42);
  });

  test("stringify promise with set", async () => {
    const p = Promise.resolve(new Set([1, 2, 3]));
    const json = await stringifyAsync(p);

    expect(json).toStrictEqual(`["$@1","$W2",[1,2,3]]`);
  });

  test("stringify promise with promise", async () => {
    const promise = Promise.resolve(
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new Promise<number>((resolve) => resolve(34));
      })()
    );

    const data = await stringifyAsync(promise);
    expect(JSON.parse(data)[0]).toStrictEqual(`$@1`);
    expect(JSON.parse(data)[1]).toStrictEqual(34);
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
      `[{"num":24,"text":"$$hello","promise":"$@1"}]\n\n`
    );

    const p1 = JSON.parse(firstChunk)[0];
    expect(p1).toBeTruthy();
    expect(p1.num).toStrictEqual(24);
    expect(p1.text).toStrictEqual(`$$hello`);

    // Await for promises for complete
    await new Promise((resolve) => setTimeout(resolve, 50));
    const secondChunk = (await reader.read()).value!;
    expect(secondChunk).toStrictEqual(`["$@1",200]\n\n`);

    const p2 = JSON.parse(secondChunk);
    expect(p2[1]).toStrictEqual(200);
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
      `[{"num":"$@1","text":"$@2","promise":"$@3"}]\n\n`
    );

    const secondChunk = (await reader.read()).value!;
    expect(secondChunk).toStrictEqual(`["$@1",49]\n\n`);

    const thirdChunk = (await reader.read()).value!;
    expect(thirdChunk).toStrictEqual(`["$@2",null,"$$Ice Cream"]\n\n`);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const forthChunk = (await reader.read()).value!;
    expect(forthChunk).toStrictEqual(
      `["$@3",null,null,{"name":"$$Ayaka"}]\n\n`
    );

    expect((await reader.read()).done).toBeTruthy();
  });
});

describe("stringify async iterator", () => {
  test("Should throw on pending async generator", () => {
    const gen = async function* () {
      yield 1;
    };

    expect(() => stringify(gen())).toThrow();
  });

  test("Should stringify an async iterator", async () => {
    const gen = async function* () {
      yield 1;
      yield 2;
      yield 3;
    };

    const json = await stringifyAsync(gen());
    expect(json).toStrictEqual(`["$#1",[1,2,3,"done"]]`);
  });

  test("Should stringify an async iterator that yields async iterator", async () => {
    async function* range(from: number, to: number) {
      for (let i = from; i <= to; i++) {
        yield i;
      }
    }

    const gen = async function* () {
      yield 1;
      yield* range(2, 4);
      yield 5;
    };

    const json = await stringifyAsync(gen());
    expect(json).toStrictEqual(`["$#1",[1,2,3,4,5,"done"]]`);
  });

  test("Should stringify an async iterator that yields generators to stream", async () => {
    async function* range(from: number, to: number) {
      for (let i = from; i <= to; i++) {
        yield i;
      }
    }

    const gen = async function* () {
      yield 1;
      yield* range(2, 4);
      yield delay(100).then(() => 5);
    };

    const reader = stringifyToStream(gen()).getReader();
    const chunk_1 = (await reader.read())?.value;
    const chunk_2 = (await reader.read())?.value;
    const chunk_3 = (await reader.read())?.value;
    const chunk_4 = (await reader.read())?.value;
    const chunk_5 = (await reader.read())?.value;
    const chunk_6 = (await reader.read())?.value;
    const chunk_7 = (await reader.read())?.value;

    expect(chunk_1).toStrictEqual(`["$#1"]\n\n`);
    expect(chunk_2).toStrictEqual(`["$#1",[1]]\n\n`);
    expect(chunk_3).toStrictEqual(`["$#1",[2]]\n\n`);
    expect(chunk_4).toStrictEqual(`["$#1",[3]]\n\n`);
    expect(chunk_5).toStrictEqual(`["$#1",[4]]\n\n`);
    expect(chunk_6).toStrictEqual(`["$#1",[5]]\n\n`);
    expect(chunk_7).toStrictEqual(`["$#1",["done"]]\n\n`);

    expect((await reader.read())?.done).toBeTruthy();
  });

  test("Should stringify an async iterator that returns other async iterator to stream", async () => {
    async function* range(from: number, to: number) {
      for (let i = from; i <= to; i++) {
        yield i;
      }
    }

    const gen = async function* () {
      yield 1;
      yield range(2, 4);
      yield delay(100).then(() => 5);
    };

    const reader = stringifyToStream(gen()).getReader();
    const chunk_1 = (await reader.read())?.value;
    const chunk_2 = (await reader.read())?.value;
    const chunk_3 = (await reader.read())?.value;
    const chunk_4 = (await reader.read())?.value;
    const chunk_5 = (await reader.read())?.value;
    const chunk_6 = (await reader.read())?.value;
    const chunk_7 = (await reader.read())?.value;

    expect(chunk_1).toStrictEqual(`["$#1"]\n\n`);
    expect(chunk_2).toStrictEqual(`["$#1",[1]]\n\n`);
    expect(chunk_3).toStrictEqual(`["$#1",[2]]\n\n`);
    expect(chunk_4).toStrictEqual(`["$#1",[3]]\n\n`);
    expect(chunk_5).toStrictEqual(`["$#1",[4]]\n\n`);
    expect(chunk_6).toStrictEqual(`["$#1",[5]]\n\n`);
    expect(chunk_7).toStrictEqual(`["$#1",["done"]]\n\n`);

    expect((await reader.read())?.done).toBeTruthy();
  });

  test("Should stringify an async iterator to stream", async () => {
    const gen = async function* () {
      yield 1;
      yield 2;

      await delay(100);
      yield Promise.resolve(3);
    };

    const reader = stringifyToStream(gen()).getReader();
    const chunk_1 = (await reader.read())?.value;
    const chunk_2 = (await reader.read())?.value;
    const chunk_3 = (await reader.read())?.value;
    const chunk_4 = (await reader.read())?.value;
    const chunk_5 = (await reader.read())?.value;

    expect(chunk_1).toStrictEqual(`["$#1"]\n\n`);
    expect(chunk_2).toStrictEqual(`["$#1",[1]]\n\n`);
    expect(chunk_3).toStrictEqual(`["$#1",[2]]\n\n`);
    expect(chunk_4).toStrictEqual(`["$#1",[3]]\n\n`);
    expect(chunk_5).toStrictEqual(`["$#1",["done"]]\n\n`);

    expect((await reader.read())?.done).toBeTruthy();
  });

  test("Should stringify promise resolving to async iterator", async () => {
    const gen = async function* () {
      yield 1;
      yield 2;
    };

    const promise = Promise.resolve(gen());
    const json = await stringifyAsync(promise);
    expect(json).toStrictEqual(`["$@1","$#2",[1,2,"done"]]`);
  });

  test("Should stringify promise resolving to async iterator to stream", async () => {
    const gen = async function* () {
      yield 1;
      yield 2;
      yield delay(100).then(() => 3);
    };

    const promise = Promise.resolve(gen());
    const reader = stringifyToStream(promise).getReader();

    const chunk_1 = (await reader.read())?.value;
    const chunk_2 = (await reader.read())?.value;
    const chunk_3 = (await reader.read())?.value;
    const chunk_4 = (await reader.read())?.value;
    const chunk_5 = (await reader.read())?.value;
    const chunk_6 = (await reader.read())?.value;

    expect(chunk_1).toStrictEqual(`["$@1"]\n\n`);
    expect(chunk_2).toStrictEqual(`["$@1","$#2"]\n\n`);
    expect(chunk_3).toStrictEqual(`["$#2",null,[1]]\n\n`);
    expect(chunk_4).toStrictEqual(`["$#2",null,[2]]\n\n`);
    expect(chunk_5).toStrictEqual(`["$#2",null,[3]]\n\n`);
    expect(chunk_6).toStrictEqual(`["$#2",null,["done"]]\n\n`);
    expect((await reader.read())?.done).toBeTruthy();
  });
});

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
