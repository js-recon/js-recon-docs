---
sidebar_position: 3
---

# CS-MAST-S Engine

The CS-MAST-S engine matches rules of type `cs-mast-s`. Each step contains a CS-MAST-S **PHC signature string** and fires if that structural hash is found anywhere in the chunk's AST. This engine is designed for **regression detection**: once a vulnerability is confirmed (for example by an AST rule), extract its CS-MAST-S signature and embed it in a `cs-mast-s` rule to track whether the same code reappears in future builds.

## Rule header

```yaml
id: <id>
name: <human_readable_name>
author: <author>
description: <description>
js_recon_version: ">=1.4.1"
severity: <info | low | medium | high>
type: cs-mast-s
tech:
    - <tech>

steps:
    - name: <step_name>
      message: <message_if_fired>
      csMastS:
          signature: "<PHC string>"
```

## Signature format

A CS-MAST-S signature is a PHC-style string with the form:

```
$v=1$hash=<algo>,lang=<lang>,prsr=<parser>,scat=<categories>$<64-hex-chars>
```

| Field        | Description                                                                               |
| ------------ | ----------------------------------------------------------------------------------------- |
| `hash`       | Hash algorithm (always `sha256`)                                                          |
| `lang`       | Language (`js`)                                                                           |
| `prsr`       | Parser identifier (sanitized form of `@babel/parser` → `-babel/parser`)                   |
| `scat`       | Stratification categories joined with `_` (for example, `name_id` means `["name", "id"]`) |
| last segment | 64-character lowercase hex hash of the matched AST node                                   |

**Example:**

```
$v=1$hash=sha256,lang=js,prsr=-babel/parser,scat=name_id$1a572a605f850b1396d0d0950ba1f5c2c2d9f65eebb2fca04ce8f167e32b0c68
```

## Recommended scat configuration

Based on experiments across React, Vue, and Angular compiled bundles:

| Use case                                                                                  | Recommended config | FP rate    | Cross-bundler portable? |
| ----------------------------------------------------------------------------------------- | ------------------ | ---------- | ----------------------- |
| Framework constants (`dangerouslySetInnerHTML.__html`, `eval`, `bypassSecurityTrustHtml`) | `scat=name,id`     | 0          | Yes                     |
| Generic component sinks (minified variable names)                                         | `scat=id`          | Low–medium | Yes                     |
| Same-build regression (bundle hasn't changed)                                             | `scat=name,id`     | 0          | Same bundler only       |

`scat=name,id` is the best starting point. It produces zero false positives for all tested sinks when checking within the same build. For sinks where variable names differ between bundlers (for example, `l.current` vs `h.current`), use `scat=id`.

## How to generate a signature

1. Run `js-recon analyze` with an AST rule to confirm a vulnerability and identify the chunk.
2. Use the `cs-mast` subcommand to inspect signatures in the chunk:
    ```bash
    js-recon cs-mast -o output/<host>/static/js --scat name,id --ct
    ```
3. For node-level (sub-root) signatures, use the `@shriyanss/cs-mast` library directly:
    ```js
    import { cs_mast_init, buildSignatureFromConfig } from "@shriyanss/cs-mast";
    const config = {
        hash: "sha256",
        lang: "js",
        prsr: "@babel/parser",
        scat: ["name", "id"],
        sinc: [],
        sourceType: "unambiguous",
    };
    const tree = cs_mast_init(source, config);
    // Walk tree.root to find the node of interest and read node.computedHash
    const sig = buildSignatureFromConfig(config, sinkNode.computedHash);
    ```
4. Embed the resulting PHC string in a `cs-mast-s` rule.

## Multi-step rules

Multiple steps in a `cs-mast-s` rule create an AND condition — all steps must match in the same chunk for a finding to fire. Use `requires` to chain steps:

```yaml
steps:
    - name: step_a
      message: First signature present
      csMastS:
          signature: "$v=1$..."

    - name: step_b
      message: Second signature also present
      requires:
          - step_a
      csMastS:
          signature: "$v=1$..."
```

## Finding output

The finding's `findingLocation` field contains the chunk ID and the matched signature:

```
// chunk: <chunk-id>
// CS-MAST-S signature: $v=1$...
```

To locate the exact matching node in the chunk, use `map -c "esquery * <pattern>"` in interactive mode.

## Portability note

CS-MAST-S signatures are **structural hashes** — they depend on how the bundler names variables. The same source code compiled by Vite and webpack can produce different signatures for sinks that use generic minified variable names (`e`, `n`, `r`). Framework constants that survive minification identically (like `__html`, `eval`, `bypassSecurityTrustHtml`) produce portable signatures across bundlers.
