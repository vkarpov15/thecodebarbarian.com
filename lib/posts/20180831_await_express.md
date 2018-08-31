Arguably the biggest gap in [Express'](http://expressjs.com/) API is its
non-obvious [lack of support for async/await](http://thecodebarbarian.com/using-async-await-with-mocha-express-and-mongoose#express). This functionality is [scheduled to land in Express 5.0](https://github.com/expressjs/express/pull/2237), but the Express 5.0 GitHub PR has been open since 2014 and as of this writing there's no scheduled release date. To avoid having to `wrap()` every single middleware and route handler, I'm releasing the [`@awaitjs/express`](https://www.npmjs.com/package/@awaitjs/express) module. It adds [`getAsync()`, `useAsync()`, and other helpers](https://github.com/vkarpov15/awaitjs-express#it-adds-useasync-getasync-etc-to-your-express-app) to Express apps to add full support for async/await. It even supports async [error handling middleware](https://thecodebarbarian.com/80-20-guide-to-express-error-handling).

Getting Started
---------------

To install:

```
npm install @awaitjs/express
```

The `@awaitjs/express` module exports two functions, [`decorateApp()`](https://github.com/vkarpov15/awaitjs-express#decorateapp) and [`wrap()`](https://github.com/vkarpov15/awaitjs-express#wrap). The `decorateApp()` function is what you generally want to use, because that's what
adds `useAsync()`, `getAsync()`, etc. to your app.

```javascript
const express = require('express');
const { decorateApp } = require('@awaitjs/express');

const app = decorateApp(express());

// Important to use `getAsync()` here, otherwise this middleware will hang
// forever with Express 4.x.
app.getAsync('*', async function(req, res, next) {
  throw new Error('Oops!');
});

app.use(function(error, req, res, next) {
  res.send(error.message);
});
```

No Need to Call `next()`
------------------------

The `@awaitjs/express` module frees you from having to call `next()` in
Express middleware. Once your async function is fulfilled, the module will
call `next()` for you automatically. You can still call `next()`, but you
don't have to.

```javascript
const express = require('express');
const { decorateApp } = require('@awaitjs/express');

const app = decorateApp(express());

app.useAsync(async function() {
  // No need to call `next()`. You can if you want to.
  await new Promise(resolve => setTimeout(resolve, 250));
});

app.get(function(req, res) {
  res.send('Hello, World');
});
```

Async Error Handling Middleware
-------------------------------

Many existing solutions don't correctly handle async error handling middleware.
For example, the latest release `v1.1.4` of the [popular `express-async-handler` package](https://www.npmjs.com/package/express-async-handler) doesn't handle async error handling middleware correctly as shown in the below example.

```javascript
const app = require('express')();
const assert = require('assert');
const asyncHandler = require('express-async-handler');
const superagent = require('superagent');

run().catch(error => console.error(error.stack));

async function run() {
  app.use(asyncHandler(async function(req, res, next) {
    throw new Error('Oops!');
  }));

  app.get('/', asyncHandler(async function(req, res) {
    await new Promise(resolve => setTimeout(resolve, 10));
    res.send('Hello, World!');
  }));

  app.use(asyncHandler(async function(error, req, res, next) {
    throw new Error('foo');
  }));

  app.use(function(error, req, res, next) {
    res.send(error.message);
  });

  const server = await app.listen(3000);

  const res = await superagent.get('http://localhost:3000');

  // The below fails! express-async-handler doesn't support async
  // error handlers,
  // see https://github.com/Abazhenov/express-async-handler/issues/22
  assert.equal(res.text, 'foo');

  await server.close();
}
```

Thankfully, `@awaitjs/express` handles this detail correctly.

```javascript
const assert = require('assert');
const express = require('express');
const { decorateApp } = require('@awaitjs/express');
const superagent = require('superagent');

run().catch(error => console.error(error.stack));

async function run() {
  const app = decorateApp(express());

  app.useAsync(async function(req, res, next) {
    throw new Error('Oops!');
  });

  app.getAsync('/', async function(req, res) {
    await new Promise(resolve => setTimeout(resolve, 10));
    res.send('Hello, World!');
  });

  app.useAsync(async function(error, req, res, next) {
    throw new Error('foo');
  });

  app.use(function(error, req, res, next) {
    res.send(error.message);
  });

  const server = await app.listen(3000);

  const res = await superagent.get('http://localhost:3000');

  // Succeeds!
  assert.equal(res.text, 'foo');

  await server.close();
}
```

Moving On
---------

Getting Express to correctly support async/await is tricky. Even the [most popular module](https://www.npmjs.com/package/express-async-handler) at the time of this writing doesn't quite get everything right. So instead of copy/pasting a dubious `wrap()` everywhere, download [`@awaitjs/express`](https://www.npmjs.com/package/@awaitjs/express) and start using async functions with Express.

_Surprised that Express doesn't support async/await in general? Want to know how to determine whether your favorite npm modules support async/await without reconciling contradictory answers on StackOverflow? Chapter 4 of [Mastering Async/Await](http://asyncawait.net/) explains the core principles for determining whether a given library or framework supports async/await, so get the ebook today!_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
