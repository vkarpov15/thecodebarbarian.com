Arguably the biggest new feature in [Node.js 7.6.0](https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V7.md#7.6.0) is that the [much awaited async function keyword is now available without a flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function). [Callback hell](http://thecodebarbarian.com/2015/03/20/callback-hell-is-a-myth) and promise hell are now in the past. But, like [Uncle Ben always reminded us](https://en.wikipedia.org/wiki/Uncle_Ben#.22With_great_power_comes_great_responsibility.22), with great power comes great responsibility, and async/await gives you a lot of new and exciting ways to shoot yourself in the foot. You still need to handle errors and be aware of the async nature of your code, otherwise you'll inevitably be complaining about "async/await hell" in 6 months.

_All code in this article was tested on node.js 7.6.0. It will not work on earlier versions of node. [Node.js 7.x](https://nodejs.org/en/blog/release/v7.0.0/) is an odd-numbered Node.js release, which means it is scheduled to be deprecated in June 2017, so I wouldn't recommend using it in production._

Hello, World
------------

Here's a "Hello, World" example of using async/await:

```javascript
async function test() {
  await new Promise((resolve, reject) => setTimeout(() => resolve(), 1000));
  console.log('Hello, World!');
}

test();
```

You can run this node script like any other, without any transpilers, and it
will print out "Hello, World!" after approximately 1 second. This is how
you can implement [JavaScript sleep](https://masteringjs.io/tutorials/fundamentals/sleep)
with async/await.

```javascript
$ ~/Workspace/node-v7.6.0-linux-x64/bin/node async.js
Hello, World!
$
$ time ~/Workspace/node-v7.6.0-linux-x64/bin/node async.js
Hello, World!

real	0m1.121s
user	0m0.115s
sys	0m0.008s
$
```

Async functions are based entirely on [promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). You should always `await` on a promise. Using `await` on a non-promise won't do anything:

```javascript
async function test() {
  // Works, just doesn't do anything useful
  await 5;
  console.log('Hello, World!');
}

test();
```

You don't need to use native Node.js promises with `await`. [Bluebird](https://www.npmjs.com/package/bluebird) or any other promise lib should work. In general, using `await` with any object that has a `then()` function will work:

```javascript
async function test() {
  // This object is a "thenable". It's a promise by the letter of the law,
  // but not the spirit of the law.
  await { then: resolve => setTimeout(() => resolve(), 1000) };
  console.log('Hello, World!');
}

test();
```

There is one major restriction for using `await`: you **must** use `await` within a function that's declared `async`. The below code will result in a `SyntaxError`.

```javascript
function test() {
  const p = new Promise(resolve => setTimeout(() => resolve(), 1000));
  // SyntaxError: Unexpected identifier
  await p;
}

test();
```

Furthermore, `await` must **not** be in a closure embedded in an async function, unless the closure is also an async function. The below code also results in a `SyntaxError`:

```javascript
const assert = require('assert');

async function test() {
  const p = Promise.resolve('test');
  assert.doesNotThrow(function() {
    // SyntaxError: Unexpected identifier
    await p;
  });
  console.log('Hello, world!');
}

test();
```

Another important detail to remember about `async` functions is that `async` functions return promises:

```javascript
async function test() {
  await new Promise((resolve, reject) => setTimeout(() => resolve(), 1000));
  console.log('Hello, World!');
}

// Prints "Promise { <pending> }"
console.log(test());
```

This means that you can `await` on the result of an `async` function.

```javascript
async function wait(ms) {
  await new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function test() {
  // Since `wait()` is marked `async`, the return value is a promise, so
  // you can `await`
  await wait(1000);
  console.log('Hello, World!');
}

test();
```

Return Values and Exceptions
----------------------------

A promise can either _resolve_ to a value or _reject_ with an error. Async/await lets you handle these cases with synchronous operators: assignment for resolved values, and `try/catch` for exceptions. The return value of `await` is the value that the promise resolves to:

```javascript
async function test() {
  const res = await new Promise(resolve => {
    // This promise resolves to "Hello, World!" after ~ 1sec
    setTimeout(() => resolve('Hello, World!'), 1000);
  });
  // Prints "Hello, World!". `res` is equal to the value the promise resolved to
  console.log(res);
}

test();
```

In an async function, you can use `try/catch` to catch promise rejections. In other words, asynchronous promise rejections behave like synchronous errors:

```javascript
async function test() {
  try {
    await new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Woops!')), 1000);
    });
  } catch (error) {
    // Prints "Caught Woops!"
    console.log('Caught', error.message);
  }
}

test();
```

Using `try/catch` as an error handling mechanism is powerful because it enables you to handle synchronous errors and asynchronous errors with a single syntax. In callback land you'd often have to wrap your async calls in a `try/catch` as well as handling the `error` callback parameter.

```javascript
function bad() {
  throw new Error('bad');
}

function bad2() {
  return new Promise(() => { throw new Error('bad2'); });
}

async function test() {
  try {
    await bad();
  } catch (error) {
    console.log('caught', error.message);
  }

  try {
    await bad2();
  } catch (error) {
    console.log('caught', error.message);
  }
}

test();
```

Loops and Conditionals
----------------------

The number one killer feature of async/await is that you can write async code using `if` statements, `for` loops, and all the other synchronous constructs that you had to swear off of when using callbacks. You don't need any [flow control libraries](http://npmjs.org/package/async) with async/await, you just use conditionals and loops. Here's an example using a `for` loop:

```javascript
function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function test() {
  for (let i = 0; i < 10; ++i) {
    await wait(1000);
    // Prints out "Hello, World!" once per second and then exits
    console.log('Hello, World!');
  }
}

test();
```

And an example using an `if` statement:

```javascript
function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function test() {
  for (let i = 0; i < 10; ++i) {
    if (i < 5) {
      await wait(1000);
    }
    // Prints out "Hello, World!" once per second 5 times, then prints it 5 times immediately
    console.log('Hello, World!');
  }
}

test();
```

Remember It's Asynchronous
--------------------------

One cute JavaScript interview question I used to ask was what would the below code print out?

```javascript
for (var i = 0; i < 5; ++i) {
  // Actually prints out "5" 5 times.
  // But if you use `let` above, it'll print out 0-4
  setTimeout(() => console.log(i), 0);
}

// This will print *before* the 5's
console.log('end');
```

Asynchronous code is confusing, and async/await makes it easier to write asyncronous code but doesn't change the nature of asynchronous code. Just because `async` functions look synchronous doesn't mean they are:

```javascript
function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function test(ms) {
  for (let i = 0; i < 5; ++i) {
    await wait(ms);
    console.log(ms * (i + 1));
  }
}

// These two function calls will actually run in parallel
test(70);
test(130);

// Output
70
130
140
210
260
280
350
390
520
650
```

Error Handling
--------------

Remember that you can only use `await` within an `async` function, and `async` functions return promises. This means that somewhere in your code you're going to have to handle errors. Async/await gives you a powerful mechanism for aggregating errors: all errors that occur in the async function, synchronous or asynchronous, are bubbled up as a promise rejection. However, it's up to you to handle the error. Here's [another interesting article on the topic of handling promise rejections with async/await](https://medium.com/@yamalight/danger-of-using-async-await-in-es7-8006e3eb7efb#.9hi1z9gry).

Let's say you want to use async/await with the [Express web framework](http://npmjs.org/package/express). The naive way of using async functions with Express works in the most basic case:

```javascript
const express = require('express');

const app = express();

app.get('/', handler);

app.listen(3000);

async function handler(req, res) {
  // Will wait approximately 1 second before sending the result
  await wait(1000);
  res.send('Hello, world');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}
```

<a href="http://i.imgur.com/RmWWczB.png"><img src="http://i.imgur.com/RmWWczB.png"></a>

So we're done, right? **Wrong**. What happens if you throw an exception in the `handler` function?

```javascript
const express = require('express');

const app = express();

app.get('/', handler);

app.listen(3000);

async function handler(req, res) {
  throw new Error('Hang!');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}
```

Express will hang forever, the server won't crash, and the only indication of an error would be an unhandled promise rejection warning.

```
$ node async.js
(node:17661) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): Error: Hang!
(node:17661) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
```

Since `await` treats promise rejections as exceptions, unless you `try/catch` around `await` the rejection will cause the entire function to stop executing. The below `handler` function will also hang with an unhandled promise rejection warning.

```javascript
async function handler(req, res) {
  await new Promise((resolve, reject) => reject(new Error('Hang!')));
  res.send('Hello, World!');
}
```

<img src="https://cdn.meme.am/cache/instances/folder898/500x/76013898.jpg">

The single most important takeaway from this article is that `async` functions return a promise. Async/await gives you the ability to build sophisticated async logic with loops, conditionals, and `try/catch`, but in the end it packages all this logic into a single promise. If you see async/await code that doesn't include any `.catch()` calls, odds are that code is missing some error cases. Here's a better way of handling async functions with Express:

```javascript
const express = require('express');

const app = express();

app.get('/', safeHandler(handler));

app.listen(3000);

function safeHandler(handler) {
  return function(req, res) {
    handler(req, res).catch(error => res.status(500).send(error.message));
  };
}

async function handler(req, res) {
  await new Promise((resolve, reject) => reject(new Error('Hang!')));
  res.send('Hello, World!');
}
```

The `safeHandler` function chains `.catch()` onto the promise that the async `handler` function returns. This ensures that your server sends an HTTP response, even if `handler` errors out. If calling `safeHandler` on every request handler seems cumbersome, there are numerous alternatives, like using [observables](http://thecodebarbarian.com/rest-apis-with-observables.html) or [ramda](http://thecodebarbarian.com/using-ramda-as-a-dependency-injector).

Async/Await vs Co/Yield
-----------------------

The [co](https://www.npmjs.com/package/co) library uses [ES6 generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) to get functionality similar to async/await. For example, here's how the `safeHandler` code example would look with co/yield:

```javascript
const co = require('co');
const express = require('express');

const app = express();

app.get('/', safeHandler(handler));

app.listen(3000);

function safeHandler(handler) {
  return function(req, res) {
    handler(req, res).catch(error => res.status(500).send(error.message));
  };
}

function handler(req, res) {
  return co(function*() {
    yield new Promise((resolve, reject) => reject(new Error('Hang!')));
    res.send('Hello, World!');
  });
}
```

As a matter of fact, you can replace every `async function(params) {}` in this article with `function(params) { return co(function*() {}) }` and `await` with `yield` and all the examples will still work.

The upside of using co is that co works without any transpilation in Node.js 4.x and 6.x. The [EOL of 4.x and 6.x](https://github.com/nodejs/LTS#lts-schedule) is in 2018 and 2019, respectively, so these releases are more stable than Node.js 7.x. Until Node.js 8 is released [(tentatively scheduled for April 2017)](https://github.com/nodejs/node/issues/10117) there's no LTS version of Node.js that supports async/await without transpilers. Co also enjoys better browser support, and every transpiler for async/await that I know of compiles down to using generators. If you're interested in really mastering co and generators, check out my ebook, [The 80/20 Guide to ES2015 Generators](http://es2015generators.com), which walks you through writing your own co from scratch.

Async/await has numerous advantages, most notably readable stack traces. Let's compare the stack traces of using co vs using async/await with the Express example:

```javascript
function handler(req, res) {
  return co(function*() {
    yield new Promise((resolve, reject) => reject(new Error('Hang!')));
    res.send('Hello, World!');
  });
}

// --- versus ---

async function handler(req, res) {
  await new Promise((resolve, reject) => reject(new Error('Hang!')));
  res.send('Hello, World!');
}
```

Async:

```
$ node async.js
Error: Hang!
    at Promise (/home/val/async.js:16:49)
    at handler (/home/val/async.js:16:9)
    at /home/val/async.js:11:5
    at Layer.handle [as handle_request] (/home/val/node_modules/express/lib/router/layer.js:95:5)
    at next (/home/val/node_modules/express/lib/router/route.js:137:13)
    at Route.dispatch (/home/val/node_modules/express/lib/router/route.js:112:3)
    at Layer.handle [as handle_request] (/home/val/node_modules/express/lib/router/layer.js:95:5)
    at /home/val/node_modules/express/lib/router/index.js:281:22
    at Function.process_params (/home/val/node_modules/express/lib/router/index.js:335:12)
    at next (/home/val/node_modules/express/lib/router/index.js:275:10)
```

Co:

```
$ node async.js
Error: Hang!
    at Promise (/home/val/async.js:18:51)
    at /home/val/async.js:18:11
    at Generator.next (<anonymous>)
    at onFulfilled (/home/val/node_modules/co/index.js:65:19)
    at /home/val/node_modules/co/index.js:54:5
    at co (/home/val/node_modules/co/index.js:50:10)
    at handler (/home/val/async.js:17:10)
    at /home/val/async.js:12:5
    at Layer.handle [as handle_request] (/home/val/node_modules/express/lib/router/layer.js:95:5)
    at next (/home/val/node_modules/express/lib/router/route.js:137:13)
```

So async/await has better stack traces and lets you construct promises using the built-in loops and conditionals that you already know, so download Node.js 7.6 and give it a shot!

_Looking to become fluent in async/await? My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of
async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
