---
sidebar_position: 7
---

# Endpoints command

The `endpoints` command is used to extract client-side endpoints from a directory of JavaScript files and `mapped.json` file. It identifies potential client-side paths and organizes them for further analysis.

## Usage

```bash
js-recon endpoints -u <url> -d <directory> -t <technology> [options]
```

## Options

| Option                     | Alias | Description                                                                        | Default     | Required |
| -------------------------- | ----- | ---------------------------------------------------------------------------------- | ----------- | -------- |
| `--url <url>`              | `-u`  | Target Base URL (will be used to resolve relative paths).                          |             | Yes      |
| `--directory <directory>`  | `-d`  | Directory containing JS files.                                                     |             | No       |
| `--output <filename>`      | `-o`  | Output filename (without file extension).                                          | `endpoints` | No       |
| `--output-format <format>` |       | Output format for the results (available: `json`).                                 | `json`      | No       |
| `--tech <tech>`            | `-t`  | Technology used in the JS files (run with `-l`/`--list` to see available options). |             | Yes      |
| `--list`                   | `-l`  | List available technologies.                                                       | `false`     | No       |
| `--mapped-json <file>`     |       | Mapped JSON file (for Next.js).                                                    |             | No       |

## Examples

### Basic usage

Extract endpoints from a directory of JS files, specifying the technology and target URL:

```bash
js-recon endpoints -d /path/to/js-files -t <technology> -u https://example.com
```

### Specify output file

Extract endpoints and save them to a custom file named `api_paths.md`:

```bash
js-recon endpoints -d /path/to/js-files -t <technology> -u https://example.com -o api_paths
```

### Next.js usage

When analyzing a Next.js app, you must specify the technology as `next` and provide the directory containing subsequent requests. These requests are typically captured during the `lazyload` process. Refer to the [example scenario](../example-scenarios/next-js.md#subsequent-requests) to know a detailed guide on this.

```bash
js-recon endpoints -d /path/to/js-files -t next -u https://example.com --mapped-json /path/to/mapped.json
```

This command will analyze the mapped JSON file along with the subsequent requests directory to extract a comprehensive list of client-side paths specific to the Next.js framework.

## How it works (Next.js)

The Next.js endpoint extractor runs up to four extraction techniques and merges their results:

1. **Subsequent-requests directory** (`___subsequent_requests/`): Parses the RSC payloads and HTML pages saved by `lazyload --subsequent-requests`. Each file path under this directory maps to a client-side route. If this directory doesn't exist, the command prints a warning and skips this technique, still running the other three.

2. **`href` AST search** in JS chunks: Traverses every `.js` file in the provided directory looking for `ObjectProperty` nodes whose key is `href`. Handles string literals and `.concat()`-style minified string construction.

3. **JSON parse search** in JS chunks: Scans JS files for `JSON.parse(...)` patterns that embed client-side route arrays.

4. **`window.__NEXT_P` push calls** in `mapped.json`: Looks for the Next.js page-registry pattern `(window.__NEXT_P = window.__NEXT_P || []).push([path, ...])` in the mapped chunks to extract registered page paths.

Techniques 2–4 do not require `--subsequent-requests` and run whenever `--directory` is provided. Technique 4 requires `--mapped-json`.
