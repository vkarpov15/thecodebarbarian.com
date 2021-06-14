I've gotten a lot of requests for a guide to Mongoose internals, because it's hard to contribute unless you have the
time and patience to read through the codebase. In this series of tutorials, I'll provide an overview of how Mongoose
works geared towards developers that want to contribute to the project.

In [part 1](/mongoose-internals-schemas-options-models.html), I covered how the [Schema class](https://mongoosejs.com/docs/guide.html) works.
In this tutorial, I'll cover how Mongoose does change tracking: how Mongoose determines what properties changed on a document.

## Compiling a Schema

Calling `mongoose.model(name, schema)` tells Mongoose to _compile_ a model based on `schema`. [Here's where `mongoose.model()` calls `Model.compile()`](https://github.com/Automattic/mongoose/blob/5.12.5/lib/index.js#L582) and [here's the implementation of `Model.compile()`](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/model.js#L4701).
The `Model.compile()` function [creates a new model class](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/model.js#L4719) that extends from Mongoose's built in Mongoose class, and applies [middleware](https://mongoosejs.com/docs/middleware.html) and [query helpers](http://thecodebarbarian.com/mongoose-custom-query-methods.html) to the new class.
But it also calls the [`$__setSchema()` function](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/model.js#L4761) to tell the new model class which paths to watch for changes on.

First, let's take a quick look at how change tracking looks from a user perspective.
Suppose you have a simple model with 2 properties: `name` and `age`.

```javascript
const UserModel = mongoose.model('User', mongoose.Schema({ name: String, age: String }));
```

Suppose you load a user from the database and change the user's `name`, but not their `age`.
Mongoose tracks this change and only sends the changed `name` when you call `save()`.
You can check what Mongoose will send to MongoDB when you call `save()` using the `getChanges()` method:

```javascript
const { _id } = await UserModel.create({ name: 'test', age: 29 });

const user = await UserModel.findOne({ _id });
user.name = 'test2';

user.getChanges(); // { $set: { name: 'test2' }, $unset: {} }
```

The [`$__setSchema()` method](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/document.js#L3043) calls the [`compile()` helper](https://github.com/Automattic/mongoose/blob/5.12.5/lib/helpers/document/compile.js), which is responsible for calling `Object.defineProperty()` on every path in the schema so Mongoose can watch for changes.
Below is some simplified pseudo-code that demonstrates how `compile()` works, excluding recursion and nested paths.

```javascript
function compile(schema, model) {
  const keys = Object.keys(schema.tree); // `tree` contains the paths of the schema as a nested structure
  const len = keys.length;
  let limb;
  let key;

  for (let i = 0; i < len; ++i) {
    key = keys[i];

    defineKey(model, key);
  }
}

function defineKey(model, key) {
  Object.defineProperty(model.prototype, key, {
    enumerable: true,
    configurable: true,
    get: function() {
      // `this` refers to the `UserModel` instance, like `user` in the previous example
      return this.get(path);
    },
    set: function(v) {
      this.set(key, v);
    }
  });
}
```

The key lesson here is that, excluding nested paths, `user.name = 'test2'` is equivalent to `user.set('name', 'test2')` because Mongoose registers a `name` property on `UserModel.prototype` that calls `this.set('name', v)` whenever someone assigns a value to `user.name`.

From a performance perspective, [`Object.defineProperty()` is very slow](https://humanwhocodes.com/blog/2015/11/performance-implication-object-defineproperty/). Mongoose mostly avoids this performance impact by only calling `Object.defineProperty()` _when compiling the schema into a model_ (again excluding nested paths). We assume that developers will typically only compile models once when the process starts, as opposed to compiling models on every request, which would be very slow. Once we've defined a property on the model class's prototype, we get change tracking for every instance of this model class without having to run `defineProperty()` every time we create a new instance of `UserModel`.

## Path State

So the `compile()` function is responsible for compiling a schema into a model class that has built-in change tracking, and change tracking works by watching all paths in the schema and calling `get()` / `set()` whenever someone accesses or assigns to a particular property. So the core logic of change tracking is really the `set()` method.

The `lib/document.js` file defines a [`$set()` method](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L911). It's called `$set()` as opposed to `set()` to allow people to use `set` as a schema path name, although [`set()` is an alias for `$set()` by default](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L1414).

The `$set()` function is pretty complex because it has support for setting multiple paths, setting nested paths, manual population, adhoc paths, strict mode, immutable paths, and numerous other features. But for the purposes of this tutorial, it is responsible for:

1. [Getting the SchemaType of the path being set](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L1141)
2. [Getting the current value of the path](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L1186-L1194)
3. [Casting the value we're trying to set to the schematype](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L1280)
4. [Storing any error that occurred](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L1326)
5. [Determining whether the value changed and setting the value on `_doc`](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L1461-L1469) (via `$__set()` and `$__shouldModify()`)

Below is a heavily simplified pseudocode implementation of `$set()`:

```javascript
Document.prototype.$set = function(path, val) {
  // 1. Get the current SchemaType
  const schematype = this.$__path(path);

  // 2. Get the current value
  const priorVal = this.$__getValue(path);

  try {
    // 3. Cast the value we're setting
    val = schema.applySetters(val, this, false, priorVal);

    this.$markValid(path);
  } catch (err) {
    // 4. If an error occurred when casting, store the error internally and return
    this.invalidate(path, new mongoose.CastError(schema.instance, val, path, err));
    return;
  }

  // 5. If value changed, mark the path as modified
  if (val !== priorVal) {
    this.markModified(path);
  }
}
```

The [`Document#markModified()` method](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L1695) is responsible for marking a path as modified. Modulo subdocuments, `this.markModified(path)` is equivalent to `this.$__.activePaths.modify(path)`.

The [`this.$__` property](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L91) is an instance of Mongoose's [`InternalCache` class in `lib/internal.js`](https://github.com/Automattic/mongoose/blob/5.12.5/lib/internal.js).
This property stores the Mongoose document's internal state, including change tracking.
Mongoose often checks for the presence of `$__` to check if an arbitrary object is a document.
The [`activePaths` property](https://github.com/Automattic/mongoose/blob/5.12.5/lib/internal.js#L29) is an instance of the [`ActiveRoster` class](https://github.com/Automattic/mongoose/blob/5.12.5/lib/internal.js#L8), which is a [state machine](https://masteringjs.io/tutorials/fundamentals/state-machines) that tracks the state of every path in the document.

Calling `this.$__.activePaths.modify(path)` tells the active roster that `path` is now in the 'modified' state. A path can be in one of 5 states:

1. 'require'
2. 'modify'
3. 'init'
4. 'default'
5. 'ignore'

To check whether a path is modified, you check `this.$__.activePaths.states.modify.hasOwnProperty(path)`.
Note that this is a check for whether a path is "direct modified" if you have subdocuments or nested paths: if you set `doc.a`, `doc.a.b` is modified even though you haven't directly modified `doc.a.b`. We consider a path [direct modified](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L2009) if `this.$__.activePaths.states.modify.hasOwnProperty(path)`. Similarly, to see what paths are direct modified, you use `Object.keys(this.$__.activePaths.states.modify)`.

## Casting and Cast Errors

In Mongoose, _casting_ is the process of converting an arbitrary value to the type specified in the schema.
For example, if you set a number path to the string `'42'`, Mongoose is smart enough to cast that string to the number `42`.

One of the key nuances of `$set()` is that it does **not** throw an error if casting failed.
For example, if you try to set a number path to a string, you don't get any errors.

```javascript
const User = mongoose.model('User', Schema({ name: String, age: Number }));

const doc = await User.create({ name: 'Jean-Luc Picard', age: 59 });

// Doesn't throw an error
doc.$set('age', 'oops!');

doc.age; // 59, Mongoose doesn't overwrite the current value if an error occurred.

await doc.validate(); // Throws ValidationError
```

Remember that `$set()` wraps `applySetters()`, which is responsible for casting, and calls the `invalidate()` method if casting or setters throw an error.

```javascript
  try {
    // 3. Cast the value we're setting
    val = schema.applySetters(val, this, false, priorVal);

    this.$markValid(path);
  } catch (err) {
    // 4. If an error occurred when casting, store the error internally and return
    this.invalidate(path, new mongoose.CastError(schema.instance, val, path, err));
    return;
  }
```

The [`Document#invalidate()` method](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L2702) is responsible for marking paths as invalid. Below is the implementation of `invalidate()`:

```javascript
Document.prototype.invalidate = function(path, err, val, kind) {
  if (!this.$__.validationError) {
    this.$__.validationError = new ValidationError(this);
  }

  if (this.$__.validationError.errors[path]) {
    return;
  }

  if (!err || typeof err === 'string') {
    err = new ValidatorError({
      path: path,
      message: err,
      type: kind || 'user defined',
      value: val
    });
  }

  if (this.$__.validationError === err) {
    return this.$__.validationError;
  }

  this.$__.validationError.addError(path, err);
  return this.$__.validationError;
};
```

The `invalidate()` function is responsible for setting properties on `this.$__.validationError.errors`, which is where Mongoose stores all paths that had failed `$set()` calls.
This property also stores validation errors, which we'll explain in a future tutorial.
But, for now, all you need to know is that, when you run `validate()`, [Mongoose returns `this.$__.validatorError`](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L2654-L2668).
So if casting fails, `await doc.validate()` will throw an error.

## `get()` and `_doc`

That's the overview of how the `set()` function and setting a property works.
What about `get()`?
Mongoose documents have a [`get()` method](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L1593) that returns the current value for a given path.

The `get()` function supports several advanced features, like dotted paths and adhoc types.
But, for the purposes of this tutorial, below is a heavily simplified version.

```javascript
Document.prototype.get = function(path) {
  const val = this._doc[path];

  const schema = this.$__path(path);
  if (schema != null) {
    return schema.applyGetters(val, this);
  }

  return val;
};
```

The `_doc` property is where Mongoose stores the "raw" value of the document.
A document itself has getters/setters, the `$__` property, etc.
But `_doc` is just a [POJO](https://masteringjs.io/tutorials/fundamentals/pojo) representation of the document, with no getters/setters, methods, or anything Mongoose-specific.
The only difference is that single nested subdocuments are still fully fledged Mongoose documents in `_doc`.

You might also be wondering where the `$set()` function modifies `_doc`.
There's a `$__set()` method that's [responsible for the internals of setting the value on the `_doc` property](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js#L1514-L1532).

## Moving On

So far, we've looked at the basics of Schemas and how Mongoose compiles a schema into a model with change tracking.
But we've only looked at simple schemas so far: schema paths so far have been strings and numbers, not objects or [arrays](http://thecodebarbarian.com/the-80-20-guide-to-javascript-arrays.html).
Next up, we'll take a look at nested paths, subdocuments, arrays, and other more complex schemas.