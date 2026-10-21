---
sidebar_position: 3
---

# SOCKS

The `socks` method configures a generic SOCKS5 proxy for js-recon's outbound requests.

## Usage

```bash
js-recon proxy -i --proxy-method socks [options]
```

## Options

| Option                    | Description                                                | Default              |
| ------------------------- | ---------------------------------------------------------- | -------------------- |
| `--init`, `-i`            | Write the resolved SOCKS5 proxy config to the config file. | `false`              |
| `--config <config>`, `-c` | Name of the shared proxy config file.                      | `.proxy_config.json` |
| `--proxy <url>`           | SOCKS5 proxy URL (`socks5://[user:pass@]host:port`).       | -                    |

### Example

```bash
js-recon proxy -i --proxy-method socks --proxy socks5://user:pass@proxyhost:1080
```

This writes `{"method": "socks", "socks": {"url": "socks5://user:pass@proxyhost:1080"}}` (merged
with any other methods already in the file) to `.proxy_config.json`, and marks `socks` as the
active method.

## Using it with `lazyload`/`run`

```bash
js-recon proxy -i --proxy-method socks --proxy socks5://user:pass@proxyhost:1080
js-recon run -u https://example.com --proxy-config .proxy_config.json
```

See the [proxy command overview](../proxy) for the shared `.proxy_config.json` schema and the
`--proxy-config`/`--ignore-proxy-env` flags on `lazyload`/`run`.
