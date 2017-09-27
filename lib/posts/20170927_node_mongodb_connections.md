Too often, MongoDB REST API developers don't think about handling database outages until they have an outage in production. Usually you can get away with this because version 2.x of the MongoDB Node.js driver does most of the work for you: it handles attempting to reconnect and can buffer operations for you so you don't get errors during a temporary outage. However, the MongoDB Node.js driver has a lot of tunable options and corresponding subtleties that you need to be aware of. In this article, I'll cover the basics of what happens when your backend MongoDB topology goes down for single server and replica sets, so you can configure the driver to do the right thing for your use case.

Handling Single Server Outages
------------------------------

The [mongodb-topology-manager](https://www.npmjs.com/package/mongodb-topology-manager) npm package is indispensible for testing MongoDB connection logic. This lib can stop and start MongoDB servers, replica sets, and sharded clusters from Node.js. The [MongoDB driver Node.js uses it for testing internally](https://github.com/mongodb/node-mongodb-native/blob/a541a333149cc9428fa2d08d19cc7d9bee0e4ec3/package.json#L36).

First, let's see what happens when the MongoDB server that the driver is
connected to shuts down. The [`db` handle the driver gives you emits several events](http://mongodb.github.io/node-mongodb-native/2.2/api/Db.html#Db), including 'close' when it loses connection and 'reconnect' when it reconnects. The driver attempts to reconnect by default, but this is a tuneable option. Note that these events only get fired for a single server or mongos, **not** when you're connected to a replica set (more on that later). Here's a script that uses the topology manager to stop/start a MongoDB instance so you can see these events actually fire:

```javascript
const { Server } = require('mongodb-topology-manager');
const mongodb = require('mongodb');

run().catch(error => console.error(error));

async function run() {
  // Start a single server on port 27000 whose `dbpath` is in the
  // data directory in the current directory
  // Note that this requires a `mongod` executable in your PATH variable
  const server = new Server('mongod', {
    dbpath: `${__dirname}/data/db/27000`,
    port: 27000
  });
  await server.start();
  console.log('Server started...');

  // Connect to the server
  const db = await mongodb.MongoClient.connect('mongodb://localhost:27000/test');

  // When the mongodb server goes down, the driver emits a 'close' event
  db.on('close', () => { console.log('-> lost connection'); });
  // The driver tries to automatically reconnect by default, so when the
  // server starts the driver will reconnect and emit a 'reconnect' event.
  db.on('reconnect', () => { console.log('-> reconnected'); });

  // Stopping the server will emit a 'close' event
  await server.stop();
  console.log('stopped server');

  await new Promise(resolve => setTimeout(() => resolve(), 2000));

  // Restarting the server will emit the 'reconnect' event
  await server.start();
  console.log('restarted server');
}
```

The driver events are useful for logging and alerting. You should take action
and alert someone when connection is lost.

The driver has some subtleties about how it handles database operations while
the driver is not connected. For example, if you run a `findOne()` query in
the above script after the script stops the server but before it restarts the
server, you'll see that query doesn't execute until **after** the driver
reconnects.

```javascript
// Stopping the server will emit a 'close' event
await server.stop();
console.log('stopped server');

await new Promise(resolve => setTimeout(() => resolve(), 2000));

// Using callback by design, because when the driver is disconnected
// it "buffers" operations. If the 'close' event was emitted, the driver
// will hold all operations until it reconnects, so "Finished query"
// won't print until **after** "restarted server"
db.collection('Test').findOne({}, function(error) {
  console.log('Finished query', error);
});

await new Promise(resolve => setTimeout(() => resolve(), 2000));

// Restarting the server will emit the 'reconnect' event
await server.start();
console.log('restarted server');
```

This buffering behavior can be confusing, but thankfully you can turn it off
with the [`bufferMaxEntries` option to `MongoClient.connect()`](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect).

```javascript
// Connect to the server
const db = await mongodb.MongoClient.connect('mongodb://localhost:27000/test', {
  // Turn off all buffering, error immediately if disconnected
  bufferMaxEntries: 0
});

db.on('close', () => { console.log('-> lost connection'); });
db.on('reconnect', () => { console.log('-> reconnected'); });

await server.stop();
console.log('stopped server');

await new Promise(resolve => setTimeout(() => resolve(), 2000));

db.collection('Test').findOne({}, function(error) {
  // Will get a "no connection available for operation" error, prints
  // **before** "restarted server" because of `bufferMaxEntries: 0`
  console.log('Finished query', error);
});

await new Promise(resolve => setTimeout(() => resolve(), 2000));

// Restarting the server will emit the 'reconnect' event
await server.start();
console.log('restarted server');
```

Buffering will send operations to the server when the driver reconnects, or return an error if the driver gave up trying to reconnect. By default, the MongoDB driver
stops trying to reconnect to a single server after 30 seconds. Specifically, the driver will
retry `reconnectTries` times every `reconnectInterval` milliseconds (both options to [the `MongoClient.connect()` function](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect) ) and give up when it runs out of `reconnectTries`. To see this in action, let's reduce `reconnectTries` and `reconnectInterval` so the driver gives up trying to reconnect after 1 second. Any buffered queries will give back a 'failed to reconnect' error, and the driver will emit a 'reconnectFailed' event.

```javascript
// Connect to the server
const db = await mongodb.MongoClient.connect('mongodb://localhost:27000/test', {
  reconnectTries: 2,
  reconnectInterval: 500
});

db.on('close', () => { console.log('-> lost connection'); });
// This event is unfortunately not bubbled up to the db handle correctly,
// see https://github.com/mongodb/node-mongodb-native/pull/1545
// This event is emitted when the driver ran out of `reconnectTries`. At this
// point you should either crash your app or manually try to reconnect.
db.s.topology.on('reconnectFailed', () => { console.log('-> gave up reconnecting'); });
db.on('reconnect', () => { console.log('-> reconnected'); });

await server.stop();
console.log('stopped server');

await new Promise(resolve => setTimeout(() => resolve(), 100));

db.collection('Test').findOne({}, function(error) {
  // Will get error: failed to reconnect after 2 attempts with interval 500 ms
  console.log('Finished query', error);
});

await new Promise(resolve => setTimeout(() => resolve(), 2000));

// Will **not** get 'reconnect' event, because the driver already gave up
await server.start();
console.log('restarted server');
```

When you get the 'reconnectFailed' event, you should crash your application or manually reconnect, because your db handle will never finish reconnecting. You should tune `reconnectTries` to something that makes sense for you. Some prefer to set it to `Number.MAX_VALUE` so the driver will continue trying to reconnect forever. Others prefer to make it relatively small and start crashing their application so their alerting can kick in. If you choose to make `reconnectTries` large enough that the driver will continue to try to reconnect forever, I would recommend you shut off buffering by setting `bufferMaxEntries: 0`, because otherwise you'll have database operations that can be queued up for arbitrarily long periods of time.

Replica Set Outages
-------------------

The driver handles [replica set connections](http://mongodb.github.io/node-mongodb-native/2.2/api/ReplSet.html) very differently from how it handles single server connections. Even connecting to a one node replica set is different from connecting to a standalone server. One caveat is that when one server disconnects, you might still be able to read and write depending on your read preference, so when dealing with replica sets the important events are 'left' and 'joined', reflecting when a server joins or leaves the replica set.

The general idea of these events is that when you get a 'left' event with `data === 'primary'` that means the replica set has no primary, so writes will get buffered, or fail if you disabled buffering. Then, when you get a 'joined' event with `data === 'primary'` the replica set now has a primary and you can execute writes again. Here's an example of the events that get emitted when the primary gets shut down.

```javascript
const { ReplSet } = require('mongodb-topology-manager');
const { inspect } = require('util');
const mongodb = require('mongodb');

run().catch(error => console.error(error));

async function run() {
  const bind_ip = 'localhost';
  // Starts a 3-node replica set on ports 31000, 31001, 31002, replica set
  // name is "rs0".
  const replSet = new ReplSet('mongod', [
    { options: { port: 31000, dbpath: `${__dirname}/data/db/31000`, bind_ip } },
    { options: { port: 31001, dbpath: `${__dirname}/data/db/31001`, bind_ip } },
    { options: { port: 31002, dbpath: `${__dirname}/data/db/31002`, bind_ip } }
  ], { replSet: 'rs0' });

  await replSet.purge();
  await replSet.start();
  console.log('Replica set started...');

  // Connect to the replica set
  const db = await mongodb.MongoClient.connect('mongodb://localhost:31000,localhost:31001,localhost:31002/test?replicaSet=rs0');

  // These are the events you get for monitoring a replica set.
  // * left: a server left the replica set, maybe disconnected
  // * joined: a new server joined the replica set, maybe a reconnection
  // * fullsetup: initial connection succeeded
  db.s.topology.on('left', data => console.log('-> left', data));
  db.s.topology.on('joined', data => console.log('-> joined', data));
  db.on('fullsetup', () => console.log('-> all servers connected'));

  // Get a reference to the primary node in the replica set
  const primary = await replSet.primary();

  // Start a query when the replica set primary is removed
  db.s.topology.once('left', () => {
    db.collection('Test').findOne({}, function(error) {
      console.log('Finished findOne', error);
    });
  });

  // Remove the primary and run the query. Query will buffer
  console.log('removing primary...');
  // Will print '-> left primary' and then '-> joined primary' later
  // once the replica set has elected a new primary.
  // If you're interested in MongoDB's consensus protocol, check out
  // http://bit.ly/2fPir9f
  await replSet.removeMember(primary);

  console.log('done');
}
```

Replica set connections are still subject to buffering by default, so the `findOne()` query above will hang until a the replica set elects a new primary (modulo [read preferences](https://docs.mongodb.com/manual/core/read-preference/) ). You can set `bufferMaxEntries: 0` on a replica set connection as well to fail fast when there's no connection available.

```javascript
mongodb.MongoClient.connect('mongodb://localhost:31000,localhost:31001,localhost:31002/test?replicaSet=rs0', {
  // With this option, above script will fail with "no connection available for operation"
  bufferMaxEntries: 0
});
```

Being cognizant of buffering is especially important for replica set connections because by default the MongoDB driver will **never** stop trying to reconnect to a replica set. There is no equivalent to the single server 'reconnectFailed' event for replica sets because the driver will continue trying to reconnect indefinitely. Even if you shut down the entire replica set and restart it later, the driver will keep trying to reconnect and keep buffering your requests.

```javascript
const { ReplSet } = require('mongodb-topology-manager');
const { inspect } = require('util');
const mongodb = require('mongodb');

run().catch(error => console.error(error));

async function run() {
  const bind_ip = 'localhost';
  // Starts a 3-node replica set on ports 31000, 31001, 31002, replica set
  // name is "rs0".
  const replSet = new ReplSet('mongod', [
    { options: { port: 31000, dbpath: `${__dirname}/data/db/31000`, bind_ip } },
    { options: { port: 31001, dbpath: `${__dirname}/data/db/31001`, bind_ip } },
    { options: { port: 31002, dbpath: `${__dirname}/data/db/31002`, bind_ip } }
  ], { replSet: 'rs0' });

  await replSet.purge();
  await replSet.start();
  console.log('Replica set started...');

  // Connect to the replica set
  const db = await mongodb.MongoClient.connect('mongodb://localhost:31000,localhost:31001,localhost:31002/test?replicaSet=rs0');

  // These are the events you get for monitoring a replica set.
  // * left: a server left the replica set, maybe disconnected
  // * joined: a new server joined the replica set, maybe a reconnection
  // * fullsetup: initial connection succeeded
  db.s.topology.on('left', data => console.log('-> left', data));
  db.s.topology.on('joined', data => console.log('-> joined', data));
  db.on('fullsetup', () => console.log('-> all servers connected'));

  await replSet.stop();

  db.collection('Test').findOne({}, function(error) {
    // Will be buffered for 45 seconds
    console.log('Finished findOne', error);
  });

  // Wait 45 seconds before restarting the replica set
  await new Promise(resolve => setTimeout(() => resolve(), 45000));

  console.log('restarting');
  await replSet.restart();
  console.log('done');
}
```

A final note: the MongoDB driver has an [`autoReconnect` option](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect) that is on by default. You can turn it off to make it so that the MongoDB driver never tries to reconnect. However, turning this option off is almost always wrong and should only be done if you're an advanced user with a very good reason to do so. If you're looking to make your MongoDB queries fail fast when connection is lost, `bufferMaxEntries: 0` is the right way to do it, **not** `autoReconnect: false`.

Moving On
---------

The MongoDB Node.js driver is very good about handling connection issues automatically. If you lose a node in your replica set or you restart your single server, the driver will usually recover on its own with no external help needed. You do need to be aware of the 'reconnectFailed' event and the 'reconnectTries' and 'reconnectInterval' options when you're connected to a single server. In particular, the 'reconnectFailed' event means the driver has given up trying to reconnect and you should surface this as a fatal error unless you have a good reason not to. You may also want to disable buffering (`bufferMaxEntries: 0`) if you want your database requests to fail fast rather than waiting for the driver to reconnect for use cases like [HTTP-based health checks](https://mesosphere.github.io/marathon/docs/health-checks.html).
