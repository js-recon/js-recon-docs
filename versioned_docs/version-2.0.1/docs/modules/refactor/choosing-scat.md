---
sidebar_position: 7
---

# Choosing the Right Scat Categories

The `--scat` flag controls which CS-MAST structural categories are used to fingerprint code during library module detection. Choosing the right combination affects how many library modules are stripped — a better scat config means a cleaner refactor output with less noise.

## What are scat categories?

CS-MAST partitions every AST node into one of nine structural categories before hashing:

| Category  | What it captures                                                |
| --------- | --------------------------------------------------------------- |
| `lit`     | Literal values (strings, numbers, booleans, regex)              |
| `id`      | Identifier names (variable names, property names)               |
| `op`      | Operators (`+`, `-`, `===`, `??`, etc.)                         |
| `decl`    | Variable and function declarations                              |
| `loop`    | Loop statements (`for`, `while`, `do`)                          |
| `cond`    | Conditional statements and expressions (`if`, `? :`, `switch`)  |
| `name`    | Named constructs (function names, class names)                  |
| `val`     | Value-producing expressions (calls, member access, assignments) |
| `op_name` | Operator + name combinations                                    |

A scat combo like `lit,decl,loop,cond` tells CS-MAST to include those four categories when computing each sub-tree's hash. More categories generally add structural detail, producing more signatures and a larger intersection with the library baseline — but the effect on detection is dataset- and target-dependent, not a guaranteed improvement. The category impact summary below shows `cond` and `val` reducing average detection despite adding categories.

## The default: `lit,decl,loop,cond`

The default combination was chosen as a conservative baseline that produces stable signatures across different builds of the same library. It detects **12 out of 16** library modules in a representative React-webpack bundle (rank #240 of 511 tested combinations).

## Experiment results

An experiment tested all 511 non-empty subsets of the 9 scat categories against 18 reference React-webpack apps. Key findings:

- **62 combinations (12%) achieve perfect 16/16 library module detection**
- The default `lit,decl,loop,cond` is suboptimal — 208 combinations outperform it
- **`id` is by far the most impactful category**: combos that include `id` detect on average 5 more library modules than those that don't
- **`val` and `cond` slightly reduce detection** on average (their patterns diverge more across minified bundles)

### Category impact summary

| Category  | Avg detection **with** | Avg detection **without** | Delta     |
| --------- | ---------------------- | ------------------------- | --------- |
| `id`      | 13.25/16               | 8.18/16                   | **+5.07** |
| `lit`     | 11.29/16               | 10.14/16                  | +1.15     |
| `name`    | 11.26/16               | 10.18/16                  | +1.08     |
| `loop`    | 11.03/16               | 10.40/16                  | +0.63     |
| `op`      | 10.76/16               | 10.67/16                  | +0.09     |
| `op_name` | 10.60/16               | 10.84/16                  | -0.24     |
| `decl`    | 10.55/16               | 10.89/16                  | -0.34     |
| `cond`    | 9.94/16                | 11.50/16                  | -1.56     |
| `val`     | 9.39/16                | 12.05/16                  | -2.65     |

### Top performing combinations

All of the following achieve 16/16 library module detection on the reference bundle:

| Scat combo                  | Intersection size |
| --------------------------- | ----------------- |
| `lit,id,loop,cond,name,val` | 2840 signatures   |
| `lit,id,cond,name,val`      | 2803 signatures   |
| `lit,id,decl,loop,name,val` | 2677 signatures   |
| `lit,id,decl,name,val`      | 2603 signatures   |
| `id,loop,cond,name,val`     | 2201 signatures   |
| `id,cond,name,val`          | 2164 signatures   |
| `id,cond,name`              | 1987 signatures   |

## Recommended combinations

**For most use cases**, the following combination offers the best balance of detection accuracy and simplicity:

```bash
js-recon refactor -t react-webpack --scat lit,id,loop,cond,name,val
```

This detects all library modules in tested bundles and generates ~2840 signatures — enough to confidently distinguish library code from application code.

**If you want the safest, most stable signatures** (fewest false positives, widest compatibility across different React versions), the minimal combination that still achieves full detection is:

```bash
js-recon refactor -t react-webpack --scat id,cond,name
```

This uses only 1987 signatures but reliably detects all 16 library modules in the reference bundle.

**If you suspect false positives** (user code being incorrectly stripped), narrow the combo:

```bash
js-recon refactor -t react-webpack --scat lit,decl,loop,cond
```

This is the conservative default — fewer signatures, lower risk of over-matching.

## Dataset availability

The CS-MAST signature dataset is hosted as a HuggingFace bucket:

**[https://huggingface.co/buckets/shriyanss/cs-mast-s-dataset](https://huggingface.co/buckets/shriyanss/cs-mast-s-dataset)**

### Bucket structure

The bucket is organized by technology and dataset size:

```
shriyanss/cs-mast-s-dataset/
├── react/
│   └── webpack/
│       ├── small/          ← 18 feature apps (React hooks baseline)
│       │   ├── sample_size
│       │   ├── technology
│       │   ├── 01-usestate-hook-webpack/
│       │   │   ├── lit-decl-loop-cond/
│       │   │   │   └── collisions.json
│       │   │   ├── lit-id-loop-cond-name-val/
│       │   │   │   └── collisions.json
│       │   │   └── … (all 511 scat combos)
│       │   ├── 02-useeffect-hook-webpack/
│       │   └── … (18 feature apps total)
│       └── large/          ← 18 larger apps (React 19 hooks baseline)
│           ├── sample_size
│           ├── technology
│           ├── 01-usestate/
│           └── …
└── main/
```

`sample_size` contains the number of apps in that prefix (for example, `18`), used by the tool to compute signature quality. `technology` contains the tech identifier (for example, `react-webpack`), validated on startup.

### All 511 combinations are available

**Every non-empty subset of the 9 scat categories is already in the bucket.** The dataset was generated by running `cs-mast` with all 511 permutations across all 18 feature apps, so whatever combination you pass to `--scat` will be found. When you run:

```bash
js-recon refactor -t react-webpack --scat lit,id,loop,cond,name,val
```

the tool resolves this to `react/webpack/small/…/lit-id-loop-cond-name-val/collisions.json`, downloads it for each of the 18 feature apps, and caches locally under `~/.js-recon/refactor/signature_cache/`. Subsequent runs use the cache silently.

If a combination is genuinely absent (for example, for a technology not yet in the bucket), the tool falls back gracefully and runs without library stripping, printing a warning.

## How the tool resolves the bucket directory

The category order in the directory name follows a fixed canonical order (`lit → id → op → decl → loop → cond → name → val → op_name`), regardless of the order you pass to `--scat`. So `--scat cond,lit,id` and `--scat id,lit,cond` both resolve to the `lit-id-cond` directory in the bucket.

## React Vite recommendations

A separate benchmark (2026-06-30) tested all 511 scat combinations against 13 React Vite apps using a **recovery quality score** metric — how closely the refactored output's structural fingerprints match the original source. This metric differs from the webpack library-module count, so the two studies aren't directly comparable, but the category rankings are instructive.

| Scat combo   | Recovery score | Notes                                                  |
| ------------ | -------------- | ------------------------------------------------------ |
| `id`         | 1.0000         | Perfect score — top recommendation                     |
| `id,val`     | 1.0000         | Equivalent to `id` alone                               |
| `id,op_name` | 1.0000         | Equivalent to `id` alone                               |
| `lit,id`     | 0.6599         | Good, but adding `lit` reduces score vs `id` alone     |
| `lit`        | 0.4918         | Acceptable if identifier-level matching is undesirable |

The default `lit,decl,loop,cond` ranks **314/511** with a score of 0.0527 — significantly worse than `id` alone for Vite targets.

**Recommended combinations for React Vite:**

```bash
# Best recovery quality — use when false positives are not a concern
js-recon refactor -t react-vite --scat id

# Conservative — identifier-level matching disabled
js-recon refactor -t react-vite --scat lit
```

**Key difference from webpack:** `name` is beneficial for webpack (+1.08) but harmful for Vite (-0.048). Avoid `name`, `decl`, and `cond` in Vite scat configs.

## See also

- [Remote signature stripping — Scat category override](./remote-signatures.md#scat-category-override---scat) — full `--scat` flag reference
- [Remote signature stripping](./remote-signatures.md) — how the bucket download and cache work
