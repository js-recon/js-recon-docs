---
sidebar_position: 3
---

# Vue.js static scan

This document walks through running JS Recon end-to-end against a Vue.js target. The pipeline is parallel to the [Next.js scenario](./next-js.md): download the JS surface, map functions, run AST rules, and produce a report — but with Vite-specific handling for both production chunks and dev-server modules.

## What the tool does for Vue.js

| Module     | Vue.js support                                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lazyload` | Downloads `.js`, `.json`, `.js.map`, and `.vue` modules. In Vite dev mode, `.vue` files are served as pre-transformed ES modules, so they are saved verbatim. Style-only sub-requests (`?vue&type=style&...&lang.css`) are skipped.                                 |
| `map`      | For Vite production output (2-character function-name convention), each top-level function becomes a chunk. For dev-server output and any file without that convention, the **entire module becomes a single chunk** so the AST engine still has something to scan. |
| `analyze`  | Evaluates every AST rule whose `tech:` list includes `vue` against the chunks above. The bundled rules cover Vue's `v-html` directive (compiled to `{ innerHTML: X }`), `window.location.search` reads, and `useRoute()` taint flow.                                |
| `report`   | Generates the same SQLite + HTML report as for Next.js. Endpoints extraction is not yet implemented for Vue.js, so the endpoints section will be empty.                                                                                                             |

## End-to-end with the `run` module

Point `run` at the Vue.js target. The orchestrator will detect Vue.js, then execute `lazyload` → `map` → `analyze` → `report`:

```bash
js-recon run -u https://app.example.com -r ./js-recon-rules/ast
```

The `-r` flag is optional — if omitted, JS Recon will pull the bundled rule set from `~/.js-recon/rules`. The resulting layout in the working directory:

- `output/<host>/` — downloaded `.js` / `.vue` modules
- `mapped.json` — chunks recovered from Vite output
- `mapped-openapi.json` — OpenAPI v3 spec derived from resolved `fetch()` calls
- `analyze.json` — findings from AST + request rules
- `report.html`, `js-recon.db` — final report and its SQLite store

## Running modules individually

If you would rather run the steps one at a time (for example, when iterating on a custom rule), invoke them in order:

```bash
# 1. Download JS + Vue modules
js-recon lazyload -u https://app.example.com

# 2. Map Vite chunks
js-recon map -d output/app.example.com -t vue

# 3. Analyze with the bundled or a custom rule set
js-recon analyze -m mapped.json -t vue -r ./js-recon-rules/ast

# 4. Generate the report
js-recon report -m mapped.json -a analyze.json --openapi mapped-openapi.json
```

## What findings look like for Vue.js

The three rules ship out of the box with Vue.js coverage:

- **`detect_dom_xss_dangerouslySetInnerHTML`** — Catches `v-html="X"` once Vite compiles it to `{ innerHTML: X }` paired with a `fetch()` in the same module.
- **`detect_dom_xss_innerHTML_url_source`** — Catches `headingRef.value.innerHTML = ...${q}...` inside an `onMounted` block where `q` came from `URLSearchParams(window.location.search).get(...)`.
- **`detect_cspt_fetch_url_param`** — Catches ``fetch(`/api/docs/${file}`)`` where `file` is `route.query.file` (the `route` binding inherits taint from `useRoute()`).

See [Predefined rules](../rules/predefined-rules.md) for the full taxonomy and the constraints each rule applies.
