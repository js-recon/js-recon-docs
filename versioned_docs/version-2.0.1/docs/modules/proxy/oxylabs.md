---
sidebar_position: 2
---

# Oxylabs

The `oxylabs` method configures an [Oxylabs](https://oxylabs.io/) datacenter proxy for js-recon's
outbound requests.

## Usage

```bash
js-recon proxy -i --proxy-method oxylabs [options]
```

## Options

| Option                           | Description                                                                                                           | Default              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `--init`, `-i`                   | Write the resolved Oxylabs config to the config file.                                                                 | `false`              |
| `--config <config>`, `-c`        | Name of the shared proxy config file.                                                                                 | `.proxy_config.json` |
| `--oxylabs-username <username>`  | Oxylabs datacenter proxy username.                                                                                    | -                    |
| `--oxylabs-password <password>`  | Oxylabs datacenter proxy password.                                                                                    | -                    |
| `--oxylabs-country <country>`    | Oxylabs datacenter proxy country code (for example `US`).                                                             | -                    |
| `--oxylabs-endpoint <host:port>` | Oxylabs entry endpoint. Must be a bare `host:port` (DNS name or IPv4 address); see [Entry endpoint](#entry-endpoint). | `dc.oxylabs.io:8000` |
| `--oxylabs-city <city>`          | Currently unsupported — no documented username-level city targeting for datacenter proxies. Passing it errors out.    | -                    |
| `--oxylabs-session-id <id>`      | Currently unsupported via username — sticky sessions are selected by port, not username. Passing it errors out.       | -                    |

### Example

```bash
js-recon proxy -i --proxy-method oxylabs --oxylabs-username myuser --oxylabs-password mypass --oxylabs-country US
```

This writes `{"method": "oxylabs", "oxylabs": {"username": "myuser", "password": "mypass",
"country": "US"}}` (merged with any other methods already in the file) to `.proxy_config.json`,
and marks `oxylabs` as the active method.

## Entry endpoint

Requests and Puppeteer browser launches both connect to the same Oxylabs entry endpoint, which
defaults to the datacenter endpoint `dc.oxylabs.io:8000`. To use another endpoint, set it as
`host:port` with `--oxylabs-endpoint` (stored as `endpoint` in the `oxylabs` block of
`.proxy_config.json`), or with `JS_RECON_OXYLABS_ENDPOINT`. The `-i`/`--init` wizard also asks for it.

js-recon rejects a value with a scheme, credentials, a path, or no port before it sends any request.

:::warning
The endpoint receives the Oxylabs password, so an endpoint from a config file only receives a password
from that same file. With a password from the command line, `JS_RECON_OXYLABS_PASSWORD`, or the
`proxy -i` prompt, set the endpoint with `--oxylabs-endpoint` or `JS_RECON_OXYLABS_ENDPOINT`.
Otherwise js-recon stops before it sends any request. This stops a planted config file from sending
your password to its own host.
:::

## Using it with `lazyload`/`run`

```bash
js-recon proxy -i --proxy-method oxylabs --oxylabs-username myuser --oxylabs-password mypass --oxylabs-country US
js-recon run -u https://example.com --proxy-config .proxy_config.json
```

See the [proxy command overview](../proxy) for the shared `.proxy_config.json` schema and the
`--proxy-config`/`--ignore-proxy-env` flags on `lazyload`/`run`.
