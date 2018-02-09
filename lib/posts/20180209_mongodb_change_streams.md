Before MongoDB 3.6, [tailing the MongoDB oplog](https://www.mongodb.com/blog/post/tailing-mongodb-oplog-sharded-clusters) was the only way to listen for changes to your MongoDB database. The [oplog](https://docs.mongodb.com/manual/core/replica-set-oplog/) is a special collection that logs all inserts and updates that come in to your MongoDB server so other members of the [replica set](https://docs.mongodb.com/manual/replication/) can copy them. Tools like [Meteor](https://themeteorchef.com/tutorials/setting-up-mongodb-oplog-tailing) and [MoSQL](https://stripe.com/blog/announcing-mosql) were built on tailing the oplog. Unfortunately, the oplog was built primarily to support replication internally as opposed to being a user-facing feature. [Change streams](https://docs.mongodb.com/manual/changeStreams/) are a usability layer on top of the MongoDB oplog that make change detection in MongoDB much easier than tailing the oplog directly.

Your First Change Stream
------------------------

Change streams [require a MongoDB replica set](https://docs.mongodb.com/manual/changeStreams/). You'll get an error if you try to open one against a standalone MongoDB instance. For this article, I'll use the [mongodb-topology-manager Node.js package](https://www.npmjs.com/package/mongodb-topology-manager) to start up a MongoDB replica set so you don't have to do it yourself. Once you set up a replica set, you will be able to create a change stream using the the `watch()` method on [MongoDB driver collections](http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#watch) or [Mongoose models](http://mongoosejs.com/docs/api.html#watch_watch).

Below is a standalone script `changestream.js` that starts up a MongoDB replica set, creates a change stream, and inserts a document to trigger the change stream. The only requirements to run this script are a `mongod` in your PATH, Node.js, and running `npm install mongodb mongodb-topology manager`.

```javascript
const { ReplSet } = require('mongodb-topology-manager');
const mongodb = require('mongodb');

run().catch(error => console.error(error));

async function run() {
  console.log(new Date(), 'start');
  const bind_ip = 'localhost';
  // Starts a 3-node replica set on ports 31000, 31001, 31002, replica set
  // name is "rs0".
  const replSet = new ReplSet('mongod', [
    { options: { port: 31000, dbpath: `${__dirname}/data/db/31000`, bind_ip } },
    { options: { port: 31001, dbpath: `${__dirname}/data/db/31001`, bind_ip } },
    { options: { port: 31002, dbpath: `${__dirname}/data/db/31002`, bind_ip } }
  ], { replSet: 'rs0' });

  // Initialize the replica set
  await replSet.purge();
  await replSet.start();
  console.log(new Date(), 'Replica set started...');

  // Connect to the replica set
  const uri = 'mongodb://localhost:31000,localhost:31001,localhost:31002/' +
    'test?replicaSet=rs0';
  const client = await mongodb.MongoClient.connect(uri);
  const db = client.db('test');

  // Create a change stream. The 'change' event gets emitted when there's a
  // change in the database
  db.collection('Person').watch().
    on('change', data => console.log(new Date(), data));

  // Insert a doc, will trigger the change stream handler above
  console.log(new Date(), 'Inserting doc');
  await db.collection('Person').insertOne({ name: 'Axl Rose' });
  console.log(new Date(), 'Inserted doc');
}
```

The output of running the above script looks like this:

```
$ node changestream.js
2018-02-09T17:48:03.986Z 'start'
2018-02-09T17:48:18.704Z 'Replica set started...'
2018-02-09T17:48:18.751Z 'Inserting doc'
2018-02-09T17:48:18.780Z 'Inserted doc'
2018-02-09T17:48:18.815Z { _id:
   { _data:
      Binary {
        _bsontype: 'Binary',
        sub_type: 0,
        position: 49,
        buffer: <Buffer 82 5a 7d de e2 00 00 00 02 46 64 5f 69 64 00 64 5a 7d de e2 48 09 65 15 af 26 a4 6b 00 5a 10 04 c3 c3 fa c9 27 e6 49 1a 9a 7b 5b 3f f4 e7 5b 12 04> } },
  operationType: 'insert',
  fullDocument: { _id: 5a7ddee248096515af26a46b, name: 'Axl Rose' },
  ns: { db: 'test', coll: 'Person' },
  documentKey: { _id: 5a7ddee248096515af26a46b } }
^C
$
```

Change stream data has several important properties:

* `operationType`: must be one of 'insert', 'update', 'replace', 'delete', or 'invalidate'. See [this spec](https://github.com/mongodb/specifications/blob/master/source/change-streams.rst#response-format). Other than 'invalidate', these correspond to MongoDB CRUD operations in the obvious way, `insertOne()` becomes 'insert', `updateOne()` becomes 'update', `replaceOne()` becomes 'replace', and `deleteOne()` becomes 'delete'. Likewise, `insertMany()` gets translated to multiple 'insert' events in a change stream.
* `ns`: the database name and collection this change happened on.
* `fullDocument`: the current state of the document at the time that this operation occurred. More on this later.

Operations that affect multiple documents, like `insertMany()`, generate one 'change' event per affected document. For example, if you call `insertMany()` with 2 documents, you'll get two 'change' events. In general, each 'change' event describes changes to a **single** document.

```javascript
// Create a change stream. The 'change' event gets emitted when there's a change in the database
db.collection('Person').watch().on('change', data => console.log(new Date(), data));

// Insert a doc, will trigger the change stream handler above
console.log(new Date(), 'Inserting doc');
await db.collection('Person').insertMany([{ name: 'Axl Rose' }, { name: 'Slash' }]);
console.log(new Date(), 'Inserted doc');

console.log(await db.collection('Person').find().toArray());
```

Below is the output with the above changes to `changestream.js`:

```
$ node changestream.js
2018-02-09T18:01:50.366Z 'start'
2018-02-09T18:02:03.555Z 'Replica set started...'
2018-02-09T18:02:03.609Z 'Inserting doc'
2018-02-09T18:02:03.632Z 'Inserted doc'
[ { _id: 5a7de21ba1a72d1c38d7d659, name: 'Axl Rose' },
  { _id: 5a7de21ba1a72d1c38d7d65a, name: 'Slash' } ]
2018-02-09T18:02:03.675Z { _id:
   { _data:
      Binary {
        _bsontype: 'Binary',
        sub_type: 0,
        position: 49,
        buffer: <Buffer 82 5a 7d e2 1b 00 00 00 07 46 64 5f 69 64 00 64 5a 7d e2 1b a1 a7 2d 1c 38 d7 d6 59 00 5a 10 04 a0 fc 79 4e 61 da 40 d4 89 4f f7 8a 62 ae 41 15 04> } },
  operationType: 'insert',
  fullDocument: { _id: 5a7de21ba1a72d1c38d7d659, name: 'Axl Rose' },
  ns: { db: 'test', coll: 'Person' },
  documentKey: { _id: 5a7de21ba1a72d1c38d7d659 } }
2018-02-09T18:02:03.679Z { _id:
   { _data:
      Binary {
        _bsontype: 'Binary',
        sub_type: 0,
        position: 49,
        buffer: <Buffer 82 5a 7d e2 1b 00 00 00 08 46 64 5f 69 64 00 64 5a 7d e2 1b a1 a7 2d 1c 38 d7 d6 5a 00 5a 10 04 a0 fc 79 4e 61 da 40 d4 89 4f f7 8a 62 ae 41 15 04> } },
  operationType: 'insert',
  fullDocument: { _id: 5a7de21ba1a72d1c38d7d65a, name: 'Slash' },
  ns: { db: 'test', coll: 'Person' },
  documentKey: { _id: 5a7de21ba1a72d1c38d7d65a } }
^C
$
```

Updates and the `fullDocument` Option
-------------------------------------

The change document for inserts and replaces is straightforward because `fullDocument`, the document that you're inserting, will always be present. Updates are slightly trickier, by default `operationType = 'update'` means `fullDocument` will **not** be present. Instead, there will be an `updateDescription` property that describes the changes to the document. For example, below is a modified `changestream.js` that inserts a document and then does an `updateOne()` on the document.

```javascript
const { ReplSet } = require('mongodb-topology-manager');
const mongodb = require('mongodb');

run().catch(error => console.error(error));

async function run() {
  console.log(new Date(), 'start');
  const bind_ip = 'localhost';
  // Starts a 3-node replica set on ports 31000, 31001, 31002, replica set
  // name is "rs0".
  const replSet = new ReplSet('mongod', [
    { options: { port: 31000, dbpath: `${__dirname}/data/db/31000`, bind_ip } },
    { options: { port: 31001, dbpath: `${__dirname}/data/db/31001`, bind_ip } },
    { options: { port: 31002, dbpath: `${__dirname}/data/db/31002`, bind_ip } }
  ], { replSet: 'rs0' });

  // Initialize the replica set
  await replSet.purge();
  await replSet.start();
  console.log(new Date(), 'Replica set started...');

  // Connect to the replica set
  const client = await mongodb.MongoClient.connect('mongodb://localhost:31000,localhost:31001,localhost:31002/test?replicaSet=rs0');
  const db = client.db('test');

  // Create a change stream. The 'change' event gets emitted when there's a change in the database
  db.collection('Person').watch().on('change', data => console.log(new Date(), data));

  console.log(new Date(), 'Inserting doc');
  await db.collection('Person').insertOne({ name: 'Axl Rose' });

  console.log(new Date(), 'Updating doc');
  await db.collection('Person').updateOne({ name: 'Axl Rose' }, { $set: { name: 'Slash' } });
  console.log(new Date(), 'Updated doc');

  console.log(await db.collection('Person').findOne());
}
```

The output looks like what you see below:

```
$ node changestream.js
2018-02-09T22:12:22.379Z 'start'
2018-02-09T22:12:35.806Z 'Replica set started...'
2018-02-09T22:12:35.878Z 'Inserting doc'
2018-02-09T22:12:35.909Z 'Updating doc'
2018-02-09T22:12:35.919Z 'Updated doc'
{ _id: 5a7e1cd3b819da11d05cd0d5, name: 'Slash' }
2018-02-09T22:12:35.949Z { _id:
   { _data:
      Binary {
        _bsontype: 'Binary',
        sub_type: 0,
        position: 49,
        buffer: <Buffer 82 5a 7e 1c d3 00 00 00 07 46 64 5f 69 64 00 64 5a 7e 1c d3 b8 19 da 11 d0 5c d0 d5 00 5a 10 04 13 f7 37 b8 c7 50 4d 3a b3 a4 7c be 70 56 0e 16 04> } },
  operationType: 'insert',
  fullDocument: { _id: 5a7e1cd3b819da11d05cd0d5, name: 'Axl Rose' },
  ns: { db: 'test', coll: 'Person' },
  documentKey: { _id: 5a7e1cd3b819da11d05cd0d5 } }
2018-02-09T22:12:35.953Z { _id:
   { _data:
      Binary {
        _bsontype: 'Binary',
        sub_type: 0,
        position: 49,
        buffer: <Buffer 82 5a 7e 1c d3 00 00 00 08 46 64 5f 69 64 00 64 5a 7e 1c d3 b8 19 da 11 d0 5c d0 d5 00 5a 10 04 13 f7 37 b8 c7 50 4d 3a b3 a4 7c be 70 56 0e 16 04> } },
  operationType: 'update',
  ns: { db: 'test', coll: 'Person' },
  documentKey: { _id: 5a7e1cd3b819da11d05cd0d5 },
  updateDescription: { updatedFields: { name: 'Slash' }, removedFields: [] } }
^C
$
```

The `updateDescription` is useful, but usually you will want the current state of the document as well. In order to get the `fullDocument` property for updates, you need to [set the `fullDocument` option on the `watch()` function to the string 'updateLookup'](https://github.com/mongodb/specifications/blob/master/source/change-streams.rst#response-format):

```javascript
db.collection('Person').
  watch({ fullDocument: 'updateLookup' }).
  on('change', data => console.log(new Date(), data));
```

The output document is shown below. Note that `fullDocument` contains the document **after** the update was applied.

```javascript
{ _id:
   { _data:
      Binary {
        _bsontype: 'Binary',
        sub_type: 0,
        position: 49,
        buffer: <Buffer 82 5a 7e 1f 16 00 00 00 03 46 64 5f 69 64 00 64 5a 7e 1f 16 35 c9 cb 1b 22 1c a7 52 00 5a 10 04 b0 e6 d0 4d 49 ba 45 ed ac 05 a6 72 94 bf 21 16 04> } },
  operationType: 'update',
  fullDocument: { _id: 5a7e1f1635c9cb1b221ca752, name: 'Slash' },
  ns: { db: 'test', coll: 'Person' },
  documentKey: { _id: 5a7e1f1635c9cb1b221ca752 },
  updateDescription: { updatedFields: { name: 'Slash' }, removedFields: [] } }
```

Change Streams in Mongoose
--------------------------

[Mongoose 5.x has rudimentary support for change streams](http://thecodebarbarian.com/introducing-mongoose-5.html#change-streams). Currently, mongoose doesn't provide any special features on top of change streams beyond [`Model.watch()` function](http://mongoosejs.com/docs/api.html#watch_watch).
Below is the initial `changestream.js` file using Mongoose instead of the MongoDB driver.

```javascript
const { ReplSet } = require('mongodb-topology-manager');
const mongoose = require('mongoose');

run().catch(error => console.error(error));

async function run() {
  console.log(new Date(), 'start');
  const bind_ip = 'localhost';
  // Starts a 3-node replica set on ports 31000, 31001, 31002, replica set
  // name is "rs0".
  const replSet = new ReplSet('mongod', [
    { options: { port: 31000, dbpath: `${__dirname}/data/db/31000`, bind_ip } },
    { options: { port: 31001, dbpath: `${__dirname}/data/db/31001`, bind_ip } },
    { options: { port: 31002, dbpath: `${__dirname}/data/db/31002`, bind_ip } }
  ], { replSet: 'rs0' });

  // Initialize the replica set
  await replSet.purge();
  await replSet.start();
  console.log(new Date(), 'Replica set started...');

  // Connect to the replica set
  const uri = 'mongodb://localhost:31000,localhost:31001,localhost:31002/' +
    'test?replicaSet=rs0';
  await mongoose.connect(uri);

  // To work around "MongoError: cannot open $changeStream for non-existent
  // database: test" for this example
  await mongoose.connection.createCollection('people');

  const Person = mongoose.model('Person', new mongoose.Schema({ name: String }));

  // Create a change stream. The 'change' event gets emitted when there's a
  // change in the database
  Person.watch().
    on('change', data => console.log(new Date(), data));

  // Insert a doc, will trigger the change stream handler above
  console.log(new Date(), 'Inserting doc');
  await Person.create({ name: 'Axl Rose' });
  console.log(new Date(), 'Inserted doc');
}
```

The output, shown below, is the same as the MongoDB driver example. Mongoose currently does **not** do any special casting with 'change' events.

```
$ node changestream.js
2018-02-09T22:33:07.468Z 'start'
2018-02-09T22:33:20.826Z 'Replica set started...'
2018-02-09T22:33:20.946Z 'Inserting doc'
2018-02-09T22:33:21.007Z 'Inserted doc'
2018-02-09T22:33:21.010Z { _id:
   { _data:
      Binary {
        _bsontype: 'Binary',
        sub_type: 0,
        position: 49,
        buffer: <Buffer 82 5a 7e 21 b1 00 00 00 01 46 64 5f 69 64 00 64 5a 7e 21 b0 e5 0e 0d 20 65 ea 5a 2b 00 5a 10 04 e3 7e 36 84 9e 10 47 50 a7 3d a9 92 f0 52 aa 3f 04> } },
  operationType: 'insert',
  fullDocument: { _id: 5a7e21b0e50e0d2065ea5a2b, name: 'Axl Rose', __v: 0 },
  ns: { db: 'test', coll: 'people' },
  documentKey: { _id: 5a7e21b0e50e0d2065ea5a2b } }
^C
$
```

Moving On
---------

Change streams are the most prominent new feature in MongoDB 3.6, but they're far from the only one. [Array filters](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-36-array-filters.html) give you sophisticated tools for updating arrays. The aggregation framework has [numerous new operators and stages](https://docs.mongodb.com/manual/release-notes/3.6/#aggregation). Make sure you upgrade and try out all these new features, just remember that you first upgrade [the MongoDB driver](http://npmjs.com/package/mongodb) to `>= 3.0.0` or [Mongoose](https://www.npmjs.com/package/mongoose) to `>= 5.0.0`.
