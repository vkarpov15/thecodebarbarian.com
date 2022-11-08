[Mongoose 6.5.0 was released on July 26, 2022](https://github.com/Automattic/mongoose/releases/tag/6.5.0) and includes several features that we're excited to highlight.
It has been a while since we've done a blog post for a Mongoose feature release, but `castObject()` and `applyDefaults()` represent an important shift that's worth breaking the hiatus for.
These new functions represent a major step forward for Mongoose's _portability_: the ability to use bits and pieces of Mongoose functionality without needing to instantiate [documents](https://mongoosejs.com/docs/documents.html) or even [connections](https://mongoosejs.com/docs/connections.html).

Here's the idea.
Given a Mongoose schema, you can now cast a [POJO](https://masteringjs.io/tutorials/fundamentals/pojo) to the schema, or apply schema-defined defaults to the POJO.
No need to create a Mongoose document.

```javascript
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  age: {
    type: Number,
    required: true,
    default: 0
  }
}));

// Returns `{ name: 'test', age: 42 }` as a POJO. Mongoose casts '42'
// to a number
User.castObject({ name: 'test', age: '42' });

// Returns `{ name: 'test', age: 0 }` as a POJO. Mongoose applies the
// default value of `age`
User.applyDefaults({ name: 'test' });
```

`applyDefaults()`
-----------------

The [`applyDefaults()` function](https://mongoosejs.com/docs/api/model.html#model_Model-applyDefaults) takes in either a POJO or a Mongoose document, and applies all schema-applied defaults to the object.
It modifies the object in place.

```javascript
const TestModel = mongoose.model('Test', new mongoose.Schema({
  name: String,
  regularDefault: {
    type: Number,
    default: 0
  },
  functionDefault: {
    type: String,
    function() {
      this === obj; // true
      return this.name;
    }
  }
}));

const obj = { name: 'test' };
TestModel.applyDefaults(obj);

// {
//   name: 'test',
//   regularDefault: 0,
//   functionDefault: 'test',
//   _id: new ObjectId("...")
// }
console.log(obj);
```

Without `applyDefaults()`, applying schema-defined defaults on a POJO is a potentially performance-intensive 2-step process.
You would have to instantiate a new instance of `TestModel()` to apply defaults, then convert the document back to a POJO.
Creating a new document instance can be slow, especially if your schema is complex.

`applyDefaults()` also works on documents.
This can be handy in cases where you want to set a value on a document _before_ applying defaults.

```javascript
// Create a document, but skip applying defaults
const doc = new TestModel({}, undefined, { defaults: false });

doc.regularDefault; // undefined
doc.functionDefault; // undefined

// Set a value, and then apply defaults
doc.name = 'test2';
TestModel.applyDefaults(doc);

doc.regularDefault; // 0
doc.functionDefault; // 'test2'
```

`castObject()`
--------------

The [`castObject()` function](https://mongoosejs.com/docs/api/model.html#model_Model-castObject) attempts to cast the given POJO to the model's schema.
Unlike `applyDefaults()`, `castObject()` does **not** modify the object in place.
`castObject()` returns a new object casted to the model's schema.

`castObject()` throws a Mongoose `ValidationError` if casting fails.

```javascript
const TestModel = mongoose.model('Test', new mongoose.Schema({
  answer: {
    type: Number,
    validate: v => v === 42
  }
}));

let obj = { answer: '42' };
obj = TestModel.castObject(obj);

// `{ answer: 42 }` as a POJO. Mongoose casted '42' (string) to 42 (number)
obj;

// Throws a `ValidationError`
TestModel.castObject({ answer: 'not a number' });
```

Like `applyDefaults()`, `castObject()` is convenient because it lets you skip the potentially expensive step of hydrating a new document.
`castObject()` can also be helpful with [the `lean()` option](https://mongoosejs.com/docs/tutorials/lean.html).
Mongoose doesn't do any casting on the results of lean queries.
`castObject()` provides a neat way for you to handle that yourself.

```javascript
const _id = new mongoose.Types.ObjectId();
await TestModel.collection.insertOne({ _id, answer: '42' });

let doc = await TestModel.findById(_id).lean();
typeof doc.answer; // 'string'

doc = TestModel.castObject(doc);
typeof doc.answer; // 'number'
```

Note that `castObject()` does **not** run [schema-defined validation](https://mongoosejs.com/docs/validation.html).
Casting and validation are separate steps in Mongoose: `castObject()` will only make sure that `answer` is a number, not that `answer` is a valid number.
Mongoose models also have a [`validate()` function](https://mongoosejs.com/docs/api/model.html#model_Model-validate) that runs both casting and validation.
Use `TestModel.validate()` if you also want to run schema-defined validation.

```javascript
TestModel.castObject({ answer: 32 }); // OK

TestModel.validate({ answer: 32 }); // throws a `ValidationError`
```

Moving On
---------

`castObject()` and `applyDefaults()`, in combination with `validate()`, let you use your Mongoose schemas to work with POJOs.
No need to hydrate a full document if you just want to cast a POJO against your schema, or apply default values.
This makes Mongoose schemas more flexible, because you can use them in cases where it doesn't make sense for you to create a full Mongoose document.
`castObject()` and `applyDefaults()` are just 2 of the 10 new features in Mongoose 6.5, so make sure you upgrade to take advantage of the new features!

_Want to become your team's MongoDB expert? "Mastering Mongoose" distills 10 years of hard-earned lessons building Mongoose apps at scale into 153 pages. That means you can learn what you need to know to build production-ready full-stack apps with Node.js and MongoDB in a few days. <a href="https://masteringjs.io/ebooks/mastering-mongoose">Get your copy</a>!_

<a href="https://masteringjs.io/ebooks/mastering-mongoose" class="async-await-banner">
  <img src="https://masteringjs.io/ebooks/mastering-mongoose-horizontal.png">
</a>