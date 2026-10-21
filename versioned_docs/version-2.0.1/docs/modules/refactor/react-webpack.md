---
sidebar_position: 1
---

# React (webpack) Refactor

The React webpack refactor (`-t react-webpack`) converts a webpack-bundled React application into a set of individual, human-readable ES module files. It is designed for bundles where all modules are packed into a single file under a numeric module map — the standard output produced by webpack 5 for React projects.

## Usage

```bash
js-recon refactor -t react-webpack [options]
```

See the [Refactor command reference](../refactor.md) for the full options table.

## How it works

A typical webpack React bundle wraps everything inside an immediately invoked function expression (IIFE):

```javascript
(() => {
  "use strict";
  var e = {
    540: (module, exports, require) => { /* React */ },
    287: (module, exports, require) => { /* react-dom */ },
    848: (module, exports, require) => { /* react/jsx-runtime */ },
    // … more modules …
  };
  // webpack require helper
  function t(id) { … }
  // top-level bootstrap
  var r = t(540), l = t(338), a = t(848);
  function App() { … }
  createRoot(document.getElementById("root")).render(<App />);
})();
```

The refactor step processes this structure in two stages.

### Stage 1 — Module splitting

The numeric module map (`var e = { 540: fn, … }`) is identified and each entry is extracted into its own file named `<moduleId>.js`. For every module function the transform:

1. Converts `module.exports = require(N)` to `export * from "./N.js"` (transparent re-export).
2. Converts `exports.<prop> = <value>` assignments to named ES module exports (`export const`, `export function`, `export { … as … }`).
3. Hoists `var x = require(N)` declarations to `import * as x from "./N.js"` at the top of the file.
4. Replaces any remaining inline `require(N)` calls with the hoisted import identifier.
5. Converts webpack async chunk-loading expressions to true dynamic imports:
   `__webpack_require__.e(N).then(__webpack_require__.bind(__webpack_require__, N))` → `import('./N.js')`
6. Strips the outer module function wrapper so the file is plain ES module code.

### Stage 2 — Entrypoint extraction (`index.js`)

Everything in the IIFE body that is **not** part of the numeric module map is written to `index.js`. Before writing, three additional passes clean up webpack-internal artifacts:

1. **Require-helper removal** — the webpack runtime function that resolves module IDs (recognisable by its `return (moduleMap[id](mod, mod.exports, fn), mod.exports)` return shape) is detected and dropped entirely.
2. **Top-level require hoisting** — statements like `var r = t(540), l = t(338)` are converted to `import * as r from "./540.js"` etc.
3. **Recursive require replacement** — any remaining `requireFn(N)` calls inside other functions in the file are replaced with the corresponding import identifier.

The result is that `index.js` contains only application logic — utility functions, root component definitions, and the `ReactDOM.render()` / `createRoot().render()` call — expressed in standard ES module syntax.

### Stage 3 — Route-aware component renaming

After library imports are resolved (Pass D), a final pass (`renameRouteComponents`) renames minified lazy-component variables to descriptive PascalCase names based on their `<Route path="…">` attributes:

- `/` → `Home`
- `/post/:id` → `Post`
- `/admin/users` → `AdminUsers`
- `/admin/index` → `AdminDashboard`

The Suspense fallback component is renamed to `Loading` and the top-level App function to `App`. Renaming uses Babel's `scope.rename` so all references (JSX tags and identifiers) are updated consistently.

## Output structure

```
output_refactored/
├── index.js   ← IIFE entrypoint: bootstrap code, root component, render call
├── 20.js      ← individual webpack modules, one file per numeric module ID
├── 287.js
├── 338.js
├── 540.js
├── 848.js
└── …
```

The module files use `import`/`export` so they can be opened in any IDE with full cross-reference support, or piped into other static-analysis tools.

## Example

Running the full pipeline and then refactoring:

```bash
js-recon run -u https://example.com -y -k
js-recon refactor -t react-webpack
```

Inspect the entrypoint:

```bash
cat output_refactored/index.js
```

Expected to see clean ES module imports at the top, followed by the application's own functions and the `render()` call — no webpack runtime code.

## Remote signature stripping

By default, when running `refactor -t react-webpack` without `--collisions`, the tool automatically downloads CS-MAST signature data and uses it to strip library modules — no local baseline clone required. The bucket prefix used is `react/webpack/small`, cached locally under `~/.js-recon/refactor/signature_cache/react/webpack/small/`.

For the full mechanics (configuration, cache layout, `--sq`, `--scat`, `--remote-collisions`, cache-control flags), see [Remote signature stripping](./remote-signatures.md).

---

## Library module stripping (with `--collisions`)

The `--collisions <file>` flag enables a second pass that classifies every numeric webpack module as either _library code_ (for example, React, React-DOM, scheduler, `react/jsx-runtime`) or _user code_, and **drops the library modules entirely** from the output. Only `index.js` (the application entry) is written.

This pass relies on a precomputed cross-app baseline of CS-MAST signatures generated by the [`cs-mast`](../cs-mast.md) subcommand. The intuition: the React runtime is byte-for-byte identical across applications that target the same React/webpack/babel toolchain, so its AST signatures collide across every bundle in the baseline. Application code does not.

### Where the baseline comes from

The baseline `collisions.json` is the output of an experiment in the `js-recon-research` repo: 18 minimal React-feature apps (one per hook/API) were each rebuilt with every other feature injected into them, served, downloaded, and hashed with `cs-mast --all-scat-permutations`. For each scat permutation, signatures appearing in **all 18** bundles are emitted to `feature-signatures/<feature>/<scat-combo>/collisions.json`. Any of those files can be passed to `--collisions`.

The refactor pass uses scat = `lit,decl,loop,cond` internally, so you should point `--collisions` at the matching `<feature>/lit-decl-loop-cond/collisions.json` file. The "feature" choice doesn't matter for stripping — all 18 features share the same baseline.

### How the classifier works

For each captured webpack module:

1. The module's function body is serialised back to source with `@babel/generator`.
2. The body is rehashed with `cs_mast_init({ scat: ["lit","decl","loop","cond"], … })`. This produces a signature for every actively hashed sub-tree of that body.
3. If **any** of those sub-tree signatures is present in the baseline set (that is, `count` equals the maximum count in `collisions.json`, which is the across-all-apps count), the module is flagged as library code.
4. Library-flagged modules are logged (`[-] Module N matches library baseline — skipping`) and not written to disk.

The implementation lives in `moduleIsLibrary()` in `src/refactor/react/index.ts`. The collisions file is loaded once in `src/refactor/index.ts` and the resulting `Set<string>` is threaded into `refactorReact()`.

### Example

The friendliest invocation: point `--collisions` at the `js-recon-cs-mast-s/` baseline repository — the right `collisions.json` is resolved automatically from `-t`.

```bash
js-recon refactor -t react-webpack \
  --collisions ../js-recon-cs-mast-s \
  -o output_stripped
```

`--collisions` also accepts an explicit file path, useful when iterating on a new baseline:

```bash
js-recon refactor -t react-webpack \
  --collisions /path/to/feature-signatures/01-usestate-hook-webpack/lit-decl-loop-cond/collisions.json \
  -o output_stripped
```

`--collisions` resolves its argument in one of three ways:

1. **Direct file path** — reads the file and takes the max-count signatures from it.
2. **Standard directory** — tries (in order) `<dir>/baselines/<tech>/<scat>/collisions.json`, `<dir>/<tech>/<scat>/collisions.json`, `<dir>/<scat>/collisions.json`, then `<dir>/collisions.json`. The scat-combo directory for `react-webpack` is `lit-decl-loop-cond`.
3. **Per-feature results directory** — when the directory's immediate subdirs each contain `<scat>/collisions.json` entries (one subdir per feature), the resolver loads one `lit-decl-loop-cond/collisions.json` per feature subdir and **intersects** the max-count signature sets. Only O(features) files are read regardless of how large the dataset is. Signatures present in every feature's max-count set are definitionally library code.

The third form lets you point `--collisions` at a large per-feature corpus, for example a directory laid out like:

```
react-webpack-feature-signatures/results/
├── 01-usestate-hook-webpack/
│   └── lit-decl-loop-cond/
│       └── collisions.json
├── 02-useeffect-hook-webpack/
│   └── lit-decl-loop-cond/
│       └── collisions.json
│   …
└── 18-forwardref-webpack/
    └── lit-decl-loop-cond/
        └── collisions.json
```

```bash
js-recon refactor -t react-webpack \
  --collisions react-webpack-feature-signatures/results \
  -o output_stripped
```

The tool reads only the 18 `lit-decl-loop-cond/collisions.json` files, intersects them, and uses the result — even if the full dataset is hundreds of GB.

For a stock single-page React app (for example, a `useState` counter compiled with webpack 5 + `@babel/preset-env`), the result is one file:

```
output_stripped/
└── index.js          # ~2 KB; contains the root component and the
                      # createRoot(...).render(...) call
```

versus the default refactor output of ten files totalling ~240 KB.

### Caveats

- Library detection is **opt-in via the baseline you provide**. Pointing `--collisions` at a baseline from a different toolchain (different React version, different bundler, different babel target) will under- or over-match.
- Modules whose body parse fails are silently treated as non-library and emitted normally.

## Version detection (`--detect-version`)

The `--detect-version` flag automatically identifies the React version embedded in the bundle and uses it to pin `react` and `react-dom` in the refactored output's `package.json`.

```bash
js-recon refactor -t react-webpack \
  -m mapped.json \
  -o output/ \
  --detect-version
```

When enabled, the tool:

1. Selects one or more scat configurations to use for detection (see `--detect-version-config` below).
2. For each selected scat config, generates CS-MAST structural signatures from every code unit in the mapped bundle (plus vendor chunks for webpack code-split apps).
3. For each React version available in the dataset (react-0.12 through react-19), fetches a list of **reliable signatures** — sub-tree hashes that appear in every build of that version but not in any other. These are downloaded from the `shriyanss/cs-mast-s-dataset` HuggingFace bucket and cached locally with a 7-day TTL.
4. Sums match counts across all scat configs per version. The version with the highest total is reported as the detected React version.
5. Updates `package.json` in the refactored output to pin the detected version (for example, `react@^18.3.1`) instead of the default `^18.3.1`.

Detection results are printed to the console:

```
[✓] Detected React version: react-18 (262 signature matches)
[i] Using detected React version react-18 in package.json (react@^18.3.1)
```

### `--detect-version-config`

Controls which scat configurations are used for detection. Accepts:

- **`dynamic`** (default) — the tool automatically selects up to `--detect-version-dynamic-threshold` scat configs that have non-empty reliable signatures across **all** known React versions. The selected configs are cached in `~/.js-recon/refactor/config.json` and reused on subsequent runs.
- **Comma-separated scat categories** (for example, `lit,decl,loop,cond`) — uses exactly that one scat config. The tool validates that reliable signatures exist for all known versions; if any version has an empty file, the tool exits with code 26.

```bash
# Dynamic mode (default): auto-select reliable configs
js-recon refactor -t react-webpack -m mapped.json -o out/ --detect-version

# Static mode: use a specific scat config
js-recon refactor -t react-webpack -m mapped.json -o out/ \
  --detect-version --detect-version-config lit,decl,loop,cond
```

### `--detect-version-dynamic-threshold`

The maximum number of scat configs to select in dynamic mode. Defaults to `3`. Must be a positive integer. Using more configs provides more signature evidence and can improve detection accuracy for bundles with sparse signatures.

### `--detect-version-dynamic-conf-purge`

Clears the cached dynamic scat config selection from `~/.js-recon/refactor/config.json` and recomputes it on this run. Use this if the HuggingFace dataset has been updated with new scat config data.

**Cache locations:**

- Signature cache: `~/.js-recon/refactor/version_sigs_cache/<bundler>/<version>/<scat>/reliable_signatures.json`
- Dynamic config cache: `~/.js-recon/refactor/config.json` (`dynamicVersionDetectionScatConfig` field)

**Dataset coverage:** react-0.12 through react-19 (8 versions for webpack). Older versions (0.11–0.13) are in the dataset for webpack but lack `react-dom` as a separate package.

## Supported React features

The following React hooks and APIs have been validated against webpack 5 + `@babel/preset-env` bundles:

| Feature             | Recovered import sources                | Pass E collapse                    |
| ------------------- | --------------------------------------- | ---------------------------------- |
| `useState`          | `react`                                 | Yes — `const [a, b] = useState(x)` |
| `useEffect`         | `react`                                 | No                                 |
| `useRef`            | `react`                                 | No                                 |
| `useContext`        | `react`                                 | No                                 |
| `useReducer`        | `react`                                 | Yes                                |
| `useMemo`           | `react`                                 | No                                 |
| `useCallback`       | `react`                                 | No                                 |
| `useId`             | `react`, `react/jsx-runtime` (Fragment) | No                                 |
| `useTransition`     | `react`                                 | Yes                                |
| `useLayoutEffect`   | `react`                                 | No                                 |
| `useDeferredValue`  | `react`                                 | No                                 |
| `Fragment`          | `react`, `react/jsx-runtime`            | No                                 |
| `Suspense` + `lazy` | `react`, `react/jsx-runtime`            | No; chunk IDs → `import('./N.js')` |
| `StrictMode`        | `react`                                 | No                                 |
| `Profiler`          | `react`                                 | No                                 |
| `createContext`     | `react`                                 | No                                 |
| `memo`              | `react`, `react/jsx-runtime`            | No                                 |
| `forwardRef`        | `react`, `react/jsx-runtime`            | No                                 |

**Lazy component note:** webpack's async chunk-loading expression `__webpack_require__.e(N).then(__webpack_require__.bind(__webpack_require__, N))` is automatically converted to `import('./N.js')` (Pass 4.5). The numeric chunk ID is preserved in the output path; there is no reverse-mapping to the original source file name, but the dynamic import is syntactically valid and the component loads correctly in any ES module environment.

## Notes

- The refactor output is intended for **human review** only. Do not feed it back into the `map` or `analyze` pipeline; those steps require the original downloaded chunks.
- Modules with more than three parameters or alphanumeric string module IDs are skipped with a warning. These shapes are not yet researched.
- Prettier formatting is applied automatically to all output files.
- Vite/Rollup bundles do not use the numeric module map pattern. If zero modules are found, the bundle is likely not webpack-based.
