One great perk of [async/await in Node.js](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js) is how well it integrates with existing libraries. By now, most popular Node.js libraries support some sort of promise-based API, so they integrate nicely with async/await. You might even have the pleasure of removing a few dependencies from your `package.json` if you start using async/await instead of [co](http://npmjs.org/package/co). In this article, I'll show you how async/await works with [mocha](https://www.npmjs.com/package/mocha) tests, [express](http://npmjs.org/package/express) routes and middleware, and [mongoose](https://www.npmjs.com/package/mongoose) queries and cursors.

Mocha
-----

Mocha has enjoyed [rudimentary support for tests that return promises since 2014](https://github.com/mochajs/mocha/blob/master/CHANGELOG.md#1180--2014-03-13). Since [`async` functions return promises](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js), mocha has had support for `async` test functions since 2014. For example, if you wrote
tests to test a login API endpoint using superagent using vanilla promises, it would look something like this:

```javascript
const agent = require('superagent');

describe('login()', function() {
  it('success', function() {
    const params = {
      email: 'test@test.com',
      password: 'helloworld'
    };
    // Return a promise
    return agent.post('/login', params).
      then(token => {
        assert.ok(token);
        assert.ok(token._id);
      });
  });
});
```

This test works just fine in mocha, the test will succeed if the promise resolves and fail if the promise rejects. Before async/await, you could use [co-mocha](https://www.npmjs.com/package/co-mocha) to seamlessly integrate with co:

```javascript
const agent = require('superagent');
const coMocha = require('co-mocha');
const mocha = require('mocha');

coMocha(mocha);

describe('login()', function() {
  it('success', function*() {
    const params = {
      email: 'test@test.com',
      password: 'helloworld'
    };

    const token = yield agent.post('/login', params);

    assert.ok(token);
    assert.ok(token._id);
  });
});
```

With co-mocha, you don't need promise chaining, but you do need an outside library. With async/await though, since `async` functions return a promise, you don't need any outside libraries, the below test just works:

```javascript
const agent = require('superagent');

describe('login()', function() {
  it('success', async function() {
    const params = {
      email: 'test@test.com',
      password: 'helloworld'
    };

    const token = await agent.post('/login', params);

    assert.ok(token);
    assert.ok(token._id);
  });
});
```

You can also use `async` functions with [mocha `before()`, `beforeEach()`, etc. hooks](https://mochajs.org/#working-with-promises). Using mocha with async/await is painless.

Express
-------

Using async/await with the [Express web framework](http://expressjs.com/) is more subtle than it looks. You might naively think that the below code is perfectly ok:

```javascript
const { MongoClient } = require('mongodb');
const express = require('express');

async function run() {
  const app = express();

  app.get('*', async function(req, res) {
    res.send('Hello, World!');
  });

  app.listen(3000);
  console.log('App listening');
}

run().catch(error => console.error(error.stack));
```

However, what happens if the route handler throws an exception?

```javascript
app.get('*', async function(req, res) {
  throw new Error('test');
  res.send('Hello, World!');
});
```

Any incoming HTTP request will hang forever, because Express doesn't handle [promise rejections](http://thecodebarbarian.com/unhandled-promise-rejections-in-node.js.html) for you. [Express error handlers](https://expressjs.com/en/guide/error-handling.html) don't help either.

```javascript
app.get('*', async function(req, res) {
  throw new Error('test');
  res.send('Hello, World!');
});

// Will **not** get called because of the above error
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
```

Unfortunately, as far as I know, there's no way to make the above code work without patching `app.get()`. However, with a more promise-friendly design pattern and a helper function, you can pass async function errors to Express error handlers.

```javascript
app.get('*', wrap(async function(req) {
  throw new Error('test');
}));

// Will **not** get called because of the above error
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

function wrap(fn) {
  return function(req, res, next) {
    // Make sure to `.catch()` any errors and pass them along to the `next()`
    // middleware in the chain, in this case the error handler.
    fn(req).then(returnVal => res.send(returnVal)).catch(next);
  };
}
```

The key idea in the above code is that, since `async` functions return a promise,
you need to `.catch()` any promise rejections and pass them along to `next()`. Remember that Express error handlers are only triggered by errors passed to `next()`, not exceptions that you `throw`.

In general, when using Express with async/await, or its ES6 cousin [co/yield](http://es2015generators.com/), I find it much easier to separate out using `res` from the actual logic of the route handler. Like the `wrap()` function above, I prefer to put business logic in the `async` function and call `res.json()` or `res.send()` in the `.then()` function. This makes error handling cleaner, because then you know you won't double-call `res.send()` if some error in the route handler happened after you called `res.send()`.

Similarly, using async/await for middleware is easy with a wrapper function. For example, suppose you wanted to log the method and URL from the HTTP request to MongoDB:

```javascript
app.use(wrapMiddleware(async function(req) {
  await db.collection('logs').insertOne({
    createdAt: new Date(),
    method: req.method,
    url: req.url
  });
}));

function wrapMiddleware(fn) {
  return function(req, res, next) {
    // If promise resolves, call `next()` with no args, otherwise call `next()`
    // with the error from the promise rejection
    fn(req).then(() => next(), next);
  };
}
```

Mongoose
--------

Queries in Mongoose 4.x have a `.then()` function, so you don't need any extra work to use mongoose with async/await:

```javascript
const mongoose = require('mongoose');

async function run() {
  // No need to `await` on this, mongoose 4 handles connection buffering
  // internally
  mongoose.connect('mongodb://localhost:27017/test');

  await mongoose.connection.dropDatabase();

  const MyModel = mongoose.model('Test', new mongoose.Schema({ name: String }));

  await MyModel.create({ name: 'Val' });

  // Prints an array with 1 element, the above document
  console.log(await MyModel.find());
}

run().catch(error => console.error(error.stack));
```

Async/await makes interacting with [mongoose cursors](http://thecodebarbarian.com/cursors-in-mongoose-45) much more elegant. While you still can [use cursors as a stream with async/await](http://thecodebarbarian.com/3-common-co-design-patterns), it's much more elegant to use the `next()` function. Fundamentally, a mongoose cursor is an object with a `next()` function that returns a promise which resolves to the next document in the query result, or `null` if there are no more documents.

```javascript
const mongoose = require('mongoose');

async function run() {
  mongoose.connect('mongodb://localhost:27017/test');

  await mongoose.connection.dropDatabase();

  const MyModel = mongoose.model('Test', new mongoose.Schema({ name: String }));

  await MyModel.create({ name: 'Val' }, { name: 'Varun' });

  // A cursor has a `.next()` function that returns a promise. The promise
  // will resolve to the next doc if there is one, or null if they are no
  // more results.
  const cursor = MyModel.find().sort({name: 1 }).cursor();
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    // Prints "Val" followed by "Varun"
    console.log(doc.name);
  }
}

run().catch(error => console.error(error.stack));
```

Mongoose cursors also have a neat `eachAsync()` function that lets you do some rudimentary [functional programming with async/await](http://thecodebarbarian.com/basic-functional-programming-with-async-await.html). The `eachAsync()` function executes a (potentially `async`) function for each document that the cursor returns. If that function returns a promise, it will wait for that promise to resolve before getting the next document. This is the easiest way to exhaust a cursor in mongoose.

```javascript
const mongoose = require('mongoose');

async function run() {
  mongoose.connect('mongodb://localhost:27017/test');

  await mongoose.connection.dropDatabase();

  const MyModel = mongoose.model('Test', new mongoose.Schema({ name: String }));

  await MyModel.create({ name: 'Val' }, { name: 'Varun' });

  // A cursor has a `.next()` function that returns a promise. The promise
  // will resolve to the next doc if there is one, or null if they are no
  // more results.
  const cursor = MyModel.find().sort({name: 1 }).cursor();

  let count = 0;
  console.log(new Date());
  await cursor.eachAsync(async function(doc) {
    // Wait 1 second before printing first doc, and 0.5 before printing 2nd
    await new Promise(resolve => setTimeout(() => resolve(), 1000 - 500 * (count++)));
    console.log(new Date(), doc);
  });
}

run().catch(error => console.error(error.stack));
```

Moving On
---------

Async/await is a powerful tool that integrates seamlessly with some, but not all, popular npm modules. As usual, [caveat npmtor](https://en.wikipedia.org/wiki/Caveat_emptor). I've written [3](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js) [separate](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js) [articles](http://thecodebarbarian.com/basic-functional-programming-with-async-await.html) on related async/await topics that you should check out if you're still getting your feet wet.

*Node.js 8 is still not out yet, so no current LTS version of Node.js supports async/await. If you're stuck because of LTS, check out my ebook on [co](http://npmjs.org/package/co), [The 80/20 Guide to ES2015 Generators](http://es2015generators.com/). Co/yield is essentially a drop-in replacement for async/await that works in Node.js >= 4.0.0 with no flags. The two paradigms, async/await and co/yield, are interchangeable except for some advanced use cases, so check out the ebook even if you're more interested in async/await._
