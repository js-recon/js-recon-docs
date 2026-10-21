---
sidebar_position: 5
---

import Link from "@docusaurus/Link";

# IBM Cloud

Provision an IBM Code Engine Job that runs JS Recon against any URL. Upload results to IBM Cloud Object Storage automatically.

<br />

<Link
    className="button button--primary button--lg"
    to="https://registry.terraform.io/modules/js-recon/js-recon/ibm"
>
    View on Terraform Registry →
</Link>

<br />
<br />

## Quick start

```hcl
module "js_recon" {
  source  = "js-recon/js-recon/ibm"
  version = "~> 1.0"

  url = "https://example.com"
}
```

Set your IBM Cloud API key and apply:

```bash
export IC_API_KEY="..."
terraform apply
```

Trigger a scan:

```bash
ibmcloud ce job run --name js-recon --project js-recon
```

---

## Inputs

| Name                  | Required | Default            | Description                                           |
| --------------------- | -------- | ------------------ | ----------------------------------------------------- |
| `url`                 | Yes      | —                  | Target URL to scan                                    |
| `project_name`        | No       | `js-recon`         | Name of the IBM Code Engine project                   |
| `job_name`            | No       | `js-recon`         | Name of the Code Engine Job                           |
| `region`              | No       | `us-south`         | IBM Cloud region (for example, `us-south`, `eu-de`)   |
| `resource_group`      | No       | `default`          | IBM Cloud resource group name                         |
| `job_cpu`             | No       | `2`                | CPU units for each job run                            |
| `job_memory`          | No       | `4G`               | Memory for each job run                               |
| `create_cos_bucket`   | No       | `true`             | Whether the module creates a COS bucket for artifacts |
| `cos_instance_name`   | No       | _(auto-generated)_ | COS service instance name                             |
| `cos_bucket_name`     | No       | _(auto-generated)_ | COS bucket name (must be globally unique)             |
| `cos_bucket_region`   | No       | `us-south`         | COS bucket region                                     |
| `cos_artifact_prefix` | No       | `js-recon-output`  | Object key prefix for uploaded artifacts              |
| `build_timeout`       | No       | `1800`             | Maximum job run duration in **seconds**               |
| `tags`                | No       | `[]`               | Tags applied to IBM Cloud resources                   |

See [Common Reference — Common inputs](./common-reference.md#common-inputs) for `js_recon_version`, `break_on_map_files`, `break_on_vulnerabilities`, `vulnerability_severity`, and `output_dir`.

---

## Outputs

| Name                     | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `code_engine_job_name`   | Name of the Code Engine Job                    |
| `code_engine_job_id`     | ID of the Code Engine Job                      |
| `code_engine_project_id` | ID of the Code Engine project                  |
| `cos_bucket_name`        | Name of the COS bucket                         |
| `cos_instance_id`        | Resource ID of the COS service instance        |
| `iam_service_id`         | IAM service ID used by the job to write to COS |

---

## Output files

JS Recon writes the [common output files](./common-reference.md#output-files) and uploads them to IBM COS via the IAM-authenticated S3-compatible REST endpoint.

---

## Break conditions

See [Common Reference — Break conditions](./common-reference.md#break-conditions) for how `break_on_map_files` and `break_on_vulnerabilities`/`vulnerability_severity` work.

### Source maps

```hcl
module "js_recon" {
  source = "js-recon/js-recon/ibm"
  url    = "https://example.com"

  break_on_map_files = true # default
}
```

### Vulnerabilities

```hcl
module "js_recon" {
  source = "js-recon/js-recon/ibm"
  url    = "https://example.com"

  break_on_vulnerabilities = true
  vulnerability_severity   = "medium"
}
```

---

## Scheduled scans

IBM Code Engine periodic timer event subscriptions are set up via the IBM Cloud CLI after `terraform apply`:

```bash
ibmcloud ce sub cron create \
  --name js-recon-schedule \
  --destination js-recon \
  --destination-type job \
  --schedule "0 8 * * *" \
  --project js-recon
```

---

## Triggering a scan manually

```bash
# Run the job
ibmcloud ce job run --name js-recon --project js-recon

# Override the target URL at run time
ibmcloud ce job run \
  --name js-recon \
  --project js-recon \
  --env JSR_URL=https://other.example.com
```

---

## Pinning to a specific JS Recon version

```hcl
module "js_recon" {
  source = "js-recon/js-recon/ibm"
  url    = "https://example.com"

  js_recon_version = "1.3.1"
}
```

See [Common Reference — Pinning](./common-reference.md#pinning-to-a-specific-js-recon-version) for details.
