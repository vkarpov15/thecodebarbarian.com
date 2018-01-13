[Mongoose 5.0.0-rc0](https://github.com/Automattic/mongoose/blob/master/History.md#500-rc0--2017-12-28) introduced several important changes to the way middleware works. The most pronounced difference is the ability to use [promises and async/await with mongoose middleware](http://thecodebarbarian.com/introducing-mongoose-5.html#promises-and-async-await-with-middleware). In addition, there are a couple more subtle changes that make the middleware API more consistent. In this article, I'll cover two changes. The first is that post hooks now always get flow control, even synchronous post hooks. The second is that query middleware is applied when the model is compiled for performance reasons.

Post Hooks get Flow Control
---------------------------

The mongoose 4.x docs mention that ["post middleware does not receive flow control"](http://mongoosejs.com/docs/4.x/docs/middleware.html#post). This
is a fancy way of saying that [`post('save', doc => {})` is equivalent to `on('save', doc => {})`](https://github.com/Automattic/mongoose/blob/4.x/lib/schema.js#L1184-L1188) in mongoose 4. This distinction only applies to document middleware: `save()`, `validate()`, and `remove()`, **not** `find()`.

In practice, this lead to the annoying gotcha that `post('save')` hooks that take one argument always run before `post('save')` hooks that take 2 arguments, regardless of the order they're declared. The below script will print "post save 2" **before** "post save 1" in mongoose 4.x, despite the fact that the synchronous post hook is attached after the asynchronous post hook.

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

run().catch(error => console.error(error.stack));

async function run() {
  await mongoose.connect('mongodb://localhost:27017/test');

  const schema = new Schema({ name: String });
  schema.post('save', function(doc, next) {
    console.log('post save 1');
    next();
  });

  schema.post('save', function(doc) {
    console.log('post save 2');
  });

  const Person = mongoose.model('Person', schema);

  const p = new Person({ name: 'Taco' });
  await p.save();
  console.log('save promise resolved!');
}
```

What makes this behavior especially confusing is that query middleware handles this case correctly, because it used a different middleware library in 4.x. The below script will print "post find 1" **before** "post find 2", even in mongoose 4.x.

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

run().catch(error => console.error(error.stack));

async function run() {
  await mongoose.connect('mongodb://localhost:27017/test');

  const schema = new Schema({ name: String });
  schema.post('findOne', function(doc, next) {
    console.log('post find 1');
    next();
  });

  schema.post('findOne', function(doc) {
    console.log('post find 2');
  });

  const Person = mongoose.model('Person', schema);

  await Person.findOne();
  console.log('find promise resolved!');
}
```

This is because in 2013 mongoose only supported synchronous post hooks, and was considering removing post hooks entirely in favor of just supporting `.on('save')`. Thankfully, that idea never came to fruition, and asynchronous post hooks became a core part of mongoose middleware.

In mongoose 5, we've scrapped the notion of `post('save')` being a shortcut for `on('save')` entirely, so post hooks will always run in the order they're attached to the schema. As an additional benefit, asynchronous post hooks now [work with `async/await`](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html) as well.

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

run().catch(error => console.error(error.stack));

async function run() {
  await mongoose.connect('mongodb://localhost:27017/test');

  const schema = new Schema({ name: String });
  schema.post('save', async function(doc) {
    await new Promise(resolve => setTimeout(() => resolve(), 100));
    console.log('post save 1');
  });

  schema.post('save', function(doc) {
    console.log('post save 2');
  });

  const Person = mongoose.model('Person', schema);

  const p = new Person({ name: 'Taco' });
  await p.save();
  console.log('save promise resolved!');
}
```

If you rely on the mongoose 4.x order for post hooks, you should replace your synchronous post hooks with `on('save')` in mongoose 5.x:

```javascript
const schema = new Schema({ name: String });
schema.post('save', async function(doc) {
  await new Promise(resolve => setTimeout(() => resolve(), 100));
  console.log('post save 1');
});

schema.on('save', function(doc) {
  console.log('on save');
});
```

Query Middleware is Applied When Model is Compiled
--------------------------------------------------

For performance reasons, mongoose applies middleware once when you call `mongoose.model()` or `collection.model()`. In other words, any hooks you add to your schema **after** calling `mongoose.model()` will not be called. In mongoose 4.x before 4.8.0, we lazily applied hooks to documents, so you the below code would work:

```javascript
const schema = new Schema({ name: String });

const M = mongoose.model('Test', schema);

schema.pre('save', function() {
  console.log('pre save');
});

// In mongoose 4 before 4.8.0, would print 'pre save'.
// In >= 4.8.0, would not print.
M.save();
```

This change made mongoose 4.8.0 orders of magnitude faster than its predecessors when creating documents with large document arrays. For mongoose 5.x, we made a similar change for query middleware. While the performance impact isn't as monumental because query middleware is not applied to child documents, we've still seen a 10-20% speed-up on creating queries in mongoose 5. Here's a rudimentary benchmark to demonstrate the performance improvement.

```javascript
'use strict';

const Benchmark = require('benchmark');
const mongoose4 = require('mongoose');
// Note this is not the actual mongoose 5 npm module, this is just
// a symlinked alias for the purposes of this benchmark
const mongoose5 = require('mongoose-5');

const suite = new Benchmark.Suite;

const M4 = mongoose4.model('Test', new mongoose4.Schema({ name: String }));
const M5 = mongoose5.model('Test', new mongoose5.Schema({ name: String }));

suite.
  add('mongoose4', function() {
    M4.find();
  }).
  add('mongoose5', function() {
    M5.find();
  }).
  on('cycle', function(event) {
    console.log(String(event.target));
  }).
  on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  }).
  run();
```

```
$ node queryperf.js
mongoose4 x 1,398,712 ops/sec +-0.95% (91 runs sampled)
mongoose5 x 1,648,981 ops/sec +-0.78% (90 runs sampled)
Fastest is mongoose5
$
```

Moving On
---------

Barring any major bugs, we plan on formally releasing mongoose 5.0.0 next week. These middleware changes are just 2 of 34 [improvements we've made for the 5.0.0 release](https://github.com/Automattic/mongoose/blob/master/History.md). You can find more details on the [backwards breaking changes in mongoose 5 on GitHub](https://github.com/Automattic/mongoose/blob/master/migrating_to_5.md). Download mongoose 5 with `npm install mongoose@5.0.0-rc2` and let us know what you think on [GitHub](https://github.com/Automattic/mongoose/issues)!
