#!/usr/bin/env node
import { parseArgs } from "node:util";

import { isKind, KIND_NAMES, KINDS } from "./kinds.js";
import { findImages, ImagesError, processImage, type ImageResult } from "./process.js";
import { version } from "./version.js";

const HELP = `afrigov-images ${version}: make images light enough for a government website

Usage
  afrigov-images <file or folder ...> --out <folder> [--kind <kind>]

Kinds
${KIND_NAMES.map((k) => `  ${k.padEnd(10)}${KINDS[k].label}, ${KINDS[k].sizes.join(" and ")}px ${KINDS[k].by === "height" ? "tall" : "wide"}, at most ${KINDS[k].limit / 1024} KB`).join("\n")}

Options
  --out <folder>     Where to write the copies. Created if missing. Required.
  --kind <kind>      Which kind of image. Default wide.
  --quality <n>      WebP quality to start from, 1 to 100. Default 75. Lowered to 50 at most to meet the limit.
  --keep-metadata    Keep camera and location data. By default it is removed.
  --json             Print the results as JSON.
  -h, --help         Show this help.
  -v, --version      Show the version.

Examples
  npx afrigov-images ./event-photos --out ./site/images
  npx afrigov-images banner.jpg --kind hero --out ./site/images

Exit codes
  0  every image is within its limit    1  an image is still over its limit    2  usage error
`;

const kb = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

function describe(r: ImageResult, color: boolean): string {
  const paint = (code: number, s: string) => (color ? `\u001b[${code}m${s}\u001b[0m` : s);
  const name = r.input.split(/[\\/]/).pop();
  const sizes = r.outputs.map((o) => kb(o.bytes)).join(", ");
  const status = r.withinLimit
    ? paint(32, "within the limit")
    : paint(
        33,
        `still over the ${kb(r.limit)} limit for a ${r.kind}; crop it, or choose a larger kind`,
      );
  const lines = [
    `${paint(1, name ?? r.input)}  ${kb(r.inputBytes)}, ${r.inputWidth} × ${r.inputHeight}`,
    `  ${r.outputs.length} cop${r.outputs.length === 1 ? "y" : "ies"} as WebP: ${sizes}  ${status}`,
  ];
  if (r.removedLocation) lines.push(`  Location data removed.`);
  lines.push(
    "",
    r.html
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n"),
    "",
  );
  return lines.join("\n");
}

export async function run(
  argv: string[],
  out = process.stdout,
  err = process.stderr,
): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: "string" },
        kind: { type: "string" },
        quality: { type: "string" },
        "keep-metadata": { type: "boolean" },
        json: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (e) {
    err.write(
      `afrigov-images: ${e instanceof Error ? e.message : String(e)}\nRun afrigov-images --help.\n`,
    );
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.version) {
    out.write(`${version}\n`);
    return 0;
  }
  if (values.help || positionals.length === 0) {
    out.write(HELP);
    return values.help ? 0 : 2;
  }
  if (!values.out) {
    err.write("afrigov-images: say where the copies go, with --out <folder>.\n");
    return 2;
  }
  const kind = values.kind ?? "wide";
  if (!isKind(kind)) {
    err.write(`afrigov-images: "${kind}" is not a kind. Use one of: ${KIND_NAMES.join(", ")}.\n`);
    return 2;
  }
  const quality = values.quality === undefined ? 75 : Number(values.quality);
  if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
    err.write("afrigov-images: --quality is a number from 1 to 100.\n");
    return 2;
  }

  try {
    const files = await findImages(positionals);
    if (files.length === 0) {
      err.write("afrigov-images: no images found. It reads JPEG, PNG, WebP, AVIF, TIFF and GIF.\n");
      return 2;
    }
    const results: ImageResult[] = [];
    const color = !values.json && Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
    for (const file of files) {
      const r = await processImage(file, {
        out: values.out,
        kind,
        quality,
        keepMetadata: values["keep-metadata"] ?? false,
      });
      results.push(r);
      if (!values.json) out.write(describe(r, color));
    }
    const before = results.reduce((s, r) => s + r.inputBytes, 0);
    const after = results.reduce((s, r) => s + r.outputs[r.outputs.length - 1]!.bytes, 0);
    const over = results.filter((r) => !r.withinLimit).length;
    if (values.json) {
      out.write(`${JSON.stringify(results, null, 2)}\n`);
    } else {
      out.write(
        `${results.length} image${results.length === 1 ? "" : "s"}: ${kb(before)} before, ${kb(after)} for the largest copies.${over ? ` ${over} still over the limit.` : ""}\n`,
      );
      out.write(
        "Write the alt text for each image: what it shows, or leave it empty if it is decoration.\n",
      );
    }
    return over ? 1 : 0;
  } catch (e) {
    if (e instanceof ImagesError) {
      err.write(`afrigov-images: ${e.message}\n  ${e.hint}\n`);
      return 2;
    }
    throw e;
  }
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("cli.js");
if (isMain) {
  run(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (e: unknown) => {
      process.stderr.write(`afrigov-images: ${e instanceof Error ? e.message : String(e)}\n`);
      process.exitCode = 2;
    },
  );
}
