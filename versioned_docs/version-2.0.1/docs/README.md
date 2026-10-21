---
sidebar_position: 1
---

# Introduction

Welcome to the official documentation for `js-recon`, a powerful tool for JavaScript reconnaissance. This documentation provides a comprehensive overview of all available commands and their functionalities.

## Available commands

`js-recon` offers the following commands to help you analyze and extract valuable information from JavaScript files:

- **[Lazyload](./modules/lazyload.md):** Download all Lazy-Loaded JavaScript files from a target URL or a list of URLs.
- **[Endpoints](./modules/endpoints.md):** Extract client-side from JavaScript files.
- **[Strings](./modules/strings.md):** Extract strings, URLs, and secrets from JavaScript files.
- **[Proxy](./modules/proxy.md):** Route outbound requests through a proxy — AWS API Gateway for IP rotation, a generic SOCKS5/HTTP proxy, or Oxylabs.
- **[Map](./modules/map.md):** Map and analyze functions within JavaScript files. For Next.js, an [interactive mode](./modules/interactive_mode/next-js.md) is also available.
- **[Run](./modules/run.md):** Run essential modules automatically.
- **[Report](./modules/report.md):** Generate an HTML report of the reconnaissance results.
- **[Analyze](./modules/analyze.md):** Analyze the JS files using the [js-recon-rules](https://github.com/js-recon/js-recon-rules).
- **[Refactor](./modules/refactor.md):** Refactor the JS Chunks into separate files.
- **[Load](./modules/load.md):** Populate the response cache from a Caido export so later runs can be executed offline with `--cache-only`.
- **[sourcemaps](./modules/sourcemaps.md):** Extract embedded sourcemaps from downloaded JavaScript files.
- **[Fingerprint](./modules/fingerprint.md):** Detect the JS framework used by a target before running other modules.
- **[CS-MAST](./modules/cs-mast.md):** Generate and compare structural signatures across bundles.
- **[MCP](./modules/mcp.md):** Run JS Recon as an MCP server for Claude Code integration.
- **[Completion](./modules/completion.md):** Generate shell completion scripts for `js-recon`.

Select a command from the list preceding to view its detailed documentation, including all available options and practical examples.

## Example scenario

The document [here](./example-scenarios/next-js.md) demonstrates an example scenario of using JS Recon with a Next.js app.
