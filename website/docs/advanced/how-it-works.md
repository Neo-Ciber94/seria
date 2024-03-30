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

## Promises

Promises are represented as `$@<id>` following the previous format `@` is the tag we use for promises,
the `id` is used to locate the result of the promise, when the promise is streamed and had not resolved
the promise will wait until the next chunks are send and then we check again if the value for the id exists to resolve the promise.

When the promise is streamed the data send have this format:

```js
"[chunk 1]"\n\n

"[chunk 3]"\n\n

"[chunk 2]"\n\n

"[chunk 4]"\n\n
```

When deserializing we just split the incoming stream `\n\n` and then parse each value.

## Async Iterators

Async iterators are represented with `$#<id>` the `id` let us know where the emitted item or items are located, the items always will be represented as an array.

Let's use for example a generator like this:

```js
async function* gen() {
  yield 1;
  yield 2;
  yield 3;
}
```

When using `stringifyAsync` we'll wait for all the values and the emitted json will look like this:

```js
["$#1", [1,2,3,"done"]];
```

For async iterators we recommend using streaming instead, when using `stringifyToStream` we get:

```js
["$#1"]\n\n

["$#1",[1]]\n\n

["$#1",[2]]\n\n

["$#1",[3]]\n\n

["$#1",["done"]]\n\n
```

Notice the last item we emit is a string with the contents `"done"` as you may imagine it tell us the stop point of the iterator.