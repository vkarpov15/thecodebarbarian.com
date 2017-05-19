[Mongoose 4.10.0 just landed](https://github.com/Automattic/mongoose/blob/master/History.md#4100--2017-05-18) and brings with it several powerful features and bug fixes. The most +1-ed feature in this [supporting `unique` in array definitions](https://github.com/Automattic/mongoose/issues/3347) via the [mongoose-unique-array plugin](https://www.npmjs.com/package/mongoose-unique-array). This feature is implemented as a separate plugin because `mongoose-unique-array` does much more than [simply create a unique index](http://mongoosejs.com/docs/validation.html#the-unique-option-is-not-a-validator), it also ties in to validators and versioning. In this article, I'll explain how to use `mongoose-unique-array` and the caveats you need to be aware of when using it.

Why a Separate Plugin?
----------------------

In mongoose 4.10.0, you can create a model with an array of strings that are supposed to be unique. You don't need the `mongoose-unique-array` plugin to create a unique index on an array:

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/test');
mongoose.set('debug', true);

async function run() {
  await mongoose.connection.dropDatabase();

  const mySchema = new mongoose.Schema({
    names: [{ type: String, unique: true }]
  });
  const M = mongoose.model('Test', mySchema);

  // Need to wait for indexes to build, otherwise unique won't work!
  await new Promise((resolve, reject) => {
    M.once('index', err => err ? reject(err) : resolve());
  });

  // Will throw an error, because multiple documents have 'Test' in
  // their `names` array.
  await M.create([{ names: ['Test'] }, { names: ['Test'] }]);
  console.log('done');
}

run().catch(error => console.error(error.stack));
```

However, [MongoDB unique indexes do not prevent saving a document with duplicate values in the `names` array](https://docs.mongodb.com/manual/core/index-unique/#unique-constraint-across-separate-documents). MongoDB unique indexes prevent multiple documents from having the value 'Test' in their `names` arrays, but a single document can have duplicate values in `names`.

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/test');
mongoose.set('debug', true);

async function run() {
  await mongoose.connection.dropDatabase();

  const mySchema = new mongoose.Schema({
    names: [{ type: String, unique: true }]
  });
  const M = mongoose.model('Test', mySchema);

  // Need to wait for indexes to build, otherwise unique won't work!
  await new Promise((resolve, reject) => {
    M.once('index', err => err ? reject(err) : resolve());
  });

  // Works! Unique indexes do not prevent a single doc from having
  // duplicate values
  await M.create([{ names: ['Test', 'Test'] }]);
  console.log('done');
}

run().catch(error => console.error(error.stack));
```

The `mongoose-unique-array` plugin adds a [custom validator](http://mongoosejs.com/docs/validation.html#custom-validators) to the `names` array that makes sure the array has no duplicate values.

```javascript
const mongoose = require('mongoose');
const uniqueArrayPlugin = require('mongoose-unique-array');

mongoose.connect('mongodb://localhost:27017/test');
mongoose.set('debug', true);

async function run() {
  await mongoose.connection.dropDatabase();

  const mySchema = new mongoose.Schema({
    names: [{ type: String, unique: true }]
  });
  // Add the unique array plugin
  mySchema.plugin(uniqueArrayPlugin);
  const M = mongoose.model('Test', mySchema);

  // Need to wait for indexes to build, otherwise unique won't work!
  await new Promise((resolve, reject) => {
    M.once('index', err => err ? reject(err) : resolve());
  });

  // Throws a ValidationError. The plugin adds a validator to `names` that will
  // fail if there are duplicates.
  await M.create([{ names: ['Test', 'Test'] }]);
  console.log('done');
}

run().catch(error => console.error(error.stack));
```

This also works for [document arrays](http://mongoosejs.com/docs/subdocs.html):

```javascript
async function run() {
  await mongoose.connection.dropDatabase();

  const mySchema = new mongoose.Schema({
    names: [{ username: { type: String, unique: true } }]
  });
  // Add the unique array plugin
  mySchema.plugin(uniqueArrayPlugin);
  const M = mongoose.model('Test', mySchema);

  // Need to wait for indexes to build, otherwise unique won't work!
  await new Promise((resolve, reject) => {
    M.once('index', err => err ? reject(err) : resolve());
  });

  // Throws a ValidationError. The plugin adds a validator to `names`
  await M.create([{ names: [{ username: 'Test' }, { username: 'Test' }] }]);
  console.log('done');
}

run().catch(error => console.error(error.stack, error.errors));
```

Concurrency Caveats
-------------------

In the above cases, the entire array is in memory, so checking the array for duplicates is easy: mongoose just loops through the array. However, mongoose converts `.push()` into a [`$push` operation in MongoDB](https://docs.mongodb.com/manual/reference/operator/update/push/). In other words, if you use `push()` instead of overwriting the array each time, mongoose might not actually have the entire array in memory. In this case, the custom validator will not work.

```javascript
async function run() {
  await mongoose.connection.dropDatabase();

  const mySchema = new mongoose.Schema({
    names: [String]
  });
  const M = mongoose.model('Test', mySchema);

  await M.create([{ names: [] }]);
  const [doc1, doc2] = await Promise.all([M.findOne(), M.findOne()]);

  doc1.names.push('Test');
  await doc1.save();
  // Will print `[]`, doc2.names is empty even though doc1.names is not
  console.log('Before push', doc2.names);
  doc2.names.push('Test');
  await doc2.save();

  // The `names` array has 2 elements, `['Test', 'Test']`
  console.log(await M.findById(doc1._id));
}

run().catch(error => console.error(error.stack, error.errors));
```

To cope with this edge case, `mongoose-unique-array` modifies the query mongoose uses to `save()` the document. It also sets the `saveErrorIfNotFound` option on your schema so a `save()` that doesn't successfully modify a document throws an error.

```javascript
async function run() {
  await mongoose.connection.dropDatabase();

  const mySchema = new mongoose.Schema({
    names: [{ type: String, unique: true }]
  });
  // Make sure to add the plugin
  mySchema.plugin(uniqueArrayPlugin);
  const M = mongoose.model('Test', mySchema);

  // Need to wait for indexes to build, otherwise unique won't work!
  await new Promise((resolve, reject) => {
    M.once('index', err => err ? reject(err) : resolve());
  });

  await M.create([{ names: [] }]);
  const [doc1, doc2] = await Promise.all([M.findOne(), M.findOne()]);

  doc1.names.push('Test');
  await doc1.save();
  // Will print `[]`, doc2.names is empty even though doc1.names is not
  console.log('Before push', doc2.names);
  doc2.names.push('Test');
  // This will throw an error:
  // VersionError: No matching document found for id "591f5f7301c3d066b57abe0a"
  await doc2.save();

  console.log(await M.findById(doc1._id));
}

run().catch(error => console.error(error));
```

With debug mode on, you can see the query that mongoose uses to update `doc2`. Notice that this query only pushes if every element of `names` is not equal to 'Test'. Check out the [docs on MongoDB's `$nin` operator](https://docs.mongodb.com/manual/reference/operator/query/nin/#nin) for more information.

```
Mongoose: tests.update({ _id: ObjectId("591f5f93b6966a66c59355fc"), names: { '$nin': [ 'Test' ] } }, { '$pushAll': { names: [ 'Test' ] }, '$inc': { __v: 1 } })
```

The `mongoose-unique-array` plugin only affects `save()`. If you use [update validation](http://mongoosejs.com/docs/validation.html#update-validators), `mongoose-unique-array` will also help you if you `$set` an array. However, `mongoose-unique-array` does **not** help you if you use `update()` and `$push`.

Moving On
---------

[Mongoose 4.10](https://github.com/Automattic/mongoose/blob/master/History.md#4100--2017-05-18) has 8 powerful new features and several small bug fixes, including aliasing and the ability to modify function parameters in pre hooks. Look forward to more articles on these new features, and make sure you upgrade to take advantage of these new features.
