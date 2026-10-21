---
sidebar_position: 14
---

# Proxy command

The `proxy` command configures and manages an outbound proxy used to route js-recon's requests
through something other than your own IP — useful against targets that rate-limit by IP, or
when you want to route through a specific provider. It supports four pluggable methods, selected
via `--proxy-method`:

| Method    | Description                                       | Reference                  |
| --------- | ------------------------------------------------- | -------------------------- |
| `aws`     | Throwaway AWS API Gateway REST APIs (IP rotation) | [AWS](./proxy/aws)         |
| `oxylabs` | Oxylabs datacenter proxy                          | [Oxylabs](./proxy/oxylabs) |
| `socks`   | Generic SOCKS5 proxy                              | [SOCKS](./proxy/socks)     |
| `http`    | Generic HTTP proxy                                | [HTTP](./proxy/http)       |

The resolved proxy is used by every module that makes outbound HTTP requests: `lazyload` (including
its Puppeteer-driven page visits), the shared request client used across the tool, and the `analyze`
rules-download step.

**Configuration is one-directional.** The `proxy` command is the only place you set a method or
credentials — it writes everything to `.proxy_config.json`. `lazyload` and `run` only ever _read_ that
file (plus environment variables); they don't accept method or credential flags at all. This keeps
credentials out of every `lazyload`/`run` invocation and out of its shell history — it does not make the
initial `proxy` configuration step itself safe from shell-history exposure; see the flag warnings on
each method's page for that.

Running `js-recon proxy -i` (or `--init`) with no other flags launches an interactive wizard: pick a
method (`aws`, `socks`, `http`, or `oxylabs`), then fill in that method's fields. The result is written
to `.proxy_config.json` (or the path given via `-c/--config`). Passing flags alongside `-i` pre-fills
those specific fields and skips their prompts — pass `--proxy-method` together with all of a method's
fields to run entirely non-interactively (for example, in CI). Only one method is "active" at a time —
whichever method you last ran `-i` on sets the active `method`, but re-running `-i` on a different
method doesn't discard the other methods' saved configurations.

## Check feasibility

`--feasibility` checks whether using a proxy actually helps against a target's firewall/WAF, for
any of the four proxy methods:

1. It requests `--feasibility-url` directly, without any proxy. If no firewall is detected, a proxy
   isn't needed for this target — the tool prints a message and exits with code `27`.
2. If a firewall **is** detected on the direct request, it retries through the resolved proxy method
   (`--proxy-method`, together with that method's fields, or whatever is already configured via
   `-i/--init` in the config file) up to 10 times.
    - If the firewall is still detected through the proxy, it exits with code `28` — the proxy
      doesn't help here.
    - If the firewall is no longer detected, it prints a message recommending the proxy and exits
      with code `0`.

See [Exit Codes](../exit_codes.md) for the full list.

```bash
# Uses the method already configured via -i/--init in .proxy_config.json
js-recon proxy --feasibility --feasibility-url https://example.com

# Or specify the method (and its fields) directly, without configuring one first
js-recon proxy --feasibility --feasibility-url https://example.com \
  --proxy-method socks --proxy socks5://user:pass@127.0.0.1:1080
```

## `.proxy_config.json` schema

A single file holds one key per method plus the currently active `method`:

```json
{
    "method": "socks",
    "aws": {
        "<gateway-name>": {
            "id": "...",
            "name": "...",
            "description": "...",
            "created_at": 0,
            "region": "us-east-1",
            "access_key": "...",
            "secret_key": "..."
        }
    },
    "socks": {
        "url": "socks5://user:pass@host:1080"
    },
    "http": {
        "url": "http://user:pass@host:8080"
    },
    "oxylabs": {
        "username": "...",
        "password": "...",
        "country": "US",
        "endpoint": "dc.oxylabs.io:8000"
    }
}
```

:::danger
`.proxy_config.json` stores credentials in plain text — AWS secret keys and the Oxylabs password among
them. Never commit it or share it outside the engagement team, and restrict its file permissions to
the owning user only.
:::

## Migrating from `.api_gateway_config.json`

If you have an existing `.api_gateway_config.json` from before this rename (a flat map of gateways,
without an `aws` key wrapping it), js-recon still reads it correctly: when `.proxy_config.json` has no
`aws` key but its top-level shape matches the legacy flat map, it's used as-is (with a one-time
warning). The next time you run `proxy -i`, `--destroy`, or `--destroy-all`, the file is rewritten
in the new nested `{ "aws": {...} }` shape automatically — no manual editing required.

## Flags available on `lazyload` and `run`

`lazyload` and `run` take **only** these two flags — no method or credential flags. Both are declared
identically on both commands.

| Option                  | Description                                                                  | Default              |
| ----------------------- | ---------------------------------------------------------------------------- | -------------------- |
| `--proxy-config <file>` | Proxy config file to read (generated via `js-recon proxy -i`).               | `.proxy_config.json` |
| `--ignore-proxy-env`    | Skip `JS_RECON_*` proxy environment variables during resolution (see below). | `false`              |

### Example

```bash
js-recon proxy -i --proxy-method socks --proxy socks5://user:pass@127.0.0.1:1080
js-recon run -u https://example.com --proxy-config .proxy_config.json
```

## Resolution precedence

`lazyload`/`run` resolve the active proxy configuration in this order, **highest wins**:

1. Environment variables (read automatically unless `--ignore-proxy-env` is passed):
    - `JS_RECON_PROXY_METHOD` (`aws` | `socks` | `http` | `oxylabs`)
    - `JS_RECON_PROXY_URL` (for the `socks`/`http` methods)
    - `JS_RECON_OXYLABS_USERNAME`, `JS_RECON_OXYLABS_PASSWORD`, `JS_RECON_OXYLABS_COUNTRY`,
      `JS_RECON_OXYLABS_CITY`, `JS_RECON_OXYLABS_SESSION_ID`, `JS_RECON_OXYLABS_ENDPOINT` (a config file
      endpoint never receives a command-line or environment password; see
      [Oxylabs entry endpoint](./proxy/oxylabs#entry-endpoint))
    - The `aws` method has no `JS_RECON_`-prefixed env vars of its own. Since `lazyload` and `run` don't
      accept `--aws-access-key`/`--aws-secret-key`/`-r`/`--region` (those stay `proxy`-only), these
      consumers resolve AWS credentials and region from the plain AWS SDK env vars
      (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION`/`AWS_DEFAULT_REGION`) or the default AWS
      SDK credential chain.
2. `.proxy_config.json` (or the path given via `--proxy-config`) — written by `js-recon proxy -i`.

Pass `--ignore-proxy-env` on `lazyload` or `run` to skip step 1 entirely and resolve straight from the
config file (useful if you have `JS_RECON_*` variables exported globally for other scans but don't
want a proxy for a particular run).

## How the resolved proxy is used

Once resolved, the proxy is wired into both the tool's own HTTP requests and its Puppeteer-driven
page visits:

- **HTTP requests** — routed through an `undici` `Socks5ProxyAgent` (`socks` method) or
  `ProxyAgent` (`http`/`oxylabs` methods). The `aws` method instead proxies requests through a
  provisioned API Gateway REST API (see [AWS](./proxy/aws)).
- **Puppeteer** — launched with a `--proxy-server=` argument derived from the resolved method,
  plus `page.authenticate()` for methods with credentials.
