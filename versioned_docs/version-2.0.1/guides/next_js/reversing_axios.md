---
sidebar_position: 3
---

# Reversing axios

Axios is a popular HTTP client used in Next.js apps. It is often used to make API calls to the backend. This guide walks you through how can you use the [`map` module](../../docs/modules/map.md) to reverse engineer the requests.

## Prerequisites

Before getting started, make sure that you are familiar with [reversing `fetch()`](./reversing_fetch.md). Reversing the axios module is very similar to reversing `fetch()`.

## Downloading JavaScript files

The easiest way to get started with reversing axios is to use the [`run` module](../../docs/modules/run.md), but we will be using the modules individually to make sure that you understand the process.

First of all, you should use the [`lazyload` module](../../docs/modules/lazyload.md) to download the JavaScript files. To run this, you can use the following command:

```bash
js-recon lazyload -u https://app.example.com
```

:::info
You would have to approve execution of code when asked. To skip this process, use the `-y` flag to the command. Read docs [here](../../docs/modules/lazyload.md) for more info.
:::
:::warning
The example uses a hypothetical app, which may or may not exist. Replace `https://app.example.com` with the target URL.
:::

Upon running this command, the JS files will be written to `./output/app.example.com`

## Axios fundamentals

Since axios is a HTTP client library, it has methods different than fetch. The user should have the knowledge of axios methods to reverse it. This section will cover the same.

### Where is axios imported from?

Whenever a developer has to import a library into their code, they have multiple options like `import`, `require`, etc. However, since we will be reversing the compiled web apps, we usually won't find these statements. This is where the [fundamentals from previous guide](./reversing_fetch.md#fundamentals) comes into play.

As you might've known that in compiled webpack modules, the everything is assigned a numerical ID from which it is being referred. This is also the case with the axios library.

The axios library is also assigned a numerical ID, which is used to refer it in the code. There are a few known patterns for detecting this, which has been programmed into JS Recon. It uses those fingerprints to determine if a webpack chunk is an axios client.

### How axios is called?

Upon reversing fetch in the previous guide, you should've known that a lot of things are assigned weird variable names in the compiled code. This is also the case with axios. However, you also would've noticed that some variables are human readable. You can take the benefit of the latter.

JS Recon will find all the axios clients and list them, which would be equivalent to `import axios from 'axios';`. You can then use the [interactive mode](../../docs/modules/interactive_mode/next-js.md) to reverse the flow of the application.

## Mapping all the functions

The tool finds if the app is using axios client when iterating through the code in the [`map` module](../../docs/modules/map.md). So, to reverse axios, you should first of all generate the `mapped.json` file (or custom file name passed using suitable flag) using the following command:

```bash
js-recon map -d output/app.example.com -t next
```

This should list all the fetch instances first, and then axios instances at the last. When running the above command, you won't be in the interactive mode, but in the OS' terminal. The output in the terminal window would look like the following:

![Axios instance found terminal](/img/guides/next_js/reversing_axios/axios_instance_found_terminal.png)

## Interactive mode

Just like the previous guide on [reversing fetch](./reversing_fetch.md), you can use the [interactive mode](../../docs/modules/interactive_mode/next-js.md) to reverse axios clients in the same way.

To list all the axios clients, you can use the following command in the [interactive mode](../../docs/modules/interactive_mode/next-js.md):

```
list axios
```

:::tip
To list fetch, the command was `list fetch`, and to list axios, the command is `list axios`
:::

This will print something like the following:
![`list axios` output](/img/guides/next_js/reversing_axios/list_axios_interactive_mode.png)

Now, you can use trace the execution flow of this using the `trace` command.

```
trace 3464
```

Upon running this command, you should see the exports for this. You should care much about the imports for this function at this moment:
![Running trace command on axios](/img/guides/next_js/reversing_axios/trace_on_axios.png)

Now, you can use the `go to` command to inspect the functions to which this axios client is being exported.

You would find multiple methods like `get`, `post`, `put`, etc. along with other axios methods. You can then `cmd/ctrl+click` on the each of variables to manually resolve it.

:::tip
Remember that you can use the JS Recon's [interactive mode](../../docs/modules/interactive_mode/next-js.md) to assist in this. Some helpful command would be `go [to/back/ahead]`, `trace`, and `list nav`. Read docs [here](../../docs/modules/interactive_mode/next-js.md) for more info.
:::
