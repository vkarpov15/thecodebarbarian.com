One of the major reasons for the mongoose 5 release was the [MongoDB driver removing support for the `authenticate()` function](https://github.com/mongodb/node-mongodb-native/blob/3.0.0/CHANGES_3.0.0.md#api-changes). Up until Mongoose 4.11, that function was the only way mongoose supported doing authentication. In Mongoose 4.11.0, we added the [annoying but necessary `useMongoClient` deprecation warning](https://github.com/Automattic/mongoose/blob/master/History.md#4110--2017-06-25), and in mongoose 5.0.0-rc0 we [deleted 686 lines of legacy connection logic](https://github.com/Automattic/mongoose/pull/5942/files#diff-259dec4414a400a6e895f16ff1d0ca3b) that removed the need for the `useMongoClient` option. In addition, we made a couple related improvements to the connection API that will make mongoose much cleaner to work with: we made `mongoose.connect()` always return a promise, and we added a global and connection-level `bufferCommands` option.

Consistently Return a Promise for `mongoose.connect()`
------------------------------------------------------

Here's a thought exercise for you: what happens when [JavaScript promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolves to itself?

```javascript
const promise = new Promise(resolve => {
  setImmediate(() => resolve(promise));
});
```

If you said "infinite recursion", you're right. Newer versions of Node.js actually catch chaining cycles like this and print a handy error:

```
TypeError: Chaining cycle detected for promise #<Promise>
```

We previously made `connect()` return a promise in [mongoose 4.4.0](https://github.com/Automattic/mongoose/blob/master/History.md#440--2016-02-02), but quickly realized this was a backwards breaking change because people [relied on](https://github.com/Automattic/mongoose/pull/3790#issuecomment-179335380) the fact that `mongoose.connect()` returned the mongoose singleton and fixed it in 4.4.1. But then, we also found that people also created [promise wrappers around `mongoose.connect()`](https://github.com/Automattic/mongoose/issues/3856) that relied on `mongoose.connect()` returning the mongoose singleton. So, in order to support `mongoose.connect()` returning something that was promise-like but also looked like `mongoose` we created [the `MongooseThenable` class](https://github.com/Automattic/mongoose/commit/0a04079472c6ba18bdbed8d423a6dd648f8f8161), which wrapped the mongoose singleton but also had a `.then()` and `.catch()` and resolved to the original mongoose singleton.

In mongoose 5, we cleaned up this spaghetti and made `mongoose.connect()` return a promise that resolves to the mongoose singleton.

```javascript
const mongoose = require('mongoose');

// Prints "Mongoose { ... }"
mongoose.connect('mongodb://localhost:27017/test').then(res => console.log(res));
```

This means you can no longer chain `.on()` or `.model()` onto `mongoose.connect()`:

```javascript
// No longer works in mongoose 5
mongoose.connect('mongodb://localhost:27017/test').connection.
  on('error', handleErr).
  model('Test', new Schema({ name: String }));

// Do this instead
mongoose.connect('mongodb://localhost:27017/test').catch(handleErr);
// Or this
mongoose.connect('mongodb://localhost:27017/test');
mongoose.connection.on('error', handleErr);
mongoose.model('Test', new Schema({ name: String }));
```

This also means `mongoose.connect()` now works nicely with [async/await](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js):

```javascript
const ret = await mongoose.connect('mongodb://localhost:27017/test');
ret === mongoose; // true
```

As for `mongoose.createConnection()`, mongoose still supports using the return value of `mongoose.createConnection()` as either a promise or as a connection.

```javascript
// Works
mongoose.createConnection().then(conn => conn.model('Test', schema));

// Also works
const conn = mongoose.createConnection();
conn.model('Test', schema);
```

Mongoose does this by deleting `conn.then()` before resolving the promise, so if you try to call `.then()` **after** the connection has successfully connected, you will get an error:

```javascript
const conn = mongoose.createConnection();
conn.then(() => {
  console.log(conn.then); // undefined
});
```

We don't believe this to be a major limitation, because `await` doesn't throw an error if `.then()` is not present. Please open up an [issue on GitHub](https://github.com/Automattic/mongoose/issues/new) if this causes problems for you.

```javascript
const conn = mongoose.createConnection();
console.log(conn.then); // [Function]
console.log(await conn); // The connection object
console.log(conn.then); // undefined
console.log(await conn); // The connection object
```

Global and Connection-Level `bufferCommands`
--------------------------------------------

Mongoose schemas have a [`bufferCommands` option](http://mongoosejs.com/docs/guide.html#bufferCommands) that disables mongoose buffering, which is the mechanism that queues up operations until connection is established.

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/test');

const schema = new mongoose.Schema({ name: String });
const User = mongoose.model('User', schema);

// Will still work, even though connection hasn't been established when
// `create()` is called
User.create({ name: 'Val' }).then(doc => console.log(doc));
```

In mongoose 4, you had to disable `bufferCommands` at the schema level, as well as disable the MongoDB driver's buffering mechanism by setting `bufferMaxEntries` at the connection level:

```javascript
const mongoose = require('mongoose');

// `bufferMaxEntries: 0` disables the MongoDB driver's buffering
// See http://mongodb.github.io/node-mongodb-native/3.0/api/MongoClient.html
mongoose.connect('mongodb://localhost:27017/test', { bufferMaxEntries: 0 });

const schema = new mongoose.Schema({ name: String }, { bufferCommands: false });
const User = mongoose.model('User', schema);

// Will throw an error because mongoose is not connected yet
User.create({ name: 'Val' }).then(doc => console.log(doc));
```

Disabling buffering is important if you want to report an error immediately if you try to execute an operation when mongoose is [disconnected because the MongoDB server is down](http://thecodebarbarian.com/mongoose-4.12-improved-connection-events#handling-single-server-outages). However, setting it on the schema level is inconvenient. In mongoose 5, you can set it on the individual connection:

```javascript
mongoose.connect('mongodb://localhost:27017/test', {
  bufferMaxEntries: 0, // MongoDB driver buffering
  bufferCommands: false // Mongoose-specific buffering
});
```

You can also globally disable buffering.

```javascript
mongoose.set('bufferCommands', false);

mongoose.connect('mongodb://localhost:27017/test', {
  bufferMaxEntries: 0 // MongoDB driver buffering
});
```

Keep in mind that the connection-level `bufferCommands` option overrides the global `bufferCommands` option, and schema-level `bufferCommands` overrides both.

```javascript
mongoose.set('bufferCommands', false); // Disable buffering globally
mongoose.connect('mongodb://localhost:27017/test', {
  bufferCommands: true // But enable it for this connection
});
mongoose.model('Test', new Schema({}, {
  bufferCommands: false // But disable it for this model
}));
```

Moving On
---------

[Mongoose 5.0.0](https://github.com/Automattic/mongoose/blob/master/History.md#500--2018-01-17) was formally released this week! These are just 2 of the 38 changes and improvements we've made for mongoose 5. You can find more details on the [backwards breaking changes in mongoose 5 on GitHub](https://github.com/Automattic/mongoose/blob/master/migrating_to_5.md). Download mongoose 5 with `npm install mongoose` and let us know what you think on [GitHub](https://github.com/Automattic/mongoose/issues).
