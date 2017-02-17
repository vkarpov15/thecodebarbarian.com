The most important feature of most server-side frameworks is middleware: the ability to hook your own logic into the framework's logic, like [IFTTT](https://en.wikipedia.org/wiki/IFTTT) for your code. [Express](http://expressjs.com/en/guide/writing-middleware.html), [Mongoose](http://mongoosejs.com/docs/middleware.html), [Rails](http://guides.rubyonrails.org/rails_on_rack.html#configuring-middleware-stack), and [Django](https://docs.djangoproject.com/en/1.10/topics/http/middleware/) all rely heavily on middleware. [LoopBack](https://loopback.io/doc/en/lb3/Operation-hooks.html) and [Sequelize](http://docs.sequelizejs.com/en/latest/docs/hooks/) have hooks, AngularJS has [parsers](https://docs.angularjs.org/api/ng/type/ngModel.NgModelController) and [interceptors](http://thecodebarbarian.com/2015/01/24/angularjs-interceptors), [Hapi](https://hapijs.com/api#request-lifecycle) has extensions, but these are all just [roses by another name](https://en.wikipedia.org/wiki/A_rose_by_any_other_name_would_smell_as_sweet). Except Hapi, Hapi by any other name would still have a foul code stench.

When so many libraries implement the same concept, there's an opportunity for consolidation. Middleware fundamentally lets you plug in to a stream of actions and do X when action Y happens. Thankfully, JavaScript has a [data structure representing a transformable stream of actions](https://github.com/tc39/proposal-observable): observables. In this article, I'll use [xstream](https://www.npmjs.com/package/xstream) on top of the vanilla [Node.js http library](https://nodejs.org/api/http.html) to show you how you can do middleware (error handling, permission checking, etc.) without frameworks.

<img src="http://i.imgur.com/9e7Ai23.png" />

_Disclaimer_ The following code is a thought experiment, not a battle-hardened #Enterprise web framework. I haven't used it in production or built a real product with it. Use it at your own risk.

Piping HTTP Into xstream
------------------------

The xstream library is a simplified take on heavy observable libs like [RxJS](https://www.npmjs.com/package/rxjs). The xstream API is superficially
different from RxJS or the [TC39 Observable specification](https://github.com/tc39/proposal-observable) but the differences
are not relevant for this example.

Here's how you write a "hello, world" HTTP server with xstream:

```javascript
const http = require('http');
const xs = require('xstream').default;

const server = http.createServer();

// A *producer* is something that produces values for the observable
const serverProducer = {
  start: listener => {
    server.on('request', (req, res) => {
      // Each time we get an HTTP request, send an object with the
      // request object and response object as properties
      listener.next({ req, res });
    })
  },
  stop: () => server.close(),
  id: 0
};

// Create an observable over the producer
const server$ = xs.create(serverProducer);

// And add a listener that spits out Hello, World
server$.addListener({
  next: ({ req, res }) => {
    res.end('hello, world');
  }
});

server.listen(3000);
```

Routing and 404s
----------------

So far, xstream has done nothing to make our code better. To add a little extra
motivation, let's start with some simple routing. In API land, routing means mapping an HTTP request for a URL like `GET /foo` to a function that handles the request and formats a response.

For the purposes of this article, a request handler will be a function that takes
in the raw request and returns a [Promise](https://strongloop.com/strongblog/promises-in-node-js-an-alternative-to-callbacks/). You may think it's strange to use both promises and observables, but there's a few reasons to rely on promises: [co](http://npmjs.org/package/co) returns promises, promises are easy to chain, and more developers understand promises.

Here's the code for an xstream-based server that prints 'Hello, World' if you hit the `/` endpoint, and returns an HTTP 404 otherwise.

```javascript
const server$ = xs.create(serverProducer).
  // When user hits the `/` endpoint, return a promise that resolves to our message
  map(route('/', () => Promise.resolve('hello, world'))).
  // Otherwise, return a promise that we'll convert to an HTTP 404
  map(notFoundHandler);

server$.addListener({
  next: ({ req, res, op }) => {
    // `op` is the promise that was chosen to represent handling this request
    op.then(
      result => res.end(result),
      error => Object.assign(res, { statusCode: error.status }).end(res.message)
    );
  }
});

server.listen(3000);

// `route()` takes in a URL and a handler, and returns a function that we can pass to `map()`
function route(url, handler) {
  return function({ req, res, op }) {
    if (req.url !== url) {
      return { req, res, op };
    }
    return { req, res, op: handler(req) };
  };
}

// `notFoundHandler` adds a default value to `op` if one wasn't added already
function notFoundHandler(v) {
  if (!v.op) {
    return Object.assign({}, v, {
      op: Promise.reject({
        message: `${v.req.url} not found`,
        status: 404
      })
    });
  }
  return v;
}
```

Authentication
--------------

The classic use case for middleware is authentication: making it so that
certain endpoints return an HTTP 401 if the proper authorization header is
not set. With a little help from promise chaining, you can create a promise
that resolves if auth succeeded and rejects if auth failed, and then chain
that promise to your route's promise.

```javascript
const server$ = xs.create(serverProducer).
  // When user hits the `/` endpoint, return a promise that resolves to our message
  map(route('/', () => Promise.resolve('hello, world'))).
  // When the user hits any endpoint that starts with '/auth', check auth
  map(checkAuth(req => req.url.startsWith('/auth'))).
  // Add an endpoint called `/auth/test` that will use the above auth check
  map(route('/auth/test', () => Promise.resolve('my hidden route'))).
  // Otherwise, return a promise that we'll convert to an HTTP 404
  map(notFoundHandler);

server$.addListener({
  next: ({ req, res, op }) => {
    // `op` is the promise that was chosen to represent handling this request
    op.then(
      result => res.end(result),
      error => Object.assign(res, { statusCode: error.status || 500 }).end(res.message)
    );
  }
});

server.listen(3000);

// `checkAuth()` takes a filter function, if that filter passes we'll make `op`
// a promise that checks if the correct authorization header is set
function checkAuth(filter) {
  return function({ req, res, op }) {
    if (!filter(req)) {
      return { req, res, op };
    }
    const isAuthed = new Promise((resolve, reject) => {
      if (req.headers['authorization'] === 'test') {
        return resolve();
      }
      const err = new Error('Not Authorized');
      err.status = 401;
      reject(err);
    });
    op = op ? op.then(isAuthed) : isAuthed;
    return { req, res, op };
  }
}

// `route()` takes in a URL and a handler, and returns a function that we can pass to `map()`
function route(url, handler) {
  return function({ req, res, op }) {
    if (req.url !== url) {
      return { req, res, op };
    }
    op = op ? op.then(handler(req)) : handler(req);
    // `$handled` means that some handler handled this request
    op.$handled = true;
    return { req, res, op };
  };
}

// `notFoundHandler` adds a default value to `op` if one wasn't added already
function notFoundHandler(v) {
  if (!v.op || !v.op.$handled) {
    return Object.assign({}, v, {
      op: Promise.reject({
        message: `${v.req.url} not found`,
        status: 404
      })
    });
  }
  return v;
}
```

You might wonder why the above example uses an `if` statement in them `map()` for routing instead of `filter()` and then `map()`. This is for the benefit of the `notFoundHandler`. The `filter()` operator creates a new observable that only emits events that match the given filter, but we eventually want every HTTP request to
reach the `notFoundHandler` to check if the request has been handled or not.

Handling Errors
---------------

One neat side effect (pun intended) of this architecture is that error reporting becomes trivial. Say you use [sentry](https://sentry.io) or [raygun](https://raygun.com/) or whatever your error tracker of choice is. All you need is to subscripe to the `server$` observable and `.catch()` any errors that occur.

```javascript
server$.addListener({
  next: ({ op }) => {
    // `op` is the promise that was chosen to represent handling this request
    op.catch(error => reportErrorToSentry(error));
  }
});
```

That's for reporting errors as a side effect. What about transforming errors? Suppose you have an endpoint that tells you what state a given zip code is in. US zip codes
must be 5 digits long, so you want to `assert()` that the given zip code matches
the regexp `/^[0-9]{5}$/`. Furthermore, you want to make it a rule that assertion
errors always become HTTP 400 (BadRequest) errors. You can add another `.map()` to handle this case:

```javascript
const assert = require('assert');
const co = require('co');
const qs = require('querystring');

const server$ = xs.create(serverProducer).
  map(parseQueryString).
  // When user hits the `/` endpoint, return a promise that resolves to our message
  map(route('/', () => Promise.resolve('hello, world'))).
  // When the user hits the `/state` endpoint, check the query string to get the zip code
  map(route('/state', getZipFromState)).
  // Convert assertion errors to HTTP 400s
  map(convertAssertionErrors).
  // Otherwise, return a promise that we'll convert to an HTTP 404
  map(notFoundHandler);

server$.addListener({
  next: ({ req, res, op }) => {
    // `op` is the promise that was chosen to represent handling this request
    op.then(
      result => res.end(result),
      error => { console.log('got', error); Object.assign(res, { statusCode: error.status || 500 }).end(res.message); }
    );
  }
});

server.listen(3000);

// Parse the query string and attach it to `req`
function parseQueryString(v) {
  const { req } = v;
  const q = req.url.indexOf('?');
  const urlWithoutQueryString = q === -1 ?
    req.url :
    req.url.substr(0, q);
  const query = q === -1 ? '' : req.url.substr(q + 1);
  req.urlWithoutQueryString = urlWithoutQueryString;
  req.query = qs.parse(query);
  return v;
}

// The handler for the `/state` route
function getZipFromState(req) {
 return co(function*() {
   const { zip } = req.query;
   assert.ok(zip, 'Zip not specified');
   assert.ok(/^[0-9]{5}$/.test(zip), 'Zip must be 5 digits');
   if ((zip >= '94203' && zip <= '94209') || (zip >= '90001' && zip <= '90089')) {
     return 'California';
   }
   return 'Not California';
 })
}

// Convert assertion errors
function convertAssertionErrors(v) {
  if (v.op) {
    return Object.assign({}, v, {
      op: v.op.catch(error => {
        if (error.constructor.name === 'AssertionError') {
          error.status = 400;
        }
        throw error;
      })
    });
  }
  return v;
}

// `route()` takes in a URL and a handler, and returns a function that we can pass to `map()`
function route(url, handler) {
  return function({ req, res, op }) {
    if (req.urlWithoutQueryString !== url) {
      return { req, res, op };
    }
    op = op ? op.then(handler(req)) : handler(req);
    return { req, res, op };
  };
}

// `notFoundHandler` adds a default value to `op` if one wasn't added already
function notFoundHandler(v) {
  if (!v.op) {
    return Object.assign({}, v, {
      op: Promise.reject({
        message: `${v.req.url} not found`,
        status: 404
      })
    });
  }
  return v;
}
```

The advantage of attaching `convertAssertionErrors()` as another `.map()` is that `convertAssertionErrors()` gets called on every HTTP request, without the individual route handler being aware of it. Furthermore, `convertAssertionErrors()` can slice the requests stream any way it wants. For example, you can make assertion errors
become HTTP 500 errors for a certain set of endpoints. In other words, you get the benefits of middleware without the framework lock-in.

Next Steps
----------

The way I think about JavaScript backends has been turned upside down over the last couple years. The MVC paradigm feels like an anachronism when you're building a REST-ful API that doesn't render any HTML. I think the future of Node.js web development looks more like [Cycle.js](https://cycle.js.org/) or [ngrx](https://github.com/ngrx/store) than Rails or Django.

_Further reading: [Node server with Rx and Cycle.js](https://glebbahmutov.com/blog/node-server-with-rx-and-cycle/) approaches a similar idea from a different angle._

_Observables or not, I believe that [co](https://www.npmjs.com/package/co) and generator-based concurrency is the bedrock of REST API development in Node.js. If you're not familiar with generators, check out my ebook [The 80/20 Guide to ES2015 Generators](http://es2015generators.com/). It will take you from zero to generators master in 50 pages, with no dependencies outside of Node.js._
