---
sidebar_position: 3
---

# Supported Types

Types supported by `seria` in comparison with the standard `JSON` object.

| Data Type     | seria.stringify/parse | JSON.stringify/parse |
| ------------- | --------------------- | -------------------- |
| string        | ✅                    | ✅                   |
| number        | ✅                    | ✅                   |
| boolean       | ✅                    | ✅                   |
| null          | ✅                    | ✅                   |
| undefined     | ✅                    | ❌                   |
| Date          | ✅                    | ❌                   |
| BigInt        | ✅                    | ❌                   |
| Promise       | ✅                    | ❌                   |
| Symbol        | ✅                    | ❌                   |
| Set           | ✅                    | ❌                   |
| Map           | ✅                    | ❌                   |
| ArrayBuffer   | ✅                    | ❌                   |
| TypedArrays\* | ✅                    | ❌                   |
| DataView      | ✅                    | ❌                   |
| File\*        | ✅                    | ❌                   |
| FormData\*    | ✅                    | ❌                   |

:::tip[TypedArrays]
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Typed_arrays
:::

:::tip[File and FormData]
`File` and `FormData` are only supported using the `seria/form-data` module.
:::
