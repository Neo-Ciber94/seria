---
sidebar_position: 2
---

# Installation

```bash npm2yarn
  npm install seria
```

Basic usage of `seria`.

## Usage

Now you can import what you need from `seria`

```ts
import { parse, stringify } from "seria";

const pirate = {
  name: "Monkey D. Luffy",
  age: 19,
  isPirateKing: false,
  birthDate: new Date("1999-05-05"),
  bounty: BigInt(30_000_000),
  favoriteFood: new Set(["Meat", "Seafood"]),
  devilFruit: Symbol.for("Gomu Gomu no Mi"),
  crewMembers: ["Zoro", "Nami", "Usopp", "Sanji"],
};

const json = stringify(pirate);
const result = parse(json);
```
