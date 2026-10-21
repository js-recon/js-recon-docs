---
sidebar_position: 1
---

# Lazyload Methods

The `lazyload` module runs a set of **discovery methods** to find JavaScript files on the target. Each method is named after its source file and targets a specific technique (script-tag extraction, manifest parsing, brute-force, etc.).

You can control which methods run using the [`--include-methods`](../lazyload.md) (whitelist) and [`--exclude-methods`](../lazyload.md) (blacklist) flags on the `lazyload` command.

## Listing methods at runtime

```bash
js-recon lazyload --list-methods
js-recon lazyload --list-methods next_js
```

## Method reference

### Next.js (`next_js`)

| Method name                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next_GetJSScript`                     | Extracts `<script src>` tags from the rendered landing page HTML.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `next_GetLazyResourcesBuildManifestJs` | Parses `_buildManifest.js` to enumerate all chunk URLs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `next_GetLazyResourcesWebpackJs`       | Loads the page via Puppeteer, scans all captured JS files for webpack chunk-URL builder functions (`__webpack_require__.u`), and executes approved ones to enumerate chunk URLs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `next_SubsequentRequests`              | Re-crawls using a list of extracted URL paths to fetch RSC/dynamic chunks loaded on subsequent navigation (requires `--subsequent-requests`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `next_scriptTagsSubsequentRequests`    | Visits extracted URL paths and collects script tags from each page's HTML (requires `--subsequent-requests`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `next_promiseResolve`                  | Analyzes `Promise.all` / `__webpack_require__.e` patterns inside JS files to resolve dynamically loaded chunk IDs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `next_parseLayoutJs`                   | Parses App Router `layout.js` files to enumerate nested route dependencies (Next.js 13+ only).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `next_bruteForceJsFiles`               | Brute-forces `.map` and related chunk files based on the set of already-discovered JS URLs. Runs last as a fallback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `next_getClientSidePaths`              | Harvests `<a href>` links from pages to expand the crawl frontier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `next_routerStateForge`                | For routes that redirect an unauthenticated request, retries as an RSC fetch with a forged `Next-Router-State-Tree` header claiming a known ancestor path segment is already client-rendered. Some Next.js apps put their only auth check inside a layout component instead of middleware; a forged claim can cause that layout's component function to be skipped, disclosing protected content. Dynamic route segments (for example, `app/organizations/[org]/layout.js`) require guessing the real param name from a fixed wordlist (`--rsc-param-bruteforce-limit` controls a bounded fallback that harvests additional candidate names from already-fetched RSC response bodies once the wordlist is exhausted). |
| `next_serverActionIdScan`              | Runs after every chunk is downloaded; scans each `.js` file for `createServerReference("<id>", ...)` call sites (same ID-format validation as `map`'s AST-based Server Action resolver, `/^[0-9a-f]{40,}$/i`, applied directly to raw chunk text) and writes any discovered IDs to `server_action_ids.json` in the target's output directory (`{ actionIdsByFile, allActionIds }`). Disclosure only — no action is invoked; a Server Action ID shipped in a public chunk for a page the crawl couldn't reach unauthenticated is itself a disclosure signal.                                                                                                                                                           |

### Vue.js (`vue`)

| Method name                           | Description                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `vue_discoverJsFiles`                 | Parses the entry page HTML and follows `<script src>` tags and ESM import maps.    |
| `vue_recursiveClientSidePathDownload` | Recursively runs the discovery pipeline on every client-side route path found.     |
| `vue_stringJsFiles`                   | Scans downloaded JS files for string-embedded chunk paths.                         |
| `vue_getClientSidePaths`              | Extracts client-side route paths from Vue Router configuration.                    |
| `vue_pageSrc`                         | Fetches additional JS from page `<script src>` attributes.                         |
| `vue_reconstructSourceMaps`           | Fetches `.js.map` files and reconstructs original sources.                         |
| `vue_RuntimeJs`                       | Locates and processes the Vue runtime JS entry file.                               |
| `vue_viteMapDeps`                     | Resolves `__vite_mapDeps` references used by Vite to preload module dependencies.  |
| `vue_sourcemapExtract`                | Extracts inline sourcemap data URIs from downloaded JS.                            |
| `vue_jsImports`                       | Follows ESM `import` statements recursively to discover transitively loaded files. |
| `vue_severalJsFilesHome`              | Handles apps that serve multiple JS entry files from the home page.                |
| `vue_SingleJsFileOnHome`              | Handles apps that serve a single JS entry file from the home page.                 |

### Nuxt.js (`nuxt_js`)

| Method name                  | Description                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `nuxt_getFromPageSource`     | Extracts JS file URLs from `<script src>` tags in the server-rendered HTML.               |
| `nuxt_stringAnalysisJSFiles` | Scans downloaded JS for string-embedded paths to additional chunks.                       |
| `nuxt_astParse`              | AST-parses downloaded JS files to resolve dynamic import statements and chunk references. |

Nuxt.js discovery also probes `/_nuxt/builds/latest.json` and derives `/_nuxt/builds/meta/<id>.json` from it — these files are fetched at runtime by the Nuxt client for incremental-deployment support but are never referenced from HTML or JS string literals, so they are invisible to all other discovery steps. This step always runs and is **not** listed by `--list-methods nuxt_js` or selectable via `--include-methods`/`--exclude-methods`.

### Svelte / Astro (`svelte`)

| Method name                    | Description                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `svelte_getFromPageSource`     | Extracts JS file URLs from the server-rendered HTML. Handles three patterns: `<link rel="modulepreload">` tags, `<script src="...">` tags, and — for SvelteKit `adapter-node` targets — inline `<script>` bodies containing `import("...")` calls (the `Promise.all([import(...)])` boot pattern emitted by the Node adapter).       |
| `svelte_getVersionJson`        | Probes `/<appDir>/version.json` (default `/_app/version.json`). SvelteKit generates this file at build time for the `updated` store but never references it from any HTML tag or `import()` call, so it is invisible to all other discovery steps. The `appDir` is inferred from entry-point URLs already found; defaults to `_app`. |
| `svelte_stringAnalysisJSFiles` | Scans downloaded JS for string-embedded paths to additional chunks and source maps.                                                                                                                                                                                                                                                  |
| `svelte_recursivePageCrawl`    | Crawls same-origin HTML pages found via `<a href>` and `<link href>` tags, running the full JS-discovery pipeline on each.                                                                                                                                                                                                           |
| `svelte_discoverPagesFromJs`   | Scans downloaded JS for embedded page path strings (for example, `/admin`, `/debug`) and visits each page to discover Astro island component URLs.                                                                                                                                                                                   |

### Angular (`angular`)

| Method name                 | Description                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `angular_getFromPageSource` | Extracts JS file URLs from `<script src>` tags in the server-rendered HTML.            |
| `angular_getFromMainJs`     | Analyzes the detected `main.js` entry bundle to discover lazy-loaded chunk references. |

### React (`react`)

| Method name               | Description                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `react_getScriptTags`     | Extracts `<script src>` tags and `<link rel="modulepreload">` hints from the page HTML (covers Vite vendor chunks). |
| `react_webpackChunkPaths` | Detects and executes webpack chunk-path builder functions (CRA / custom webpack configs).                           |
| `react_followImports`     | Recursively follows ESM `import` statements and Vite `__vite_mapDeps` references across all discovered files.       |
| `react_sourcemapUrls`     | Collects `.js.map` URLs for every discovered JS file and queues them for download.                                  |

## Interaction between `--include-methods` and `--exclude-methods`

- If `--include-methods` is provided, **only** the listed methods run; all others are skipped.
- If `--exclude-methods` is provided, all methods except the listed ones run.
- Providing both flags at the same time is not recommended — `--include-methods` takes priority.
- Method names are case-sensitive and must match exactly. An invalid name exits with [exit code 22](../../exit_codes.md).
