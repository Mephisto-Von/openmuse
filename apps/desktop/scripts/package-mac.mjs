import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packager } from "@electron/packager";

// electron-builder cannot produce a macOS .app or .dmg on Linux. This script
// packages unsigned .app bundles with the official Electron binaries so Linux
// and Windows maintainers can still smoke-test the macOS build. Signing and
// notarization must run on macOS (the release workflow does that).
const here = path.dirname(fileURLToPath(import.meta.url));
const desktopDirectory = path.resolve(here, "..");
const root = path.resolve(desktopDirectory, "../..");
const outputDirectory = path.join(root, "artifacts/desktop/macos-unsigned");
const packageJson = JSON.parse(await readFile(path.join(desktopDirectory, "package.json"), "utf8"));

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const archives = [];
for (const arch of ["arm64", "x64"]) {
  const [appPath] = await packager({
    dir: desktopDirectory,
    name: "OpenMuse",
    platform: "darwin",
    arch,
    out: outputDirectory,
    overwrite: true,
    asar: true,
    prune: true,
    icon: path.join(desktopDirectory, "resources/icon.icns"),
    appBundleId: "app.openmuse.desktop",
    appVersion: packageJson.version,
    buildVersion: packageJson.version,
    appCopyright: "Copyright © 2026 CopilotKit",
    ignore: [/^\/scripts($|\/)/, /^\/\.DS_Store$/],
  });

  const archive = path.join(
    outputDirectory,
    `OpenMuse-${packageJson.version}-macos-${arch}-unsigned.zip`,
  );
  const zipped = spawnSync("zip", ["-qry", archive, path.basename(appPath)], {
    cwd: path.dirname(appPath),
    stdio: "inherit",
  });
  if (zipped.status !== 0) process.exit(zipped.status ?? 1);
  archives.push(archive);
}

const lines = [];
for (const archive of archives) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    createReadStream(archive)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", resolve)
      .on("error", reject);
  });
  lines.push(`${hash.digest("hex")}  ${path.basename(archive)}`);
}
await writeFile(path.join(outputDirectory, "SHA256SUMS.txt"), `${lines.join("\n")}\n`);
console.log(`Unsigned macOS builds written to ${path.relative(root, outputDirectory)}`);
