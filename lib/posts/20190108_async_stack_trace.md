The V8 team announced that they were [making some major performance improvements to async/await](https://v8.dev/blog/fast-async), including adding a [`--async-stack-traces` option](https://v8.dev/blog/fast-async#improved-developer-experience) that will make debugging async functions easier. You can try out these new options with a [nightly Node.js build](https://nodejs.org/download/nightly/). For example, here's the command I ran to download the January 8, 2019 nightly build of Node.js 12:

```
wget https://nodejs.org/download/nightly/v12.0.0-nightly201901089987f1abb9/node-v12.0.0-nightly201901089987f1abb9-linux-x64.tar.gz
tar -zxvf ./v12.0.0-nightly201901089987f1abb9/node-v12.0.0-nightly201901089987f1abb9-linux-x64.tar.gz
```

Remember that Node.js is a statically linked binary. "Installing" a Node.js version on Linux or OSX [is a three-liner](http://thecodebarbarian.com/managing-node.js-versions-without-external-tools). You just download a tarball, untar it, and you're ready to go.

The `--async-stack-traces` Option
---------------------------------

Consider the below code. An async function `run()` calls another async function `bar()`, and `bar()` throws an error. What does the stack trace say?

```javascript
run().then(() => console.log('success'), error => console.error(error.stack));

async function run() {
  await new Promise(resolve => setTimeout(resolve, 10));
  await bar();
}

async function bar() {
  await Promise.resolve();
  // Stack trace will just include `bar()`, no reference to `foo()`
  throw new Error('Oops');
}
```

In Node.js 8.x, the stack trace isn't very helpful. Node just prints the line number in `bar()` where there was an exception. There's no way to tell from the stack trace that `run()` called `bar()`.

```
$ node -v
v8.9.4
$ node ./test.js
Error: Oops
    at bar (/workspace/test.js:11:9)
    at <anonymous>
$
```

In the Node.js 12.x nightly build, you can turn on the `--async-stack-traces` option to get a much cleaner stack trace. With this option, Node prints that `run()` called `bar()`. As a bonus, Node also won't print the unhelpful `at <anonymous>` line.

```
$ ./node-v12.0.0-nightly201901089987f1abb9-linux-x64/bin/node --async-stack-traces ./test.js
Error: Oops
    at bar (/workspace/test.js:11:9)
    at async run (/workspace/test.js:5:3)
$
```

Async stack traces handle nested async function calls too. For example, suppose `run()` calls `foo()`, which then calls `bar()`, which then calls `baz()`, and `baz()` throws. Async stack traces will print a stack trace with `run()`, `foo()`, `bar()`, and `baz()`.

```javascript
run().then(() => console.log('success'), error => console.error(error.stack));

async function run() {
  await new Promise(resolve => setTimeout(resolve, 10));
  await foo();
}

async function foo() {
  await new Promise(resolve => setTimeout(resolve, 10));
  await bar();
}

async function bar() {
  await Promise.resolve();
  await baz();
}

async function baz() {
  await Promise.resolve();
  throw new Error('Oops');
}
```

Here's the nicely formatted output:

```javascript
$ ./node-v12.0.0-nightly201901089987f1abb9-linux-x64/bin/node --async-stack-traces ./test.js
Error: Oops
    at baz (/workspace/test.js:20:9)
    at async bar (/workspace/test.js:15:3)
    at async foo (/workspace/test.js:10:3)
    at async run (/workspace/test.js:5:3)
$
```

This is great! With async stack traces, async/await's developer experience clearly surpasses [userland generator-based tools](http://thecodebarbarian.com/the-difference-between-async-await-and-generators). No more [weird `------` separators](https://github.com/tlrobinson/long-stack-traces#usage) in long stack traces.

Unfortunately, Node.js 12 isn't scheduled for release until April 2019, and Node.js 10.x does **not** support the `--async-stack-traces` option.

```javascript
$ ~/Workspace/libs/node-v10.9.0-linux-x64/bin/node --async-stack-traces
/home/val/Workspace/libs/node-v10.9.0-linux-x64/bin/node: bad option: --async-stack-traces
$
```

So what can we do in Node.js 8.x?

Storing Stack Traces in Node.js 8.x
-----------------------------------

There are numerous [long stack traces modules](https://www.npmjs.com/package/longjohn) on npm. Unfortunately their [promise support isn't very good](https://github.com/mattinsler/longjohn/issues/63), so they don't work with async/await. There's also the [`Function.caller` property](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/caller), but that is non-standard and doesn't work with strict mode.

However, you can store the stack trace at the beginning of the function call:

```javascript
const originalStack = Symbol.for('originalStack');

run().then(() => console.log('success'), error => {
  console.error(error.stack);
  // Prints the stack trace at the time the failed function was called,
  // so you can tell `bar()` was the function that called `baz()`
  console.error(error[originalStack]);
});

async function run() {
  await new Promise(resolve => setTimeout(resolve, 10));
  await foo();
}

const foo = wrap(async function foo() {
  await new Promise(resolve => setTimeout(resolve, 10));
  await bar();
});

const bar = wrap(async function bar() {
  await Promise.resolve();
  await baz();
});

const baz = wrap(async function baz() {
  await Promise.resolve();
  throw new Error('Oops');
});

function wrap(fn) {
  return function() {
    const originalErr = new Error(`${fn.name} Failed`);
    return fn.apply(this, arguments).catch(err => {
      if (err[originalStack] == null) {
        // Will contain 'Error: baz Failed' and a stack trace that
        // includes `bar()`
        err[originalStack] = originalErr.stack;
      }
      throw err;
    });
  };
}
```

Tools like [monogram](https://www.npmjs.com/package/monogram) store the `originalStack` on every function call for you, which makes it easier to find bugs. For example, the stack trace the MongoDB Node driver reports from a duplicate id doesn't contain the calling function:

```javascript
const { MongoClient } = require('mongodb');

run().then(() => console.log('success'), error => {
  console.error(error.stack);
});

async function run() {
  const client = await MongoClient.connect('mongodb://localhost:27017/test', { useNewUrlParser: true });
  await insert(client);
}

async function insert(client) {
  // always throws duplicate id error
  await client.db().collection('test').insertMany([{ _id: 1 }, { _id: 1 }]);
}
```

```
$ node test.js
BulkWriteError: E11000 duplicate key error collection: test.test index: _id_ dup key: { : 1 }
    at OrderedBulkOperation.handleWriteError (/workspace/node_modules/mongodb/lib/bulk/common.js:1048:11)
    at resultHandler (/workspace/node_modules/mongodb/lib/bulk/ordered.js:159:23)
    at /workspace/node_modules/mongodb/node_modules/mongodb-core/lib/connection/pool.js:532:18
    at _combinedTickCallback (internal/process/next_tick.js:131:7)
    at process._tickCallback (internal/process/next_tick.js:180:9)
```

With [monogram](https://thecodebarbarian.com/introducing-monogram-the-anti-odm-for-mongodb-nodejs), you get the original stack trace for the function that errored out in the `originalStack` property.

```javascript
const { connect } = require('monogram');

run().then(() => console.log('success'), error => {
  console.error(error.originalStack);
});

async function run() {
  const db = await connect('mongodb://localhost:27017/test', { useNewUrlParser: true });
  await insert(db);
}

async function insert(db) {
  // always throws duplicate id error
  await db.collection('test').insertMany([{ _id: 1 }, { _id: 1 }]);
}
```

```
$ node test.js
Error
    at Collection.(anonymous function) [as insertMany] (/workspace/node_modules/monogram/lib/collection.js:80:21)
    at insert (/workspace/test.js:14:31)
    at run (/workspace/test.js:9:9)
    at <anonymous>
    at process._tickCallback (internal/process/next_tick.js:188:7)
```

Unfortunately, since monogram doesn't use async functions yet, you don't quite get the benefit of the `--async-stack-traces` option yet. The below stack trace doesn't include the original calling function `run()` even with async stack traces.

```
$ ./node-v12.0.0-nightly201901089987f1abb9-linux-x64/bin/node --async-stack-traces test
Error
    at Collection.(anonymous function) [as insertMany] (/workspace/node_modules/monogram/lib/collection.js:80:21)
    at insert (/workspace/test.js:15:31)
    at processTicksAndRejections (internal/process/next_tick.js:81:5)
```

Moving On
---------

Incomprehensible stack traces are a major pain point with async programming. Async/await and async stack traces in Node.js 12 will make stack traces much better. But existing libraries will have to adopt async/await in order to get the full benefits of async stack traces.

_Excited to finally adopt async/await now that async stack traces are coming? Chapter 3 of [Mastering Async/Await](http://asyncawait.net/) dives into the internals of async/await and explains how the JavaScript interpreter handles `await`. Get the ebook today!_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
