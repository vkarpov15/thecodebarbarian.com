[Mongoose 5.6.0 was released last week](https://github.com/Automattic/mongoose/blob/master/History.md#560--2019-06-14). This new release has 12 new features, 2 performance improvements, and several docs improvements. The most interesting new feature is [immutable properties](https://mongoosejs.com/docs/api/schematype.html#schematype_SchemaType-immutable). The idea is that marking a property as immutable means that property cannot change after the document is created.

Motivation
----------

One of the primary goals for Mongoose is allowing you to safely write untrusted data to MongoDB without any additional validation. Given a `req.body` in Express, Mongoose should allow you to [`set()` the modified values](https://mongoosejs.com/docs/api/document.html#document_Document-set) and save the data to the database with minimal extra work.

[Mongoose timestamps](https://mongoosejs.com/docs/guide.html#timestamps) set a `createdAt` when the document is created, and an `updatedAt` when the document is updated. Ideally, `createdAt` shouldn't change once the document is created. But, currently, you can overwrite `createdAt`!

```javascript
const Model = mongoose.model('Test', new Schema({
  name: String
}, { timestamps: true }));

const doc = await Model.create({ name: 'test1' });

console.log(doc.createdAt); // 2019-06-18T16:24:16.733Z

// Overwrite `createdAt`
doc.set({ createdAt: new Date('2019-06-01') });
await doc.save();

console.log(doc.createdAt); // 2019-06-01T00:00:00.000Z
```

This means you need to be careful to strip out `createdAt` from any request bodies. Otherwise, a bug or a malicious user might set an incorrect `createdAt`.

Introducing Immutable Properties
--------------------------------

In Mongoose 5.6.0, you can make a property immutable. If you mark `createdAt` as immutable, Mongoose will disallow changing `createdAt`.

```javascript
const Model = mongoose.model('Test', new Schema({
  name: String,
  createdAt: {
    type: Date,
    immutable: true // Make `createdAt` immutable
  }
}, { timestamps: true }));

const doc = await Model.create({ name: 'test1' });

console.log(doc.createdAt); // 2019-06-18T16:24:16.733Z

// Since `createdAt` is immutable, Mongoose ignores the update
// to `createdAt`
doc.set({ createdAt: new Date('2019-06-01'), name: 'test' });
await doc.save();

console.log(doc.name); // 'test'
console.log(doc.createdAt); // 2019-06-18T16:55:49.197Z
```

Immutability only applies to documents that have already been saved to the database. In other words, you can modify immutable properties if the document's [`isNew` property](https://mongoosejs.com/docs/api/document.html#document_Document-isNew) is `false`.

```javascript
const Model = mongoose.model('Test', new Schema({
  name: String,
  createdAt: {
    type: Date,
    immutable: true // Make `createdAt` immutable
  }
}, { timestamps: true }));

const doc = new Model({ name: 'test1' });
doc.createdAt = new Date('2019-06-01');

await doc.save();

doc.createdAt; // 2019-06-01T00:00:00.000Z
```

With Update
-----------

Mongoose also strips updates to immutable properties from [`updateOne()`](https://mongoosejs.com/docs/api/query.html#query_Query-updateOne), [`updateMany()`](https://mongoosejs.com/docs/api/query.html#query_Query-updateMany), and [`findOneAndUpdate()`](https://mongoosejs.com/docs/api/query.html#query_Query-findOneAndUpdate). Your update will succeed if you try to overwrite an immutable property, Mongoose will just strip out the immutable property.

```javascript
const schema = new Schema({
  name: String
}, { timestamps: true });

// An alternative way to make `createdAt` immutable
schema.path('createdAt').immutable(true);

const Model = mongoose.model('Test', schema);
let doc = await Model.create({ name: 'test1' });

doc = await Model.findOneAndUpdate({}, {
  name: 'test',
  // Because `createdAt` is immutable, Mongoose will strip `createdAt`
  // from the update
  createdAt: new Date('2019-06-01')
}, { new: true });

console.log(doc.name); // 'test'
console.log(doc.createdAt); // 2019-06-18T17:33:03.293Z
```

Moving On
---------

Immutable properties are just one of 12 new features in Mongoose 5.6.0. Mongoose 5.6.0 also lets you use arrow functions to define [virtual getters](https://mongoosejs.com/docs/api/virtualtype.html#virtualtype_VirtualType-get) and [setters](https://mongoosejs.com/docs/api/virtualtype.html#virtualtype_VirtualType-set), set a global [`maxTimeMS` for your queries](http://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs.html#the-maxtimems-option), and set [populate's `ref` option to a function](https://mongoosejs.com/docs/populate.html#saving-refs). Make sure you upgrade to take advantage of all the new features!
