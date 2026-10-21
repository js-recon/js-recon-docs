---
sidebar_position: 5
---

# Map command

The `map` command is used to map and analyze the functions within a directory of JavaScript files. It can help you understand the codebase by identifying function definitions and, optionally, using AI to generate descriptions.

## Usage

```bash
js-recon map -d <directory> -t <technology> [options]
```

## Options

| Option                      | Alias    | Description                                                                                                                                                                                                                                                           | Default               | Required |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------- |
| `--directory <directory>`   | `-d`     | Directory containing JS files.                                                                                                                                                                                                                                        |                       | Yes      |
| `--tech <tech>`             | `-t`     | Technology used in the JS files (run with `-l`/`--list` to see available options).                                                                                                                                                                                    |                       | Yes      |
| `--list`                    | `-l`     | List available technologies.                                                                                                                                                                                                                                          | `false`               | No       |
| `--output <file>`           | `-o`     | Output file name (without extension).                                                                                                                                                                                                                                 | `mapped`              | No       |
| `--format <format>`         | `-f`     | Output format for the results (comma-separated; available:`json`).                                                                                                                                                                                                    | `json`                | No       |
| `--interactive`             | `-i`     | Interactive mode for exploring the mapped functions.                                                                                                                                                                                                                  | `false`               | No       |
| `--command <command>`       | `-c`     | Run an interactive-mode command non-interactively. Repeatable, and a single value can chain commands with `&&` (for example, `-c "list fetch && go to 1234"`).                                                                                                        |                       | No       |
| `--ai <options>`            |          | Use AI to analyze the code (comma-separated; available:`description`).                                                                                                                                                                                                |                       | No       |
| `--ai-threads <threads>`    |          | Number of threads to use for AI.                                                                                                                                                                                                                                      | `5`                   | No       |
| `--ai-provider <provider>`  |          | Service provider to use for AI (available: openai, ollama, anthropic).                                                                                                                                                                                                | `openai`              | No       |
| `--ai-endpoint <endpoint>`  |          | Endpoint to use for AI service (for Ollama, etc). Uses provider default if not set.                                                                                                                                                                                   |                       | No       |
| `--ai-api-key <key>`        |          | API key for the configured AI provider. Falls back to `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` depending on `--ai-provider`.                                                                                                                                           |                       | No       |
| `--model <model>`           |          | AI model to use for analysis.                                                                                                                                                                                                                                         | `gpt-4o-mini`         | No       |
| `--openapi`                 |          | Generate OpenAPI spec from the code                                                                                                                                                                                                                                   | `false`               | No       |
| `--openapi-output <file>`   |          | Output file for OpenAPI spec                                                                                                                                                                                                                                          | `mapped-openapi.json` | No       |
| `--openapi-chunk-tag`       |          | Add chunk ID tag to OpenAPI spec for each request found                                                                                                                                                                                                               | `false`               | No       |
| `--no-graphql`              | `--ngql` | Disable GraphQL operation extraction during OpenAPI generation                                                                                                                                                                                                        | enabled               | No       |
| `--max-recursion-depth <n>` |          | Max recursion depth for HTTP-client URL fan-out and cross-file resolution.                                                                                                                                                                                            | `3`                   | No       |
| `--max-heap <mb>`           |          | Cap the V8 heap in MB before any parsing work starts. `0` sets the limit to 100% of available RAM (`os.totalmem()`); any positive integer sets an explicit ceiling. Applied via process re-exec so the limit is effective regardless of how the process was launched. | `0`                   | No       |

## How it works

### Chunk extraction

`map` first splits the downloaded JS files into individual function chunks using bundler-specific logic:

- **Next.js (webpack)**: Parses `self.webpackChunk_N_E` push calls. Each entry in the module map becomes an individual chunk with its own numeric ID.
- **Next.js (turbopack)**: Parses `globalThis.TURBOPACK` push calls. Turbopack uses a different module-map format but is normalised to the same chunk structure.
- **Vue (Vite)**: Decodes Vite's production chunk format where modules are keyed under 2-character function names. Non-bundled / dev-server `.js` and `.vue` files are emitted as single-function chunks.

Each chunk is stored in `mapped.json` with its ID, raw source code, and Babel AST.

### API call resolution (fetch and Axios)

After chunking, the tool resolves every `fetch()` and Axios call to a concrete URL + method + headers:

1. **Instance discovery**: Finds all `axios.create(...)` calls (or `z.create(...)` for aliased Axios) and records the base URL and default headers for each instance.

2. **Interceptor headers**: Scans all chunks for `axios.interceptors.request.use(...)` patterns and collects any headers set inside the interceptor callback. These are attached to every endpoint emitted from that Axios client, since interceptors fire on every request.

3. **Call tracing**: For each `.get(...)`, `.post(...)`, `.put(...)`, etc. call (or `fetch(...)` call), the URL argument is resolved through variable assignments using taint-flow analysis. The resolver follows:
    - Direct string literals and template literals
    - Variable assignments (`const url = "/api/..."`)
    - Member expressions (`config.baseURL + path`)
    - `BinaryExpression` concatenation (`"/api/" + id`)
    - Cross-chunk variable imports, on a best-effort basis — only when the URL variable is re-exported
      from its defining chunk (see [Limitations](#limitations) below for the unresolved case)

4. **Server Actions** (Next.js only): Detects `createServerReference(actionId, ...)` calls, which represent Next.js Server Actions callable from the client. The `actionId` is a hash that identifies the server-side function.

5. **`new Request(...)` calls**: Also resolved using the same taint-flow mechanism, for code that constructs `Request` objects rather than calling `fetch` directly.

The resolved endpoints are written into `mapped.json` and, when `--openapi` is set, into a `mapped-openapi.json` OpenAPI 3.0 spec.

### GraphQL operation extraction

When `--openapi` is set and `--no-graphql`/`--ngql` is not, `map` additionally scans every downloaded JS file for embedded GraphQL operations (queries, mutations, subscriptions). Each `StringLiteral` and `TemplateLiteral` whose text resembles a GraphQL document is fed through the official `graphql` library's `parse()`; anything that parses cleanly is emitted as a POST request.

Each emitted operation:

- Has method `POST` and path `/{{graphqlEndpoint}}` (a Postman/OpenAPI variable so importers can substitute the real GraphQL transport URL).
- Carries a JSON body of shape `{"operationName": "...", "query": "...", "variables": {...}}`. The `query` is the operation re-printed standalone, with any referenced fragment definitions (transitively) inlined into the same document so the request is self-contained. `variables` is a typed stub using the existing `<string>` / `<number>` / `<boolean>` placeholder convention.
- Is grouped under a flat top-level `GraphQL` folder in the Postman collection and tagged `GraphQL` in the OpenAPI spec. Operations are deduplicated by operation name + printed query so the same call appearing in several chunks emits a single entry.

This scan is independent of the URL/transport resolvers — it does not require the GraphQL client call site to be reachable by taint analysis, only that the operation text appears as a literal somewhere in the bundle.

### Limitations

- **Same-chunk resolution only**: URL variables that are defined in a different chunk and not re-exported are not resolved; the tool will emit the raw variable name as a placeholder.
- **Dynamic paths**: URLs fully constructed at runtime (for example, built from a loop variable or a computed key) cannot be statically resolved and will appear as template placeholders.
- **Axios only covers webpack-bundled builds**: Vite/React builds that use Axios may not have complete interceptor coverage depending on how the bundle is split.

## Framework Support

Each framework is added to the tool after thorough research on the framework. New techniques are added to the tool when they are discovered. The following is an exhaustive list of frameworks that the `map` module is compatible with:

- Next.js
- Vue
- React
- Svelte/Astro

## Examples

### Basic usage

The `map` command requires you to specify the directory containing the JavaScript files and the technology used.

For example, to map a Next.js application:

```bash
js-recon map -d /path/to/js-files -t next
```

### Interactive mode

Map functions and explore them in an interactive session. For a detailed guide, see the [Interactive Mode documentation](./interactive_mode/next-js.md).

```bash
js-recon map -d /path/to/js-files -t next -i
```

### Headless interactive commands (`-c` / `--command`)

When you already know which interactive commands you want to run — for example, generating an ESQuery selector for a snippet you've copied out of a chunk — pass them with `-c` and the tool will execute them without launching the blessed UI:

```bash
js-recon map -d /path/to/js-files -t next -c "list fetch"
```

`-c` is repeatable, and a single argument can chain multiple commands with `&&` (split at parse time, so quoting matters):

```bash
js-recon map -d output/<host> -t vue \
  -c "esquery * fetch(\`/api/posts\`) && esquery * v-html"
```

See the [Interactive Mode documentation](./interactive_mode/next-js.md) for the full command surface, including the [`esquery`](./interactive_mode/next-js.md#esquery) command for generating selectors from a pasted snippet.

### AI-powered analysis

Use an AI model to generate descriptions for the mapped functions by providing the `--ai` flag, a `--ai-provider`, and an API key for that provider.

```bash
# OpenAI (default provider)
js-recon map -d /path/to/js-files -t next --ai description --ai-api-key <your-key>

# Anthropic
js-recon map -d /path/to/js-files -t next --ai description \
  --ai-provider anthropic --ai-api-key <your-key> --model claude-haiku-4-5-20251001
```

### OpenAPI specification generation

You can also generate an OpenAPI specification for the requests made by functions/libraries like `fetch()` and Axios by providing the `--openapi` flag.

```bash
js-recon map -d /path/to/js-files -t next --openapi
```

The output file name can be specified by using the `--openapi-output` flag.

```bash
js-recon map -d /path/to/js-files -t next --openapi --openapi-output <file>
```

To add a chunk ID tag to the OpenAPI spec for each request found, use the `--openapi-chunk-tag` flag. This should categorize the requests based on the chunk ID.

```bash
js-recon map -d /path/to/js-files -t next --openapi --openapi-chunk-tag
```
