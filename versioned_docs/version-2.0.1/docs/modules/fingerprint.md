---
sidebar_position: 16
---

# Fingerprint command

The `fingerprint` command detects the front-end JavaScript framework used by one or more target URLs. It is useful for quickly profiling a list of targets before running a full `lazyload` or `run` pipeline.

## Usage

```bash
js-recon fingerprint -u <url/list/file> [options]
```

## Options

| Option                  | Alias | Description                                                                                                                | Default | Required |
| ----------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------- | ------- | -------- |
| `--url <url/list/file>` | `-u`  | Target URL, comma-separated URLs, or target file; may be repeated. See [Run's `-u` examples](./run.md#required-arguments). |         | Yes      |
| `--output <file>`       | `-o`  | Output file to write results.                                                                                              |         | No       |
| `--format <formats>`    | `-f`  | Output formats: `text`, `csv`, `json`, `jsonl` (comma-separated for multiple).                                             | `text`  | No       |
| `--threads <n>`         | `-t`  | Number of concurrent detection workers.                                                                                    | `5`     | No       |
| `--timeout <ms>`        |       | Request timeout in milliseconds.                                                                                           | `30000` | No       |
| `--insecure`            | `-k`  | Disable SSL certificate verification.                                                                                      | `false` | No       |
| `--no-sandbox`          |       | Disable browser sandbox.                                                                                                   | `false` | No       |

## How it works

For each URL, the command delegates to the same framework-detection logic used by `lazyload` — see [Lazyload — Framework detection](./lazyload.md#framework-detection) for the full priority-ordered marker list. If none of the markers match, the framework is reported as `unknown`.

Detection uses two sources per URL: a raw HTTP response (fast path) and a Puppeteer-rendered page (catches client-side-only markers after a 2-second settle). Results are printed live as each URL is processed, with a progress bar showing overall completion.

## Output formats

### Text (default)

Each line is formatted as `[<framework>] <url>`:

```
[next.js] https://example.com
[unknown] https://other.com
```

### CSV

The first row is a header; subsequent rows are `framework,url`:

```
framework,url
next.js,https://example.com
unknown,https://other.com
```

### JSON

A JSON array of objects, each with `url` and `framework` fields:

```json
[
    { "url": "https://example.com", "framework": "next" },
    { "url": "https://other.com", "framework": "unknown" }
]
```

### JSONL

One JSON object per line (newline-delimited JSON), useful for streaming or piping into other tools:

```
{"url":"https://example.com","framework":"next"}
{"url":"https://other.com","framework":"unknown"}
```

### Multiple formats

Pass a comma-separated list to write multiple files in one run. The output filename is used as a base and the appropriate extension (`.txt`, `.csv`, `.json`, `.jsonl`) is appended automatically.

## Examples

### Single URL

```bash
js-recon fingerprint -u https://example.com
```

### File of URLs

Create a file `targets.txt` with one URL per line, then run:

```bash
js-recon fingerprint -u targets.txt
```

### Save results to a file

```bash
js-recon fingerprint -u targets.txt -o results.txt
```

### Save as CSV

```bash
js-recon fingerprint -u targets.txt -o results -f csv
```

### Save as JSON

```bash
js-recon fingerprint -u targets.txt -o results -f json
```

### Save as JSONL

```bash
js-recon fingerprint -u targets.txt -o results -f jsonl
```

### Save all formats at once

```bash
js-recon fingerprint -u targets.txt -o results -f text,csv,json,jsonl
```

This produces `results.txt`, `results.csv`, `results.json`, and `results.jsonl`.

### Run with more threads

By default, 5 URLs are fingerprinted concurrently. Increase the thread count for large URL lists to reduce total run time:

```bash
js-recon fingerprint -u targets.txt -t 10 -o results.txt
```

Tune `-t` based on available memory and network capacity. Higher values are faster but increase memory use and the chance of rate-limiting by the target.

### Skip SSL verification

```bash
js-recon fingerprint -u https://example.com -k
```
