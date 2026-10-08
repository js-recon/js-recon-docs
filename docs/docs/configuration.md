---
sidebar_position: 5
---

# Configuration

On first use, js-recon creates `~/.config/js-recon/config.yaml` with restrictive permissions and a key
for every command option. Values resolve in this order:

1. Environment variables
2. Command-line flags
3. YAML configuration
4. Built-in defaults

Use `JS_RECON_<COMMAND>_<OPTION>` for any command option — for example, `JS_RECON_RUN_THREADS=8` — or
select another config file before the subcommand with the top-level `--config` flag:

```bash
js-recon --config ./operator.yaml run -u https://app.example.com
```

`JS_RECON_CONFIG` also selects a config file and takes precedence over `--config` if both are set.

The existing `proxy --config` and `mcp --config` flags remain command-specific; place the
application-level `--config` before those subcommands to avoid ambiguity.

## Target lists in YAML

Targets for `run`, `lazyload`, and `fingerprint` may be configured as a YAML list. An environment
value or one or more command-line `-u` flags replace the entire YAML list according to the precedence
above:

```yaml
commands:
    run:
        url:
            - https://one.example.com
            - https://two.example.com
```

This is equivalent to the CLI forms described in the [Run command](./modules/run.md#usage) — repeated
`-u` flags, a comma-separated list, or a target file.

See [`config.dist.yaml`](https://github.com/js-recon/js-recon/blob/dev/config.dist.yaml) in the
repository for the complete schema covering every command option.

## Oxylabs CDN/WAF fallback

Oxylabs CDN/WAF fallback is opt-in. Add non-empty `oxylabs.username` and `oxylabs.password` values to
an explicitly selected YAML config, then enable `--oxylabs-waf-fallback` on `run` or `lazyload`. Direct
requests remain the default; only strongly identified CDN/WAF blocks are retried through Oxylabs. The
default paid-request limits are 10 per origin, 100 total, and 25 distinct origins per run
(`--oxylabs-fallback-max-requests`, `--oxylabs-fallback-max-total`, `--oxylabs-fallback-max-origins`):

```bash
js-recon --config ./operator.yaml run \
  --oxylabs-waf-fallback \
  -u https://app.example.com
```

Fallback traffic goes through the datacenter entry endpoint `dc.oxylabs.io:8000` unless
`oxylabs.endpoint` names another `host:port`. The endpoint receives the Oxylabs password, so a YAML
endpoint only receives the YAML password. With `JS_RECON_OXYLABS_PASSWORD`, set
`JS_RECON_OXYLABS_ENDPOINT` as well. js-recon stops before sending any request when the endpoint breaks
this rule, or isn't a bare `host:port`.

`JS_RECON_OXYLABS_USERNAME`, `JS_RECON_OXYLABS_PASSWORD`, `JS_RECON_OXYLABS_COUNTRY`, and
`JS_RECON_OXYLABS_ENDPOINT` override their YAML values unless `--ignore-proxy-env` is set. See [Proxy](./modules/proxy.md) for the credential-based
Oxylabs proxy method, which is a separate feature from this opt-in fallback.
