---
sidebar_position: 2
---

# Installation

JS Recon is a Node.js-based, security-focused JavaScript analysis tool built for modern recon workflows.

## Prerequisites

:::note Homebrew users
If you install via Homebrew, Node.js is installed automatically as a dependency — no manual setup required. Skip to the [Installation methods](#installation-methods) section.
:::

- Node.js 22 or higher (npm install only)
    - Download and install from the official site: https://nodejs.org/en/download
    - Verify installation:

        ```bash
        node -v
        ```

        Ensure it prints `v22.x.x` or higher.

- Browsers
    - JS Recon internally uses Puppeteer to automate Chromium-based browsers.
      Puppeteer installs automatically for npm installs, no manual setup required.
      Homebrew installs require a separate browser setup — see the [Homebrew](#homebrew-macos-and-linux) section below.

## Installation methods

### Homebrew (macOS and Linux)

```bash
brew tap js-recon/tap
brew install js-recon
```

This always installs the latest **stable** release. For the latest alpha or
beta prerelease instead:

```bash
brew install js-recon/tap/js-recon-alpha
brew install js-recon/tap/js-recon-beta
```

To update:

```bash
brew update && brew upgrade js-recon
```

:::note Upgrading from the old tap
If you installed JS Recon before the project moved to the `js-recon` GitHub
organization, you may still have the old `shriyanss/tap` tapped locally. Because
that repository was renamed (not deleted), Homebrew still resolves it — leaving
you with two taps that both serve a formula named `js-recon`. This ambiguity is
what causes errors like `Formulae found in multiple taps` or `Refusing to load
formula ... from untrusted tap ...`. Remove the stale tap, then install from the
new one:

```bash
brew untap shriyanss/tap
brew tap js-recon/tap
brew install js-recon/tap/js-recon
```

:::

:::note
After installing via Homebrew, the `lazyload` subcommand (and `run` pipelines that use it) requires a Chromium-based browser at runtime. Run `brew info js-recon` for setup instructions.

subcommands that work without a browser: `strings`, `map`, `analyze`, `report`, `endpoints`, `mcp`, `cs-mast`, `refactor`, `sourcemaps`.
:::

### npm (all platforms)

Install the command-line tool globally using npm:

```bash
npm i -g @js-recon/js-recon@latest
```

:::tip
You can try the `alpha` and `beta` builds as well. They are updated more often than the stable version, often daily, but are not as stable.

To download the `alpha` build, use the following command:

```bash
npm i -g @js-recon/js-recon@alpha
```

To download the `beta` build, use the following command:

```bash
npm i -g @js-recon/js-recon@beta
```

:::

Test the installation:

```bash
js-recon -V
```

## Shell completion (optional)

Enable tab completion for subcommand names and flags:

### Bash

```bash
echo 'eval "$(js-recon completion bash)"' >> ~/.bashrc
source ~/.bashrc
```

### Zsh

```zsh
echo 'eval "$(js-recon completion zsh)"' >> ~/.zshrc
source ~/.zshrc
```

### Fish

```fish
js-recon completion fish > ~/.config/fish/completions/js-recon.fish
```

See the [Completion command reference](./modules/completion.md) for more options.

## API keys setup

JS Recon can optionally use API access to a couple of external services for
enhanced analysis. Neither is required — the tool works fine without them.

### AWS API Gateway (used to rotate IP address; optional)

JS Recon requires an AWS API Key (and Secret Key) to use the [`proxy aws`](./modules/proxy/aws.md) subcommand for rotating IP addresses while scanning the target

Recommended permission:

- AdministratorAccess for API Gateway

or
at minimum, fine-grained permission accordingly.

The AWS Console can be accessed at https://console.aws.amazon.com/iam/

These keys are
to be stored in the `$AWS_ACCESS_KEY_ID` and `$AWS_SECRET_ACCESS_KEY` environment variables

Alternatively, these can be passed directly to the tool through the `-a/--access-key <key>` and `-s/--secret-key <key>` flags to the `proxy aws` subcommand. Read the full docs [here](./modules/proxy/aws.md)

### AI provider API key (to generate function descriptions; optional)

It is helpful to have the function descriptions generated through AI. To use this feature, the tool needs access to an AI provider API — `openai` (default), `anthropic`, or `ollama` (no key required), selected via `--ai-provider`.

To get an OpenAI API key:

- Navigate to https://platform.openai.com and log in/sign up
- Once logged in, go to https://platform.openai.com/settings/organization/billing/overview and add credit balance to the OpenAI API account. You can test this with $5, however, you should refer to the prompts on OpenAI's website for the minimum amount
- Now, go to https://platform.openai.com/api-keys, and create a new API key
- Store this in the `$OPENAI_API_KEY` environment variable

To get an Anthropic API key:

- Navigate to https://console.anthropic.com and log in/sign up
- Add credit balance, then create a new API key under API Keys
- Store this in the `$ANTHROPIC_API_KEY` environment variable

Alternatively, this API Key can be directly passed to JS Recon through the `--ai-api-key <key>` flag to the `map` module. The full documentation can be found [here](./modules/map.md)
