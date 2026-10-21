---
sidebar_position: 13
---

# Changelog

This page tracks user-facing changes to js-recon, mirroring the `dev`-branch `CHANGELOG.md` in the tool's own repository.

## 2.0.1-beta.1 - 2026-08-17

### Added

- New `nuxt-dev` tech: detects a Nuxt.js dev server (`nuxi dev` / `npm run dev`) as a distinct tech from a production `nuxt` build, mirroring `next-dev`/`vue-dev`/`svelte-dev`/`react-dev`/`angular-dev` (#194). Nuxt 3/4 (Vite) and Nuxt 2 (webpack) dev-server markers were **both** confirmed live this round — unlike several sibling `*-dev` webpack branches. `checkNuxtDevServer.ts` looks for Nuxt's own `/_nuxt/`-prefixed Vite client path (`/_nuxt/@vite/client`, distinct from vanilla Vite's root `/@vite/client`) plus a weak `__NUXT_DEVTOOLS_TIME_METRIC__` inline-script signal for Nuxt 3/4, and an unhashed `_nuxt/app.js` entry filename plus a `/__webpack_hmr` intercepted-request pathname for Nuxt 2. The gate is checked only after `checkNuxtJS` matches, at both the HTML-level check and the intercepted-URL fallback. No dedicated crawler was needed — the existing `nuxt_js/*` pipeline already handles dev mode once two shared (not dev-specific) bugs were fixed: `nuxt_stringAnalysisJSFiles.ts`'s literal-path scanner previously matched only a bare `.js` suffix, missing every cache-busted (`?v=<hash>`) Vite import and every raw `.mjs`/`.ts`/`.vue` dev-mode source reference; and a malformed/oversized literal (for example, an entire module's source embedded in a webpack `eval`-devtool string) could throw inside the per-file resolver and permanently block that file from ever being marked analyzed, spinning the discovery loop forever. A third, general bug (affecting every `*-dev` webpack branch, not just Nuxt's) was also fixed: `techDetect/index.ts` no longer reads the full response body of an intercepted `text/event-stream` connection (for example, a webpack-hot-middleware HMR socket), which previously hung tech detection indefinitely against any webpack dev server with an open HMR connection. `run`'s tech allow-list and pipeline condition were extended accordingly (Nuxt's map/analyze calls already hardcode `"vue"` regardless of dev/prod, so no new remap arm was needed). Benchmarked at effectively complete recovery for both Nuxt generations against an independent `katana` crawl (Nuxt 3: 176/177 URLs, the one miss being a Vite-internal-only file never fetched as app content; Nuxt 2: 0 missed, full overlap) and cross-checked with a `jsr-network-bench` dual-capture pass showing zero real discovery gaps. (`lazyload`, `run`)

### Fixed

- `run`'s generated OpenAPI spec and Postman collection now use the actual target URL instead of a placeholder: `openapiGenerator.ts`'s `servers[].url` and `postmanGenerator.ts`'s `baseUrl` variable read a new `targetUrl` global (`src/utility/globals.ts`), set from the `-u` value at the start of `processUrl`, falling back to the previous `{{baseUrl}}`/`https://example.com` placeholder if unset. `setTargetUrl` strips `username`/`password`/`search`/`hash` before storing, so a `-u` value carrying basic-auth credentials or a signed query token doesn't leak into the generated artifacts. (`run`, `openapi`, `postman`)
- Nuxt 2 dev-server detection (`checkNuxtDevServer.ts`) no longer misclassifies a production build as `nuxt-dev`: the unhashed-entry marker now requires the full `/_nuxt/app.js` suffix (was matching any `app.js` basename, for example, `/assets/app.js`), and the webpack-HMR marker requires a complete `__webpack_hmr` path segment instead of a bare substring match.
- `techDetect/index.ts`'s event-stream content-type check is now case-insensitive, so a server returning `Text/Event-Stream; charset=utf-8` (mixed case, with parameters) still gets skipped instead of hanging tech detection on that persistent HMR connection.
- `refactor -t react-webpack`'s webpack-async-chunk-loading rewrite (`requireParam.e(N).then(requireParam.bind(requireParam, N))` → dynamic import) now emits a real `ImportExpression` node (`t.importExpression`) instead of a `CallExpression` with an `Import`-type callee — the latter is Babel 7's legacy shape and is no longer a valid expression under the `@babel/types` v8 migrated in this same release, which silently broke `renameRouteComponents`' route-component renaming for any React-Router lazy route using this webpack pattern.
- AI SDK clients (`src/utility/ai.ts`) are now constructed lazily on first use instead of at module load. The `openai` dependency's v7 line changed its `OpenAI` client constructor to throw immediately when no `apiKey` is configured, which crashed **every** js-recon invocation on import — not just runs that actually use an AI feature (`mcp`'s AI chat, `analyze`'s AI-assisted rule helpers) — for any user who hadn't set an AI API key. The OpenAI, Ollama, and Anthropic clients are now held behind `??=`-memoized getters and only instantiated the first time `ai()` resolves a provider, so an unconfigured AI provider is inert until actually selected. (`ai`)
- Migrated `@babel/types`, `@babel/parser`, and `@babel/traverse` from v7 to v8 (`^8.0.4`), dropping the now-stale `@types/babel__traverse` pin that was shipping a duplicate nested v7 type copy. Beyond the mechanical fallout of v8 dropping default exports (namespace imports) and no longer CJS-interop-wrapping `traverse`/`generator` (removing the `(_x.default ?? _x)` unwrap pattern) across roughly 120 call sites, the upgrade carried one real functional risk that was caught and fixed in the same change: v8's parser now emits a dynamic `import(...)` call as an `ImportExpression` node directly, rather than the v7 shape (a `CallExpression` with an `Import`-type callee). Four dynamic-import detection call sites still checked for the old shape — `angular_recursiveChunkImports.ts`, `vue_jsImports.ts`, `react-vite`'s and `refactor/react/transform.ts`'s import-rewriting — and would have silently stopped matching any dynamic import in every affected pipeline had they not been updated to also recognize `ImportExpression`. Verified with a clean `tsc` build, the full unit suite, an end-to-end `run` against local targets, and a `refactor -t react-webpack` pass against a real code-split React bundle. (`lazyload`, `map`, `analyze`, `refactor`, `endpoints`, `strings`)

### Security

- CI workflow checkouts that don't perform an authenticated git operation (`codeql.yml`, `plumber.yml`, `pr_checker.yml`, the smoke-test workflows, most jobs in `build-and-prettify.yaml`/`promote-js-recon.yml`) now set `persist-credentials: false`, so the ambient `GITHUB_TOKEN` isn't left in `.git/config` for later steps or third-party actions in that job to read.

### Fixed

- `@babel/generator` (imported directly by `map`'s `esquery` interactive command) is now declared as a direct `dependencies` entry instead of only being present transitively via `@babel/traverse`/`@babel/core`.

## 2.0.1-alpha.3 - 2026-08-14

### Added

- New `vue-dev`, `react-dev`, `svelte-dev`, and `angular-dev` techs: each detects a dev server (Vite/webpack-dev-server for Vue and React, always-Vite for SvelteKit, and either the esbuild/Vite or legacy webpack builder for Angular) as a distinct tech from its production build counterpart, mirroring the existing `next-dev` tech. `lazyload` and `run` reuse each framework's existing crawler pipeline, with small additive fixes (import-following, filename sanitization, and chunk-map parsing) closing the gaps between dev-server output and production-build output. `map`/`analyze` remap each `*-dev` tech to its production equivalent so existing rules keep working unchanged.

### Fixed

- `lazyload`'s Svelte/SvelteKit inline-`<script type="module">` boot-pattern scan now also matches a static ES `import ... from "...js"` declaration, in addition to the dynamic `import("...")` call form it already handled. Some SvelteKit builds bootstrap the client via a static import instead of a dynamic one; since the entry chunk seeds the entire downstream chunk-discovery graph, missing it caused the whole crawl to collapse to a single JS file even though framework detection succeeded.

### Security

- Removed the `extract-zip` dependency, which carried a high-severity, unfixed advisory (`GHSA-jmr9-qjv8-65gv`, unvalidated symlink path traversal on archive extraction) with no patched release available upstream. `analyze`'s rules downloader now fetches the `js-recon-rules` release as a tarball and extracts it with the already-depended-on, actively maintained `tar` package instead.

## 2.0.1-alpha.2 - 2026-08-12

### Fixed

- The response cache is now backed by a single SQLite file (`.resp_cache.db`) instead of the previous JSON-based formats. `--cache-file`'s default changed from `.resp_cache.json` to `.resp_cache.db` across `lazyload`, `run`, and `load`. This is a clean break, not an in-place migration — an existing `.resp_cache.json`/`.entries/` directory from a prior version is left untouched but never read again; the first run after upgrading simply starts with an empty cache.
- `load` (Caido/Burp import) now writes each imported entry directly into the SQLite cache instead of building one large in-memory JSON object and serializing it in a single write at the end. This also removes the previous "cache too large to serialize as one JSON string" failure mode entirely.
- `lazyload`'s cache pre-creation step now opens the SQLite cache database up front instead of writing an empty JSON stub; a failure to open it is now a fatal error with a dedicated exit code (`32`) — see [Exit Codes](./exit_codes.md).

### Security

- Removed the `fs` npm package from dependencies. It was never referenced by the codebase and sat unused in `package-lock.json` as an extraneous entry; the `fs` package on npm (distinct from Node's builtin module) is flagged as malicious by OSV (`MAL-2025-21003`).
- Enabled Dependabot version updates for the npm, Docker, and GitHub Actions ecosystems, opening weekly pull requests against `dev` so outdated dependencies surface automatically instead of only being caught at release time.

### Added

- `lazyload`/`run` now decode inline (base64 or percent-encoded) `data:` URI sourcemaps found in `//# sourceMappingURL=...` comments — for example, Vite's `build.sourcemap: 'inline'` or webpack's `devtool: 'inline-source-map'`/`eval-source-map` — instead of treating the reference as a fetchable URL and losing the sourcemap entirely. Handled for every framework the crawler supports: React, Vue, and Svelte gained a `data:` branch; Next.js, Angular, and Nuxt gained sourcemap scanning entirely, where they previously had none.
- Release CI now runs a dependency-audit job before publishing to npm, blocking the release if any dependency is a known malicious package.
- `report.html` has a fancier, dark-mode-aware UI: a light/dark theme toggle (defaults to the OS color scheme, persisted via `localStorage`) restyles the navbar, collapsible sections, and the findings/mapped views; severity values render as colored badges. `report.html` no longer depends on any CDN to render correctly, including when opened directly via `file://`.
- New `-H/--header <name: value>` flag for authenticated scanning: repeatable, parses each value as `Name: Value` and applies it to every outbound request path (direct, SOCKS, HTTP, Oxylabs, AWS, and Puppeteer page loads). Available on `lazyload`, `run`, and `exploit`.
