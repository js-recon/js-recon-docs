---
sidebar_position: 9
---

# Report command

The `report` command generates a report based on the results of the analyze module.

## Usage

```bash
js-recon report [options]
```

## Options

| Option                                        | Alias | Description                                                                                                    | Default       | Required |
| --------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------- | ------------- | -------- |
| `--sqlite-db <file>`                          | `-s`  | SQLite database file                                                                                           | `js-recon.db` | No       |
| `--mapped-json <file>`                        | `-m`  | Mapped JSON file                                                                                               |               | No       |
| `--analyze-json <file>`                       | `-a`  | Analyze JSON file                                                                                              |               | No       |
| `--endpoints-json <file>`                     | `-e`  | Endpoints JSON file                                                                                            |               | No       |
| `--map-openapi, --mapped-openapi-json <file>` |       | Mapped OpenAPI JSON file                                                                                       |               | No       |
| `--exploit-json <file>`                       |       | Exploit findings JSON file, in `EngineOutput` format (see [Exploit command — `--engine-output`](./exploit.md)) |               | No       |
| `--output <file>`                             | `-o`  | Output file name (without the extension)                                                                       | `report`      | No       |
| `--sj`                                        |       | Run `sj` (swagger-jacker) against the mapped OpenAPI spec (requires `sj` to be installed)                      | `false`       | No       |
| `--sj-bin <path>`                             |       | Path/name of the `sj` binary                                                                                   | `sj`          | No       |
| `--sj-args <args>`                            |       | Extra arguments passed through to `sj automate`                                                                |               | No       |
| `-h, --help`                                  |       | display help for command                                                                                       |               | No       |

## Example

### Generate report for mapped JSON file

```bash
js-recon report -m ./mapped.json
```

### Generate report for analyze JSON file

```bash
js-recon report -a ./analyze.json
```

### Generate report for every file

```bash
js-recon report -m mapped.json -a analyze.json -e endpoints.json --map-openapi mapped-openapi.json
```

### Include exploit findings

Feed the `EngineOutput`-format file written by `js-recon exploit --engine-output` into the report so
exploit findings render alongside `analyze`'s findings:

```bash
js-recon exploit -u https://example.com --cve CVE-2025-29927 --engine-output exploit-engine.json
js-recon report -m mapped.json -a analyze.json --exploit-json exploit-engine.json
```

See [Exploit command](./exploit.md) for the full CVE list and output format.

### Run swagger-jacker (`sj`) against the mapped OpenAPI spec

```bash
js-recon report --map-openapi mapped-openapi.json --sj
```

Requires [`sj`](https://github.com/BishopFox/sj) (BishopFox's swagger-jacker) to be installed and on
`PATH`, or pointed at explicitly via `--sj-bin`. Unlike the rest of `report`, `--sj` actively probes
each endpoint in the spec with live requests, so use it deliberately. `--sj-args` forwards extra
arguments to `sj automate` (for example auth headers via `-H`, or a target override via `-T`).

## HTML report

`report.html` is a single self-contained file — all CSS and JavaScript are inlined, so it opens
correctly from a `file://` URL with no local server and no CDN dependency. It ships a light/dark
theme toggle (top-right of the navbar) that follows the OS color scheme by default and remembers
an explicit choice across reloads. Findings display a colored severity badge (info/low/medium/high)
in both the Home markdown view and the sortable Data Tables view.

## Database schema (`js-recon.db`)

Alongside `report.html`, the `report` command populates a SQLite database (`js-recon.db` by default, or the path given to `--sqlite-db`) using [better-sqlite3](https://github.com/WiseLibs/better-sqlite3). There is no ORM and no migration system — the schema is created with `CREATE TABLE IF NOT EXISTS` on every run, and each table is fully rebuilt (with one exception, noted below) from whichever input JSON files were passed to `report`. Tables for inputs that weren't supplied are simply left empty.

The database has four tables:

### `mapped`

Populated from `mapped.json` (one row per function/chunk resolved by the `map` command).

| Column          | Type    | Notes                                          |
| --------------- | ------- | ---------------------------------------------- |
| `id`            | TEXT    | Primary key.                                   |
| `description`   | TEXT    |                                                |
| `loadedOn`      | TEXT    | JSON-encoded array.                            |
| `containsFetch` | BOOLEAN | Stored as SQLite `0`/`1`.                      |
| `isAxiosClient` | BOOLEAN | Stored as SQLite `0`/`1`.                      |
| `exports`       | TEXT    | JSON-encoded array.                            |
| `callStack`     | TEXT    | JSON-encoded array.                            |
| `code`          | TEXT    | Source code of the function/chunk.             |
| `imports`       | TEXT    | JSON-encoded array.                            |
| `file`          | TEXT    | Path of the file the entry was extracted from. |

Rows are cleared (`DELETE FROM mapped`) before each run's insert.

### `mapped_openapi`

Populated from `mapped-openapi.json` (one row per path + method combination).

| Column        | Type | Notes                              |
| ------------- | ---- | ---------------------------------- |
| `path`        | TEXT | Part of the composite primary key. |
| `method`      | TEXT | Part of the composite primary key. |
| `summary`     | TEXT | Nullable.                          |
| `parameters`  | TEXT | JSON-encoded, nullable.            |
| `requestBody` | TEXT | JSON-encoded, nullable.            |
| `tags`        | TEXT | JSON-encoded, nullable.            |

Primary key: `(path, method)`. Unlike the other three tables, rows here are **upserted** (`INSERT OR REPLACE`) rather than cleared first — a prior run's rows for paths/methods no longer present in the current `mapped-openapi.json` are not removed.

### `endpoints`

Populated from `endpoints.json` (client-side route tree extracted by the `endpoints` command, flattened to full URLs).

| Column | Type | Notes        |
| ------ | ---- | ------------ |
| `url`  | TEXT | Primary key. |

Rows are cleared (`DELETE FROM endpoints`) before each run's insert; duplicate URLs are ignored (`INSERT OR IGNORE`).

### `analysis_findings`

Populated from `analyze.json` (one row per rule finding produced by the `analyze` command).

| Column            | Type | Notes                                                   |
| ----------------- | ---- | ------------------------------------------------------- |
| `ruleId`          | TEXT |                                                         |
| `ruleName`        | TEXT |                                                         |
| `ruleType`        | TEXT |                                                         |
| `ruleDescription` | TEXT |                                                         |
| `ruleAuthor`      | TEXT |                                                         |
| `ruleTech`        | TEXT | Comma-joined if the rule targets multiple technologies. |
| `severity`        | TEXT |                                                         |
| `message`         | TEXT |                                                         |
| `findingLocation` | TEXT |                                                         |

No primary key or other constraints. Rows are cleared (`DELETE FROM analysis_findings`) before each run's insert.
