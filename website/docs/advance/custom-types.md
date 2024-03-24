---
sidebar_position: 2
---

# Custom Types

Similar to the global `JSON` seria allow to pass a `replacer` and `reviver` function.

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

This is the format `seria` use to represents any non-serializable value like `Date` and the **tag** is used to look up the value.

```ts
const input = {
  url: new URL("http://127.0.0.1:3000/seria?hello=world"),
};

const json = stringify(input, (val) => {
  if (val instanceof URL) {
    return `$1${val.href}`;
  }

  return undefined;
});
```

For parsing because the serialized value is a `string` we check both, if is a string and
if contains the tag we used, then we just need to stripped the tag and create the `URL` from the data.

```ts
const value: any = parse(json, (val) => {
  if (typeof val === "string" && val.startsWith("$1")) {
    return new URL(val.slice(2));
  }

  return undefined;
});
```
