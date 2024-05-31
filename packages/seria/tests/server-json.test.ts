/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { parse, parseFromStream, stringify, stringifyAsync, stringifyToStream } from "../src";
import { stream } from "hono/streaming";
import { delay } from "../src/utils";

const PORT = 5001;
type Server = ReturnType<typeof serve>;

let server: Server | undefined;

beforeAll(() => {
  const app = new Hono();
  app.get("/json", (c) => {
    const data = {
      num: 23,
      text: "Mimimi",
      truthy: true,
      array: [10, "red", false],
      bigint: 120_450n,
      date: new Date(2024, 2, 19, 8, 34, 15),
      symbol: Symbol.for("hello"),
      set: new Set([2, "4", true]),
      map: new Map<string, any>([
        ["fruit", "orange"],
        ["number", 42],
      ]),
    };

    const json = stringify(data);
    return c.newResponse(json, {
      headers: {
        "content-type": "application/json",
      },
    });
  });

  app.post("/resend", async (c) => {
    const text = await c.req.text();
    const data = parse(text);
    const json = await stringifyAsync(data);
    return c.newResponse(json, {
      headers: {
        "content-type": "application/json",
      },
    });
  });

  app.get("/stream", async (c) => {
    return stream(c, async (stream) => {
      const obj = {
        age: Promise.resolve(35),
        alive: (async () => {
          await delay(100);
          return true;
        })(),
        name: (async () => {
          await delay(200);
          return "Satoru Gojo";
        })(),
      };

      const jsonStream = stringifyToStream(obj);
      await stream.pipe(jsonStream);
      await stream.close();
    });
  });

  return new Promise<void>((resolve) => {
    server = serve(
      {
        fetch: app.fetch,
        hostname: "127.0.0.1",
        port: PORT,
      },
      () => resolve(),
    );
  });
});

describe("Server and client JSON", () => {
  test("Should parse server seria JSON", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/json`);
    const json = await res.text();
    const data = parse(json);

    expect(data).toStrictEqual({
      num: 23,
      text: "Mimimi",
      truthy: true,
      array: [10, "red", false],
      bigint: 120_450n,
      date: new Date(2024, 2, 19, 8, 34, 15),
      symbol: Symbol.for("hello"),
      set: new Set([2, "4", true]),
      map: new Map<string, any>([
        ["fruit", "orange"],
        ["number", 42],
      ]),
    });
  });

  test("Should send resolved promises", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/resend`, {
      method: "POST",
      body: await stringifyAsync({
        num: Promise.resolve(23),
        bool: (async () => {
          await delay(100);
          return true;
        })(),
        text: (async () => {
          await delay(200);
          return "adios";
        })(),
      }),
    });

    const json = await res.text();
    const data: any = parse(json);

    await expect(data.num).resolves.toStrictEqual(23);
    await expect(data.bool).resolves.toStrictEqual(true);
    await expect(data.text).resolves.toStrictEqual("adios");
  });

  test("Should parse from ReadableStream", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/stream`);
    const reader = res.body!;

    expect(reader).toBeTruthy();

    const stream = reader.pipeThrough(new TextDecoderStream());
    const obj: any = await parseFromStream(stream);

    await expect(obj.age).resolves.toStrictEqual(35);
    await expect(obj.alive).resolves.toStrictEqual(true);
    await expect(obj.name).resolves.toStrictEqual("Satoru Gojo");
  });
});

afterAll(() => {
  if (server) {
    server.close();
  }
});
