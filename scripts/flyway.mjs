import { spawnSync } from "node:child_process";

const command = process.argv[2];
const supportedCommands = new Set(["migrate", "info"]);

if (!supportedCommands.has(command)) {
  console.error("Usage: node scripts/flyway.mjs <migrate|info>");
  process.exit(2);
}

const result = spawnSync("flyway", [command], {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.error(
      "Flyway CLI was not found. Install Flyway and make the `flyway` command available on PATH.",
    );
  } else {
    console.error(`Could not start Flyway: ${result.error.message}`);
  }

  process.exit(1);
}

process.exit(result.status ?? 1);
