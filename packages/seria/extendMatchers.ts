/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from "vitest";

expect.extend({
  async toMatchSequence(received, expected) {
    const { isNot, equals } = this;

    if (!isAsyncIterable(received)) {
      throw new Error("Expected 'received' to be an async iterator");
    }

    const arr = Array.isArray(expected) ? expected : [expected];
    let matchAll = true;
    let expectedItem: any = undefined;
    let receivedItem: any = undefined;

    let idx = 0;

    for await (const item of received) {
      if (idx > arr.length) {
        matchAll = false;
        break;
      }

      expectedItem = item;
      receivedItem = arr[idx++];

      if (!equals(expectedItem, receivedItem)) {
        matchAll = false;
        break;
      }
    }

    const lastIndex = idx > 0 ? idx - 1 : 0;

    return {
      pass: matchAll,
      actual: `position ${lastIndex}: ${expectedItem}`,
      expected: `position ${lastIndex}: ${receivedItem}`,
      message: () =>
        `Async iterator ${isNot ? "match" : "doesn't match"} sequence: ${JSON.stringify(arr)}`,
    };
  },
});

interface CustomMatchers<R = unknown> {
  toMatchSequence: (expected: any[]) => Promise<R>;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

function isAsyncIterable(value: any): value is AsyncIterable<unknown> {
  return value != null && typeof value[Symbol.asyncIterator] === "function";
}
