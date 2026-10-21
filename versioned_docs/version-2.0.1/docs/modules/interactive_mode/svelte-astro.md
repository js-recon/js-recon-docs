---
sidebar_position: 4
---

# Interactive mode for Svelte/Astro maps

Svelte/Astro interactive mode reuses [Vue.js's command handler and UI](./vue-js.md) unchanged — both are Vite-based bundles with identical chunk structure, so every core command (`list`, `go`, `set`, `trace`, `esquery`, and the `list files`/`list file <file>` pair) behaves the same way. There are no Svelte/Astro-specific commands or behavioral differences.

## Getting started

```bash
js-recon map <other options> -t svelte -i
```

See [Interactive mode for Vue.js maps](./vue-js.md) for the full command reference, keybindings, and `-c`/`--command` headless usage — everything there applies to Svelte/Astro as-is.
