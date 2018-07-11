[Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) are the preferred async primitive in JavaScript. [Callbacks](http://thecodebarbarian.com/2015/03/20/callback-hell-is-a-myth) are becoming increasingly uncommon, especially now that [async/await is available in Node.js](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js.html). Async/await is based on promises, so you need to understand promises to master async/await. In this article, I'll walk you through writing your own promise library
and demonstrate using it with async/await.

What's In a Promise? ([GitHub Gist](https://gist.github.com/vkarpov15/6b8e2d44e4038314b1ed0384cffaca2c))
--------------------

In the ES6 spec, a [promise is a class](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-executor) whose
constructor takes an `executor` function. Instances of the Promise class have a
[`then()` function](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.prototype.then). Promises have several other properties according to the spec, but for the purposes of this tutorial you can ignore them. Below is the scaffold of a simple `MyPromise` class.

```javascript
class MyPromise {
  // `executor` takes 2 parameters, `resolve()` and `reject()`. The executor
  // function is responsible for calling `resolve()` or `reject()` to say that
  // the async operation succeeded (resolved) or failed (rejected).
  constructor(executor) {}

  // `onFulfilled` is called if the promise is fulfilled, and `onRejected`
  // if the promise is rejected. For now, you can think of 'fulfilled' and
  // 'resolved' as the same thing.
  then(onFulfilled, onRejected) {}
}
```

The `executor` function takes 2 parameters, `resolve()` and `reject()`. A promise
is a state machine with 3 states:

* pending: the initial state, meaning that the promise has not yet settled
* fulfilled: the underlying operation succeeded and has an associated value
* rejected: the underlying operation failed and the promise has an associated error

With this in mind, implementing the first iteration of the `MyPromise` constructor is simple.

```javascript
constructor(executor) {
  if (typeof executor !== 'function') {
    throw new Error('Executor must be a function');
  }

  // Internal state. `$state` is the state of the promise, and `$chained` is
  // an array of the functions we need to call once this promise is settled.
  this.$state = 'PENDING';
  this.$chained = [];

  // Implement `resolve()` and `reject()` for the executor function to use
  const resolve = res => {
    // A promise is considered "settled" when it is no longer
    // pending, that is, when either `resolve()` or `reject()`
    // was called once. Calling `resolve()` or `reject()` twice
    // or calling `reject()` after `resolve()` was already called
    // are no-ops.
    if (this.$state !== 'PENDING') {
      return;
    }
    // There's a subtle difference between 'fulfilled' and 'resolved'
    // that you'll learn about later.
    this.$state = 'FULFILLED';
    this.$internalValue = res;
    // If somebody called `.then()` while this promise was pending, need
    // to call their `onFulfilled()` function
    for (const { onFulfilled } of this.$chained) {
      onFulfilled(res);
    }
  };
  const reject = err => {
    if (this.$state !== 'PENDING') {
      return;
    }
    this.$state = 'REJECTED';
    this.$internalValue = err;
    for (const { onRejected } of this.$chained) {
      onRejected(err);
    }
  };

  // Call the executor function with `resolve()` and `reject()` as in the spec.
  try {
    // If the executor function throws a sync exception, we consider that
    // a rejection. Keep in mind that, since `resolve()` or `reject()` can
    // only be called once, a function that synchronously calls `resolve()`
    // and then throws will lead to a fulfilled promise and a swallowed error
    executor(resolve, reject);
  } catch (err) {
    reject(err);
  }
}
```

The `then()` function is even easier. Remember the `then()` function takes two parameters, `onFulfilled()` and `onRejected()`. The `then()` function is responsible for making sure `onFulfilled()` gets called if the promise is fulfilled, and `onRejected()` if the promise is rejected. If the promise is already resolved or rejected, `then()` should call `onFulfilled()` or `onRejected()` immediately\*.
If the promise is still pending, `then()` should push the functions onto the `$chained` array so the `resolve()` and `reject()` functions can call them.

```javascript
then(onFulfilled, onRejected) {
  if (this.$state === 'FULFILLED') {
    onFulfilled(this.$internalValue);
  } else if (this.$state === 'REJECTED') {
    onRejected(this.$internalValue);
  } else {
    this.$chained.push({ onFulfilled, onRejected });
  }
}
```

<small><i>\* Aside: the ES6 spec says that calling `.then()` on a promise that is already resolved or rejected means [`onFulfilled()` or `onRejected()` should be called on the next tick](http://www.ecma-international.org/ecma-262/6.0/#sec-performpromisethen). Since this article's code is meant to be a didactic example rather than an exact implementation of the spec, this implementation will ignore this detail.</i></small>

Promise Chaining ([GitHub Gist](https://gist.github.com/vkarpov15/3efc81fa998ff5be42f4559d2f213f1e))
----------------

The above example specifically ignores the most complex and most useful part of promises: [chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#Chaining). The idea of chaining is that if the `onFulfilled()` or `onRejected()` function returns a promise, `then()` should return a new promise that is ["locked in"](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects) to match the state of the returned promise. For example:

```javascript
p = new MyPromise(resolve => {
  setTimeout(() => resolve('World'), 100);
});

p.
  then(res => new MyPromise(resolve => resolve(`Hello, ${res}`))).
  // Will print out 'Hello, World' after approximately 100ms
  then(res => console.log(res));
```

Below is the new `.then()` function that returns a promise so you can chain.

```javascript
then(onFulfilled, onRejected) {
  return new MyPromise((resolve, reject) => {
    // Ensure that errors in `onFulfilled()` and `onRejected()` reject the
    // returned promise, otherwise they'll crash the process. Also, ensure
    // that the promise
    const _onFulfilled = res => {
      try {
        // If `onFulfilled()` returns a promise, trust `resolve()` to handle
        // it correctly.
        resolve(onFulfilled(res));
      } catch (err) {
        reject(err);
      }
    };
    const _onRejected = err => {
      try {
        reject(onRejected(err));
      } catch (_err) {
        reject(_err);
      }
    };
    if (this.$state === 'FULFILLED') {
      _onFulfilled(this.$internalValue);
    } else if (this.$state === 'REJECTED') {
      _onRejected(this.$internalValue);
    } else {
      this.$chained.push({ onFulfilled: _onFulfilled, onRejected: _onRejected });
    }
  });
}
```

Now `then()` returns a promise. However, there's still some work to be done: if `onFulfilled()` returns a promise, `resolve()` needs to be able to handle it. In order to support this, the `resolve()` function will need to use `then()` in a two-step recursive dance. Below is the expanded `resolve()` function.

```javascript
const resolve = res => {
  // A promise is considered "settled" when it is no longer
  // pending, that is, when either `resolve()` or `reject()`
  // was called once. Calling `resolve()` or `reject()` twice
  // or calling `reject()` after `resolve()` was already called
  // are no-ops.
  if (this.$state !== 'PENDING') {
    return;
  }

  // If `res` is a "thenable", lock in this promise to match the
  // resolved or rejected state of the thenable.
  const then = res != null ? res.then : null;
  if (typeof then === 'function') {
    // In this case, the promise is "resolved", but still in the 'PENDING'
    // state. This is what the ES6 spec means when it says "A resolved promise
    // may be pending, fulfilled or rejected" in
    // http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects
    return then(resolve, reject);
  }

  this.$state = 'FULFILLED';
  this.$internalValue = res;
  // If somebody called `.then()` while this promise was pending, need
  // to call their `onFulfilled()` function
  for (const { onFulfilled } of this.$chained) {
    onFulfilled(res);
  }

  return res;
};
```

<small><i>In the interest of simplicity, the above example omits the key detail that once a promise is "locked in" to match another promise, calling `resolve()` or `reject()` is a no-op. In the above example, you can `resolve()` to a pending promise and then throw an error, and then the `res.then(resolve, reject)` would be a no-op above. This is just an example, not a fully fledged implementation of the ES6 promise spec.</i></small>

The above code illustrates the difference between a "resolved" promise and a "fulfilled" promise. This distinction is subtle and has to do with promise chaining. "Resolved" is not an actual promise state, but it is a [term defined in the ES6 spec](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects). When you call `resolve()` a promise is considered resolved, and one of two things can happen:

* If you call `resolve(v)` where `v` is not a promise, then the promise immediately becomes fulfilled. In this simple case, "resolved" and "fulfilled" are the same thing.
* If you call `resolve(v)` where `v` is another promise, then the promise remains pending until `v` resolves or rejects. In this case, the promise is "resolved" but still pending.

With Async/Await
----------------

Remember that the `await` keyword pauses execution of an `async` function until the awaited promise settles. Now that you have a rudimentary home-made promise library, let's see what happens when you use it with async/await. Add a `console.log()` statement to the `then()` function:

```javascript
then(onFulfilled, onRejected) {
  console.log('Then', onFulfilled, onRejected, new Error().stack);
  return new MyPromise((resolve, reject) => {
    /* ... */
  });
}
```

Now, let's `await` on an instance of `MyPromise` and see what happens.

```javascript
run().catch(error => console.error(error.stack));

async function run() {
  const start = Date.now();
  await new MyPromise(resolve => setTimeout(() => resolve(), 100));
  console.log('Elapsed time', Date.now() - start);
}
```

Note the `.catch()` call above. The [`catch()` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch) is a core part of the ES6 promise spec. This article won't cover it in much detail because `.catch(f)` is equivalent to `.then(null, f)`, so there isn't much to it.

Below is the output. Notice that await calls `.then()` implicitly with `onFulfilled()` and `onRejected()` functions that dive into the C++ internals of V8. Also, `await` always waits until the next tick before calling `.then()`.

```
Then function () { [native code] } function () { [native code] } Error
    at MyPromise.then (/home/val/test/promise.js:63:50)
    at process._tickCallback (internal/process/next_tick.js:188:7)
    at Function.Module.runMain (module.js:686:11)
    at startup (bootstrap_node.js:187:16)
    at bootstrap_node.js:608:3
Elapsed time 102
```

Moving On
---------

[Async/await](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js.html) is powerful, but hard to master unless you understand the fundamentals of promises. Promises have a lot of nuances, like the fact that synchronous errors in the executor function are caught and the fact that a promise can't change state once it is settled, that make async/await possible. Once you have a solid understanding of promises, async/await becomes much easier.

_Looking for a more detailed guide that walks you through building a [standards compliant](https://promisesaplus.com/) promise library from scratch? My new ebook, Mastering Async/Await, shows you how to build a Promises/A+ compliant promise implementation and demonstrates how it works with async/await. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net"><img src="/images/asyncawait.png"/></a>
