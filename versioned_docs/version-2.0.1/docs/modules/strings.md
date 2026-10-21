---
sidebar_position: 4
---

# Strings command

The `strings` command is used to extract strings, URLs, and secrets from a directory of JavaScript files. This is useful for identifying sensitive information and potential API endpoints.

## Usage

```bash
js-recon strings -d <directory> [options]
```

## Options

| Option                        | Alias | Description                                                                                                                              | Default          | Required |
| ----------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------- |
| `--directory <directory>`     | `-d`  | Directory containing JS files.                                                                                                           |                  | Yes      |
| `--output <file>`             | `-o`  | JSON file to save the extracted strings.                                                                                                 | `strings.json`   | No       |
| `--extract-urls`              | `-e`  | Extract URLs from the strings.                                                                                                           | `false`          | No       |
| `--extracted-url-path <file>` |       | Output file for extracted URLs and paths (without extension).                                                                            | `extracted_urls` | No       |
| `--permutate`                 | `-p`  | Permutate the URLs and paths found.                                                                                                      | `false`          | No       |
| `--openapi`                   |       | Generate an OpenAPI specification from the paths found.                                                                                  | `false`          | No       |
| `--scan-secrets`              | `-s`  | Scan for secrets within the strings.                                                                                                     | `false`          | No       |
| `--trufflehog`                |       | Run TruffleHog secret scanner on the output directory.                                                                                   | `false`          | No       |
| `--trufflehog-bin <path>`     |       | Path to an existing TruffleHog binary. Skips auto-download.                                                                              | `trufflehog`     | No       |
| `--trufflehog-accept-terms`   |       | Accept TruffleHog's AGPL-3.0 license terms non-interactively so it can be auto-downloaded. Required in non-TTY/CI contexts on first use. | `false`          | No       |

A file that fails to parse (truncated download, an HTML error page saved with a `.js` extension, etc.)
is skipped with a warning; extraction still completes for every other file in the directory.

## Examples

### Basic usage

Extract all strings from a directory of JS files and save them to `strings.json`:

```bash
js-recon strings -d /path/to/js-files
```

### Extract URLs

Extract strings and also identify and save any URLs found within them:

```bash
js-recon strings -d /path/to/js-files -e
```

This will write a new file called `extracted_urls.json` along with the default `strings.json`

### Scan for secrets

Extract strings and scan for any potential secrets or sensitive information:

```bash
js-recon strings -d /path/to/js-files -s
```

This will print all the potential finds on the terminal window.

_Please note that this process could be memory and compute-intensive, and can take longer to run._

### Scan with TruffleHog

Run TruffleHog as a more comprehensive secret scanner on the output directory:

```bash
js-recon strings -d output/ --trufflehog
```

If no TruffleHog binary is found (or provided via `--trufflehog-bin`), the tool offers to auto-download it for you. TruffleHog is licensed under AGPL-3.0, so this requires one-time consent — either an interactive prompt, or `--trufflehog-accept-terms` for CI/non-TTY contexts:

```bash
js-recon strings -d output/ --trufflehog --trufflehog-accept-terms
```

To use an existing installation instead, point `--trufflehog-bin` at it:

```bash
# macOS
brew install trufflehog

# Linux / macOS (install script)
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh
```

```bash
js-recon strings -d output/ --trufflehog --trufflehog-bin /usr/local/bin/trufflehog
```

You can combine both secret scanners in a single run:

```bash
js-recon strings -d output/ -s --trufflehog
```

### Generate OpenAPI specification

Extract URLs and paths, and then generate an OpenAPI specification:

```bash
js-recon strings -d /path/to/js-files -e --openapi
```

This will generate the default `strings.json`, the `extracted_urls.json` file with URLs and paths in simple JSON format, and the `extracted_urls-openapi.json` file. The `extracted_urls-openapi.json` can be imported into API clients like [Postman](https://www.postman.com), [Bruno](https://www.usebruno.com), etc.

### Permutate URLs and Paths

The `--permutate` (`-p`) flag generates new potential endpoints by combining the base of found URLs with all discovered paths. This requires the `-e` flag to be active.

For example, if the tool finds the URL `https://api.example.com/v1/users` and the path `/v2/orders`, it will generate `https://api.example.com/v2/orders`.

```bash
js-recon strings -d /path/to/js-files -e -p
```

The permuted URLs will be saved to `extracted_urls.txt` along with `strings.json` and `extracted_urls.json`

## Secret detection patterns

When `--scan-secrets` is active, each extracted string is matched against the following regex patterns. Findings are printed to the terminal; no output file is written.

| Pattern name                                    | What it matches                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| Cloudinary                                      | `cloudinary://` URL                                                         |
| Firebase URL                                    | `*.firebaseio.com` hostname                                                 |
| Slack Token                                     | `xox[p\|b\|o\|a]-...` bearer tokens                                         |
| RSA private key                                 | PEM header `-----BEGIN RSA PRIVATE KEY-----`                                |
| SSH (DSA) private key                           | PEM header `-----BEGIN DSA PRIVATE KEY-----`                                |
| SSH (EC) private key                            | PEM header `-----BEGIN EC PRIVATE KEY-----`                                 |
| PGP private key block                           | PEM header `-----BEGIN PGP PRIVATE KEY BLOCK-----`                          |
| Amazon AWS Access Key ID                        | `AKIA[0-9A-Z]{16}`                                                          |
| AWS Client ID                                   | `(A3T[A-Z0-9]\|AKIA\|AGPA\|AIDA\|AROA\|AIPA\|ANPA\|ANVA\|ASIA)[A-Z0-9]{16}` |
| Amazon MWS Auth Token                           | `amzn.mws.<uuid>`                                                           |
| Facebook Access Token                           | `EAACEdEose0cBA...`                                                         |
| Facebook OAuth / Client ID / Secret Key         | Facebook credential patterns                                                |
| GitHub                                          | GitHub token near `github` keyword                                          |
| Generic API Key                                 | `api_key` near a 32–45-char alphanumeric value                              |
| Generic Secret                                  | `secret` near a 32–45-char alphanumeric value                               |
| Google API Key / GCP / Drive / Gmail / YouTube  | `AIza[0-9A-Za-z-_]{35}`                                                     |
| Google Cloud Platform OAuth                     | `*.apps.googleusercontent.com`                                              |
| Google OAuth Access Token                       | `ya29.*`                                                                    |
| Google (GCP) Service-account                    | JSON `"type": "service_account"`                                            |
| Heroku API Key                                  | Heroku UUID pattern                                                         |
| LinkedIn Client ID / Secret Key                 | LinkedIn credential patterns                                                |
| MailChimp API Key                               | `<32-hex>-us<N>`                                                            |
| Mailgun API Key                                 | `key-<32 alphanumeric>`                                                     |
| Password in URL                                 | Credentials embedded in a URL (`proto://user:pass@host`)                    |
| PayPal Braintree Access Token                   | `access_token$production$...`                                               |
| Picatic / Stripe / Stripe Restricted API Key    | `sk_live_...` / `rk_live_...`                                               |
| Slack Webhook                                   | `hooks.slack.com/services/T.../B.../...`                                    |
| Square Access Token / OAuth Secret              | `sq0atp-...` / `sq0csp-...`                                                 |
| Twilio API Key                                  | `SK[0-9a-fA-F]{32}`                                                         |
| Twitter Access Token / OAuth                    | Twitter credential patterns                                                 |
| OpenAI User API Key / Project Key / Service Key | `sk-...T3BlbkFJ...` variants                                                |
| Wakatime                                        | `waka_<uuid>`                                                               |
| Artifactory API Token / Password                | `AKC...` / `AP...` prefixes                                                 |
| Authorization Basic / Bearer                    | Raw `basic ...` / `bearer ...` header values                                |
| AWS MWS Key                                     | `amzn.mws.<uuid>`                                                           |
| Base64                                          | Common base64 preambles (`eyJ`, `YTo`, `aHR0cHM6L`, etc.)                   |
| Basic Auth Credentials                          | `://user:pass@host` pattern                                                 |
| Cloudinary Basic Auth                           | `cloudinary://<id>:<secret>@<cloud>`                                        |
| MD5 Hash                                        | 32-character hex string                                                     |

**Note:** patterns like `Generic API Key`, `Generic Secret`, `Base64`, and `MD5 Hash` have a high false-positive rate and should be treated as leads rather than confirmed findings.
