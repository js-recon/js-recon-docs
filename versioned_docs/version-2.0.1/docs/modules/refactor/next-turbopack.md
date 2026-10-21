---
sidebar_position: 4
---

# Next.js (Turbopack) Refactor

The Next.js Turbopack refactor (`-t next-turbopack`) converts a Next.js bundle produced by the Turbopack bundler into human-readable ES module files with recovered imports, exports, and JSX syntax. It handles both native Turbopack module formats and the webpack-style modules that coexist in Turbopack bundles.

## Usage

```bash
js-recon refactor -t next-turbopack [options]
```

See the [Refactor command reference](../refactor.md) for the full options table.

## How it works

A Next.js Turbopack build packs modules as named arrow-function entries inside a chunk. The refactor step identifies each module, strips the Turbopack runtime boilerplate, and writes one `.js` (or `.jsx`) file per module.

### Module formats

Turbopack bundles typically contain two kinds of module functions.

#### 3-param format (most modules)

```javascript
func_16624 = (runtime, module, exports) => {
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  Object.defineProperty(exports, "default", {
    enumerable: true,
    get: () => Component
  });
  var t = runtime.r(43476); // import
  var r = runtime.r(71645); // import
  function Component() { … }
};
```

The three parameters map to:

| Position    | Role    | Usage                                                                         |
| ----------- | ------- | ----------------------------------------------------------------------------- |
| `params[0]` | runtime | `runtime.r(N)` / `runtime.i(N)` — require/import another module by numeric ID |
| `params[1]` | module  | `module.exports = …` — CJS interop boilerplate                                |
| `params[2]` | exports | `Object.defineProperty(exports, "name", { get: fn })` — export registration   |

#### 1-param format (page component chunks)

Used for entry-point chunks that register a single default export:

```javascript
func_98765 = (runtime) => {
  runtime.i(43476);          // import module 43476 (side-effect only)
  runtime.s(["default", 0, () => Component]); // export default Component
  function Component() { … }
};
```

#### webpack-style format

Some modules in a Turbopack bundle use the webpack-style signature `(module, exports, require) => { … }`, with `require.d(exports, { … })` for export registration. The refactor handles these automatically alongside Turbopack modules.

### Transform passes

Each module is processed through a fixed sequence of passes:

#### Pass 1 — Export collection and cleanup

Recognises and converts several export forms to ES module `export` statements:

- `Object.defineProperty(exports, "name", { get: () => local })` → `export { local as name }`
- Turbopack IIFE batch export patterns → individual named exports
- `require.d(exports, { name: () => local })` (webpack-style) → `export { local as name }`
- `runtime.s(["name", 0, fn])` (1-param format) → `export const name = fn` / `export default fn`

Also strips Turbopack boilerplate:

- `Object.defineProperty(exports, "__esModule", …)` — ES module interop marker
- `require.r(exports)` — webpack ES-module marker
- `module.exports = exports.default` — CJS interop assignment
- `"use strict"` expression statements

Side-effect imports (`runtime.r(N)` in a sequence expression with no binding) become `import "./N.js"`.

#### Pass 2 — Require hoisting

`var x = runtime.r(N)` and `var x = runtime.i(N)` declarators are removed from the function body and replaced with `import * as x from "./N.js"` at the top of the output file.

#### Pass 3 — Inline require replacement

Any remaining `runtime.r(N)` or `runtime.i(N)` call sites inside nested functions are replaced with the corresponding hoisted identifier (or a synthesised `_jsr_module_N` identifier, which also emits a new import statement).

#### Pass E — slicedToArray collapse

Babel's compiled array destructure expansion is collapsed back to clean destructuring:

```javascript
// Before
var _ref = _slicedToArray(expr, 2),
    a = _ref[0],
    b = _ref[1];
// After
var [a, b] = expr;
```

#### Pass F — JSX recovery

`jsx(tag, props)` / `jsxs(tag, props)` / `jsxDEV(tag, props)` calls are converted to JSX element syntax, including nested elements, spread props, and `children` arrays.

#### Pass G — Babel helper removal

Strips top-level Babel runtime helper declarations (`_typeof`, `_defineProperty`, `_slicedToArray`, `_objectSpread2`, etc.) that are inlined by Babel but add noise to the output.

#### Pass H — Prune unused imports

After JSX recovery, import specifiers for `jsx`, `jsxs`, and `Fragment` that are no longer referenced are removed.

## Output

Each module is written to `<output-dir>/<moduleId>.js` (or `.jsx` when JSX is recovered). Numeric IDs come from the `func_NNN` prefix in the bundle.

Modules that contain only CJS interop boilerplate (`module.exports = runtime.r(N)`) are skipped — they are transparent re-exports of another module, and the caller should import that module directly.

## Remote signature stripping

By default, when running `refactor -t next-turbopack` without `--collisions`, the tool automatically downloads CS-MAST signature data and uses it to strip Next.js framework modules from the output — no local baseline clone required. The bucket prefix used is `next/turbopack/large-0.1.8`, cached locally under `~/.js-recon/refactor/signature_cache/next/turbopack/large-0.1.8/`.

For the shared mechanics (configuration, cache layout, `--sq`, `--scat`, `--remote-collisions`, cache-control flags), see [Remote signature stripping](./remote-signatures.md).

### Library module classification

For each module captured from `mapped.json` — both the 3-param/1-param Turbopack formats and any webpack-style modules coexisting in the same bundle:

1. The module's function body is serialised to source with `@babel/generator`.
2. The body is hashed with `cs_mast_init({ scat: ["lit","decl","loop","cond"], … })`, producing a signature for every actively hashed sub-tree.
3. The fraction of sub-tree signatures that match the remote baseline is computed.
4. If that fraction is at or above the 51% classification threshold, the module is flagged as framework/library code.
5. Library-flagged modules are logged (`[-] Module N matches library baseline — skipping`) and not written to disk. Application-specific modules are written normally.

**Sample size note:** the Turbopack dataset was generated from a 43-app baseline (versus 9 for `next-webpack`), so the default `--sq 100` — requiring a signature to appear in every sampled app — is a stricter bar and can occasionally yield no usable signatures at that threshold. If a run reports an empty intersection, retry with a lower `--sq` (for example `--sq 80`).

### Local baseline (`--collisions`)

As an alternative to the remote HuggingFace dataset, you can pass a local `--collisions` path. This accepts:

- A direct `collisions.json` file path
- A standard baseline directory (resolved via `<dir>/baselines/next-turbopack/lit-decl-loop-cond/collisions.json`)
- A per-feature results directory with the layout `<dir>/<feature>/lit-decl-loop-cond/collisions.json`

```bash
js-recon refactor -t next-turbopack --collisions ./js-recon-cs-mast-s -o output_refactored
```

## Example output

Input chunk (abbreviated):

```javascript
func_16624 = (e, t, r) => {
    "use strict";
    Object.defineProperty(r, "__esModule", { value: true });
    Object.defineProperty(r, "default", {
        enumerable: true,
        get: () => PostPage,
    });
    var n = e.r(18566);
    var a = e.r(71645);
    function PostPage() {
        let id = (0, n.useParams)().id;
        let [post, setPost] = (0, a.useState)(null);
        return (0, jsxs)("main", {
            children: [(0, jsx)("h1", { children: post.title })],
        });
    }
};
```

Output (`16624.jsx`):

```javascript
import * as n from "./18566.js";
import * as a from "./71645.js";
export default (function PostPage() {
    let id = (0, n.useParams)().id;
    let [post, setPost] = (0, a.useState)(null);
    return (
        <main>
            <h1>{post.title}</h1>
        </main>
    );
});
```
