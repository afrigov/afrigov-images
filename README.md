# afrigov-images

**Make images light enough for a government website.** Point it at a folder of photos. It makes each one at the sizes phones, tablets and desktops need, saves them as WebP, removes the camera's location data, checks them against [afrigov](https://github.com/omoyolab/afrigov)'s weight limits, and prints the HTML to paste.

[![npm](https://img.shields.io/npm/v/afrigov-images?color=1f4e79)](https://www.npmjs.com/package/afrigov-images)
[![CI](https://github.com/omoyolab/afrigov-images/actions/workflows/ci.yml/badge.svg)](https://github.com/omoyolab/afrigov-images/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

```sh
npx afrigov-images ./event-photos --out ./site/images
```

A real example, the heaviest image on a ministry's home page:

```
cardiovascular-care.png  3.1 MB, 2384 × 1054
  3 copies as WebP: 15 KB, 37 KB, 66 KB  within the limit

  <img
    src="cardiovascular-care-960.webp"
    srcset="cardiovascular-care-480.webp 480w, cardiovascular-care-960.webp 960w, cardiovascular-care-1600.webp 1600w"
    sizes="100vw"
    width="1600"
    height="707"
    alt=""
    decoding="async"
  />
1 image: 3.1 MB before, 66 KB for the largest copies.
```

A phone now downloads 15 KB where it used to download 3.1 MB.

## Why

Images are most of a government page's weight, and the reader pays for every megabyte, usually from a prepaid phone bundle. A photograph straight from a camera is 3 to 8 MB. Shown on a phone, it needs about 50 KB.

There are good image tools already. They are built for developers who know which sizes, formats and quality they want. This one makes those decisions for you, using afrigov's limits for each kind of image, so a ministry's web team with a folder of photos gets the right result without learning any of it.

## Kinds of image

Choose with `--kind`. Each kind has the sizes a page needs and a weight limit for the largest copy.

| Kind       | For                                                  | Sizes made          | At most |
| ---------- | ---------------------------------------------------- | ------------------- | ------: |
| `hero`     | Hero or cover photograph                             | 480, 960, 1600 wide |  150 KB |
| `wide`     | Image beside text, or in a news article, the default | 480, 800 wide       |   80 KB |
| `card`     | Card picture or video poster                         | 320, 640 wide       |   40 KB |
| `portrait` | Portrait                                             | 240, 480 wide       |   40 KB |
| `thumb`    | List thumbnail                                       | 120, 240 wide       |   15 KB |
| `flyer`    | Event flyer                                          | 400, 800 wide       |  120 KB |
| `logo`     | Logo or mark                                         | 56, 112 tall        |   20 KB |

The limits are the ones on afrigov's [Images page](https://omoyolab.github.io/afrigov/styles/images.html).

## What it does to each image

1. **Turns it the right way up**, using the orientation the camera recorded.
2. **Makes each size**, never larger than the original.
3. **Saves it as WebP**, starting at quality 75. If the largest copy is over the limit, it lowers the quality in steps, down to 50 at most. If it is still over, it says so and exits with code 1.
4. **Removes the camera data**, including where the photo was taken. A government site should not publish a staff member's home by accident. `--keep-metadata` keeps it.
5. **Prints the HTML**, with `srcset` and `sizes` so each screen downloads the size it needs, `width` and `height` so the page does not jump, and `loading="lazy"` for everything but a hero.

You write the `alt` text: what the picture shows, or leave it empty if it is decoration. A tool cannot know that.

## Options

| Option            | Meaning                                                  |
| ----------------- | -------------------------------------------------------- |
| `--out <folder>`  | Where to write the copies. Created if missing. Required. |
| `--kind <kind>`   | Which kind of image. Default `wide`.                     |
| `--quality <n>`   | WebP quality to start from, 1 to 100. Default 75.        |
| `--keep-metadata` | Keep camera and location data. Removed by default.       |
| `--json`          | Print the results as JSON.                               |

It reads JPEG, PNG, WebP, AVIF, TIFF and GIF. Give it files, or folders, which it reads one level deep. Photos from an iPhone in HEIC format need converting first. Exit codes: `0` every image is within its limit, `1` an image is still over its limit, `2` a usage error.

## In a publishing step

Run it before the site is published, so nobody has to remember:

```sh
npx afrigov-images ./content/photos --out ./public/images --kind wide
```

## Library

```js
import { processImage } from "afrigov-images";

const result = await processImage("clinic.jpg", { out: "public/images", kind: "hero" });
console.log(result.outputs, result.withinLimit, result.html);
```

`findImages`, `htmlFor`, `slug` and `KINDS` are exported too. Everything is typed.

## Check a live page

[afrigov-audit](https://github.com/omoyolab/afrigov-audit) reports a page's weight on a phone and names every image heavier than it needs to be. This tool is the fix.

## Licence

[MIT](LICENSE). The image processing is done by [sharp](https://sharp.pixelplumbing.com/) and libvips.
