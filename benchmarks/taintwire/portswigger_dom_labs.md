---
sidebar_position: 1
sidebar_label: PortSwigger DOM Labs
---

# Portswigger Web Academy DOM Labs Benchmarking

To benchmarking the new engine, JS Recon's taintwire engine was run against
the [Portswigger DOM Labs](https://portswigger.net/web-security/all-labs#dom-based-vulnerabilities).

The general command for all the labs, as of drafting the document, was as follows:

```bash
js-recon run -u <lab_url> -y -k
js-recon taintwire analyze -g graph.pg
```

The JS Recon version used was `2.1.0-alpha.4` with Taintwire version `0.2.0-alpha.4` and Taintwire Queries version ``.

## DOM XSS using web messages

Lab
URL: https://portswigger.net/web-security/dom-based/controlling-the-web-message-source/lab-dom-xss-using-web-messages

Evidence:

```

[+] "postMessage data reaches an HTML, JS execution or navigation sink" found in chunk 0ac4006603a7c12880c1b210004800e7.web-security-academy.net/inline-0.js
0ac4006603a7c12880c1b210004800e7.web-security-academy.net/inline-0.js:3:71 <- 0ac4006603a7c12880c1b210004800e7.web-security-academy.net/inline-0.js:3:71 (0 hops)
e.data
```

The flagged JS portion, and surrounding logic:

```js
window.addEventListener('message', function (e) {
    document.getElementById('ads').innerHTML = e.data;
})
```

## DOM XSS using web messages and a JavaScript URL

Lab
URL: https://portswigger.net/web-security/dom-based/controlling-the-web-message-source/lab-dom-xss-using-web-messages-and-a-javascript-url

Evidence:

```
[+] "postMessage data reaches an HTML, JS execution or navigation sink" found in chunk 0a550068044c067180a212af00060072.web-security-academy.net/inline-0.js
0a550068044c067180a212af00060072.web-security-academy.net/inline-0.js:5:48 <- 0a550068044c067180a212af00060072.web-security-academy.net/inline-0.js:3:38 (2 hops)
url
[i] Conditions before the sink:
    0a550068044c067180a212af00060072.web-security-academy.net/inline-0.js:4:32 if, must be true: url.indexOf('http:') > -1 || url.indexOf('https:') > -1
      0a550068044c067180a212af00060072.web-security-academy.net/inline-0.js:4:32 contains "http:": url.indexOf('http:') > -1
      0a550068044c067180a212af00060072.web-security-academy.net/inline-0.js:4:61 contains "https:": url.indexOf('https:') > -1
```

The flagged JS portion, and surrounding logic:

```
window.addEventListener('message', function (e) {
    var url = e.data;
    if (url.indexOf('http:') > -1 || url.indexOf('https:') > -1) {
        location.href = url;
    }
}, false);
```

## DOM XSS using web messages and `JSON.parse`

Lab
URL: https://portswigger.net/web-security/dom-based/controlling-the-web-message-source/lab-dom-xss-using-web-messages-and-json-parse

Evidence:

```
[+] "postMessage data reaches an HTML, JS execution or navigation sink" found in chunk 0a8100550393eeaf8115031a00c20035.web-security-academy.net/inline-0.js
0a8100550393eeaf8115031a00c20035.web-security-academy.net/inline-0.js:15:61 <- 0a8100550393eeaf8115031a00c20035.web-security-academy.net/inline-0.js:6:47 (3 hops)
d.url
[i] Conditions before the sink:
    0a8100550393eeaf8115031a00c20035.web-security-academy.net/inline-0.js:6:36 parse, must be valid JSON: JSON.parse(e.data)
    0a8100550393eeaf8115031a00c20035.web-security-academy.net/inline-0.js:10:35 switch, must equal "load-channel": d.type

```

The flagged JS portion, and surrounding logic:

```js
window.addEventListener('message', function (e) {
    var iframe = document.createElement('iframe'), ACMEplayer = {element: iframe}, d;
    document.body.appendChild(iframe);
    try {
        d = JSON.parse(e.data);
    } catch (e) {
        return;
    }
    switch (d.type) {
        case "page-load":
            ACMEplayer.element.scrollIntoView();
            break;
        case "load-channel":
            ACMEplayer.element.src = d.url;
            break;
        case "player-height-changed":
            ACMEplayer.element.style.width = d.width + "px";
            ACMEplayer.element.style.height = d.height + "px";
            break;
    }
}, false);
```

## DOM-based open redirection

Lab URL: https://portswigger.net/web-security/dom-based/open-redirection/lab-dom-open-redirection

Evidence:

```
[+] "Open redirect: URL value reaches a navigation sink" found in chunk 0a45001704c9ac6b81f9f8430028005e.web-security-academy.net/post/onclick-1.js
0a45001704c9ac6b81f9f8430028005e.web-security-academy.net/post/onclick-1.js:2:66 <- 0a45001704c9ac6b81f9f8430028005e.web-security-academy.net/post/onclick-1.js:2:39 (2 hops)
returnUrl ? returnUrl[1] : "/"
[i] Conditions before the sink:
    0a45001704c9ac6b81f9f8430028005e.web-security-academy.net/post/onclick-1.js:2:66 ternary, must be true: returnUrl
      0a45001704c9ac6b81f9f8430028005e.web-security-academy.net/post/onclick-1.js:2:66 is truthy: returnUrl

```

The flagged JS portion, and surrounding logic:

```js
returnUrl = /url=(https?:\/\/.+)/.exec(location);
location.href = returnUrl ? returnUrl[1] : "/"
```

## DOM-based cookie manipulation

Lab URL: https://portswigger.net/web-security/dom-based/cookie-manipulation/lab-dom-cookie-manipulation

Evidence:

```
[+] "Storage manipulation: URL value written to a cookie or web storage" found in chunk 0ade00bb034dae7c8049036100bd00de.web-security-academy.net/product/inline-0.js
0ade00bb034dae7c8049036100bd00de.web-security-academy.net/product/inline-0.js:2:18 <- 0ade00bb034dae7c8049036100bd00de.web-security-academy.net/product/inline-0.js:2:41 (0 hops)
'lastViewedProduct=' + window.location + '; SameSite=None; Secure'
[i] Conditions before the sink:
    0ade00bb034dae7c8049036100bd00de.web-security-academy.net/product/inline-0.js:2:59 string, before "; SameSite=None; Secure": '; SameSite=None; Secure'

```

The flagged JS portion, and surrounding logic:

```js
document.cookie = 'lastViewedProduct=' + window.location + '; SameSite=None; Secure'
```

## Exploiting DOM clobbering to enable XSS

Lab URL: https://portswigger.net/web-security/dom-based/dom-clobbering/lab-dom-xss-exploiting-dom-clobbering

Evidence:

```
[+] "DOM clobbering gadget: optional window/document property reaches a script, HTML or navigation sink" found in chunk 0a09009e04157a748391931e005b002e.web-security-academy.net/resources/js/loadCommentsWithDomClobbering.js
0a09009e04157a748391931e005b002e.web-security-academy.net/resources/js/loadCommentsWithDomClobbering.js:34:40 <- 0a09009e04157a748391931e005b002e.web-security-academy.net/resources/js/loadCommentsWithDomClobbering.js:30:32 (8 hops)
avatarImgHTML
```

The flagged JS portion, and surrounding logic:

```js
let defaultAvatar = window.defaultAvatar || {avatar: '/resources/images/avatarDefault.svg'}
let avatarImgHTML = '<img class="avatar" src="' + (comment.avatar ? escapeHTML(comment.avatar) : defaultAvatar.avatar) + '">';

let divImgContainer = document.createElement("div");
divImgContainer.innerHTML = avatarImgHTML
```

## Clobbering DOM attributes to bypass HTML filters

Lab URL:

Evidence:

```
[+] "Stored XSS: HTTP response data reaches an HTML or JavaScript execution sink" found in chunk 0a34009f031168a08154b8d000510098.web-security-academy.net/resources/js/loadCommentsWithHtmlJanitor.js
0a34009f031168a08154b8d000510098.web-security-academy.net/resources/js/loadCommentsWithHtmlJanitor.js:64:48 <- 0a34009f031168a08154b8d000510098.web-security-academy.net/resources/js/loadCommentsWithHtmlJanitor.js:6:38 (6 hops)
janitor.clean(comment.body)
[+] "DOM clobbering: HTML sanitizer reads clobberable node.attributes" found in chunk 0a34009f031168a08154b8d000510098.web-security-academy.net/resources/js/htmlJanitor.js
0a34009f031168a08154b8d000510098.web-security-academy.net/resources/js/htmlJanitor.js:121:19
node.attributes
[+] "DOM clobbering: HTML sanitizer reads clobberable node.attributes" found in chunk 0a34009f031168a08154b8d000510098.web-security-academy.net/resources/js/htmlJanitor.js
0a34009f031168a08154b8d000510098.web-security-academy.net/resources/js/htmlJanitor.js:120:26
node.attributes

```

The flagged JS portion, and surrounding logic:
`htmlJanitor.js`:

```js
// Sanitize attributes
for (var a = 0; a < node.attributes.length; a += 1) {
    var attr = node.attributes[a];

    if (shouldRejectAttr(attr, allowedAttrs, node)) {
        node.removeAttribute(attr.name);
        // Shift the array to continue looping.
        a = a - 1;
    }
}
```

`loadCommentsWithHtmlJanitor.js`:

```js
function displayComments(comments) {
    comment = comments[i];
    if (comment.body) {
        let commentBodyPElement = document.createElement("p");
        commentBodyPElement.innerHTML = janitor.clean(comment.body);

        commentSection.appendChild(commentBodyPElement);
    }
}

xhr.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        let comments = JSON.parse(this.responseText);
        displayComments(comments);
    }
};
```

