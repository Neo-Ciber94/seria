/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe, expect } from "vitest";
import { stringify } from "./stringify";
import { parse } from "./parse";
import { stringifyAsync } from "./stringifyAsync";

describe("Basic stringify/parse", () => {
  test("Should stringify/parse number", () => {
    const json = stringify(24);
    expect(json).toStrictEqual("[24]");
    const value = parse(json);
    expect(value).toStrictEqual(24);
  });

  test("Should stringify/parse negative number", () => {
    const json = stringify(-249.5);
    expect(json).toStrictEqual("[-249.5]");
    const value = parse(json);
    expect(value).toStrictEqual(-249.5);
  });

  test("Should stringify/parse infinite", () => {
    const json = stringify(Infinity);
    expect(json).toStrictEqual('["$Infinity"]');
    const num = parse(json);
    expect(num).toStrictEqual(Infinity);
  });

  test("Should stringify/parse negative infinity", () => {
    const json = stringify(-Infinity);
    expect(json).toStrictEqual('["$-Infinity"]');
    const value = parse(json);
    expect(value).toStrictEqual(-Infinity);
  });

  test("Should stringify/parse NaN", () => {
    const json = stringify(NaN);
    expect(json).toStrictEqual('["$NaN"]');
    const value = parse(json);
    expect(value).toStrictEqual(NaN);
  });

  test("Should stringify/parse negative 0", () => {
    const json = stringify(-0);
    expect(json).toStrictEqual('["$-0"]');
    const value = parse(json);
    expect(value).toStrictEqual(-0);
  });

  test("Should stringify/parse string", () => {
    const json = stringify("Hola amigos");
    expect(json).toStrictEqual('["$$Hola amigos"]');
    const value = parse(json);
    expect(value).toStrictEqual("Hola amigos");
  });

  test("Should stringify/parse unsafe string", () => {
    const json = stringify('<script>alert("Oh no!")</script>');
    expect(json).toStrictEqual('["$$<script>alert(\\"Oh no!\\")</script>"]');
    const value = parse(json);
    expect(value).toStrictEqual('<script>alert("Oh no!")</script>');
  });

  test("Should stringify/parse null", () => {
    const json = stringify(null);
    expect(json).toStrictEqual("[null]");
    const value = parse(json);
    expect(value).toStrictEqual(null);
  });

  test("Should stringify/parse undefined", () => {
    const json = stringify(undefined);
    expect(json).toStrictEqual('["$undefined"]');
    const value = parse(json);
    expect(value).toStrictEqual(undefined);
  });

  test("Should stringify/parse true", () => {
    const json = stringify(true);
    expect(json).toStrictEqual("[true]");
    const value = parse(json);
    expect(value).toStrictEqual(true);
  });

  test("Should stringify/parse false", () => {
    const json = stringify(false);
    expect(json).toStrictEqual("[false]");
    const value = parse(json);
    expect(value).toStrictEqual(false);
  });

  test("Should stringify/parse date", () => {
    const date = new Date("2024-03-16T00:35:15.000Z");
    const json = stringify(date);
    expect(json).toStrictEqual('["$D2024-03-16T00:35:15.000Z"]');
    const value = parse(json);
    expect(value).toStrictEqual(date);
  });

  test("Should stringify/parse invalid date", () => {
    const json = stringify(new Date("Invalid Date"));
    expect(json).toStrictEqual('["$D"]');
    const value = parse(json) as Date;
    expect(value.getTime()).toBeNaN();
  });

  test("Should stringify/parse symbol", () => {
    const json = stringify(Symbol.for("Ayaka"));
    expect(json).toStrictEqual('["$SAyaka"]');
    const value = parse(json);
    expect(value).toStrictEqual(Symbol.for("Ayaka"));
  });

  test("Should stringify/parse bigint", () => {
    const json = stringify(25009876543212345678989n);
    expect(json).toStrictEqual('["$n25009876543212345678989"]');
    const value = parse(json);
    expect(value).toStrictEqual(25009876543212345678989n);
  });

  test("Should stringify/parse array", () => {
    const json = stringify([1, 2, 3]);
    expect(json).toStrictEqual('["$A1",[1,2,3]]');
    const value = parse(json);
    expect(value).toStrictEqual([1, 2, 3]);
  });

  test("Should stringify/parse array with holes", () => {
    const arrayWithHoles = (() => {
      const arr = new Array(6);
      arr[1] = "Yatora";
      arr[4] = "Ryuji";
      return arr;
    })();

    const json = stringify(arrayWithHoles);
    expect(json).toStrictEqual(
      '["$A1",["$undefined","$$Yatora","$undefined","$undefined","$$Ryuji","$undefined"]]',
    );
    const value = parse(json) as typeof arrayWithHoles;
    expect(value.length).toStrictEqual(6);
  });

  test("Should stringify/parse set", () => {
    const json = stringify(new Set([1, "Mimimi", true, null, undefined]));
    expect(json).toStrictEqual('["$W1",[1,"$$Mimimi",true,null,"$undefined"]]');
    const value = parse(json);
    expect(value).toStrictEqual(new Set([1, "Mimimi", true, null, undefined]));
  });

  test("Should stringify/parse map with string keys ", () => {
    const json = stringify(
      new Map<any, any>([
        ["number", 1],
        ["text", "hello"],
        ["boolean", true],
        ["null", null],
        ["undefined", undefined],
      ]),
    );

    expect(json).toStrictEqual(
      '["$Q1",[["$$number",1],["$$text","$$hello"],["$$boolean",true],["$$null",null],["$$undefined","$undefined"]]]',
    );
    const value = parse(json);
    expect(value).toStrictEqual(
      new Map<string, any>([
        ["number", 1],
        ["text", "hello"],
        ["boolean", true],
        ["null", null],
        ["undefined", undefined],
      ]),
    );
  });

  test("Should stringify/parse map with different keys", () => {
    const date = new Date("2000-05-03T04:00:00.000Z");
    const json = stringify(
      new Map<any, any>([
        [3, true],
        [undefined, "adios"],
        [-2n, date],
        [null, false],
      ]),
    );

    expect(json).toStrictEqual(
      '["$Q1",[[3,true],["$undefined","$$adios"],["$n-2","$D2000-05-03T04:00:00.000Z"],[null,false]]]',
    );
    const map = parse(json) as Map<any, any>;
    expect(map).toStrictEqual(
      new Map<any, any>([
        [3, true],
        [undefined, "adios"],
        [-2n, new Date(2000, 4, 3, 0, 0, 0)],
        [null, false],
      ]),
    );

    expect(map.get(3)).toStrictEqual(true);
    expect(map.get(undefined)).toStrictEqual("adios");
    expect(map.get(-2n)).toStrictEqual(date);
    expect(map.get(null)).toStrictEqual(false);
  });

  test("Should stringify/parse object", () => {
    const json = stringify({ x: "bear", y: 23, z: true });
    expect(json).toStrictEqual('["$R1",{"x":"$$bear","y":23,"z":true}]');
    const value = parse(json);
    expect(value).toStrictEqual({ x: "bear", y: 23, z: true });
  });

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
    expect(json).toStrictEqual(
      '["$R1",{"str":"$$hello","num":42,"null":null,"undefined":"$undefined","truthty":true,"set":"$W2","map":"$Q3","obj":"$R4","promise":"$@5"},[1,"$$set",true],[["$$key","$$value"]],{"x":1,"y":"$$world","z":false},"$$adios amigos"]',
    );
    const value: any = parse(json);

    expect(value.str).toStrictEqual("hello");
    expect(value.num).toStrictEqual(42);
    expect(value.truthty).toStrictEqual(true);
    expect(value.null).toStrictEqual(null);
    expect(value.undefined).toStrictEqual(undefined);
    expect(value.set).toEqual(new Set([1, "set", true]));
    expect(value.map).toEqual(new Map([["key", "value"]]));
    expect(value.obj).toStrictEqual({ x: 1, y: "world", z: false });
    await expect(value.promise).resolves.toStrictEqual("adios amigos");
  });

  test("Should stringify/parse String object", () => {
    const json = stringify(new String("hola"));
    expect(json).toStrictEqual('["$$hola"]');
    const value = parse(json);
    expect(value).toStrictEqual("hola");
  });

  test("Should stringify/parse cyclic object", () => {
    const cyclicObject = (() => {
      const obj: any = { value: 23 };
      obj.self = obj;
      return obj;
    })();

    const json = stringify(cyclicObject);
    expect(json).toStrictEqual('["$R1",{"value":23,"self":"$R1"}]');
    const value = parse(json);
    expect(value).toStrictEqual(cyclicObject);
  });

  test("Should stringify/parse array with same reference", () => {
    const arrayWithSameReference = (() => {
      const obj = { name: "Ryuji Ayukawa" };
      const characters = [obj, obj, obj];
      return characters;
    })();

    const json = stringify(arrayWithSameReference);
    expect(json).toStrictEqual('["$A1",["$R2","$R2","$R2"],{"name":"$$Ryuji Ayukawa"}]');
    const value = parse(json);
    expect(value).toStrictEqual(arrayWithSameReference);
  });

  test("Should stringify/parse complex object with same reference", () => {
    const obj = { value: 69 };
    const complex = {
      self: obj,
      array: [obj, obj],
      map: new Map([["key", obj]]),
      set: new Set([obj]),
    };

    const json = stringify(complex);
    expect(json).toStrictEqual(
      '["$R1",{"self":"$R2","array":"$A3","map":"$Q4","set":"$W5"},{"value":69},["$R2","$R2"],[["$$key","$R2"]],["$R2"]]',
    );
    const decoded = parse(json) as typeof complex;

    expect(decoded).toStrictEqual({
      self: { value: 69 },
      array: [{ value: 69 }, { value: 69 }],
      map: new Map([["key", { value: 69 }]]),
      set: new Set([{ value: 69 }]),
    });
  });
});
