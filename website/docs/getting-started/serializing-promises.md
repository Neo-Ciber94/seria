---
sidebar_position: 4
---

# Serializing Promises

Serializing promises or values containing primises.

## stringifyAsync

The easiest way to serialize a promise with seria is using `seria.stringifyAsync`.

```ts
import { stringifyAsync } from "seria";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hero = {
  name: Promise.resolve("Shoto Todoroki"),
  quirk: Promise.resolve("Half-Cold Half-Hot"),
  age: Promise.resolve(16),
  heroName: delay(1000).then(() => Symbol.for("Shoto")),
};

const json = seria.stringifyAsync(hero);
```

For most cases this is enough, `stringifyAsync` will await all the promises found before returning the serialized value that then can be parsed back with `seria.parse`, all the promises returned by `parse` with be promises which value is just a `Promise.resolve(value)`.

But when you are communicating between a server and client maybe you don't want your client to wait for all the promises to resolve to get the value back, for those use cases you need to use `seria.stringifyToStream` and `seria.parseFromStream`.

## stringifyToStream

`seria.stringifyToStream` as the name says, takes a value and returns a `ReadableStream` which stream each value and resolved `Promise` value.

```ts
import { stringifyToStream } from "seria";

const hero = {
  name: Promise.resolve("Yu Takeyama"),
  quirk: Promise.resolve("Gigantification"),
  age: Promise.resolve(24),
  heroName: delay(1000).then(() => Symbol.for("Mt. Lady")),
};

const stream = stringifyToStream(hero);
```

The returting stream will stream the values, first the values `name`, `quirk` and `age` and after 1000ms the value `heroName`, to retrieve the original value back you need to use `seria.parseFromStream`.

## parseFromStream

`seria.parseFromStream` as the name suggest takes a stream and deserializes it to a single value.

```ts
import { parseFromStream } from "seria";

const stream = getStream();
const value = await parseFromStream(stream);
```