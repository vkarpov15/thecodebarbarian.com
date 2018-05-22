[Express' error handling middleware](http://expressjs.com/en/guide/error-handling.html) is a powerful tool for consolidating your HTTP error response logic. Odds are, if you've written Express code you've written code that looks like what you see below.

```javascript
app.get('/User', async function(req, res) {
  let users;
  try {
    users = await db.collection('User').find().toArray();
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
  res.json({ users });
});
```

This pattern works well if you have one or two endpoints, but if you're maintaining dozens you're going to quickly lose your mind. Let's say you've decided HTTP response code 503 is more appropriate than HTTP 500, you're going to have to change that for every single endpoint. How about adding stack traces to the error response in your dev environment? And do you really want to add a `try/catch` around every single HTTP and database call in your codebase? Sure that's the "responsible" and "disciplined" thing to do, but in programming discipline doesn't scale very well. With error handling middleware, you can do better.

Defining Error Handling Middleware
----------------------------------

Express middleware is broken up into different types based on the number of arguments your middleware function takes. A middleware function that takes 4 arguments is classified as "error handling middleware", and will only get called if an error occurs.

```javascript
const app = require('express')();

app.get('*', function(req, res, next) {
  // This middleware throws an error, so Express will go straight to
  // the next error handler
  throw new Error('woops');
});

app.get('*', function(req, res, next) {
  // This middleware is not an error handler (only 3 arguments),
  // Express will skip it because there was an error in the previous
  // middleware
  console.log('this will not print');
});

app.use(function(error, req, res, next) {
  // Any request to this server will get here, and will send an HTTP
  // response with the error message 'woops'
  res.json({ message: error.message });
});

app.listen(3000);
```

There are 2 ways to report an error in middleware to Express. The first,
as you saw above, is to throw an exception in the same tick. Because of
the async nature of JavaScript, this isn't very useful. If you throw
an error asynchronously, you'll just crash the server.

```javascript
const app = require('express')();

app.get('*', function(req, res, next) {
  // Will crash the server on every HTTP request
  setImmediate(() => { throw new Error('woops'); });
});

app.use(function(error, req, res, next) {
  // Won't get here, because Express doesn't catch the above error
  res.json({ message: error.message });
});

app.listen(3000);
```

The only way to report errors to Express for use with error handlers is
using the third argument to conventional middleware, the `next()` function. Your normal route handlers (like `app.get('/User', function(req, res) {})`) can also take a `next()` function as an argument.

```javascript
const app = require('express')();

app.get('*', function(req, res, next) {
  // Reporting async errors *must* go through `next()`
  setImmediate(() => { next(new Error('woops')); });
});

app.use(function(error, req, res, next) {
  // Will get here
  res.json({ message: error.message });
});

app.listen(3000);
```

Remember that Express middleware executes **in order**. You should define error handlers **last**, after all other middleware. Otherwise, your error handler won't get called:

```javascript
const app = require('express')();

app.use(function(error, req, res, next) {
  // Will **not** get called. You'll get Express' default error
  // handler, which returns `error.toString()` in the error body
  console.log('will not print');
  res.json({ message: error.message });
});

app.get('*', function(req, res, next) {
  setImmediate(() => { next(new Error('woops')); });
});

app.listen(3000);
```

Use With Async/Await
--------------------

Cumbersome integration with promises is where the cracks start to show in Express' API. Express was mostly written 2011-2014, before ES6, and it still lacks a good answer for how to handle the [async/await keywords](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js). For example, the below server will never successfully send an HTTP response, because [the promise rejection will never get handled](http://thecodebarbarian.com/unhandled-promise-rejections-in-node.js):

```javascript
const app = require('express')();

app.get('*', function(req, res) {
  // Reporting async errors *must* go through `next()`
  return new Promise((resolve, reject) => {
    setImmediate(() => reject(new Error('woops')))
  })
});

app.use(function(error, req, res, next) {
  // Will **not** get called. You'll get Express' default error
  // handler, which returns `error.toString()` in the error body
  console.log('will not print');
  res.json({ message: error.message });
});

app.listen(3000);
```

However, with a little helper function you can tie async/await errors in with Express error handling middleware. Remember that `async` functions return promises, so you need to make sure to `.catch()` any errors and pass them to `next()`:

```javascript
function wrapAsync(fn) {
  return function(req, res, next) {
    // Make sure to `.catch()` any errors and pass them along to the `next()`
    // middleware in the chain, in this case the error handler.
    fn(req, res, next).catch(next);
  };
}
```

If you make sure to call `wrapAsync()` on every async middleware function, any async exceptions will end up in your Express error handlers:

```javascript
const app = require('express')();

app.get('*', wrapAsync(async function(req, res) {
  await new Promise(resolve => setTimeout(() => resolve(), 50));
  // Async error!
  throw new Error('woops');
}));

app.use(function(error, req, res, next) {
  // Gets called because of `wrapAsync()`
  res.json({ message: error.message });
});

app.listen(3000);

function wrapAsync(fn) {
  return function(req, res, next) {
    // Make sure to `.catch()` any errors and pass them along to the `next()`
    // middleware in the chain, in this case the error handler.
    fn(req, res, next).catch(next);
  };
}
```

Now this is where the power of error handling middleware really comes in. In other languages (I'm looking at you, [Golang](https://blog.golang.org/error-handling-and-go) ) you're essentially required to check for errors on every I/O operation and manually bubble them up. I'm sure this tedious exercise builds character, but in practice it just makes code cumbersome and hard to refactor.

With `wrapAsync()`, every async error ends up in an error handling middleware. You can define cross-cutting rules like "every assertion error triggers an HTTP 400" and "every database error should be an HTTP 503":

```javascript
const { AssertionError } = require('assert');
const { MongoError } = require('mongodb');

app.use(function handleAssertionError(error, req, res, next) {
  if (error instanceof AssertionError) {
    return res.status(400).json({
      type: 'AssertionError',
      message: error.message
    });
  }
  next(error);
});

app.use(function handleDatabaseError(error, req, res, next) {
  if (error instanceof MongoError) {
    return res.status(503).json({
      type: 'MongoError',
      message: error.message
    });
  }
  next(error);
});
```

Instead of defining error handling on a one-off basis in your individual routes, or, worse yet, in a giant `handleError()` God function, you can define distinct handlers that each handle a certain error condition. You can define error handlers for what happens when your API can't connect to your database, when the user's request didn't match your schema, and when an external API failed.

Moving On
---------

Express error handling middleware lets you handle errors in a way that maximizes separation of concerns. You don't need to handle errors in your business logic - if you use async/await, you don't even need `try/catch`. These errors will bubble to your error handlers, which can then decide how to respond to the request. Make sure you take advantage of this powerful feature in your next Express app!

*If you're stuck on Node 6 but want to use async/await, check out my ebook on [co](http://npmjs.org/package/co), [The 80/20 Guide to ES2015 Generators](http://es2015generators.com/). Co/yield is essentially a drop-in replacement for async/await that works in Node.js >= 4.0.0 with no flags. The two paradigms, async/await and co/yield, are interchangeable except for some advanced use cases, so check out the ebook even if you're more interested in async/await.*
