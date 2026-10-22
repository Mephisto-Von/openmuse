import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { createBrowserManager } from "../src/browser.ts";
import { capturePdfDownload, MAX_DOWNLOAD_BYTES, readDownloadFailures } from "../src/downloads.ts";

type DownloadHandle = Parameters<typeof capturePdfDownload>[0]["download"];

const SESSION = "11111111-1111-4111-8111-111111111111";
const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");

function failure(id: string, createdAt: string) {
  return {
    id,
    name: `${id}.txt`,
    code: "UNSUPPORTED_DOWNLOAD",
    message: "Only PDF downloads can be imported.",
    createdAt,
    status: "failed",
  };
}

function fakeDownload(bytes: Buffer, name = "notes.pdf"): DownloadHandle {
  return {
    suggestedFilename: () => name,
    createReadStream: async () => Readable.from([bytes]),
    cancel: async () => {},
    delete: async () => {},
  };
}

async function workspace() {
  const directory = await mkdtemp(join(tmpdir(), "openmuse-downloads-"));
  const tempDirectory = await mkdtemp(join(tmpdir(), "openmuse-downloads-incoming-"));
  return { directory, tempDirectory };
}

test("listing a store being written never fails the request", async () => {
  const { directory } = await workspace();
  const outcomes = join(directory, "download-outcomes");
  await mkdir(outcomes, { recursive: true });
  await writeFile(
    join(outcomes, "kept.json"),
    JSON.stringify(failure("kept", "2026-01-01T00:00:00Z")),
  );
  // A capture writes its journal through a temporary file and can clear it between the
  // directory scan and the read; a truncated entry and an unreadable one stand in for that
  // window without depending on timing.
  await writeFile(join(outcomes, "truncated.json"), '{"id":"truncated","crea');
  await mkdir(join(outcomes, "unreadable.json"));

  const failures = await readDownloadFailures(directory);
  assert.deepEqual(
    failures.map((item) => item.id),
    ["kept"],
  );
});

test("listing orders failures newest first", async () => {
  const { directory } = await workspace();
  const outcomes = join(directory, "download-outcomes");
  await mkdir(outcomes, { recursive: true });
  await writeFile(
    join(outcomes, "older.json"),
    JSON.stringify(failure("older", "2026-01-01T00:00:00Z")),
  );
  await writeFile(
    join(outcomes, "newer.json"),
    JSON.stringify(failure("newer", "2026-02-01T00:00:00Z")),
  );

  const failures = await readDownloadFailures(directory);
  assert.deepEqual(
    failures.map((item) => item.id),
    ["newer", "older"],
  );
});

test("restart recovery keeps a published download and fails a stranded one", async () => {
  const { directory } = await workspace();
  const outcomes = join(directory, "download-outcomes");
  await mkdir(outcomes, { recursive: true });
  await mkdir(join(directory, "downloads"), { recursive: true });
  await writeFile(
    join(outcomes, "published.json"),
    JSON.stringify({ ...failure("published", "2026-01-01T00:00:00Z"), status: "pending" }),
  );
  await writeFile(
    join(directory, "downloads", "published.json"),
    JSON.stringify({ id: "published", name: "paper.pdf", size: 12, mimeType: "application/pdf" }),
  );
  await writeFile(
    join(outcomes, "stranded.json"),
    JSON.stringify({ ...failure("stranded", "2026-01-02T00:00:00Z"), status: "pending" }),
  );

  const failures = await readDownloadFailures(directory, true);
  assert.deepEqual(
    failures.map((item) => item.id),
    ["stranded"],
  );
  assert.equal(failures[0]?.code, "UNSUPPORTED_DOWNLOAD");
  assert.equal(await stat(join(outcomes, "published.json")).catch(() => null), null);
  const stranded = JSON.parse(await readFile(join(outcomes, "stranded.json"), "utf8"));
  assert.equal(stranded.status, "failed");
});

test("a captured PDF is published to the listing and clears its journal", async () => {
  const { directory, tempDirectory } = await workspace();
  await capturePdfDownload({
    directory,
    tempDirectory,
    limitReached: false,
    download: fakeDownload(PDF),
  });

  const stored = await readdir(join(directory, "downloads"));
  assert.equal(stored.length, 2, "the PDF and its metadata are kept");
  const metadata = JSON.parse(
    await readFile(
      join(directory, "downloads", stored.find((name) => name.endsWith(".json")) ?? ""),
      "utf8",
    ),
  );
  assert.equal(metadata.name, "notes.pdf");
  assert.equal(metadata.size, PDF.length);
  assert.equal(metadata.mimeType, "application/pdf");
  assert.deepEqual(await readDownloadFailures(directory), []);
  assert.deepEqual(await readdir(join(directory, "download-outcomes")), []);
});

test("a captured non-PDF is recorded as a failure and leaves no file", async () => {
  const { directory, tempDirectory } = await workspace();
  await capturePdfDownload({
    directory,
    tempDirectory,
    limitReached: false,
    download: fakeDownload(Buffer.from("not a pdf"), "notes.txt"),
  });

  const failures = await readDownloadFailures(directory);
  assert.deepEqual(
    failures.map((item) => [item.id.length > 0, item.name, item.code]),
    [[true, "notes.txt", "UNSUPPORTED_DOWNLOAD"]],
  );
  assert.deepEqual(await readdir(join(directory, "downloads")), []);
});

test("a download over the size limit is refused", async () => {
  const { directory, tempDirectory } = await workspace();
  await capturePdfDownload({
    directory,
    tempDirectory,
    limitReached: false,
    download: fakeDownload(Buffer.concat([PDF, Buffer.alloc(MAX_DOWNLOAD_BYTES)])),
  });

  const failures = await readDownloadFailures(directory);
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.code, "DOWNLOAD_TOO_LARGE");
});

test("a session listing skips unreadable entries instead of failing", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "openmuse-worker-downloads-"));
  const session = join(dataDir, SESSION);
  await mkdir(join(session, "downloads"), { recursive: true });
  await writeFile(
    join(session, "session.json"),
    JSON.stringify({
      id: SESSION,
      title: "Example Domain",
      url: "https://example.com/",
      status: "closed",
      updatedAt: "2026-01-01T00:00:00Z",
    }),
  );
  await writeFile(
    join(session, "downloads", "kept.json"),
    JSON.stringify({ id: "kept", name: "paper.pdf", size: 4, mimeType: "application/pdf" }),
  );
  await writeFile(join(session, "downloads", "partial.json"), '{"id":"partial","na');
  await mkdir(join(session, "downloads", "unreadable.json"));
  await mkdir(join(session, "download-outcomes"), { recursive: true });
  await writeFile(join(session, "download-outcomes", "partial.json"), '{"id":"part');

  const manager = await createBrowserManager({ dataDir });
  try {
    const listing = await manager.downloads(SESSION);
    assert.deepEqual(
      listing.downloads.map((item) => item.id),
      ["kept"],
    );
    assert.deepEqual(listing.failures, []);
  } finally {
    await manager.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
