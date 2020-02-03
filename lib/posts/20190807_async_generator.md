The [TC39 async iterators proposal](https://github.com/tc39/proposal-async-iteration) that brought [`for/await/of` to JavaScript](http://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js) also introduced the concept of an [async generator function](https://github.com/tc39/proposal-async-iteration#async-generator-functions). Now, JavaScript has 6 distinct types of functions:

- Normal functions `function() {}`
- Arrow functions `() => {}`
- [Async functions](http://thecodebarbarian.com/async-functions-in-javascript.html) `async function() {}`
- Async arrow functions `async () => {}`
- Generator functions `function*() {}`
- Async generator functions `async function*() {}`

Async generator functions are special because you can use both `await`
and `yield` in an async generator function. Async generator functions
differ from async functions and generator functions in that they don't
return a promise or an iterator, but rather an [async iterator](http://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js#your-first-async-iterator). You can think of an async iterator as an [iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators) whose `next()` function always returns a promise.

Your First Async Generator Function
-----------------------------------

Async generator functions behave similarly to generator functions: the
generator function returns an object that has a `next()` function, and
calling `next()` executes the generator function until the next `yield`.
The difference is that an
[async iterator's `next()` function returns a promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of#Iterating_over_async_iterables).

Below is a "Hello, World" example with async generator functions. Note
that the below script won't work on Node.js versions before 10.x.

```javascript
'use strict';

async function* run() {
  // Sleep for 100ms, see: https://masteringjs.io/tutorials/fundamentals/sleep
  await new Promise(resolve => setTimeout(resolve, 100));
  yield 'Hello';
  console.log('World');
}

// `run()` returns an async iterator.
const asyncIterator = run();

// The function doesn't start running until you call `next()`
asyncIterator.next().
  then(obj => console.log(obj.value)). // Prints "Hello"
  then(() => asyncIterator.next());  // Prints "World"
```

The cleanest way to loop through an entire async generator function
is using a `for/await/of` loop.

```javascript
'use strict';

async function* run() {
  await new Promise(resolve => setTimeout(resolve, 100));
  yield 'Hello';
  console.log('World');
}

const asyncIterator = run();

// Prints "Hello\nWorld"
(async () => {
  for await (const val of asyncIterator) {
    console.log(val); // Prints "Hello"
  }
})();
```

A Practical Use Case
--------------------

You might be thinking "why does JavaScript need async generator functions
when it already has async functions and generator functions?" One use
case is the classic progress bar problem that [Ryan Dahl originally wrote Node.js to solve](https://stackoverflow.com/questions/31529013/nodejs-file-upload-with-progress-bar-using-core-nodejs-and-the-original-node-s).

Suppose you want to loop through all documents in a [Mongoose cursor](https://thecodebarbarian.com/cursors-in-mongoose-45) and report progress via [websocket](https://masteringjs.io/tutorials/node/websockets) or to the command line.

```javascript
'use strict';

const mongoose = require('mongoose');

async function* run() {
  await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true });
  await mongoose.connection.dropDatabase();

  const Model = mongoose.model('Test', mongoose.Schema({ name: String }));
  for (let i = 0; i < 5; ++i) {
    await Model.create({ name: `doc ${i}` });
  }

  // Suppose you have a lot of documents and you want to report when you process
  // each one. You can `yield` after processing each individual doc.
  const total = 5;
  const cursor = Model.find().cursor();

  let processed = 0;
  for await (const doc of cursor) {
    // You can think of `yield` as reporting "I'm done with one unit of work"
    yield { processed: ++processed, total };
  }
}

(async () => {
  for await (const val of run()) {
    // Prints "1 / 5", "2 / 5", "3 / 5", etc.
    console.log(`${val.processed} / ${val.total}`);
  }
})();
```

Async generator functions make it easy for your async function to report
its progress in a [framework-free](https://www.getrevue.co/profile/masteringjs/issues/framework-free-javascript-why-it-matters-188138) way. No need to explicitly create a websocket
or log to the console - you can handle that separately if you assume
your business logic uses `yield` for progress reporting.

With Observables
----------------

Async iterators are great, but there's another concurrency primitive that
async generator functions align well with: [RxJS observables](https://www.npmjs.com/package/rxjs).

```javascript
'use strict';

const { Observable } = require('rxjs');
const mongoose = require('mongoose');

async function* run() {
  // Same as before
}

// Create an observable that emits each value the async generator yields
// to subscribers.
const observable = Observable.create(async (observer) => {
  for await (const val of run()) {
    observer.next(val);
  }
});

// Prints "1 / 5", "2 / 5", "3 / 5", etc.
observable.subscribe(val => console.log(`${val.processed} / ${val.total}`));
```

There are two key differences between using an RxJS observable versus
an async iterator. First, in the above example the code that logs to
the console in `subscribe()` is _reactive_ rather than _imperative_.
In other words, the `subscribe()` handler has no way of affecting the
code in the async function body, it merely reacts to events. When using
a `for/await/of` loop, you can, for instance, add a 1 second pause
before resuming the async generator function.

```javascript
(async () => {
  for await (const val of run()) {
    // Prints "1 / 5", "2 / 5", "3 / 5", etc.
    console.log(`${val.processed} / ${val.total}`);
    // This adds a 1 second delay to every `yield` statement.
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
})();
```

The second is that, since [RxJS observables are cold by default](https://medium.com/codingthesmartway-com-blog/getting-started-with-rxjs-part-3-hot-and-cold-observables-4713757c9a88), a new `subscribe()` call re-executes the function.

```javascript
// Prints "1 / 5", "2 / 5", "3 / 5", etc.
observable.subscribe(val => console.log(`${val.processed} / ${val.total}`));
// Kicks off a separate instance of `run()`
observable.subscribe(val => console.log(`${val.processed} / ${val.total}`));
```

Moving On
---------

Async generator functions may seem niche and confusing at first, but
they provide what may become JavaScript's native solution to the progress
bar problem. Using `yield` to report an async function's progress is
an enticing idea because it allows you to decouple your business logic
from your progress reporting framework. Give async generators a shot
next time you need to implement a progress bar.

_Looking to become fluent in async/await? My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of
async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>