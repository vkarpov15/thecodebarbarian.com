[Transactions](https://www.mongodb.com/transactions) are undoubtedly the most
important new feature in [MongoDB 4.0](https://www.mongodb.com/mongodb-4.0).
MongoDB has supported [ACID for single document operations](https://docs.mongodb.com/manual/core/write-operations-atomicity/) for many years, and [denormalized data](http://thecodebarbarian.com/managing-embedded-documents-with-monogram) meant many apps didn't need transactions. However, for certain applications,
there's no way to escape the need for multi-document transactions. In this
article, I'll demonstrate using transactions with the [MongoDB Node.js driver](http://npmjs.com/package/mongodb) and [mongoose](https://www.npmjs.com/package/mongoose).

Transferring Money Between Accounts in Node.js
----------------------------------------------

[MongoDB currently only supports transactions on replica sets](https://docs.mongodb.com/manual/replication/#transactions), not standalone servers. To run a [local replica set for development](/introducing-run-rs-zero-config-mongodb-runner.html) on OSX or Linux, use npm to install [run-rs](https://www.npmjs.com/package/run-rs) globally and run `run-rs --version 4.0.0`. Run-rs will download MongoDB 4.0.0 for you.

```
$ npm install run-rs -g
$ run-rs --version 4.0.0
Purging database...
Running '/home/node/lib/node_modules/run-rs/4.0.0/mongod'
Starting replica set...
Started replica set on "mongodb://localhost:27017,localhost:27018,localhost:27019"
Connected to oplog
```

Once you have a MongoDB 4.0.0 replica set running, you'll also need [v3.1.0 of the MongoDB Node.js driver](https://www.npmjs.com/package/mongodb).

```
npm install mongodb@3.1
```

One example of an app that needs multi-document transactions is a bank account
app. If you transfer money from account `A` to account `B`, nobody should see an
in-between state where money has been deducted from account `A` but hasn't
been added to account `B`. And, if subtracting money from account `A` fails due
to insufficient funds, you shouldn't add money to account `B`.

In MongoDB, transactions are built on top of [sessions](https://docs.mongodb.com/manual/reference/server-sessions/). To
start a transaction, you first need to start a session using `client.startSession()`. You can then call the session's `startTransaction()`
method to start a transaction.

```javascript
[require:Transactions.*mongodb driver]
```

Transactions with Mongoose
--------------------------

To use transactions with [Mongoose](http://mongoosejs.com/), you need `mongoose >= 5.2.0`.

```
npm install mongoose@5.2
```

Transactions with Mongoose are similar to with the MongoDB driver. The big
difference is that, with Mongoose, [`startSession()` returns a promise rather than a session](http://mongoosejs.com/docs/api.html#startsession_startSession),
so you need to use `await`.

```javascript
[require:Transactions.*mongoose]
```

With both Mongoose and the MongoDB Node.js driver, MongoDB will report a
"WriteConflict" error if two transactions attempt to write conflicting data,
like if two `transfer()` calls attempt to transfer money from the same account
at the same time.

```javascript
[require:Transactions.*concurrent]
```

Moving On
---------

Transactions are the most important feature to land in MongoDB in recent memory.
The ability to execute multiple operations in isolation and potentially undo
all of them is useful for any app, not just apps that need to transfer currency
between accounts. For example, you can update denormalized data in multiple
collections and easily undo all the operations using `abortTransaction()` if
[schema validation](https://docs.mongodb.com/manual/core/schema-validation/) failed. So download [run-rs](https://www.npmjs.com/package/run-rs),
MongoDB driver 3.1.0, and Mongoose 5.2.0 and get started with transactions today!

_Transactions are much better with [async/await in Node.js](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js.html) so you can use `try/catch` rather than promise chaining.
If you're looking to get up to speed with async/await fast, check out
my new ebook, [Mastering Async/Await](http://asyncawait.net/)._

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
