---
sidebar_position: 0
---

# Introduction

`seria` is a spanish word pronunced as `/se-REE-ah/`.

This is a serialization library that supports types not supported by the global `JSON` object, it allow serialize `Date`, `BigInt`, `Promise` and other types.

This library is inspired in the new serialization capabilities [React](https://react.dev/) introduces with [use server](https://react.dev/reference/react/use-server#serializable-parameters-and-return-values) and server actions, most of the types listed on the react docs are serializable with `seria`.

## Why another serialization library?

Libraries like [superjson](https://github.com/blitz-js/superjson) and [devalue](https://github.com/Rich-Harris/devalue) are already great a serialization and also support custom types but were missing somethings `Promise` and `FormData` which are types that can be used with the new React server capabilities.