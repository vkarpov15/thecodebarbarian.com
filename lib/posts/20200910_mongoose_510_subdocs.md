[Mongoose 5.10.0](https://github.com/Automattic/mongoose/blob/master/History.md#5100--2020-08-14) was released on August 14, 2020 and introduces several important new features. Previously, I covered the new [`Connection#transaction()` helper](/whats-new-in-mongoose-5-10-improved-transactions.html) that improves Mongoose's support for [MongoDB transactions](/a-node-js-perspective-on-mongodb-4-transactions.html) and [optimistic concurrency](/whats-new-in-mongoose-5-10-optimistic-concurrency.html). This week, I'll cover another new feature: global configuration
for subdocuments, including the ability to disable automatic `_id` fields for all subdocuments.

More About Global SchemaType Options
------------------------------------

[Mongoose 5.4 introduced the ability to configure schematypes globally](/whats-new-in-mongoose-54-global-schematype-configuration.html). For example, you can make all string fields `required`
by default as shown below:

```javascript
const mongoose = require('mongoose');

mongoose.Schema.Types.String.set('required', true);

// Even though the schema doesn't explicitly list `name` as required, the above
// `set()` call makes all strings `required` by default.
const Test = mongoose.model('Test', mongoose.Schema({ name: String }));
const doc = new Test();
doc.validateSync(); // Test validation failed: name: Path `name` is required
```

In general, any [SchemaType option](https://mongoosejs.com/docs/schematypes.html#schematype-options) except `type` is
globally configurable using `SchemaType.set()`. This makes it easy to make all strings default to `'N/A'` or add a custom
getter that converts ObjectIds to strings so you can compare ObjectIds using `===`:

```javascript
const assert = require('assert');
const mongoose = require('mongoose');

mongoose.ObjectId.get(v => v.toString());

const schema = new mongoose.Schema({
  test: mongoose.ObjectId
}, { _id: false });

const Model = mongoose.model('Test', schema);

const doc = new Model({ test: '5c2e35400844102978e69f8c' });

// `doc.test` will always be a string
assert.ok(typeof doc.test === 'string');
assert.ok(doc.test === '5c2e35400844102978e69f8c');

const doc2 = new Model({ test: doc.test.toString() });

// So you can compare ObjectIds using `===`
assert.ok(doc.test === doc2.test);
```

Global Options for Subdocument Types
-----------------------------------

Unfortunately, Mongoose 5.4 only allowed you to configure primitive types, like strings and numbers. You couldn't modify
single nested subdocuments or document arrays.

Mongoose 5.10 added `mongoose.Schema.Types.Embedded.set()` function for configuring single nested subdocs, and `mongoose.Schema.Types.DocumentArray.set()` for configuring arrays of subdocuments. For example, Mongoose adds an `_id`
field to subdocuments by default:

```javascript
// `friends` is an array of subdocuments
const Person = mongoose.model('Person', mongoose.Schema({ friends: [{ name: String }] }));

const doc = new Person({ friends: [{ name: 'John' }] });
doc.friends[0]; // { _id: ..., name: 'John' }
```

You can disable this by setting the `_id` option to `false`:

```javascript
// `friends` is an array of subdocuments, avoid adding an `_id`
const Person = mongoose.model('Person', mongoose.Schema({
  friends: {
    type: [{ name: String }],
    _id: false
  }
}));
```

In Mongoose 5.10, you can disable `_id` for document arrays by default:

```javascript
// Set the `_id` option to `false` for document arrays by default.
mongoose.Schema.Types.DocumentArray.set('_id', false);

const Person = mongoose.model('Person', mongoose.Schema({ friends: [{ name: String }] }));

const doc = new Person({ friends: [{ name: 'John' }] });
doc.friends[0]; // { name: 'John' }, no `_id`!
```

Single Nested Subdocument Defaults
--------------------------

One subtle difference between single nested subdocuments and nested paths is how Mongoose handles defaults: Mongoose
drills down into nested paths when adding defaults, but not single nested subdocs.

```javascript
// If `subdoc` is undefined, the default value of `name` won't kick in
const WithSubdoc = mongoose.model('WithSubdoc', mongoose.Schema({
  subdoc: new Schema({
    name: {
      type: String,
      default: 'NONE'
    }
  })
}));

const doc1 = new WithSubdoc();
doc1.subdoc; // undefined

// But if you use a nested path instead of a subdocument, the default
// value of `name` **will** kick in.
const WithNested = mongoose.model('WithNested', mongoose.Schema({
  nested: {
    name: {
      type: String,
      default: 'NONE'
    }
  }
}));

const doc2 = new WithNested();
doc2.nested.name; // 'NONE'
```

The workaround for this is to add a `default` value of `{}` (empty object) to `subdoc`. Or, in Mongoose 5.10, you can
make all single nested subdocs default to `{}` as shown below.

```javascript
// Make all single nested subdocuments default to an empty object
mongoose.Schema.Types.Embedded.set('default', () => ({}));

const WithSubdoc = mongoose.model('WithSubdoc', mongoose.Schema({
  subdoc: new Schema({
    name: {
      type: String,
      default: 'NONE'
    }
  })
}));

// The default value for `subdoc.name` is applied!
const doc1 = new WithSubdoc();
doc1.subdoc; // { _id: ..., name: 'NONE' }
```

Moving On
----------

Global SchemaType options for subdocuments are a powerful tool for configuring your Mongoose documents. This feature opens
up numerous possibilities, like defining a global getter on document arrays so you can compare Mongoose document arrays to vanilla JavaScript arrays using assertion frameworks, or validating that single nested subdocuments can't be empty. Global SchemaType options are just one of 16 new features in Mongoose 5.10.
You can find the full list on the [Mongoose changelog](https://github.com/Automattic/mongoose/blob/master/History.md#5100--2020-08-14). Make sure you upgrade to take advantage of optimistic concurrency and all the other new features!