---
sidebar_position: 4
---

import Link from "@docusaurus/Link";

# DigitalOcean

Provision a DigitalOcean Droplet that runs JS Recon against any URL. Upload results to DigitalOcean Spaces automatically.

<br />

<Link
    className="button button--primary button--lg"
    to="https://registry.terraform.io/modules/js-recon/js-recon/digitalocean"
>
    View on Terraform Registry →
</Link>

<br />
<br />

## Quick start

```hcl
module "js_recon" {
  source  = "js-recon/js-recon/digitalocean"
  version = "~> 1.0"

  url               = "https://example.com"
  spaces_access_id  = var.spaces_access_id
  spaces_secret_key = var.spaces_secret_key
}
```

Set your DigitalOcean token and apply:

```bash
export DIGITALOCEAN_TOKEN="dop_v1_..."
export TF_VAR_spaces_access_id="..."
export TF_VAR_spaces_secret_key="..."
terraform apply
```

The scan runs automatically when the Droplet starts. Destroy the Droplet after the scan completes:

```bash
terraform destroy
```

---

## Inputs

| Name                     | Required | Default            | Description                                                                                   |
| ------------------------ | -------- | ------------------ | --------------------------------------------------------------------------------------------- |
| `url`                    | Yes      | —                  | Target URL to scan                                                                            |
| `spaces_access_id`       | Yes\*    | `""`               | Spaces access key ID (\*required when `create_spaces_bucket = true`)                          |
| `spaces_secret_key`      | Yes\*    | `""`               | Spaces secret access key                                                                      |
| `droplet_name`           | No       | `js-recon`         | Name prefix for all DigitalOcean resources                                                    |
| `region`                 | No       | `nyc3`             | DigitalOcean region (for example, `nyc3`, `ams3`, `sgp1`)                                     |
| `droplet_size`           | No       | `s-2vcpu-4gb`      | Droplet size slug — minimum 4 GB RAM recommended                                              |
| `ssh_keys`               | No       | `[]`               | SSH key IDs or fingerprints for manual Droplet access                                         |
| `create_spaces_bucket`   | No       | `true`             | Whether the module creates a Spaces bucket for artifacts                                      |
| `spaces_bucket_name`     | No       | _(auto-generated)_ | Spaces bucket name (must be globally unique)                                                  |
| `spaces_artifact_prefix` | No       | `js-recon-output`  | Object key prefix for uploaded artifacts                                                      |
| `schedule`               | No       | `""`               | Cron expression for recurring scans (for example, `0 8 * * *`). Empty = run once at creation. |
| `build_timeout`          | No       | `30`               | Maximum scan duration in **minutes**                                                          |
| `tags`                   | No       | `[]`               | Tags applied to the Droplet                                                                   |

See [Common Reference — Common inputs](./common-reference.md#common-inputs) for `js_recon_version`, `break_on_map_files`, `break_on_vulnerabilities`, `vulnerability_severity`, and `output_dir`.

---

## Outputs

| Name                     | Description                          |
| ------------------------ | ------------------------------------ |
| `droplet_name`           | Name of the Droplet                  |
| `droplet_id`             | ID of the Droplet                    |
| `droplet_ip`             | Public IPv4 address of the Droplet   |
| `spaces_bucket_name`     | Name of the Spaces bucket            |
| `spaces_bucket_urn`      | URN of the Spaces bucket             |
| `spaces_bucket_endpoint` | HTTPS endpoint for the Spaces bucket |

---

## Output files

JS Recon writes the [common output files](./common-reference.md#output-files) and uploads them to DigitalOcean Spaces via the AWS CLI using the Spaces S3-compatible endpoint.

---

## Break conditions

See [Common Reference — Break conditions](./common-reference.md#break-conditions) for how `break_on_map_files` and `break_on_vulnerabilities`/`vulnerability_severity` work.

### Source maps

```hcl
module "js_recon" {
  source = "js-recon/js-recon/digitalocean"
  url    = "https://example.com"

  break_on_map_files = true # default
}
```

### Vulnerabilities

```hcl
module "js_recon" {
  source = "js-recon/js-recon/digitalocean"
  url    = "https://example.com"

  break_on_vulnerabilities = true
  vulnerability_severity   = "medium"
}
```

---

## Scheduled scans

```hcl
module "js_recon" {
  source = "js-recon/js-recon/digitalocean"
  url    = "https://example.com"

  schedule = "0 8 * * *"
}
```

With a schedule the Droplet stays running and executes the scan via cron. Without a schedule the Droplet runs the scan once at creation.

---

## Re-running a scan manually

```bash
# SSH into the Droplet and run the pre-installed wrapper
ssh root@<droplet_ip>
js-recon-scan
```

Scan logs are written to `/var/log/js-recon.log` on the Droplet.

---

## Spaces access keys

Generate Spaces access keys at **DigitalOcean → API → Spaces Keys**, then pass them as variables:

```bash
export TF_VAR_spaces_access_id="..."
export TF_VAR_spaces_secret_key="..."
```

---

## Pinning to a specific JS Recon version

```hcl
module "js_recon" {
  source = "js-recon/js-recon/digitalocean"
  url    = "https://example.com"

  js_recon_version = "1.3.1"
}
```

See [Common Reference — Pinning](./common-reference.md#pinning-to-a-specific-js-recon-version) for details.
