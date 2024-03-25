/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { decodeFormData, encodeToFormData } from "../src/form-data";
import fs from "fs";
import path from "path";
import { FormData as UndiciFormData } from "undici";

const PORT = 5002;
type Server = ReturnType<typeof serve>;

let server: Server | undefined;

type BocchiCharacter = {
  name: string;
  instrument: string;
  age: number;
  photos: FormData;
  debutYear: Date;
  soloBand: boolean;
  favouriteFoods: Set<string>;
  bandSenpais: Map<string, string>;
  money: bigint;
  futureGoalPromise: Promise<string>;
};

let mockCharacter: BocchiCharacter | undefined = undefined;

beforeAll(() => {
  const app = new Hono();

  app.post("/upload", async (c) => {
    const rawBody = await c.req.parseBody();
    const formData = new UndiciFormData();

    for (const [key, value] of Object.entries(rawBody)) {
      if (Array.isArray(value)) {
        value.forEach((f) => formData.append(key, f));
      } else {
        formData.append(key, value);
      }
    }

    const value = decodeFormData(formData as FormData, null, {
      types: {
        // @ts-expect-error FIXME
        FormData: UndiciFormData,
      },
    }) as BocchiCharacter;

    // Update the mocked value
    mockCharacter = value;

    for (const [_, entry] of value.photos.entries()) {
      const file = entry as File;
      console.log({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      });

      await writeTempFile("bocchi.jpg", file as File);
    }

    return c.json({ success: true });
  });

  return new Promise<void>((resolve) => {
    server = serve(
      {
        fetch: app.fetch,
        hostname: "127.0.0.1",
        port: PORT,
      },
      () => resolve()
    );
  });
});

describe("Server and client FormData", () => {
  test("Should upload file", async () => {
    const hitori: BocchiCharacter = {
      name: "Hitori Goto",
      instrument: "Guitar",
      age: 17,
      debutYear: new Date(2022, 0),
      soloBand: true,
      favouriteFoods: new Set(["Pizza", "Curry"]),
      bandSenpais: new Map([
        ["Ikuyo Kita", "Kita-chan"],
        ["Seika Nijika", "Nijika"],
      ]),
      money: 1000n,
      futureGoalPromise: new Promise((resolve) => {
        setTimeout(() => resolve("Become a Rock Star!"), 500);
      }),
      photos: (() => {
        const f = new FormData();
        const file = readFileFromArtifacts("bocchi_tech_tips.jpg");
        f.append("image_1", file);
        return f;
      })(),
    };

    const bodyFormData = await encodeToFormData(hitori);
    const res = await fetch(`http://127.0.0.1:${PORT}/upload`, {
      method: "POST",
      body: bodyFormData,
    });

    expect(res.ok).toBeTruthy();
    expect(mockCharacter?.name).toStrictEqual("Hitori Goto");
    expect(mockCharacter?.instrument).toStrictEqual("Guitar");
    expect(mockCharacter?.age).toStrictEqual(17);
    expect(mockCharacter?.debutYear).toStrictEqual(new Date(2022, 0));
    expect(mockCharacter?.soloBand).toBeTruthy();
    expect(mockCharacter?.favouriteFoods).toEqual(new Set(["Pizza", "Curry"]));
    expect(mockCharacter?.bandSenpais).toStrictEqual(
      new Map([
        ["Ikuyo Kita", "Kita-chan"],
        ["Seika Nijika", "Nijika"],
      ])
    );

    expect(mockCharacter?.money).toStrictEqual(1000n);
    await expect(mockCharacter?.futureGoalPromise).resolves.toStrictEqual(
      "Become a Rock Star!"
    );
  });
});

afterAll(() => {
  if (server) {
    server.close();
  }
});

function readFileFromArtifacts(filePath: string) {
  const testArtifactFile = path.join(__dirname, "test-artifacts", filePath);
  const fileData = fs.readFileSync(testArtifactFile);
  return new Blob([fileData]);
}

async function writeTempFile(filePath: string, file: File) {
  const tempFilePath = path.join(__dirname, "temp", filePath);
  const buffer = await file.arrayBuffer();
  fs.writeFileSync(tempFilePath, Buffer.from(buffer));
}
