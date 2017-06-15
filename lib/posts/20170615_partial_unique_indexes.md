You might remember [locking](https://en.wikipedia.org/wiki/Lock_%28computer_science%29) from your undergrad systems programming class. Locks help when multiple threads that can be interrupted at any time access a shared resource. In distributed programming (like building a Node.js server that talks to a database) you have a similar problem: parallel operations can mutate documents in the database in conflicting ways. In particular, enforcing uniqueness, such as making sure only one user has a given email, is tricky.

For example, consider [mongoose-unique-validator](https://www.npmjs.com/package/mongoose-unique-validator), a [mongoose](https://www.npmjs.com/package/mongoose) plugin which has a [well-known race condition](https://www.npmjs.com/package/mongoose-unique-validator#caveats). The goal of mongoose-unique-validator is simple enough: enforce that a given path, say a user's `email` property, is unique across the collection. [The way this plugin enforces uniqueness](https://github.com/blakehaswell/mongoose-unique-validator/blob/547fa91/index.js#L110-L112) is simple, do a `find()` for documents that have the same email and throw an error if there are any. The below `insertUser` function is a drastically simplified example of mongoose-unique-validator's approach to enforcing uniqueness:

```javascript
const { MongoClient } = require('mongodb');
const assert = require('assert');

async function insertUser(db, user) {
  const count = await db.collection('User').count({ email: user.email });
  assert.equal(count, 0, `There is already a user with email ${user.email}`);

  return db.collection('User').insertOne(user);
}

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017');
  await db.dropDatabase();

  await insertUser(db, { email: 'test@test.co' });
  // Throws an error, because there is already a user with this email
  await insertUser(db, { email: 'test@test.co' });
}

run().catch(error => console.error(error));
```

In most practical cases this works, however, there's always that nasty edge case of multiple requests in parallel (imagine a user double-clicking on a button that triggers a request). I don't mean to disparage mongoose-unique-validator, it is a useful plugin in many cases, and I'm well aware that enabling developers to provide a pristine user experience often requires trade-offs. Time and skill are tragically scarce resources, so think carefully about what you really need before choosing a tool.

```javascript
const { MongoClient } = require('mongodb');
const assert = require('assert');

async function insertUser(db, user) {
  const count = await db.collection('User').count({ email: user.email });
  assert.equal(count, 0, `There is already a user with email ${user.email}`);

  // Let's assume we do some other async stuff
  await new Promise(resolve => setTimeout(() => resolve(), 100));

  return db.collection('User').insertOne(user);
}

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017');
  await db.dropDatabase();

  // Will probably not throw an error (not strictly guaranteed),
  // because the `insertUser()` calls run in parallel, and both
  // `count()` checks will pass before either starts to insert
  await Promise.all([
    insertUser(db, { email: 'test@test.co' }),
    insertUser(db, { email: 'test@test.co' })
  ]);
}

run().catch(error => console.error(error));
```

Introducing Partial Unique Indexes
----------------------------------

You can solve the unique `email` problem with a [MongoDB unique index](https://docs.mongodb.com/manual/core/index-unique/). MongoDB then enforces internally that the user's email is unique, so you'll never get duplicates.

However, unique constraints can be more sophisticated. For example, how about if some users don't have email addresses, but those that do should be unique? MongoDB has [sparse indexes](https://docs.mongodb.com/manual/core/index-sparse/) for this case. A sparse unique index will enforce `email` uniqueness for documents where the `email` property exists (including `null` values).

```javascript
const { MongoClient } = require('mongodb');
const assert = require('assert');

async function insertUser(db, user) {
  return db.collection('User').insertOne(user);
}

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017');
  await db.dropDatabase();

  // Create a sparse unique index
  await db.collection('User').createIndex({ email: 1 }, { sparse: true, unique: true });

  await Promise.all([
    insertUser(db, {}),
    insertUser(db, {})
  ]);

  // Will always throw an error
  await Promise.all([
    insertUser(db, { email: 'test@test.co' }),
    insertUser(db, { email: 'test@test.co' })
  ]);
}

run().catch(error => console.error(error));
```

You can get even more fancy with unique constraints in MongoDB 3.2. For example, [Booster](https://www.trybooster.com/careers#openings) has a restriction that a given vehicle can have at most one active fuel request. MongoDB 3.2 introduced the notion of [partial indexes](https://docs.mongodb.com/manual/core/index-partial/#partial-index-with-unique-constraint). A partial index is a much more general sparse index, it can be defined for all documents that match a given query, subject to restrictions I'll discuss in the last section. Here's how you create a partial index to enforce `vehicleId` uniqueness for requests that have status 'ACTIVE'.

```javascript
const { MongoClient } = require('mongodb');

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017');
  await db.dropDatabase();

  await db.collection('FuelRequest').createIndex({ vehicleId: 1 }, {
    unique: true,
    partialFilterExpression: {
      status: { $eq: 'ACTIVE' }
    }
  });

  // Succeeds, because uniqueness only enforced for 'ACTIVE' requests
  await Promise.all([
    db.collection('FuelRequest').insertOne({ vehicleId: 1, status: 'COMPLETE' }),
    db.collection('FuelRequest').insertOne({ vehicleId: 1, status: 'COMPLETE' })
  ]);

  // Throws an error!
  await Promise.all([
    db.collection('FuelRequest').insertOne({ vehicleId: 1, status: 'ACTIVE' }),
    db.collection('FuelRequest').insertOne({ vehicleId: 1, status: 'ACTIVE' })
  ]);
}

run().catch(error => console.error(error));
```

A partial unique index with `$exists: true` is equivalent to a sparse unique index.

Limitations
-----------

Internally, Booster does **not** actually use partial unique indexes to enforce the one active request per vehicle constraint. We instead use a distributed locking mechanism around creating a request to prevent race conditions. Why? Because there's more request statuses under the hood that count as 'active' for the purposes of this constraint, and the query passed to `partialFilterExpression` [cannot contain `$in`](https://docs.mongodb.com/manual/core/index-partial/#create-a-partial-index). In other words, the below code will throw an error:

```javascript
const { MongoClient } = require('mongodb');

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017');
  await db.dropDatabase();

  // MongoError: unsupported expression in partial index: status $in [ "ACTIVE" "ANOTHER_STATUS" ]
  await db.collection('FuelRequest').createIndex({ vehicleId: 1 }, {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['ACTIVE', 'ANOTHER_STATUS'] }
    }
  });
}

run().catch(error => console.error(error));
```

Unfortunately, partial indexes only support an [extremely limited subset of MongoDB query operators](https://docs.mongodb.com/manual/core/index-partial/#create-a-partial-index). As of MongoDB 3.4, you can only use:

* `$exists: true`
* `$eq`
* `$gte`, `$gt`, `$lt`, `$lte`
* `$type`
* `$and` of the above operators

This means no `$in`, no `$regex`, and in general no way of matching multiple values. It also means no `$nin`, `$ne`, or `$exists: false`. Here's a few things that you **can't** do with partial unique indexes:

* Enforce that `email` is unique with the exception of administrators
* Enforce that a property is unique if it exists and is not `null`
* Enforce that a property is unique unless an `isArchived` property is true, unless you disallow `isArchived` being not defined

Moving On
---------

MongoDB partial indexes give you flexibility in specifying unique constraints, but they're very limited. Tools like [mongoose-unique-validator](https://www.npmjs.com/package/mongoose-unique-validator) give you more flexibility, but sacrifice strict uniqueness guarantees. In order to enforce sophisticated unique constraints, you need some notion of distributed locking, which I'll talk about in a future blog post.

*The most insightful book I've read recently is [The Intelligent Investor](https://www.amazon.com/gp/product/0060555661/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=0060555661&linkCode=as2&tag=codebarbarian-20&linkId=701c0f36e52ff5524195f33fa2af9298) by Warren Buffet's mentor Benjamin Graham ([non-affiliate link](https://www.amazon.com/Intelligent-Investor-Definitive-Investing-Essentials/dp/0060555661/ref=sr_1_1?ie=UTF8&qid=1497477194&sr=8-1&keywords=the+intelligent+investor)). It's given me a more rigorous perspective on the stock market and helped me see that there's more to stocks than lines moving up and down in response to media hype. If you're like me and distrustful of the hand-wavey hype of what passes for stock advice these days, you'll learn a lot from Graham's prudent and fundamentals-driven insights.*
