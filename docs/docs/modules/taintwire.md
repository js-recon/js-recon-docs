---
sidebar_position: 20
---

# taintwire command

The `taintwire` command builds a **PookieGraph** (a `.pg` file) from a directory of JavaScript files and runs **pgq** query files against it. A PookieGraph holds the [taintwire](https://taintwire.js-recon.io) graph of every file: the syntax tree, scopes, value flow, and, for webpack and Turbopack builds, the links between chunks through the bundler's module registry. A `.pgq` file is a TypeScript module of Cypher selectors and rules; the [pgq reference](https://taintwire.js-recon.io/next/api/pgq) describes the format. The [taintwire-queries](https://github.com/js-recon/taintwire-queries) repository is the public query pack. Its queries are written with **pga** (PookieGraph aliases), short names such as `${pga.methodCall()}` for the Cypher fragments queries repeat, and share their sinks through sink sets such as `htmlSinks`. The [pga reference](https://taintwire.js-recon.io/next/api/pga) lists every alias, what it expands to, and each sink set.

Build the graph once and query it as often as you like. That differs from `analyze --analyze-taintwire`, which rebuilds small per-chunk graphs on every run and doesn't link chunks.

It has three subcommands:

| Command              | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `taintwire build`    | Load every JS file of a directory into one linked PookieGraph |
| `taintwire analyze`  | Run `.pgq` rules against a PookieGraph and write the findings |
| `taintwire validate` | Check `.pgq` files without a graph                            |

Loading `.pgq` files needs Node.js 22.15 or newer.

## taintwire build

```bash
js-recon taintwire build -d <directory> [-o graph.pg]
```

| Option               | Alias | Description                                                                               | Default                                     | Required |
| -------------------- | ----- | ----------------------------------------------------------------------------------------- | ------------------------------------------- | -------- |
| `--directory <dir>`  | `-d`  | Directory of JS files, for example lazyload's `output/<host>`.                            |                                             | Yes      |
| `--output <file>`    | `-o`  | PookieGraph file to write: `.pg` for one graph, `.tw` for one graph per unit (see below). | `graph.pg`                                  | No       |
| `--buffer-pool <MB>` |       | Most memory taintwire's database (Ladybug) may use per graph, in MB.                      | Half of the container's or machine's memory | No       |
| `--threads <n>`      |       | Query threads per graph.                                                                  | `2`                                         | No       |

The command loads every `.js` and `.mjs` file under the directory, recursively, and skips `___subsequent_requests` and any file over 8 MB. The files are loaded in one batch, so a value read through the module registry flows into the chunk that defines it. The graph is written straight to disk, because a whole app held in memory takes about 10 KB of RAM per byte of minified source.

- Exits with code 37 if the directory doesn't exist or has no JS files.
- Exits with code 38 if the output file already exists.

### One graph per unit (`.tw`)

With `-o graph.tw`, the command splits the files into units instead: each file plus the files that define the modules it loads, transitively. It writes each unit as its own PookieGraph and packs them, with a `manifest.json`, into one `.tw` file (a tar archive). `taintwire analyze` runs the rules on each unit's graph in turn and reports a finding once, even if several units contain it.

A `.tw` only saves memory when every unit is much smaller than the whole app. In most framework builds it isn't: a few framework and vendor chunks hold most of the code, and every unit loads them again. On Next.js and Angular builds, a `.tw` found the same results as a `.pg`, but it was 2 to 6 times larger and slower to build and analyze, and used more memory. Use a `.pg` unless the build is made of many large, independent chunks. A value that passes from one file through a shared module to another file is found only in a `.pg`.

### Memory and CPU

The database's memory (`--buffer-pool`) defaults to half of what the process may use: the container's memory limit inside Docker or Kubernetes, otherwise the machine's RAM. The rest is left for Node.js. The memory is allocated as it is used, so a smaller value doesn't make a graph that fits use less. When a graph needs more than the limit, loading or a query fails with `Buffer manager exception: ... The buffer pool is full`, and you can pass a larger value. Queries run on 2 threads (`--threads`), which was the fastest setting in tests on a 3-CPU container.

## taintwire analyze

```bash
js-recon taintwire analyze -g <file.pg|file.tw> [-q <file/dir>] [--output-json taintwire.json] [--output-sarif <file>]
```

| Option                          | Alias | Description                                                                                                                           | Default                                     | Required |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------- |
| `--graph <file>`                | `-g`  | PookieGraph file (`.pg`) or units file (`.tw`) built by `taintwire build`.                                                            |                                             | Yes      |
| `--queries <file/dir>`          | `-q`  | A `.pgq` file, or a directory searched recursively for them.                                                                          | `~/.js-recon/taintwire-queries/rules`       | No       |
| `--output-json <file>`          |       | Findings file, in the `analyze.json` format.                                                                                          | `taintwire.json`                            | No       |
| `--output-sarif <file>`         |       | Also write the findings to this file, in SARIF 2.1.0 format.                                                                          |                                             | No       |
| `--disable-rules-version-check` |       | Use the cached taintwire-queries pack without checking GitHub for a newer release.                                                    | `false`                                     | No       |
| `--suppress-confined`           |       | Leave out findings whose value lands in a position that is safe for their rule (see [Where the value lands](#where-the-value-lands)). | `false`                                     | No       |
| `--buffer-pool <MB>`            |       | As for `build`.                                                                                                                       | Half of the container's or machine's memory | No       |
| `--threads <n>`                 |       | As for `build`.                                                                                                                       | `2`                                         | No       |

Without `-q`, the command uses the [taintwire-queries](https://github.com/js-recon/taintwire-queries) pack. It downloads the pack's latest release to `~/.js-recon/taintwire-queries` the first time it runs. On later runs, it downloads the pack again when the `version.txt` there doesn't match the latest release, the same way `analyze` keeps `~/.js-recon/rules` up to date. `--disable-rules-version-check`, or the `JS_RECON_DISABLE_RULES_VERSION_CHECK=true` environment variable, skips that check once the pack is cached. The `-w-rules` Docker images ship the pack and set that variable, so they run without downloading it.

The command evaluates the `.pgq` files in a sandbox (see below), validates them, and checks that every query compiles. It then opens the PookieGraph read-only and runs the rules. Each finding is printed with its location, the source it came from and the hop count, as with the taintwire engine. When a rule's sink lists interceptors (see [Conditions before the sink](#conditions-before-the-sink)), the conditions found are printed below it, and the same goes for confinements (see [Where the value lands](#where-the-value-lands)).

The findings are always written to `--output-json` (`taintwire.json`), in the same format as `analyze.json`. With `--output-sarif <file>`, they are also written to that file as a [SARIF 2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) log, which GitHub code scanning, the VS Code SARIF Viewer and other SARIF tools can read.

In the SARIF file:

- `runs[0].tool.driver.rules` lists every rule that ran, with its `id`, `name`, description and severity.
- Each entry of `runs[0].results` is one finding. `ruleId` names the rule and `message.text` is the rule's message.
- `level` comes from the rule's severity: `critical` and `high` become `error`, `medium` becomes `warning`, and `low` and `info` become `note`. `properties.severity` keeps the original value.
- `locations[0]` is the sink. Its `region.snippet.text` holds up to 300 characters of the sink's code.
- When a rule follows a flow, `relatedLocations[0]` is the source and `codeFlows` lists the source and then the sink. `properties.hops` is the length of the flow.
- Each interceptor is one more related location (`id` 2 and up), with a message such as `if, must be true` or `check: contains "http:"`. A guard is also a step of the code flow between source and sink, with `kinds: ["branch"]`. `properties.interceptors` lists them all with `kind`, `text`, `file`, `line`, `column` and `code`.
- Each confinement is a related location after the interceptors, with a message such as `confined: path, after "/login?next="`. `properties.confinements` lists them with the same fields. Confinements are not steps of the code flow.
- `startLine` and `startColumn` start at 1. The console output counts columns from 0, so it shows each column as one less than the SARIF file.

```json
{
    "ruleId": "dom_xss_url",
    "level": "error",
    "message": { "text": "URL-derived value reaches an HTML sink" },
    "locations": [
        {
            "physicalLocation": {
                "artifactLocation": { "uri": "a.js" },
                "region": {
                    "startLine": 1,
                    "startColumn": 52,
                    "snippet": { "text": "h" }
                }
            }
        }
    ],
    "relatedLocations": [
        {
            "id": 1,
            "message": { "text": "source" },
            "physicalLocation": {
                "artifactLocation": { "uri": "a.js" },
                "region": { "startLine": 1, "startColumn": 11 }
            }
        }
    ],
    "codeFlows": ["..."],
    "properties": { "severity": "high", "hops": 2 }
}
```

### Conditions before the sink

A sink selector can list `interceptors`: queries that report what stands between the source and the sink. The taintwire-queries pack gives every rule its guard queries. They find each condition the tainted value must pass for the sink to run: an enclosing `if` or ternary, the left side of `&&`/`||`, or an earlier `if (...) return;`. They also find the checks inside those conditions that they recognize, such as `indexOf`, `includes`, `startsWith`, `endsWith`, a regex test, a comparison with a literal, `typeof` and `length`. A condition counts only when it reads the tainted value, and it must be in the same function as the sink.

```text
[+] "postMessage data reaches an HTML, JS execution or navigation sink" found in chunk inline-0.js
inline-0.js:5:48 <- inline-0.js:3:38 (2 hops)
url
[i] Conditions before the sink:
    inline-0.js:4:32 if, must be true: url.indexOf('http:') > -1 || url.indexOf('https:') > -1
      inline-0.js:4:32 contains "http:": url.indexOf('http:') > -1
      inline-0.js:4:61 contains "https:": url.indexOf('https:') > -1
```

A guard line gives the condition and whether it must be true or false. The lines under it describe the checks inside it, each as written: a `!` around a check, or the guard's polarity, still applies. In `taintwire.json`, each finding has them in `interceptors`, as `kind`, `text`, `location` and `code`.

### Where the value lands

A sink selector can also list `confinements`: queries that report how the value ends up in the sink, as the fixed structure around the tainted part. The taintwire-queries pack gives them to the URL, request, jQuery selector and postMessage rules. They look at the last string join (`+`, a template literal or `.concat()`) on the way to the sink, even when it is several calls before the sink, and report:

| Kind       | When                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`     | The string starts with `/` and a fixed character other than `/` or `\`, so it stays a path on the same origin.                                          |
| `query`    | A fixed `?` comes before the value, and nothing before it is tainted.                                                                                   |
| `fragment` | The same with `#`.                                                                                                                                      |
| `origin`   | A fixed scheme and host come first, closed by `/`, `?` or `#`: `"https://example.com/"`, `location.origin + "/"`.                                       |
| `selector` | A `$()`/`jQuery()` string whose first non-space character is fixed and not `<`, or `location.hash` itself. jQuery 1.9 and later don't parse it as HTML. |
| `sink`     | The sink confines it: `history.pushState`/`replaceState` (same-origin URLs only), or `postMessage` with a fixed target origin.                          |

```text
[i] Where the value lands in the sink:
    a.js:7:3 path, after "/login?next=": "/login?next=".concat(q)
    a.js:7:3 query, after "/login?next=": "/login?next=".concat(q)
```

In `taintwire.json`, each finding has them in `confinements`, with the same fields as `interceptors`.

By default confinements are only reported. With `--suppress-confined`, a finding is left out when one of its confinements makes it safe for its rule:

- `open_redirect_url`, `link_manipulation_url`: `path`, `query`, `fragment` or `origin`
- `cspt_url_request`, `cspt_extended_request`: `query` or `fragment` only. After a fixed path or host the value can still hold `../`.
- `jquery_selector_url`, `dom_xss_framework_sinks`: `selector`
- `dom_data_manipulation`, `web_message_manipulation`: `sink`

Other rules are never left out. The count of findings left out is printed at the end.

- Exits with code 39 if the PookieGraph doesn't exist, or if a `.tw` file's `manifest.json` is missing, malformed or lists no graphs.
- Exits with code 40 if a `.pgq` file is invalid or a query doesn't compile.
- Exits with code 41 if a rule fails while running. The other rules' findings are still written.

## taintwire validate

```bash
js-recon taintwire validate -q <file/dir>
```

| Option                 | Alias | Description                                                  | Default | Required |
| ---------------------- | ----- | ------------------------------------------------------------ | ------- | -------- |
| `--queries <file/dir>` | `-q`  | A `.pgq` file, or a directory searched recursively for them. |         | Yes      |

The command runs the same checks as `analyze`, against an empty graph. It prints every problem, prefixed with the file it's in, and exits with code 40 if there are any.

## The pgq sandbox

A `.pgq` file is code. `js-recon` evaluates it in a separate Node.js process under the permission model:

- The process can read only the query pack, which is the nearest folder above the files that has a `package.json`.
- It can't write files, start processes or load native modules.
- A `.pgq` file can import only other `.pgq` files from the same pack. Import taintwire's types with `import type`.
- `fetch`, `WebSocket` and the other network functions are removed.

## Examples

### From lazyload output to findings

```bash
js-recon lazyload -u https://example.com
js-recon taintwire build -d output/example.com -o example.pg
js-recon taintwire analyze -g example.pg
```

### Check your own queries

```bash
js-recon taintwire validate -q my-queries/
```

To write your queries with the pga aliases and sink sets, copy `lib/pga.pgq` and `lib/sinks.pgq` from taintwire-queries into your pack (a `.pgq` file can only import files from its own pack), or add your rules to a clone of taintwire-queries. See the [pga reference](https://taintwire.js-recon.io/next/api/pga).
