---
sidebar_position: 3
---

# How it works?

In `seria` we represents the values that cannot be serialized by default in the form:

```bash
$<tag><id><data>?
```

For example this is how we represent some objects:

| value                   | seria                         |
| ----------------------- | ----------------------------- |
| `new Date(2024, 10, 4)` | `$D12024-11-04T04:00:00.000Z` |
| `Symbol.for("Nezuko")`  | `$S2Nezuko`                   |
| `undefined`             | `$undefined`                  |

When deserializing the look at the value and check the type by looking the `tag`
and the `id` let us know where the value is located on the `json` string, finally the data
is just used to restore the object.

## What about promises?

Promises are represented as `$@<id>` following the previous format `@` is the tag we use for promises,
the `id` is used to locate the result of the promise, when the promise is streamed and had not resolved
the promise will wait until the next chunks are send and then we check again if the value for the id exists to resolve the promise.