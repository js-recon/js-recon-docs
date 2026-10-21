---
sidebar_position: 4
---

# Svelte/Astro static scan

This document walks through running JS Recon end-to-end against a Svelte or Astro+Svelte target. The pipeline mirrors the [Vue.js scenario](./vue-js.md): download the JS surface, map Vite chunks, run AST rules, and produce a report — with additional handling for Astro island hydration and client-side-routed page discovery.

## What the tool does for Svelte/Astro

| Module     | Svelte/Astro support                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lazyload` | Downloads `.js` modules. For SvelteKit `adapter-node` targets, extracts entry-point paths from inline `<script>` bodies that use `Promise.all([import("...")])` — the standard boot pattern emitted by the Node adapter. For Astro builds, also collects `component-url` and `renderer-url` attributes from `<astro-island>` elements. After the initial page crawl, scans downloaded JS files for embedded page path strings and visits each discovered route to find further islands (client-side routing means routes rarely appear as `<a href>` links in the server-rendered HTML). |
| `map`      | Decodes Vite production chunks using the same 2-character function-name convention as Vue.js. Each top-level function becomes a chunk; files without that convention are emitted as single-function chunks. `fetch()` and Axios calls are resolved with the same taint-flow analysis as Vue.js.                                                                                                                                                                                                                                                                                          |
| `analyze`  | Evaluates every AST rule whose `tech:` list includes `svelte` against the mapped chunks. All bundled rules support Svelte/Astro out of the box.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `report`   | Generates the same SQLite + HTML report as for other frameworks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Tech detection

JS Recon auto-detects Svelte/Astro by checking the page source for:

- `svelte-` prefixed class names or element IDs (SvelteKit)
- `data-sveltekit-*` attributes (SvelteKit navigation markers)
- `<astro-island>` elements whose `renderer-url` or `opts` attribute references the Svelte adapter

## End-to-end with the `run` module

Point `run` at the Svelte/Astro target. The orchestrator detects the framework and executes `lazyload → map → analyze → report`:

```bash
js-recon run -u https://app.example.com -r ./js-recon-rules/ast
```

The `-r` flag is optional — if omitted, JS Recon pulls the bundled rule set from `~/.js-recon/rules`. The resulting layout in the working directory:

- `output/<host>/` — downloaded `.js` modules
- `mapped.json` — chunks recovered from Vite output
- `mapped-openapi.json` — OpenAPI v3 spec derived from resolved `fetch()` calls
- `analyze.json` — findings from AST + request rules
- `report.html`, `js-recon.db` — final report and its SQLite store

## Running modules individually

If you would rather run the steps one at a time (for example, when iterating on a custom rule), invoke them in order:

```bash
# 1. Download JS modules (including Astro island assets)
js-recon lazyload -u https://app.example.com

# 2. Map Vite chunks
js-recon map -d output/app.example.com -t svelte

# 3. Analyze with the bundled or a custom rule set
js-recon analyze -m mapped.json -t svelte -r ./js-recon-rules/ast

# 4. Generate the report
js-recon report -m mapped.json -a analyze.json --openapi mapped-openapi.json
```

## Notes

- Endpoints extraction is not yet implemented for Svelte/Astro, so the endpoints section of the report will be empty.
- Astro islands use Vite under the hood, so the chunk format and fetch-resolution logic are identical to Vue.js.
- For pure SvelteKit apps (no Astro), the `renderer-url` collection step is a no-op — only `component-url` discovery applies.
