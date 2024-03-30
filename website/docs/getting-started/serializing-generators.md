---
sidebar_position: 5
---

# Serializing Generators

Async iterables can also be serialized by `seria`. Although you can serialize them using `seria.stringifyAsync` we recommend
using streaming otherwise we will just wait for the generator to resolve before returning the values, with streaming we don't block
while generating the values.

## stringifyToStream

When using `seria.stringifyToStream` the returning stream will emit each of the values returned from the generator.

```ts
import { stringifyToStream, parseFromStream } from "seria";

async function* range(from: number, to: number) {
  for (let i = from; i <= to; i++) {
    yield i;
  }
}

const stream = stringifyToStream(range(1, 10));
const value = await parseFromStream(stream);

for await (const item of value as any) {
  console.log(item);
}
```
