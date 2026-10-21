---
sidebar_position: 12
---

# sourcemaps command

The `sourcemaps` command extracts the original source files embedded in `.map` sourcemap files. This is useful when you already have sourcemap files and want to recover the original source code without running the full pipeline.

## Usage

```bash
js-recon sourcemaps -i <path> [options]
```

## Options

| Option                 | Alias | Description                                              | Default     | Required |
| ---------------------- | ----- | -------------------------------------------------------- | ----------- | -------- |
| `--input <path>`       | `-i`  | Single `.map` file or directory containing `.map` files. |             | Yes      |
| `--output <directory>` | `-o`  | Output directory for extracted source files.             | `extracted` | No       |

## Examples

### Extract from a single file

Extract source files from a single `.map` file:

```bash
js-recon sourcemaps -i bundle.js.map
```

This writes all recovered source files to the `extracted/` directory, preserving the original directory structure.

### Extract from a directory

Extract source files from all `.map` files found under a directory:

```bash
js-recon sourcemaps -i /path/to/sourcemaps -o /path/to/output
```

The command crawls the directory recursively, finds every `.map` file, and extracts the source files from each one.

### Custom output directory

```bash
js-recon sourcemaps -i /path/to/sourcemaps -o recovered-sources
```

## How it works

1. Checks that the input path exists; exits with code 23 if not.
2. Checks that the output directory does not already exist; exits with code 24 if it does.
3. If the input is a **file**, reads and parses it as a sourcemap.
4. If the input is a **directory**, crawls it recursively for all `.map` files and processes each one.
5. For each sourcemap, extracts every entry from `sourcesContent` and writes it to the output directory under its original path (as listed in `sources`).
6. Strips any leading `//` banner line that older pipeline runs may have prepended to `.js.map` files.
