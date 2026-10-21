---
sidebar_position: 6
---

# Vue.js (Vite) Refactor

The `-t vue-vite` technology refactors Vue 3 + Vite bundle chunks into readable ES module files. It handles the split-chunk output produced by `@vitejs/plugin-vue` with lazy-loaded routes.

## Bundle format

Vue 3 + Vite produces two types of files:

**Main index chunk** (large, ~80–300 kB):

- Contains all of Vue core, vue-router, and shared app utilities
- Exports a small set of Vue runtime functions under minified single-letter aliases:
    ```js
    export { Eu as _, qt as a, Nl as c, Pl as o };
    ```
- Identified by the presence of `__vccOpts` (the SFC component options flag)

**Lazy page chunks** (small, ~0.2–5 kB per route):

- Generated when routes are lazy-loaded: `component: () => import('../views/Home.vue')`
- Import minified Vue functions from the main index:
    ```js
    import { _ as t, c as a, a as o, o as s } from "./index-Dcf91m-J.js";
    ```
- Export the page component as the default export

For vue-vite to produce useful output, your Vue app must use **lazy-loaded routes** to trigger code splitting. Eager routes produce a single bundle with no separate page chunks.

## What vue-vite does

### Step 1 — Analyse the main index chunk

The refactor tool parses the main index chunk and builds a map of export aliases to canonical Vue 3 API names by fingerprinting each function body:

| Export alias | Canonical name       | Fingerprint                                    |
| ------------ | -------------------- | ---------------------------------------------- |
| `_`          | `_export_sfc`        | body contains `__vccOpts`                      |
| `c`          | `createElementBlock` | wraps createBaseVNode with block tracking flag |
| `o`          | `openBlock`          | `(e=!1)` param + pushes to block stack array   |
| `a`          | `createBaseVNode`    | creates `{__v_isVNode: true, ...}` object      |

The specific aliases vary per build (they depend on which Vue APIs the app uses).

### Step 2 — Rewrite page chunk imports

Each lazy page chunk's index import is rewritten to a canonical `import { ... } from 'vue'` statement:

**Before:**

```js
import { _ as t, c as a, a as o, o as s } from "./index-Dcf91m-J.js";
```

**After:**

```js
import {
    createElementBlock as a,
    createBaseVNode as o,
    openBlock as s,
} from "vue";
```

### Step 3 — Inline the `_export_sfc` helper

The `_export_sfc` function is a compiler-internal helper injected by `@vitejs/plugin-vue`. It is not part of Vue's public API, so it cannot be imported from `vue`. Instead, it is inlined as a local constant:

```js
const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) target[key] = val;
    return target;
};
const t = _export_sfc; // local alias used in this chunk
```

## Example

**Input** (lazy page chunk, raw):

```js
import { _ as t, c as a, a as o, o as s } from "./index-Dcf91m-J.js";
const c = {},
    n = { class: "home" };
function r(l, e) {
    return (
        s(),
        a("div", n, [
            ...(e[0] ||
                (e[0] = [
                    o("h1", null, "Home Page", -1),
                    o("p", null, "Welcome.", -1),
                ])),
        ])
    );
}
const m = t(c, [
    ["render", r],
    ["__scopeId", "data-v-88586f7c"],
]);
export { m as default };
```

**Output** (`Home--CqlrOQV.js`):

```js
import {
    createElementBlock as a,
    createBaseVNode as o,
    openBlock as s,
} from "vue";

const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) target[key] = val;
    return target;
};
const t = _export_sfc;

const c = {},
    n = { class: "home" };

function r(l, e) {
    return (
        s(),
        a("div", n, [
            ...(e[0] ||
                (e[0] = [
                    o("h1", null, "Home Page", -1),
                    o("p", null, "Welcome.", -1),
                ])),
        ])
    );
}

const m = t(c, [
    ["render", r],
    ["__scopeId", "data-v-88586f7c"],
]);
export { m as default };
```

## Vue render function patterns

Vue 3 compile render functions using these runtime helpers:

| Function               | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `openBlock()`          | Starts a new block for tracking dynamic nodes |
| `createElementBlock()` | Creates a block-level element VNode           |
| `createElementVNode()` | Creates a non-block element VNode             |
| `createBaseVNode()`    | Core VNode factory (internal alias)           |
| `createTextVNode()`    | Creates a text node                           |
| `toDisplayString()`    | Converts a value to its display string        |
| `normalizeClass()`     | Normalizes class binding to a string          |
| `withDirectives()`     | Applies custom directives to a VNode          |
| `resolveComponent()`   | Resolves a component by name at runtime       |

## Usage

```bash
js-recon refactor -m mapped.json -t vue-vite -o output_refactored
```

## Output

One `.js` file per lazy-loaded chunk (page/component), formatted with Prettier. The main index chunk is not included in the output — it's only used for alias analysis. Since the index chunk bundles Vue core, vue-router, _and_ shared app utilities together (see [Bundle format](#bundle-format) above), excluding it can also drop any shared application logic that was co-located there, not just library/runtime code.

## Requirements

For meaningful output, your Vue app must use lazy-loaded routes:

```js
// router/index.js
const routes = [
    { path: "/", component: () => import("../views/Home.vue") },
    { path: "/about", component: () => import("../views/About.vue") },
];
```

Apps with eagerly loaded routes produce a single monolithic bundle; all code is in the index chunk, which is excluded from refactor output.

## Notes

- The export alias mapping (for example, `_ → _export_sfc`) is computed from the actual bundle being refactored. Different Vue versions or different sets of Vue APIs will produce different alias mappings — the fingerprinting engine adapts automatically.
- The main index chunk is identified by the presence of `__vccOpts` and its size (>5 kB). If no index chunk is detected, all chunks are processed as standalone modules.
- The `-t vue-webpack` tech handles older Vue 2 / webpack 4 bundles. Use `-t vue-vite` only for Vue 3 + Vite builds.
