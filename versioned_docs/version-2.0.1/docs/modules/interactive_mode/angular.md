---
sidebar_position: 5
---

# Interactive mode for Angular maps

Angular interactive mode reuses [Vue.js's command handler and UI](./vue-js.md) unchanged — every core command (`list`, `go`, `set`, `trace`, `esquery`, and the `list files`/`list file <file>` pair) is framework-agnostic. There are no Angular-specific commands or behavioral differences.

One thing worth knowing when navigating: the `esbuild` output produced by the Angular CLI isn't split into small per-function chunks the way React/Vue/Svelte chunks are — each `.js` file (`main-HASH.js`, lazy-route `chunk-HASH.js`) is emitted as a single whole-file chunk. This doesn't change command syntax, but it does mean `list files` / `list file <file>` and `go to <functionID>` will show you fewer, larger chunks than you'd see on a Next.js or Vue target, and `esquery`/`trace` scan a full file's AST per chunk rather than a single function's.

## Getting started

```bash
js-recon map <other options> -t angular -i
```

See [Interactive mode for Vue.js maps](./vue-js.md) for the full command reference, keybindings, and `-c`/`--command` headless usage — everything there applies to Angular as-is.
