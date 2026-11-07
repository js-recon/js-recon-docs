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

### `detect_weak_crypto_algorithm` — broken or weak cryptographic algorithm

`severity: low`

Fires on MD5, MD4, SHA-1, DES, Triple DES, RC4 or Rabbit through a CryptoJS-style library, `crypto.subtle.digest`/`importKey`/`sign` with SHA-1, `createHash`/`createHmac` with `md5`/`sha1`, and the ECB block mode. Harmless for non-security checksums, broken for signatures, password hashing, integrity checks or encryption: check what the result protects.

### `detect_dompurify_unsafe_config` — DOMPurify configured to allow script-capable markup

`severity: medium`

Fires on a DOMPurify config with `ALLOW_UNKNOWN_PROTOCOLS: true`, `ADD_TAGS` containing `script`/`iframe`/`object`/`embed`/`base`/`meta`/`style`/`svg`/`math`, or `ADD_ATTR` containing an `on*` handler, `srcdoc`, `formaction` or `xlink:href`. Output sanitized with such a config can still run script.

### `detect_angularjs_sce_disabled` — AngularJS Strict Contextual Escaping disabled

`severity: medium`

Fires on `.enabled(false)` (or `.enabled(!1)`) inside the config function, or its dependency-injection array, that injects `$sceProvider`. With SCE off, `ng-bind-html` and other bindings render untrusted values without sanitization.

### `detect_angularjs_wildcard_resource_url_allowlist` — AngularJS resource URL allowlist with a wildcard

`severity: medium`

Fires when `resourceUrlWhitelist`/`trustedResourceUrlList` gets `'**'` or a pattern with a wildcard scheme or host (`https://**`, `*://**`). Every matching URL is then trusted for `ng-include`, `templateUrl` and iframe sources.

### `detect_document_domain_assignment` — `document.domain` assignment

`severity: low`

Fires on any write to `document.domain`. Pages on sibling subdomains that set the same value can then script this page.

### `detect_cleartext_websocket` — WebSocket over `ws://`

`severity: low`

Fires on `new WebSocket()` with a constant `ws://` URL to a non-local host. The traffic is sent in clear text without authentication; use `wss://`.

### `detect_eval_of_decoded_constant` — encoded constant decoded and executed

`severity: medium`

Fires on `eval`, `Function`, or a string `setTimeout`/`setInterval` whose argument is `atob`, `unescape`, `decodeURIComponent` or `String.fromCharCode` of a constant. Shipping encoded source and running it is a common shape for injected skimmers and obfuscated third-party code.

### `detect_window_open_without_noopener` — `window.open` to a new tab without `noopener`

`severity: info`

Fires on `window.open(url, '_blank')` with no `windowFeatures`. Unlike `<a target=_blank>`, `window.open` doesn't imply `noopener`, so the opened page can navigate this tab, for example to a phishing copy of it.

### `detect_auth_token_in_web_storage` — authentication token in `localStorage`/`sessionStorage`

`severity: info`

Fires on `setItem` with a key that names an access, refresh, ID, auth or session token, a JWT, an API key or a secret. Any script on the origin, so any XSS, can read web storage; an `HttpOnly` cookie isn't exposed that way.

---

## taintwire rules

These rules are evaluated by the [taintwire engine](./engines/taintwire-engine.md), and only when you pass `--analyze-taintwire` to `analyze` or `run`. Each one follows a value from a source to a sink through variables, function arguments and return values inside a chunk, in `deep` mode, and drops flows longer than 8 hops. They cover the same classes as several AST rules above, but don't need the source and sink to be directly connected in one expression.

Sources used below:

- **URL:** `location.hash`, `location.search`, `location.href` (also `window.location.*`), `document.URL`, `document.documentURI`, `document.referrer`, `document.baseURI`.
- **URL without `href`:** the same, minus `location.href`. Frameworks and libraries routinely navigate with, or store, the current URL, so `href` is left out where it caused false positives.

### `detect_taintwire_dom_xss_url` — URL or `window.name` value reaches an HTML sink

`severity: high`

Source: URL or `window.name`. Sink: `innerHTML`/`outerHTML`/`srcdoc`/`cssText` assignment, `document.write`, `insertAdjacentHTML`, jQuery `.html()`, `createContextualFragment`, `setHTMLUnsafe`, React `dangerouslySetInnerHTML.__html`, compiled Vue `v-html`, and an Angular `innerHTML` property call.

### `detect_taintwire_js_exec_url` — URL or `window.name` value reaches `eval` / `Function` / string timer

`severity: high`

Source: URL or `window.name`. Sink: `eval()`, `Function()`/`new Function()`, and a non-function first argument to `setTimeout`/`setInterval`.

### `detect_taintwire_postmessage_flow` — `postMessage` data reaches an HTML, JS execution or navigation sink

`severity: high`

Source: `.data` of the first parameter of a `message` listener (`addEventListener('message', h)` or `onmessage = h`, with `h` inline or a named function). Sink: any HTML or JS execution sink above, or a navigation sink (see the next rule). It doesn't check whether the listener validates `event.origin`; [`detect_postmessage_weak_origin_check`](#detect_postmessage_weak_origin_check--postmessage-handler-using-a-bypassable-origin-check-idiom) covers that.

### `detect_taintwire_open_redirect_url` — URL value reaches a navigation sink

`severity: medium`

Source: URL without `href`. Sink: `location = v`, `x.location = v`, `x.href = v`, `location.assign`/`replace`, `window.open`, and `setAttribute` of `href`/`src`/`action`/`formaction`/`srcdoc` (or a dynamic attribute name).

### `detect_taintwire_cspt_url_request` — URL value reaches a request URL

`severity: medium`

Source: URL. Sink: the URL argument of `fetch`, `$fetch`, `axios` and `axios.get`/`post`/..., `window.fetch`, `XMLHttpRequest.open`, `new WebSocket` and `new EventSource`. Check whether the value can change the request path (client-side path traversal) or only the query string.

### `detect_taintwire_storage_url` — URL value written to a cookie or web storage

`severity: low`

Source: URL without `href`. Sink: `document.cookie = v` and `localStorage`/`sessionStorage.setItem(_, v)`. `document.cookie` isn't a source, because cookie helper libraries read and rewrite it.

### More taintwire rules

All in `deep` mode with a limit of 8 hops. **URL** and **URL without `href`** are the sources defined above; **name** is `window.name`.

| Rule                                            | Source                                                                              | Sink                                                                                                                                                                                                                             | Severity |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `detect_taintwire_dom_xss_framework_sinks`      | URL, name                                                                           | jQuery `$()`/`jQuery()`, `.wrap*()`, `$.parseHTML`, `DOMParser.parseFromString`, `parseHTMLUnsafe`, `execCommand('insertHTML')`, Angular `bypassSecurityTrust*`                                                                  | high     |
| `detect_taintwire_script_injection_url`         | URL, name                                                                           | `new Worker`/`SharedWorker`, `importScripts`, `serviceWorker.register`, dynamic `import()`, `$.getScript`/`$.globalEval`, `setImmediate`/`execScript`, `setAttribute('on…')`, `src`/`text`/`textContent` of a created `<script>` | high     |
| `detect_taintwire_template_injection_url`       | URL, name                                                                           | `_.template`, `.compile`/`.precompile`, AngularJS `$compile`/`$interpolate`/`$parse`/`$eval`/`$apply`/`$watch`, a `template:` component option                                                                                   | high     |
| `detect_taintwire_postmessage_extended_flow`    | `postMessage` data                                                                  | the framework HTML, script and template sinks above, request URLs, cookie and web storage writes, `document.domain`, prototype-pollution sinks                                                                                   | high     |
| `detect_taintwire_client_side_sql_injection`    | URL, name                                                                           | WebSQL `executeSql`, SQLite WASM / sql.js `prepare`/`selectValue`/`selectObjects`, `{ sql: … }`                                                                                                                                  | high     |
| `detect_taintwire_stored_dom_xss`               | `localStorage`/`sessionStorage.getItem`, `document.cookie` read, `history.state`    | HTML and JavaScript execution sinks                                                                                                                                                                                              | medium   |
| `detect_taintwire_api_response_html_xss`        | `await response.json()`/`.text()`, `xhr.responseText`/`responseXML`                 | HTML and JavaScript execution sinks (stored XSS)                                                                                                                                                                                 | medium   |
| `detect_taintwire_link_manipulation_url`        | URL without `href`                                                                  | `.src`/`.action`/`.formAction`/`.data`/`.poster`/`.srcset`/… assignment, `setAttribute`/`setAttributeNS` of URL attributes, jQuery `.attr()`/`.prop()` of `href`/`src`/`action`/…                                                | medium   |
| `detect_taintwire_open_redirect_location_parts` | URL without `href`                                                                  | `location.host`/`hostname`/`protocol` assignment, `navigation.navigate()`                                                                                                                                                        | medium   |
| `detect_taintwire_cspt_extended_request`        | URL without `href`                                                                  | jQuery `$.ajax`/`$.get`/`$.post`/`$.getJSON`/`.load`, `navigator.sendBeacon`, `new Request`, `url`/`baseURL` of a request config object that also sets `method`, `headers`, `data`, `params` or similar                          | medium   |
| `detect_taintwire_request_header_manipulation`  | URL                                                                                 | `setRequestHeader`, `headers: {…}` values and computed names (inline or by reference), `new Headers({…})`, `x.headers.Name = v`, `x.headers.set`/`append`                                                                        | medium   |
| `detect_taintwire_document_domain_manipulation` | URL                                                                                 | `document.domain = v`                                                                                                                                                                                                            | medium   |
| `detect_taintwire_web_message_manipulation`     | URL, name                                                                           | `postMessage` data (including object literal values) or target origin                                                                                                                                                            | medium   |
| `detect_taintwire_prototype_pollution_url`      | URL, name                                                                           | key of `obj[key][k] = v`, lodash `merge`/`mergeWith`/`defaultsDeep`/`setWith`/`zipObjectDeep`, `deepmerge`, jQuery `$.extend(true, …)`                                                                                           | medium   |
| `detect_taintwire_unsafe_dynamic_method_call`   | URL, name                                                                           | computed method name in `obj[name](…)`                                                                                                                                                                                           | medium   |
| `detect_taintwire_xpath_injection`              | URL, name                                                                           | `document.evaluate`, `createExpression`, `selectNodes`/`selectSingleNode`                                                                                                                                                        | medium   |
| `detect_taintwire_cleartext_password_exposure`  | properties named `password`/`passwd`                                                | cookie and web storage writes, `console` logging, request URLs                                                                                                                                                                   | medium   |
| `detect_taintwire_dom_clobbering_gadget`        | non-standard `window.X`/`document.X` read with a fallback (`window.CONFIG \|\| {}`) | script, HTML, navigation and URL-attribute sinks                                                                                                                                                                                 | medium   |
| `detect_taintwire_regex_injection_url`          | URL, name                                                                           | `RegExp()`/`new RegExp()`, `.match`/`.matchAll`/`.search`                                                                                                                                                                        | low      |
| `detect_taintwire_json_injection_url`           | URL, name                                                                           | `JSON.parse`, `$.parseJSON`                                                                                                                                                                                                      | low      |
| `detect_taintwire_css_injection_url`            | URL, name                                                                           | `element.style.<property>`, `element.style`, `setProperty`, `insertRule`, `replaceSync`                                                                                                                                          | low      |
| `detect_taintwire_local_file_path_manipulation` | URL, name                                                                           | `FileReader.readAs*`                                                                                                                                                                                                             | low      |
| `detect_taintwire_insecure_randomness`          | `Math.random()` (and any call chain on it)                                          | cookie and web storage writes, request headers                                                                                                                                                                                   | low      |
| `detect_taintwire_incomplete_url_sanitization`  | URL, name                                                                           | value tested with `includes`/`indexOf`/`startsWith`/`endsWith` against a hostname with no boundary (`startsWith('https://example.com')`, `endsWith('example.com')`)                                                              | low      |
| `detect_taintwire_dom_data_manipulation`        | URL without `href`                                                                  | `history.pushState`/`replaceState` URL, form/link `target`/`method`/`enctype`                                                                                                                                                    | info     |

Not covered by any taintwire rule: values that pass through framework state or routers (React `useState`, Angular `ActivatedRoute`, Vue/Nuxt `useRoute()`, SvelteKit `$page`), Svelte 5 `{@html}` (it compiles to an anonymous helper), mutation XSS after sanitization, and classes with no data flow to follow (UI redressing, CSRF, client-side race conditions).

---

## Tuning false positives vs. false negatives

These rules sit on a spectrum:

- **Loose enough to generalise.** The URL-source clause is a union of every common Web-API and Next.js shape, not a single pattern. The sink clauses cover `TemplateLiteral`, `BinaryExpression`-concatenation, and bare identifiers — so the rules catch hand-rolled string-builders alongside the canonical template-literal form.
- **Strict enough to suppress noise.** Every taint rule requires both a source pattern _and_ a sink pattern in the same module. Pure sink-presence (for example, an `innerHTML` write inside a React vendor chunk) does not fire — those chunks never read from `location.search`.

If you do hit a false positive in a vendor chunk, the right fix is usually to extend the rule's `:not(...)` exclusions or to scope the sink step with `inScopeOf` so it must sit inside the same enclosing function as the source. See the [AST engine docs](./engines/ast-engine.md#inscopeof--scoping-an-esquery-to-a-previous-match) for the scoping primitive.
