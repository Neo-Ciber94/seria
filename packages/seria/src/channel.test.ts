import { describe, expect, test } from "vitest";
import { createChannel } from "./channel";

describe("Channel", () => {
  test("Should share id", () => {
    const [sender, receiver] = createChannel<number>({
      id: 99,
    });

    expect(sender.id).toStrictEqual(99);
    expect(receiver.id).toStrictEqual(99);
  });

  test("Should read channel values", async () => {
    const [sender, receiver] = createChannel<number>({ id: 1 });

    setImmediate(() => {
      for (let i = 0; i <= 3; i++) {
        sender.send(i);
      }

      sender.send(Promise.resolve(4));
      sender.close();
    });

    await expect(receiver.recv()).resolves.toStrictEqual(0);
    await expect(receiver.recv()).resolves.toStrictEqual(1);
    await expect(receiver.recv()).resolves.toStrictEqual(2);
    await expect(receiver.recv()).resolves.toStrictEqual(3);
    await expect(receiver.recv()).resolves.toStrictEqual(4);
    await expect(receiver.recv()).resolves.toBeUndefined();
  });

  test("Should hold until value is received", async () => {
    const [sender, receiver] = createChannel<string>({ id: 1 });

    setTimeout(() => {
      sender.send("Nobara");
    }, 100);

    await expect(receiver.recv()).resolves.toStrictEqual("Nobara");
  });

  test("Should throw if channel is closed", async () => {
    const [sender, receiver] = createChannel<number>({ id: 1 });

    setImmediate(() => {
      sender.send(1);
      sender.close();
    });

    await expect(receiver.recv()).resolves.toStrictEqual(1);
    expect(() => sender.send(2)).toThrow();
  });

  test("Should iterate over values", async () => {
    const [sender, receiver] = createChannel<number>({ id: 1 });

    setImmediate(() => {
      for (let i = 0; i < 3; i++) {
        sender.send(i);
      }

      sender.close();
    });

    let idx = 0;
    for await (const item of receiver) {
      expect(item).toStrictEqual(idx++);
    }

    await expect(receiver.recv()).resolves.toBeUndefined();
  });

  test("Should iterate using next()", async () => {
    const [sender, receiver] = createChannel<number>({ id: 1 });

    setImmediate(() => {
      sender.send(1);
      sender.send(2);
      sender.send(3);
      sender.close();
    });

    expect((await receiver.next()).value).toStrictEqual(1);
    expect((await receiver.next()).value).toStrictEqual(2);
    expect((await receiver.next()).value).toStrictEqual(3);
    expect((await receiver.next()).done).toBeTruthy();
  });

  test("Should get undefined after closed", async () => {
    const [sender, receiver] = createChannel<number>({ id: 1 });

    sender.send(1);
    sender.close();

    expect(await receiver.recv()).toStrictEqual(1);
    expect(await receiver.recv()).toBeUndefined();
    expect(await receiver.recv()).toBeUndefined();
  });

  test("Should resolve to undefined on close", async () => {
    const [sender, receiver] = createChannel<number>({ id: 1 });

    const p = receiver.recv();
    sender.close();

    await expect(p).resolves.toBeUndefined();
  });
});
