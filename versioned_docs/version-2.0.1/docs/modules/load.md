---
sidebar_position: 13
---

# Load command

The `load` command populates the response cache from an HTTP request-history export (currently a Caido JSON export). Once the cache is populated, subsequent `js-recon` runs against the same target can be executed entirely offline by pairing this command with [`--cache-only`](#cache-only-mode).

This is useful when:

- The target sits behind authentication, IP allow-listing, or a WAF and you have a previously captured session from a proxy.
- You want fully reproducible runs over a frozen set of responses.
- You want to avoid re-hitting the target while iterating on rules or map logic.

## Usage

```bash
js-recon load -c <caido-export.json> -u <target-url> [--cache-file <file>]
```

### Required arguments

- `-c, --caido <file>`: Caido JSON export file containing request/response pairs.
- `-u, --url <url>`: Target URL. Only entries whose host, port, and scheme match the URL are loaded into the cache.

### Options

| Option                | Alias | Description                                                         | Default          | Required |
| --------------------- | ----- | ------------------------------------------------------------------- | ---------------- | -------- |
| `--caido <file>`      | `-c`  | Caido JSON export file                                              |                  | Yes      |
| `--url <url>`         | `-u`  | Target URL — only entries matching this host/port/scheme are loaded |                  | Yes      |
| `--cache-file <file>` |       | Response cache file to write                                        | `.resp_cache.db` | No       |

## How it works

1. The Caido export is streamed and parsed object-by-object (it never loads the whole file into memory), so multi-gigabyte exports are supported.
2. Each entry is filtered by host, port, and scheme against the `-u` target.
3. The request and response are base64-decoded; the response body is transparently decompressed (`gzip`, `br`, `deflate`, `zstd`).
4. `Content-Length`, `Content-Encoding`, and `Transfer-Encoding` headers are stripped from the stored response so a downstream consumer sees the decoded body.
5. Requests carrying an `RSC` header are stored under a separate `rsc` key so they don't collide with the equivalent non-RSC variant of the same URL.
6. Multiple URL variants (with and without an explicit non-default port) are written so the cache lookup matches no matter which form a later module uses.

## Cache-only mode

The `--cache-only` flag — available on both the [`run`](./run.md) and [`lazyload`](./lazyload.md) commands — instructs `js-recon` to never hit the network: every request must be served from the response cache, and cache misses fail fast.

```bash
# 1. Populate the cache from a Caido export.
js-recon load -c session.json -u https://example.com

# 2. Run the full pipeline offline against the populated cache.
js-recon run -u https://example.com --cache-only -y -k
```

When `--cache-only` is set:

- `makeRequest` short-circuits before any network I/O and returns the cached entry, or `null` on a miss.
- Retry loops collapse to a single attempt — there is no point retrying a missing cache entry.
- The Puppeteer-based tech-detection fetch in the `lazyload` step is skipped; tech detection falls back to whatever responses already exist in the cache.
- Cache misses are reported once per URL in dim text (`[!] Cache miss (cache-only mode): ...`) instead of the standard red failure banner.
