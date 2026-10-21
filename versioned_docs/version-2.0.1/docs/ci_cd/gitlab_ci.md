---
sidebar_position: 2
---

# GitLab CI Component

Run JS Recon against any URL directly from a GitLab CI/CD pipeline. Surface exposed endpoints, client-side vulnerabilities, and leaked source maps automatically on every push or merge request.

## Quick start

```yaml
stages:
    - test

include:
    - component: gitlab.com/shriyanss/js-recon-gitlab-ci/js-recon@1.0.0
      inputs:
          url: "https://your-target.com"
```

## Scanning a localhost app

If the target runs on `localhost`, provide a command to start it. The component waits until the URL responds before scanning.

```yaml
stages:
    - test

include:
    - component: gitlab.com/shriyanss/js-recon-gitlab-ci/js-recon@1.0.0
      inputs:
          url: "http://localhost:3000"
          start_cmd: "npm start"
          working_directory: "."
```

The app files must be present in the job's working directory (use `artifacts` or `cache` from a previous job to place them there).

## Inputs

| Input                         | Required | Default           | Description                                                               |
| ----------------------------- | -------- | ----------------- | ------------------------------------------------------------------------- |
| `url`                         | Yes      | —                 | URL to scan (external or `http://localhost:PORT`)                         |
| `start_cmd`                   | No       | `""`              | Shell command to start the app for localhost scanning                     |
| `working_directory`           | No       | `.`               | Working directory for `start_cmd`                                         |
| `version`                     | No       | `latest`          | JS Recon version (`latest`, `alpha`, `1.3.1-beta.1`, …)                   |
| `break_on_map_files`          | No       | `true`            | Fail if `.map` source map files are detected in the output                |
| `break_on_vulnerabilities`    | No       | `true`            | Fail if findings at or above the threshold are detected                   |
| `vulnerability_severity`      | No       | `high`            | Minimum severity to fail on: `low`, `medium`, or `high`                   |
| `confidential_paths`          | No       | `""`              | Comma-separated keywords to flag as confidential in OpenAPI path segments |
| `break_on_confidential_paths` | No       | `true`            | Fail if confidential path keywords are detected in `mapped-openapi.json`  |
| `output_dir`                  | No       | `js-recon-output` | Directory to save output files                                            |
| `stage`                       | No       | `test`            | Pipeline stage to run in (must be declared in `stages`)                   |

## Outputs (dotenv artifact)

The component writes the following variables to a dotenv artifact. Downstream jobs that declare `needs: [js-recon]` with `artifacts: true` can read them:

| Variable                       | Description                                                     |
| ------------------------------ | --------------------------------------------------------------- |
| `JSR_OUTPUT_PATH`              | Absolute path to the output directory                           |
| `JSR_MAP_FILES_FOUND`          | `true` if `.map` files were detected, `false` otherwise         |
| `JSR_VULN_COUNT`               | Number of findings at or above the configured severity          |
| `JSR_CONFIDENTIAL_PATHS_FOUND` | Number of OpenAPI paths matching a `confidential_paths` keyword |

## Output files

JS Recon writes the following files inside `<output_dir>/<host>/`:

| File                  | Description                               |
| --------------------- | ----------------------------------------- |
| `analyze.json`        | All vulnerability findings                |
| `mapped.json`         | Parsed bundle structure                   |
| `mapped-openapi.json` | Extracted HTTP endpoints (OpenAPI format) |
| `endpoints.json`      | Client-side routes                        |
| `report.html`         | Full HTML report                          |
| `js-recon.db`         | SQLite database of all findings           |

All files are uploaded as a job artifact and are available for download from the GitLab UI.

## Break conditions

### Source maps

By default, the job fails if `.map` source map files are publicly accessible:

```yaml
include:
    - component: gitlab.com/shriyanss/js-recon-gitlab-ci/js-recon@1.0.0
      inputs:
          url: "https://target.com"
          break_on_map_files: "true" # default
```

To disable, set `break_on_map_files: "false"`.

### Vulnerabilities

Control which severity level triggers a failure:

```yaml
include:
    - component: gitlab.com/shriyanss/js-recon-gitlab-ci/js-recon@1.0.0
      inputs:
          url: "https://target.com"
          break_on_vulnerabilities: "true"
          vulnerability_severity: "medium" # fail on medium or high
```

Available: `low`, `medium`, `high` (default: `high`).

### Confidential paths

Fail the job if any endpoint path in `mapped-openapi.json` contains a keyword you consider confidential (checked case-insensitively against each `/`-separated path segment):

```yaml
include:
    - component: gitlab.com/shriyanss/js-recon-gitlab-ci/js-recon@1.0.0
      inputs:
          url: "https://target.com"
          confidential_paths: "admin,administrator"
          break_on_confidential_paths: "true" # default
```

`confidential_paths` accepts a comma-separated list. To disable the check, leave `confidential_paths` empty (the default) or set `break_on_confidential_paths: "false"`.

## Reading output in a downstream job

```yaml
stages:
    - test
    - report

include:
    - component: gitlab.com/shriyanss/js-recon-gitlab-ci/js-recon@1.0.0
      inputs:
          url: "https://target.com"

publish-report:
    stage: report
    needs:
        - job: js-recon
          artifacts: true
    script:
        - echo "Output at $JSR_OUTPUT_PATH"
        - echo "Map files: $JSR_MAP_FILES_FOUND"
        - echo "Vulnerabilities: $JSR_VULN_COUNT"
```

## Pinning to a specific JS Recon version

```yaml
include:
    - component: gitlab.com/shriyanss/js-recon-gitlab-ci/js-recon@1.0.0
      inputs:
          url: "https://target.com"
          version: "1.3.1"
```

Use `alpha` to track the latest pre-release.

## Custom stage

```yaml
stages:
    - security

include:
    - component: gitlab.com/shriyanss/js-recon-gitlab-ci/js-recon@1.0.0
      inputs:
          url: "https://target.com"
          stage: "security"
```
