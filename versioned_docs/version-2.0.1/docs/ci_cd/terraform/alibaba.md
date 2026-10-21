---
sidebar_position: 7
---

import Link from "@docusaurus/Link";

# Alibaba Cloud

Provision an Alibaba Cloud ECI container group that runs JS Recon against any URL. Upload results to OSS automatically.

<br />

<Link
    className="button button--primary button--lg"
    to="https://registry.terraform.io/modules/js-recon/js-recon/alibaba"
>
    View on Terraform Registry →
</Link>

<br />
<br />

## Quick start

```hcl
module "js_recon" {
  source  = "js-recon/js-recon/alibaba"
  version = "~> 1.0"

  url    = "https://example.com"
  region = "ap-southeast-1"
}
```

Set credentials and apply:

```bash
export ALICLOUD_ACCESS_KEY="..."
export ALICLOUD_SECRET_KEY="..."
terraform apply
```

---

## Inputs

| Name                  | Required | Default            | Description                                                         |
| --------------------- | -------- | ------------------ | ------------------------------------------------------------------- |
| `url`                 | Yes      | —                  | Target URL to scan                                                  |
| `region`              | Yes      | —                  | Alibaba Cloud region (for example, `ap-southeast-1`, `cn-hangzhou`) |
| `name_prefix`         | No       | `js-recon`         | Name prefix for all Alibaba Cloud resources                         |
| `container_cpu`       | No       | `2`                | CPU units for the ECI container group                               |
| `container_memory_gb` | No       | `4`                | Memory in GB for the ECI container group                            |
| `create_oss_bucket`   | No       | `true`             | Whether the module creates an OSS bucket for artifacts              |
| `oss_bucket_name`     | No       | _(auto-generated)_ | OSS bucket name (must be globally unique)                           |
| `oss_artifact_prefix` | No       | `js-recon-output`  | OSS object key prefix for uploaded artifacts                        |
| `build_timeout`       | No       | `1800`             | Maximum scan duration in **seconds**                                |
| `tags`                | No       | `{}`               | Tags applied to all Alibaba Cloud resources                         |

See [Common Reference — Common inputs](./common-reference.md#common-inputs) for `js_recon_version`, `break_on_map_files`, `break_on_vulnerabilities`, `vulnerability_severity`, and `output_dir`.

---

## Outputs

| Name                   | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `container_group_name` | Name of the ECI container group                |
| `container_group_id`   | ID of the ECI container group                  |
| `oss_bucket_name`      | Name of the OSS bucket                         |
| `ram_role_name`        | Name of the RAM role assigned to the container |
| `vpc_id`               | ID of the VPC                                  |
| `vswitch_id`           | ID of the VSwitch                              |

---

## Output files

JS Recon writes the [common output files](./common-reference.md#output-files) and uploads them to Alibaba Cloud OSS via `ossutil` with ECS RAM Role authentication.

---

## Break conditions

See [Common Reference — Break conditions](./common-reference.md#break-conditions) for how `break_on_map_files` and `break_on_vulnerabilities`/`vulnerability_severity` work.

### Source maps

```hcl
module "js_recon" {
  source = "js-recon/js-recon/alibaba"
  url    = "https://example.com"
  region = "ap-southeast-1"

  break_on_map_files = true # default
}
```

### Vulnerabilities

```hcl
module "js_recon" {
  source = "js-recon/js-recon/alibaba"
  url    = "https://example.com"
  region = "ap-southeast-1"

  break_on_vulnerabilities = true
  vulnerability_severity   = "medium"
}
```

---

## Scheduled scans

Create an EventBridge scheduled rule via the Alibaba Cloud console after `terraform apply`:

1. Go to **EventBridge → Event Sources → Create Event Source**
2. Select **Scheduled Event** and enter your cron expression. EventBridge uses a six-field format
   (`Seconds Minutes Hours Day-of-month Month Day-of-week`), so 08:00 daily is `0 0 8 * * *`, not the
   five-field Unix `0 8 * * *`. EventBridge runs cron expressions in UTC by default; set the trigger's
   timezone field explicitly if you want `0 0 8 * * *` to mean 08:00 in a different timezone.
3. Create an EventBridge rule targeting the ECI container group restart API

---

## Triggering a scan manually

Restart the ECI container group to run another scan:

```bash
aliyun eci RestartContainerGroup \
  --RegionId ap-southeast-1 \
  --ContainerGroupId <container_group_id>
```

---

## Pinning to a specific JS Recon version

```hcl
module "js_recon" {
  source = "js-recon/js-recon/alibaba"
  url    = "https://example.com"
  region = "ap-southeast-1"

  js_recon_version = "1.3.1"
}
```

See [Common Reference — Pinning](./common-reference.md#pinning-to-a-specific-js-recon-version) for details.
