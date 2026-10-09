import { runPackageManager } from "./lib/resolve-bin.mjs";

const result = runPackageManager("npm", process.argv.slice(2));
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
