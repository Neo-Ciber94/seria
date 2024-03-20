import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src", "!src/**/*.test.*"],
  sourcemap: true,
  clean: true,
  dts: true,
  format: ["esm", "cjs"],
});
