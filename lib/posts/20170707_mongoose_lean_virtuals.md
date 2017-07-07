[Mongoose 4.11](https://github.com/Automattic/mongoose/blob/master/History.md#4110--2017-06-25) was released last week and includes several neat new features. It also has one very important deprecation, so before you upgrade please read about [the `useMongoClient` option in the docs](http://mongoosejs.com/docs/connections.html#use-mongo-client). I'll write more about `useMongoClient` and [why it is necessary](https://github.com/Automattic/mongoose/issues/5399#issuecomment-312523545) another time. But first, mongoose 4.11 enables a new plugin, [mongoose-lean-virtuals](https://www.npmjs.com/package/mongoose-lean-virtuals), which lets you apply virtuals to query results even if you use [the `lean()` function](http://mongoosejs.com/docs/api.html#query_Query-lean). This plugin is a more general version of [mongoose-lean-id](https://www.npmjs.com/package/mongoose-lean-id).

What Does the Plugin Do?
------------------------

The `lean()` function tells mongoose to not [hydrate](http://mongoosejs.com/docs/api.html#model_Model.hydrate) query results. In other words, the results of your queries will be the same plain JavaScript objects that you would get from using the [Node.js MongoDB driver](https://www.npmjs.com/package/mongodb) directly, with none of the mongoose magic. This means no [virtuals](http://mongoosejs.com/docs/guide.html#virtuals), getters, [methods](http://mongoosejs.com/docs/guide.html#methods), [defaults](http://mongoosejs.com/docs/middleware.html), or [document middleware](http://mongoosejs.com/docs/middleware.html). But what you lose in functionality you gain in performance, `lean()` removes almost all of the overhead of using mongoose. Below is an example of using `.lean()` with methods and virtuals.

```javascript
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/test', { useMongoClient: true });
  await mongoose.connection.dropDatabase();

  const schema = new mongoose.Schema({
    name: {
      type: String
    }
  });

  // Won't appear in .lean()
  schema.methods.test = function() { return true; };
  schema.virtual('myVirtual').get(function() {
    return this.name;
  });

  const MyModel = mongoose.model('MyModel', schema);

  await MyModel.create({ name: 'test' });

  const leanDoc = await MyModel.findOne({}).lean();

  console.log(leanDoc.constructor.name); // 'Object', not 'MyModel'
  console.log(leanDoc.test); // 'undefined', not a function
  console.log(leanDoc.myVirtual); // 'undefined', not 'test'
}

test().catch(err => console.error(err.stack));
```

If you're just loading a document from MongoDB and don't intend to modify it, you're often better off using `lean()` because you get the performance benefit and don't need any of the functionality you lose.

Virtuals are often the reason why people don't use `lean()` for read-only use cases. They're often written for the convenience of client code, so `lean()` is usually not an option for power users of virtuals. Using the mongoose-lean-virtuals plugin, you can do `.lean({ virtuals: true })` to get all virtuals in the query result as shown below.

```javascript
const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/test', { useMongoClient: true });
  await mongoose.connection.dropDatabase();

  const schema = new mongoose.Schema({
    name: {
      type: String
    }
  });

  // Won't appear in .lean()
  schema.methods.test = function() { return true; };

  // With plugin, virtual will appear in query result
  schema.virtual('myVirtual').get(function() {
    return this.name;
  });
  // Plugin must be *after* virtuals
  schema.plugin(mongooseLeanVirtuals);

  const MyModel = mongoose.model('MyModel', schema);

  await MyModel.create({ name: 'test' });

  const leanDoc = await MyModel.findOne({}).lean({ virtuals: true });

  console.log(leanDoc.constructor.name); // 'Object', not 'MyModel'
  console.log(leanDoc.myVirtual); // 'test' because of plugin

  // Methods still won't be defined
  console.log(leanDoc.test); // 'undefined', not a function
}

test().catch(err => console.error(err.stack));
```

Caveats
-------

Mongoose virtuals are defined via a getter function and an optional setter function:

```javascript
schema.virtual('myVirtual').get(function() {
  return this.name;
});
```

As usual in JavaScript, you need to be careful about what `this` means. Without `lean()`, `this` is a full fledged mongoose document, complete with getters, setters, virtuals, etc. With `lean()` and mongoose-lean-virtuals, `this` is a plain JavaScript object in the getter function, with **no** getters, methods, or any other mongoose syntactic sugar. If you plan on using mongoose-lean-virtuals, do **not** rely on mongoose functionality in your virtuals. Accessing document properties like `this.name` is fine, but `this.get('name')` is not because `this` is a POJO with mongoose-lean-virtuals.

Mongoose also has [virtuals for use with `populate()`](http://mongoosejs.com/docs/populate.html#populate-virtuals). The mongoose-lean-virtuals plugin explicitly ignores virtuals that have a `ref` property, so your populated virtuals will **not** be included. Please open up an issue on the [mongoose-lean-virtuals GitHub page](http://mongoosejs.com/docs/populate.html#populate-virtuals) if you need this feature.

Moving On
---------

Mongoose 4.11 represents a big step towards mongoose 5.0, with several important new features and a major deprecation to support MongoDB's upcoming 3.6 release. Please upgrade to take advantage of mongoose-lean-virtuals and other new features, and report any issues that you find on [GitHub](https://github.com/Automattic/mongoose/issues).
