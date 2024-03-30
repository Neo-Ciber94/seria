# Seria

[![CI][ci-badge]][ci-link] [![npm version][npm-badge]][npm-link]

[ci-badge]: https://github.com/Neo-Ciber94/seria/actions/workflows/ci.yml/badge.svg
[ci-link]: https://github.com/Neo-Ciber94/seria/actions/workflows/ci.yml
[npm-badge]: https://badge.fury.io/js/seria.svg
[npm-link]: https://badge.fury.io/js/seria

Seria is a serialization and deserialization library that goes beyond the conventional capabilities of JSON. It provides seamless handling for various data types, including those that JSON cannot handle directly.

> This library is inspired on the new serialization capabilities `react` provides for server actions.

<div style="text-align: center;">
  <img src="./website/static/img/logo.png" alt="seria logo" width="64" height="64">
  <a href="https://neo-ciber94.github.io/seria/"><h1>seria - docs</h1></a>
</div>

## Installation

```bash
npm install seria
```

```bash
yarn add seria
```

```bash
pnpm add seria
```

## Usage

### Serialization and Deserialization

```ts
import * as seria from "seria";

const json = seria.stringify(value);
const value = seria.parse(json);
```

### FormData Handling

Seria also supports encoding and decoding FormData:

```ts
import { encode, decode } from "seria/form-data";

const formData = encode(value);
const value = decode(formData);
```

### Stream Handling

Seria provides stream-based serialization and deserialization:

```ts
import * as seria from "seria";

const stream = seria.stringifyToStream(value);
const result = await seria.parseFromStream(stream);
```

If you serialize a value that contains any `Promise` you need to serialize using a stream or use `seria.stringifyAsync` which resolve all the promises.

## Supported Data Types

Types supported by `seria` in comparison with the standard `JSON` object.

| Data Type         | seria.stringify/parse | JSON.stringify/parse |
| ----------------- | --------------------- | -------------------- |
| string            | ✅                    | ✅                   |
| number            | ✅                    | ✅                   |
| boolean           | ✅                    | ✅                   |
| null              | ✅                    | ✅                   |
| undefined         | ✅                    | ❌                   |
| Date              | ✅                    | ❌                   |
| BigInt            | ✅                    | ❌                   |
| Promise           | ✅                    | ❌                   |
| Symbol            | ✅                    | ❌                   |
| Set               | ✅                    | ❌                   |
| Map               | ✅                    | ❌                   |
| ArrayBuffer       | ✅                    | ❌                   |
| Int8Array         | ✅                    | ❌                   |
| Uint8Array        | ✅                    | ❌                   |
| Uint8ClampedArray | ✅                    | ❌                   |
| Int16Array        | ✅                    | ❌                   |
| Uint16Array       | ✅                    | ❌                   |
| Int32Array        | ✅                    | ❌                   |
| Uint32Array       | ✅                    | ❌                   |
| Float32Array      | ✅                    | ❌                   |
| Float64Array      | ✅                    | ❌                   |
| BigInt64Array     | ✅                    | ❌                   |
| BigUint64Array    | ✅                    | ❌                   |
| DataView          | ✅                    | ❌                   |
| File\*            | ✅                    | ❌                   |
| FormData\*        | ✅                    | ❌                   |

> `File` and `FormData` are supported on `seria/form-data`.
