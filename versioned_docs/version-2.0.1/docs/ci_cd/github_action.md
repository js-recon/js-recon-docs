---
sidebar_position: 1
---

import Link from "@docusaurus/Link";

# GitHub Action

Run JS Recon against any URL directly from a GitHub Actions workflow. Surface exposed endpoints, client-side vulnerabilities, and leaked source maps automatically on every push or pull request.

<br />

<Link
    className="button button--primary button--lg"
    to="https://github.com/marketplace/actions/js-recon"
>
    View on GitHub Marketplace →
</Link>

<br />
<br />

## Quick start

```yaml
- name: JS Recon
  uses: js-recon/js-recon-action@v1
  with:
      url: https://your-target.com
```

## Scanning a localhost app

If the target runs on `localhost`, provide a command to start it. The action waits until the URL responds before scanning.

```yaml
steps:
    - uses: actions/checkout@v4

    - name: Install dependencies
      run: npm ci

    - name: Build app
      run: npm run build

    - name: JS Recon
      uses: js-recon/js-recon-action@v1
      with:
          url: http://localhost:3000
          start-cmd: npm start
          working-directory: .
```

## Inputs

| Input                         | Required | Default           | Description                                                                          |
| ----------------------------- | -------- | ----------------- | ------------------------------------------------------------------------------------ |
| `url`                         | Yes      | —                 | URL to scan (external or `http://localhost:PORT`)                                    |
| `start-cmd`                   | No       | —                 | Shell command to start the app for localhost scanning                                |
| `working-directory`           | No       | `.`               | Working directory for `start-cmd`                                                    |
| `version`                     | No       | `latest`          | JS Recon version (`latest`, `alpha`, `1.3.1-beta.1`, …)                              |
| `break-on-map-files`          | No       | `true`            | Fail if `.map` source map files are detected in the output                           |
| `break-on-vulnerabilities`    | No       | `true`            | Fail if findings at or above the threshold are detected                              |
| `vulnerability-severity`      | No       | `high`            | Minimum severity to fail on: `low`, `medium`, or `high`                              |
| `confidential-paths`          | No       | `""`              | Comma or newline-separated keywords to flag as confidential in OpenAPI path segments |
| `break-on-confidential-paths` | No       | `true`            | Fail if confidential path keywords are detected in `mapped-openapi.json`             |
| `output-dir`                  | No       | `js-recon-output` | Directory to save output files                                                       |

## Outputs

| Output                     | Description                                                     |
| -------------------------- | --------------------------------------------------------------- |
| `map-files-found`          | `true` if `.map` files were detected, `false` otherwise         |
| `vulnerability-count`      | Number of findings at or above the configured severity          |
| `confidential-paths-found` | Number of OpenAPI paths matching a `confidential-paths` keyword |
| `output-path`              | Absolute path to the output directory                           |

## Output files

JS Recon writes the following files inside the output directory:

| File                  | Description                               |
| --------------------- | ----------------------------------------- |
| `analyze.json`        | All vulnerability findings                |
| `mapped.json`         | Parsed bundle structure                   |
| `mapped-openapi.json` | Extracted HTTP endpoints (OpenAPI format) |
| `endpoints.json`      | Client-side routes                        |
| `report.html`         | Full HTML report                          |
| `js-recon.db`         | SQLite database of all findings           |

## Break conditions

### Source maps

By default, the action fails if `.map` source map files are publicly accessible:

```yaml
- uses: js-recon/js-recon-action@v1
  with:
      url: https://target.com
      break-on-map-files: true # default
```

To disable: set `break-on-map-files: false`.

### Vulnerabilities

Control which severity level triggers a failure:

```yaml
- uses: js-recon/js-recon-action@v1
  with:
      url: https://target.com
      break-on-vulnerabilities: true
      vulnerability-severity: medium # fail on medium or high
```

Available: `low`, `medium`, `high` (default: `high`).

### Confidential paths

Fail the action if any endpoint path in `mapped-openapi.json` contains a keyword you consider confidential (checked case-insensitively against each `/`-separated path segment):

```yaml
- uses: js-recon/js-recon-action@v1
  with:
      url: https://target.com
      confidential-paths: admin,administrator
      break-on-confidential-paths: true # default
```

`confidential-paths` accepts a comma- or newline-separated list. To disable the check, leave `confidential-paths` empty (the default) or set `break-on-confidential-paths: false`.

## Uploading output as an artifact

```yaml
- name: JS Recon
  id: jsrecon
  uses: js-recon/js-recon-action@v1
  with:
      url: https://target.com

- name: Upload output
  if: always()
  uses: actions/upload-artifact@v4
  with:
      name: js-recon-output
      path: ${{ steps.jsrecon.outputs.output-path }}
```

## Pinning to a specific JS Recon version

```yaml
- uses: js-recon/js-recon-action@v1
  with:
      url: https://target.com
      version: 1.3.1
```

Use `alpha` to track the latest pre-release.
