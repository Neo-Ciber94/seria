---
sidebar_position: 2
---

# Usage with FormData

For working with `FormData` and `File` you can use the `seria/form-data` module which exposes the functions `encode`, `encodeAsync` and `decode`.

```ts
import { encode, decode } from "seria/form-data";

const attachments = new FormData();
attachments.set("docs", "<text>");

const photo = readFile("/images/photo.jpg");

const input = {
  username: "Nobara Kugisaki",
  email: "nobara.kugisaki@example.com",
  photo,
  attachments,
};

const formData = encode(input);
const value = decode(formData);
```

The `encodeAsync` function awaits all the promises and generators before returning the value.