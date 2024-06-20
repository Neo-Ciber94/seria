import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function main() {
  const __dirname = fileURLToPath(import.meta.url);

  const rootDir = path.join(__dirname, "..", "..", "..");
  const licenseFile = path.join(rootDir, "LICENSE");
  const readmeFile = path.join(rootDir, "README.md");

  await fs.cp(licenseFile, "LICENSE");
  await fs.cp(readmeFile, "README.md");
}

main().catch(console.error);
