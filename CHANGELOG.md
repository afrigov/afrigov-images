# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-03

### Added

- `afrigov-images <files or folders> --out <folder>` makes each image at the sizes a page needs, as WebP, without the camera's location data, and prints the HTML with `srcset`, `sizes`, `width`, `height` and lazy loading.
- Seven kinds of image with afrigov's sizes and weight limits: hero, wide, card, portrait, thumb, flyer and logo. The quality is lowered, down to 50, to meet the limit, and the exit code is 1 when an image is still over.
- Photos are turned the way the camera recorded them. Copies are never larger than the original.
- `--json`, `--quality` and `--keep-metadata`.
- Library: `processImage`, `findImages`, `htmlFor`, `slug` and `KINDS`.

[Unreleased]: https://github.com/afrigov/afrigov-images/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/afrigov/afrigov-images/releases/tag/v0.1.0
