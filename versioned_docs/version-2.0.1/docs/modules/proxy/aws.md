---
sidebar_position: 1
---

# AWS

The `aws` method configures and manages throwaway AWS API Gateway REST APIs, used to rotate the
outbound IP address for js-recon's requests — useful against targets that rate-limit by IP.

## Usage

```bash
js-recon proxy --proxy-method aws [options]
```

## Options

| Option                    | Alias | Description                                                           | Default              | Required |
| ------------------------- | ----- | --------------------------------------------------------------------- | -------------------- | -------- |
| `--init`                  | `-i`  | Create a new API Gateway and save it to the config file.              | `false`              | No       |
| `--destroy <id>`          | `-d`  | Destroy the API Gateway with the given ID.                            |                      | No       |
| `--destroy-all`           |       | Destroy all API Gateways created by this tool, in all regions.        | `false`              | No       |
| `--region <region>`       | `-r`  | AWS region to create the API in.                                      | random region        | No       |
| `--aws-access-key <key>`  |       | AWS access key. Uses `AWS_ACCESS_KEY_ID` env var if not provided.     |                      | No       |
| `--aws-secret-key <key>`  |       | AWS secret key. Uses `AWS_SECRET_ACCESS_KEY` env var if not provided. |                      | No       |
| `--config <config>`       | `-c`  | Name of the shared proxy config file.                                 | `.proxy_config.json` | No       |
| `--list`                  | `-l`  | List all APIs created by this tool.                                   | `false`              | No       |
| `--feasibility`           |       | Check the feasibility of using this method for a target.              | `false`              | No       |
| `--feasibility-url <url>` |       | URL to check the feasibility of.                                      |                      | No       |

`-d/--destroy`, `--destroy-all`, and `-l/--list` are `aws`-only lifecycle actions — `socks`/`http`/`oxylabs`
have no create/destroy lifecycle to manage.

### Examples

#### Initialize the API Gateway

```bash
js-recon proxy -i --proxy-method aws -r us-east-1
```

Or, if the AWS keys are not set in the environment variables:

```bash
js-recon proxy -i --proxy-method aws -r us-east-1 --aws-access-key <access-key> --aws-secret-key <secret-key>
```

This creates a new API Gateway in the given region and saves its configuration to
`.proxy_config.json` (or the path given via `-c/--config`), and marks `aws` as the active method.

#### List created APIs

```bash
js-recon proxy --list
```

#### Destroy an API

Destroy a specific API Gateway using its ID:

```bash
js-recon proxy --destroy <api-id>
```

#### Destroy all APIs

Destroy all APIs created by this tool in all regions:

```bash
js-recon proxy --destroy-all
```

#### Check feasibility

Check if a target URL returns a response that contains known traces of a firewall. If the result
says firewall detected, then it means that the target has blocked the IP addresses originating
from the AWS infrastructure. See [Exit Codes](../../exit_codes.md) for the exit codes this prints.

```bash
js-recon proxy --feasibility --feasibility-url https://example.com --proxy-method aws
```

## Using it with `lazyload`/`run`

```bash
js-recon proxy -i --proxy-method aws -r us-east-1
js-recon run -u https://example.com --proxy-config .proxy_config.json
```

See the [proxy command overview](../proxy) for the shared `.proxy_config.json` schema and the
`--proxy-config`/`--ignore-proxy-env` flags on `lazyload`/`run`.
