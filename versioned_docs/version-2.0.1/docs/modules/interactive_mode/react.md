---
sidebar_position: 3
---

# Interactive mode for React maps

React interactive mode reuses [Vue.js's command handler and UI](./vue-js.md) unchanged — the underlying source file literally re-exports it, since every core command (`list`, `go`, `set`, `trace`, `esquery`, and the `list files`/`list file <file>` pair) is framework-agnostic once `mapped.json` exists. There are no React-specific commands or behavioral differences.

## Getting started

```bash
js-recon map <other options> -t react -i
```

See [Interactive mode for Vue.js maps](./vue-js.md) for the full command reference, keybindings, and `-c`/`--command` headless usage — everything there applies to React as-is.
