[MongoDB change streams](https://docs.mongodb.com/manual/changeStreams/) are a
powerful mechanism for splitting work between different processes. In other
words, change streams are a compelling alternative to pubsub tools like
[Apache Kafka](https://kafka.apache.org/), especially when you're already using
MongoDB. Ingesting and reacting to stock price data is a [classic use case for Kafka](https://www.youtube.com/watch?v=0tSZo8I2924). Stock prices
can change hundreds of times a second and doing work in the same logic that
ingests stock prices is like trying to solve a sudoku puzzle while drinking from
a firehose. In this article, I'll build out a service using [Node.js](https://nodejs.org/en/) and [mongoose](http://mongoosejs.com/) that watches stock prices via
a change stream and
notifies users when a stock crosses a user-specified threshold.

Getting Started with Mongoose and Change Streams
------------------------------------------------

[Mongoose added support for change streams in v5.0.0](https://thecodebarbarian.com/introducing-mongoose-5#change-streams) via
the [`Model.watch()` function](http://mongoosejs.com/docs/api.html#watch_watch).
The `Model.watch()` function gives you a [Node.js event emitter](https://nodejs.org/api/events.html#events_class_eventemitter) that fires a 'change' event every time someone inserts or updates a document in the database.

Currently, MongoDB replica sets do not work with a standalone `mongod` server,
you [need to start a replica set](https://docs.mongodb.com/manual/changeStreams/#open-a-change-stream). To
save you the effort of setting up a replica set on your own, the below example
creates a 3 node replica set running on ports 31000-31002 using the [`mongodb-topology-manager` npm module](http://npmjs.com/package/mongodb-topology-manager). The `mongodb-topology-manager` npm module is great for tests and examples, but do
**not** use it in production. If you want to use replica sets in production
without managing them yourself, check out [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

```javascript
const { ReplSet } = require('mongodb-topology-manager');
const mongoose = require('mongoose');

// If you're not familiar with async/await, check out this article:
// http://bit.ly/node-async-await
run().catch(error => console.error(error));

async function run() {
  // Make sure you're using mongoose >= 5.0.0
  console.log(new Date(), `mongoose version: ${mongoose.version}`);

  await setupReplicaSet();

  // Connect to the replica set
  const uri = 'mongodb://localhost:31000,localhost:31001,localhost:31002/' +
    'test?replicaSet=rs0';
  await mongoose.connect(uri);
  // For this example, need to explicitly create a collection, otherwise
  // you get "MongoError: cannot open $changeStream for non-existent database: test"
  await mongoose.connection.createCollection('Person');

  // Create a new mongoose model
  const personSchema = new mongoose.Schema({
    name: String
  });
  const Person = mongoose.model('Person', personSchema, 'Person');

  // Create a change stream. The 'change' event gets emitted when there's a
  // change in the database
  Person.watch().
    on('change', data => console.log(new Date(), data));

  // Insert a doc, will trigger the change stream handler above
  console.log(new Date(), 'Inserting doc');
  await Person.create({ name: 'Axl Rose' });
  console.log(new Date(), 'Inserted doc');
}

// Boilerplate to start a new replica set. You can skip this if you already
// have a replica set running locally or in MongoDB Atlas.
async function setupReplicaSet() {
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
}
```

The output from running the above script looks like this:

```
$ node change.js
2018-05-11T15:05:22.355Z 'mongoose version: 5.1.0'
2018-05-11T15:05:35.367Z 'Replica set started...'
2018-05-11T15:05:35.467Z 'Inserting doc'
2018-05-11T15:05:35.487Z 'Inserted doc'
2018-05-11T15:05:35.491Z { _id:
   { _data:
      Binary {
        _bsontype: 'Binary',
        sub_type: 0,
        position: 49,
        buffer: <Buffer 82 5a f5 b1 3f 00 00 00 07 46 64 5f 69 64 00 64 5a f5 b1 3f e5 26 02 76 66 c6 bf 83 00 5a 10 04 f6 71 b9 00 09 b2 48 4e af dc 41 42 b9 94 a0 77 04> } },
  operationType: 'insert',
  fullDocument: { _id: 5af5b13fe526027666c6bf83, name: 'Axl Rose', __v: 0 },
  ns: { db: 'test', coll: 'Person' },
  documentKey: { _id: 5af5b13fe526027666c6bf83 } }
^C
$
```

In particular, notice the `operationType`, `fullDocument`, and `ns` properties.
The `operationType` property tells you the type of change that occurred,
it will be either 'insert', 'update', 'replace', 'delete', or 'invalidate'.
Each `operationType` has slightly different properties. The `fullDocument`
property contains the entire document after any updates have been applied.
The `ns` property tells you the name of the database and collection that the
changed document is in.

Pub/Sub with Fake Market Data
-----------------------------

Suppose you were building an app that let users specify a stock ticker and a
price threshold, and notified them when the stock's price went above or below
a certain threshold. For instance, let's say you wanted to be notified when [MongoDB stock](https://www.nasdaq.com/symbol/mdb) went above 45.
Now that you've seen a change stream in action, let's create two separate
processes that communicate via change stream: one process that writes stock
prices to the database, and one that looks for stock price changes that cross the
user-specified threshold.

First, let's create a process that writes fake price data for MDB stock once
per second. The price data will cross the threshold value of 45 every 10
seconds.

```javascript
const { ReplSet } = require('mongodb-topology-manager');
const mongoose = require('mongoose');

// If you're not familiar with async/await, check out this article:
// http://bit.ly/node-async-await
run().catch(error => console.error(error));

async function run() {
  // Make sure you're using mongoose >= 5.0.0
  console.log(new Date(), `mongoose version: ${mongoose.version}`);

  await startReplicaSet();

  // Connect to the replica set
  const uri = 'mongodb://localhost:31000,localhost:31001,localhost:31002/' +
    'test?replicaSet=rs0';
  await mongoose.connect(uri);
  // For this example, need to explicitly create a collection, otherwise
  // you get "MongoError: cannot open $changeStream for non-existent database: test"
  await mongoose.connection.createCollection('Price');

  // Create a new mongoose model
  const priceSchema = new mongoose.Schema({
    ticker: String,
    price: Number
  });
  const Price = mongoose.model('Price', priceSchema, 'Price');

  let index = 0;
  const prices = [
    // First 10 seconds, prices are below 45
    44.5, 44.51, 44.67, 44.79, 44.52, 43.97, 44.55, 44.22, 44.11, 44.86,
    // Next 10 seconds, prices are above 45
    45.1, 45.22, 45.37, 45.26, 45.29, 45.99, 46.01, 45.65, 45.62, 45.02
  ];

  // To simulate real market data, insert a new stock price every second.
  // Every 10 seconds the price will cross between above 45 and below 45
  while (true) {
    console.log(new Date(), `Insert MDB price ${prices[index]}`);
    await Price.create({ ticker: 'MDB', price: prices[index] });
    index = (index + 1) % prices.length;
    // Pause execution for 1 second.
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

The other process, `watchData.js`, will watch for new documents inserted into
the 'Price' collection. It will track the last price it saw, and every time
it sees a new price it will query the 'Threshold' collection to see if the new
price crossed a threshold. You can imagine there's a separate API service that
would let the app's users manage their thresholds.

```javascript
run().catch(error => console.error(error));

async function run() {
  // Connect to the replica set
  const uri = 'mongodb://localhost:31000,localhost:31001,localhost:31002/' +
    'test?replicaSet=rs0';
  await mongoose.connect(uri);

  // Create mongoose models for prices and thresholds
  const thresholdSchema = new mongoose.Schema({
    ticker: String,
    price: String
  });
  const Threshold = mongoose.model('Threshold', thresholdSchema, 'Threshold');

  const priceSchema = new mongoose.Schema({
    ticker: String,
    price: Number
  });
  const Price = mongoose.model('Price', priceSchema, 'Price');

  // Store the threshold in the database
  await Threshold.create({ ticker: 'MDB', price: 45 });

  let lastPrice = -1;
  // The first argument to `watch()` is an aggregation pipeline. This
  // pipeline makes sure we only get notified of changes on the 'Price'
  // collection.
  const pipeline = [{ $match: { 'ns.db': 'test', 'ns.coll': 'Price' } }];
  Price.watch(pipeline).
    on('change', async (data) => {
      const newPrice = data.fullDocument.price;
      if (lastPrice === -1) {
        lastPrice = newPrice;
        return;
      }
      const ticker = data.fullDocument.ticker;
      const $gte = Math.min(lastPrice, newPrice);
      const $lte = Math.max(lastPrice, newPrice);
      // Make sure to set `lastPrice` **before** any async logic, in case
      // another `change` event comes in before the query is done
      lastPrice = newPrice;

      const threshold = await Threshold.findOne({
        ticker,
        price: { $gte, $lte }
      });
      if (threshold != null) {
        console.log(new Date(), `Threshold for ${threshold.ticker} ` +
          `${threshold.price} crossed: ${$gte}, ${$lte}`);
      }
    });
}
```

Run these two scripts in two separate terminal windows, The `ingestData.js`
script will print out the stock prices it inserted:

```
$ node ingestData.js
2018-05-11T16:03:04.596Z 'mongoose version: 5.1.1-pre'
2018-05-11T16:03:18.658Z 'Replica set started...'
2018-05-11T16:03:18.733Z 'Insert MDB price 44.5'
2018-05-11T16:03:19.747Z 'Insert MDB price 44.51'
2018-05-11T16:03:20.756Z 'Insert MDB price 44.67'
2018-05-11T16:03:21.763Z 'Insert MDB price 44.79'
2018-05-11T16:03:22.769Z 'Insert MDB price 44.52'
2018-05-11T16:03:23.775Z 'Insert MDB price 43.97'
2018-05-11T16:03:24.786Z 'Insert MDB price 44.55'
2018-05-11T16:03:25.794Z 'Insert MDB price 44.22'
2018-05-11T16:03:26.802Z 'Insert MDB price 44.11'
2018-05-11T16:03:27.809Z 'Insert MDB price 44.86'
2018-05-11T16:03:28.817Z 'Insert MDB price 45.1'
...
^C
$
```

The `watchData.js` script will print out the times the stock price crossed 45:

```
$ node watchData.js
2018-05-11T16:03:28.841Z 'Threshold for MDB 45 crossed: 44.86, 45.1'
2018-05-11T16:03:38.905Z 'Threshold for MDB 45 crossed: 44.5, 45.02'
2018-05-11T16:03:48.979Z 'Threshold for MDB 45 crossed: 44.86, 45.1'
^C
$
```

Moving On
---------

MongoDB change streams enable you to use MongoDB for pubsub, which is great
for people that already use MongoDB and don't want to manage a Kafka or RabbitMQ
deployment. The asynchronous nature of Node.js and mongoose is a natural fit,
because your watcher process can handle multiple 'change' events in parallel.
Plus, [web push is easy in Node.js](https://thecodebarbarian.com/sending-web-push-notifications-from-node-js.html), so you can expand your watcher process to send push notifications to
Google Chrome.
