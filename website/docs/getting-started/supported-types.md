---
sidebar_position: 3
---

# Supported Types

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
| FormData\*        | ✅                    | ❌                   |

:::tip[FormData] 
`FormData` is supported using the `seria/form-data` module.
:::