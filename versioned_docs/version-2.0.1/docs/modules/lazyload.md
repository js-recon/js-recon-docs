---
sidebar_position: 2
---

# Lazyload command

The `lazyload` command is used to download JavaScript files from a given URL or a list of URLs. It simulates various techniques to discover and fetch JS files that are loaded dynamically.

## Usage

```bash
js-recon lazyload -u <url/file> [options]
```

## Options

| Option                                | Alias | Description                                                                                                                                                                                                                                                                                                          | Default               | Required |
| ------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------- |
| `--url <url/list/file>`               | `-u`  | Target URL, comma-separated URLs, or target file; may be repeated. See [Run's `-u` examples](./run.md#required-arguments).                                                                                                                                                                                           |                       | Yes      |
| `--output <directory>`                | `-o`  | Output directory to save the downloaded JS files.                                                                                                                                                                                                                                                                    | `output`              | No       |
| `--strict-scope`                      |       | Download JS files from only the input URL domain.                                                                                                                                                                                                                                                                    | `false`               | No       |
| `--scope <scope>`                     | `-s`  | Download JS files from specific domains (comma-separated). Use `*` for all domains.                                                                                                                                                                                                                                  | `*`                   | No       |
| `--threads <threads>`                 | `-t`  | Number of threads to use for downloading.                                                                                                                                                                                                                                                                            | `1`                   | No       |
| `--subsequent-requests`               |       | Download JS files from subsequent requests (Next.js only).                                                                                                                                                                                                                                                           | `false`               | No       |
| `--urls-file <file>`                  |       | Input JSON file containing URLs (for `--subsequent-requests`)                                                                                                                                                                                                                                                        | `extracted_urls.json` | No       |
| `--proxy-config <file>`               |       | Proxy config file, generated via `js-recon proxy <method> -i`. See [Proxy](./proxy.md).                                                                                                                                                                                                                              | `.proxy_config.json`  | No       |
| `--ignore-proxy-env`                  |       | Skip `JS_RECON_*` proxy environment variables during resolution. See [Proxy](./proxy.md).                                                                                                                                                                                                                            | `false`               | No       |
| `--oxylabs-waf-fallback`              |       | Retry strongly identified CDN/WAF blocks through configured Oxylabs; direct requests remain the default. Opt-in — see [Configuration](../configuration.md#oxylabs-cdnwaf-fallback).                                                                                                                                  | `false`               | No       |
| `--oxylabs-fallback-max-requests <n>` |       | Maximum paid Oxylabs fallback requests per origin.                                                                                                                                                                                                                                                                   | `10`                  | No       |
| `--oxylabs-fallback-max-total <n>`    |       | Maximum paid Oxylabs fallback requests per run.                                                                                                                                                                                                                                                                      | `100`                 | No       |
| `--oxylabs-fallback-max-origins <n>`  |       | Maximum distinct fallback origins per run.                                                                                                                                                                                                                                                                           | `25`                  | No       |
| `--cache-file <file>`                 |       | File to contain response cache.                                                                                                                                                                                                                                                                                      | `.resp_cache.db`      | No       |
| `--disable-cache`                     |       | Disable response caching.                                                                                                                                                                                                                                                                                            | `false`               | No       |
| `--cache-only`                        |       | Only use the response cache; never make network requests. See [Load command](./load.md).                                                                                                                                                                                                                             | `false`               | No       |
| `--yes`                               | `-y`  | Auto-approve executing JS code from the target.                                                                                                                                                                                                                                                                      | `false`               | No       |
| `--header <name: value>`              | `-H`  | Custom header to send with every request, as `Name: Value` (for example `Authorization: Bearer <token>`). Repeatable. Applies to the Puppeteer-driven page load and every direct/SOCKS/HTTP/Oxylabs/AWS request. See [Authenticated crawling](#authenticated-crawling).                                              | (none)                | No       |
| `--timeout`                           |       | Request timeout in ms                                                                                                                                                                                                                                                                                                | `30000`               | No       |
| `--insecure`                          | `-k`  | Disable SSL certificate verification.                                                                                                                                                                                                                                                                                | `false`               | No       |
| `--no-sandbox`                        |       | Disable browser sandbox.                                                                                                                                                                                                                                                                                             | `false`               | No       |
| `--build-id`                          |       | Get the buildId from the Next.js app.                                                                                                                                                                                                                                                                                | `false`               | No       |
| `--sourcemap-dir <directory>`         |       | Directory to write reconstructed source maps.                                                                                                                                                                                                                                                                        | `extracted`           | No       |
| `--research`                          |       | Enable research mode: records a technique-name → discovered-URL-list mapping. Supported for every detected framework (Next.js, Vue, Nuxt, Svelte, Angular, React), not just Next.js.                                                                                                                                 | `false`               | No       |
| `--research-output <file>`            |       | Output file for research mode.                                                                                                                                                                                                                                                                                       | `research.json`       | No       |
| `--max-iterations <iterations>`       |       | Maximum number of recursive crawl iterations.                                                                                                                                                                                                                                                                        | `10`                  | No       |
| `--max-js-size <mb>`                  |       | Maximum JS file size in MB to parse (Vue only).                                                                                                                                                                                                                                                                      | `2`                   | No       |
| `--lazyload-timeout <minutes>`        |       | Hard timeout for the lazyload module. The module stops and the pipeline continues after this many minutes. Use `0` to disable.                                                                                                                                                                                       | `30`                  | No       |
| `--detection-timeout <seconds>`       |       | Timeout for front-end framework detection. If it fires, detection falls back to the same "framework not detected" path used for a genuine no-match. Use `0` to disable.                                                                                                                                              | `30`                  | No       |
| `--max-pages <pages>`                 |       | Maximum number of HTML pages the Next.js crawler (or the generic tech recursive page crawl) will visit across all recursive passes. `0` disables the limit. Prevents memory exhaustion on event-heavy sites with large link graphs.                                                                                  | `200`                 | No       |
| `--rsc-param-bruteforce-limit <n>`    |       | Maximum harvested dynamic-route param-name candidates the `next_routerStateForge` method tries per URL, as a fallback once its fixed guess list fails. `0` disables the fallback.                                                                                                                                    | `20`                  | No       |
| `--wordlist <file>`                   |       | Newline-separated file of path segments/prefixes (for example `admin`). Each entry is resolved to `<origin>/<entry>` and added, in addition to crawl-discovered pages and `strings`-extracted paths, to the candidate URLs `next_routerStateForge` retries. No default — omitting the flag adds no extra candidates. |                       | No       |
| `--max-redirects <n>`                 |       | Maximum redirects to follow when resolving the default crawl scope for generic tech (see [Generic extraction](#generic-extraction-no-framework-detected)).                                                                                                                                                           | `20`                  | No       |
| `--strings`                           |       | Enable strings-based recursive JS discovery for generic tech — chains the `strings` module into the crawl to find JS referenced only as a string literal inside an already-downloaded file. See [Generic extraction](#generic-extraction-no-framework-detected).                                                     | `false`               | No       |
| `--strings-max-iterations <n>`        |       | Maximum recursive strings-discovery passes for generic tech. `0` runs until a pass finds nothing new, with no cap.                                                                                                                                                                                                   | `5`                   | No       |
| `--stagnation-timein <mins>`          |       | Minutes to wait before generic-tech content stagnation detection begins monitoring. `0` disables the feature. Must not exceed `--lazyload-timeout` (exit code 30 otherwise). See [Generic extraction](#generic-extraction-no-framework-detected).                                                                    | `30`                  | No       |
| `--stagnation-percentage <percent>`   |       | Percentage of all discovered generic-tech JS files (by content hash) that must share one hash to be flagged as stagnation.                                                                                                                                                                                           | `80`                  | No       |
| `--stagnation-monitor <mins>`         |       | Re-check interval for generic-tech stagnation detection once armed; also the debounce window used to confirm stagnation before stopping.                                                                                                                                                                             | `1`                   | No       |
| `--include-methods <methods>`         |       | Comma-separated list of method names to run (whitelist). Only these methods will execute; all others are skipped. Use `--list-methods` to see valid names. See [Lazyload Methods](./lazyload/lazyload-methods.md).                                                                                                   |                       | No       |
| `--exclude-methods <methods>`         |       | Comma-separated list of method names to skip (blacklist). All methods except these will run. Use `--list-methods` to see valid names. See [Lazyload Methods](./lazyload/lazyload-methods.md).                                                                                                                        |                       | No       |
| `--list-methods [framework]`          |       | Print all available method names grouped by framework and exit. Optionally provide a framework name (`next_js`, `vue`, `nuxt_js`, `svelte`, `angular`, `react`) to filter the output.                                                                                                                                |                       | No       |
| `--verbose`                           |       | Show detailed file write error messages (for example, when a downloaded JS chunk fails to write to disk). Suppressed by default to reduce terminal noise.                                                                                                                                                            | `false`               | No       |

## How it works

### Framework detection

Before downloading any files, the tool auto-detects which JavaScript framework the target uses. Detection runs in this priority order and stops on the first match:

1. **Next.js** — any HTML element with a `src`, `srcset`, or `imageSrcSet` attribute containing `/_next/`
2. **Vue.js** — any element with a `data-v-*` or `data-vue-*` attribute; or `__vue` found inside fetched script content
3. **Nuxt.js** — sub-check after Vue detection: any `src`/`href` attribute containing `/_nuxt`
4. **Svelte** — SvelteKit-specific attribute markers or `__svelte_*` in bundled code
5. **Angular** — `ng-*` attributes or Angular-specific markers in bundled code
6. **React** — markers such as `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`, `__REACT_DEVTOOLS_GLOBAL_HOOK__`, `react-jsx-runtime.production`, or `react-dom.production` in inline scripts or fetched assets

Detection uses two sources: the raw HTTP response (fast) and a Puppeteer-rendered page (catches client-side-only markers, after a 2-second settle delay). In `--cache-only` mode, the browser step is skipped.

### Next.js discovery pipeline

Next.js receives the most comprehensive discovery. The crawler runs in two phases.

**Initial phase** (run once):

- Parse `<script src>` tags and inline `static/chunks/...` references on the landing page
- Extract `<a href>` links on the landing page for page-URL seeding
- Execute the webpack runtime's chunk-loading function in a sandbox to enumerate all chunk IDs (requires `--yes` to auto-confirm, or manual confirmation per run)
- Parse `_buildManifest.js` AST for `static/chunks/` string references
- Optionally, if `--subsequent-requests` is set: make RSC (`RSC: 1` header) and plain HTML requests to all discovered paths to find dynamically loaded chunks

**Recursive phase** (repeated until convergence or `--max-iterations`):

- Detect `Promise.all([...].map(...))` patterns in newly downloaded chunks to extract additional chunk IDs
- Parse `layout-*.js` files for `href` object properties; visit discovered routes and extract their script tags
- Re-run `<script src>` and `<a href>` extraction on each newly discovered page URL
- Stop when a full pass yields zero new URLs (convergence), the iteration cap is reached, or the page visit cap (`--max-pages`) is reached

> **Page visit cap:** The crawler counts every HTML page it visits across all recursive passes and stops adding more pages to the queue once the cap is hit. This prevents memory exhaustion on event-heavy or listing sites where every page links to dozens more — without a cap, the queue can fan out to hundreds of pages and exhaust the container's available RAM. The default cap is 200 pages, which is sufficient for virtually all real Next.js apps. Set `--max-pages 0` to disable the cap entirely.

After all passes, `.map` is appended to every discovered `.js` URL and checked for a 200 response to find source maps.

> **Content-entropy deduplication:** When the crawler encounters a page URL whose pathname has already been visited, it fetches the new URL and compares its `<script src>` tags against every script set already recorded for that pathname. If the scripts are identical, the variant is skipped — it loads the same JS and would contribute nothing new. If the scripts differ (for example, a dynamically routed page that loads a unique chunk), the variant is visited and its script fingerprint is added. This lets the crawler correctly skip variants that differ only in a filter or selector parameter (for example, `/search?sort=asc` vs `/search?sort=desc`) while still visiting genuinely distinct parameterized routes (for example, different product or user pages that load unique chunks). The same fingerprint logic is applied in the script-tag subsequent-requests pass.

### SvelteKit discovery pipeline

SvelteKit's chunk discovery depends on the build adapter.

**`adapter-node` (SSR server):** The HTML response does not include `<link rel="modulepreload">` tags. Instead, the SvelteKit boot script is an inline `<script>` block with no `src` attribute:

```html
<script>
    Promise.all([
      import("./_app/immutable/entry/start.js"),
      import("./_app/immutable/entry/app.js")
    ]).then(...)
</script>
```

`svelte_getFromPageSource` extracts these two entry URLs via an `import("...")` regex. The full chunk graph is then discovered by following ESM `import` statements and string-scanning downloaded chunks.

**`adapter-static` SSG and SPA:** The shell HTML (`404.html` for SSG, `index.html` for SPA) contains both `<link rel="modulepreload">` tags for all initial chunks and the same inline boot script. The modulepreload links provide a larger seed set (typically 17+ JS URLs) compared to the two entry points in the adapter-node case.

**`version.json` probe:** After page-source extraction, the tool probes `/<appDir>/version.json` (typically `/_app/version.json`). SvelteKit generates this file at build time for the `updated` store — it is never linked from any HTML tag or JS `import()` call, so all other discovery steps miss it. The `appDir` is inferred from the entry-point URLs already found (default: `_app`). This step can be skipped with `--exclude-methods svelte_getVersionJson`.

**Detection signal:** All three adapters are detected via the `_app/immutable/` path prefix on JS or CSS links in the HTML response.

### `--yes` flag and JS execution

The webpack chunk-enumeration technique extracts a function from the webpack runtime and executes it locally in a Node.js sandbox with each discovered integer chunk ID as input. Before executing, the tool prompts you to inspect the extracted function and confirm. Pass `--yes` to skip the prompt — useful in automated pipelines, but verify you trust the target's JS first.

### Scope

| Flag                  | Behaviour                                          |
| --------------------- | -------------------------------------------------- |
| _(default)_ `*`       | Download JS from any domain                        |
| `--scope a.com,b.com` | Only download from `a.com` and `b.com`             |
| `--strict-scope`      | Only download from the exact host in the input URL |

Scoping matters most when JS assets are served from a CDN subdomain. The `run` command auto-detects CDN hosts and adjusts the map directory accordingly, but `lazyload` alone requires explicit scope configuration.

### Generic extraction (no framework detected)

When none of the supported frameworks (Next.js, Vue, Nuxt, Svelte, Angular, React) are detected, the
crawler falls back to a `generic` tech instead of stopping after a single Puppeteer pass. `generic`
recursively crawls the site's own `<a href>`/`<iframe src>` links, plus absolute URLs embedded in any
other attribute value (for example an `onclick`-driven `window.open(...)` popup), breadth-first and
capped by `--max-pages`, downloading JS incrementally as each page is visited.

- **Default scope:** unless `-s`/`--strict-scope` is set, the crawl's default scope is the host reached
  _after following redirects_ from `-u`, not the unrestricted `*` default used elsewhere. `--max-redirects`
  (default `20`) bounds how many redirects are followed while resolving that scope.
- **Script/module discovery:** on every page, `generic` extracts `<script src>`, inline scripts, and
  `<link rel="modulepreload">` the same way the framework-specific crawlers do — decoding `data:` URI
  script sources and skipping `<script type="...">` values that indicate non-JS content (for example
  `application/ld+json`, `speculationrules`).
- **Attribute-embedded JS:** every HTML attribute value is also walked and resolved with the `URL`
  constructor. Any URL whose path segment ends in `.js` (including cachebuster-suffixed paths like
  `.../beacon.min.js/v124/token` that don't literally end in `.js`) is confirmed as real JavaScript via
  its response `Content-Type` (accepting `text/javascript` per RFC 9239, plus the legacy
  `application/javascript`/`application/ecmascript` variants) rather than trusting the extension alone.
- **Runtime-injected requests:** `generic` is seeded with every request intercepted during the
  framework-detection step's own live Puppeteer render, catching JS requested only because a
  runtime-injected script asked for it (for example a bot-mitigation script self-injecting its own next
  stage via `element.innerHTML`).
- **String-referenced JS (`--strings`):** chains the `strings` module into the crawl to catch JS
  referenced only as a string literal inside an already-downloaded file (for example a plugin config's
  `"pdfWorker": "https://.../pdf.worker.js"`). Each extracted string is resolved against the URL of the
  file it was found in and the crawl recurses (`--strings-max-iterations`, default `5`, `0` = unlimited)
  until a pass finds nothing new.
- **Content stagnation:** effectively unbounded sites (blogs, news feeds) can keep serving
  byte-identical JS under a different, cache-busted URL on every page, which the existing URL-level
  dedup doesn't catch. `--stagnation-timein` (default `30` minutes, `0` disables) arms monitoring once
  one content hash accounts for `--stagnation-percentage`% (default `80`) of everything discovered so
  far; if a genuinely new content hash appears within the next `--stagnation-monitor` interval (default
  `1` minute), monitoring resets — only a persisting dominant hash with no new content stops the crawl
  early. `--stagnation-timein` must not exceed `--lazyload-timeout` (exit code 30 otherwise), since
  stagnation monitoring could otherwise never trigger before the whole crawl times out.
- `run` still only downloads JS for `generic` tech — the rest of the pipeline (map, analyze, etc.) is
  skipped for it, same as for any other unsupported tech.

### Inline sourcemap decoding

After the `.map`-brute-force pass, the crawler scans every downloaded chunk's
`//# sourceMappingURL=...` comment for an inline `data:` URI sourcemap (base64 or
percent-encoded) — for example Vite's `build.sourcemap: 'inline'` or webpack's
`devtool: 'inline-source-map'`/`eval-source-map`. Previously an inline reference was treated
as a fetchable URL and the sourcemap was silently lost; it's now decoded directly from the
comment, with no extra network request. This is handled for every supported framework:

- React, Vue, and Svelte already scanned for `sourceMappingURL` and gained a `data:` branch.
- Next.js and Angular gained scanning for it via a shared `discoverSourcemapUrls` helper —
  new methods `next_sourcemapUrls` / `angular_sourcemapUrls` (visible in `--list-methods`,
  toggleable via `--include-methods`/`--exclude-methods`).
- Nuxt gained it by extending its existing per-file string-analysis pass.

Angular and Nuxt also gained the `extractSourceMaps` post-processing step (writing discovered
source files under `sourcemaps/`) that they were previously missing entirely.

## Framework Support

Each framework is added to the tool after thorough research on the framework. New techniques are added when they are discovered. The following is an exhaustive list of frameworks that the `lazyload` module is compatible with:

- Next.js
- Vue
- Nuxt
- Angular
- React
- Svelte
- `generic` — fallback for sites running no supported framework. See [Generic extraction](#generic-extraction-no-framework-detected).

Please note that some frameworks are supported better than others. Currently, the frameworks with the most supported techniques are Next.js and Vue.

## Examples

### List available methods

Print all available discovery method names:

```bash
js-recon lazyload --list-methods
```

Filter by framework:

```bash
js-recon lazyload --list-methods next_js
```

### Run only specific methods (whitelist)

Run only the script-tag extraction method for a Next.js target:

```bash
js-recon lazyload -u https://example.com -y --include-methods next_GetJSScript
```

### Skip specific methods (blacklist)

Skip the brute-force fallback and webpack analysis for a faster run:

```bash
js-recon lazyload -u https://example.com -y --exclude-methods next_bruteForceJsFiles,next_GetLazyResourcesWebpackJs
```

### Basic usage

Download all JavaScript files from a single URL:

```bash
js-recon lazyload -u https://example.com
```

### Setting scope

Download JavaScript files only from `example.com` and `cdn.example.com`:

```bash
js-recon lazyload -u https://example.com -s "example.com,cdn.example.com"
```

Using the `--strict-scope` will only download JS files from the URL provided. This will skip any files from the external CDN.

### Using a proxy

Route requests through a proxy — AWS API Gateway (IP rotation), a generic SOCKS5/HTTP proxy, or
Oxylabs. First configure the method with the matching `proxy` command, for example
`js-recon proxy aws -i`, then point `lazyload` at the resulting config file:

```bash
js-recon proxy aws -i
js-recon lazyload -u https://example.com --proxy-config .proxy_config.json
```

Read the docs of [Proxy](./proxy.md) for more information.

### Authenticated crawling

Some targets require authentication before serving any content worth crawling. Pass `-H`/`--header`
once per header to send it with every request, including the initial Puppeteer-driven page load:

```bash
js-recon lazyload -u https://example.com -y -H "Authorization: Bearer <token>"
```

Can be combined with `--proxy-config` — the header is sent regardless of which request method
(direct, SOCKS, HTTP, Oxylabs, or AWS) ends up carrying the request.
