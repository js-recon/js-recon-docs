---
sidebar_position: 1
---

import Link from "@docusaurus/Link";

# AWS

Provision an AWS CodeBuild project that runs JS Recon against any URL. Surface exposed endpoints, client-side vulnerabilities, and leaked source maps automatically on demand or on a schedule.

<br />

<Link
    className="button button--primary button--lg"
    to="https://registry.terraform.io/modules/js-recon/js-recon/aws"
>
    View on Terraform Registry →
</Link>

<br />
<br />

## Quick start

```hcl
module "js_recon" {
  source  = "js-recon/js-recon/aws"
  version = "~> 1.0"

  url = "https://example.com"
}
```

Apply, then trigger a scan:

```bash
aws codebuild start-build --project-name js-recon
```

## Scanning a localhost app

To scan an app running inside the CodeBuild environment, override `JSR_START_CMD` at build time:

```bash
aws codebuild start-build \
  --project-name js-recon \
  --environment-variables-override \
    name=JSR_URL,value=http://localhost:3000,type=PLAINTEXT \
    name=JSR_START_CMD,value="npm start",type=PLAINTEXT
```

The build waits up to 120 seconds for the URL to respond before scanning.

## Inputs

| Name                  | Required | Default            | Description                                                                     |
| --------------------- | -------- | ------------------ | ------------------------------------------------------------------------------- |
| `url`                 | Yes      | —                  | Target URL to scan (external or `http://localhost:PORT`)                        |
| `project_name`        | No       | `js-recon`         | Name prefix for all AWS resources                                               |
| `create_s3_bucket`    | No       | `true`             | Whether the module creates an S3 bucket for artifacts                           |
| `s3_bucket_name`      | No       | _(auto-generated)_ | Explicit S3 bucket name                                                         |
| `s3_artifact_prefix`  | No       | `js-recon-output`  | S3 key prefix for uploaded artifacts                                            |
| `schedule_expression` | No       | `""`               | CloudWatch Events expression (for example, `rate(1 day)`). Empty = no schedule. |
| `build_timeout`       | No       | `30`               | Maximum build duration in **minutes**                                           |
| `tags`                | No       | `{}`               | Tags applied to all AWS resources                                               |

See [Common Reference — Common inputs](./common-reference.md#common-inputs) for `js_recon_version`, `break_on_map_files`, `break_on_vulnerabilities`, `vulnerability_severity`, and `output_dir`.

## Outputs

| Name                     | Description                    |
| ------------------------ | ------------------------------ |
| `codebuild_project_name` | Name of the CodeBuild project  |
| `codebuild_project_arn`  | ARN of the CodeBuild project   |
| `s3_bucket_name`         | Name of the S3 artifact bucket |
| `s3_bucket_arn`          | ARN of the S3 artifact bucket  |
| `iam_role_arn`           | ARN of the CodeBuild IAM role  |

## Output files

JS Recon writes the [common output files](./common-reference.md#output-files) inside the output directory and uploads them to `s3://<bucket>/<s3_artifact_prefix>/` after every scan.

## Break conditions

See [Common Reference — Break conditions](./common-reference.md#break-conditions) for how `break_on_map_files` and `break_on_vulnerabilities`/`vulnerability_severity` work.

### Source maps

```hcl
module "js_recon" {
  source = "js-recon/js-recon/aws"

  url                = "https://example.com"
  break_on_map_files = true # default
}
```

### Vulnerabilities

```hcl
module "js_recon" {
  source = "js-recon/js-recon/aws"

  url                      = "https://example.com"
  break_on_vulnerabilities = true
  vulnerability_severity   = "medium" # fail on medium or high
}
```

## Scheduled scans

Run JS Recon automatically on a CloudWatch Events schedule:

```hcl
module "js_recon" {
  source = "js-recon/js-recon/aws"

  url                 = "https://example.com"
  schedule_expression = "rate(1 day)"
}
```

Both `rate(...)` and `cron(...)` expressions are supported.

## Triggering a scan manually

```bash
# Start a scan
aws codebuild start-build --project-name js-recon

# Override the target URL at build time
aws codebuild start-build \
  --project-name js-recon \
  --environment-variables-override name=JSR_URL,value=https://other.example.com,type=PLAINTEXT
```

## Pinning to a specific JS Recon version

```hcl
module "js_recon" {
  source = "js-recon/js-recon/aws"

  url              = "https://example.com"
  js_recon_version = "1.3.1"
}
```

See [Common Reference — Pinning](./common-reference.md#pinning-to-a-specific-js-recon-version) for details.
