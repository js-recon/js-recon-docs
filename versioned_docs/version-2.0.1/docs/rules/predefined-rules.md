---
sidebar_position: 3
---

# Predefined rules

The [`js-recon-rules`](https://github.com/js-recon/js-recon-rules) repository ships with a curated set of rules that the [`analyze`](../modules/analyze.md) module evaluates against every chunk in `mapped.json` and every operation in the generated OpenAPI spec. The rules below are downloaded automatically the first time you run `js-recon analyze` (or any flow that depends on it, such as [`run`](../modules/run.md)) and are stored in `$HOME/.js-recon/rules`.

Each rule documents:

- **What it looks for** — the AST or request shape that flags a finding.
- **Why it matters** — the class of vulnerability or misconfiguration.
- **How it is kept precise** — the constraints that suppress obvious false positives.

If you write your own rules and want them to follow the same pattern, see [Creating new rules](./creating_new_rules.md) and the [AST engine reference](./engines/ast-engine.md).

---

## Request rules

These rules are evaluated by the [request engine](./engines/request-engine.md) against the OpenAPI spec that `map` and `strings` produce for the target.

### `api_path` — API endpoint detection

`severity: info`

Marks any operation whose path contains `/api/`. Pure inventory rule — it doesn't imply a vulnerability, it just makes the API surface easy to spot in the report.

### `admin_api` — Admin API endpoint detection

`severity: info`

Marks operations whose path contains both `/api/` and `admin`. Useful for prioritising review of privileged endpoints exposed to the client.

### `missing_authorization_header` — Missing `Authorization` header

`severity: medium`

Fires when an OpenAPI operation has no `Authorization` header, and also has no `X-Api-Key`, `X-Auth-Token`, or `Cookie` header declared — so API-key- and cookie-session-authenticated endpoints aren't flagged as unauthenticated. The rule is intentionally simple — many endpoints _legitimately_ do not require authentication (login, marketing pages, etc.) — but on a Next.js/React app that depends on user identity, it surfaces the endpoints worth inspecting for missing auth.

---

## AST rules

These rules are evaluated by the [AST engine](./engines/ast-engine.md) against every chunk recovered by `map` (Next.js with both webpack and Turbopack bundlers, and Vue.js with Vite — production builds and dev-server output). Each rule declares the frameworks it applies to via its `tech:` list; the engine skips a rule on bundles whose framework isn't in that list.

### `detect_postMessage` — `postMessage` event listeners

`severity: info`

Flags `window.addEventListener("message", handler)` calls. postMessage handlers are a frequent source of cross-origin XSS / privilege-escalation bugs — this rule simply inventories every listener so a reviewer can audit them.

### `detect_postMessage_innerHtml_sink` — `postMessage` handler that writes to `innerHTML`

`severity: medium`

Chains the postMessage listener detection with a check that the handler function assigns to `.innerHTML`. The combination is a classic stored-DOM-XSS pattern: if the listener doesn't validate `event.origin` and `event.data`, an attacker who controls a framed/embedded page can inject HTML into the parent.

### `detect_postmessage_weak_origin_check` — `postMessage` handler using a bypassable origin-check idiom

`severity: medium`

Resolves the first `message`-event handler in a chunk and checks whether its origin validation relies on `event.origin.endsWith(...)`, `.includes(...)`, `.indexOf(...)`, or `.startsWith(...)` instead of an exact-string equality check. These idioms are mechanically bypassable — a page hosted at a path or subdomain that merely contains the allowed suffix (for example `https://attacker.example/allowed.example.com`, or a crafted subdomain) satisfies the check while sending from an untrusted origin. Fires regardless of which sink the handler reaches, since the validation logic itself is the flaw.

### `detect_dom_xss_innerHTML_url_source` — DOM XSS via URL parameter to `innerHTML`

`severity: high`
`tech: [next, vue]`

Detects the `URL → innerHTML` taint pattern. Fires when the same chunk contains both:

1.  A read from a URL-derived source — any of: `new URLSearchParams(...).get(...)`, `window.location.search`, `window.location.hash`, `document.referrer`, `document.URL`, or a call to `useSearchParams()` (Next.js / React Router).
2.  A dynamic assignment to `.innerHTML` or `.outerHTML` — that is, the right-hand side is **not** a `StringLiteral`, `NumericLiteral`, `BooleanLiteral`, or `NullLiteral`, and is not the direct return value of a call to a common sanitizer/encoder function (for example `DOMPurify.sanitize(...)`, `sanitizeHtml(...)`, `escapeHtml(...)`).

Both halves must appear in the same module/chunk for the rule to fire. This excludes the React-internal `innerHTML` writes in vendor chunks (those chunks never read from a URL parameter). For Vue.js single-file components the Vite-transformed `setup()` body (for example, `headingRef.value.innerHTML = ...`) matches the same shape.

Typical compiled match (`app/search/page.tsx`):

```js
let e = new URLSearchParams(window.location.search).get("q") || "";
i.current.innerHTML = `Showing results for: <strong>${e}</strong>`;
```

### `detect_cspt_fetch_url_param` — Client-Side Path Traversal (CSPT)

`severity: high`
`tech: [next, vue]`

Detects the `URL → fetch URL` traversal pattern. Fires when the same chunk contains both:

1.  A read from a URL-derived source (same set as the rule above, plus `useParams()` for App Router dynamic segments, and `useRoute()` for Vue Router). To survive minification of production Vite/webpack bundles — where the local `route` binding becomes a 2-character name but the Vue Router property names do not — the rule also matches any member expression of the shape `<obj>.query.<X>` or `<obj>.params.<X>`.
2.  A `fetch(...)` (or `*.fetch(...)`) call whose first argument is a **dynamically constructed URL** — either a `TemplateLiteral` containing at least one interpolation, or a `BinaryExpression` doing string concatenation (`'/api/foo/' + x`).

The browser collapses `..` segments **before** the request hits the server, so an attacker who controls the interpolated value can pivot the fetch to a different API path. This is exactly the CSPT pattern (for example, `?file=../users/1` causing `fetch('/api/docs/' + file)` to hit `/api/users/1`). Skips the sink when the interpolated value is wrapped in `encodeURIComponent`/`encodeURI` (for example ``fetch(`/api/docs/${encodeURIComponent(file)}`)``), since proper URI-encoding neutralizes the path-traversal segments.

Typical compiled match (`app/docs/page.tsx`):

```js
let e = new URLSearchParams(window.location.search).get("file") || "readme";
fetch(`/api/docs/${e}`);
```

To suppress the warning legitimately, allowlist-validate the parameter or wrap it in `encodeURIComponent(...)` (which prevents `..` and `/` from surviving normalisation).

### `detect_cspt_xhr_url_param` — Client-Side Path Traversal (CSPT) via XHR/axios

`severity: high`
`tech: [next, vue, react, svelte, angular]`

Same taint pattern as `detect_cspt_fetch_url_param`, but for the `XMLHttpRequest.open()` and `axios.get/post/put/delete/patch/head/options(...)` sinks instead of `fetch()`. XHR and axios requests carry the same cookies/auth headers as `fetch()`, so the same traversal-reroute impact applies wherever a bundle uses one of these request builders instead of (or alongside) `fetch()`. Skips the sink when the interpolated value is wrapped in `encodeURIComponent`/`encodeURI`.

### `detect_dom_xss_dangerouslySetInnerHTML` — XSS via raw-HTML sink (`dangerouslySetInnerHTML` / `v-html`)

`severity: high`
`tech: [next, vue]`

Detects raw-HTML rendering sinks where the value is **not** a literal. Covers two compiled shapes:

- React's `dangerouslySetInnerHTML={{ __html: X }}` — compiled to an `ObjectProperty` with key `__html`.
- Vue's `v-html="X"` directive — compiled by Vite/Vue's template compiler to an `ObjectProperty` `{ innerHTML: X }` (paired with a `["innerHTML"]` patchFlag tuple).

The rule fires when the property value is _not_ a `StringLiteral`, `TemplateLiteral`, `NullLiteral`, `NumericLiteral`, or `BooleanLiteral` — that is, it's a member access, identifier, or call result — and is not the direct return value of a call to a common sanitizer/encoder function (for example `DOMPurify.sanitize(...)`, `sanitizeHtml(...)`, `escapeHtml(...)`).

To minimise false positives from vendor chunks that include CSS-only uses of these sinks (which never appear alongside `fetch`), the rule additionally requires a `fetch(...)` call **in the same chunk**. The combination is a strong indicator that the HTML being rendered comes from a server response — for example, a comment body, post content, or any other user-controllable record.

Typical compiled match (React, `app/post/[id]/page.tsx`):

```jsx
<div dangerouslySetInnerHTML={{ __html: comment.content }} />
```

Compiled to:

```js
{
    dangerouslySetInnerHTML: {
        __html: o.content;
    }
}
```

Typical compiled match (Vue, `src/views/PostDetail.vue`):

```vue
<div class="comment-content" v-html="comment.content" />
```

Compiled by Vite to:

```js
_createElementVNode(
    "div",
    _mergeProps({ class: "comment-content" }, { innerHTML: comment.content }),
    null,
    16,
    ["innerHTML"]
);
```

### `detect_react_createelement_dynamic_type` — React `createElement` XSS gadget via dynamic component type

`severity: medium`
`tech: [next, react]`

Fires when a URL-derived value co-occurs with `React.createElement(type, props, ...children)` (or a bare `createElement(...)` call) whose _first_ argument — the component/tag type — is not a string literal. A bundler commonly wraps a module-level function reference as `(0, mod.createElement)(...)` to strip an unwanted `this` binding; the rule matches both that form and a direct `mod.createElement(...)`/bare `createElement(...)` call. When the type argument is attacker-controlled, React renders whatever tag name the value resolves to — depending on which of type/props/children are also attacker-influenced, this ranges from a limited primitive up to full markup/attribute injection.

### `detect_jquery_html_injection_url_param` — XSS via URL parameter into a jQuery HTML-building sink

`severity: high`
`tech: [next, vue, react, svelte, angular]`

Fires when a URL-derived value co-occurs with the jQuery constructor (`$(...)` / `jQuery(...)`) called on a dynamically built string (template literal or concatenation), or with `.html(...)` called on a non-literal value. jQuery's constructor parses a string argument that looks like markup and builds live DOM nodes from it — a sink most reviewers don't treat as one because it doesn't read like `innerHTML`.

### `detect_dompurify_forcekeepattr_hook` — DOMPurify sanitizer bypass via `forceKeepAttr` hook

`severity: high`

Presence-based rule: fires on any assignment to `.forceKeepAttr` (for example `data.forceKeepAttr = true`) inside a DOMPurify `uponSanitizeAttribute`/`uponSanitizeElement` hook callback. Setting this flag tells DOMPurify to skip its own attribute safety check for that attribute entirely — on DOMPurify 3.1.3–3.1.5 this is a guaranteed sanitizer bypass, and on any version it disables a safety check the app likely didn't intend to disable for arbitrary attributes.

### `detect_open_redirect_url_param` — DOM-based open redirect

`severity: high`

Fires when a URL-derived value co-occurs with a navigation sink in the same chunk. Sinks: `window.location.href = X`, `location.assign(X)`, `location.replace(X)`, `window.open(X)`. Classic OAuth/SSO `?next=`-style abuse; without an origin/path allowlist, the attacker picks where the victim lands after auth. Skips the sink if the navigated-to value is the direct return of a call whose name signals redirect validation (contains "sanitize," "safe," "valid," or "allow" — for example `isSafeRedirectUrl(...)`) or is wrapped in `encodeURIComponent`/`encodeURI`.

### `detect_cookie_manipulation_url_param` — DOM-based cookie manipulation

`severity: high`

Fires when a URL-derived value co-occurs with `document.cookie =` in the same chunk. Beyond setting an unexpected cookie value, a `;`-injected attribute (Path, Domain, Expires) can pin a cookie the application then trusts; if the value is later read back into `.innerHTML`, the rule pair also chains into stored DOM XSS. Skips the write when the assigned value is fully wrapped in `encodeURIComponent`/`encodeURI` — directly, or as the sole interpolated expression in a template literal — since proper URI-encoding neutralizes the cookie-attribute injection.

### `detect_websocket_url_poisoning` — WebSocket URL poisoning

`severity: high`

Fires when a URL-derived value co-occurs with `new WebSocket(...)` in the same chunk. An attacker who controls the WebSocket endpoint URL can push arbitrary frames to the victim page — UI tampering, data injection, or chained XSS depending on how the messages are rendered. Skips the sink if the WebSocket URL is the direct return of a call whose name signals validation intent (contains "sanitize," "safe," "valid," or "allow" — for example `buildSafeWsUrl(...)`).

### `detect_dom_setattribute_url_param` — DOM-Data manipulation via `setAttribute`

`severity: high`

Fires when a URL-derived value co-occurs with `element.setAttribute(name, value)` where `name` is one of the script/CSS/HTML-execution attributes: `src`, `href`, `srcdoc`, `action`, `formaction`, `background`, `poster`, `style`, `data`, `xlink:href`. `src`/`href` accept `javascript:` URIs, `style` enables CSS injection, `srcdoc` permits direct HTML injection into iframes. The attribute-name allowlist suppresses the bulk of legitimate `setAttribute` traffic (`class`, `id`, `aria-*`, `data-*`). Skips the write if the attribute value is the direct return of a call to a common URL/HTML sanitizer (for example `sanitizeUrl(...)`, `DOMPurify.sanitize(...)`, `encodeURIComponent(...)`).

### `detect_storage_manipulation_url_param` — HTML5 storage poisoning

`severity: high`

Fires when a URL-derived value co-occurs with `localStorage.setItem(...)` or `sessionStorage.setItem(...)` in the same chunk. Because storage persists across visits, a single poisoning URL plants a payload that fires on every subsequent page load — especially dangerous when the stored value is later read back into a DOM sink. Skips the write if the stored value is the direct return of a call whose name signals validation intent (contains "sanitize," "safe," "valid," "allow," or "escape" — for example `validateTheme(...)`).

### `detect_js_injection_eval` — JavaScript injection via `eval` / `Function` / `setTimeout`-string

`severity: high`

Fires when a URL-derived value co-occurs with one of: `eval(X)`, `window.eval(X)`, `new Function(X)`, `setTimeout(<string>, ...)`, `setInterval(<string>, ...)` in the same chunk. These sinks execute their argument as JavaScript in the page origin — full DOM-XSS / arbitrary-code-execution primitives. The `setTimeout`/`setInterval` variants exclude the safe function-callback forms via `:not([arguments.0.type="ArrowFunctionExpression"])` etc., and also exclude a `.bind(...)` call as the first argument (for example, `this.render.bind(this, delay)`), since that produces a bound function reference rather than a string to execute.

### `detect_json_injection_to_dangerouslysetinnerhtml` — Client-Side JSON Injection into React render

`severity: high`

Three-way co-occurrence rule: URL-derived value + `JSON.parse(...)` + dynamic `dangerouslySetInnerHTML` in the same chunk. The pattern `JSON.parse(searchParams.get("config"))` flowing into a React render gives an attacker a stored-style XSS via JSON field values. Tighter than the plain `dangerouslySetInnerHTML` rule because all three signals must be present. Skips the sink if the assigned value is the direct return of a call to a common sanitizer/encoder function (for example `DOMPurify.sanitize(...)`, `sanitizeHtml(...)`, `escapeHtml(...)`).

### `detect_ajax_header_manipulation` — Ajax request-header manipulation

`severity: high`

Fires when a URL-derived value co-occurs with a `fetch()` call whose `headers` object contains a computed-key property (`{ [k]: v }`) where the key itself is not a fixed string — a plain string literal or interpolation-free template literal in bracket notation (for example, `["Content-Type"]: v`) doesn't count, since the header name isn't attacker-controllable in that case. Lets an attacker spoof `Authorization`, `X-Forwarded-For`, `X-Admin-Override`, or any other header that backend middleware trusts for access control.

### `detect_link_manipulation_href` — Link manipulation (`javascript:` URI sink)

`severity: high`

Fires when a URL-derived value co-occurs with an `element.href = X` assignment **other than** `window.location.href` (covered by the open-redirect rule), or with `.setAttribute("href", X)`. When the element is clickable, `X = "javascript:alert(1)"` executes in the page origin on click. Skips the write if the assigned value is the direct return of a call to a common URL/HTML sanitizer (for example `sanitizeUrl(...)`, `DOMPurify.sanitize(...)`, `encodeURIComponent(...)`).

### `detect_redos_url_param` — DOM-based ReDoS

`severity: medium`

Fires when a URL-derived value co-occurs with `new RegExp(pattern)` / `RegExp(pattern)` where `pattern` is not a string/regex literal. JavaScript is single-threaded — a catastrophic-backtracking pattern from the URL freezes the victim tab. Skips the sink if the pattern is the direct return of a call to a regex-escaping helper (for example lodash's `escapeRegExp(...)`), since escaping metacharacters removes the backtracking primitives ReDoS depends on.

### `detect_css_injection_style_sink` — CSS injection via URL parameter into a style sink

`severity: medium`

Fires when a URL-derived value co-occurs with `element.style.cssText = X`, `element.setAttribute("style", X)`, or a CSS-in-JS tagged template (`styled.<tag>` / `styled(Component)` / `css`) that interpolates the value. Attacker-controlled CSS can exfiltrate other page data via request-issuing selectors (`@import`, `background-image: url(...)`) or conditional-render primitives, entirely without executing any JavaScript — so this sink is dangerous even behind a strict script-blocking CSP.

### `detect_client_side_authz_gate` — Client-side authorization gate on a role/entitlement flag

`severity: info`

Fires on an `if` statement (or its minified ternary/`&&` equivalent) whose condition reads a role or entitlement flag — `isAdmin`, `isPaid`, `isPremium`, `isSubscribed`, `subscriptionType`, `userRole`, `permissionLevel`, `accessLevel` — directly off an object, and uses it to decide whether to render UI or call an endpoint. This is a heuristic, informational finding: when the backend independently re-derives the same authorization decision, the client-side check is harmless. When it doesn't, an attacker can flip the flag in the response before the JS reads it, or call the underlying endpoint directly, and reach functionality the UI never exposes. Manual verification of server-side enforcement is required before treating a match as a confirmed finding.

### `detect_insecure_random_token_storage` — Insecure PRNG (`Math.random`) feeding a session/token storage sink

`severity: medium`

Fires when a value derived from `Math.random()` co-occurs with a write to `document.cookie` or `localStorage`/`sessionStorage.setItem(...)` in the same chunk. `Math.random()` is not a cryptographically secure PRNG — its output is predictable from a handful of observed samples — so a session, CSRF, or other security-relevant token generated this way and persisted client-side can be predicted by an attacker who observes a few generated values. Use `crypto.randomUUID()` or `crypto.getRandomValues()` instead.

### `detect_cloud_credentials_in_bundle` — hardcoded cloud-provider credentials in JS bundle

`severity: high`

Detects string literals in compiled JavaScript matching well-known cloud-provider credential formats: AWS access key IDs (`AKIA`/`ASIA` prefix) and Google Cloud API keys (`AIza` prefix). These values compile directly into the bundle and are readable by anyone who fetches the JS file. An AWS access key ID is a long-lived IAM credential rather than a scoped browser key, so a match here is high-value on its own. Skips AWS's own documentation placeholder (`AKIAIOSFODNN7EXAMPLE`) and any match whose body is a run of 10+ identical characters, since these are masked/placeholder display values rather than real credentials.

### `detect_hardcoded_hmac_signing_key` — hardcoded HMAC signing key fed into `createHmac`

`severity: high`

Fires on a `crypto.createHmac(algorithm, key)` call (member-expression or destructured form) whose `key` argument is a string literal at least 8 characters long, rather than a value read from a server response or request-scoped input. This rule is format-independent: it doesn't look for a recognizable secret shape, it looks for how the value is used — as a signing key fed directly into an HMAC construction. If the client signs or verifies a token with a key baked into the bundle, anyone who downloads the JS can extract the key and forge a signature the server will accept.

### `detect_non_global_regex_sanitizer` — HTML/script sanitizer using a non-global regex `.replace()`

`severity: medium`

Fires on a `.replace(/pattern/, "")` call whose regex looks like an HTML/script sanitization filter (matches `<script`, an `on*=` event-handler attribute, `javascript:`, or a bare angle bracket) but is missing the global (`g`) flag. Without `/g`, `String.prototype.replace` strips only the first match — a payload with a second occurrence of the filtered pattern survives the "sanitizer" untouched (for example `<script></script><script>` with only the first tag stripped still leaves a working `<script>` tag). This is a client-side filter-bypass primitive, not proof that the value reaches an unescaped sink — pair it with the surrounding render path before treating it as a confirmed XSS.

### `detect_prototype_pollution_merge_gadget` — `Object.assign(target, JSON.parse(...))` prototype-pollution gadget

`severity: medium`

Fires on an `Object.assign(target, JSON.parse(input))` call — merging a freshly parsed JSON value directly into another object with no `__proto__`/`constructor`/`prototype` key filtering. If `input` is attacker-controlled (a postMessage payload, a URL parameter, a response body), an attacker can supply `{"__proto__":{"x":1}}` to pollute `Object.prototype` itself, silently changing the behavior of every object on the page. This is a common gadget for auth-check bypass or config override once a nested property the app trusts gets overwritten. Presence-based: it fires on the merge shape itself, since a guard that would make this safe isn't always visible in the same expression.

---

## Tuning false positives vs. false negatives

These rules sit on a spectrum:

- **Loose enough to generalise.** The URL-source clause is a union of every common Web-API and Next.js shape, not a single pattern. The sink clauses cover `TemplateLiteral`, `BinaryExpression`-concatenation, and bare identifiers — so the rules catch hand-rolled string-builders alongside the canonical template-literal form.
- **Strict enough to suppress noise.** Every taint rule requires both a source pattern _and_ a sink pattern in the same module. Pure sink-presence (for example, an `innerHTML` write inside a React vendor chunk) does not fire — those chunks never read from `location.search`.

If you do hit a false positive in a vendor chunk, the right fix is usually to extend the rule's `:not(...)` exclusions or to scope the sink step with `inScopeOf` so it must sit inside the same enclosing function as the source. See the [AST engine docs](./engines/ast-engine.md#inscopeof--scoping-an-esquery-to-a-previous-match) for the scoping primitive.
