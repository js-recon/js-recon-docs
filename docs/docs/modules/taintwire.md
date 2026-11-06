---
sidebar_position: 20
---

# taintwire command

The `taintwire` command builds a **PookieGraph** (a `.pg` file) from a directory of JavaScript files and runs **pgq** query files against it. A PookieGraph holds the [taintwire](https://taintwire.js-recon.io) graph of every file: the syntax tree, scopes, value flow, and, for webpack and Turbopack builds, the links between chunks through the bundler's module registry. A `.pgq` file is a TypeScript module of Cypher selectors and rules; the [pgq reference](https://taintwire.js-recon.io/next/api/pgq) describes the format. The [taintwire-queries](https://github.com/js-recon/taintwire-queries) repository is the public query pack.

Build the graph once and query it as often as you like. That differs from `analyze --analyze-taintwire`, which rebuilds small per-chunk graphs on every run and doesn't link chunks.

It has three subcommands:

| Subcommand | Purpose |
| --- | --- |
| `taintwire build` | Load every JS file of a directory into one linked PookieGraph |
| `taintwire analyze` | Run `.pgq` rules against a PookieGraph and write the findings as JSON |
| `taintwire validate` | Check `.pgq` files without a graph |

Loading `.pgq` files needs Node.js 22.15 or newer.

## taintwire build

```bash
js-recon taintwire build -d <directory> [-o graph.pg]
```

| Option                | Alias | Description                                                    | Default    | Required |
| --------------------- | ----- | -------------------------------------------------------------- | ---------- | -------- |
| `--directory <dir>`   | `-d`  | Directory of JS files, for example lazyload's `output/<host>`. |            | Yes      |
| `--output <file>`     | `-o`  | PookieGraph file to write.                                     | `graph.pg` | No       |

The command loads every `.js` and `.mjs` file under the directory, recursively, and skips `___subsequent_requests` and any file over 8 MB. The files are loaded in one batch, so a value read through the module registry flows into the chunk that defines it. The graph is written straight to disk, because a whole app held in memory takes about 10 KB of RAM per byte of minified source.

- Exits with code 37 if the directory doesn't exist or has no JS files.
- Exits with code 38 if the output file already exists.

## taintwire analyze

```bash
js-recon taintwire analyze -g <file.pg> -q <file/dir> [-o taintwire.json]
```

| Option                 | Alias | Description                                                 | Default          | Required |
| ---------------------- | ----- | ----------------------------------------------------------- | ---------------- | -------- |
| `--graph <file>`       | `-g`  | PookieGraph file built by `taintwire build`.                |                  | Yes      |
| `--queries <file/dir>` | `-q`  | A `.pgq` file, or a directory searched recursively for them. |                  | Yes      |
| `--output <file>`      | `-o`  | Findings JSON file.                                         | `taintwire.json` | No       |

The command evaluates the `.pgq` files in a sandbox (see below), validates them, and checks that every query compiles. It then opens the PookieGraph read-only and runs the rules. Each finding is printed with its location, the source it came from and the hop count, as with the taintwire engine. The JSON output has the same shape as `analyze.json`, with `ruleType` set to `pgq`.

- Exits with code 39 if the PookieGraph doesn't exist.
- Exits with code 40 if a `.pgq` file is invalid or a query doesn't compile.

## taintwire validate

```bash
js-recon taintwire validate -q <file/dir>
```

| Option                 | Alias | Description                                                 | Default | Required |
| ---------------------- | ----- | ----------------------------------------------------------- | ------- | -------- |
| `--queries <file/dir>` | `-q`  | A `.pgq` file, or a directory searched recursively for them. |         | Yes      |

The command runs the same checks as `analyze`, against an empty graph. It prints every problem, prefixed with the file it's in, and exits with code 40 if there are any.

## The pgq sandbox

A `.pgq` file is code. `js-recon` evaluates it in a separate Node.js process under the permission model:

- The process can read only the query pack, which is the nearest folder above the files that has a `package.json`.
- It can't write files, start processes or load native addons.
- A `.pgq` file can import only other `.pgq` files from the same pack. Import taintwire's types with `import type`.
- `fetch` and the other network globals are removed.

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
