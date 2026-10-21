---
sidebar_position: 1
---

# Request Engine

The request engine is responsible for parsing the steps of a rule with type `request`. Following is an example of what the headers of a rule would look like:

```yaml
id: <id>
name: <human_readable_name>
author: <author>
description: <description>
severity: <info | low | medium | high>
type: request
tech:
    - <tech>

steps:
    - name: <name_of_the_step>
      message: <message>
      requires:
          - <previous_step_name>
      request: RequestStep
```

## Request Step

A request step is used to match the specific parts of a request in the OpenAPI spec file.

### Headers

This step is used to match the parts of the headers. Following is the structure of the headers step:

```yaml
- name: <name>
  request:
      type: headers
      condition: <contains | absent>
      name: <header_name>
```

For example, a full configuration file to check if the `Authorization` header is present in the step would look like this:

<details>
<summary>Example: Full rule file for checking if the "Authorization" header is present in the request</summary>

```yaml
id: missing_authorization_header
name: Missing Authorization Header
author: shriyanss
description: Check if the "Authorization" header is present in the request
tech: next
severity: medium
type: request

steps:
    - name: check_auth_header
      message: Authorization header is not present
      request:
          type: headers
          condition: absent
          name: Authorization
```

</details>

### URL

This step is used to match the parts of the URL. Following is the structure of the URL step:

```yaml
- name: <name>
  request:
      type: url
      condition: <contains | absent>
      name: <url_part>
```

For example, a rule file to check if the URL contains the string `/api/` as well as the string `admin` in it would look like this:

<details>
<summary>Example: Full rule file for checking if the URL contains the string "/api/" as well as the string "admin" in it</summary>

```yaml
id: admin_api
name: Detect Admin API endpoints
author: shriyanss
description: Detect endpoints that have both "admin" and "api" in the path
severity: info
type: request
tech: next

steps:
    - name: check_api
      message: API endpoint detected
      request:
          type: url
          condition: contains
          name: "/api/"
    - name: check_admin
      message: Admin API endpoint detected
      request:
          type: url
          condition: contains
          name: "admin"
```

</details>

### Method

This step is used to match the HTTP method of the request. Following is the structure of the method step:

```yaml
- name: <name>
  request:
      type: method
      condition: <is | is_not>
      name: <method_name>
```

For example, a rule to detect `DELETE` requests would look like this:

<details>
<summary>Example: Full rule file for checking for DELETE requests</summary>

```yaml
id: delete_request_detected
name: Detect DELETE requests
author: shriyanss
description: Detects if a request uses the DELETE method.
severity: info
type: request
tech: all

steps:
    - name: check_delete_method
      message: DELETE method detected
      request:
          type: method
          condition: is
          name: delete
```

</details>
