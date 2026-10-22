import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopDirectory = path.resolve(here, "..");
const root = path.resolve(desktopDirectory, "../..");
const webDist = path.join(root, "apps/mobile/dist/web");
const rendererDirectory = path.join(desktopDirectory, "renderer");

// Node does not apply PATHEXT when spawning, so Windows needs the .cmd shim explicitly.
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

if (process.env.OPENMUSE_SKIP_WEB_BUILD !== "1") {
  const result = spawnSync(pnpm, ["--dir", "apps/mobile", "build:web"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ...(process.env.OPENMUSE_DEFAULT_API_URL
        ? { EXPO_PUBLIC_API_URL: process.env.OPENMUSE_DEFAULT_API_URL }
        : {}),
    },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

await rm(rendererDirectory, { recursive: true, force: true });
await mkdir(rendererDirectory, { recursive: true });
await cp(webDist, rendererDirectory, { recursive: true });

const packageJson = JSON.parse(await readFile(path.join(desktopDirectory, "package.json"), "utf8"));
await writeFile(
  path.join(rendererDirectory, "desktop-build.json"),
  `${JSON.stringify(
    {
      name: "OpenMuse Desktop",
      version: packageJson.version,
      builtAt: new Date().toISOString(),
      defaultApiUrl: process.env.OPENMUSE_DEFAULT_API_URL || null,
    },
    null,
    2,
  )}\n`,
);

console.log(`Desktop renderer prepared from ${path.relative(root, webDist)}`);
