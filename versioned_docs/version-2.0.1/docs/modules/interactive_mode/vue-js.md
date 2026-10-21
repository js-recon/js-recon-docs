---
sidebar_position: 2
---

# Interactive mode for Vue.js maps

The interactive mode for Vue.js maps uses the same terminal UI, keybindings, and line-editing as [Next.js](./next-js.md) — see that page for the Title/Output/Input box layout, all keybindings (`Ctrl+C`/`q`/`i`/`Esc`/arrow keys), and line-editing controls (`Ctrl+A`/`Ctrl+E`/`Ctrl+W`/`Ctrl+U`/`Ctrl+K`/word-jump/paste). None of that differs for Vue.

React, Svelte/Astro, and Angular interactive mode all reuse this same command handler unchanged (see their pages for the one-line summary) — so this page is the canonical command reference for all four of those frameworks.

## Getting started

```bash
js-recon map <other options> -t vue -i
```

## Commands

`help`, `exit`, `clear`, `go`, `set`, `trace`, and `esquery` behave identically to Next.js — see the [Next.js command reference](./next-js.md#commands) for full details on those.

`list` differs from Next.js because Vue/Vite chunks aren't split by `fetch`/`axios` call sites the way Next.js chunks are. Usage: `list <option>`

- `list all`: Lists all functions found in the application.
- `list desc`: List all functions with non-empty descriptions.
- `list nav`: Lists your function navigation history.
- `list files`: Lists every unique source file, with a chunk count for each — useful for orienting yourself in a large Vite bundle before diving into a specific file.
- `list file <file>`: Lists every chunk (function) that originates from a specific source file.
- `list exportnames <option>`: Lists export names for a chunk.
    - `list exportnames <chunkId>`: Lists export names for a specific chunk.
    - `list exportnames all`: Lists export names for all chunks.
    - `list exportnames nonempty`: Lists export names for all chunks that have non-empty export names.

Note there is no `list fetch`, `list axios`, or `list server_actions` — those are Next.js-only concepts. Use `esquery` to locate `fetch`/HTTP-client call sites in Vue chunks instead (see the example below).

### Headless usage (`-c`/`--command`)

Same as Next.js, `-c`/`--command` on `map` or `run` runs commands non-interactively and chains with `&&`:

```bash
js-recon map -d output/<host> -t vue -c "list files && esquery * fetch(\`/api/posts\`) && esquery * v-html"
```
