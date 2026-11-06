---
sidebar_position: 4
---

# taintwire engine

The taintwire engine runs rules of type `taintwire`. It loads the chunks in `mapped.json` into [taintwire](https://taintwire.js-recon.io) graphs, which hold each chunk's syntax tree, scopes and value flow, and runs the rule's [Cypher](https://docs.ladybugdb.com/cypher/) queries against them. A rule names a **source** query and a **sink** query, and the engine reports the sinks that a source value flows into, following variables, function arguments and return values.

Unlike the [AST engine](./ast-engine.md)'s `taintFrom`, which needs the source and the sink in the same chunk with a direct reference between them, the taintwire engine follows a value through any number of variables and resolved function calls inside a chunk.

To query a whole app with its chunks linked, build a PookieGraph once with [`js-recon taintwire build`](../../modules/taintwire.md) and run `.pgq` query files against it with `taintwire analyze`. Both use the same flow runner as this engine.

taintwire rules are **opt-in**: loading the graphs is slow, so `analyze` and `run` skip them unless you pass `--analyze-taintwire`:

```bash
js-recon analyze -m mapped.json -t react --analyze-taintwire
js-recon run -u https://example.com --analyze-taintwire
```

Without the flag, `analyze` prints `Skipped N taintwire rule(s)` and runs everything else as usual.

## Rule header

```yaml
id: <id>
name: <human_readable_name>
author: <author>
description: <description>
js_recon_version: ">=2.1.0-alpha.2"
severity: <info | low | medium | high>
type: taintwire
tech:
    - <tech>
prefilter: "<regular expression>" # optional

steps:
    - name: url_source
      message: URL value read
      taintwire:
          query:
              - |-
                  MATCH (n:MemberExpression)-[:SON {key: 'property'}]->(p:Identifier), (n)-[:SON {key: 'object'}]->(o)
                  WHERE p.name IN ['hash', 'search'] AND o.name = 'location'
                  RETURN n.id AS id, n.file AS file, n.line AS line, n.col AS col
    - name: html_sink
      message: URL-derived value reaches innerHTML
      taintwire:
          taintFrom: url_source
          mode: deep
          maxHops: 8
          query:
              - |-
                  MATCH (a:AssignmentExpression)-[:SON {key: 'left'}]->(:MemberExpression)-[:SON {key: 'property'}]->(p:Identifier), (a)-[:SON {key: 'right'}]->(n)
                  WHERE p.name = 'innerHTML' AND NOT n.type IN ['StringLiteral', 'NumericLiteral', 'NullLiteral', 'BooleanLiteral']
                  RETURN n.id AS id, n.file AS file, n.line AS line, n.col AS col
```

| Field       | Description                                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prefilter` | Optional regular expression. A chunk is loaded into a graph only if at least one taintwire rule's `prefilter` matches its source code, or at least one rule has no `prefilter`. Use it to skip chunks that can't hold a source. |

## Steps

Every step of a `taintwire` rule has a `taintwire` block. Steps run in order:

- Each step runs its `query` and keeps the rows it returns.
- The `id`s of a step's rows are passed to every later step as the Cypher parameter `$<step name>`, so step names must be made of letters, digits and `_`.
- A step that returns no rows stops the rule for that graph.
- The rows of the last step are the findings.

| Field       | Required | Description                                                                                                                                        |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `query`     | Yes      | A Cypher query, or a list of queries run one after another with their rows concatenated. Each query must return `id`, `file`, `line` and `col`.    |
| `taintFrom` | No       | Name of an earlier step. Keep only the rows that a value from that step's rows flows into.                                                         |
| `mode`      | No       | `strict`, `lenient` or `deep` (default). See [Flow modes](#flow-modes).                                                                            |
| `maxHops`   | No       | Drop flows longer than this many value-flow edges. Long flows usually pass through library code (cookie helpers, routers) and are rarely findings. |

### Using an earlier step's rows

Pass a step's rows into a later query with `$<step name>`. For example, a rule for `postMessage` data first finds the handler functions, then reads `.data` from their first parameter:

```yaml
steps:
    - name: listener
      message: message listener registered
      taintwire:
          query: |-
              MATCH (c:CallExpression)-[:SON {key: 'callee'}]->(:MemberExpression)-[:SON {key: 'property'}]->(ae:Identifier),
                    (c)-[a0:SON {key: 'arguments'}]->(t:StringLiteral), (c)-[a1:SON {key: 'arguments'}]->(h)
              WHERE ae.name = 'addEventListener' AND a0.idx = 0 AND a1.idx = 1 AND t.value = 'message'
              RETURN h.id AS id, h.file AS file, h.line AS line, h.col AS col
    - name: message_data
      message: message event data read
      taintwire:
          query: |-
              MATCH (f)-[:SON {key: 'params', idx: 0}]->(d:Identifier)<-[:REFERS_TO]-(e:Identifier)<-[:SON {key: 'object'}]-(n:MemberExpression)-[:SON {key: 'property'}]->(p:Identifier)
              WHERE f.id IN $listener AND p.name = 'data'
              RETURN n.id AS id, n.file AS file, n.line AS line, n.col AS col
    - name: eval_sink
      message: message data reaches eval
      taintwire:
          taintFrom: message_data
          query: |-
              MATCH (c:CallExpression)-[:SON {key: 'callee'}]->(f:Identifier), (c)-[a:SON {key: 'arguments'}]->(n)
              WHERE f.name = 'eval' AND a.idx = 0
              RETURN n.id AS id, n.file AS file, n.line AS line, n.col AS col
```

## Flow modes

Value flow in the graph (`FLOWS_TO`, `ARGUMENT_TO`, `RETURNS_TO` edges) doesn't pass through calls the graph can't resolve, such as `String.prototype.slice` or `URLSearchParams.get`, or through property reads. Real code almost always wraps a source in one of those, so the modes differ in how they bridge them:

| Mode      | What reaches a sink                                                                                                                                                                                          | Example it finds                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `strict`  | The source node itself.                                                                                                                                                                                      | `const h = location.hash; el.innerHTML = h;`                                        |
| `lenient` | The source widened to the expressions wrapping it (up to 3 levels: calls, member reads, template literals), into a sink widened to the expressions inside it (up to 3 levels, also `a + b` and `a ? b : c`). | `el.innerHTML = location.hash.slice(1);`                                            |
| `deep`    | `lenient`, repeated for up to 4 rounds: whatever a round reaches is widened again.                                                                                                                           | `const p = new URLSearchParams(location.search), t = p.get("q"); el.innerHTML = t;` |

`lenient` and `deep` assume that a call or member read wrapping a tainted value returns a tainted value. That's what makes them useful on minified bundles, and it's also their main source of false positives.

## Writing queries

- **Label the start of every pattern.** The graph has one node table per syntax node type, so an unlabeled `MATCH (n)` scans all of them. When a pattern can start from more than one type (for example `CallExpression` and `NewExpression`), write one query per type and list them under `query`.
- **Match string constants in both forms.** Minified builds often turn `'message'` into `` `message` ``, a `TemplateLiteral` with one `TemplateElement`. Match the `StringLiteral` and the `TemplateLiteral` form as two queries.
- **A missing node type isn't an error.** If a chunk has no node of the labeled type, the query returns no rows.
- **Exclude constants at the sink.** Filter out literal values (`NOT n.type IN ['StringLiteral', 'NumericLiteral', 'NullLiteral', 'BooleanLiteral']`) so a sink that only ever receives a constant doesn't match.

## Output

taintwire findings use the same [`analyze.json` shape](../../modules/analyze.md#output-format) as the other engines, with `ruleType: "taintwire"`. `findingLocation` starts with the sink's position and, when the step used `taintFrom`, the source's position and the flow length:

```
// <chunk id>:<line>:<col> <- <chunk id>:<line>:<col> (<n> hops)

<sink expression>
```

## Limitations

- **No cross-chunk flow.** Each chunk is analyzed on its own, so a value read in one webpack module and used in another isn't followed.
- **Framework state and routers aren't modeled.** Values that pass through React `useState`, Angular `ActivatedRoute`, Vue/Nuxt `useRoute()` or SvelteKit `$page.url` aren't followed.
- **Computed member sinks.** `el[prop] = value` with a runtime property name doesn't match a sink query on the property name.
- **Speed and memory.** Loading the graphs takes most of the time: expect minutes on a large Next.js app, against seconds for the AST engine. Chunks are loaded in batches of about 2 MB of source.
