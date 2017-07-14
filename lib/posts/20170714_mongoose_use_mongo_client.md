[Mongoose 4.11](https://github.com/Automattic/mongoose/blob/master/History.md#4110--2017-06-25) introduced an important new option to work around a major deprecation. The [`useMongoClient` option](http://mongoosejs.com/docs/connections.html#use-mongo-client) is the source of the ['`open()` is deprecated in mongoose' deprecation warning that has caused so much discussion](https://github.com/Automattic/mongoose/issues/5399). This option opts you in to using Mongoose 4.11's simplified initial connection logic and allows you to avoid getting a [deprecation warning from the underyling MongoDB driver](https://github.com/Automattic/mongoose/issues/5304).

Why is This Option Necessary?
-----------------------------

Mongoose 4.10 users who used auth (which should be [everyone that uses Mongoose in production, right?](https://blog.shodan.io/its-the-data-stupid/)) started seeing the following deprecation warning:

```
Db.prototype.authenticate method will no longer be available in the next major release 3.x as MongoDB 3.6 will only allow auth against users in the admin db and will no longer allow multiple credentials on a socket. Please authenticate using MongoClient.connect with auth credentials.
```

This warning comes from the [MongoDB Node.js driver](https://www.npmjs.com/package/mongodb). Currently, connecting and authenticating are distinct operations in MongoDB. You can connect to your database and then authenticate later, which is [what mongoose 4.x does by default](https://github.com/Automattic/mongoose/blob/c703010f2b42f7a124e64889111f8e767081f089/lib/connection.js#L690). You can even authenticate as multiple different users on the same connection.

As far as I understand, MongoDB is planning on removing this functionality in 3.6 and consolidating connecting and authenticating into one single operation. Keep in mind that I am **not** currently a MongoDB employee and do **not** speak for the company as a whole, my interpretation of this may not be entirely correct.

However, my understanding is that mongoose will **not** be able to authenticate against MongoDB 3.6 without the `useMongoClient` option. At the time of this writing, the release date for MongoDB 3.6 has not been announced yet. But I recommend you upgrade to mongoose 4.11 and start using `useMongoClient` as soon as possible, because to the best of my knowledge you will be able to use MongoDB 3.6 without it.

Using `useMongoClient`
----------------------

First, it's important to note that `useMongoClient` only affects **initial** connection. Once you have successfully connected to MongoDB, your code should not have to do anything differently. If this is not the case, please [report a bug on the mongoose GitHub page](https://github.com/Automattic/mongoose/issues).

Secondly, as long as you're using mongoose 4.x and you're using MongoDB 3.4 or earlier, your existing connection code will continue to work. You will see the deprecation warning, but mongoose is committed to following [semver](http://semver.org/), so you can safely ignore this warning until mongoose 5.x and MongoDB 3.6 are released and you choose to upgrade.

The `useMongoClient` option is for `mongoose.connect()` and `mongoose.createConnection()`.
If you use `mongoose.connect()`, you don't have to change much:

```javascript
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

// Connect to MongoDB on localhost:27017
mongoose.connect('mongodb://localhost:27017/test', { useMongoClient: true });

// Create a model and insert a new doc
const Test = mongoose.model('Test', new mongoose.Schema({ name: String }));
Test.create({ name: 'Val' }).then(doc => console.log(doc));
```

You can also use [async/await](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js):

```javascript
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

async function run() {
  // With `useMongoClient`, `mongoose.connect()` returns a thenable
  await mongoose.connect('mongodb://localhost:27017/test', { useMongoClient: true });

  const Test = mongoose.model('Test', new mongoose.Schema({ name: String }));
  const doc = await Test.create({ name: 'Val' });
  console.log(doc);
}

run().catch(error => console.error(error.stack));
```

The `createConnection()` also works similarly. The difference is that, with mongoose >= 4.11.2 (but **not** 4.11.0 or 4.11.1 because of a bug) you can start using the returned connection object. You can optionally `await` on the returned connection to wait for initial connection.

```javascript
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

async function run() {
  // Can start using `conn` directly, or use `await mongoose.createConnection()`
  // to wait for initial connection to finish
  const conn = mongoose.createConnection('mongodb://localhost:27017/test', {
    useMongoClient: true
  });

  const Test = conn.model('Test', new mongoose.Schema({ name: String }));
  const doc = await Test.create({ name: 'Val' });
  console.log(doc);
}

run().catch(error => console.error(error.stack));
```

If you use `open()` or `openSet()` directly, you should instead use `openUri()`:

```javascript
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

async function run() {
  // `open()` and `openSet()` are deprecated and will go await in mongoose 5.x
  // use `openUri()` instead
  const conn = await mongoose.createConnection().openUri('mongodb://localhost:27017/test');

  const Test = conn.model('Test', new mongoose.Schema({ name: String }));
  const doc = await Test.create({ name: 'Val' });
  console.log(doc);
}

run().catch(error => console.error(error.stack));
```

Moving On
---------

The `useMongoClient` option is a big change, but a necessary one for mongoose to support MongoDB 3.6. MongoDB 3.6 has no scheduled release date yet, so switching is not pressing. However, I recommend you start using `useMongoClient` as soon as possible and report any issues that come up on [mongoose's GitHub issues page](https://github.com/Automattic/mongoose/issues).
