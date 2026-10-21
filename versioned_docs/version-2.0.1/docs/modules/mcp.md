---
sidebar_position: 18
---

# MCP command

The `mcp` command has three modes:

- `--cli` — AI-powered **interactive CLI** that lets you run js-recon modules through natural language.
- `-c/--chat "<prompt>"` — **one-shot** non-interactive chat. Send a single prompt, print the reply, exit. Repeatable.
- `--server` — start a **Model Context Protocol server** over stdio so js-recon can be wired into Claude Code, Cursor, or any other MCP-aware tool as a tool provider.

## Usage

```bash
js-recon mcp --cli [options]                # interactive REPL
js-recon mcp -c "scan https://example.com"  # one-shot
js-recon mcp --server                       # MCP stdio server
```

## Options

| Option                      | Alias | Description                                                                                                                                     | Default                | Required |
| --------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------- |
| `--cli`                     |       | Start the interactive CLI session.                                                                                                              | `false`                | No       |
| `--server`                  |       | Start a Model Context Protocol server over stdio.                                                                                               | `false`                | No       |
| `-c, --chat <prompt>`       | `-c`  | Send a one-shot prompt (repeatable; each `-c` adds another turn).                                                                               |                        | No       |
| `--config <file>`           |       | Path to a custom MCP config file.                                                                                                               | `~/.js-recon/mcp.yaml` | No       |
| `--api-key <key>`           |       | API key for the LLM provider (overrides config and env vars).                                                                                   |                        | No       |
| `--model <model>`           |       | AI model to use (for example, `gpt-4o-mini`, `claude-sonnet-4-20250514`).                                                                       | from config            | No       |
| `--provider <provider>`     |       | LLM provider to use (`openai` or `anthropic`).                                                                                                  | from config            | No       |
| `--no-refresh-claude-creds` |       | Do not auto-refresh reused Claude Code OAuth tokens; fail with a hint if expired.                                                               |                        | No       |
| `--claude-client-id <id>`   |       | OAuth client ID used when refreshing Claude Code credentials. Required in environments where the default Anthropic client ID is not registered. |                        | No       |

## Reusing your Claude Code login

If you don't pass `--api-key` and don't have one configured, the `--cli` and `-c/--chat` modes automatically try to reuse the OAuth credentials from your local **Claude Code** install. On macOS those live in the keychain under the service name `Claude Code-credentials`; on Linux they're in `~/.claude/.credentials.json`. The token is refreshed when expired (with a warning) and **never written to `~/.js-recon/mcp.yaml`** — it stays in the OS credential store. Pass `--no-refresh-claude-creds` to opt out of automatic refresh.

## MCP server mode

`js-recon mcp --server` speaks the Model Context Protocol over stdio. Registered tools: `lazyload`, `strings`, `map`, `endpoints`, `analyze`, `report`, `run`, `list_skills`, `run_skill`. To wire into Claude Code, add to `~/.claude.json`:

```json
{
    "mcpServers": {
        "js-recon": {
            "command": "node",
            "args": ["/abs/path/to/js-recon/build/index.js", "mcp", "--server"]
        }
    }
}
```

Smoke-test the protocol without a host:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node build/index.js mcp --server
```

## Configuration

MCP stores its configuration at `~/.js-recon/mcp.yaml`. A default file is created automatically on first run. You can also pass a custom path with `--config`.

### config file format

```yaml
provider: openai # openai or anthropic
model: gpt-4o-mini
openai_api_key: sk-...
anthropic_api_key: ""
default_output_dir: output
default_threads: 1
history_limit: 50
```

| Field                | Description                                                | Default       |
| -------------------- | ---------------------------------------------------------- | ------------- |
| `provider`           | LLM provider (`openai` or `anthropic`)                     | `openai`      |
| `model`              | Model to use                                               | `gpt-4o-mini` |
| `openai_api_key`     | OpenAI API key (also reads `OPENAI_API_KEY` env var)       |               |
| `anthropic_api_key`  | Anthropic API key (also reads `ANTHROPIC_API_KEY` env var) |               |
| `default_output_dir` | Output directory used when running tools                   | `output`      |
| `default_threads`    | Threads passed to lazyload/run                             | `1`           |
| `history_limit`      | Maximum number of messages kept in conversation history    | `50`          |

API keys are resolved in order: `--api-key` CLI flag → config file → environment variable.

## Starting a session

```bash
js-recon mcp --cli
```

If no API key is configured, the CLI will prompt you to select a provider and enter your key interactively. The key will be saved to `~/.js-recon/mcp.yaml`.

To start with a specific provider and key without saving to config:

```bash
js-recon mcp --cli --provider anthropic --api-key <your-key> --model claude-sonnet-4-20250514
```

## Chatting naturally

Once the session starts, you can interact in plain English. The CLI automatically detects intent and decides whether to call a tool:

- **"lazyload https://example.com"** — downloads JS files from the target
- **"run a full analysis on https://example.com"** — runs the complete pipeline (lazyload → strings → map → endpoints → analyze → report)
- **"summarize the results"** — reads and summarizes the output files from the last run
- Anything else is answered by the AI as a general question

The AI will ask for confirmation of the target URL before executing tools.

## Slash commands

Slash commands can be typed at any time in the session. Tab completion is supported.

| Command            | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| `/help`            | Show all available slash commands.                           |
| `/exit`            | Exit the MCP CLI.                                            |
| `/status`          | Show current provider, model, conversation length, and cost. |
| `/cost`            | Show token usage and estimated cost for this session.        |
| `/clear`           | Clear conversation history (keeps the system prompt).        |
| `/model`           | Show the current model.                                      |
| `/model <name>`    | Switch to a different model (for example, `/model gpt-4o`).  |
| `/models`          | List all available models for the current provider.          |
| `/provider`        | Show the current provider.                                   |
| `/provider <name>` | Switch provider (`openai` or `anthropic`).                   |
| `/config`          | Show the current configuration.                              |
| `/save`            | Save the current session config to `~/.js-recon/mcp.yaml`.   |

## Keyboard shortcuts

| Key          | Action                                   |
| ------------ | ---------------------------------------- |
| `Ctrl-C`     | Stop the current in-progress tool call.  |
| `Ctrl-C` ×2  | Exit the session (also accepts `/exit`). |
| `Tab`        | Autocomplete slash commands.             |
| `Up Arrow`   | Navigate to previous input in history.   |
| `Down Arrow` | Navigate to next input in history.       |

## Example session

```
js-recon mcp --cli --provider openai --api-key sk-...

  ╔══════════════════════════════════════╗
  ║         js-recon MCP CLI             ║
  ╚══════════════════════════════════════╝

  Provider: openai | Model: gpt-4o-mini
  Type /help for commands, or chat naturally.

js-recon> lazyload https://example.com
  [Tool Output - lazyload]: Downloaded 12 JS files to output/

js-recon> summarize the results
  Found: main.js, chunks/123.js, chunks/456.js ...

js-recon> /cost
  Prompt tokens: 1,204 | Completion tokens: 387 | Estimated cost: $0.000248

js-recon> /exit
```
