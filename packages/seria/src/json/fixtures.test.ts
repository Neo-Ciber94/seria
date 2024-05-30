/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe, expect } from "vitest";
import { stringify } from "./stringify";
import { parse } from "./parse";

describe("Basic stringify/parse", () => {
    test("Should stringify/parse number", () => {
        const resultJson = stringify(24);
        expect(resultJson).toStrictEqual("[24]");
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(24);
    });

    test("Should stringify/parse negative number", () => {
        const resultJson = stringify(-249.5);
        expect(resultJson).toStrictEqual("[-249.5]");
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(-249.5);
    });

    test("Should stringify/parse infinite", () => {
        const resultJson = stringify(Infinity);
        expect(resultJson).toStrictEqual('["$Infinity"]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(Infinity);
    });

    test("Should stringify/parse negative infinity", () => {
        const resultJson = stringify(-Infinity);
        expect(resultJson).toStrictEqual('["$-Infinity"]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(-Infinity);
    });

    test("Should stringify/parse NaN", () => {
        const resultJson = stringify(NaN);
        expect(resultJson).toStrictEqual('["$NaN"]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(NaN);
    });

    test("Should stringify/parse negative 0", () => {
        const resultJson = stringify(-0);
        expect(resultJson).toStrictEqual('["$-0"]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(-0);
    });

    test("Should stringify/parse string", () => {
        const resultJson = stringify("Hola amigos");
        expect(resultJson).toStrictEqual('["$$Hola amigos"]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual("Hola amigos");
    });

    test("Should stringify/parse unsafe string", () => {
        const resultJson = stringify('<script>alert("Oh no!")</script>');
        expect(resultJson).toStrictEqual('["$$<script>alert(\\"Oh no!\\")</script>"]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual('<script>alert("Oh no!")</script>');
    });

    test("Should stringify/parse null", () => {
        const resultJson = stringify(null);
        expect(resultJson).toStrictEqual('[null]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(null);
    });

    test("Should stringify/parse undefined", () => {
        const resultJson = stringify(undefined);
        expect(resultJson).toStrictEqual('["$undefined"]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(undefined);
    });

    test("Should stringify/parse true", () => {
        const resultJson = stringify(true);
        expect(resultJson).toStrictEqual('[true]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(true);
    });

    test("Should stringify/parse false", () => {
        const resultJson = stringify(false);
        expect(resultJson).toStrictEqual('[false]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(false);
    });

    test("Should stringify/parse date", () => {
        const resultJson = stringify(new Date(2024, 2, 15, 20, 35, 15));
        expect(resultJson).toStrictEqual('["$D2024-03-16T00:35:15.000Z"]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(new Date(2024, 2, 15, 20, 35, 15));
    });

    test("Should stringify/parse invalid date", () => {
        const resultJson = stringify(new Date("Invalid Date"));
        expect(resultJson).toStrictEqual('["$D"]');
        const parsedValue = parse(resultJson) as Date;
        expect(parsedValue.getTime()).toBeNaN();
    });

    test("Should stringify/parse symbol", () => {
        const resultJson = stringify(Symbol.for("Ayaka"));
        expect(resultJson).toStrictEqual('["$SAyaka"]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(Symbol.for("Ayaka"));
    });

    test("Should stringify/parse bigint", () => {
        const resultJson = stringify(25009876543212345678989n);
        expect(resultJson).toStrictEqual('["$n25009876543212345678989"]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(25009876543212345678989n);
    });

    test("Should stringify/parse array", () => {
        const resultJson = stringify([1, 2, 3]);
        expect(resultJson).toStrictEqual('["$A1",[1,2,3]]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual([1, 2, 3]);
    });

    test("Should stringify/parse array with holes", () => {
        const arrayWithHoles = (() => {
            const arr = new Array(6);
            arr[1] = "Yatora";
            arr[4] = "Ryuji";
            return arr;
        })();

        const resultJson = stringify(arrayWithHoles);
        expect(resultJson).toStrictEqual('["$A1",["$undefined","$$Yatora","$undefined","$undefined","$$Ryuji","$undefined"]]');
        const parsedValue = parse(resultJson) as typeof arrayWithHoles;
        expect(parsedValue.length).toStrictEqual(6);
    });

    test("Should stringify/parse set", () => {
        const resultJson = stringify(new Set([1, "Mimimi", true, null, undefined]));
        expect(resultJson).toStrictEqual('["$W1",[1,"$$Mimimi",true,null,"$undefined"]]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(new Set([1, "Mimimi", true, null, undefined]));
    });

    test("Should stringify/parse map with string keys ", () => {
        const resultJson = stringify(new Map<any, any>([
            ["number", 1],
            ["text", "hello"],
            ["boolean", true],
            ["null", null],
            ["undefined", undefined],
        ]));

        expect(resultJson).toStrictEqual('["$Q1",[["$$number",1],["$$text","$$hello"],["$$boolean",true],["$$null",null],["$$undefined","$undefined"]]]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(new Map<string, any>([
            ["number", 1],
            ["text", "hello"],
            ["boolean", true],
            ["null", null],
            ["undefined", undefined],
        ]));
    });

    test("Should stringify/parse map with different keys", () => {
        const resultJson = stringify(new Map<any, any>([
            [3, true],
            [undefined, "adios"],
            [-2n, new Date(2000, 4, 3)],
            [Symbol.for("key"), false]
        ]));

        expect(resultJson).toStrictEqual('["$Q1",[[3,true],["$undefined","$$adios"],["$n-2","$D2000-05-03T04:00:00.000Z"],["$Skey",false]]]');
        const map = parse(resultJson) as Map<any, any>;
        expect(map).toStrictEqual(new Map<any, any>([
            [3, true],
            [undefined, "adios"],
            [-2n, new Date(2000, 4, 3)],
            [Symbol.for("key"), false]
        ]));

        expect(map.get(3)).toStrictEqual(true);
        expect(map.get(undefined)).toStrictEqual("adios");
        expect(map.get(-2n)).toStrictEqual(new Date(2000, 4, 3));
        expect(map.get(Symbol.for("key"))).toStrictEqual(false);
    });

    test("Should stringify/parse object", () => {
        const resultJson = stringify({ x: "bear", y: 23, z: true });
        expect(resultJson).toStrictEqual('["$R1",{"x":"$$bear","y":23,"z":true}]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual({ x: "bear", y: 23, z: true });
    });

    test("Should stringify/parse String object", () => {
        const resultJson = stringify(new String("hola"));
        expect(resultJson).toStrictEqual('["$$hola"]')
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual("hola");
    });

    test("Should stringify/parse cyclic object", () => {
        const cyclicObject = (() => {
            const obj: any = { value: 23 };
            obj.self = obj;
            return obj;
        })();

        const resultJson = stringify(cyclicObject);
        expect(resultJson).toStrictEqual('["$R1",{"value":23,"self":"$R1"}]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(cyclicObject);
    });

    test("Should stringify/parse array with same reference", () => {
        const arrayWithSameReference = (() => {
            const obj = { name: "Ryuji Ayukawa" }
            const characters = [obj, obj, obj];
            return characters;
        })();

        const resultJson = stringify(arrayWithSameReference);
        expect(resultJson).toStrictEqual('["$A1",["$R2","$R2","$R2"],{"name":"$$Ryuji Ayukawa"}]');
        const parsedValue = parse(resultJson);
        expect(parsedValue).toStrictEqual(arrayWithSameReference);
    });
});

// describe("Promises", () => {

// })

// describe("Streams", () => {

// })
