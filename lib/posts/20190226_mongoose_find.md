There's [some confusion](https://stackoverflow.com/questions/15852043/mongoose-find-how-to-access-the-result-documents) on the internet about what happens when you call [`Model.find()`](https://mongoosejs.com/docs/api.html#model_Model.find) in Mongoose. Make no mistake, `Model.find()` does what you expect: find all documents that match a query. But there's some confusion about `Model.find()` vs [`Query#find()`](https://mongoosejs.com/docs/api.html#query_Query-find), setting options, [promise](https://thecodebarbarian.com/write-your-own-node-js-promise-library-from-scratch.html) support. In this article, I'll provide a conceptual overview of what happens when you call `Model.find()` so you can answer similar questions for yourself.

Setup
-----

For the purposes of this article, I'll assume you already have a MongoDB instance
running on `localhost:27017`. If you don't, check out
[run-rs](https://www.npmjs.com/package/run-rs), it downloads and runs MongoDB
for you with no dependencies beyond Node.js. Here's a standalone script that
demonstrates creating some documents and using `find()`:

```javascript
const mongoose = require('mongoose');

run().catch(error => console.log(error.stack));

async function run() {
  await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true });

  // Clear the database every time. This is for the sake of example only,
  // don't do this in prod :)
  await mongoose.connection.dropDatabase();

  const customerSchema = new mongoose.Schema({ name: String, age: Number, email: String });
  const Customer = mongoose.model('Customer', customerSchema);

  await Customer.create({ name: 'A', age: 30, email: 'a@foo.bar' });
  await Customer.create({ name: 'B', age: 28, email: 'b@foo.bar' });

  // Find all customers
  const docs = await Customer.find();
  console.log(docs);
}
```

Models and Queries
------------------

Mongoose actually has two `find()` functions. The above standalone example uses
[`Model.find()`](https://mongoosejs.com/docs/api.html#model_Model.find), but
there's also [`Query#find()`](https://mongoosejs.com/docs/api.html#query_Query-find).
`Query#find()` is shorthand for `Query.prototype.find()`, `find()` is an instance
method on the [`Query` class](https://mongoosejs.com/docs/queries.html).

The `Model.find()` function returns an instance of Mongoose's `Query` class. The
`Query` class represents a raw CRUD operation that you may send to MongoDB.
It provides a [chainable](https://schier.co/blog/2013/11/14/method-chaining-in-javascript.html)
interface for building up more sophisticated queries. You don't instantiate a
`Query` directly, `Customer.find()` instantiates one for you.

```javascript
const query = Customer.find();
query instanceof mongoose.Query; // true
const docs = await query; // Get the documents
```

So `Model.find()` returns an instance of the `Query` class. You can chain `find()`
calls to add additional query operators, also known as filters, to the query.
For example, both of the following queries will find all customers whose
`email` contains 'foo.bar' and whose `age` is at least 30.

```javascript
// First parameter to `find()` is an object that contains query operators, see:
// https://docs.mongodb.com/manual/reference/operator/query/
Customer.find({ email: /foo\.bar/, age: { $gte: 30 } });
// Equivalent:
Customer.find({ email: /foo\.bar/ }).find({ age: { $gte: 30 } });
```

Query objects have [numerous helpers](https://mongoosejs.com/docs/api.html#query_Query)
for building up sophisticated CRUD operations. The most commonly used ones are
[`Query#sort()`](https://mongoosejs.com/docs/api.html#query_Query-sort),
[`Query#limit()`](https://mongoosejs.com/docs/api.html#query_Query-limit), and
[`Query#skip()`](https://mongoosejs.com/docs/api.html#query_Query-skip).

```javascript
// Find the customer whose name comes first in alphabetical order, in
// this case 'A'. Use `{ name: -1 }` to sort by name in reverse order.
const res = await Customer.find({}).sort({ name: 1 }).limit(1);

// Find the customer whose name comes _second_ in alphabetical order, in
// this case 'B'
const res2 = await Customer.find({}).sort({ name: 1 }).skip(1).limit(1);
```

One major advantage of using Mongoose is that Mongoose casts queries to match
the model's [schema](https://mongoosejs.com/docs/guide.html). This means you
don't explicitly need to convert strings to [ObjectIds](https://docs.mongodb.com/manual/reference/method/ObjectId/)
or worry about the [nuances of converting strings to numbers](http://thecodebarbarian.com/convert-a-string-to-a-number-in-javascript.html).

```javascript
// Mongoose will convert `_id` from a string to an ObjectId, and `age.$gte`
// into a number, or throw an error if it failed to convert these values.
Customer.find({ _id: res[0]._id.toHexString(), age: { $gte: '25' } });
```

Setting Options
---------------

The `sort()`, `limit()`, and `skip()` helpers modify the query's
[options](https://mongoosejs.com/docs/api.html#query_Query-getOptions). For
example, `query.getOptions()` below will return an object that contains `sort`
and `limit` properties.

```javascript
const query = Customer.find().sort({ name: 1 }).limit(1);
query.getOptions(); // { sort: { name: 1 }, limit: 1 }
```

The `Model.find()` function takes 3 arguments that help you initialize a query
without chaining. The first argument is the query filter (also known as `conditions`).
The 2nd argument is the [query _projection_](https://docs.mongodb.com/manual/reference/operator/projection/positional/),
which defines what fields to include or exclude from the query. For example, if
you want to exclude the customer's `email` for privacy concerns, you can use
either of the below syntaxes.

```javascript
// Explicitly exclude `email` using the 2nd argument. Use `email: 1` to
// include _only_ the `email` property.
Customer.find({}, { email: 0 });
// Equivalent approach using chaining
Customer.find().select({ email: 0 });
```

The 3rd argument to `Model.find()` is the [general query options](https://mongoosejs.com/docs/api.html#query_Query-getOptions). Here's a
[full list of options](https://mongoosejs.com/docs/api.html#query_Query-setOptions).
For example, you can set `limit` and `skip` in the 3rd argument.

```javascript
const res = await Customer.find({}, null, { sort: { name: 1 }, limit: 1 });
res[0].name; // 'A'
```

Note that Mongoose's `Model.find()` has a different function signature than the
[MongoDB driver's `collection.find()` function](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#find).
The MongoDB driver only takes 2 arguments, `filter` and `options`. To convert
a MongoDB driver `find()` call to a Mongoose `Model.find()` call without chaining,
add `null` as the 2nd argument.

```javascript
// MongoDB driver query
client.db().collection('customers').find({ email: /foo\.bar/ }, { limit: 1 });
// Equivalent Mongoose query
Customer.find({ email: /foo\.bar/ }, null, { limit: 1 });
// Equivalent Mongoose query using chaining
Customer.find({ email: /foo\.bar/ }).limit(1);
```

Promises and [Async/Await](http://asyncawait.net/)
------------------------

`Model.find()` returns a query instance, so why can you do `await Model.find()`?
That's because a Mongoose query is a
[thenable](https://developers.google.com/web/fundamentals/primers/promises#promise-terminology),
meaning they have a [`then()` function](https://mongoosejs.com/docs/api.html#query_Query-then).
That means you can use queries in the same way you use promises, including with
[promise chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#Chaining)
as shown below.

```javascript
Customer.find({ name: 'A' }).
  then(customers => {              
    console.log(customers[0].name); // 'A'
    return Customer.find({ name: 'B' });
  }).
  then(customers => {
    console.log(customers[0].name); // 'B'
  });
```

Queries also have a [`catch()` function](https://mongoosejs.com/docs/api.html#query_Query-catch).
In general, a thenable doesn't need to have a `catch()` function, but Mongoose
added one for your convenience. Below is an example of using `catch()` to handle
a [malformed number](https://mongoosejs.com/docs/schematypes.html#numbers)
in your query.

```javascript
// Caught: Cast to number failed for value "not a number" at path "age" for
// model "Customer"
Customer.find({ age: 'not a number' }).
  catch(err => console.log('Caught:', err.message));
```

Queries are thenables, but [queries are **not** promises](https://mongoosejs.com/docs/queries.html#queries-are-not-promises).
In some cases, you might need a promise, not just a thenable. For example, you
may have strict TypeScript bindings or you may be [using the `cls-hooked` module](https://github.com/Automattic/mongoose/issues/7292). The [`Query#exec()` function](https://mongoosejs.com/docs/api.html#query_Query-exec)
returns a fully fledged promise.

```javascript
const q = Customer.find();
q instanceof Promise; // false
q.exec() instanceof Promise; // true
```

Moving On
---------

Finding all documents that match a query in Mongoose is intuitive, but there's
nuances that pop up once you go beyond the most basic queries. Mongoose lets you
structure queries using chaining or, equivalently, using POJOs in a single
function call. `Model.find()` returns a query, which has a separate `find()`
method that lets you attach additional filters. Queries are not promises,
but close enough for most practical uses. Remember these 3 concepts and you'll
know enough to address most common Mongoose issues.

_Mongoose supports async/await, but its common companion [Express](http://expressjs.com/) surprisingly doesn't. Want to know how to determine whether your favorite npm modules support async/await without reconciling contradictory answers on StackOverflow? Chapter 4 of [Mastering Async/Await](http://asyncawait.net/) explains the core principles for determining whether a given library or framework supports async/await, so get the ebook today!_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
