import { describe, test, expect } from "vitest";
import { stringify, stringifyToStream, stringifyAsync } from "./stringify";
import { delay } from "../utils";

describe("stringify object", () => {
  test("Should stringify/parse complex object", async () => {
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
    const indices = JSON.parse(data);
    const parsed = indices[1];

    expect(parsed.string).toStrictEqual("$$hello");
    expect(parsed.boolean).toStrictEqual(true);
    expect(parsed.nullValue).toStrictEqual(null);
    expect(parsed.undefinedValue).toStrictEqual("$undefined");
    expect(parsed.positiveNumber).toStrictEqual(42);
    expect(parsed.negativeNumber).toStrictEqual(-69);
    expect(parsed.negativeZero).toStrictEqual("$-0");
    expect(parsed.infinity).toStrictEqual("$Infinity");
    expect(parsed.negativeInfinity).toStrictEqual("$-Infinity");
    expect(parsed.nan).toStrictEqual("$NaN");
    expect(parsed.date).toStrictEqual(`$D${new Date(0).toISOString()}`);
    expect(parsed.symbol).toStrictEqual("$SAyaka");
    expect(parsed.bigint).toStrictEqual("$n250");
    expect(parsed.array).toStrictEqual("$A2");
    expect(parsed.set).toStrictEqual("$W3");
    expect(parsed.map).toStrictEqual("$Q4");
    expect(parsed.nestedObject).toStrictEqual("$R5");

    expect(indices[2]).toStrictEqual([1, 2, 3])

    expect(indices[3]).toStrictEqual([1, "$$Erika", true, null, "$undefined"]);

    expect(indices[4]).toStrictEqual([
      ["$$number", 1],
      ["$$text", "$$hello"],
      ["$$boolean", true],
      ["$$null", null],
      ["$$undefined", "$undefined"],
    ]);

    expect(indices[5]).toStrictEqual({
      x: "$$bear",
      y: 23,
      z: true,
    })

  });
})

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
      `["$R1",{"num":24,"text":"$$hello","promise":"$@2"}]\n\n`
    );

    const p1 = JSON.parse(firstChunk)[1];
    expect(p1).toBeTruthy();
    expect(p1.num).toStrictEqual(24);
    expect(p1.text).toStrictEqual(`$$hello`);

    // Await for promises for complete
    await new Promise((resolve) => setTimeout(resolve, 50));
    const secondChunk = (await reader.read()).value!;
    expect(secondChunk).toStrictEqual(`["$@2",null,200]\n\n`);

    const p2 = JSON.parse(secondChunk);
    expect(p2[2]).toStrictEqual(200);
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
      `["$R1",{"num":"$@2","text":"$@3","promise":"$@4"}]\n\n`
    );

    const secondChunk = (await reader.read()).value!;
    expect(secondChunk).toStrictEqual(`["$@2",null,49]\n\n`);

    const thirdChunk = (await reader.read()).value!;
    expect(thirdChunk).toStrictEqual(`["$@3",null,null,"$$Ice Cream"]\n\n`);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const forthChunk = (await reader.read()).value!;
    expect(forthChunk).toStrictEqual(
      `["$@4",null,null,null,"$R5",{"name":"$$Ayaka"}]\n\n`
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
      yield false;

      await delay(100);
      yield Promise.resolve([1, 2, 3]);
    };

    const val = await stringifyAsync(gen());
    console.log({ val })
    const reader = stringifyToStream(gen()).getReader();
    const chunk_1 = (await reader.read())?.value;
    const chunk_2 = (await reader.read())?.value;
    const chunk_3 = (await reader.read())?.value;
    const chunk_4 = (await reader.read())?.value;
    const chunk_5 = (await reader.read())?.value;

    expect(chunk_1).toStrictEqual(`["$#1"]\n\n`);
    expect(chunk_2).toStrictEqual(`["$#1",[1]]\n\n`);
    expect(chunk_3).toStrictEqual(`["$#1",[false]]\n\n`);
    expect(chunk_4).toStrictEqual(`["$#1",["$A2"],[1,2,3]]\n\n`);
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


