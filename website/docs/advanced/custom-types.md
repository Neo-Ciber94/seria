---
sidebar_position: 2
---

# Custom Types

Similar to the global `JSON` seria allow to pass a `replacer` and `reviver` function but the behaviour in our case is different.

When using a `stringify` function the `replacer` function is called for each value,
the replacer take the value to stringify and return a `string` which represents the serialized value or `undefined` to ignore the value.

For the `parse` operation the `reviver` function is called again for each value and
should convert the value converted before to its actual representation, similar to the `reviver` we return `undefined` to ignore the value.

## Example

### Serializing `URL`

For URL we check if the value is an `URL` and then return a value in the format:

```bash
$<tag><data>
```

:::tip[Tags]
[Checkout all the existing tags](https://github.com/Neo-Ciber94/seria/blob/main/packages/seria/src/tag.ts)
:::

This is the format `seria` use to represents any non-serializable value like `Date` and the **tag** is used to look up the value.

```ts
const input = {
  url: new URL("http://127.0.0.1:3000/seria?hello=world"),
};

const json = stringify(input, (val) => {
  if (val instanceof URL) {
    return `$1${val.href}`; // $1 is our custom tag for URL
  }

  return undefined;
});
```

For parsing because the serialized value is a `string` we check both, if is a string and
if contains the tag we used, then we just need to stripped the tag and create the `URL` from the data.

```ts
const value: any = parse(json, (val) => {
  if (typeof val === "string" && val.startsWith("$1")) {
    return new URL(val.slice(2)); // remove the tag $1
  }

  return undefined;
});
```

### Serializing `RegExp`

For RegExp we check if the value is an `RegExp` and then return a value in the format:

```bash
$<tag><data>
```

This is the format `seria` use to represents any non-serializable value like `RegExp` and the **tag** is used to look up the value.

```ts
const input = {
  url: new URL("http://127.0.0.1:3000/seria?hello=world"),
};

const json = stringify(input, (val) => {
  if (val instanceof RegExp) {
    return `$2${val.toString()}`; // `$2` is our custom tag for RegExp
  }

  return undefined;
});
```

And for parsing because the `string` value.

```ts
const value: any = parse(json, (val) => {
  if (typeof val === "string" && val.startsWith("$2")) {
    const parts = val.slice(2); // remove the tag $2
    const body = parts.slice(1, parts.lastIndexOf("/"));
    const flags = parts.slice(parts.lastIndexOf("/") + 1);
    return new RegExp(body, flags);
  }

  return undefined;
});
```
