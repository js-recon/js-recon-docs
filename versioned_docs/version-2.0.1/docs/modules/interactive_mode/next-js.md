---
sidebar_position: 1
---

# Interactive mode for Next.js maps

The interactive mode for Next.js maps provides a terminal-based interface to explore and analyze the functions within your Next.js application. This guide will walk you through the features and commands available in this mode.

Interactive mode is also available for [Vue.js](./vue-js.md), [React](./react.md), [Svelte/Astro](./svelte-astro.md), and [Angular](./angular.md) maps — this page documents the UI, keybindings, and commands in full since the other frameworks share almost all of it; each framework's page only calls out what's different.

## Getting started

To launch the interactive mode, run the following command:

```bash
js-recon map <other options> -i
```

## User interface

The interactive mode interface is composed of three main components:

- **Title Box**: Displays the title "JS Recon Interactive Mode."
- **Output Box**: Shows the output of commands and function information. You can scroll through this box using the arrow keys when it's in focus.
- **Input Box**: This is where you type your commands.

## Keybindings

The following keybindings are available for navigation and control:

| Key             | Description                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `Ctrl+C` or `q` | Exit the interactive mode (when not in the input box). To exit from the input box, press `Esc` first. |
| `i`             | Focus the input box.                                                                                  |
| `Esc`           | When in the input box, focuses the output box.                                                        |
| `Up Arrow`      | In the input box, navigate to the previous command.                                                   |
| `Down Arrow`    | In the input box, navigate to the next command.                                                       |
| `Up Arrow`      | In the output box, scroll up.                                                                         |
| `Down Arrow`    | In the output box, scroll down.                                                                       |

### Line editing in the input box

The input box supports standard line-editor controls so you can correct typos or paste a long snippet without retyping:

| Key                        | Action                                 |
| -------------------------- | -------------------------------------- |
| `Left` / `Right`           | Move cursor one character              |
| `Ctrl+Left` / `Ctrl+Right` | Move cursor one word                   |
| `Home` / `Ctrl+A`          | Jump to start of line                  |
| `End` / `Ctrl+E`           | Jump to end of line                    |
| `Backspace`                | Delete the character before the cursor |
| `Delete`                   | Delete the character at the cursor     |
| `Ctrl+W`                   | Delete the previous word               |
| `Ctrl+U`                   | Delete from cursor to start of line    |
| `Ctrl+K`                   | Delete from cursor to end of line      |
| Paste (`Cmd+V` / `Ctrl+V`) | Inserts pasted text at the cursor      |

When the value is longer than the visible width, the input scrolls horizontally to keep the cursor in view.

### Copying text from the output box

The output pane no longer captures mouse events, so you can use your terminal's native text selection (click-drag to highlight, then `Cmd+C` / `Ctrl+Shift+C`) to copy chunk code, selectors, etc. Scrolling the output still uses the keyboard bindings above.

## Commands

Here is a list of available commands and their usage:

### `help`

Displays the help menu with a list of all available commands.

### `exit`

Exits the interactive mode.

### `clear`

Clears the content of the output box.

### `list`

Lists different types of information. Usage: `list <option>`

- `list fetch`: Lists all functions that contain `fetch` instances.
- `list axios`: Lists all functions that contain `axios` instances.
- `list all`: Lists all functions found in the application.
- `list desc`: List all functions with non-empty descriptions.
- `list nav`: Lists your function navigation history.
- `list server_actions`: Lists all discovered Next.js Server Actions, with route, body arguments, and source locations. Only available for Next.js — this reads server-action entries recorded by `resolveServerActions` (see [Map](../map.md)), which the other frameworks don't produce.
- `list exportnames <option>`: Lists export names for a chunk.
    - `list exportnames <chunkId>`: Lists export names for a specific chunk.
    - `list exportnames all`: Lists export names for all chunks.
    - `list exportnames nonempty`: Lists export names for all chunks that have non-empty export names.

### `go`

Navigates between functions. Usage: `go <option>`

- `go to <functionID>`: Displays the code for a specific function.
- `go back`: Navigates to the previously viewed function.
- `go ahead`: Navigates to the next function in your history.

### `set`

Sets configuration options. Usage: `set <option> <value>`

- `set funcwritefile <filename>`: Update the file location where function code will be written when using the `go to` command.
- `set writeimports [true/false]`: When using the `go *` command, also write all the imports of the function to the file
- `set funcdesc <functionId>`: Set the description of the provided function ID with the provided value
    - Example: `set funcdesc 1234 This function does something fishy`
    - This will set the description to `This function does something fishy`
    - Note that you don't need to provide the quotes for this. The tool detects the description based on spaces(` `)

### `trace`

Traces the imports for a given function. Usage: `trace <functionName>`

### `esquery`

Generates [ESQuery](https://github.com/estools/esquery) selectors from a pasted code snippet — handy when authoring a new AST rule against a real chunk you've already located. Usage:

```
esquery <chunkId|*> <code-snippet>
```

How it works:

1. The snippet is parsed with babel and re-emitted in compact mode (whitespace/comments stripped) — call this the **needle**.
2. Each AST node in the target chunk is also re-emitted in compact mode. Any node whose compact source contains the needle is a candidate.
3. Candidates that strictly contain another candidate are dropped, so the output is the **smallest** matching node — typically the actual call/assignment/expression you pasted.
4. For each surviving candidate the tool prints two selectors:
    - **loose** — type + the most distinguishing key (for example, `CallExpression[callee.name="fetch"]`). Paste this into a rule and broaden/narrow it as needed.
    - **strict** — same selector with the immediate children pinned by type (for example, `[arguments.0.type="TemplateLiteral"]`). Useful for checking whether an existing rule already covers the exact shape.

Pass `*` (or `all`) as the chunk id to scan every chunk in `mapped.json`. This is especially useful on minified production bundles where the chunk id changes between builds.

Examples:

```
esquery 1234 fetch("/api/posts")
esquery * fetch(`/api/docs/${file}`)
esquery * headingRef.value.innerHTML = "..."
```

The same command is available non-interactively via `-c`/`--command` on both `map` and `run`, and can be chained with `&&`:

```bash
js-recon map -d output/<host> -t vue -c "esquery * fetch(\`/api/posts\`) && esquery * v-html"
```
