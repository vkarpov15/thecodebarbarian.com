[Async functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) were introduced in the 2017 edition of the JavaScript language spec. Async functions differ from [normal JavaScript functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions) in 2 major ways:

- JavaScript ensures that an async function always returns a promise.
- You can **only** use the [`await` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) in the body of an async function.

Async functions allow you to write asynchronous code that looks synchronous. In this article, you'll learn the basics of what makes async functions special.

Using `await`
-------------

Given a promise `p`, the `await` operator pauses execution of your async function until `p` is settled. For example, the below code will print "Hello World" after 1 second.

```javascript
async function run() {
  // Pause execution for 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('Hello, World');
}

run();
```

A promise can be in one of 3 states: pending, fulfilled, or rejected. A promise is considered settled once it is either fulfilled or rejected. In the above example, the promise is in the pending state for 1 second, and then `resolve()` transitions the promise to the fulfilled state. Below is a diagram of the possible states a promise can be in.

<img src="https://i.imgur.com/hq1nYXo.png" class="inline-image">

The most powerful feature of `await` is that you can use it in conjunction with `for` loops and `if` statements. For example, the below code will print '1' and '2', wait 1 second, then print '3' and '4', and so on up to '9' and '10'.

```javascript
async function run() {
  for (let i = 1; i <= 10; ++i) {
    if (i % 2 === 0) {
      // Pause execution for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log(i);
  }
}

run();
```

Side note: [be careful about using array functional programming functions like `forEach()` with async functions](https://thecodebarbarian.com/basic-functional-programming-with-async-await.html).

An Async Function Always Returns a Promise
------------------------------------------

There are 2 ways to declare an async function:

- Normal async function: `async function fn() { /* ... */ }`
- Async arrow function: `async () => { /* ... */ }`

Both normal async functions and async arrow functions always return promises. The JavaScript runtime wraps return values in a promise for you, you do **not** need to explicitly return a promise. For example, the below async function returns a promise, even though the function body says `return 42`.

```javascript
async function getAnswer() {
  return 42;
}

const res = getAnswer();
res === 42; // false
res instanceof Promise; // true
```

The [Mozilla docs refer to '42' as the _resolved value_](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function#Description) of the async function. You can think of an async function as wrapping the value you `return` from the function body in a promise.

JavaScript also has a notion of an [async generator function](https://medium.com/@segersian/howto-async-generators-in-nodejs-c7f0851f9c02). Async generator functions do **not** return promises.

Error Handling
--------------

In addition to `for` loops and `if` statements, you can use `try/catch` 
to handle asynchronous errors. The `await` operator pauses execution 
until a promise is settled, and, if the promise is rejected, `await`
throws a catchable error.

```javascript
async function run() {
  try {
    await Promise.reject(new Error('Oops'));
  } catch (error) {
    error.message; // Oops
  }
}

run();
```

The `try/catch` block also handles synchronous errors:

```javascript
async function run() {
  try {
    throw new Error('sync');
    await Promise.reject(new Error('async'));
  } catch (error) {
    error.message; // sync
  }
}

run();
```

However, just because you can use `try/catch`, doesn't necessarily mean
you should. For example, what happens if you `return` a promise that
rejects?

```javascript
async function run() {
  try {
    return Promise.reject(new Error('Oops'));
  } catch (error) {
    console.log('This will **not** print');
  }
}

// Unhandled promise rejection!
run();
```

You can work around this issue using `return await`:

```javascript
async function run() {
  try {
    return await Promise.reject(new Error('Oops'));
  } catch (error) {
    console.log(error.message); // Oops
  }
}

run();
```

Another common pattern is to use [`Promise#catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch).

```javascript
function myAsyncFunction() {
  return Promise.reject(new Error('Oops'));
}

async function run() {
  // `err` will be `null` if the promise fulfilled, or an error if
  // the promise rejected
  const err = await myAsyncFunction().
    then(() => null).
    catch(err => err);
}

run();
```

Since async functions return a promise, you can also call `.catch()` on
the return value of an async function. This is the preferred pattern for
error handling because it handles _all_ errors in an async function,
including synchronous errors, async errors, and returning a rejected
promise.

```javascript
async function syncError() {
  throw new Error('sync');
}

async function asyncError() {
  await Promise.reject(new Error('async'));
}

async function returnRejected() {
  return Promise.reject(new Error('returnRejected'));
}

syncError().catch(err => console.log(err.message)); // 'sync'
asyncError().catch(err => console.log(err.message)); // 'async'
// 'returnRejected'
returnRejected().catch(err => console.log(err.message));
```

Moving On
---------

Async/await is the future of concurrency in JavaScript.
Callbacks are rapidly becoming a distant memory, and promise
chaining makes conditionals too complicated. Async/await gives
you the best of both worlds: event-loop-based concurrency with
`for` loops, `if` statements, and other patterns that you
would learn in CS-101 or your first week at a coding bootcamp.
Stop making your poor non-JavaScript developer colleagues try
to grok complicated promise chains and switch over to 
async/await.

_Looking to become fluent in async/await? My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of
async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>