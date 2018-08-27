[Express](https://www.npmjs.com/package/express) is the most popular HTTP server framework for Node.js, but unfortunately it [doesn't have good support for async/await](https://github.com/expressjs/express/issues/2259). [Express doesn't handle errors in async functions](http://thecodebarbarian.com/using-async-await-with-mocha-express-and-mongoose#express). [Fastify](https://www.npmjs.com/package/fastify) is an alternative Node.js server framework that enjoys much better support for async/await in addition to [better performance](https://github.com/fastify/fastify#benchmarks). In this article, I'll show you how Fastify works with async/await and show you the corner cases you need to be aware of.

Hello, World with Async/Await and Fastify
-----------------------------------------

Like Express, the "Hello, World" case works well with async/await. Below
is an example Fastify server that waits for about 100ms before responding
with "Hello, World!".

```javascript
[require:fastify.*basic]
```

Where Fastify beats Express is handling errors in async route handlers. If
you `throw` an error in an async route handler in Express, Express will
never send a response. Fastify actually handles errors in async functions
for you and reports them as [HTTP 500 Internal Server Errors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500).

```javascript
[require:fastify.*basic error]
```

Edge Cases
----------

Once you call the `reply.send()` function, any subsequent errors in your
async function will **not** be reported.

```javascript
[require:fastify.*error after reply]
```

If you're using Fastify with async/await, you should [return data from the function body](https://github.com/fastify/fastify/blob/master/docs/Routes.md#async-await) instead calling `reply.send()` to prevent potential silent errors. After you
`return` from an async function, the async function body can't `throw` an error.

```javascript
[require:fastify.*return]
```

Moving On
---------

In addition to having better performance on benchmarks, Fastify has better
support for async/await than Express. Failure to handle async errors is a
common problem for JavaScript frameworks, so I'm impressed that Fastify
handles them correctly. Give Fastify a shot if you're looking for a server
framework that supports async/await out of the box.

_Want to learn how to identify whether your favorite npm modules work with
async/await without resorting to Google or Stack Overflow? Chapter 4 of
my new ebook, Mastering Async/Await, explains the basic principles for determining whether frameworks like [React](https://reactjs.org/) and [Socket.IO](https://www.npmjs.com/package/socket.io) support async/await. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
