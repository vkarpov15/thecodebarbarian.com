One of the most compelling reasons for [async/await](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js) is the fact that async functions generally feel like simplified threads, or threads with predictable interrupts. There are numerous
technical differences, of course. But the concept of async/await should seem familiar to anyone that's ever, say, written a background thread for fetching images while scrolling in an iPhone or Android app. Going the other way, you can use
async/await to write code that feels very imperative, rather than JavaScript's usual reactive style:

```javascript
const http = require('http');

// Reactive web server
http.
  createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World\n');
  }).
  listen(4000);

// Imperative web server. Just a thought experiment, don't run this
// code in production please :)
run().catch(error => console.error(error.stack));

async function run() {
  const server = http.createServer().listen(4004);
  // Convert reactive (listening to an event stream) to imperative (calling
  // a function that returns a promise and awaiting on it)
  const next = () => new Promise(resolve => {
    server.on('request', (req, res) => resolve({ req, res }));
  });

  while (true) {
    const { res } = await next();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World, Imperative\n');
  }
};
```

So if async functions are analogous to background threads, how do [mutexes](https://en.wikipedia.org/wiki/Mutual_exclusion#Types_of_mutual_exclusion_devices) look in JavaScript? In this article, I'll demonstrate analogs to locks and barriers using promises. Please note that these examples are meant
to be didactic, they're (probably) not production-ready.

Locks
-----

[Locks](https://en.wikipedia.org/wiki/Lock_(computer_science)) are the simplest form of mutex. A lock is a mechanism for making sure that only one of many concurrently running functions can access a resource at a given time. In Node.js,
the most common use case for locking is ensuring [that two request handlers don't conflict in their interactions with the database](http://thecodebarbarian.com/enforcing-uniqueness-with-mongodb-partial-unique-indexes.html). You can achieve this implicitly by [queueing](http://thecodebarbarian.com/queueing-function-calls-with-node.js-and-mongodb.html), but queueing can be too heavy-handed and not give sufficiently fine grained control to the individual function.

Here's how using a lock for an HTTP server that needs to execute a separate query to make sure there's no user with a given email address might look. Keep in mind
this code uses an in-memory lock, so it will work for a single process, but you
need distributed locking if you want to scale this horizontally.

```javascript
onst Archetype = require('archetype');
const bodyParser = require('body-parser');
const express = require('express');
const mongodb = require('mongodb');

run().catch(error => console.error(error));

async function run() {
  const db = await mongodb.MongoClient.connect('mongodb://localhost:27017/test');
  const app = express();
  app.use(bodyParser.json());

  const UserType = new Archetype({
    email: {
      $type: 'string',
      $required: true
    }
  }).compile('UserType');

  const lock = new Lock();

  app.post('/user', wrap(async function register(req) {
    const user = new UserType(req.body);
    user.email = user.email.toLowerCase();
    // Search for existing user unless email ends with given string
    if (!user.email.endsWith('@mycompany.com')) {
      // We need to acquire the lock to make sure we can safely query and
      // then later insert without another `register()` function inserting
      // a user with the same email at the same time.
      await lock.acquire();
      const existingUser = await db.collection('User').findOne({ email: user.email });
      if (existingUser != null) {
        lock.release();
        throw new Error(`User already exists with email ${user.email}`);
      }
    }
    // Safe for a single process, because of the lock
    await db.collection('User').insertOne(user);
    // In this case, releasing a lock that hasn't been acquired is
    // assumed to be a no-op rather than an error.
    lock.release();
    return { user };
  }));

  app.listen(3000);
}

function wrap(fn) {
  return function(req, res, next) {
    fn(req).then(returnVal => res.json(returnVal)).catch(err => res.status(500).json({ message: err.message }));
  };
}
```

Assuming that `await lock.acquire()` "blocks" the function until it can ensure that its the only instance of `register()` running, locking will prevent the glaring race condition in the above code. Without locks or queueing, two instances of `register()` running with the same email address may both run `findOne()` at the same time and then think they're good to insert.

Below is how a simple lock might work. This code isn't production-ready but is a handy example of how you might implement in-memory locking in JavaScript.

```javascript
const { EventEmitter } = require('events');

class Lock {
  constructor() {
    this._locked = false;
    this._ee = new EventEmitter();
  }

  acquire() {
    return new Promise(resolve => {
      // If nobody has the lock, take it and resolve immediately
      if (!this._locked) {
        // Safe because JS doesn't interrupt you on synchronous operations,
        // so no need for compare-and-swap or anything like that.
        this._locked = true;
        return resolve();
      }

      // Otherwise, wait until somebody releases the lock and try again
      const tryAcquire = () => {
        if (!this._locked) {
          this._locked = true;
          this._ee.removeListener('release', tryAcquire);
          return resolve();
        }
      };
      this._ee.on('release', tryAcquire);
    });
  }

  release() {
    // Release the lock immediately
    this._locked = false;
    setImmediate(() => this._ee.emit('release'));
  }
}
```

Barriers
--------

[Barriers](https://en.wikipedia.org/wiki/Barrier_(computer_science)) are a much more fun mutex. Whereas a lock blocks multiple threads from running the same code at the same time, barriers block multiple threads from proceeding until sufficiently many have reached the barrier. In JS, a barrier can hold multiple async functions until sufficiently many have reached a certain point.

In many ways, [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) behaves like a barrier. It blocks an async function from continuing until every async function has resolved. Unfortunately, `Promise.all()` is not sufficient for all use cases. For example, suppose you have the `register()` function from the previous example and you want to test that it errors if you call it twice in rapid succession using [mocha](http://npmjs.com/package/mocha):

```javascript
const Archetype = require('archetype');

const lock = new Lock();

const UserType = new Archetype({
  email: {
    $type: 'string',
    $required: true
  }
}).compile('UserType');

module.exports = db => async function register(params) {
  const user = new UserType(params);
  user.email = user.email.toLowerCase();
  // Search for existing user unless email ends with given string
  if (!user.email.endsWith('@mycompany.com')) {
    // We need to acquire the lock to make sure we can safely query and
    // then later insert without another `register()` function inserting
    // a user with the same email at the same time.
    await lock.acquire();
    const existingUser = await db.collection('User').findOne({ email: user.email });
    if (existingUser != null) {
      lock.release();
      throw new Error(`User already exists with email ${user.email}`);
    }
  }
  // Safe for a single process, because of the lock
  await db.collection('User').insertOne(user);
  // In this case, releasing a lock that hasn't been acquired is
  // assumed to be a no-op rather than an error.
  lock.release();
  return { user };
}
```

Here's how a mocha test for the above function might look:

```javascript
const assert = require('assert');
const mongodb = require('mongodb');
const register = require('./test.js');

describe('register', function() {
  let db;

  before(async function() {
    db = await mongodb.MongoClient.connect('mongodb://localhost:27017/test');
  });

  beforeEach(async function() {
    await db.dropDatabase();
  });

  it('errors if called concurrently', async function() {
    let threw = false;
    try {
      // Red flag: `Promise.all()` rejects immediately when one function
      // rejects, so the successful `register()` call might still be running
      // when the test is done and leak state!
      await Promise.all([
        register(db)({ email: 'test@test' }),
        register(db)({ email: 'test@test' })
      ]);
    } catch (error) {
      assert.ok(error);
      assert.ok(error.message.indexOf('test@test') !== -1, error.message);
      threw = true;
    }
    assert.ok(threw);
  });
});
```

There's a big problem with this test case: by design, it doesn't wait for all
`register()` calls to finish running before finishing the test. `Promise.all()` rejects immediately when one of the promises rejects, but the other promises are still running! This can lead
to hard-to-debug errors in other tests because the successful `register()` will continue running **after** the test is done!

An alternative to `Promise.all()` that works well for this case is referred to as [`settleAll()` in the bluebird docs](http://bluebirdjs.com/docs/api/reflect.html), but I've been calling it `Promise.barrier()` of late. Here's an idea of how you might implement it.

```javascript
Promise.barrier = function(promises) {
  // Number of outstanding promises
  let remaining = promises.length;
  // Track the first error that occurred. If we got an error, reject
  // with that error when all promises have settled
  let error = null;
  return new Promise((resolve, reject) => {
    for (let i = 0; i < promises.length; ++i) {
      promises[i].
        then(res => {
          // Have all the promises settled?
          if (!--remaining) {
            // If we had an error, reject with the first error. Otherwise
            // resolve to undefined.
            error != null ? reject(error) : resolve();
          }
        }).
        catch(_error => {
          error = error || _error;
          if (!--remaining) {
            reject(error);
          }
        })
    }
  });
};
```

Moving On
---------

[Async/await](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js) allows you to write blocks of imperative code that look like threads in JavaScript. But, just because JavaScript is single threaded doesn't mean you don't need mutexes. With async/await and distributed computing, mutexes, particularly distributed locks, are more important than ever. Look forward to more content about locking in JavaScript in the near future!
