import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { photo } from "./helpers.js";

const exec = promisify(execFile);
const cli = resolve(import.meta.dirname, "../dist/cli.js");

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "afrigov-images-cli-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function runCli(args: string[]) {
  try {
    const { stdout, stderr } = await exec(process.execPath, [cli, ...args], {
      env: { ...process.env, NO_COLOR: "1" },
    });
    return { code: 0, stdout, stderr };
  } catch (e) {
    const x = e as { code?: number; stdout?: string; stderr?: string };
    return { code: x.code ?? 1, stdout: x.stdout ?? "", stderr: x.stderr ?? "" };
  }
}

describe("afrigov-images", () => {
  it("processes a folder and prints sizes and HTML", async () => {
    await photo(join(dir, "one.jpg"), 2000, 1200, { gps: true });
    await photo(join(dir, "two.jpg"), 1800, 1200);
    const r = await runCli([dir, "--out", join(dir, "out")]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("one.jpg");
    expect(r.stdout).toContain("2 copies as WebP");
    expect(r.stdout).toContain("Location data removed.");
    expect(r.stdout).toContain('srcset="one-480.webp 480w, one-800.webp 800w"');
    expect(r.stdout).toMatch(/2 images: .* before, .* for the largest copies\./);
  }, 60_000);

  it("prints JSON", async () => {
    await photo(join(dir, "one.jpg"), 800, 600);
    const r = await runCli([
      join(dir, "one.jpg"),
      "--out",
      join(dir, "out"),
      "--kind",
      "card",
      "--json",
    ]);
    const results = JSON.parse(r.stdout) as Array<{ kind: string; outputs: unknown[] }>;
    expect(results[0]!.kind).toBe("card");
    expect(results[0]!.outputs).toHaveLength(2);
  }, 60_000);

  it("explains usage mistakes with exit code 2", async () => {
    expect((await runCli([])).code).toBe(2);
    const noOut = await runCli([dir]);
    expect(noOut.code).toBe(2);
    expect(noOut.stderr).toContain("--out");
    const badKind = await runCli([dir, "--out", dir, "--kind", "banner"]);
    expect(badKind.stderr).toContain("is not a kind");
    const none = await runCli([dir, "--out", join(dir, "o")]);
    expect(none.stderr).toContain("no images found");
  });

  it("shows help and the version", async () => {
    const help = await runCli(["--help"]);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain(
      "hero      Hero or cover photograph, 480 and 960 and 1600px wide, at most 150 KB",
    );
    expect((await runCli(["--version"])).stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
