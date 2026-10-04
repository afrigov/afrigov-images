import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { KINDS } from "../src/kinds.js";
import { findImages, processImage, slug } from "../src/process.js";
import { photo } from "./helpers.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "afrigov-images-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("processImage", () => {
  it("makes each size of a hero as WebP, within the limit", async () => {
    const input = join(dir, "Clinic Day.jpg");
    await photo(input, 3000, 2000);
    const r = await processImage(input, { out: join(dir, "out"), kind: "hero" });
    expect(r.outputs.map((o) => o.width)).toEqual([480, 960, 1600]);
    expect(r.outputs.map((o) => o.height)).toEqual([320, 640, 1067]);
    expect(r.withinLimit).toBe(true);
    expect(r.outputs[2]!.bytes).toBeLessThanOrEqual(KINDS.hero.limit);
    expect(r.outputs[2]!.bytes).toBeLessThan(r.inputBytes / 5);
    const meta = await sharp(r.outputs[0]!.path).metadata();
    expect(meta.format).toBe("webp");
    expect((await readdir(join(dir, "out"))).sort()).toEqual([
      "clinic-day-1600.webp",
      "clinic-day-480.webp",
      "clinic-day-960.webp",
    ]);
  }, 60_000);

  it("removes location data unless asked to keep it", async () => {
    const input = join(dir, "phone.jpg");
    await photo(input, 1200, 900, { gps: true });
    expect((await sharp(input).metadata()).exif).toBeTruthy();
    const r = await processImage(input, { out: join(dir, "a") });
    expect(r.removedLocation).toBe(true);
    for (const o of r.outputs) expect((await sharp(o.path).metadata()).exif).toBeUndefined();
    const kept = await processImage(input, { out: join(dir, "b"), keepMetadata: true });
    expect(kept.removedLocation).toBe(false);
    expect((await sharp(kept.outputs[0]!.path).metadata()).exif).toBeTruthy();
  }, 60_000);

  it("never makes a copy larger than the original", async () => {
    const input = join(dir, "small.png");
    await photo(input, 600, 400, { format: "png" });
    const r = await processImage(input, { out: join(dir, "out"), kind: "hero" });
    expect(r.outputs.map((o) => o.width)).toEqual([480]);
    const tiny = join(dir, "tiny.png");
    await photo(tiny, 300, 200, { format: "png" });
    const t = await processImage(tiny, { out: join(dir, "out"), kind: "hero" });
    expect(t.outputs.map((o) => o.width)).toEqual([300]);
  }, 60_000);

  it("lowers the quality to meet a tight limit, and says when it still cannot", async () => {
    const input = join(dir, "busy.jpg");
    await photo(input, 2400, 1600);
    const r = await processImage(input, { out: join(dir, "out"), kind: "card", quality: 95 });
    expect(r.quality).toBeLessThan(95);
    expect(r.quality).toBeGreaterThanOrEqual(50);
    expect(r.withinLimit).toBe(r.outputs[1]!.bytes <= KINDS.card.limit);
  }, 60_000);

  it("sizes a logo by height and writes 1x and 2x", async () => {
    const input = join(dir, "logo.png");
    await photo(input, 600, 300, { format: "png" });
    const r = await processImage(input, { out: join(dir, "out"), kind: "logo" });
    expect(r.outputs.map((o) => o.height)).toEqual([56, 112]);
    expect(r.html).toContain('srcset="logo-56.webp 1x, logo-112.webp 2x"');
    expect(r.html).toContain('height="56"');
    expect(r.html).not.toContain("sizes=");
  }, 60_000);

  it("writes the HTML with srcset, sizes, width, height and lazy loading", async () => {
    const input = join(dir, "news.jpg");
    await photo(input, 1600, 900);
    const r = await processImage(input, { out: join(dir, "out"), kind: "wide" });
    expect(r.html).toContain('srcset="news-480.webp 480w, news-800.webp 800w"');
    expect(r.html).toContain('sizes="(min-width: 64em) 50vw, 100vw"');
    expect(r.html).toContain('width="800"');
    expect(r.html).toContain('height="450"');
    expect(r.html).toContain('alt=""');
    expect(r.html).toContain('loading="lazy"');
    const hero = await processImage(input, { out: join(dir, "out"), kind: "hero" });
    expect(hero.html).not.toContain("loading=");
  }, 60_000);

  it("turns a photo the way the camera recorded it", async () => {
    const input = join(dir, "turned.jpg");
    await photo(input, 1200, 800);
    const rotated = join(dir, "turned-6.jpg");
    await sharp(input).withMetadata({ orientation: 6 }).toFile(rotated);
    const r = await processImage(rotated, { out: join(dir, "out"), kind: "wide" });
    expect(r.inputWidth).toBe(800);
    expect(r.inputHeight).toBe(1200);
    expect(r.outputs[r.outputs.length - 1]!.height).toBeGreaterThan(
      r.outputs[r.outputs.length - 1]!.width,
    );
  }, 60_000);

  it("refuses a file that is not an image", async () => {
    const input = join(dir, "fake.jpg");
    await (await import("node:fs/promises")).writeFile(input, "not an image");
    await expect(processImage(input, { out: join(dir, "out") })).rejects.toThrow(
      /not an image this tool can read/,
    );
  });
});

describe("helpers", () => {
  it("makes safe file names", () => {
    expect(slug("/x/Clinic Day 3.JPG")).toBe("clinic-day-3");
    expect(slug("Ọjọ́ Àjọ̀dún.png")).toBe("ojo-ajodun");
    expect(slug("___.png")).toBe("image");
  });

  it("finds images in files and folders, and skips everything else", async () => {
    await photo(join(dir, "b.jpg"), 50, 50);
    await photo(join(dir, "a.png"), 50, 50, { format: "png" });
    await (await import("node:fs/promises")).writeFile(join(dir, "notes.txt"), "x");
    const found = await findImages([dir]);
    expect(found.map((f) => f.split("/").pop())).toEqual(["a.png", "b.jpg"]);
    await expect(findImages([join(dir, "missing")])).rejects.toThrow(/Cannot find/);
  });
});
