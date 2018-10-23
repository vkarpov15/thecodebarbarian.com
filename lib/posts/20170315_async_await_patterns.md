[Async/await in Node.js](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html) opens up a host of powerful design patterns. Tasks that used to take [complex libraries](https://www.npmjs.com/package/async) or intricate promise chaining can now be done with rudimentary `if` statements and `for` loops. [I already wrote about these kind of design patterns with co](http://thecodebarbarian.com/3-common-co-design-patterns), but async/await makes these patterns accessible in vanilla Node.js, no outside libraries required.

Retrying Failed Requests
------------------------

The power of `await` is that it lets you write asynchronous code using synchronous
language constructs. For example, here's how you might retry a failed HTTP request using the [superagent HTTP library](http://npmjs.org/package/superagent) using callbacks.

```javascript
const superagent = require('superagent');

const NUM_RETRIES = 3;

request('http://google.com/this-throws-an-error', function(error, res) {
  console.log(error.message); // "Not Found"
});

function request(url, callback) {
  _request(url, 0, callback);
}

function _request(url, retriedCount, callback) {
  superagent.get(url).end(function(error, res) {
    if (error) {
      if (retriedCount >= NUM_RETRIES) {
        return callback && callback(error);
      }
      return _request(url, retriedCount + 1, callback);
    }
    callback(res);
  });
}
```

Not too difficult, but it involves recursion and can be tricky to grok for beginners. Plus, there's another more subtle issue. What happens if `superagent.get().end()` throws a _synchronous_ exception? We'd need to wrap the `_request()` call in a try/catch in order to handle all exceptions. Having to do this everywhere is
cumbersome and error prone. With async/await, you can write an equivalent function with just `for` and `try/catch`:

```javascript
const superagent = require('superagent');

const NUM_RETRIES = 3;

test();

async function test() {
  let i;
  for (i = 0; i < NUM_RETRIES; ++i) {
    try {
      await superagent.get('http://google.com/this-throws-an-error');
      break;
    } catch(err) {}
  }
  console.log(i); // 3
}
```

Trust me, this works. I remember the first time I tried this pattern with [co](https://www.npmjs.com/package/co), I was baffled that it actually worked. However, the below does **not** work. Remember that `await` must always be in an `async` function, and the closure passed to `forEach()` below is not `async`.

```javascript
const superagent = require('superagent');

const NUM_RETRIES = 3;

test();

async function test() {
  let arr = new Array(NUM_RETRIES).map(() => null);
  arr.forEach(() => {
    try {
      // SyntaxError: Unexpected identifier. This `await` is not in an async function!
      await superagent.get('http://google.com/this-throws-an-error');
    } catch(err) {}
  });
}
```

Processing a MongoDB Cursor
---------------------------

[MongoDB's `find()` function returns a _cursor_](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#find). A cursor is fundamentally an object with an asynchronous `next()` function that gets the next document in the query result. If there are no more results, `next()` resolves to null. MongoDB cursors have several helper functions like `each()`, `map()`, and `toArray()`, and the [mongoose ODM](https://www.npmjs.com/package/mongoose) adds an [additional `eachAsync()` function](http://thecodebarbarian.com/cursors-in-mongoose-45), but these are all just syntactic sugar on top of `next()`.

Without async/await, calling `next()` manually involves the same kind of recursion as the retry example. With async/await, you'll find yourself not using the helper functions anymore (other than maybe `toArray()`) because iterating through the cursor with a `for` loop is much easier:

```javascript
const mongodb = require('mongodb');

test();

async function test() {
  const db = await mongodb.MongoClient.connect('mongodb://localhost:27017/test');

  await db.collection('Movies').drop();
  await db.collection('Movies').insertMany([
    { name: 'Enter the Dragon' },
    { name: 'Ip Man' },
    { name: 'Kickboxer' }
  ]);

  // Don't `await`, instead get a cursor
  const cursor = db.collection('Movies').find();
  // Use `next()` and `await` to exhaust the cursor
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    console.log(doc.name);
  }
}
```

If that's not convenient enough for you, there's a [TC39 proposal for async iterators](https://github.com/tc39/proposal-async-iteration) that would let you do something like this. Note that the below code does **not** work in any currently released version of Node.js, it's just an example of what may be possible in the future.

```javascript
const cursor = db.collection('Movies').find().map(value => ({
  value,
  done: !value
}));

for await (const doc of cursor) {
  console.log(doc.name);
}
```

Multiple Requests in Parallel
-----------------------------

Both of the above patterns execute requests in sequence, there's only one `next()` function call executing at any given time. What about multiple asynchronous tasks in parallel? Let's pretend you're a malicious hacker and want to hash multiple plaintext passwords in parallel with [bcrypt](https://www.npmjs.com/package/bcrypt).

```javascript
const bcrypt = require('bcrypt');

const NUM_SALT_ROUNDS = 8;

test();

async function test() {
  const pws = ['password', 'password1', 'passw0rd'];

  // `promises` is an array of promises, because `bcrypt.hash()` returns a
  // promise if no callback is supplied.
  const promises = pws.map(pw => bcrypt.hash(pw, NUM_SALT_ROUNDS));

  /**
   * Prints hashed passwords, for example:
   * [ '$2a$08$nUmCaLsQ9rUaGHIiQgFpAOkE2QPrn1Pyx02s4s8HC2zlh7E.o9wxC',
   *   '$2a$08$wdktZmCtsGrorU1mFWvJIOx3A0fbT7yJktRsRfNXa9HLGHOZ8GRjS',
   *   '$2a$08$VCdMy8NSwC8r9ip8eKI1QuBd9wSxPnZoZBw8b1QskK77tL2gxrUk.' ]
   */
  console.log(await Promise.all(promises));
}
```

The [`Promise.all()` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) takes an array of promises, and returns a promise that waits for every promise in the array to resolve and then resolves to an array that contains the value each promise in the original array resolved to. Each `bcrypt.hash()` call returns a promise, so `promises` in the above array contains an array of promises, and the value of `await Promise.all(promises)` is the result of each of the `bcrypt.hash()` calls.

`Promise.all()` is not the only way you can handle multiple async functions in parallel, there's also the [`Promise.race()` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race) that executes multiple promises in parallel, waits for the first promise to resolve, and returns the value that promise resolved to. Here's an example of using `Promise.race()` with async/await:

```javascript
/**
 * Prints below:
 * waited 250
 * resolved to 250
 * waited 500
 * waited 1000
 */
test();

async function test() {
  const promises = [250, 500, 1000].map(ms => wait(ms));
  console.log('resolved to', await Promise.race(promises));
}

async function wait(ms) {
  await new Promise(resolve => setTimeout(() => resolve(), ms));
  console.log('waited', ms);
  return ms;
}
```

Note that, although `Promise.race()` resolves after the first promise resolves, the remaining `async` functions still continue executing. [Remember that promises are not cancellable](https://github.com/tc39/proposal-cancelable-promises).

Moving On
---------

Async/await is a huge win for JavaScript. With these two simple keywords you can remove numerous external dependencies and hundreds of lines of code from your codebase. You can add robust error handling, retries, and parallelization with just a handful of simple built-in language constructs. I hope you're as excited as I am for this feature to hit [Node.js 8 LTS (hopefully) in April 2017](https://github.com/nodejs/LTS#lts-plan).

_Looking to become fluent in async/await? My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of
async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
