// https://github.com/sindresorhus/is-plain-obj/blob/main/index.js
export function isPlainObject(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  );
}

export function bufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

interface TypedArrayLike extends ArrayBufferView {
  [index: number]: number;
}

export function base64ToBuffer<T extends TypedArrayLike>(
  base64String: string,
  Constructor: new (buffer: ArrayBuffer) => T
): T {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Constructor(bytes.buffer);
}

export const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
