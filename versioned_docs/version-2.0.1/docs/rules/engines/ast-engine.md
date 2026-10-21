---
sidebar_position: 2
---

# AST Engine

The AST engine is responsible for parsing the steps of a rule with type `ast`. Following is an example of what the headers of a rule would look like:

```
id: <id>
name: <human_readable_name>
author: <author>
description: <description>
js_recon_version: ">=<min-version>"
severity: <info | low | medium | high>
type: ast
tech:
    - <tech>

steps:
    - name: <name_of_the_step>
      message: <message>
      requires:
          - <previous_step_name>
      ...
```

## AST Step

An AST step is used to match the specific parts of an AST ([Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree)) in a JS file.

### ESQuery

ESQuery is a query language for JavaScript ASTs. It is used to match the specific parts in a JavaScript file.

For comparison, consider the following HTML tree:

```html
<html>
    <body>
        <div>
            <form></form>
        </div>
    </body>
</html>
```

If you had to get the `<form>` element inside a `<div>`, which is then nested inside the `<body>` element with `<html>` as parent, you would use the following XPath query:

```
/html/body/div/form
```

ESQuery works in a similar way. Let's say want to match the following JS snippet:

```js
window.addEventListener("message", e);
```

If you know what the above snippet does, you would know that it is one of the first thing that you would do when searching for post-message vulnerabilities. To match it, you would use the following ESQuery query:

```
CallExpression[callee.object.name="window"][callee.property.name="addEventListener"][arguments.0.value="message"][arguments.1]
```

Now that you are familiar with what an ESQuery is, let's see how to use it in a rule file:

```yaml
- name: <name>
  message: <message>
  esquery:
      type: esquery
      query: <query>
      # optional: restrict the query to the subtree rooted at a previous match
      # inScopeOf: <previous_step_name>
```

The return type for this step is `Node`.

ESQuery supports a rich selector grammar via the [ESQuery library](https://github.com/estools/esquery). In particular, the rules shipped with `js-recon-rules` use:

- `:matches(A, B, C)` — match if any of `A`, `B`, or `C` match. Use this to express alternative source or sink shapes in one selector.
- `:has(selector)` — match a node when one of its descendants matches `selector`. Use this to require that a function body contains both a source and a sink.
- `:not(selector)` — negation. Use this to exclude safe shapes such as `StringLiteral` from a sink's right-hand side.
- `[field=/regex/]` — regex match on a string attribute (useful when a URL path or property name follows a pattern).

For example, a rule to detect post-message listeners would look like this:

<details>
<summary>Example: Full rule file for finding any `postMessage` listeners</summary>

```yaml
id: detect_postMessage
name: Detect postMessage event listeners
author: shriyanss
description: Detect postMessage event listeners
js_recon_version: ">=1.4.1"
severity: info
type: ast
tech:
    - next

steps:
    - name: check_postMessage
      message: postMessage event listener detected
      esquery:
          type: esquery
          query: CallExpression[callee.object.name="window"][callee.property.name="addEventListener"][arguments.0.value="message"][arguments.1]
```

</details>

Unfortunately, there is no official documentation for ESQuery. However, you can use [AST Explorer](https://astexplorer.net) to test build your ESQuery queries.

<details>
<summary>Some of the common ESQuery examples are:</summary>

- `Identifier[name="fetch"]`

```js
fetch;
```

- `CallExpression[callee.name="fetch"]`

```js
fetch();
```

- `MemberExpression[property.name="innerHTML"]`

```js
something.innerHTML;
```

- `VariableDeclarator[id.name="token"]`

```js
let token = "value";
```

- `AssignmentExpression[left.property.name="innerHTML"]`

```js
something.innerHTML = "value";
```

- `ImportDeclaration[source.value="axios"]`

```js
import axios from "axios";
```

- `CallExpression[callee.name="setTimeout"][arguments.length=2]`

```js
setTimeout(() => {}, 1000);
```

- `NewExpression[callee.name="XMLHttpRequest"]`

```js
new XMLHttpRequest();
```

</details>

#### `inScopeOf` — scoping an ESQuery to a previous match

By default, every ESQuery step runs against the **whole chunk AST**, and the rule fires when every step matches at least once in the same chunk. That's good enough for source/sink co-occurrence at the module level — for example, "this chunk reads a URL parameter _and_ writes to `.innerHTML`."

When you need to be stricter — for example, "the URL parameter and the sink must live inside the **same function**" — set `inScopeOf` on the step to the name of an earlier step. The ESQuery selector then runs against the subtree rooted at the previous step's matched node instead of the whole AST.

```yaml
- name: find_outer_function
  esquery:
      type: esquery
      query: ':matches(FunctionExpression, ArrowFunctionExpression, FunctionDeclaration):has(CallExpression[callee.property.name="get"][callee.object.callee.name="URLSearchParams"])'
- name: find_sink_in_same_function
  requires:
      - find_outer_function
  esquery:
      type: esquery
      query: 'AssignmentExpression[left.property.name="innerHTML"]'
      inScopeOf: find_outer_function
```

In the example above, step 1 only matches functions whose body already contains a URL parameter read. Step 2 then looks for an `.innerHTML` assignment, but only within the descendant subtree of that function — not anywhere in the chunk.

If the referenced step did not match, the dependent step is skipped (because `requires` is also unmet), and the rule does not fire.

#### `taintFrom` — data-flow filter for ESQuery matches

`inScopeOf` answers "are source and sink in the same function?" `taintFrom` goes further and answers "does the sink actually receive a value that came from the source?"

Without `taintFrom`, a rule fires whenever both a source pattern and a sink pattern co-exist in the same chunk — even if the two nodes are completely unrelated. A large minified bundle will often contain URL reads and `fetch` calls that belong to different features. `taintFrom` eliminates those false positives by tracing the data flowing out of the source step's match nodes and checking whether the sink's value-side subtree is reachable from that data.

**How it works internally:**

1. All nodes matched by the named source step are treated as taint seeds.
2. The engine runs an iterative, scope-aware propagation pass (up to 8 rounds) over the chunk AST:
    - A `VariableDeclarator` whose initializer references a tainted node/binding/member chain taints the declared variable.
    - An `AssignmentExpression` whose right-hand side is tainted propagates taint to the left-hand side (identifier, member expression, or destructuring pattern).
3. The resulting taint set (bindings + member-expression chains + original source nodes) is checked against each ESQuery candidate match. Only matches whose value-side subtree (RHS for assignments, arguments for calls/`new`, value for object/JSX properties) touches the taint set are kept.
4. Taint info is cached per source-step name, so multiple sink steps sharing the same source pay the computation cost only once.

**Usage:**

```yaml
- name: <sink_step>
  message: <message>
  requires:
      - <source_step>
  esquery:
      type: esquery
      query: <sink_selector>
      taintFrom: <source_step>
```

`taintFrom` can be combined with `inScopeOf` — scope restricts which AST subtree is searched, while `taintFrom` filters the results of that search by data-flow.

**Example — header name controlled by URL parameter:**

The rule below detects a `fetch` call whose `headers` object has a computed-key property (variable header name) where that key is derived from a URL parameter. Without `taintFrom` the rule would fire on any chunk that happens to contain both a `URLSearchParams.get` call and a `fetch` with dynamic headers, regardless of whether they are connected.

```yaml
steps:
    - name: find_url_param_source
      message: URL-derived value read
      esquery:
          type: esquery
          query: 'CallExpression[callee.type="MemberExpression"][callee.property.name="get"][callee.object.type="NewExpression"][callee.object.callee.name="URLSearchParams"]'

    - name: find_computed_header_key
      message: fetch headers object contains a computed-key property tainted by URL param
      requires:
          - find_url_param_source
      esquery:
          type: esquery
          taintFrom: find_url_param_source
          query: 'ObjectProperty[key.name="headers"][value.type="ObjectExpression"] > ObjectExpression > ObjectProperty[computed=true]'
```

**When to use `taintFrom` vs `inScopeOf`:**

| Need                                                         | Use                          |
| ------------------------------------------------------------ | ---------------------------- |
| Source and sink must be in the same function/block           | `inScopeOf`                  |
| Sink must receive a value that actually came from the source | `taintFrom`                  |
| Both — same function **and** real data-flow                  | both fields on the same step |

### Post Message Function Resolve

You can use this to resolve a function that is called when the postMessage event is triggered. For this, you would first need a valid ESQuery query to match the postMessage event listener.

To use this step, you can use the following:

```yaml
- name: <name>
  message: <message>
  postMessageFuncResolve:
      name: <postMessage_step_name>
```

The return type for this step is `Node`.

For example, a rule to resolve the code for the function that is called when the postMessage event is triggered would look like this:

<details>
<summary>Example: Full rule file to get the code for the function that is called when the postMessage event is triggered</summary>

```yaml
id: detect_postMessage_function
name: postMessage event listeners function code
author: shriyanss
description: Detect postMessage event listeners function code
js_recon_version: ">=1.4.1"
severity: info
type: ast
tech:
    - next

steps:
    - name: check_postMessage
      message: postMessage event listener detected
      esquery:
          type: esquery
          query: CallExpression[callee.object.name="window"][callee.property.name="addEventListener"][arguments.0.value="message"][arguments.1]
    # now, check if the second argument is a function and it has call to innerHtml
    - name: resolve_event_handler_function
      message: Code for postmessage event handler
      requires:
          - check_postMessage
      postMessageFuncResolve:
          name: check_postMessage
```

</details>

### Check Assignment Exist

You can use this to find if a variable is assigned to something. For this, you would need a step whose return type is `Node`.

To use this step, you can use the following:

```yaml
- name: <name>
  message: <message>
  checkAssignmentExist:
      name: <node_step_name>
      type: <var_name_to_check_assignment_for>
      memberExpression: <boolean>
```

For example, to check if a innerHTML is being assigned a value in a node which is the function code for a postMessage event listener, you can use the following:

<details>
<summary>Example: Full rule file to check if a innerHTML is being assigned a value in a node which is the function code for a postMessage event listener</summary>

```yaml
id: detect_postMessage_innerHtml_sink
name: postMessage event listeners with innerHTML
author: shriyanss
description: Detect postMessage event listeners with innerHTML sink
js_recon_version: ">=1.4.1"
severity: medium
type: ast
tech:
    - next

steps:
    - name: check_postMessage
      message: postMessage event listener detected
      esquery:
          type: esquery
          query: CallExpression[callee.object.name="window"][callee.property.name="addEventListener"][arguments.0.value="message"][arguments.1]
    # now, check if the second argument is a function and it has call to innerHtml
    - name: resolve_event_handler_function
      message: Code for postmessage event handler
      requires:
          - check_postMessage
      postMessageFuncResolve:
          name: check_postMessage
    - name: check_innerHtml
      message: Check if innerHTML is being assigned something
      requires:
          - resolve_event_handler_function
      checkAssignmentExist:
          name: resolve_event_handler_function
          type: innerHTML
          memberExpression: true
```

</details>
