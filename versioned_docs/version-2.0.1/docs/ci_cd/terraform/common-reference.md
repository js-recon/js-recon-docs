---
sidebar_position: 8
---

# Common Reference

Every per-provider JS Recon Terraform module — [AWS](./aws.md), [GCP](./gcp.md), [Azure](./azure.md), [DigitalOcean](./digitalocean.md), [IBM Cloud](./ibm.md), [Oracle Cloud](./oci.md), [Alibaba Cloud](./alibaba.md) — shares the same core scan-control inputs, the same set of output files, and the same break-condition and version-pinning mechanics. This page documents that shared surface once; each provider page documents only what's actually specific to that cloud (compute resource, storage backend, scheduling mechanism, and any provider-only inputs).

## Common inputs

| Name                       | Required | Default           | Description                                                |
| -------------------------- | -------- | ----------------- | ---------------------------------------------------------- |
| `js_recon_version`         | No       | `latest`          | JS Recon version (`latest`, `alpha`, `1.3.1-beta.1`, …)    |
| `break_on_map_files`       | No       | `true`            | Fail if `.map` source map files are detected               |
| `break_on_vulnerabilities` | No       | `true`            | Fail if findings at or above the threshold are detected    |
| `vulnerability_severity`   | No       | `high`            | Minimum severity to fail on: `low`, `medium`, or `high`    |
| `output_dir`               | No       | `js-recon-output` | Directory to save output files inside the scan environment |

Every provider module also exposes its own required `url` input and a resource-naming/tagging input (named `tags`, `labels`, or `freeform_tags` depending on the platform's native terminology, and typed as a map or list depending on the platform) — see the provider's own Inputs table for those, since the name, type, and default differ by platform.

**Note on `build_timeout`:** every provider exposes a `build_timeout` input, but the unit differs by platform — AWS, GCP, Azure, and DigitalOcean express it in **minutes** (default `30`), while IBM Cloud, Oracle Cloud, and Alibaba Cloud express it in **seconds** (default `1800`, the equivalent of 30 minutes). This reflects the underlying compute service's native unit, not a docs inconsistency — always check the provider's own Inputs table for the correct unit.

## Output files

Every provider module writes the same set of files into `output_dir` and uploads them to the platform's own object storage:

| File                  | Description                               |
| --------------------- | ----------------------------------------- |
| `analyze.json`        | All vulnerability findings                |
| `mapped.json`         | Parsed bundle structure                   |
| `mapped-openapi.json` | Extracted HTTP endpoints (OpenAPI format) |
| `endpoints.json`      | Client-side routes                        |
| `strings.json`        | Extracted strings, URLs, and secrets      |
| `report.html`         | Full HTML report                          |
| `js-recon.db`         | SQLite database of all findings           |

See the provider's own "Output files" section for the exact upload destination and mechanism (S3, GCS, Azure Blob Storage, Spaces, IBM COS, OCI Object Storage, or Alibaba OSS).

## Break conditions

Two inputs control whether a scan run fails:

### Source maps (`break_on_map_files`)

When `true` (the default), the run fails if any `.map` source map file is detected on the target. Set `break_on_map_files = false` to continue the scan even when source map files are found.

### Vulnerabilities (`break_on_vulnerabilities` / `vulnerability_severity`)

When `break_on_vulnerabilities` is `true` (the default), the run fails if any finding at or above `vulnerability_severity` is detected. `vulnerability_severity` accepts `low`, `medium`, or `high` (default `high`).

See the provider's own "Break conditions" section for the module-specific HCL snippet.

## Pinning to a specific JS Recon version

Every provider module accepts `js_recon_version` to pin an exact release instead of tracking `latest`:

```hcl
js_recon_version = "1.3.1"
```

Use `alpha` or `beta` to track the latest pre-release channel instead of a pinned version. See the provider's own page for the full module block with its required arguments included.
