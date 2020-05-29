Error handling in async/await causes a lot of confusion. There are
numerous patterns for [handling errors in async functions](http://thecodebarbarian.com/async-functions-in-javascript.html#error-handling), and even experienced developers sometimes 
get it wrong.

Suppose you have an async function `run()`. In this article,
I'll describe 3 different patterns
for handling errors in `run()`: `try/catch`, [Golang-style](https://blog.golang.org/error-handling-and-go),
and `catch()` on the function call. I'll also explain why you 
rarely need anything but `catch()` with async functions.

`try/catch`
-----------

When you're first getting started with async/await, it is tempting
to use `try/catch` around every async operation. That's because
if you `await` on a promise that rejects, JavaScript throws a
catchable error.

```javascript
run();

async function run() {
  try {
    await Promise.reject(new Error('Oops!'));
  } catch (error) {
    error.message; // "Oops!"
  }
}
```

`try/catch` also handles synchronous errors.

```javascript
run();

async function run() {
  const v = null;
  try {
    await Promise.resolve('foo');
    v.thisWillThrow;
  } catch (error) {
    // "TypeError: Cannot read property 'thisWillThrow' of null"
    error.message;
  }
}
```

So all you need to do is wrap all your logic in a `try/catch`, 
right? Not quite. The below code will result in an
[unhandled promise rejection](http://thecodebarbarian.com/unhandled-promise-rejections-in-node.js.html). The `await` keyword converts promise rejections to
catchable errors, but `return` does not.

```javascript
run();

async function run() {
  try {
    // Note that this is a `return`, not `await`
    return Promise.reject(new Error('Oops!'));
  } catch (error) {
    // Will **not** run
  }
}
```

You could work around this limitation using `return await`.
However, it is easy to forget `return await`.

Another disadvantage is that `try/catch` is hard to compose.
Once you realize that `try/catch` handles sync and async errors,
it is tempting to wrap all your async logic in one `try/catch`,
as shown below.



Golang in JS
------------

Another common pattern is using `.then()` to convert a promise
that rejects into a promise that fulfills with an error. You can
then use an `if (err)` check like in Golang.

```javascript
run();

async function throwAnError() {
  throw new Error('Oops!');
}

async function noError() {
  return 42;
}

async function run() {
  // The `.then(() => null, err => err)` pattern gives you an
  // error if one occurred, or `null` otherwise
  let err = await throwAnError().then(() => null, err => err);
  if (err != null) {
    err.message; // 'Oops'
  }

  err = await noError().then(() => null, err => err);
  err; // null
}
```

If you need both the error and the value, you can really pretend
to write Golang in JavaScript.

```javascript
run();

async function throwAnError() {
  throw new Error('Oops!');
}

async function noError() {
  return 42;
}

async function run() {
  // The `.then(v => [null, v], err => [err, null])` pattern
  // lets you use array destructuring to get both the error and
  // the result
  let [err, res] = await throwAnError().
    then(v => [null, v], err => [err, null]);
  if (err != null) {
    err.message; // 'Oops'
  }

  [err, res] = await noError().
    then(v => [null, v], err => [err, null]);
  err; // null
  res; // 42
}
```

This pattern can be neater syntactically because declaring a 
variable in a `try` block with `let` scopes the variable to the
`try` block.

```javascript
const getAnswer = async () => 42;

run();

async function run() {
  try {
    let val = await getAnswer();
  } catch (error) {}

  // ReferenceError: val is not defined
  val;
}
```

Golang-style error handling doesn't get rid of the `return` quirk.
It just makes missing error checks harder, because you know that
if you don't have `if (err != null)` after an async operation,
something is wrong.

There are two major disadvantages to Golang-style error handling:

1. It is extremely repetitive. Typing `if (err != null)` every time you want to do something async puts you on the express lane to carpal tunnel.
2. It doesn't help you with synchronous errors in `run()`.

So Golang-style error handling is a neat syntactic shortcut that
should be used sparingly. It doesn't have much benefit over
using `try/catch`.

Using `catch()` on the Function Call
------------------------------------

Both `try/catch` and Golang-style error handling have their uses,
but the best way to ensure you've handled all errors in your
`run()` function is to use `run().catch()`. In other words, 
handle errors when calling the function as opposed to handling
each individual error.

```javascript
run().
  catch(function handleError(err) {
    err.message; // Oops!
  }).
  // Handle any errors in `handleError()`. If the error handler
  // throws an error, kill the process.
  catch(err => { process.nextTick(() => { throw err; }) });

async function run() {
  await Promise.reject(new Error('Oops!'));
}
```

Remember that [async functions always return promises](http://thecodebarbarian.com/async-functions-in-javascript.html#an-async-function-always-returns-a-promise). This promise
rejects if any uncaught error occurs in the function.
If your async function body returns a promise that rejects,
the returned promise will reject too.

```javascript
run().
  catch(function handleError(err) {
    err.message; // Oops!
  }).
  // Handle any errors in `handleError()`. If the error handler
  // throws an error, kill the process.
  catch(err => { process.nextTick(() => { throw err; }) });

async function run() {
  // Note that this is `return`, not `await`
  return Promise.reject(new Error('Oops!'));
}
```

Why `run().catch()` as opposed to wrapping the entire `run()`
function body in a `try/catch`? For handling errors in the error
handler. What happens if the `catch` block in your `try/catch`
throws an error? The only solution is to nest a  `try/catch` in 
your `catch` block, in every single function. `.catch()` makes
handling unexpected errors in your error handler cleaner.

Takeaways
---------

In general, errors are either expected or unexpected. In async
functions, `try/catch` can help you recover gracefully from
expected errors. But unexpected errors do happen, we all
occasionally end up with a surprise "TypeError: Cannot read 
property 'foo' of null" sometimes.

You should handle unexpected errors in your async functions in 
the calling function. The `run()` function shouldn't be
responsible for handling every possible error, you should
instead do `run().catch(handleError)`.

_Looking to become fluent in async/await? My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of
async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
