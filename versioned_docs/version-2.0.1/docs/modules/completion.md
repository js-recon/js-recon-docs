---
sidebar_position: 19
---

# Completion command

The `completion` command generates a shell completion script for `js-recon`. Once installed, pressing <kbd>Tab</kbd> after `js-recon ` lists all available subcommands, and pressing <kbd>Tab</kbd> after `js-recon <command> ` lists all flags for that subcommand.

Supported shells: **bash**, **zsh**, **fish**.

## Automatic install

If your login shell (`$SHELL`) is bash, zsh, or fish, completion is installed automatically the
first time you `npm install -g @js-recon/js-recon` (or install via Homebrew, or the Docker image is
rebuilt) — no manual step needed. It's re-installed the same way on every upgrade too, so newly
added subcommands and flags show up in completion automatically. If `$SHELL` is unset or set to an
unsupported shell, the installer skips silently and prints a reminder to run the command below
manually.

## Manual usage

```bash
js-recon completion <shell>
```

Running this installs completion for you — there is no manual copy/paste step, and it does **not**
paste a large script into your shell's rc file. Useful if the automatic install was skipped
(unsupported shell, or `$SHELL` wasn't set at install time), or to force a refresh after a manual
build.

## Installing completion

### Bash

```bash
js-recon completion bash
```

This writes the full completion script to `~/.js-recon/completion/js-recon.bash` and adds a small,
fixed loader entry to `~/.bashrc` (only if it isn't already there):

```bash
# JS Recon shell completion
eval "$(js-recon completion bash --rc-file)"
```

Then reload your shell:

```bash
source ~/.bashrc
```

### Zsh

```bash
js-recon completion zsh
```

This writes the full completion script to `~/.js-recon/completion/_js-recon` and adds the same kind
of small loader entry to `~/.zshrc`:

```zsh
# JS Recon shell completion
eval "$(js-recon completion zsh --rc-file)"
```

Then reload your shell:

```bash
source ~/.zshrc
```

### Fish

```bash
js-recon completion fish
```

This writes the completion script directly to `~/.config/fish/completions/js-recon.fish`. Fish
auto-loads anything in that directory, so no rc-file entry is needed — nothing else to run.

### Re-running

`js-recon completion <shell>` is safe to re-run any time (for example, after upgrading js-recon to pick up
newly added subcommands/flags) — it overwrites the installed script and only adds the rc-file entry
once, never duplicating it.

### The `--rc-file` flag

`--rc-file` prints a small loader snippet instead of installing anything — it's what the generated
rc-file entry above actually calls at shell startup (`eval "$(js-recon completion <shell> --rc-file)"`)
to load the real script from `~/.js-recon/completion/`. You shouldn't need to run it directly; it
exists so the rc file itself never has to contain the full (and ever-growing) completion script.
`--rc-file` isn't applicable to fish, since fish needs no rc-file entry at all.

## What gets completed

| When you type…         | Tab shows…                                    |
| ---------------------- | --------------------------------------------- |
| `js-recon `            | All subcommands (lazyload, run, map, etc.)    |
| `js-recon run `        | All flags for the `run` command               |
| `js-recon map `        | All flags for the `map` command               |
| `js-recon completion ` | Available shell names (`bash`, `zsh`, `fish`) |
| `js-recon run --url `  | No further suggestions (free-form argument)   |

Every subcommand and every flag registered in `src/index.ts` is covered.

## Example session

```bash
$ js-recon <TAB>
analyze      proxy        completion   cs-mast      endpoints    fingerprint
lazyload     load         map          mcp          refactor     report
run          sourcemaps   strings

$ js-recon run --<TAB>
--ai                      --ai-endpoint             --ai-provider
--ai-threads              --proxy-config            --ignore-proxy-env
--cache-file              --cache-only              --command
--cs-mast-tech-detect-threshold  --disable-cache     --exclude-methods
--include-methods         --insecure                --lazyload-timeout
--list-methods            --map-openapi-chunk-tag   --max-heap
--max-iterations          --max-js-size             --max-pages
--model                   --ngql                    --no-graphql
--no-sandbox              --ai-api-key              --output
--research                --research-output         --rules
--scope                   --secrets                 --sourcemap-dir
--strict-scope            --threads                 --timeout
--trufflehog              --url                     --yes
```
