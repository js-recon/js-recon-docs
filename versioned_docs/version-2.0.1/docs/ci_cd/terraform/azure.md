---
sidebar_position: 3
---

import Link from "@docusaurus/Link";

# Azure

Provision an Azure Container App Job that runs JS Recon against any URL. Upload results to Azure Blob Storage automatically.

<br />

<Link
    className="button button--primary button--lg"
    to="https://registry.terraform.io/modules/js-recon/js-recon/azure"
>
    View on Terraform Registry →
</Link>

<br />
<br />

## Quick start

```hcl
module "js_recon" {
  source  = "js-recon/js-recon/azure"
  version = "~> 1.0"

  url = "https://example.com"
}
```

After `terraform apply`, trigger a scan:

```bash
az containerapp job start --name js-recon --resource-group js-recon
```

---

## Scanning a localhost app

Override environment variables at job start time to scan an app running inside the container:

```bash
az containerapp job start \
  --name js-recon \
  --resource-group js-recon \
  --env-vars JSR_URL=http://localhost:3000 JSR_START_CMD="npm start"
```

The job waits up to 120 seconds for the URL to respond before scanning.

---

## Inputs

| Name                     | Required | Default            | Description                                                                          |
| ------------------------ | -------- | ------------------ | ------------------------------------------------------------------------------------ |
| `url`                    | Yes      | —                  | Target URL to scan                                                                   |
| `resource_group_name`    | No       | `js-recon`         | Azure resource group name                                                            |
| `location`               | No       | `East US`          | Azure region for all resources                                                       |
| `job_name`               | No       | `js-recon`         | Name prefix for all Azure resources                                                  |
| `create_storage_account` | No       | `true`             | Whether the module creates a Storage Account for artifacts                           |
| `storage_account_name`   | No       | _(auto-generated)_ | Explicit Storage Account name (3-24 lowercase alphanumeric)                          |
| `storage_container_name` | No       | `js-recon-output`  | Blob container name for artifacts                                                    |
| `schedule`               | No       | `""`               | Cron expression for automated scans (for example, `0 8 * * *`). Empty = manual only. |
| `build_timeout`          | No       | `30`               | Maximum job duration in **minutes**                                                  |
| `tags`                   | No       | `{}`               | Tags applied to all Azure resources                                                  |

See [Common Reference — Common inputs](./common-reference.md#common-inputs) for `js_recon_version`, `break_on_map_files`, `break_on_vulnerabilities`, `vulnerability_severity`, and `output_dir`.

---

## Outputs

| Name                         | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| `container_app_job_name`     | Name of the Container App Job                   |
| `container_app_job_id`       | Resource ID of the Container App Job            |
| `storage_account_name`       | Name of the Azure Storage Account               |
| `storage_container_name`     | Name of the Blob container                      |
| `managed_identity_client_id` | Client ID of the user-assigned managed identity |
| `resource_group_name`        | Name of the resource group                      |

---

## Output files

JS Recon writes the [common output files](./common-reference.md#output-files) inside the output directory and uploads them to `https://<storage_account>.blob.core.windows.net/<storage_container>/` using azcopy with the managed identity.

---

## Break conditions

See [Common Reference — Break conditions](./common-reference.md#break-conditions) for how `break_on_map_files` and `break_on_vulnerabilities`/`vulnerability_severity` work.

### Source maps

```hcl
module "js_recon" {
  source = "js-recon/js-recon/azure"
  url    = "https://example.com"

  break_on_map_files = true # default
}
```

### Vulnerabilities

```hcl
module "js_recon" {
  source = "js-recon/js-recon/azure"
  url    = "https://example.com"

  break_on_vulnerabilities = true
  vulnerability_severity   = "medium"
}
```

---

## Scheduled scans

```hcl
module "js_recon" {
  source = "js-recon/js-recon/azure"
  url    = "https://example.com"

  schedule = "0 8 * * *"
}
```

Standard Unix cron expressions are supported.

---

## Triggering a scan manually

```bash
# Start a job execution
az containerapp job start --name js-recon --resource-group js-recon

# Override the target URL at run time
az containerapp job start \
  --name js-recon \
  --resource-group js-recon \
  --env-vars JSR_URL=https://other.example.com
```

---

## Pinning to a specific JS Recon version

```hcl
module "js_recon" {
  source = "js-recon/js-recon/azure"
  url    = "https://example.com"

  js_recon_version = "1.3.1-beta.1"
}
```

See [Common Reference — Pinning](./common-reference.md#pinning-to-a-specific-js-recon-version) for details.
