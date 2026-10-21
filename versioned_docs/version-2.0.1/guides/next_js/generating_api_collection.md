---
sidebar_position: 4
---

# Generating API collection

JS Recon can generate an API collection using three different methods:

1. Using the [`strings`](../../docs/modules/strings.md) module
1. Using the [`map`](../../docs/modules/map.md) module
1. Using the [`run`](../../docs/modules/run.md) module

The resultant file can be imported into an API client, but the generation method differs, which means that these files serve different purposes.

### Using the `strings` module

The `strings` module iterates over all the strings found in the JS files, and matches them against the known URL and path patterns. This means that this could get more URLs, but it also means that it would have a lot of false positives.

Using the strings module has the benefit that it can be used against any target regardless of the framework it runs on. However, it is not as accurate as the `map` module.

To generate an API collection using the `strings` module, use the following command:

```bash
js-recon strings -d output/<domain> -e --openapi
```

:::warning
Make sure to pass the `-e/--extract-urls` flag to the `strings` module when passing `--openapi` or `-p/--permutate` flag.
:::

This will generate a file called `extracted_urls-openapi.json` in the current working directory. This can be imported into an API client or can be previewed on the [swagger viewer](https://editor.swagger.io).

This file can be used to fuzz the API hosts for valid endpoints.

:::tip
Most API clients have the option to run the collection. You can modify the `{{baseUrl}}` placeholder to the API host you want to fuzz.
:::

### Using the `map` module

This is one of the most powerful features of JS Recon. It can reconstruct most of the API calls found in the JS files, and is being continuously updated. It is also the most accurate method, but it is not as flexible as the `strings` module.

To generate an API collection using the `map` module, use the following command:

```bash
js-recon map -d output/<domain> -t next --openapi
```

This will iterate through the JS files and try to reconstruct all the API requests. The requests will also be displayed on the screen like the following;

![Running map modules to reverse engineer requests](/img/guides/next_js/generating_api_collection/generating_openapi_collection.png)

The above screenshot shows the output for the above command run on a Next.js app. The tool has successfully found the API requests and reconstructed them. The unresolved `fetch()` calls are the calls responsible for dynamically loading the site components, and are usually not very interesting to deep dive in.

This will generate a file called `mapped-openapi.json` in the current working directory. This can be imported into an API client or can be previewed on the [swagger viewer](https://editor.swagger.io).

:::info
The errors displayed in the Swagger viewer are not a cause for concern. They are caused because the tool is not able to resolve the variables, or the app is using the body with unexpected methods. They can be ignored.
:::

This file is more accurate than the `strings` module, but it is not as flexible as the `strings` module. Most of the time, the variables will not be resolved and instead will be left as a placeholder. These can be either guessed or manually resolved.

:::tip
The guides ["Reversing `fetch()`"](./reversing_fetch.md) and ["Reversing axios"](./reversing_axios.md) walk through how you can manually reverse engineer the requests using the [interactive mode](../../docs/modules/interactive_mode/next-js.md).

These guides can be useful when complex variables are not resolved by the `map` module.
:::

### Using the `run` module

To integrate everything into just one command, the pentester can add the flags to the [`run` module](../../docs/modules/run.md) to generate an API collection.

The flag for the [`strings` module](../../docs/modules/strings.md) to generate an API collection is not available, as it is one of the features that a pentester familiar with the tool would use.

The `run` module can generate an API collection using the [`map` module](../../docs/modules/map.md). The following is the command to generate an API collection using the `run` module:

```bash
js-recon run -u <url> --map-openapi
```

This will generate a file called `mapped-openapi.json` in the current working directory.
