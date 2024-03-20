# Seria

Seria is a serialization and deserialization library that goes beyond the conventional capabilities of JSON. It provides seamless handling for various data types, including those that JSON cannot handle directly.

> This library is inspired on the new serialization capabilities `react` provides for server actions.

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
import { encodeToFormData, decodeFormData } from "seria/form-data";

const formData = await encodeToFormData(value);
const value = decodeFormData(formData);
```

### Stream Handling

Seria provides stream-based serialization and deserialization:

```ts
import * as seria from "seria";

const stream = seria.stringifyToStream(value);
const result = await seria.parseStream(stream);
```

If you serialize a value that contains any `Promise` you need to serialize using a stream or use `seria.stringifyWithPromises` which resolve all the promises.

## Supported Data Types

Seria supports various data types, including:

- string/number/boolean/null
- Date
- BigInt
- Promise
- Symbol
- Set
- Map
- ArrayBuffer
- Int8Array
- Uint8Array
- Uint8ClampedArray
- Int16Array
- Uint16Array
- Int32Array
- Uint32Array
- Float32Array
- Float64Array
- BigInt64Array
- BigUint64Array
- DataView

`FormData` is supported using the `seria/form-data`
