*This is a preview of Mastering JS' premium tutorial [Write Your Own Express.js From Scratch](https://gumroad.com/l/tlcRd). If you like this article, [get the tutorial and master Express today!](https://gum.co/tlcRd).*

Over the last 5 years, [Express](https://www.npmjs.com/package/express) has become the de facto web server framework
for Node.js. I wouldn't be surprised if [the MEAN stack](https://www.mongodb.com/blog/post/the-mean-stack-mongodb-expressjs-angularjs-and)
had something to do with it, because when I first evaluated Express in mid 2012, I compared it against its then biggest competitors like [Geddy](http://geddyjs.org/) and [Tower](https://news.ycombinator.com/item?id=3639828). Geddy
and Tower have since faded into dim memory, but Express has exploded in popularity.
I immediately loved Express' simplicity and elegance: middleware is the one fundamental concept for adding logic to Express.
Plugins are just middleware, so dropping in a plugin is always as simple as `app.use(plugin)`. Once I understood middleware and the APIs available for requests and responses, apps mostly wrote themselves.

I find the best way to really master a framework is to write your own. Really diving into the internals of a framework gives you a deeper intuition for how to use the framework than years of reading the documentation. I love open source because documentation often stretches the truth or omits important details, but the source code never lies.

In this article, I'll walk you through building
a simplified Express clone called Espresso in 4 steps.
First, you'll see how to implement a rudimentary middleware pipeline. Then you'll see how Express implements [routing](http://expressjs.com/en/4x/api.html#router). Next, you'll see how Express' recursive routing structure is implemented with a separate router class. Finally, you'll see some limitations of using Express with async/await and how Express might improve its support for async/await.

Step 1: Getting Started With Middleware
---------------------------------------

First, let's implement rudimentary support for Express middleware, without any routing. Modulo [error handling middleware](http://expressjs.com/en/guide/error-handling.html), all Express middleware is a function
that takes 3 parameters: the request `req`, the response `res`, and the `next()` function. Middleware is executed
sequentially on each request, and `next()` is how you tell Express to kick off the next middleware. If a middleware doesn't call `next()`, it should make sure to call `res.end()` to send the HTTP response to the client.

```javascript
app.use(function myMiddleware(req, res, next) {
  res.end('Hello, world');
  next();
});
```

Everything is middleware, even [routes](http://expressjs.com/en/guide/routing.html) are [just sugar](https://github.com/expressjs/express/blob/351396f971280ab79faddcf9782ea50f4e88358d/lib/router/index.js#L491-L504) for pushing middleware onto the stack. In the Express internals, [the `use()` function](https://github.com/expressjs/express/blob/351396f971280ab79faddcf9782ea50f4e88358d/lib/router/index.js#L428) converts
the middleware function [into a 'Layer'](https://github.com/expressjs/express/blob/351396f971280ab79faddcf9782ea50f4e88358d/lib/router/index.js#L464-L468), which is just an object wrapper around the middleware function. The `use()` function then [pushes the layer onto the 'stack'](https://github.com/expressjs/express/blob/351396f971280ab79faddcf9782ea50f4e88358d/lib/router/index.js#L472), which is just an array of layers. With that in mind, let's create the Espresso class and create a `use()` function:

```javascript
const http = require('http');

class Espresso {
  constructor() {
    this._stack = [];
  }

  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function!');
    }
    this._stack.push(middleware);
  }
}
```

Espresso also needs to be able to create an HTTP server that executes all middleware on every request. Express has
the [`listen()` function](http://expressjs.com/en/starter/hello-world.html) for this, which just [wraps Node.js' built-in `http.createServer()` function](https://github.com/expressjs/express/blob/351396f971280ab79faddcf9782ea50f4e88358d/lib/application.js#L616-L619). Here's
how Espresso implements this `listen()` function:

```javascript
listen(port, callback) {
  const handler = (req, res) => {
    // `this.handle()` executes all middleware defined on this Espresso
    // app instance, will implement this method next!
    this.handle(req, res, err => {
      if (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });
  };
  return http.createServer(handler).listen({ port }, callback);
}
```

The `handle()` method used above is responsible for executing every middleware. Internally, Express routers have a
[similar `handle()` method that executes middleware that matches a request](https://github.com/expressjs/express/blob/351396f971280ab79faddcf9782ea50f4e88358d/lib/router/index.js#L136).
For this first step, Espresso won't implement routing, it will just execute all middleware that was passed in to `app.use()`. Here's how you can implement the `handle()` method by calling `next()` recursively.

```javascript
handle(req, res, callback) {
  let idx = 0;

  const next = (err) => {
    // If an error occurred, bypass the rest of the pipeline. In Express,
    // you would still need to look for error handling middleware, but
    // this example does not support that.
    if (err != null) {
      return setImmediate(() => callback(err));
    }
    if (idx >= this._stack.length) {
      return setImmediate(() => callback());
    }

    // Not the same as an internal Express layer, which is an object
    // wrapper around a middleware function. Using the same nomenclature
    // for consistency.
    const layer = this._stack[idx++];
    setImmediate(() => {
      try {
        // Execute the layer and rely on it to call `next()`
        layer(req, res, next);
      } catch(error) {
        next(error);
      }
    });
  };

  next();
}
```

You can find the whole Espresso class on GitHub. You can also find associated mocha tests here. Let's see the Espresso class in action with a simple "Hello, World" example in a [mocha](http://npmjs.com/package/mocha) test using [axios](https://www.npmjs.com/package/axios) as an HTTP client.

```javascript
const Espresso = require('../lib/step1');
const assert = require('assert');
const axios = require('axios');
const cors = require('cors');

describe('Espresso', function() {
  let server;

  afterEach(function() {
    // Make sure the server doesn't stay running after the tests are done
    server && server.close();
  });

  it('works in the basic Hello, World case', async function() {
    const app = new Espresso();
    // Add some very simple middleware
    app.use((req, res, next) => {
      res.end('Hello, world!');
      next();
    });
    server = app.listen(3000);

    const res = await axios.get('http://localhost:3000');
    assert.equal(res.data, 'Hello, world!');
  });
});
```

To show that this is actually sufficient to reproduce the basics of Express middleware, let's plug in an
actual Express plugin into Espresso and see it in action. The [CORS module](https://www.npmjs.com/package/cors)
is an Express plugin that sets the [AccessControlAllowOrigin header for enabling cross-origin resource sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS), otherwise known as making an HTTP request from Chrome to
a server that has a different hostname or port than the one currently in your URL bar. Here's a test that shows
using `cors()` with Espresso works as intended with no additional changes.

```javascript
it('works with real Express middleware (CORS)', async function() {
  const app = new Espresso();
  app.use(cors());
  app.use((req, res, next) => {
    res.end('Hello with CORS');
    next();
  });
  server = app.listen(3000);

  const res = await axios.get('http://localhost:3000');

  // This is the header that `cors()` should set
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.equal(res.data, 'Hello with CORS');
});
```

Conclusion
----------

That's the first of 4 steps to building your own Express from scratch. The Express code base may seem baffling at first. I've been using Express for years and even then the difference between `req.url` and `req.originalUrl` never clicked for me until I wrote this article. But, once you grok the core principles, you'll be able to easily debug baffling issues and perhaps even contribute to Express itself.

*If you liked this article, you can get the rest of the [Write Your Own Express.js From Scratch tutorial here](https://gumroad.com/l/tlcRd).*
