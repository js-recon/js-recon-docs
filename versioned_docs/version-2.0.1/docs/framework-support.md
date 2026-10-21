---
sidebar_position: 4
---

# Framework support

The features available in the tool are developed after researching on specific JavaScript Frameworks, which implies that it would only work on those which are research. This document highlights the same thoroughly

## Lazyload

The feature to download all lazy-loaded (dynamically loaded) JavaScript files is available for the following frameworks:

- [Next.js](https://nextjs.org)
- [Nuxt.js](https://nuxt.com)
- [Svelte](https://svelte.dev)
- [Angular](https://angular.dev)
- [Vue.js](https://vuejs.org)
- [React](https://react.dev)

## Proxy (AWS API Gateway method)

This feature will make HTTP requests to the target through Amazon Web Services IP pool. This means that it could potentially bypass misconfigured/poorly configured firewall rules.

However, if the site blocks IP addresses originating from Amazon Web Services, it might not work, or could even break. To check if the firewall blocks the requests or not, use the [`--feasibility`](./modules/proxy/aws.md#check-feasibility) flag.

## Endpoints

The feature to extract the client-side endpoints are available for the following frameworks:

- [Next.js](https://nextjs.org)

## Strings

This feature can be used against all target, regardless of the frameworks they use.

## Map

The feature to map all the functions are available only for the following JavaScript frameworks:

- [Next.js](https://nextjs.org) — both [webpack](https://webpack.js.org/) (`self.webpackChunk_N_E`) and [Turbopack](https://turbo.build/pack) (`globalThis.TURBOPACK`) chunk formats are recognised, so projects on Next.js 15 / Turbopack are mapped just like classic webpack builds.
- [Vue.js](https://vuejs.org) — [Vite](https://vitejs.dev) production chunks (2-character function name convention) are decoded into per-function chunks; for non-bundled / dev-server output, each `.js` and `.vue` module is emitted as a single chunk so it remains analyzable.
- [React](https://react.dev) — ES module and webpack chunk formats are supported; `fetch()` calls are resolved using the same taint-flow analysis as Next.js.
- [Svelte/Astro](https://astro.build) — Vite production chunks are decoded using the same logic as Vue.js; `fetch()` and Axios calls are resolved with the same taint-flow analysis.
- [Angular](https://angular.dev) — Angular CLI (esbuild, v17+) bundles are scanned as whole-file chunks; `HttpClient` method calls (`n.get(url)`, `n.post(url, body)`, etc.) and native `fetch()` calls are resolved using the shared HTTP-client and fetch resolvers.

## Analyze

The static-analysis [`analyze`](./modules/analyze.md) module evaluates AST rules against `mapped.json` and request rules against the generated OpenAPI spec for the following frameworks:

- [Next.js](https://nextjs.org)
- [Vue.js](https://vuejs.org)
- [React](https://react.dev)
- [Svelte/Astro](https://astro.build)
- [Angular](https://angular.dev) — includes the Angular-specific `detect_angular_bypass_security_trust` rule that detects `bypassSecurityTrust*` calls (DomSanitizer bypasses)

## Run

This module automated the flow of other modules, so please refer to specific modules to know the compatibility.

The `run` command provides full pipeline support (lazyload → map → analyze → report) for: **Next.js**, **Vue.js**, **Nuxt.js**, **React**, **Svelte/Astro**, and **Angular**.
