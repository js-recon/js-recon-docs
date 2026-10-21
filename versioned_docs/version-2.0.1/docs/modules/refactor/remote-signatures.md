---
sidebar_position: 8
---

# Remote Signature Stripping

By default, when running `refactor -t <technology>` without `--collisions`, the tool automatically downloads CS-MAST signature data from the HuggingFace bucket [`shriyanss/cs-mast-s-dataset`](https://huggingface.co/buckets/shriyanss/cs-mast-s-dataset) and uses it to strip library/framework modules — no local baseline clone required.

This page documents the shared mechanics, configuration, and flags used by every technology. For the bucket prefix and cache sub-path specific to your technology, see that technology's own page (linked from each tech page's "Remote signature stripping" section).

## How it works

1. The tool maps the `-t` flag to a bucket prefix (for example `react-webpack` → `react/webpack/small`).
2. It validates that the prefix contains `sample_size` and `technology` metadata files, and that the technology matches.
3. It fetches (or loads from cache) the list of `collisions.json` files under that prefix.
4. For each file whose path contains the configured scat directory (`lit-decl-loop-cond` by default), it downloads and caches the file.
5. After applying the signature quality filter, it intersects all loaded signature sets. Signatures surviving the intersection appeared in every feature's baseline, making them definitionally library/framework code.
6. The resulting set is used exactly like the `--collisions` baseline to classify and strip modules from the output.

On a fresh run the tool prints download progress; subsequent runs use the local cache silently.

## Configuration

The tool reads (and creates on first use) `~/.js-recon/refactor/config.json`:

```json
{
    "maxCacheSizeMb": 512
}
```

| Field            | Description                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `maxCacheSizeMb` | Maximum signature cache size in MB. When exceeded, oldest entries are evicted until the cache is below 50% of this limit. Default: `512`. |

## Cache layout

```
~/.js-recon/refactor/
├── config.json
├── cs-mast-s-list-cache.json          ← file list cache (7-day TTL)
└── signature_cache/
    └── <bundler>/
        └── <build-size>/
            └── <feature-app>/
                └── <scat-combo>/
                    ├── collisions.json
                    ├── cached_at.txt      ← unix timestamp; 7-day TTL
                    └── remote_hash.txt    ← last-known upstream content hash
```

The `<bundler>/<build-size>` segment is the technology-specific bucket prefix (for example `react/webpack/small`); see each tech page for its actual value. Both cache layers have a 7-day TTL and are refreshed automatically when stale.

## Content-based cache validation

Age alone can't tell you whether the _content_ behind a cached file changed upstream — a dataset regeneration or fix could land at any point inside the 7-day window and a purely age-based cache would keep serving the old (possibly empty or incorrect) signatures until the TTL expired. To close that gap, every run (unless `--skip-cache-checks` is set) also fetches each bucket file's current content hash and compares it against the hash recorded in `remote_hash.txt` when that file was last cached:

- **Hash matches** — the cache entry is still valid; the age-based TTL is used as normal.
- **Hash differs (or `remote_hash.txt` doesn't exist yet)** — the cache entry is treated as stale regardless of its age, and the file is re-downloaded and re-cached with the new hash.
- **The current run couldn't determine the upstream hash** (network error) — falls back to the pre-existing age-based check only, same as before this mechanism existed.

This is what makes `refactor` output deterministic across repeated runs against the same bundle without requiring a manual cache purge — see the "Manual cache purge" note below for when a purge is still worth doing anyway (for example, before a benchmark comparison, to also pick up cache-size-eviction changes).

## Signature quality (`--sq` / `--signature-quality`)

Each bucket prefix includes a `sample_size` file (for example `18` for the `react/webpack/small` prefix). The quality of a signature record is computed as:

```
quality = (count / sample_size) * 100
```

A signature is included only when its quality meets the threshold (default 100%). At 100% a signature must appear in **every** file in the sample, which is the strictest possible filter — only library/framework code shared across all sampled apps survives.

Lowering `--sq` below 100 includes signatures that appeared in most-but-not-all apps, which may catch more library modules at the cost of a small false-positive risk.

```bash
# Default (strictest — only universally shared signatures)
js-recon refactor -t react-webpack -o output_refactored

# More permissive — include signatures in ≥90% of the sample
js-recon refactor -t react-webpack --sq 90 -o output_refactored
```

## Scat category override (`--scat`)

The `--scat <categories>` flag overrides the CS-MAST scat category set used for both the remote signature download and the module classifier. The default is `lit,decl,loop,cond`.

```bash
# Use a minimal scat config (fastest, fewer signatures)
js-recon refactor -t react-webpack --scat lit

# Use a broader config
js-recon refactor -t react-webpack --scat lit,id,decl,loop,cond

# Full 9-category config (most signatures, slowest)
js-recon refactor -t react-webpack --scat lit,id,op,decl,loop,cond,name,val,op_name
```

The value is a comma-separated list from: `lit`, `id`, `op`, `decl`, `loop`, `cond`, `name`, `val`, `op_name`. Order does not matter — categories are automatically mapped to the bucket directory name in canonical order (the same ordering used by the HuggingFace dataset generator). Both `--scat lit,cond,decl` and `--scat decl,lit,cond` resolve to the same `lit-decl-cond` bucket directory.

For guidance on which combination to use, see [Choosing scat categories](./choosing-scat.md).

## Remote dataset path override (`--remote-collisions`)

By default the tool resolves the dataset path automatically from the detected technology. Use `--remote-collisions` to supply an explicit HuggingFace bucket path instead:

```bash
js-recon refactor -t react-webpack --remote-collisions react/webpack/large -o output_refactored
```

If the path does not exist in the dataset the tool exits with [code 25](../../exit_codes.md).

## Cache control flags

| Flag                  | Effect                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| `--refresh-cache`     | Force-refresh the file list cache regardless of age                                                  |
| `--skip-cache-checks` | Skip all age/staleness checks; use whatever is cached                                                |
| `--no-remote`         | Disable remote fetch entirely; runs without library stripping unless `--collisions` is also provided |

```bash
# Force a fresh file list from the remote dataset
js-recon refactor -t react-webpack --refresh-cache -o output_refactored

# Air-gapped / offline — use cache as-is, no HTTP requests
js-recon refactor -t react-webpack --skip-cache-checks -o output_refactored

# Disable remote entirely (same as old default when --collisions was absent)
js-recon refactor -t react-webpack --no-remote -o output_refactored
```

## Manual cache purge

The content-based validation above catches upstream dataset changes automatically. It's still worth purging the cache by hand before any benchmark or regression comparison, since a purge also re-evaluates cache-size eviction and clears any pre-existing entries written before this mechanism existed (which have no `remote_hash.txt` yet, so they rely on the age-based fallback for one more cycle):

```bash
rm -rf ~/.js-recon/refactor/{signature_cache,cs-mast-s-list-cache.json,version_sigs_cache,config.json}
```
