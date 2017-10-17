I previously wrote about [handling the database server going down with the MongoDB Node.js driver](http://thecodebarbarian.com/managing-connections-with-the-mongodb-node-driver.html).
However, I didn't cover [mongoose](https://www.npmjs.com/package/mongoose) because there
were a couple outstanding pull requests for mongoose that would require changes to the
article. In particular, connections in mongoose 4.12 [emit the `reconnectFailed` event](https://github.com/Automattic/mongoose/blob/master/History.md#4120--2017-10-02).
With that in mind, let's dig in to how mongoose reacts when your backend MongoDB
topology goes down.

Handling Single Server Outages
------------------------------

For this article, I'll use the [mongodb-topology-manager](https://www.npmjs.com/package/mongodb-topology-manager) package to
stop and start MongoDB. I'll also use the [`useMongoClient` option](http://mongoosejs.com/docs/connections.html#use-mongo-client) to make connection
options cleaner and more consistent with the MongoDB Node.js driver.

Let's see what happens when the MongoDB server that mongoose is connected to
shuts down. The [mongoose connection](http://mongoosejs.com/docs/connections.html)
will emit a 'disconnected' event when it loses connection, and 'reconnect' and 'connected'
events when connection is reestablished. Mongoose uses the [MongoDB driver to manage connections](http://thecodebarbarian.com/managing-connections-with-the-mongodb-node-driver.html), so it will automatically try to reconnect in the same way the MongoDB driver does.
Note that these events only get fired for a single server or mongos, **not** when you're connected to a replica set (more on that later). Here's a script that uses the topology manager to stop/start a MongoDB instance so you can see these events actually fire:

```javascript
const { Server } = require('mongodb-topology-manager');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

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
  await mongoose.connect('mongodb://localhost:27000/test', { useMongoClient: true });

  // When the mongodb server goes down, mongoose emits a 'disconnected' event
  mongoose.connection.on('disconnected', () => { console.log('-> lost connection'); });
  // The driver tries to automatically reconnect by default, so when the
  // server starts the driver will reconnect and emit a 'reconnect' event.
  mongoose.connection.on('reconnect', () => { console.log('-> reconnected'); });

  // Mongoose will also emit a 'connected' event along with 'reconnect'. These
  // events are interchangeable.
  mongoose.connection.on('connected', () => { console.log('-> connected'); });

  // Stopping the server will emit a 'disconnected' event
  await server.stop();
  console.log('stopped server');

  await new Promise(resolve => setTimeout(() => resolve(), 2000));

  // Restarting the server will emit the 'reconnect' and 'connected' events
  await server.start();
  console.log('restarted server');
}
```

Mongoose and the MongoDB driver both do connection buffering, so you need to shut
both buffering mechanisms off to make your database operations fail fast when
mongoose is not connected. By default, mongoose will wait until you reconnect
before actually executing an operation. For example, the below `findOne()` callback
will execute **after** the 'reconnect' event is emitted.

```javascript
// When the mongodb server goes down, mongoose emits a 'disconnected' event
mongoose.connection.on('disconnected', () => { console.log('-> lost connection'); });
// The driver tries to automatically reconnect by default, so when the
// server starts the driver will reconnect and emit a 'reconnect' event.
mongoose.connection.on('reconnect', () => { console.log('-> reconnected'); });

// Mongoose will also emit a 'connected' event along with 'reconnect'. These
// events are interchangeable.
mongoose.connection.on('connected', () => { console.log('-> connected'); });

const MyModel = mongoose.model('Test', new mongoose.Schema({}));

// Stopping the server will emit a 'disconnected' event
await server.stop();
console.log('stopped server');

// Using callback by design, because when the driver is disconnected
// it "buffers" operations. If the 'disconnected' event was emitted, the driver
// will hold all operations until it reconnects, so "Finished query"
// won't print until **after** "restarted server" **and** "connected"
MyModel.findOne({}, function(error) {
  console.log('Finished query', error);
});

await new Promise(resolve => setTimeout(() => resolve(), 2000));

// Restarting the server will emit the 'reconnect' and 'connected' events
await server.start();
console.log('restarted server');
```

In order to shut off buffering, you need to shut off both [mongoose buffering](http://mongoosejs.com/docs/connections.html#buffering) and [MongoDB Node.js driver buffering](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect).
We have an issue open on [GitHub regarding consolidating buffering options](https://github.com/Automattic/mongoose/issues/5720), so please feel free to comment on this issue on the GitHub comment thread. Below is an example of how you
can shut off both buffering mechanisms and make your database operations fail
fast when mongoose is not connected.

```javascript
// Connect to the server
await mongoose.connect('mongodb://localhost:27000/test', {
  useMongoClient: true,
  bufferMaxEntries: 0 // Shut off the MongoDB driver's buffering mechanism
});

mongoose.connection.on('disconnected', () => { console.log('-> lost connection'); });
mongoose.connection.on('reconnect', () => { console.log('-> reconnected'); });
mongoose.connection.on('connected', () => { console.log('-> connected'); });

// Shut off mongoose's buffering mechanism
const schemaOptions = { bufferCommands: false };
const MyModel = mongoose.model('Test', new mongoose.Schema({}, schemaOptions));

// Stopping the server will emit a 'disconnected' event
await server.stop();
console.log('stopped server');

// Because both mongoose and mongodb driver have buffering disabled, this
// will fail with an error "MongoError: no connection available for operation"
MyModel.findOne({}, function(error) {
  console.log('Finished query', error);
});

await new Promise(resolve => setTimeout(() => resolve(), 2000));

// Restarting the server will emit the 'reconnect' and 'connected' events
await server.start();
console.log('restarted server');
```

The `reconnectFailed` event
---------------------------

There are two important options for tuning how long the MongoDB driver tries to
reconnect to a single server before giving up: [`reconnectTries` and `reconnectInterval`](http://mongoosejs.com/docs/connections.html#options).
When connected to a single server and the single server goes down, the
MongoDB Node.js driver will try to reconnect every `reconnectInterval` milliseconds `reconnectTries` times, and give up after it runs out of retry attempts. When the driver gives up reconnecting, it [emits a 'reconnectFailed' event](https://github.com/mongodb/node-mongodb-native/pull/1545).
Mongoose 4.12 now [properly surfaces the 'reconnectFailed' from the mongoose connection](https://github.com/Automattic/mongoose/blob/master/History.md#4120--2017-10-02). You can access this event in mongoose 4.11, but you need to reach into the underlying MongoDB driver to get it. Mongoose 4.12 makes it just another connection event.

Keep in mind that when 'reconnectFailed' is emitted, this means that mongoose will
**never** reconnect to your server, even if the server restarts. The 'reconnectFailed'
emit is likely a fatal error for your application, it means your database connection
will not be re-established without your intervention.

Here's an example of setting `reconnectTries` and `reconnectInterval`. The below example executes 2 queries, one while the driver is trying to reconnect and one after the driver gave up trying to reconnect. The query that runs while the driver is trying to reconnect will hang until the driver has emitted 'reconnectFailed', and then give back a 'MongoError: failed to reconnect after 2 attempts with interval 100 ms' error.
The query that runs after the driver gave up trying to reconnect will immediately give back a 'MongoError: Topology was destroyed' error.

```javascript
// Connect to the server
await mongoose.connect('mongodb://localhost:27000/test', {
  useMongoClient: true,
  // Below means driver will make 2 attempts to reconnect at 100ms intervals,
  // and emit 'reconnectFailed' if it ran out of retries
  reconnectTries: 2,
  reconnectInterval: 100
});

mongoose.connection.on('disconnected', () => { console.log('-> lost connection'); });
mongoose.connection.on('reconnect', () => { console.log('-> reconnected'); });
mongoose.connection.on('connected', () => { console.log('-> connected'); });
mongoose.connection.on('reconnectFailed', () => { console.log('-> gave up reconnecting'); });

const MyModel = mongoose.model('Test', new mongoose.Schema({}));

// Stopping the server will emit a 'disconnected' event
await server.stop();
console.log('stopped server');

// This query will start while the driver is trying to reconnect. The operation will
// buffer until the server gives up trying to reconnect, and will then get an error
// "MongoError: failed to reconnect after 2 attempts with interval 100 ms"
MyModel.findOne({}, function(error) {
  console.log('Finished query', error);
});

// Should get the 'reconnectFailed' event somewhere in this interval
await new Promise(resolve => setTimeout(() => resolve(), 2000));

// Restarting the server will emit the 'reconnect' and 'connected' events
await server.start();
console.log('restarted server');

// Because driver gave up trying to reconnect, will get a "MongoError: Topology was destroyed"
MyModel.findOne({}, function(error) {
  console.log('Finished second query', error);
});
```

Moving On
---------

Mongoose 4.12 has 8 new features, including the 'reconnectFailed' event and [single embedded discriminators](http://thecodebarbarian.com/mongoose-4.12-single-embedded-discriminators.html). Make sure you upgrade to take advantage of the completed discriminator API and
improved connection monitoring!
