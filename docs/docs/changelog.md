---
sidebar_position: 13
---

# Changelog

This page tracks user-facing changes to js-recon, mirroring the `dev`-branch `CHANGELOG.md` in the tool's own repository.

## 2.1.0-alpha.5 - 2026-11-26

### Added

- `--compress-js-files <compression-type>` archives the JS output directory once everything that reads it has finished, then deletes the directory. Types: `tar` (`.tar`), `gzip` (`.tar.gz`), `brotli` (`.tar.br`), `zstd` (`.tar.zst`, Node.js 22.15 or later) and `zip` (`.zip`, up to 65,535 files and 4 GiB). `run` archives `output` in single-target mode and each target's directory in batch mode after it is merged into the global `js-recon.db`. `lazyload` archives its output directory when it finishes. Only regular files and directories are stored: symlinks are left out, hard links are stored as copies, member names stay under the archived directory, modes are reset to 0644/0755 with no owner, and the archive is created owner-only (0600). An existing file or symlink at the archive path is never overwritten. If the type is invalid or the archive can't be written, the command exits with `42` and the directory is kept. (`lazyload`, `run`)
- `taintwire analyze` prints a finding's confinements under it: where the tainted value lands in the sink (a same-origin path, the query or fragment, a fixed origin, a jQuery selector that doesn't start with `<`, or a sink API that confines it, such as same-origin `history.pushState` or a `postMessage` with a pinned target origin). They come from the taintwire-queries pack and are kept in `taintwire.json` (`confinements`) and SARIF (related locations and `properties.confinements`). `--analyze-taintwire` writes them to `analyze.json` too. (`analyze`, `run`, `taintwire`)
- `taintwire analyze --suppress-confined` leaves out findings whose confinement is a barrier for their rule. Navigation and link rules accept a path, query, fragment or origin; client-side path traversal rules accept only the query or fragment, since `../` still traverses after a fixed path; jQuery selector rules accept a selector; `dom_data_manipulation` and `web_message_manipulation` accept a confining sink API. Other rules are never suppressed. (`taintwire`)
- Each finding with interceptors or confinements gets an `explanation`, in the JSON output and in SARIF `properties.explanation`, that keeps the two apart: the confinements side says whether they are a barrier for the rule (the `--suppress-confined` policy), which kinds were found and why; the interceptors side always has `barrier: null`, since there is no interceptor policy yet. SARIF related locations are labelled `interceptor:` or `confinement:`. (`analyze`, `run`, `taintwire`)

### Changed

- taintwire is updated to 0.2.0-alpha.7, which runs the confinement queries of a sink selector. `taintwire analyze` without `-q` now downloads taintwire-queries v0.2.0, which adds interceptors, confinements and the `dom_clobbering_sanitizer`, `innerhtml_detached_decode` and `jquery_selector_url` rules. (`analyze`, `map`, `run`, `taintwire`)

## 2.1.0-alpha.4 - 2026-11-23

### Added

- `taintwire analyze` uses the taintwire-queries pack when `-q` is not given. It is downloaded to `~/.js-recon/taintwire-queries` and checked against the latest GitHub release, like the rules pack (`--disable-rules-version-check` skips the check). The `-w-rules` Docker images ship it. (`taintwire`)
- `taintwire analyze` prints the conditions a value passes before it reaches the sink (from the pack's interceptors) under each finding, and keeps them in the output. It always writes `--output-json` (default `taintwire.json`, the `analyze.json` finding shape), and writes SARIF 2.1.0 with `--output-sarif <file>`, where the conditions are related locations, branch steps of the code flow and properties. `-o` is removed. (`taintwire`)
- `taintwire build` and `taintwire analyze` show progress bars. (`taintwire`)
- `--map-taintwire` loads every file into one linked graph (no prefilter), so calls are resolved across webpack, Turbopack and ES-module chunks and classic scripts. For Next.js it loads the chunk files and maps results back to modules. Its value resolver follows destructuring, object and array literals, and React hooks (`useState` with its setter and `slicedToArray`, `useRef`, `useMemo`, `useReducer`, `useContext`). (`map`, `run`)
- The generic lazyload saves the JavaScript in event-handler attributes (`on*`) as `<attr>-N.js` and in `javascript:` attribute URLs as `javascript-N.js`, next to the page's inline scripts, with a `File Source` header. Identical bodies on a page are saved once. (`lazyload`, `run`)

### Changed

- The refactor step of `run` is now opt-in with `--enable-refactor`, which replaces `--disable-refactor`. A `run.disableRefactor` key left in an existing config file is ignored. (`run`)
- The Next.js lazyload method `next_routerStateForge` is split into two methods, so each technique can be turned on or off on its own. `next_rsfAncestorClaim` claims the route's parent path segments as ordinary segments (the full parent chain, then only the first segment). `next_rsfParamBruteforce` claims the last parent segment as a dynamic route segment, guessing its parameter name from the wordlist and then from names found in responses already received (`--rsc-param-bruteforce-limit`). With both on, the requests are the same, in the same order, as before. `next_routerStateForge` is no longer a valid name for `--include-methods` or `--exclude-methods`. The research-output keys `next_routerStateForge`, `next_routerStateForge_metadataOnly` and `next_routerStateForge_legacyKeyAccepted` are replaced by `next_rsfAncestorClaim`, `next_rsfParamBruteforce` (each with a `_metadataOnly` variant) and `next_rsf_legacyKeyAccepted`. (`lazyload`, `run`)

### Fixed

- `--analyze-taintwire` runs the rules on one linked graph of every chunk, with the prefilter applied per linked unit, so flows across classic scripts and chunks are found. (`analyze`, `run`)
- `--analyze-taintwire` skips known vendor library builds (by `File Source` name or banner) unless `--taintwire-include-vendor` is set. Unminified UMD React, ReactDOM or AngularJS builds on sites without a bundler made it run for over 15 minutes with no output. It now prints progress per graph and rule, and rewrites `analyze.json` after every rule so an interrupted run keeps its findings. (`analyze`, `run`)
- `--map-taintwire` only takes a config call whose method or type is an HTTP verb, rejects client-call URLs that contain whitespace or markup, only treats `{url}` objects with request keys as config calls, and caches resolver lookups (each point query on a whole-app graph cost 5-20 ms). (`map`, `run`)
- A site that loads React or Vue as a global script build with no bundler is now crawled with the generic lazyload. (`lazyload`, `run`)
- Pages that differ only by query string (`/post?id=1`, `/post?id=2`) share an output directory, and each one's inline and attribute scripts overwrote the previous page's. A taken file name is now skipped if the body is the same, and otherwise the next free number is used. (`lazyload`, `run`)
- taintwire is updated to 0.2.0-alpha.6. Classic scripts are linked through their shared global scope, ES-module chunks (Vite, Rollup, esbuild) through their imports and exports, a sink can list the conditions before it, and a sloppy-mode global assigned without a declaration (`x = v`, common in inline event handlers) now carries its value to later reads of `x`. (`analyze`, `map`, `run`, `taintwire`)

### Security

- `hono` is overridden to 4.13.19 (GHSA-4m76-xfj5-7975 and others), a dependency of `@modelcontextprotocol/sdk`. (`mcp`)

## 2.1.0-alpha.3 - 2026-11-09

### Added

- `taintwire build -o <file>.tw` writes one PookieGraph per unit instead of one graph of every file: each file plus the files that define the modules it loads through the webpack or Turbopack registry, transitively. The unit graphs and a `manifest.json` are packed into one `.tw` file (a tar archive), and `taintwire analyze -g <file>.tw` runs the rules on each unit's graph in turn, reporting a finding once even if several units contain it. A `.tw` saves memory only when every unit is much smaller than the app; in most framework builds the shared framework and vendor chunks are loaded into every unit, so it is larger and slower than a `.pg`. The default output stays `graph.pg`. A `.tw` whose `manifest.json` is missing, malformed or empty, or names a file outside the archive, exits with `39`. (`taintwire`)
- `--buffer-pool <MB>` and `--threads <n>` on `taintwire build` and `taintwire analyze` set the memory taintwire's database may use per graph and its query threads. (`taintwire`)

### Changed

- taintwire is updated to 0.2.0-alpha.3. Its database now takes at most half of the memory the process may use, which is the container's limit inside Docker or Kubernetes. Before, the limit was sized from the host's RAM even inside a container, so a large app could grow past the container's limit until the container killed the process; past the new limit, a load or query fails with `The buffer pool is full`. Queries run on 2 threads instead of one per core of the host, which lowered the peak CPU of `taintwire analyze` by about a third with the same run time. Query results are freed as soon as they are read, which lowers memory when graphs are built one after another. (`analyze`, `map`, `run`, `taintwire`)

## 2.1.0-alpha.2 - 2026-11-06

### Security

- `npm audit` is clean again; it had reported 51 vulnerabilities (32 high). `zod` moves to 4.6.7: no 3.x release fixes the memory-exhaustion advisory, and `jimp`, which `cli-print-img` uses, is overridden to the same version. `undici` moves to 7.30.2. Transitive `@hono/node-server`, `body-parser`, `fast-uri`, `glob`, `ip-address`, `minimatch` and `qs` are updated, and `deepmerge` is pinned to 4.1.2, which predates the prototype-poisoning advisory. (all)

### Added

- New `taintwire` command builds a PookieGraph (a `.pg` file) once and queries it with `.pgq` files. `taintwire build -d <dir> -o graph.pg` loads every JS file of a directory (for example lazyload's `output/<host>`) into one [taintwire](https://taintwire.js-recon.io) graph. The files are linked through the webpack or Turbopack module registry, so a value can flow from one chunk into another. `taintwire analyze -g graph.pg -q <file/dir>` runs the rules in `.pgq` query files against it and writes the findings to `taintwire.json` (the `analyze.json` shape). `taintwire validate -q <file/dir>` checks query files without a graph. A `.pgq` file is a TypeScript module of Cypher selectors and rules, evaluated in a separate, locked-down Node.js process that can read only its query pack (Node.js 22.15 or newer); the [taintwire-queries](https://github.com/js-recon/taintwire-queries) repository is the public pack. Each finding's `message` is the rule's own message. A rule that fails while running is reported and the other rules still run; the command then exits with `41`. New exit codes `37` to `41`. (`taintwire`)
- New rule type `taintwire` and the `--analyze-taintwire` flag on `analyze` and `run`. A taintwire rule's steps are Cypher queries over a [taintwire](https://taintwire.js-recon.io) graph of each `mapped.json` chunk: a step's row ids are passed to later steps as `$<step name>`, and a step with `taintFrom` keeps only the rows that a value from that step flows into (strict, lenient or deep, with an optional `maxHops`), following variables, function arguments and return values. An optional rule-level `prefilter` regex skips chunks before they are loaded. The rules run through taintwire's pgq runner (`runPgq`). They are opt-in because loading the graphs is slow: without the flag, `analyze` prints `Skipped N taintwire rule(s)`. A `taintFrom` must name an earlier step and `maxHops` can be `0`; a step whose `requires` names no earlier step gives no findings. Chunks over 8 MB are skipped with a warning, like `map --map-taintwire` files. When a taintwire rule fails, the other rules' findings are still written and the command exits with `41` (`run` still writes the report). js-recon-rules 2.0.0 ships 31 of them. (`analyze`, `run`)
- New Next.js lazyload method `next_interceptRouteNextUrl` covers intercepting routes defined under a path that middleware guards, such as `app/admin/@modal/(..)pub/[id]`. Next.js serves such a route through its public source route when the request sends a `Next-Url` header naming the guarded path, and the middleware matcher only sees the public URL. The method reads the intercepting-route rules from `_buildManifest.js` (`__rewrites.beforeFiles`, the `next-url` condition). When the crawl hasn't found that file, it builds the URL from the buildId in the landing page. Each rule's parent path and every crawled, `strings`-extracted or `--wordlist` path gets a plain request. A path that redirects then gets the same path and its `/_next/data/<buildId>/<path>.json` route with `x-nextjs-data: 1`. The path counts as middleware-guarded if a response carries a header only middleware sets (any `x-middleware-*`, `x-nextjs-redirect` or `x-nextjs-rewrite`). For each rule whose condition matches a guarded path, the public route is requested with `Next-Url: <parent>`, and chunk paths that are missing from the plain response are downloaded. Without a manifest, the method tries every pair of guarded path and public page, up to 200 pairs. Manifest strings that Next.js hoisted into the manifest function's parameters are resolved, only `header` conditions count, and a manifest that doesn't parse falls back to the pairs mode. Each matching guarded path is also tried as `Next-Url`, next to the rule's parent path. Data routes keep the `basePath`, new chunks resolve against the asset prefix or `basePath` of the known chunk URLs, and the crawl target is always a candidate. The rule's `next-url` regex comes from the target, so each match runs with a 100 ms time limit. It runs after `next_routerStateForge` on every Next.js lazyload pass, and `--include-methods`/`--exclude-methods` control it. (`lazyload`, `run`)

### Changed

- taintwire is updated to 0.2.0-alpha.2. (`analyze`, `map`, `run`, `taintwire`)
- `--wordlist` entries now also feed `next_interceptRouteNextUrl`, as well as `next_routerStateForge`. (`lazyload`, `run`)

### Fixed

- `mcp --server` no longer prints the banner. The banner is an image written to stdout, which is the server's JSON-RPC channel, so MCP clients got a corrupted stream. (`mcp`)

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
