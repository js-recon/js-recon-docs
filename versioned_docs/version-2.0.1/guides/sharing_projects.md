---
sidebar_position: 4
---

# Sharing Projects

JS Recon generates various output files/directories based on which modules are run.

However, most of the modules, directly or indirectly, rely on the main source code of the application.

## Share the lazyload output directory

This means that by just sharing the `output` directory (directory created by [`lazyload`](../docs/modules/lazyload.md) module), the recipient will be able to re-generate all the files again.

## Share the compressed working directory

In case that the files are different from what the tool has initially generate, just sharing the lazyload output folder is not enough.

To preserve those changes, the sender should compress the working directory (directory in which the `js-recon` command is run, and not the `output` directory) and share it with the recipient.

The recipient can uncompress the folder, and run the `js-recon` command in the same directory.

:::warning
The working directory can contain downloaded application bundles, endpoint inventories, findings, proxy
configuration with credentials, and other sensitive local artifacts. Review the contents and redact anything
that doesn't need to leave your machine before compressing it. Naming a transfer method like SFTP or
SMB doesn't by itself make the transfer safe — use an encrypted channel and restrict access to the
intended recipient only.
:::

This method can be also used in shared folders on a network when multiple pentesters are collaborating on a project. This can be done using various methods, such as SFTP and SMB, as long as access is restricted to the engagement team.
