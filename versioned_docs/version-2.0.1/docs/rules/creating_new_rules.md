---
sidebar_position: 2
---

# Creating new rules

To create a new rule, you have to first create a new YAML file (`.yaml` or `.yml` extension).

## Basic structure

A rule file has the following basic structure:

```yaml
id: <id>
name: <human-readable-name>
author: <author>
js_recon_version: ">=<min-version>"
description: <description>
severity: <info | low | medium | high>
type: <request | ast | cs-mast-s>
tech:
    - <tech>

steps:
    - <step>
```

All the mentioned fields are required. For example, a rule file could look like this:

```yaml
id: rule-1
name: Rule 1
author: shriyanss
js_recon_version: ">=1.3.0"
description: An example rule
severity: info
type: ast
tech:
    - next

steps:
    - <step>
```

## Version compatibility (`js_recon_version`) {#versioning}

The `js_recon_version` field is **required** in every rule file. It declares the minimum (or exact) JS Recon version that a rule requires. Omitting it is a schema validation error that stops analysis.

An optional `js_recon_max_version` field can also be declared, using the same format, for a rule that relies on a feature that has since been retired from JS Recon.

When the `analyze` module loads rules, any rule whose version requirement (min or max) is not satisfied by the running JS Recon version is **skipped** with a warning — it is not treated as a hard error and does not stop the rest of analysis. This makes it safe to publish rules that rely on newer engine features: such rules will be silently ignored by users on older versions instead of failing with schema errors.

### Determining the correct version automatically

Don't hand-pick `js_recon_version`/`js_recon_max_version` — the correct value depends on exactly which schema/engine features a rule's steps use, and guessing can under- or over-restrict a rule relative to what it actually needs. Instead, run the `analyze` command's [`--determine-compatible-version`](../modules/analyze.md#determining-or-applying-the-correct-rule-version) flag (or `--apply-compatible-versions` to rewrite the file in place) whenever you create or edit a rule:

```bash
js-recon analyze -r ./my-rule.yaml --determine-compatible-version
```

This computes the version actually required from a map of which JS Recon version introduced (or retired) each feature, so the declared version always matches what the rule uses.

### Format

The value is a version constraint string: an operator followed by a [semver](https://semver.org/)-style `MAJOR.MINOR.PATCH` version.

| Operator    | Meaning                                                      |
| ----------- | ------------------------------------------------------------ |
| `>=`        | current version must be at or above the specified version    |
| `>`         | current version must be strictly above the specified version |
| `<=`        | current version must be at or below the specified version    |
| `<`         | current version must be strictly below the specified version |
| `=` or `==` | current version must match exactly (ignoring pre-release)    |

Pre-release suffixes (for example, `-alpha.2`) are stripped before comparison, so `1.3.1-alpha.2` satisfies `>=1.3.0`.

### Example

```yaml
# This rule requires JS Recon 1.3.0 or newer.
# On older installs it is silently skipped.
js_recon_version: ">=1.3.0"
```

## Steps

Each step follows a unified structure, which must be followed. There are different types of steps, such as matching the header and the URL.

The steps are parsed by an engine, which is named as per the type of step. The following are the engines that are available (you can navigate to a particular engine to know about their rule format):

- [Request Engine](./engines/request-engine.md)
- [AST Engine](./engines/ast-engine.md)
- [CS-MAST-S Engine](./engines/cs-mast-s-engine.md)

## Multi-step rules and how matches are combined

A rule with several steps fires only when **every** step matches in the same target unit — a single chunk for AST rules, a single OpenAPI operation for request rules. Within a step, the engine stops counting once at least one match is found; multiple matches do not break the rule.

To express a stronger relationship between steps you can use two optional fields:

- `requires: [previousStepName, ...]` — declares a hard dependency: the step is skipped (and the rule cannot fire) unless every required step has already matched.
- `inScopeOf: previousStepName` (on an AST `esquery` step) — restricts the query to the AST subtree of the previous step's match instead of the whole chunk. This is the right tool when you want to require both a source and a sink to live inside the same function.

A typical taint-style AST rule therefore looks like:

```yaml
steps:
    - name: find_source
      esquery:
          type: esquery
          query: <selector for the URL parameter / fetch response / event.data>
    - name: find_sink
      requires:
          - find_source
      esquery:
          type: esquery
          query: <selector for innerHTML / dangerouslySetInnerHTML / fetch URL>
```

If you need stricter scoping than the chunk, change `find_sink`'s step to use `inScopeOf: find_source` — see the [AST engine `inScopeOf` reference](./engines/ast-engine.md#inscopeof--scoping-an-esquery-to-a-previous-match).
