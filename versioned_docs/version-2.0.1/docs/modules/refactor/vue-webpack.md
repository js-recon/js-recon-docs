---
sidebar_position: 5
---

# Vue.js (webpack) Refactor

The `-t vue-webpack` technology refactors Vue.js webpack bundle chunks into readable per-module ES files. It handles the webpack 4 and webpack 5 module wrapper formats used by Vue CLI and legacy Vue.js applications.

## Bundle format

Vue webpack bundles store modules inside a `webpackJsonp` push container. Each `.js` chunk file has the structure:

```js
(window.webpackJsonp = window.webpackJsonp || []).push([
    [100],
    {
        429: function (t, e, r) {
            "use strict";
            r.r(e);
            // module body
        },
        430: function (t, e, r) {
            // another module
        },
    },
]);
```

In webpack 5 the same pattern uses arrow functions and a different global name:

```js
(self.webpackChunkMyApp = self.webpackChunkMyApp || []).push([
    [0],
    {
        429: (t, e, r) => {
            "use strict";
            // module body
        },
    },
]);
```

**Parameter order** (same for webpack 4 and webpack 5):

| Position    | Role                                                      |
| ----------- | --------------------------------------------------------- |
| `params[0]` | `module` — module object; `t.exports = X` for CJS exports |
| `params[1]` | `exports` — export target for ODP / `require.d`           |
| `params[2]` | `require` — import function; `r(N)` imports module N      |

The `mapped.json` produced by the `map` command stores each chunk file's full source (including the push container) in the `code` field. The refactor tool strips the container and processes each module function independently.

## Transform passes

The same transform passes used for [Next.js (webpack)](./next-webpack.md) are applied, since the module function format is identical:

### Pass 1 — export collection and boilerplate removal

Collects named exports from:

- `Object.defineProperty(exports, "name", { get: () => localVar })` — ODP named export
- `require.d(exports, { name: () => localVar, ... })` — webpack `require.d` batch

Collects default exports from:

- `module.exports = VALUE` — becomes `export default VALUE`
- `module.exports = require(N)` — becomes `export * from './N.js'`

Drops boilerplate:

- `Object.defineProperty(exports, "__esModule", ...)` — interop marker
- `require.r(exports)` — ES module marker
- `module.exports = exports.default` — CJS interop copy-back
- `"use strict"` directive expressions

### Pass 2 — require hoisting

`var x = require(N)` declarators are removed and replaced with `import * as x from './N.js'` at the top of the output file.

### Pass 3 — inline require replacement

Remaining `require(N)` call-sites inside function bodies are replaced with the hoisted namespace identifier.

### Passes E / F / G / H — cleanup

- **E**: Collapses Babel `_slicedToArray` / `_arrayLikeToArray` expansions.
- **F**: Recovers JSX from `jsx(tag, props)` / `jsxs(tag, props)` calls.
- **G**: Strips Babel runtime helpers (`_typeof`, `_defineProperty`, etc.).
- **H**: Prunes named import specifiers that are no longer referenced after cleanup. Side-effect imports are always kept.

## Vue render functions

Vue 2 components compiled by webpack emit template render functions using the Vue 2 virtual DOM API. These are preserved verbatim in the output:

```js
// Output (429.js)
import * as v from "./3.js";

var n = Object(v.a)(
    {},
    function () {
        var t = this,
            e = t._self._c;
        return e("div", { class: "container" }, [
            e("h1", [t._v("Page Title")]),
            e("p", [t._v(t._s(t.message))]),
        ]);
    },
    [],
    false,
    null,
    null,
    null
);

e.default = n.exports;
```

Where:

- `this._c` — Vue's `createElement` function
- `this._v()` — creates a text VNode
- `this._s()` — converts a value to its display string (`toString`)

## Usage

```bash
js-recon refactor -m mapped.json -t vue-webpack -o output_refactored
```

## Output

One `.js` file per module ID, formatted with Prettier. Each file uses ES module syntax. Modules whose function body is empty are skipped.

The webpack runtime chunk (containing the `webpackJsonp` bootstrap itself, no module map) is automatically detected and skipped with a `[~] No webpack module map found` message.

## Notes

- The `mapped.json` must be generated from a Vue webpack bundle. Use `-t vue-vite` for Vue 3 + Vite bundles.
- Both webpack 4 (`function(t,e,r){}`) and webpack 5 (`(t,e,r)=>{}`) module formats are supported.
- Vue 3 webpack bundles (rare — most Vue 3 projects use Vite) are also supported.
- The webpack runtime push files (`push.js`, `push_js_1`) that set up the `webpackJsonp` array itself contain no module map and are correctly skipped.
