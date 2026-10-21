---
sidebar_position: 8
---

# Analyze command

The `analyze` command is used to analyze a file the output files of JS recon modules to determine if they contain sensitive info or not.

## Usage

```bash
js-recon analyze [options]
```

## Options

| Option                           | Alias | Description                                                                                                     | Default        | Required |
| -------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------- | -------------- | -------- |
| `--rules <file/dir>`             | `-r`  | Rules file or directory                                                                                         |                | No       |
| `--mapped-json <file>`           | `-m`  | Mapped JSON file                                                                                                | `mapped.json`  | No       |
| `--tech <tech>`                  | `-t`  | Technology used in the JS files (run with -l/--list to see available options)                                   |                | No       |
| `--openapi <file>`               |       | Path to OpenAPI spec file                                                                                       |                | No       |
| `--list`                         | `-l`  | List available technologies                                                                                     | `false`        | No       |
| `--validate`                     |       | Validate the rules                                                                                              | `false`        | No       |
| `--output <file>`                | `-o`  | Output JSON file name                                                                                           | `analyze.json` | No       |
| `--determine-compatible-version` |       | Report the `js_recon_version`/`js_recon_max_version` each rule actually requires, based on the features it uses | `false`        | No       |
| `--apply-compatible-versions`    |       | Same as `--determine-compatible-version`, but rewrites the rule files in place                                  | `false`        | No       |

## Examples

### Validating custom rules

Though the tool will validate all the templates automatically, you can also validate them manually using the `--validate` option.

Assuming that the rules are stored in the `./rules` directory, you can run the following command to validate them:

```bash
js-recon analyze --validate -r ./rules
```

### Determining or applying the correct rule version

Don't hand-pick a rule's `js_recon_version`/`js_recon_max_version` — run `--determine-compatible-version` to see what the rule's features actually require:

```bash
js-recon analyze -r ./rules --determine-compatible-version
```

To rewrite the rule files with the correct values instead of just reporting them, use `--apply-compatible-versions`:

```bash
js-recon analyze -r ./rules --apply-compatible-versions
```

See [Creating new rules](../rules/creating_new_rules.md#versioning) for how the required version is computed.

### Analyzing OpenAPI spec file

To run analysis on an OpenAPI spec file, make sure that you've generated it using the `map` command:

```bash
js-recon map -d output/<domain> -t <tech> --openapi
```

This will give a file called `mapped-openapi.json` in the working directory. To run analysis on this, run the following command:

```bash
js-recon analyze --openapi mapped-openapi.json -t <tech>
```

This will analyze the `mapped-openapi.json` file against the default rules that would be stored in `$HOME/.js-recon/rules`.

## Built-in detection rules

The bundled rules detect both request-level misconfigurations (for example, missing `Authorization` header) and client-side code patterns such as DOM XSS sinks and Client-Side Path Traversal (CSPT). See [Predefined rules](../rules/predefined-rules.md) for the full catalogue and the constraints each rule applies to avoid false positives.

## Output format

`analyze.json` is a JSON array where each element represents one finding. An empty array means no rules fired.

```json
[
    {
        "ruleId": "dom_xss_innerHTML",
        "ruleName": "DOM XSS via innerHTML",
        "ruleType": "ast",
        "ruleDescription": "Detects direct assignment to innerHTML from a user-controlled source.",
        "ruleAuthor": "js-recon",
        "ruleTech": ["next", "react"],
        "severity": "high",
        "message": "[+] \"DOM XSS via innerHTML\" found in chunk 4821",
        "findingLocation": "// 4821\n\ndocument.getElementById('out').innerHTML = userInput"
    }
]
```

### Fields

| Field             | Type       | Description                                                                                   |
| ----------------- | ---------- | --------------------------------------------------------------------------------------------- |
| `ruleId`          | `string`   | Unique rule identifier from the YAML rule file.                                               |
| `ruleName`        | `string`   | Human-readable rule name.                                                                     |
| `ruleType`        | `string`   | Engine that produced the finding: `ast`, `request`, or `cs-mast-s`.                           |
| `ruleDescription` | `string`   | Description of what the rule detects.                                                         |
| `ruleAuthor`      | `string`   | Author of the rule.                                                                           |
| `ruleTech`        | `string[]` | Technologies the rule targets. Values: `next`, `vue`, `react`, `svelte`, `angular`, or `all`. |
| `severity`        | `string`   | Finding severity: `info`, `low`, `medium`, or `high`.                                         |
| `message`         | `string`   | One-line summary of the finding (see below).                                                  |
| `findingLocation` | `string`   | Where the finding was detected (see below).                                                   |

### `message` format

The `message` field is a one-line human-readable label:

- **AST and CS-MAST-S rules:** `[+] "<rule name>" found in chunk <chunk id>`
- **Request rules:** `[+] "<rule name>" found in <path> [<METHOD>]`

### `findingLocation` format

The `findingLocation` field varies by engine:

- **AST rules:** A comment with the chunk ID followed by the matched source code snippet:

    ```
    // <chunk id>

    <matched source code>
    ```

- **CS-MAST-S rules:** The chunk ID and matched CS-MAST-S signatures:
    ```
    // chunk: <chunk id>
    // CS-MAST-S signature: <phc string>
    ```
- **Request rules:** The matched endpoint path and HTTP method: `<path> [<METHOD>]`
