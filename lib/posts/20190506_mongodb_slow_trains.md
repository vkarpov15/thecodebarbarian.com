When running MongoDB in production, you've may see queries that should be fast, but instead are exceedingly slow. For example, my Node.js apps have seen a [`findOne()`](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#findOne) on a collection with only 1 document take over 1 _second_.

There's a simple explanation for this phenomenon: a MongoDB server can [only execute a single operation on a given socket at a time](http://mongodb.github.io/node-mongodb-native/2.0/reference/faq/#how-can-i-avoid-a-very-slow-operation-delaying-other-operations). In other words, the number of concurrent operations your Node.js connection can handle is limited by the `poolSize` option. For example, the 2nd query below will take approximately 1 second, because `poolSize = 1` and it is blocked by a slow query.

```javascript
const mongodb = require('mongodb')

run().catch(error => console.log(error));

async function run() {
  const db = await mongodb.MongoClient.
    connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      poolSize: 1 // Only 1 operation can run at a time
    }).
    then(client => client.db());

  await db.dropDatabase();
  await db.collection('Test').insertOne({ answer: 42 });

  // First, run a slow query that will take about 1 sec, but don't `await` on it. Instead,
  // continue so we can execute a 2nd query a little later.
  const promise = db.collection('Test').find({ $where: 'sleep(1000) || true' }).toArray();

  // Run a 2nd query that _should_ be fast
  const startTime = Date.now();
  await db.collection('Test').findOne();

  // Will print something like "Executed query in 1031 ms"
  console.log('Executed query in', Date.now() - startTime, 'ms');
}
```

You can visualize this by imagining `db` as a set of `poolSize` train tracks. If there's only 1 track and a slow, overburdened cargo train takes 1 second to clear the track, the bullet train behind it needs to wait.

In general, there are 4 methods I've used to minimize the impact of slow trains:

1) Increase `poolSize`

2) Separate connection pools for potentially slow operations

3) Break up one slow operation into many fast operations

4) Indexes

5) [The `maxTimeMS` option](https://docs.mongodb.com/manual/reference/operator/meta/maxTimeMS/)

Increase `poolSize`
-------------------

Increasing `poolSize` is a one-liner in both the [MongoDB Node.js driver](http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html) and [Mongoose](https://mongoosejs.com/docs/connections.html#options). `poolSize = 1` is good for experimenting with the slow train problem, but in production you should use at least the default `poolSize = 5`. Below is an example with `poolSize = 10`.

```javascript
  const db = await mongodb.MongoClient.
    connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      poolSize: 10 // Can now run 10 operations at a time
    }).
    then(client => client.db());

  await db.dropDatabase();
  await db.collection('Test').insertOne({ answer: 42 });

  const promise = db.collection('Test').find({ $where: 'sleep(1000) || true' }).toArray();

  const startTime = Date.now();
  await db.collection('Test').findOne();

  // Will print something like "Executed query in 4 ms"
  console.log('Executed query in', Date.now() - startTime, 'ms');
```

However, too many connections can cause performance issues and can cause you to [hit OS-level resource limits](https://stackoverflow.com/questions/16713415/mongodb-increasing-max-connections-in-mongodb). So increasing `poolSize` to 10k is most likely a bad idea. In production, I generally use `poolSize = 10`.

Separate Connection Pools for Potentially Slow Operations
---------------------------------------------------------

Increasing `poolSize` won't help if you get a large batch of slow queries all at once. But what can help is separate connection pools for operations that are performance sensitive versus operations that can be slow. For example, in the below example there's two connections `db1` and `db2`. A slow query on `db1` doesn't block MongoDB from responding to a fast query on `db2`.

```javascript
  // First connection for slow operations
  const db1 = await mongodb.MongoClient.
    connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      poolSize: 1 // Only 1 operation can run at a time
    }).
    then(client => client.db());

  // 2nd connection for fast operations
  const db2 = await mongodb.MongoClient.
    connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      poolSize: 1 // Only 1 operation can run at a time
    }).
    then(client => client.db());

  await db1.dropDatabase();
  await db1.collection('Test').insertOne({ answer: 42 });

  // Run a slow query on the 1st connection `db1`
  const promise = db1.collection('Test').find({ $where: 'sleep(1000) || true' }).toArray();

  // Run a 2nd query on the 2nd connection `db2`
  const startTime = Date.now();
  await db2.collection('Test').findOne();

  // Will print something like "Executed query in 4 ms"
  console.log('Executed query in', Date.now() - startTime, 'ms');
```

Break Up One Slow Operation Into Many Fast Operations
-----------------------------------------------------

[MongoDB aggregations](https://docs.mongodb.com/manual/aggregation/) count as a single operation. Because the aggregation framework is so expressive, many people end up creating exceedingly complex aggregations that end up causing slow trains in production.

In general, if you have an aggregation that's causing slow trains in production, you should consider replacing the aggregation with Node.js logic that relies on `find()`. For example, you could replace [`$lookup`](https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/) with [Mongoose populate](https://mongoosejs.com/docs/populate.html).

```javascript
const mongodb = require('mongodb')

run().catch(error => console.log(error));

async function run() {
  const db = await mongodb.MongoClient.
    connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      poolSize: 1 // Only 1 operation can run at a time
    }).
    then(client => client.db());

  await db.dropDatabase();

  for (let i = 0; i < 10000; ++i) {
    await db.collection('Foo').insertOne({ _id: i });
  }
  console.log('Inserted foo docs');

  for (let i = 0; i < 10000; ++i) {
    await db.collection('Bar').insertOne({ _id: i, fooId: i });
  }
  console.log('Inserted bar docs');

  // This aggregation will be exceedingly slow because there's no index on
  // `fooId`. Instead, could replace this with Mongoose populate, which would
  // replace this aggregation into 2 faster `find()` operations.
  const promise = db.collection('Foo').aggregate([
    { $lookup: { from: 'Bar', localField: '_id', foreignField: 'fooId', as: 'bars' } }
  ]).toArray();

  const startTime = Date.now();
  await db.collection('Test').findOne();

  // "Executed query in 301 ms"
  console.log('Executed query in', Date.now() - startTime, 'ms');
}
```

Indexes
-------

[MongoDB indexes](https://docs.mongodb.com/manual/indexes/) are a complex subject, but for the purposes of this article the idea is simple: make a slow query fast. For example, you can speed up the `$lookup` aggregation above using an index on `fooId`.

```javascript
const mongodb = require('mongodb')

run().catch(error => console.log(error));

async function run() {
  const db = await mongodb.MongoClient.
    connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      poolSize: 1 // Only 1 operation can run at a time
    }).
    then(client => client.db());

  await db.dropDatabase();

  for (let i = 0; i < 10000; ++i) {
    await db.collection('Foo').insertOne({ _id: i });
  }
  console.log('Inserted foo docs');

  for (let i = 0; i < 10000; ++i) {
    await db.collection('Bar').insertOne({ _id: i, fooId: i });
  }
  console.log('Inserted bar docs');

  // Create an index on `fooId` before executing the query
  await db.collection('Bar').createIndex({ fooId: 1 });
  const promise = db.collection('Foo').aggregate([
    { $lookup: { from: 'Bar', localField: '_id', foreignField: 'fooId', as: 'bars' } }
  ]).toArray();

  const startTime = Date.now();
  await db.collection('Test').findOne();

  // "Executed query in 19 ms"
  console.log('Executed query in', Date.now() - startTime, 'ms');
}
```

The `maxTimeMS` Option
----------------------

The [`maxTimeMS` option](https://docs.mongodb.com/manual/reference/operator/meta/maxTimeMS/) tells the MongoDB server to stop running a query after a certain period of time. In the below example, the slow `aggregate()` call will throw an error after approximately 10ms. Because the MongoDB server stops executing the slow aggregation after 10ms, it unblocks the fast `findOne()`.

```javascript
  const db = await mongodb.MongoClient.
    connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      poolSize: 1 // Only 1 operation can run at a time
    }).
    then(client => client.db());

  await db.dropDatabase();

  for (let i = 0; i < 10000; ++i) {
    await db.collection('Foo').insertOne({ _id: i });
  }
  console.log('Inserted foo docs');

  for (let i = 0; i < 10000; ++i) {
    await db.collection('Bar').insertOne({ _id: i, fooId: i });
  }
  console.log('Inserted bar docs');

  // This aggregation will fail if it doesn't finish within 10ms
  const promise = db.collection('Foo').
    aggregate(
      [{ $lookup: { from: 'Bar', localField: '_id', foreignField: 'fooId', as: 'bars' } }],
      { maxTimeMS: 10 }
    ).
    toArray().
    catch(err => {}); // Ignore maxTimeMS error

  const startTime = Date.now();
  await db.collection('Test').findOne();

  // "Executed query in 19 ms"
  console.log('Executed query in', Date.now() - startTime, 'ms');
```

One nice detail of `maxTimeMS` is that it does **not** count time spent blocked behind a slow train. In other words, if you run a `find()` with `maxTimeMS = 100`, and that `find()` spends 500ms blocked behind a slow query and then executes in 50ms, you won't see an error, even though your Node.js process waited 550ms for the query. This means `maxTimeMS` helps you find queries that are actually slow, as opposed to queries that appear slow because they're blocked by other slow queries.

Moving On
---------

Slow trains in MongoDB may seem like a major limitation, but this behavior has some benefits. Many other databases have similar limits built in, like [`max_concurrent_queries` in MySQL](https://planet.mysql.com/entry/?id=29516), because too many concurrent queries can also lead to performance issues. The guidelines in this article have helped me keep API instances running smoothly even with `poolSize = 10`, try them out and please discuss in the comments section.