import { describe, test, expect } from "vitest";
import { delay } from "../utils";
import { stringify } from "./stringify";
import { stringifyAsync } from "./stringifyAsync";
import { stringifyToStream } from "./stringifyToStream";

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

    expect(indices[2]).toStrictEqual([1, 2, 3]);

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
    });
  });
});

describe("Fail to stringify", () => {
  test("Should fail to stringify function", () => {
    expect(() => stringify(function () {})).toThrow();
  });
});

describe("stringify promise", () => {
  test("Should throw on pending promise", () => {
    expect(() => stringify(Promise.resolve(99))).toThrow();
  });

  test("Should stringifyAsync promise", async () => {
    const promise = (async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 69;
    })();

    const json = await stringifyAsync(promise);
    expect(json).toStrictEqual('["$@1",{"resolved":69}]');
  });

  test("Should stringifyAsync resolved promise", async () => {
    const promise = Promise.resolve(42);
    const json = await stringifyAsync(promise);
    expect(json).toStrictEqual('["$@1",{"resolved":42}]');
  });

  test("Should stringifyAsync rejected promise", async () => {
    const promise = Promise.reject(new Error("Oh oh"));
    const json = await stringifyAsync(promise);
    expect(json).toStrictEqual('["$@1",{"rejected":"$E2"},"Oh oh"]');
  });

  test("Should stringifyAsync resolved and rejected promise", async () => {
    const promises = [Promise.resolve({ x: 10 }), Promise.reject({ error: "This is an error" })];
    const json = await stringifyAsync(promises);

    expect(json).toStrictEqual(
      '["$A1",["$@2","$@3"],{"resolved":"$R4"},{"rejected":"$R5"},{"x":10},{"error":"$$This is an error"}]',
    );
  });

  test("Should stringifyAsync promise with set", async () => {
    const p = Promise.resolve(new Set([1, 2, 3]));
    const json = await stringifyAsync(p);

    expect(json).toStrictEqual(`["$@1",{"resolved":"$W2"},[1,2,3]]`);
  });

  test("Should stringifyAsync promise with promise", async () => {
    const promise = Promise.resolve(
      (async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new Promise<number>((resolve) => resolve(34));
      })(),
    );

    const json = await stringifyAsync(promise);
    expect(json).toStrictEqual('["$@1",{"resolved":34}]');
  });

  test("Should stringifyAsync promise that return promise", async () => {
    const p = delay(100).then(() => delay(200).then(() => true));
    const json = await stringifyAsync(p);
    expect(json).toStrictEqual('["$@1",{"resolved":true}]');
  });

  test.skip("Should stringifyAsync promise that spawn other promise", async () => {
    const p = Promise.resolve({ x: delay(100).then(() => "hello there") });
    const json = await stringifyAsync(p);

    expect(json).toStrictEqual(
      '["$@1",{"resolved":"$E4"},{"x":"$@3"},null,"Promise resolved with object containing other promises"]',
    );
  });

  test("Should stringifyToStream object with single promise", async () => {
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

    const chunk_1 = (await reader.read()).value!;
    expect(chunk_1).toStrictEqual(`["$R1",{"num":24,"text":"$$hello","promise":"$@2"}]\n\n`);

    const chunk_2 = (await reader.read()).value!;
    expect(chunk_2).toStrictEqual(`["$@2",null,{"resolved":200}]\n\n`);

    expect((await reader.read()).done).toBeTruthy();
  });

  test("Should stringifyToStream object with multiple promises", async () => {
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

    const chunk_1 = (await reader.read()).value!;
    expect(chunk_1).toStrictEqual(`["$R1",{"num":"$@2","text":"$@3","promise":"$@4"}]\n\n`);

    const chunk_2 = (await reader.read()).value!;
    expect(chunk_2).toStrictEqual(`["$@2",null,{"resolved":49}]\n\n`);

    const chunk_3 = (await reader.read()).value!;
    expect(chunk_3).toStrictEqual(`["$@3",null,null,{"resolved":"$$Ice Cream"}]\n\n`);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const chunk_4 = (await reader.read()).value!;
    expect(chunk_4).toStrictEqual(
      `["$@4",null,null,null,{"resolved":"$R5"},{"name":"$$Ayaka"}]\n\n`,
    );

    expect((await reader.read()).done).toBeTruthy();
  });

  test.skip("Should stringifyToStream object with rejected promise", async () => {
    const obj = {
      success: Promise.resolve(10),
      failure: Promise.reject("Adios amigos"),
    };

    const stream = stringifyToStream(obj);
    const reader = stream.getReader();

    const chunk_1 = (await reader.read()).value;
    expect(chunk_1).toStrictEqual('["$R1",{"success":"$@2","failure":"$@3"}]\n\n');

    const chunk_2 = (await reader.read()).value;
    expect(chunk_2).toStrictEqual('["$@2",null,{"resolved":10}]\n\n');

    const chunk_3 = (await reader.read()).value;
    expect(chunk_3).toStrictEqual('["$@3",null,null,{"rejected":"$$Adios amigos"}]\n\n');

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

  test("Should stringifyAsync an async iterator", async () => {
    const gen = async function* () {
      yield 1;
      yield 2;
      yield 3;
    };

    const json = await stringifyAsync(gen());
    expect(json).toStrictEqual(`["$#1",[1,2,3,"done"]]`);
  });

  test("Should stringifyAsync an async iterator that yields async iterator", async () => {
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

  test("Should stringifyToStream an async iterator that yields generators to stream", async () => {
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

  test("Should stringifyToStream an async iterator that returns other async iterator to stream", async () => {
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

  test("Should stringifyAsync an async iterator to stream", async () => {
    const gen = async function* () {
      yield 1;
      yield false;

      await delay(100);
      yield Promise.resolve([1, 2, 3]);
    };

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

  test("Should stringifyAsync promise resolving to async iterator", async () => {
    const gen = async function* () {
      yield 1;
      yield 2;
    };

    const promise = Promise.resolve(gen());
    const json = await stringifyAsync(promise);
    expect(json).toStrictEqual(`["$@1",{"resolved":"$#2"},[1,2,"done"]]`);
  });

  test("Should stringifyToStream promise resolving to async iterator to stream", async () => {
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
    expect(chunk_2).toStrictEqual(`["$@1",{"resolved":"$#2"}]\n\n`);
    expect(chunk_3).toStrictEqual(`["$#2",null,[1]]\n\n`);
    expect(chunk_4).toStrictEqual(`["$#2",null,[2]]\n\n`);
    expect(chunk_5).toStrictEqual(`["$#2",null,[3]]\n\n`);
    expect(chunk_6).toStrictEqual(`["$#2",null,["done"]]\n\n`);
    expect((await reader.read())?.done).toBeTruthy();
  });
});
