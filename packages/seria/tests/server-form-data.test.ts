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
    const formData = await c.req.formData();
    const value = decodeFormData(formData as FormData, null, {
      types: {
        FormData: UndiciFormData,
      },
    }) as BocchiCharacter;

    // Set the mocked value
    mockCharacter = value;

    for (const [_, file] of value.photos.entries()) {
      if (typeof file === "object") {
        await writeTempFile(file.name, file);
      }
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
        f.append("image_1", file, "bocchi.jpg");
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
    expect(mockCharacter?.photos).toBeTruthy();

    // Check if file exists
    expect(
      fs.statSync(path.join(__dirname, "temp", "bocchi.jpg")).isFile
    ).toBeTruthy();
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