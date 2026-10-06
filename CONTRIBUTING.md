# Contributing to afrigov-images

## Setup

```sh
git clone https://github.com/afrigov/afrigov-images
cd afrigov-images
pnpm install
pnpm check
```

Node 20 or newer and pnpm 10.

## What we are looking for

**A photo that comes out wrong.** Too heavy, too blurry, turned the wrong way, or with data left in it. Open an issue with the photo if you can share it, or its size, format and where it came from if you cannot.

**Sizes and limits.** The kinds in `src/kinds.ts` follow afrigov's [Images page](https://afrigov.dev/styles/images.html). A change to a limit belongs there first.

**Not yet:** AVIF output, image services, watching a folder. Open an issue first.

## Pull request checklist

- `pnpm check` passes.
- New behaviour has a test. Tests make their own images, so nothing private goes in the repository.
- `CHANGELOG.md` has a line under **Unreleased**.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org).

## Releasing (maintainers)

1. Move **Unreleased** in `CHANGELOG.md` under a new version heading with today's date, and set the version in `package.json`.
2. Push to `main`, then run the release: Actions, Release, Run workflow. Or `gh workflow run release.yml`.
3. The workflow runs `pnpm check`, tags, publishes to npm with provenance, and creates the GitHub release.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind.
