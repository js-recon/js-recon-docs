---
sidebar_position: 1
---

# Basic Info

Rules are the [YAML](https://en.wikipedia.org/wiki/YAML) (`.yaml` or `.yml`) files that define the rules for the JS Recon analyze module.

A rule could perform multiple steps to analyze a file and determine if it matches the rule or not.

## Downloading pre-defined rules

There are some pre-defined rules available on [github/js-recon/js-recon-rules](https://github.com/js-recon/js-recon-rules). They are automatically downloaded by JS Recon when the [`analyze`](../modules/analyze.md) module is run into the `$HOME/.js-recon/rules` directory.

In case you wish to download them manually, it is recommended that you download them from the [releases page](https://github.com/js-recon/js-recon-rules/releases).

For a per-rule description of what each bundled rule looks for and why, see [Predefined rules](./predefined-rules.md).

## Version compatibility

Every rule must declare a `js_recon_version` field specifying the minimum JS Recon version it requires. Omitting the field is a validation error. Rules that declare a version higher than the one currently running are **silently skipped** — they do not stop analysis. This lets rules that depend on newer engine features co-exist in the same rules directory alongside rules that work on older installs.

See [Creating new rules — Version compatibility](./creating_new_rules.md#version-compatibility-js_recon_version) for the full format reference.
