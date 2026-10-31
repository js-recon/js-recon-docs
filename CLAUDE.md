# JS Recon Docs — Documentation Guidelines

## Directory structure

```
docs/
├── docs/                         ← Reference documentation
│   ├── README.md                 ← Introduction            (sidebar_position: 1)
│   ├── installation.md           ← npm/Homebrew install    (sidebar_position: 2)
│   ├── docker-installation.md    ← Docker install          (sidebar_position: 3)
│   ├── framework-support.md      ← Per-module compat table (sidebar_position: 4)
│   ├── configuration.md          ← config.yaml/precedence  (sidebar_position: 5)
│   ├── modules/                  ← Module command reference (category position: 6)
│   │   ├── run.md                ← Orchestrator            (pos 1)
│   │   ├── lazyload.md           ← JS downloader           (pos 2)
│   │   ├── lazyload/             ← Lazyload sub-pages      (pos 3)
│   │   │   └── lazyload-methods.md
│   │   ├── strings.md            ← String/secret extractor (pos 4)
│   │   ├── map.md                ← Function mapper         (pos 5)
│   │   ├── interactive_mode/     ← map's interactive shell (pos 6)
│   │   │   ├── next-js.md            (pos 1)
│   │   │   ├── vue-js.md             (pos 2)
│   │   │   ├── react.md              (pos 3)
│   │   │   ├── svelte-astro.md       (pos 4)
│   │   │   └── angular.md            (pos 5)
│   │   ├── endpoints.md          ← Route extractor         (pos 7)
│   │   ├── analyze.md            ← Static-analysis runner  (pos 8)
│   │   ├── report.md             ← HTML report generator   (pos 9)
│   │   ├── refactor.md           ← Chunk decompiler        (pos 10)
│   │   ├── refactor/             ← Tech-specific refactor  (pos 11)
│   │   │   ├── react-webpack.md      (pos 1)
│   │   │   ├── react-vite.md         (pos 2)
│   │   │   ├── next-webpack.md       (pos 3)
│   │   │   ├── next-turbopack.md     (pos 4)
│   │   │   ├── vue-webpack.md        (pos 5)
│   │   │   ├── vue-vite.md           (pos 6)
│   │   │   ├── choosing-scat.md      (pos 7)
│   │   │   └── remote-signatures.md  (pos 8)
│   │   ├── sourcemaps.md         ← Source map extractor    (pos 12)
│   │   ├── load.md               ← Offline cache import    (pos 13)
│   │   ├── proxy.md              ← Proxy overview          (pos 14)
│   │   ├── proxy/                ← Per-provider sub-pages  (pos 15)
│   │   │   ├── aws.md                (pos 1)
│   │   │   ├── oxylabs.md            (pos 2)
│   │   │   ├── socks.md              (pos 3)
│   │   │   └── http.md               (pos 4)
│   │   ├── fingerprint.md        ← Framework detector      (pos 16)
│   │   ├── cs-mast.md            ← Structural signatures   (pos 17)
│   │   ├── mcp.md                ← MCP / Claude shell      (pos 18)
│   │   └── completion.md         ← Shell completion script (pos 19)
│   ├── rules/                    ← Rules reference         (category position: 6)
│   │   ├── README.md             ← Overview                (pos 1)
│   │   ├── creating_new_rules.md ← Authoring guide         (pos 2)
│   │   ├── predefined-rules.md   ← Built-in rule catalog   (pos 3)
│   │   └── engines/              ← Engine reference        (category pos 4)
│   │       ├── request-engine.md (pos 1)
│   │       ├── ast-engine.md     (pos 2)
│   │       ├── cs-mast-s-engine.md (pos 3)
│   │       └── taintwire-engine.md (pos 4)
│   ├── example-scenarios/        ← End-to-end walkthroughs (category position: 8)
│   │   ├── next-js.md            (pos 1)
│   │   ├── using-proxy.md        (pos 2)
│   │   ├── vue-js.md             (pos 3)
│   │   └── svelte-astro.md       (pos 4)
│   ├── exit_codes.md             ← Exit code reference     (sidebar_position: 9)
│   ├── nuclei_templates.mdx      ← Nuclei templates        (sidebar_position: 10)
│   ├── troubleshooting.md        ← Common errors           (sidebar_position: 11)
│   ├── ci_cd/                    ← CI/CD reference         (category position: 12)
│   └── changelog.md              ← User-facing changelog   (sidebar_position: 13)
│       ├── github_action.md      (pos 1)
│       ├── gitlab_ci.md          (pos 2)
│       └── terraform/            ← Cloud provisioning      (category pos 3)
│           ├── aws.md              (pos 1)
│           ├── gcp.md              (pos 2)
│           ├── azure.md            (pos 3)
│           ├── digitalocean.md     (pos 4)
│           ├── ibm.md              (pos 5)
│           ├── oci.md              (pos 6)
│           ├── alibaba.md          (pos 7)
│           └── common-reference.md (pos 8) ← shared inputs/outputs/break-conditions/pinning
└── guides/                       ← Task-oriented how-to guides
    ├── README.md                 (pos 1)
    ├── next_js/                  (category pos 2)
    │   ├── fuzzing_endpoints.md  (pos 1)
    │   ├── reversing_fetch.md    (pos 2)
    │   ├── reversing_axios.md    (pos 3)
    │   └── generating_api_collection.md (pos 4)
    ├── react/                    (category pos 3)
    │   └── recovering-source-from-bundled-react.md (pos 1)
    └── sharing_projects.md       (pos 4)
```

## Module ordering rationale

Modules are ordered to match the typical recon workflow so that a newcomer reading
top-to-bottom sees the most-used commands first:

| Position | Module          | Role in workflow                                                                 |
| -------- | --------------- | -------------------------------------------------------------------------------- |
| 1        | `run`           | All-in-one orchestrator; shown first as the shortcut                             |
| 2        | `lazyload`      | First manual step: download JS files                                             |
| 3        | _(lazyload/)_   | Discovery method reference (sub-pages)                                           |
| 4        | `strings`       | Second step: extract URLs and secrets                                            |
| 5        | `map`           | Third step: build the function map                                               |
| 6        | _(interactive)_ | Interactive console for `map` — "Map Reference" (all 5 map-supported frameworks) |
| 7        | `endpoints`     | Fourth step: extract the client-side route tree                                  |
| 8        | `analyze`       | Fifth step: run static-analysis rules                                            |
| 9        | `report`        | Sixth step: render the final HTML report                                         |
| 10       | `refactor`      | Deep-dive: decompile chunks to readable ES modules                               |
| 11       | _(refactor/)_   | Technology-specific refactor docs                                                |
| 12       | `sourcemaps`    | Extract embedded source maps                                                     |
| 13       | `load`          | Offline workflow: import a Caido export as a cache                               |
| 14       | `proxy`         | Optional: proxy configuration (AWS API Gateway IP rotation, SOCKS/HTTP, Oxylabs) |
| 15       | _(proxy/)_      | Per-provider reference (sub-pages: aws, oxylabs, socks, http)                    |
| 16       | `fingerprint`   | Utility: detect the JS framework before running                                  |
| 17       | `cs-mast`       | Advanced: structural signature generation and comparison                         |
| 18       | `mcp`           | MCP server and Claude Code integration                                           |
| 19       | `completion`    | Utility: generate shell completion scripts                                       |

## Sidebar position rules

- Every `.md` and `.mdx` file **must** have a `sidebar_position` in its YAML frontmatter.
- Positions must be **unique within each directory level** — no two files or category directories at the same level may share the same number.
- Category (`_category_.json`) positions and file positions share the same namespace at their level; keep them non-overlapping.
- Sub-page directories (e.g. `lazyload/`, `refactor/`, `interactive_mode/`) carry their position in `_category_.json`, not in individual child files. Child file positions are relative within their own directory (start at 1).
- When adding a new module, append it at the end of the modules list and assign the next available integer.

## What goes where

### `docs/docs/` — Reference documentation

Use for:

- Module command reference (flags, options, output files, examples)
- Installation and prerequisites
- Framework compatibility matrix
- Exit codes and their causes
- Troubleshooting known errors
- Nuclei templates

**Do NOT add** walkthroughs, how-tos, or "when to use X" content here. That belongs in `guides/` or `example-scenarios/`.

### `docs/docs/example-scenarios/` — End-to-end scenarios

Use for:

- Complete pipeline walkthroughs against a realistic target of a specific framework
- One file per framework; the file shows the full `run` or step-by-step flow

**Do NOT add** individual-feature how-tos (e.g. "how to fuzz endpoints"). Those go in `guides/`.

### `docs/docs/rules/` — Rules reference

Use for:

- YAML rule schema specification
- Predefined rule catalog with descriptions
- Engine documentation (request engine, AST engine, CS-MAST-S engine, taintwire engine)

### `docs/docs/ci_cd/` — CI/CD reference

Use for:

- Running JS Recon via CI providers (GitHub Actions, GitLab CI)
- Provisioning JS Recon on cloud platforms via Terraform (`ci_cd/terraform/`), one page per provider

Each provider/platform page documents inputs, outputs, output files, and break conditions — this is reference material, not a walkthrough.

### `docs/guides/` — Task-oriented how-to guides

Use for:

- Practical step-by-step guides focused on a single task (fuzzing, reversing, exporting)
- Organized by target framework (`next_js/`, `react/`, etc.)
- Each guide is self-contained

**Do NOT add** module command reference here. That goes in `docs/docs/modules/`.

## Adding sub-pages to a module

When a module grows large enough to need sub-pages (like `lazyload/` or `refactor/`):

1. Create a `modules/<module_name>/` directory.
2. Add a `_category_.json` with a position that slots between the module's top-level file and the next module:

```json
{
    "label": "Descriptive Label",
    "position": <N>,
    "link": {
        "type": "generated-index",
        "description": "One-sentence description of this sub-section."
    }
}
```

3. Move or create the sub-pages inside the directory. Number them from 1.
4. The parent module's top-level `.md` file stays at `modules/<module_name>.md` (not inside the directory).

## File naming conventions

- Use `snake_case` for all `.md` file names (e.g. `exit_codes.md`, `creating_new_rules.md`).
- Use `kebab-case` only when it matches the existing convention already in that directory.
- Category directories use `snake_case`.
- No spaces in file names.

## Frontmatter

Every doc file must begin with:

```yaml
---
sidebar_position: <N>
---
```

Optional additional fields:

- `sidebar_label` — only when the H1 title is too long for the sidebar (keep it rare).
- `title` — only for the tab title in browser when it differs from H1.

Do NOT add `slug`, `id`, or other Docusaurus frontmatter unless you understand the downstream effects on versioned docs URLs.

## What NOT to do

- Do not place a module's sub-pages at the same level as other top-level module files. Always nest them in a subdirectory.
- Do not duplicate `sidebar_position` numbers within the same directory.
- Do not add new top-level reference files next to `exit_codes.md` without assigning a unique position and updating this file.
- Do not mix reference content (how the tool works) with task-oriented content (how to accomplish a goal).
- Do not edit files under `versioned_docs/` directly — those are snapshots.

## Versioned docs

When a new release is cut:

- The current `docs/` tree is snapshotted into `versioned_docs/version-X.Y.Z/`.
- Only edit `docs/` (the current/next version); never edit versioned snapshots directly.
- Update `lastVersion` in `docusaurus.config.ts` to match the latest stable release.

## Framework/tech support changes

Whenever framework or tech support is extended to a new module in `js-recon` (a new framework, or `generic`-tech coverage for a module that lacked it), update `docs/docs/framework-support.md` in the same session to reflect it.

## Vale lint (CI)

This repo runs Vale on documentation. If Vale CI fails:

- Run `vale sync` to pull the latest style definitions.
- Run `vale docs/` locally to see errors before pushing.
- Do not add words to `.vale/` accept lists unless they are real technical terms (module names, flag names, proper nouns).
- Avoid passive voice, weasel words, and long sentences — Vale flags these.

## Sub-agents (internal write-up policy)

Substantive code changes in this repo (e.g. `src/css/custom.css`, `docusaurus.config.ts`, build/CI
scripts — not plain content edits to `docs/`) get a post-implementation write-up on
`js-recon-internal-docs`, written by the **`docs-writer`** sub-agent, unconditionally — even when the
change has no user-visible effect. The write-up lands in `js-recon-internal-docs/docs/js-recon-core/`
and must include a line-by-line English translation of the diff. Full policy:
`js-recon-internal-docs/docs/dev-workflow/code-change-summaries.md`. This is separate from, and does not
replace, the documentation conventions in the rest of this file (which govern content in `docs/` itself).

## Navbar CSS (`src/css/custom.css`)

Never apply `backdrop-filter`, `filter`, `transform`, `perspective`, or `will-change` naming one of those directly to `.navbar`. Docusaurus renders the mobile sidebar (`.navbar-sidebar`, a `position: fixed` element meant to cover the full viewport) as a DOM child of `.navbar` itself. Any of those properties on `.navbar` makes it a containing block for `position: fixed` descendants, so the sidebar's `top`/`bottom` resolve against the navbar's own ~60px box instead of the viewport — the mobile hamburger menu then silently fails to appear when tapped.

If a blur/filter effect on the navbar is needed, apply it via a `::before` overlay instead (`position: absolute; inset: 0` on the pseudo-element, with `.navbar { position: relative }`) — this keeps the visual effect without turning `.navbar` into a containing block for its fixed-position children.
