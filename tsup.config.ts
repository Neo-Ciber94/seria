import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src"],
  minify: true,
  sourcemap: true,
  clean: true,
  dts: true,
});
