Node.js 6.6.0 added a sporadically useful bug/feature: [logging unhandled promise rejections to the console by default](https://nodejs.org/api/process.html#process_event_rejectionhandled). In other words, the below script will print an error to the console:

```javascript
Promise.reject(new Error('woops'));

/* Output:
$ node test.js
(node:7741) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): Error: woops
(node:7741) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code. */
```

[Bluebird has supported similar behavior for quite a while](http://bluebirdjs.com/docs/api/suppressunhandledrejections.html). I've [vocally expressed my distaste for this behavior in the past](https://github.com/nodejs/node/issues/830#issuecomment-254904199), it's actually one of the many reasons why I don't use bluebird. But now that this behavior is in core node, it appears we're all stuck with it, so we better learn to take advantage of it.

What is an Unhandled Rejection?
-------------------------------

"Rejection" is the canonical term for a promise reporting an error. As defined in ES6, a promise is a state machine representation of an asynchronous operation and [can be in one of 3 states](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise): "pending", "fulfilled", or "rejected". A pending promise represents an asynchronous operation that's in progress and a fulfilled promise represents an asynchronous operation that's completed successfully. A rejected promise represents an asynchronous operation that failed for some reason. For example, trying to connect to a nonexistent MongoDB instance using the MongoDB driver will give you a promise rejection:

```javascript
const { MongoClient } = require('mongodb');

MongoClient.connect('mongodb://notadomain');

/* Output:
$ node test.js
(node:9563) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): MongoError: failed to connect to server [notadomain:27017] on first connect [MongoError: getaddrinfo ENOTFOUND notadomain notadomain:27017]
(node:9563) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code. */
```

Recall that the ES6 style promise constructor takes an "executor" function that takes 2 functions as arguments, `resolve` and `reject`. One way to cause a promise rejection is to call `reject()`:

```javascript
new Promise((resolve, reject) => {
  setTimeout(() => reject('woops'), 500);
});

/* Output:
$ node test.js
(node:8128) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): woops
(node:8128) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code. */
```

Another way is to throw an exception in the executor function:

```javascript
new Promise(() => { throw new Error('exception!'); });

/* Output
$ node test.js
(node:8383) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): Error: exception!
(node:8383) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code. */
```

Some argue that [throwing an exception in the executor function is bad practice](http://2ality.com/2016/03/promise-rejections-vs-exceptions.html). I strongly disagree. Consolidated error handling is a strong design pattern, and going back to the days where we had to wrap async function calls in `try/catch` as well as handle the callback `error` param is a step in the wrong direction.

[Chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then#Chaining) is how you handle promise rejections. ES6 promises have a handy `.catch()` helper function for handling rejections.

```javascript
new Promise((_, reject) => reject(new Error('woops'))).
  // Prints "caught woops"
  catch(error => { console.log('caught', error.message); });

// Equivalent. `.catch(fn)` is essentially identical to `.then(null, fn)`
new Promise((_, reject) => reject(new Error('woops'))).
  // Prints "caught woops"
  then(null, error => { console.log('caught', error.message); });
```

Seems easy, right? How about the below code, what will it print?

```javascript
new Promise((_, reject) => reject(new Error('woops'))).
  catch(error => { console.log('caught', err.message); });
```

It'll print out an unhandled rejection warning. Notice that `err` is not defined!

```
$ node test.js
(node:9825) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 2): ReferenceError: err is not defined
(node:9825) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
```

This is why unhandled rejections can be so insidious. You might think you caught an error, but your error handler might have caused another error. You get a similar problem if you return a promise in your `.catch()` function. For example, let's say you use an [misconfigured sentry client](https://docs.sentry.io/clients/node/) for logging errors and return a promise representing tracking the error to sentry.

```javascript
const sentry = require('raven');

new Promise((_, reject) => reject(new Error('woops'))).
  catch(error => new Promise((resolve, reject) => {
    sentry.captureMessage(error.message, function(error) {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  }));

/* Output
$ node test.js
(node:10019) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 3): TypeError: Cannot read property 'user' of undefined
(node:10019) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
*/
```

There are a lot of nasty gotchas with unhandled rejections. That's why Node.js gives you a mechanism for globally handling unhandled rejections.

The `unhandledRejection` Event
------------------------------

The node `process` global has [an `unhandledRejection` event](https://nodejs.org/api/process.html#process_event_unhandledrejection) for unhandled promise rejection. [Bluebird also emits this event](http://bluebirdjs.com/docs/api/error-management-configuration.html), so if you do `global.Promise = require('bluebird')` the below code will still work. Your event handler will receive the promise rejection error as its first parameter:

```javascript
process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.log('unhandledRejection', error.message);
});

new Promise((_, reject) => reject(new Error('woops'))).
  catch(error => {
    // Will not execute
    console.log('caught', err.message);
  });
```

Note that, while the `error` parameter to the 'unhandledRejection' event should be a JavaScript error, it doesn't necessarily have to be. Calling `reject()` with a non-error is [considered bad practice](http://eslint.org/docs/rules/prefer-promise-reject-errors), but if you do, 'unhandledRejection' will get the argument you passed to `reject()`.

```javascript
process.on('unhandledRejection', error => {
  // Prints "unhandledRejection woops!"
  console.log('unhandledRejection', error.test);
});

new Promise((_, reject) => reject({ test: 'woops!' }));
```

Note that if you attach a listener to 'unhandledRejection', the default warning to the console (the `UnhandledPromiseRejectionWarning` from previous examples) will **not** print to the console. That message **only** gets printed if you don't have a handler for 'unhandledRejection'.

If you want to suppress the unhandled promise rejection warning, all you need to do is call `.catch()` on the promise with an empty function.

```javascript
process.on('unhandledRejection', error => {
  // Won't execute
  console.log('unhandledRejection', error.test);
});

new Promise((_, reject) => reject({ test: 'woops!' })).catch(() => {});
```

This is how you suppress unhandled rejection handling when you're absolutely sure you don't want to handle the error. Why would you want to suppress unhandled rejection handling? Let's say you used [sinon](https://www.npmjs.com/package/sinon) to stub out a function that returns a promise in a [mocha](https://www.npmjs.com/package/mocha) `before()` test hook. The below test succeeds:

```javascript
const sinon = require('sinon');

const obj = {
  fn: () => {}
};

before(function() {
  sinon.stub(obj, 'fn').returns(Promise.resolve());
});

it('works', function() {
  return obj.fn();
});
```

However, what if you want to stub out `obj.fn()` to return a promise that rejects? The below script will log an unhandled rejection warning:

```javascript
const assert = require('assert');
const sinon = require('sinon');

const obj = {
  fn: () => {}
};

before(function() {
  sinon.stub(obj, 'fn').returns(Promise.reject(new Error('test')));
});

it('works', function() {
  return obj.fn().catch(error => {
    assert.equal(error.message, 'test');
  });
});
```

This is where 'unhandledRejection' starts breaking down the abstraction barriers of promises. Now, `.catch()` is no longer a pure function and has global side effects. For example, one way to avoid the unhandled rejection warning above is to call `.catch()` on the promise but not use the promise that `.catch()` returns:

```javascript
before(function() {
  const p = Promise.reject(new Error('test'));
  p.catch(() => {});
  // No more warning! `.catch()` mutates `p`'s internal state.
  sinon.stub(obj, 'fn').returns(p);
});
```

Implications for Async/Await
----------------------------

[Async/await](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html) has a major advantage over building promise chains manually: `await` handles `.catch()` for you. For example:

```javascript
async function test() {
  // No unhandled rejection!
  await Promise.reject(new Error('test'));
}

test().catch(() => {});
```

However, notice the `.catch()` call chained onto `test()`. Remember that an `async` function returns a promise! No `.catch()` there will give you an unhandled rejection.

```javascript
async function test() {
  // No unhandled rejection!
  await Promise.reject(new Error('test'));
}

test();

/* Output:
$ node test.js
(node:13912) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 2): Error: test
(node:13912) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code. */
```

Async/await lets you construct promises that represent complex operations involving loops, conditionals, etc., but in the end you still get a promise back. Remember to handle your errors!

In case you were wondering, you **cannot** make `async` functions return a non-native promise. So there's no way to make a promise library that bypasses node's unhandled rejection handler and integrates with async/await.

```javascript
global.Promise = require('bluebird');

async function test() {
  // No unhandled rejection!
  await Promise.reject(new Error('test'));
}

// Prints "false"
console.log(test().catch(() => {}) instanceof require('bluebird'));
```

_Confused by promise chains? [Async/await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) is the best way to compose promises in Node.js.
Await handles promise rejections for you, so unhandled promise rejections go away. My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of
async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>_

_Looking to become fluent in async/await? My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of
async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
