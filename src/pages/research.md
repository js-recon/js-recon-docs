# Research

JS Recon is backed by peer-reviewed research. Both papers appeared at the IEEE/ACM International Conference on Automated Software Engineering (ASE '26), held October 12–16, 2026, in Munich, Germany.

## Decompiling the Web: Automated Semantic Recovery of Post-compilation Abstraction Leaks

**Authors:** Shriyans Sudhi, Yinxi Liu

**DOI:** [https://doi.org/10.1145/3832783.3837419](https://doi.org/10.1145/3832783.3837419)

### For hackers

- **The bug class:** modern bundlers optimize for speed, not isolation. During the build, they can quietly move backend context, internal routes, and secrets into the public JavaScript bundle that ships to every visitor. The paper calls this _post-compilation semantic collapse_.
- **Why your scanner misses it:** most tools treat a bundle as one flat file. The real app is split into hashed chunks loaded at runtime, so if you only grep what the first page loads, you never see most of the attack surface.
- **What JS Recon does about it:** it parses minified chunks into an abstract syntax tree (AST), pulls out the obfuscated chunk and route maps, and evaluates them in a sandbox to resolve every chunk URL. For Next.js, it also manipulates React Server Component (RSC) streams so the server serializes routing state that never appears in static files.
- **Results across the Tranco top 1M:** more than 2.5 million orphaned sourcemaps; a 97.04% sourcemap extraction rate in controlled tests, against 0% for baseline tools; 6,210 verified secret instances, 6.6 times more than the leading reconnaissance spider; and 447 globally unique verified secrets across 379 root domains.
- **Try it:** [`lazyload`](/docs/docs/modules/lazyload) to pull every chunk, [`sourcemaps`](/docs/docs/modules/sourcemaps) to recover original source, [`map`](/docs/docs/modules/map) to trace functions, and [`strings`](/docs/docs/modules/strings) to hunt secrets.

### Pentest methodology

Only run these steps against targets you're authorized to test. Some of them send forged requests to the server.

1. **Recover the whole bundle, not just the landing page.** Run the full pipeline so every lazily loaded chunk gets resolved and downloaded:

    ```bash
    js-recon run -u https://target.example -y --secrets --trufflehog
    ```

    `-y` allows JS Recon to evaluate the target's chunk maps in its sandbox. Without it, most hashed chunks stay hidden.

2. **Go after orphaned sourcemaps first.** Production often deletes the `//# sourceMappingURL` comment but leaves the `.map` file on the server. JS Recon still requests those files and writes the recovered original source to the sourcemap directory (`extracted/` by default). Search it for `process.env`, internal hostnames, feature flags, `TODO`/`FIXME`, and server-only imports that leaked into the client build.
3. **Look for server context in client chunks.** Search the recovered chunks for server-side material: database or internal API base URLs, admin route constants, and environment values the bundler inlined. These are the abstraction leaks the paper measures.
4. **Map protected routes on Next.js.** The `next_routerStateForge` lazyload method retries redirected routes as RSC requests with a forged `Next-Router-State-Tree` header. That helps on apps that enforce auth only inside a layout component. Seed it with paths you expect to be protected:

    ```bash
    printf 'admin\ndashboard\ninternal\n' > paths.txt
    js-recon run -u https://target.example -y --wordlist paths.txt
    ```

    Any protected page content that comes back is an authorization bug on its own. Any chunks it reveals feed the next steps.

5. **Turn the code into an API surface.** Use the [`map`](/docs/docs/modules/map) output and the generated OpenAPI spec (`mapped-openapi.json`) to list every request the client can make, including ones no UI path triggers. Add `--sj` to have swagger-jacker probe them for unauthenticated access.
6. **Verify secrets before you report them.** Treat `--secrets` and TruffleHog hits as leads. Confirm each one is live with the least-privileged read-only call, check it against your scope, and record which chunk or sourcemap leaked it, so the client can fix their build instead of just rotating the key.

## Secrets without Signatures: An LLM Agent for Logic-Defined Exposures in Recovered JavaScript

**Author:** Shriyans Sudhi

**DOI:** [https://doi.org/10.1145/3832783.3844581](https://doi.org/10.1145/3832783.3844581)

### For hackers

- **The blind spot:** secret scanners match known formats, such as `AKIA...` keys or high-entropy strings. Some values are sensitive only because of how the code uses them, like a random-looking string sent in a custom authentication header. No regular expression catches that. The paper calls these _logic-defined exposures_.
- **The approach:** SwS runs a large language model (LLM) workflow over JavaScript that JS Recon has recovered. Four class-specific prompts hunt for different exposure types, and a coordinator cross-references their findings. Every candidate passes through a shared schema and triage, and verification is checked against scope before anything is tested live.
- **Results across 1,500 recovered production targets:** 303 logic-defined candidates, 40 eligible for verification, and 5 verified end to end as live, exploitable exposures. One was a client-assertion signing bypass found in production JavaScript and confirmed by an offline forgery that anyone can reproduce. TruffleHog, the format-based baseline, matched none of them.
- **Takeaway:** after running a secret scanner, read how the recovered code builds its authentication and signing requests. The interesting bugs live in the logic, not in the token format.

### Pentest methodology

You can follow this workflow by hand or hand each step to an LLM agent. The paper uses one prompt per sink class plus a coordinator.

1. **Recover readable code.** Run the pipeline from the previous paper. For supported stacks, `run` also runs [`refactor`](/docs/docs/modules/refactor), which splits the bundle back into readable modules. Reading the logic needs that readable code more than it needs raw minified chunks.
2. **Start from the sinks and trace backward.** Format scanners start from the value. This method starts from where a value ends up and asks what reaches it:
    - **Signing keys:** HMAC or JWT `sign`/`verify` calls. What literal or constant is used as the key?
    - **Credentials:** places that build an `Authorization` header or run an OAuth token exchange, including custom headers such as `X-App-Key`.
    - **Crypto material:** WebCrypto or Node encrypt, decrypt, and key-derivation calls (`crypto.subtle.importKey`, `createCipheriv`, `pbkdf2`).
    - **Internal surfaces:** base URLs or route constants used only by authenticated request paths.
3. **Do a broad pass for the classes that tracing misses.** Look for endpoints whose response the client stores as a credential (token-issuing endpoints). Also look for client-side authorization checks, such as role flags or `isAdmin` comparisons, that a crafted request can skip.
4. **Record each candidate in the same shape.** Note the value (redacted), its inferred role, where it's defined and used, the proposed impact, and why a format scanner missed it. Merge duplicates and drop anything [`analyze`](/docs/docs/modules/analyze) or TruffleHog already reported.
5. **Triage on two conditions.** A candidate is worth verifying only if the recovered code shows both a reachable sink and a concrete impact, for example, a forged signature that `/api/session` accepts. Park everything else as informational.
6. **Verify with minimal impact.** Capture a baseline first: send the request with no credential, then with a junk credential, and confirm both are rejected. Then send the forged or reused value with placeholder identifiers. Stop at the first clear change from rejected to accepted, and never read real application data. For signing bugs, prove the forgery offline with synthetic inputs before you touch the live service.
