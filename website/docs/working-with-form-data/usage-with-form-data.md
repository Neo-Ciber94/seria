---
sidebar_position: 2
---

# Usage with FormData

For working with for data you can use the `seria/form-data` module which exposes 2 functions `encodeToFormData` and `decodeFormData`.

```ts
import { encodeToFormData, decodeFormData } from "seria/form-data";

const files = new FormData();
files.set("profileImage", "<image>");

const input = {
  username: "Nobara Kugisaki",
  email: "nobara.kugisaki@example.com",
  files,
};

const formData = await encodeToFormData(input);
const value = decodeFormData(formData);
```
