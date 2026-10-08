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

## Secrets without Signatures: An LLM Agent for Logic-Defined Exposures in Recovered JavaScript

**Author:** Shriyans Sudhi

**DOI:** [https://doi.org/10.1145/3832783.3844581](https://doi.org/10.1145/3832783.3844581)

### For hackers

- **The blind spot:** secret scanners match known formats, such as `AKIA...` keys or high-entropy strings. Some values are sensitive only because of how the code uses them, like a random-looking string sent in a custom authentication header. No regular expression catches that. The paper calls these _logic-defined exposures_.
- **The approach:** SwS runs a large language model (LLM) workflow over JavaScript that JS Recon has recovered. Four class-specific prompts hunt for different exposure types, and a coordinator cross-references their findings. Every candidate passes through a shared schema and triage, and verification is checked against scope before anything is tested live.
- **Results across 1,500 recovered production targets:** 303 logic-defined candidates, 40 eligible for verification, and 5 verified end to end as live, exploitable exposures. One was a client-assertion signing bypass found in production JavaScript and confirmed by an offline forgery that anyone can reproduce. TruffleHog, the format-based baseline, matched none of them.
- **Takeaway:** after running a secret scanner, read how the recovered code builds its authentication and signing requests. The interesting bugs live in the logic, not in the token format.
