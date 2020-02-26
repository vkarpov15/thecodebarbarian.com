[ES2018](https://medium.com/front-end-hacking/javascript-whats-new-in-ecmascript-2018-es2018-17ede97f36d5) introduces several new JavaScript language features that are great for Node.js developers. [`Promise.prototype.finally()` is the most important new feature](/using-promise-finally-in-node-js.html), but I think [async iterators](https://jakearchibald.com/2017/async-iterators-and-generators/) are a close second. In this article, I'll describe what you need to start using async iterators in Node.js. I'll also provide an example of how to use async iterators with [Mongoose cursors](/cursors-in-mongoose-45.html).

Your First Async Iterator
-------------------------

Async iterators are natively supported in Node.js 10.x. If you're
using Node.js 8.x or 9.x, you need to use Node.js' [`--harmony_async_iteration` flag](https://github.com/tc39/proposal-async-iteration/issues/117#issuecomment-346695187). Async iterators are not supported in Node.js
6.x or 7.x, so if you're on an older version you need to [upgrade Node.js](/managing-node.js-versions-without-external-tools.html) to use async iterators.

```
$ node --version
v9.9.0
$ node test.js
/home/node/test.js:7
  for await (const x of gen()) {
      ^^^^^

SyntaxError: Unexpected reserved word
    at new Script (vm.js:51:7)
    at createScript (vm.js:136:10)
    at Object.runInThisContext (vm.js:197:10)
    at Module._compile (module.js:613:28)
    at Object.Module._extensions..js (module.js:660:10)
    at Module.load (module.js:561:32)
    at tryModuleLoad (module.js:501:12)
    at Function.Module._load (module.js:493:3)
    at Function.Module.runMain (module.js:690:10)
    at startup (bootstrap_node.js:194:16)
$
$ node --harmony_async_iteration test.js
works!
$
```

Now that flags and versions are out of the way, let's review what
an [iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators) is in JavaScript. An iterator is an
object that exposes a `next()` function which returns an object
`{ value, done }`. The `value` property is the next value in the
sequence, and the `done` property is a boolean that is true if there
are no more values in the sequence. For example, below is an iterator
that loops over the values in an array.

```javascript
const nums = [1, 2, 3];

let index = 0;
const iterator = {
  next: () => {
    if (index >= nums.length) {
      return { done: true };
    }
    const value = nums[index++];
    return { value, done: false };
  }
};
```

By itself, an iterator isn't very useful. In order to use an
iterator with a `for/of` loop, you need an [iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators#Iterables). An iterable is an object
with a `Symbol.iterator` function that returns an iterator. Below
is a simple iterable that just returns the above iterator.

```javascript
const iterable = {
  [Symbol.iterator]: () => iterator
};
for (const v of iterable) {
  console.log(v); // Prints "1", "2", "3"
}
```

ES2018 introduces 2 related concepts: async iterators and async
iterables. The difference between an [async iterator](https://github.com/tc39/proposal-async-iteration)
and a conventional iterator is that, instead of returning a plain object `{ value, done }`, an async iterator returns a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that fulfills to `{ value, done }`.
Similarly, an async iterable is an object with `Symbol.asyncIterator` function that returns an async iterator. Below is an example of
creating an async iterator and an async iterable.

```javascript
const nums = [1, 2, 3];

let index = 0;
const asyncIterator = {
  next: () => {
    if (index >= nums.length) {
      // A conventional iterator would return a `{ done: true }`
      // object. An async iterator returns a promise that resolves
      // to `{ done: true }`
      return Promise.resolve({ done: true });
    }
    const value = nums[index++];
    return Promise.resolve({ value, done: false });
  }
};

const asyncIterable = {
  // Note that async iterables use `Symbol.asyncIterator`, **not**
  // `Symbol.iterator`.
  [Symbol.asyncIterator]: () => asyncIterator
};
```

Asynchronous Iteration
----------------------

You can use a `for/of` loop to loop through an iterable. However,
`for/of` won't work with async iterables because `value` and `done`
aren't computed synchronously. If you're a regular reader of this blog,
you might have seen [some async/await design patterns for this](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js.html#processing-a-mongodb-cursor). With async/await,
iterating through an async iterator is doable:

```javascript
const asyncIterable = {
  [Symbol.asyncIterator]: () => asyncIterator
};

main().catch(error => console.error(error.stack));

async function main() {
  // To be concise, just get the `next()` function
  const { next } = asyncIterable[Symbol.asyncIterator]();

  // Use a `for` loop with `await` to exhaust the iterable. Once
  // `next()` resolves to a promise with `done: true`, exit the
  // loop.
  for (let { value, done } = await next(); !done; { value, done } = await next()) {
    console.log(value); // Prints "1", "2", "3"
  }
}
```

The above approach works in Node.js 8.x and 9.x without a flag,
but also isn't as clean as it could be. The main crux of the
async iterator spec is the `for/await/of` loop, which lets you
loop over an async iterator using [async/await](https://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html). Like regular `await`, you can only [use `for/await/of` in an async function](/80-20-guide-to-async-await-in-node.js.html#hello-world).
Below is an example of using `for/await/of` to loop through
`asyncIterable`.

```javascript
const asyncIterable = {
  [Symbol.asyncIterator]: () => asyncIterator
};

main().catch(error => console.error(error.stack));

async function main() {
  for await (const value of asyncIterable) {
    console.log(value);
  }
}
```

The `for await` syntax is much more concise than a conventional
async/await `for` loop. Because it behaves like a `for/of` loop,
`for/await/of` is easier to understand because it automatically
checks for the end of the iterator on its own.

What happens if your async iterator returns a rejected promise?
Much like how [`await` on a rejected promise throws an error that you can `try/catch`](https://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html#return-values-and-exceptions), `for/await/of` throws a catchable error if the async iterator returns a promise that rejects.

```javascript
const asyncIterator = {
  next: () => Promise.reject(new Error('Oops!'))
};

const asyncIterable = {
  [Symbol.asyncIterator]: () => asyncIterator
};

main().catch(error => console.error(error.stack));

async function main() {
  try {
    for await (const value of asyncIterable) {}
  } catch (error) {
    // Prints "Caught: Oops!"
    console.log('Caught:', error.message);
  }
}
```

Now that you've seen async iterators in action on a toy example,
let's take a look at async iterators in a more real world example:
[Mongoose cursors](http://mongoosejs.com/docs/api.html#query_Query-cursor).

Using `for/await/of` with Mongoose Cursors
------------------------------------------

A [Mongoose query cursor](http://thecodebarbarian.com/cursors-in-mongoose-45) is an object with a `next()` function that retrieves the next document in a query result. Cursors are useful for iterating through huge data sets because they load data from MongoDB in batches, so you never have all the data in your server's memory at once. Below is an example of iterating through a Mongoose cursor using a conventional async/await `for` loop.


```javascript
const mongoose = require('mongoose');

main().catch(error => console.error(error.stack));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/test');

  const Movie = mongoose.model('Movie', new mongoose.Schema({
    name: String
  }));

  await Movie.deleteMany({});
  await Movie.insertMany([
    { name: 'Enter the Dragon' },
    { name: 'Ip Man' },
    { name: 'Kickboxer' }
  ]);

  const cursor = Movie.find().cursor();
  // Use `next()` and `await` to exhaust the cursor
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    // Prints "Enter the Dragon', "Ip Man", "Kickboxer"
    console.log(doc.name);
  }
}
```

While Mongoose cursors have a `next()` function, they are **not** currently async iterators or async iterables. Unlike an async
iterator, a Mongoose cursor returns `null` to signify the end of
the cursor, not `{ done: true }`. In order to use
`for/await/of` with Mongoose cursors, you need to do a little work
to transform a Mongoose cursor into an iterator and wrap it in an
async iterable.

```javascript
const cursor = Movie.find().cursor();

// Wrap the cursor in an async iterable using `then()` to
// transform the result of `cursor.next()` into properly
// formatted async iterator output
const asyncIterable = {
  [Symbol.asyncIterator]: () => ({
    next: () => cursor.next().then(value => ({
      value,
      done: value == null
    }))
  })
};

// Use for/await/of to loop through the async iterable
for await (const doc of asyncIterable) {
  // Prints "Enter the Dragon', "Ip Man", "Kickboxer"
  console.log(doc.name);
}
```

Having to wrap a cursor to work with `for/await/of` is clunky,
which is why [Mongoose has an issue open to support async iteration with query cursors](https://github.com/Automattic/mongoose/issues/6737). Follow
[this GitHub issue](https://github.com/Automattic/mongoose/issues/6737) or [Mongoose on Twitter](https://twitter.com/mongoosejs) for updates.

Moving On
---------

Async iterators and `for/await/of` loops are one of the most exciting new features in ES2018. Async iteration lets you use `for/of` with async/await to make async loops syntactically pristine.
Make sure you upgrade to Node.js 10.x to start using `for/await/of`,
and look out for Mongoose and the MongoDB driver to support async iteration in the near future.

_Looking to become fluent in async/await? My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of
async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
