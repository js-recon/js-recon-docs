---
sidebar_position: 3
---

# Next.js (webpack) Refactor

The `-t next-webpack` technology refactors Next.js webpack bundle chunks into readable ES module files. It handles the minified module wrapper format emitted by Next.js when using the webpack bundler and recovers named exports, default exports, and import relationships.

## Module format

Next.js webpack bundles store each module as a named function assignment in the chunk. In `mapped.json`, each entry looks like:

```
func_3899 = (module, exports, require) => {
  "use strict";
  // module body
}
```

In the minified bundle, the parameter names are shortened to single letters (`e`, `t`, `r`):

```
func_3899=(e,t,r)=>{"use strict";r.d(t,{foo:()=>bar});var bar=42}
```

The `mapped.json` produced by the `map` command stores the full `func_NNN = ...` assignment. The refactor tool parses the assignment expression and extracts the arrow function for transformation.

**Parameter order** (webpack, not turbopack):

| Position    | Minified | Role                                                      |
| ----------- | -------- | --------------------------------------------------------- |
| `params[0]` | `e`      | `module` — module object; `e.exports = X` for CJS exports |
| `params[1]` | `t`      | `exports` — export target for ODP / `require.d`           |
| `params[2]` | `r`      | `require` — import function; `r(N)` imports module N      |

Module arity varies:

| Params | Frequency | Notes                                            |
| ------ | --------- | ------------------------------------------------ |
| 3      | ~67%      | Full module, exports + require                   |
| 2      | ~29%      | Module + exports only (no cross-module requires) |
| 1      | ~2%       | Module only (CJS-only modules)                   |
| 0      | ~2%       | Empty modules — skipped                          |

## Wrapper form varies by webpack/SWC version

The module wrapper shown above is the arrow-function form. A second, equally common form appears when the original bundle module was itself a `function` expression rather than an arrow function — the `map` step synthesizes it as a named function declaration:

```
function webpack_3899 (e, t, r) {
  "use strict";
  r.d(t, { foo: () => bar });
  var bar = 42;
}
```

Both forms are recognized and refactored identically; the wrapper form has no effect on the output. Which form a bundle uses depends on the webpack/SWC configuration that produced it, not on the module's content.

## Transform passes

### Pass 1 — export collection and boilerplate removal

The pass scans each top-level statement and sequence sub-expression to:

**Collect named exports** from:

- `Object.defineProperty(exports, "name", { get: () => localVar })` — ODP named export
- `require.d(exports, { name: () => localVar, ... })` — webpack `require.d` batch
- `for (var k in mapVar) Object.defineProperty(exports, k, ...)` — for-in loop batch

**Collect default exports** from:

- `module.exports = VALUE` — becomes `export default VALUE`
- `module.exports = require(N)` — becomes `export * from './N.js'`

**Collect side-effect imports** from:

- `require(N);` standalone statement — becomes `import './N.js'`
- `require(N)` inside a sequence expression — becomes `import './N.js'`

**Drop boilerplate**:

- `Object.defineProperty(exports, "__esModule", ...)` — interop marker, dropped
- `require.r(exports)` — ES module marker, dropped
- `("function"==typeof exports.default || ...) && (exports.default.__esModule) && (module.exports = exports.default)` — CJS interop copy-back, dropped
- `"use strict"` directive expressions — dropped

### Pass 2 — require hoisting

`var x = require(N)` declarators are removed from the function body and replaced with `import * as x from './N.js'` at the top of the output file.

### Pass 3 — inline require replacement

Any remaining `require(N)` call-sites in the body (inside function expressions, conditionals, etc.) are replaced with the hoisted namespace identifier. If a module ID has not been seen before, a new `import * as _jsr_module_N from './N.js'` is synthesised.

### Passes E / F / G / H — cleanup

Shared with the turbopack transform:

- **E**: Collapses Babel `_slicedToArray` / `_arrayLikeToArray` expansions back into array destructure patterns.
- **F**: Recovers JSX — converts `jsx(tag, props)` / `jsxs(tag, props)` / `jsxDEV(tag, props)` calls into JSX element syntax.
- **G**: Strips Babel runtime helpers (`_typeof`, `_defineProperty`, `_objectSpread2`, etc.) that are injected into each chunk at compile time.
- **H**: Prunes named import specifiers that are no longer referenced after JSX recovery. Side-effect imports are always kept.

## Example

**Input** (from `mapped.json`):

```js
func_20 = (e, t, r) => {
    "use strict";
    var n = r(603);
    var u = r(2697);
    Object.defineProperty(t, "__esModule", { value: !0 });
    Object.defineProperty(t, "normalizePathTrailingSlash", {
        enumerable: !0,
        get: function () {
            return a;
        },
    });
    function a(e) {
        if (!e.startsWith("/")) return e;
        var { pathname: t, query: r, hash: a } = (0, u.parsePath)(e);
        return `${(0, n.removeTrailingSlash)(t)}${r}${a}`;
    }
    ("function" == typeof t.default ||
        ("object" == typeof t.default && null !== t.default)) &&
        void 0 === t.default.__esModule &&
        (Object.defineProperty(t.default, "__esModule", { value: !0 }),
        Object.assign(t.default, t),
        (e.exports = t.default));
};
```

**Output** (`20.js`):

```js
import * as n from "./603.js";
import * as u from "./2697.js";

let a = (e) => {
    if (!e.startsWith("/")) return e;
    let { pathname: t, query: r, hash: a } = (0, u.parsePath)(e);
    return `${(0, n.removeTrailingSlash)(t)}${r}${a}`;
};

export { a as normalizePathTrailingSlash };
```

## Usage

```bash
js-recon refactor -m mapped.json -t next-webpack -o output_refactored
```

## Output

One `.js` file per module ID, formatted with Prettier. Empty modules (0-param functions `()=>{}`) are skipped. Each file uses ES module syntax and can be opened in an IDE or passed to static analysis tools.

## Remote signature stripping

By default, when running `refactor -t next-webpack` without `--collisions`, the tool automatically downloads CS-MAST signature data and uses it to strip Next.js framework modules from the output — no local baseline clone required. The bucket prefix used is `next/webpack/large-0.1.8`, cached locally under `~/.js-recon/refactor/signature_cache/next/webpack/large-0.1.8/`.

For the shared mechanics (configuration, cache layout, `--sq`, `--scat`, `--remote-collisions`, cache-control flags), see [Remote signature stripping](./remote-signatures.md).

### Library module classification

For each Next.js webpack module captured from `mapped.json`:

1. The module's function body is serialised to source with `@babel/generator`.
2. The body is hashed with `cs_mast_init({ scat: ["lit","decl","loop","cond"], … })`, producing a signature for every actively hashed sub-tree.
3. The fraction of sub-tree signatures that match the remote baseline is computed.
4. If that fraction is at or above the 51% classification threshold, the module is flagged as framework/library code.
5. Library-flagged modules are logged (`[-] Module N matches library baseline — skipping`) and not written to disk. Application-specific modules are written normally.

The 51% threshold ensures that modules which are almost entirely Next.js framework code (close to 100% matching sub-trees) are correctly classified, while modules that happen to share only a small number of common patterns with the baseline are left untouched.

### Local baseline (`--collisions`)

As an alternative to the remote HuggingFace dataset, you can pass a local `--collisions` path. This accepts:

- A direct `collisions.json` file path
- A standard baseline directory (resolved via `<dir>/baselines/next-webpack/lit-decl-loop-cond/collisions.json`)
- A per-feature results directory with the layout `<dir>/<feature>/lit-decl-loop-cond/collisions.json`

```bash
js-recon refactor -t next-webpack --collisions ./js-recon-cs-mast-s -o output_refactored
```

---

## Notes

- The `mapped.json` must be generated from a Next.js webpack bundle (not turbopack). Use `-t next-turbopack` for turbopack bundles.
- Modules that export only via the CJS interop copy-back pattern (`module.exports = exports.default`) produce empty files and are skipped — the importer should import from the re-exported module directly.
- 1-param modules (module-only, no exports/require param) preserve their entire body as-is, since no standard export pattern can be detected.
