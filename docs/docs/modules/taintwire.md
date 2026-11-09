---
sidebar_position: 20
---

# taintwire command

The `taintwire` command builds a **PookieGraph** (a `.pg` file) from a directory of JavaScript files and runs **pgq** query files against it. A PookieGraph holds the [taintwire](https://taintwire.js-recon.io) graph of every file: the syntax tree, scopes, value flow, and, for webpack and Turbopack builds, the links between chunks through the bundler's module registry. A `.pgq` file is a TypeScript module of Cypher selectors and rules; the [pgq reference](https://taintwire.js-recon.io/next/api/pgq) describes the format. The [taintwire-queries](https://github.com/js-recon/taintwire-queries) repository is the public query pack. Its queries are written with **pga** (PookieGraph aliases), short names such as `${pga.methodCall()}` for the Cypher fragments queries repeat, and share their sinks through sink sets such as `htmlSinks`. The [pga reference](https://taintwire.js-recon.io/next/api/pga) lists every alias, what it expands to, and each sink set.

Build the graph once and query it as often as you like. That differs from `analyze --analyze-taintwire`, which rebuilds small per-chunk graphs on every run and doesn't link chunks.

It has three subcommands:

| Command              | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `taintwire build`    | Load every JS file of a directory into one linked PookieGraph         |
| `taintwire analyze`  | Run `.pgq` rules against a PookieGraph and write the findings as JSON |
| `taintwire validate` | Check `.pgq` files without a graph                                    |

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
js-recon taintwire analyze -g <file.pg|file.tw> -q <file/dir> [-o taintwire.json]
```

| Option                 | Alias | Description                                                                | Default                                     | Required |
| ---------------------- | ----- | -------------------------------------------------------------------------- | ------------------------------------------- | -------- |
| `--graph <file>`       | `-g`  | PookieGraph file (`.pg`) or units file (`.tw`) built by `taintwire build`. |                                             | Yes      |
| `--queries <file/dir>` | `-q`  | A `.pgq` file, or a directory searched recursively for them.               |                                             | Yes      |
| `--output <file>`      | `-o`  | Findings JSON file.                                                        | `taintwire.json`                            | No       |
| `--buffer-pool <MB>`   |       | As for `build`.                                                            | Half of the container's or machine's memory | No       |
| `--threads <n>`        |       | As for `build`.                                                            | `2`                                         | No       |

The command evaluates the `.pgq` files in a sandbox (see below), validates them, and checks that every query compiles. It then opens the PookieGraph read-only and runs the rules. Each finding is printed with its location, the source it came from and the hop count, as with the taintwire engine. The JSON output has the same shape as `analyze.json`, with `ruleType` set to `pgq`.

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
git clone https://github.com/js-recon/taintwire-queries
js-recon taintwire analyze -g example.pg -q taintwire-queries/rules
```

### Check your own queries

```bash
js-recon taintwire validate -q my-queries/
```

To write your queries with the pga aliases and sink sets, copy `lib/pga.pgq` and `lib/sinks.pgq` from taintwire-queries into your pack (a `.pgq` file can only import files from its own pack), or add your rules to a clone of taintwire-queries. See the [pga reference](https://taintwire.js-recon.io/next/api/pga).
