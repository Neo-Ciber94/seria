import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src"],
  sourcemap: process.env.NODE_ENV === "development",
  minify: true,
  clean: true,
  dts: true,
});
