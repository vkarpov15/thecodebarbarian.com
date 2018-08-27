[Async/await](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js.html) is the big new feature in the 2017 edition of the JavaScript language spec. However, async/await has a lot in common with [generators](http://thecodebarbarian.com/3-common-co-design-patterns), a new feature from the 2015 JavaScript language spec. There's [plenty of questions on StackOverflow about what makes async/await different](https://stackoverflow.com/questions/36196608/difference-between-async-await-and-es6-yield-with-generators), and with good reason. If you use [co](https://www.npmjs.com/package/co), your generator-based code looks a lot like async/await.

Below is some async/await that makes an HTTP request that fails, and then
tries again 3 times.

```javascript
async function test() {
  let i;
  for (i = 0; i < 3; ++i) {
    try {
      await superagent.get('http://google.com/this-throws-an-error');
      break;
    } catch(err) {}
  }
  console.log(i); // 3
}
```

Below is the equivalent code using co and [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function%2A).

```javascript
const test = co.wrap(function*() {
  let i;
  for (i = 0; i < 3; ++i) {
    try {
      yield superagent.get('http://bad.domain');
      break;
    } catch(err) {}
  }
  console.log(i); // 3
});
```

You can write a [passable transpiler from async/await to generators](https://cmichel.io/how-is-async-await-transpiled-to-es5) by just
replacing `async function() {}` with `co.wrap(function*() {})` and `await` with `yield`. So what actually makes the two different?

What's the Difference?
----------------------

The most important difference between async/await and generators is that generators
are natively supported [all the way back to Node.js 4.x](https://node.green/#ES2015-functions-generators), whereas [async/await requires Node.js >= 7.6.0](https://node.green/#ES2017-features-async-functions). However, given that [Node.js 4.x has already reached end-of-life and Node.js 6.x will reach end-of-life in April 2019](https://github.com/nodejs/Release#release-schedule), this difference is rapidly becoming irrelevant.

Another major difference is that [co is a userland npm module](https://www.npmjs.com/package/co), whereas async/await is a core part
of the language. You need to include co in your `package.json` to use it and
you need to `require('co')`. You don't need to add anything to your `package.json`
or `require()` anything to use async/await in Node.js, although you may need
to configure a transpiler if you need to support older browsers.

The stack traces you get for errors are slightly different. [Stack traces with async/await are generally cleaner than stack traces with generators](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html#async-await-vs-co-yield). And, because async/await is a core part of the JavaScript
language rather than a userland library like co, there will likely be more
improvements to async/await stack traces in the future.

Below is an example of the stack trace you get when throwing an error in an async function.

```javascript
async function runAsync() {
  await new Promise(resolve => setTimeout(() => resolve(), 100));
  throw new Error('Oops!');
}

// Error: Oops!
//    at runAsync (/home/val/test.js:5:9)
//    at <anonymous>
runAsync().catch(error => console.error(error.stack));
```

Below is the equivalent using co. Note the weird `onFulfilled()` and
`Generator.next()` lines that are artifacts of [how co works under the hood](http://es2015generators.com/).

```javascript
const co = require('co');

const runCo = co.wrap(function*() {
  yield new Promise(resolve => setTimeout(() => resolve(), 100));
  throw new Error('Oops!');
});

// Error: Oops!
//    at /home/val/test.js:10:9
//    at Generator.next (<anonymous>)
//    at onFulfilled (/home/val/node_modules/co/index.js:65:19)
//    at <anonymous>
runCo().catch(error => console.error(error.stack));
```

Thunks and Promise Conversion
-----------------------------

Async/await only works with promises. Using `await` on a non-promise is a no-op.
For example:

```javascript
async function runAsync() {
  // `res` will be a function, because this function is
  // not a promise. The parenthesis are necessary for syntax
  const res = await (cb => cb(null, 'test'));
  console.log(res);
}

runAsync().catch(error => console.error(error.stack));
```

On the other hand, co [coerces the values you `yield` into promises](https://github.com/tj/co/blob/249bbdc72da24ae44076afd716349d2089b31c4c/index.js#L116-L124). When you `yield` a thunk, which is what you call a [function that takes a single parameter, a Node.js-style callback](https://www.npmjs.com/package/thunkify), co will coerce it into a
promise for you.

```javascript
const co = require('co');

const runCo = co.wrap(function*() {
  // `res` will be a string, because co converts the
  // value you `yield` into a promise. The `yield cb => {}`
  // pattern is called a _thunk_.
  const res = yield cb => cb(null, 'test');
  console.log(res);
});

runCo().catch(error => console.error(error.stack));
```

Similarly, co will transform arrays using `Promise.all()` for you.

```javascript
async function runAsync() {
  // With co, you can just do
  // `yield [Promise.resolve('v1'), Promise.resolve('v2')]`
  const res = await Promise.all([
    Promise.resolve('v1'),
    Promise.resolve('v2');
  ]);
  // 'v1 v2'
  console.log(res[0], res[1]);
}
```

The Benefits of Userland Libraries
----------------------------------

In many ways, generators are a superset of async/await. With generators, you
can bolt on some powerful new features to your own implementation of
async/await syntax. Co's built-in promise conversion is just the tip of the
iceberg of what you can do. For example, I once built a [co-like library that returned an observable](https://github.com/vkarpov15/co-rx/blob/master/test/examples.test.js). With [RxJS'](https://www.npmjs.com/package/rxjs) filtering operators, handling
errors would be extremely easy.

```javascript
const corx = require('./');
require('rxjs/add/operator/filter');

corx(function*() {
  yield Promise.resolve('Test 1');
  try {
    yield Promise.reject('Test 2');
  } catch (error) {}
  console.log('Reached the end');
}).
filter(v => !!v).
subscribe(
  op$ => {
    // This will print, even though the error was caught, because
    // this callback executes on every single async operation!
    op$.subscribe(() => {}, err => console.log('Error occurred', err));
  },
  error => console.log('This will not print'),
  () => console.log('Done')
);
```

The killer feature above is that, when you `subscribe()`, you get a callback
for every single async operation that happens within your generator function.
That means you can instrument each individual async operation with debugging,
profiling, and error handling without actually changing any of your logic!

This concept is very cool, but unfortunately it also isn't useful enough to
justify switching. The beauty of async/await is that it does what you need
the vast majority of the time, whereas what problems would this observable-based
library actually solve for you? In order to make debugging work, you would
need to have a way to pull meaningful information out of the observable `op$`,
which I never found a way to do in the general case. This is why I'm back to being
bullish on [middleware](https://www.npmjs.com/package/tao-js) as the right tool
for cross-cutting concerns.

Plus, observables aren't really a great choice for
an async/await paradigm because they can resolve to multiple values, potentially
even an infinite stream of values.

Moving On
---------

Async/await and generators are very similar at first glance, but there's numerous
meaningful differences between the two. Async/await doesn't require any userland
libraries and offers a more concise approach to concurrency. Generators requires
userland libraries, but these userland libraries can provide more flexibility
and powerful design patterns than async/await can. In other words, the trade-off
between async/await and generators is the classic trade-off between simplicity
and flexibility. As an advanced power user you can get meaningful value out
of developers in certain situations, but most of the time async/await is a better
choice.

_Looking to become fluent in async/await? My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of
async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
