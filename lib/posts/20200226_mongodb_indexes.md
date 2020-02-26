[MongoDB indexes](https://docs.mongodb.com/manual/indexes/) are
key to getting consistent performance on large MongoDB collections.
But MongoDB warns that [too many indexes can also be bad for performance](https://docs.mongodb.com/manual/core/data-model-operations/#data-model-indexes).
So how many is "too many"? In this article, I'll run some basic
experiments and provide some heuristics that I use to determine
when indexes are necessary and when you have too many indexes.

_The conclusions presented in this article are the results of an N=1 experiment. They aren't guaranteed to be correct on all machines and environments. Furthermore, I do not speak for MongoDB, these conclusions do not represent official MongoDB guidelines._

What Is an Index?
-----------------

Suppose you execute the following query using [Mongoose](https://mongoosejs.com/):

```javascript
const users = await User.find({ lastName: 'Smith' });
```

Without any indexes, MongoDB would have to search through every
single document in the `users` collection and check if it has
a `lastName` property that is equal to the string `'Smith'`.

If you have 10 users, scanning the entire collection is not a problem.
If you have 10 million users, scanning the entire collection may
be a problem if you need to do run this query frequently.

An _index_ on `lastName` tells MongoDB to keep a list of documents by
`lastName` property, similar to a [JavaScript Map](/the-80-20-guide-to-maps-in-javascript.html) or a hash map in other languages.
When you query by `lastName`, instead of scanning the entire collection,
MongoDB can just look at the index.

```javascript
const schema = mongoose.Schema({
  firstName: String,
  lastName: String
});

// Create an index on `lastName`
schema.index({ lastName: 1 });

const User = mongoose.model('User', schema);
// Wait for Mongoose to build the index if it doesn't already exist
await User.init();

// MongoDB will use the `lastName` index.
await User.find({ lastName: 'Smith' });
```

For example, suppose you have 120k documents with the same first
name and last name, and then 1 document with a different last name.
Without an index, there's a noticable delay in finding the document
with the different last name:

```javascript
const docs = [];
for (let i = 0; i < 120000; ++i) {
  docs.push({ firstName: 'Agent', lastName: 'Smith' });
}
docs.push({ firstName: 'Agent', lastName: 'Brown' });

const userSchema = Schema({ firstName: String, lastName: String });
const User = mongoose.model('User', userSchema);

await User.insertMany(docs);

const start = Date.now();
const res = await User.find({ lastName: 'Brown' });
const elapsed = Date.now() - start; // Approximately 104 on my laptop
```

But with an index, the same query executes almost instantaneously.

```javascript
const docs = [];
for (let i = 0; i < 120000; ++i) {
  docs.push({ firstName: 'Agent', lastName: 'Smith' });
}
docs.push({ firstName: 'Agent', lastName: 'Brown' });

const User = mongoose.model('User', Schema({
  firstName: String,
  lastName: { type: String, index: true }
}));

await User.init();
await User.insertMany(docs);

const start = Date.now();
const res = await User.find({ lastName: 'Brown' });
const elapsed = Date.now() - start;

elapsed; // Approximately 14 on my laptop
```

When Do You Need an Index?
--------------------------

In my experiences, indexes are not useful for small collections.
I'd argue that if a collection has less than 10k documents, indexes
don't give you much benefit. That's because collection scans are nearly
instantaneous on 10k document collections, assuming the database isn't
under high load.

```javascript
let schema = Schema({ firstName: String, lastName: String });
const User = mongoose.model('User', schema);

let docs = [];
for (let i = 0; i < 10000; ++i) {
  docs.push({ firstName: 'Agent', lastName: 'Smith' });
}
docs.push({ firstName: 'Agent', lastName: 'Brown' });
await User.init();
await User.insertMany(docs);

const start = Date.now();
const res = await User.find({ lastName: 'Brown' });
const elapsed = Date.now() - start;

elapsed; // Approximately 8 on my laptop
```

With an index, the query is significantly quicker in percentage
terms, but not in absolute terms. If an API endpoint executes
just this `lastName` query, I wouldn't bother indexing `lastName`
to speed up the API endpoint unless the number of users grows
closer to 100k.

```javascript
let schema = Schema({ firstName: String, lastName: String });
schema.index({ lastName: 1 });
const User = mongoose.model('User', schema);

let docs = [];
for (let i = 0; i < 10000; ++i) {
  docs.push({ firstName: 'Agent', lastName: 'Smith' });
}
docs.push({ firstName: 'Agent', lastName: 'Brown' });

await User.init();
await User.insertMany(docs);

const start = Date.now();
const res = await User.find({ lastName: 'Brown' });
const elapsed = Date.now() - start;

elapsed; // Approximately 5 on my laptop
```

My general rule of thumb when building an API: if a collection
has less than 10k documents, don't bother indexing. If
a collection has more than 100k documents, make sure common
queries use indexes.

Examples Of Too Many Indexes
----------------------------

Indexes are great, but too many indexes can cause slower writes.
That's because MongoDB also needs to update indexes when you
update a document.

For example, suppose you have 1000 indexed properties, and you
send an `updateOne()` that updates all 1000 indexed properties
at once. That update can be 30% faster without indexes!

```javascript
const N = 1000;

let schema = Schema({}, { strict: false });
for (let i = 0; i < N; ++i) schema.index({ [`prop${i}`]: 1 });
const Indexed = mongoose.model('Indexed', schema);
await Indexed.init();

const Unindexed = mongoose.model('Unindexed', Schema({}, { strict: false }));

// Create a document with 1000 properties, all indexed.
const doc = {};
for (let i = 0; i < N; ++i) doc[`prop${i}`] = i;

// We'll update each of the 1000 properties.
const update = {};
for (let i = 0; i < N; ++i) update[`prop${i}`] = 1;

let { _id } = await Unindexed.create({...doc});
let start = Date.now();
for (let i = 0; i < 1000; ++i) {
  await Unindexed.updateOne({ _id }, { $inc: { ...update } });
}
Date.now() - start; // About 16000 on my laptop

({ _id } = await Indexed.create({...doc}));
start = Date.now();
for (let i = 0; i < 1000; ++i) {
  await Indexed.updateOne({ _id }, { $inc: { ...update } });
}
Date.now() - start; // About 25000 on my laptop, 50% slower
```

How does the performance change as you tweak the number of
indexes `N`? Here's a graph:

<img src="https://codebarbarian-images.s3.amazonaws.com/indexed-vs-unindexed.png" class="inline-image">

The takeaway here is that if you have 100 indexes or less, the
performance penalty for writes is pretty minimal. If your
collection has 5 indexes, your write performance won't noticably
suffer if you add a 6th index. Write performance only starts
degrading noticably when you have to update hundreds of indexes
on a write.

Note that [this example assumes that your indexes fit in RAM](https://docs.mongodb.com/manual/tutorial/ensure-indexes-fit-ram/). If your
indexes don't fit in RAM, you may incur a higher performance penalty
for additional indexes.

Moving On
---------

MongoDB has exceptional performance, and I wouldn't build an app
on anything else. By applying a couple of [schema design patterns](/mongoose-schema-design-pattern-store-what-you-query-for.html),
[being careful with known slow operations](/slow-trains-in-mongodb-and-nodejs.html), and setting up the right
indexes, you can easily handle collections containing tens of millions
of documents. At [Booster](https://trybooster.com/), every penny of
our [$50M+ annual revenue](https://www.geekwire.com/2018/foot-gas-fuel-delivery-startup-booster-fuels-generating-180k-revenue-per-day/) goes through one unsharded MongoDB cluster running on modest cloud VMs - all thanks to a good indexing strategy.