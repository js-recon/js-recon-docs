---
sidebar_position: 1
---

# Recovering Source from a Bundled React App

webpack turns your carefully written React components into a single, unreadable blob. For a pentester or security researcher, that blob is the only artifact you have to work with. This guide walks through how `js-recon refactor` reconstructs something close to the original source — and how [CS-MAST](https://cs-mast.ss0x00.com) signatures are the key that makes it possible.

## The problem: what webpack does to React

Consider a simple counter component:

```jsx title="src/index.jsx (original)"
import { useState } from "react";
import { createRoot } from "react-dom/client";

function Counter() {
    const [count, setCount] = useState(0);
    return (
        <button onClick={() => setCount(count + 1)}>
            clicked {count} times
        </button>
    );
}

createRoot(document.getElementById("root")).render(<Counter />);
```

After `webpack` + `@babel/preset-env` processes this, the bundle looks like this (abridged):

```js title="main.abc123.js (bundled)"
(() => {
    "use strict";
    var e = {
        540(e, n, t) {
            e.exports = t(287);
        },
        287(e, n) {
            /* 8000 lines of the React runtime */
            n.useState = function () {
                /* ... */
            };
            n.useEffect = function () {
                /* ... */
            };
            // ... every React hook and API ...
        },
        338(e, n, t) {
            var r = t(961);
            ((n.H = r.createRoot), r.hydrateRoot);
        },
        848(e, n, t) {
            e.exports = t(20);
        },
        20(e, n, t) {
            /* react/jsx-runtime */
            function i(e, n, t) {
                /* createElement equivalent */
            }
            ((n.jsx = i), (n.jsxs = i));
        },
        // ... 4 more library modules ...
    };
    function t(id) {
        return (e[id](mod, mod.exports, t), mod.exports);
    }
    var r = t(540),
        l = t(338),
        a = t(848);
    var n = {};
    function o(e, n) {
        (null == n || n > e.length) && (n = e.length);
        for (var t = 0, r = Array(n); t < n; t++) r[t] = e[t];
        return r;
    }
    function u() {
        var e,
            n,
            t =
                ((e = (0, r.useState)(0)),
                (n = 2),
                (function (e) {
                    if (Array.isArray(e)) return e;
                })(e) ||
                    (function (e, n) {
                        var t =
                            null == e
                                ? null
                                : (typeof Symbol !== "undefined" &&
                                      e[Symbol.iterator]) ||
                                  e["@@iterator"];
                        if (null != t) {
                            var r,
                                l,
                                a,
                                o,
                                u = [],
                                i = !0,
                                s = !1;
                            try {
                                if (((a = (t = t.call(e)).next), 0 === n)) {
                                    if (Object(t) !== t) return;
                                    i = !1;
                                } else
                                    for (
                                        ;
                                        !(i = (r = a.call(t)).done) &&
                                        (u.push(r.value), u.length !== n);
                                        i = !0
                                    );
                            } catch (e) {
                                ((s = !0), (l = e));
                            } finally {
                                try {
                                    if (
                                        !i &&
                                        null != t.return &&
                                        ((o = t.return()), Object(o) !== o)
                                    )
                                        return;
                                } finally {
                                    if (s) throw l;
                                }
                            }
                            return u;
                        }
                    })(e, n) ||
                    (function () {
                        throw new TypeError(
                            "Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
                        );
                    })()),
            l = t[0],
            u = t[1];
        return (0, a.jsxs)("button", {
            onClick: function () {
                return u(l + 1);
            },
            children: ["clicked ", l, " times"],
        });
    }
    (0, l.H)(document.getElementById("root")).render((0, a.jsx)(u, {}));
})();
```

Seven lines became ~240 KB across ten files, dominated by the React runtime and Babel polyfills. The application code itself — the `Counter` component — is buried inside and nearly unreadable.

## Running the refactor

First, download the JS files with `js-recon run`:

```bash
js-recon run -u https://example.com -y -k
```

Then refactor. Without any extra options, js-recon already does basic cleanup:

```bash
js-recon refactor -t react-webpack
```

This splits the numeric module map into individual files (`287.js`, `338.js`, ...) and writes the IIFE body to `index.js`. Better than nothing — but you're still looking at ten files and ~240 KB.

The real improvement comes from passing a **CS-MAST baseline**:

```bash
js-recon refactor -t react-webpack \
  --collisions ../js-recon-cs-mast-s \
  -o output_stripped
```

With that single flag, the output shrinks to **one file, 15 lines**:

```jsx title="output_stripped/index.js"
import { useState } from "react";
import { createRoot } from "react-dom/client";

function u() {
    const [l, u] = useState(0);
    return (
        <button
            onClick={function () {
                return u(l + 1);
            }}
        >
            clicked {l} times
        </button>
    );
}

createRoot(document.getElementById("root")).render(<u />);
```

That is structurally identical to the original source. The only things missing are the variable names (`Counter`, `count`, `setCount`) — those are erased by the minifier before bundling and cannot be recovered by any tool.

## How it works: the eight passes

`js-recon refactor` processes the IIFE body through a pipeline of AST transforms.

### Pass A — strip webpack's require helper

webpack injects a function like:

```js
function t(id) {
    return (e[id](mod, mod.exports, t), mod.exports);
}
```

This is detected by its distinctive return shape — a two-element sequence expression where the first element is a computed-member call and the second is `mod.exports`. The entire function is removed, and its name (`t`) is recorded for the next passes.

### Pass B — hoist `var r = t(540)` to static imports

```js
// before
var r = t(540),
    l = t(338),
    a = t(848);

// after
import * as r from "./540.js";
import * as l from "./338.js";
import * as a from "./848.js";
```

### Pass C — replace remaining require calls

Any `t(N)` call that was not hoisted by Pass B (deeper in the tree) is replaced with its import identifier or a synthesised `_jsr_module_N` fallback.

### Pass D — library identity + named import rewriting

This is where [CS-MAST](https://cs-mast.ss0x00.com) becomes essential.

By itself, js-recon cannot tell whether `import * as r from './540.js'` refers to React, a polyfill, or application code. Without that knowledge, `(0, r.useState)(0)` cannot be rewritten, and the import stays as a numeric file reference.

CS-MAST provides the baseline. When `--collisions` is passed, every webpack module is hashed and matched against a cross-app signature set. The modules that appear in **every** React app regardless of what application code they contain — that is, the library modules — are identified and stripped. As a side effect, their identities are also resolved.

The identity resolution works in two steps:

**1. Direct classification** — for each stripped library module, js-recon scans its export assignments. Module 338 contains `n.H = r.createRoot`. The value `createRoot` is in the `react-dom/client` canonical export set, so module 338 → `react-dom-client`.

**2. Re-export chain resolution** — modules 540 and 848 are transparent shims: `e.exports = t(287)` and `e.exports = t(20)`. js-recon follows these chains: 540 → 287 (React, which exports `Component`, `Fragment`, `createElement`) → `react`; 848 → 20 (which exports `jsx`, `jsxs`) → `react-jsx-runtime`.

Once the identity is known, the namespace imports are rewritten:

```js
// import * as r from './540.js'  →  import { useState } from 'react'
// import * as l from './338.js'  →  import { createRoot } from 'react-dom/client'
// import * as a from './848.js'  →  (consumed by Pass F, see below)
```

Call sites are rewritten too:

```js
(0, r.useState)(0)          →  useState(0)
(0, l.H)(document....)     →  createRoot(document....)
(0, a.jsxs)('button', ...) →  jsxs('button', ...)
```

### Pass E — Babel array-destructure collapse

`@babel/preset-env` compiles `const [count, setCount] = useState(0)` into a ~55-line pattern for broad browser compatibility. The pattern ends with an immediately invoked function that throws `TypeError("Invalid attempt to destructure non-iterable instance...")`. That throw is the detection signal.

```js
// before (55 lines)
var e,
    n,
    t =
        ((e = useState(0)),
        (n = 2),
        (function (e) {
            if (Array.isArray(e)) return e;
        })(e) ||
            (function (e, n) {
                /* iterable check */
            })(e, n) ||
            (function (e, n) {
                /* string/map/set check */
            })(e, n) ||
            (function () {
                throw new TypeError("Invalid attempt to destructure...");
            })()),
    l = t[0],
    u = t[1];

// after (1 line)
const [l, u] = useState(0);
```

### Pass F — JSX recovery

After Pass D rewrites the callee from `(0, a.jsxs)` to the bare identifier `jsxs`, Pass F converts the call to JSX syntax:

```js
// before
jsxs('button', {
  onClick: function() { return u(l + 1); },
  children: ['clicked ', l, ' times'],
})

// after
<button onClick={function() { return u(l + 1); }}>
  clicked {l} times
</button>
```

The conversion handles: HTML string tags, React component references, props as JSX attributes, `children` arrays (string literals become JSX text, expressions become `{expr}`), and self-closing elements when there are no children.

### Pass G — remove Babel helpers and webpack internals

Five patterns are cleaned up unconditionally:

- **`arrayLikeToArray` helper** — the function `o(e, n)` that Pass E's slicedToArray expansion used to call. Detected by shape: a 2–4 statement body containing a `for` loop that constructs `Array(n)`. Removed.
- **`var n = {}`** — webpack's module-cache object. A `VariableDeclaration` where every declarator has an empty object `{}` as its init is treated as a webpack internal and removed.
- **`_typeof`** — Babel's lazy self-reassignment typeof polyfill. Detected as a 1-param function whose entire body is `return ((fnName = conditional), fnName(arg))`. Appears when the app uses `typeof` with Symbol handling. Removed.
- **`_defineProperty`** — Babel's property definition helper. Detected as a 3-param function containing `Object.defineProperty(obj, key, {value, enumerable, configurable, writable})` anywhere in its body. Appears when the app uses JSX spread or object spread. Removed.
- **`_objectSpreadPropsHelper`** — Babel's object spread props helper. Detected as a 2-param function whose first statement is `var t = Object.keys(e)` and whose body references `getOwnPropertySymbols`. Appears when the app uses `{...props}` JSX spread. Removed.

### Pass H — prune unused imports

After JSX recovery, `jsx` and `jsxs` are no longer identifiers in the code — they became `<tag>` syntax. A final scan collects all referenced identifiers and drops any named import specifiers that are no longer used.

## The role of CS-MAST

[CS-MAST](https://cs-mast.ss0x00.com) (Context-Stratified Merkelized AST Signatures) is a structural hashing scheme for JavaScript ASTs. Each node in the tree is hashed based on its code structure rather than its text, so the hash survives minification — renaming `useState` to `a` does not change the hash of the surrounding `CallExpression` pattern.

The baseline used by `--collisions` was generated from an experiment: 18 minimal React apps — one exercising each hook or API (`useState`, `useEffect`, `useRef`, `useMemo`, …) — were each rebuilt with every other hook injected. This produced 18 webpack bundles all sharing the same React runtime but differing in application code. Every bundle was then hashed with every possible combination of scat (signature category) parameters.

A signature that appears in **all 18 bundles** can only come from code that is present in every React app regardless of what the application does — that is, the React runtime itself. The set of those signatures, stored in `collisions.json`, is the baseline.

When `--collisions` points at that baseline, `refactorReact` hashes each webpack module's body against it. Any module whose body matches a baseline signature is library code and is dropped from the output. What remains is only the application code.

The baseline files are shipped in the `js-recon-cs-mast-s` sibling repository and are designed to be passed directly to `--collisions` as a directory:

```
js-recon-cs-mast-s/
└── baselines/
    └── react-webpack/
        └── lit-decl-loop-cond/
            └── collisions.json   ← the baseline
```

The `lit-decl-loop-cond` directory name reflects the scat configuration: only literal values, declarations, loop structures, and conditionals contribute to the hash. Identifiers and operator names are excluded, which is what makes the hash minification-stable.

For a richer baseline derived from a large per-feature corpus, you can also point `--collisions` at a per-feature results directory — a directory whose immediate subdirs each contain a `<scat>/collisions.json` file (one subdir per feature app). The tool reads only the one `lit-decl-loop-cond/collisions.json` per feature subdir, intersects the max-count signature sets across all features, and uses the intersection as the baseline. This works even when the full dataset is hundreds of GB:

```bash
js-recon refactor -t react-webpack \
  --collisions /path/to/react-webpack-feature-signatures/results \
  -o output_stripped
```

## Supported React features

The following React hooks and APIs have been tested against real webpack 5 + `@babel/preset-env` bundles and produce clean output with `--collisions`:

| Feature             | Recovered imports                                       | Notes                                              |
| ------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `useState`          | `react: useState`                                       | `const [a, b] = useState(x)` collapse (Pass E)     |
| `useEffect`         | `react: useEffect, useState`                            | Effect body and dependency array preserved         |
| `useRef`            | `react: useEffect, useRef, useState`                    | Ref object and DOM attachment preserved            |
| `useContext`        | `react: createContext, useContext, useState`            | Provider and consumer both recovered               |
| `useReducer`        | `react: useReducer, useState`                           | Reducer function and dispatch call preserved       |
| `useMemo`           | `react: useMemo, useState`                              | Memoized computation preserved                     |
| `useCallback`       | `react: useCallback, useState`                          | Stable callback reference preserved                |
| `useId`             | `react: useId, useState`, `react/jsx-runtime: Fragment` | Unique IDs for accessibility labels                |
| `useTransition`     | `react: useState, useTransition`                        | Concurrent mode transition                         |
| `useLayoutEffect`   | `react: useLayoutEffect, useRef, useState`              | Layout effect with DOM read                        |
| `useDeferredValue`  | `react: useDeferredValue, useState`                     | Deferred list rendering                            |
| `Fragment`          | `react: useState`, `react/jsx-runtime: Fragment`        | `<Fragment>` JSX element recovered                 |
| `Suspense` + `lazy` | `react: Suspense, lazy, useState`                       | Lazy component structure recovered; see note below |
| `StrictMode`        | `react: StrictMode, useState`                           | `<StrictMode>` element recovered                   |
| `Profiler`          | `react: Profiler, useState`                             | `<Profiler id="…" onRender={…}>` recovered         |
| `createContext`     | `react: createContext, useContext, useState`            | Full context pattern recovered                     |
| `memo`              | `react: memo, useState`                                 | `memo(Component)` wrapper recovered                |
| `forwardRef`        | `react: forwardRef, useRef, useState`                   | `forwardRef((props, ref) => …)` wrapper recovered  |

### Suspense + lazy note

The lazy-loaded chunk is referenced via webpack's runtime API (`__webpack_require__.e(chunkId).then(...)`). There is no mapping from the webpack chunk ID back to the original source path, so this expression is left as-is in the output. The `lazy()` call wrapping it is recovered normally:

```jsx title="output_stripped/index.js (app with lazy)"
const LazyComponent = lazy(() =>
    __webpack_require__.e(/* chunk ID */).then(/* ... */)
);
```

## What cannot be recovered

| Lost information                                | Why                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Variable names (`Counter`, `count`, `setCount`) | Erased by the minifier before bundling; not in the bundle at all                     |
| Arrow function syntax                           | `@babel/preset-env` compiles `() => x` to `function() { return x; }` before bundling |
| JSX source maps                                 | Not present unless the server exposes sourcemaps                                     |
| TypeScript types                                | Stripped at compile time                                                             |

The output is intended for **human review** during a security assessment. It is not runnable as-is (the stripped `./540.js` modules do not exist), and it should not be fed back into the `map` or `analyze` pipeline — those steps require the original downloaded chunks.

## Full command reference

```bash
# Full pipeline: download, then refactor with library stripping
js-recon run -u https://example.com -y -k
js-recon refactor -t react-webpack \
  --collisions ../js-recon-cs-mast-s \
  -o output_stripped

# Inspect the result
cat output_stripped/index.js

# Without --collisions: still strips slicedToArray and Babel helpers,
# but keeps library modules as numeric-ID files
js-recon refactor -t react-webpack -o output_full
```

See the [Refactor command reference](../../docs/modules/refactor.md) and the [React (webpack) refactor reference](../../docs/modules/refactor/react-webpack.md) for the full options table.
