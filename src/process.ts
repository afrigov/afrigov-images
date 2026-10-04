import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";

import sharp from "sharp";

import { KINDS, type KindName } from "./kinds.js";

export interface ProcessOptions {
  /** Folder for the output files. Created if missing. */
  out: string;
  /** Which kind of image, which decides the sizes and the weight limit. Default "wide". */
  kind?: KindName;
  /** WebP quality to start from, 1 to 100. Default 75. Lowered, down to 50, to meet the limit. */
  quality?: number;
  /** Keep camera and location data. Default false. */
  keepMetadata?: boolean;
}

export interface OutputFile {
  path: string;
  width: number;
  height: number;
  bytes: number;
}

export interface ImageResult {
  input: string;
  inputBytes: number;
  inputWidth: number;
  inputHeight: number;
  kind: KindName;
  outputs: OutputFile[];
  /** The quality the files were saved at, after any lowering to meet the limit. */
  quality: number;
  /** The weight limit for this kind, in bytes. */
  limit: number;
  /** True when the largest copy is within the limit. */
  withinLimit: boolean;
  /** The img element to paste, with srcset, sizes, width and height. */
  html: string;
  /** Whether the input carried location data that was removed. */
  removedLocation: boolean;
}

export class ImagesError extends Error {
  constructor(
    message: string,
    public readonly hint: string,
  ) {
    super(message);
    this.name = "ImagesError";
  }
}

export const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".tif",
  ".tiff",
  ".gif",
];
const MIN_QUALITY = 50;

/** Finds the images in the given files and folders, one level of folders deep. */
export async function findImages(inputs: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const input of inputs) {
    const path = resolve(input);
    let info;
    try {
      info = await stat(path);
    } catch {
      throw new ImagesError(
        `Cannot find ${input}`,
        "Check the path, or quote it if it has spaces.",
      );
    }
    if (info.isDirectory()) {
      for (const name of (await readdir(path)).sort()) {
        if (IMAGE_EXTENSIONS.includes(extname(name).toLowerCase())) found.push(join(path, name));
      }
    } else if (IMAGE_EXTENSIONS.includes(extname(path).toLowerCase())) {
      found.push(path);
    }
  }
  return found;
}

/** A safe file name: lower case, hyphens, no spaces. "Clinic Day 3.JPG" becomes "clinic-day-3". */
export function slug(file: string): string {
  return (
    basename(file, extname(file))
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}

/** Resizes one image for each screen, saves it as WebP, and checks it against the weight limit. */
export async function processImage(file: string, options: ProcessOptions): Promise<ImageResult> {
  const kind = KINDS[options.kind ?? "wide"];
  const startQuality = Math.min(100, Math.max(1, Math.round(options.quality ?? 75)));
  const outDir = resolve(options.out);
  await mkdir(outDir, { recursive: true });

  const source = sharp(file, { failOn: "error" });
  let meta;
  try {
    meta = await source.metadata();
  } catch {
    throw new ImagesError(
      `${basename(file)} is not an image this tool can read`,
      "Use JPEG, PNG, WebP, AVIF, TIFF or GIF. Photos from an iPhone (HEIC) need converting first.",
    );
  }
  // EXIF orientation 5 to 8 means the stored pixels are turned a quarter: swap width and height.
  const turned = (meta.orientation ?? 1) >= 5;
  const width = (turned ? meta.height : meta.width) ?? 0;
  const height = (turned ? meta.width : meta.height) ?? 0;
  if (!width || !height)
    throw new ImagesError(`${basename(file)} has no size`, "The file may be damaged.");
  const removedLocation = !options.keepMetadata && Boolean(meta.exif) && hasGps(meta.exif!);

  const original = kind.by === "width" ? width : height;
  // Never make a copy larger than the original. If the original is smaller than every size, use it once.
  let targets = kind.sizes.filter((s) => s <= original);
  if (targets.length === 0) targets = [original];

  const name = slug(file);
  const render = async (size: number, quality: number) => {
    let pipeline = sharp(file).rotate();
    pipeline =
      kind.by === "width"
        ? pipeline.resize({ width: size, withoutEnlargement: true })
        : pipeline.resize({ height: size, withoutEnlargement: true });
    if (options.keepMetadata) pipeline = pipeline.keepMetadata();
    const { data, info } = await pipeline
      .webp({ quality, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    return { data, info };
  };

  // Lower the quality in steps until the largest copy is within the limit, or the floor is reached.
  let quality = startQuality;
  const largest = targets[targets.length - 1]!;
  let big = await render(largest, quality);
  while (big.data.length > kind.limit && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 10);
    big = await render(largest, quality);
  }

  const outputs: OutputFile[] = [];
  for (const size of targets) {
    const { data, info } = size === largest ? big : await render(size, quality);
    const path = join(outDir, `${name}-${size}.webp`);
    await writeFile(path, data);
    outputs.push({ path, width: info.width, height: info.height, bytes: data.length });
  }

  const top = outputs[outputs.length - 1]!;
  return {
    input: file,
    inputBytes: (await stat(file)).size,
    inputWidth: width,
    inputHeight: height,
    kind: kind.name,
    outputs,
    quality,
    limit: kind.limit,
    withinLimit: top.bytes <= kind.limit,
    html: htmlFor(kind.name, outputs, outDir),
    removedLocation,
  };
}

/** Whether an EXIF block holds a GPS section. Enough to tell people their location was removed. */
function hasGps(exif: Buffer): boolean {
  return exif.includes(Buffer.from([0x25, 0x88])) || exif.includes(Buffer.from([0x88, 0x25]));
}

/** The img element for a set of copies, with paths relative to the output folder. */
export function htmlFor(kindName: KindName, outputs: OutputFile[], outDir: string): string {
  const kind = KINDS[kindName];
  const rel = (p: string) => relative(outDir, p).split("\\").join("/");
  const top = outputs[outputs.length - 1]!;
  const fallback = outputs.length > 1 ? outputs[Math.floor((outputs.length - 1) / 2)]! : top;
  const lines = ["<img", `  src="${rel(fallback.path)}"`];
  if (outputs.length > 1) {
    const set =
      kind.by === "height"
        ? outputs.map((o, i) => `${rel(o.path)} ${i + 1}x`).join(", ")
        : outputs.map((o) => `${rel(o.path)} ${o.width}w`).join(", ");
    lines.push(`  srcset="${set}"`);
    if (kind.by === "width") lines.push(`  sizes="${kind.shown}"`);
  }
  const shownHeight = kind.by === "height" ? outputs[0]!.height : top.height;
  const shownWidth = kind.by === "height" ? outputs[0]!.width : top.width;
  lines.push(`  width="${shownWidth}"`, `  height="${shownHeight}"`, `  alt=""`);
  if (!kind.eager) lines.push(`  loading="lazy"`);
  lines.push(`  decoding="async"`, "/>");
  return lines.join("\n");
}
