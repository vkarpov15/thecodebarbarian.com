I've gotten a lot of requests for a guide to Mongoose internals, because it's hard to contribute unless you have the
time and patience to read through the codebase. In this series of tutorials, I'll provide an overview of how Mongoose
works geared towards developers that want to contribute to the project.

In this first tutorial, I'll explain how the [Schema class](https://mongoosejs.com/docs/guide.html) works. In particular,
how [Schema options](https://mongoosejs.com/docs/guide.html#options) propagate to [models](https://mongoosejs.com/docs/models.html) and [queries](https://mongoosejs.com/docs/queries.html), because that ends up being a common cause for bugs.

Schemas and [SchemaTypes](https://mongoosejs.com/docs/schematypes.html)
-----------------------

Let's start with a simple schema definition:

```javascript
const schema = new Schema({ name: String });
```

This code calls the [`Schema` constructor in `lib/schema.js`](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L92). The first parameter to the `Schema` constructor
is called the schema _definition_, which is an object that describes the paths in the schema. The `Schema`
constructor then [calls the `Schema#add()` method](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L124-L130) to process the definition into something
Mongoose can understand.

```javascript
// lib/schema.js L124-L130
if (Array.isArray(obj)) {
  for (const definition of obj) {
    this.add(definition);
  }
} else if (obj) {
  this.add(obj);
}
```

[The `Schema#add()` method](https://mongoosejs.com/docs/api/schema.html#schema_Schema-add) then [loops through every key in the definition](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L474-L476) and looks to see whether the key's value is a [POJO](https://masteringjs.io/tutorials/fundamentals/pojo), SchemaType instance, or something else.

```javascript
// lib/schema.js L474-L535, heavily simplified
const keys = Object.keys(definition);

for (const key of keys) {
  if (utils.isPOJO(obj[key]) && !obj[key].type) {
    // Recursively add nested keys
    this.add(obj[key], prefix + key + '.');
  } else {
    // Add a new path in the schema otherwise
    this.path(prefix + key, obj[key]);
  }
}
```

The `Schema#add()` function delegates actually creating a new path to the [`Schema#path()` method](https://mongoosejs.com/docs/api/schema.html#schema_Schema-path). For example, the two below code samples are equivalent:

```javascript
const schema = new Schema({ name: String });

// Equivalent:
const schema = new Schema({});
schema.path('name', String);
```

The [`Schema#path()` method implementation](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L618) is tricky because it has to handle nested paths,
but the core part of `Schema#path()` is the code that [creates a new SchemaType using `Schema#interpretAsType`](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L680-L681).

```javascript
// lib/schema.js L680-681. The core of what `Schema#path()` is responsible for
this.paths[path] = this.interpretAsType(path, obj, this.options);
const schemaType = this.paths[path];
```

The [`interpretAsType()` method is an internal method](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L878) that is responsible for interpreting the various different
declaration syntaxes that Mongoose supports:

```javascript
// One way to define a schema with a path `name` that is of type string
new Schema({ name: String });
// Another equivalent way
new Schema({ name: 'String' });
// Another equivalent way
new Schema({ name: { type: String } });
// Another equivalent way
new Schema({ name: { type: 'string' } });
// And another equivalent way
new Schema({ name: new mongoose.Schema.String('name') });
// And yet another one
new Schema({ name: { $type: String } }, { typeKey: '$type' });
```

The `interpretAsType()` method is responsible for returning an instance of the [SchemaType class](https://github.com/Automattic/mongoose/blob/5.12.5/lib/schematype.js). A SchemaType instance represents a single path in a Mongoose schema.
If you call `Schema#path()` with only one argument, the `Schema#path()` function will return the SchemaType instance
at the given path.

```javascript
const schema = new Schema({ name: String });

/*
SchemaString {
  enumValues: [],
  regExp: null,
  path: 'name',
  instance: 'String',
  validators: [],
  getters: [],
  setters: [],
  options: SchemaStringOptions { type: [Function: String] },
  _index: null,
  [Symbol(mongoose#schemaType)]: true
}
*/
schema.path('name');

schema.path('name') instanceof mongoose.SchemaType; // true
schema.path('name') instanceof mongoose.Schema.String; // true
```

More on `interpretAsType`
------------------------

The [`lib/schema` directory](https://github.com/Automattic/mongoose/tree/5.12.5/lib/schema) contains one class that
extends from `SchemaType` for each of Mongoose's built-in types. For example, [`lib/schema/string.js`](https://github.com/Automattic/mongoose/blob/5.12.5/lib/schema/string.js) contains a `SchemaString` class that inherits from `SchemaType`.

[The Schema class tracks a `MongooseTypes` object that contains all these classes](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L2143). The `mongoose.Schema.Types` property is a pointer to this
object.

```javascript
const mongoose = require('mongoose');

/*
{
  String: [Function: SchemaString] {...},
  Number: [Function: SchemaNumber] {...},
  Boolean: [Function: SchemaBoolean] {...},
  DocumentArray: [Function: DocumentArrayPath] {...},
  Embedded: [Function: SingleNestedPath],
  Array: [Function: SchemaArray] {...},
  Buffer: [Function: SchemaBuffer] {...},
  Date: [Function: SchemaDate] {...},
  ObjectId: [Function: ObjectId] {...},
  Mixed: [Function: Mixed] {...},
  Decimal: [Function: Decimal128] {...},
  Decimal128: [Function: Decimal128] {...},
  Map: [Function: Map] {...},
  Oid: [Function: ObjectId] {...},
  Object: [Function: Mixed] {...},
  Bool: [Function: SchemaBoolean] {...},
  ObjectID: [Function: ObjectId] {...}
}
*/
mongoose.Schema.Types;
```

The [`interpretAsType()` method tries to infer a type `name` from the given SchemaType definition](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L892-L907). In the case of a function,
it just [takes the function's `name`](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L994). Then, [`interpretAsType()` tries to find the type in `mongoose.Schema.Types` based on the string `name`](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L1008-L1014).

```javascript
// lib/schema.js L892-L907
if (!utils.isPOJO(obj) && !(obj instanceof SchemaTypeOptions)) {
  const constructorName = utils.getFunctionName(obj.constructor);
  if (constructorName !== 'Object') {
    const oldObj = obj;
    obj = {};
    obj[options.typeKey] = oldObj;
  }
}

// Get the type making sure to allow keys named "type"
// and default to mixed if not specified.
// { type: { type: String, default: 'freshcut' } }
let type = obj[options.typeKey] && (options.typeKey !== 'type' || !obj.type.type)
  ? obj[options.typeKey]
  : {};
let name;

// lib/schema.js L991-L1014
if (Buffer.isBuffer(type)) {
  name = 'Buffer';
} else if (typeof type === 'function' || typeof type === 'object') {
  name = type.schemaName || utils.getFunctionName(type);
} else {
  name = type == null ? '' + type : type.toString();
}

if (name) {
  name = name.charAt(0).toUpperCase() + name.substring(1);
}
// Special case re: gh-7049 because the bson `ObjectID` class' capitalization
// doesn't line up with Mongoose's.
if (name === 'ObjectID') {
  name = 'ObjectId';
}

if (MongooseTypes[name] == null) {
  throw new TypeError(`Invalid schema configuration: \`${name}\` is not ` +
    `a valid type at path \`${path}\`. See ` +
    'http://bit.ly/mongoose-schematypes for a list of valid schema types.');
}

return new MongooseTypes[name](path, obj);
```

This means that any function whose `Function#name` property lines up with a Mongoose type works as a SchemaType definition:

```javascript
new Schema({
  myBoolean: function Bool() {} // Equivalent to `myBoolean: Boolean`
});
```

That's the basics of how a schema definition works. A Schema has a map of _paths_ which are instances of the SchemaType
class, and the SchemaType instance is responsible for storing what type a given path should be (string, number, etc.).
The `interpretAsType()` function is responsible for converting a Schema definition into a bunch of SchemaTypes, although
there's nothing stopping you from explicitly defining SchemaTypes yourself:

```javascript
// Explicitly set `name` to a SchemaType instance.
new Schema({ name: new mongoose.Schema.String('name') });
```

But the Schema definition is only half of what schemas do. Schemas also store [options](https://github.com/Automattic/mongoose/blob/98519de1e8f3144353e95400e89adb3ffcbd7156/lib/schema.js#L92) that let you configure how models that use this Schema
work. Let's take a closer look at models, and how models work with schemas.

Models and Options
------------------

A Schema is just a sophisticated configuration object. Schema instances don't let you do anything with MongoDB directly.
A Model is a pseudo-class that lets you store documents and execute queries, and a Schema helps you configure a Model.

The primary way to create a Mongoose model is the [global `model()` function](https://github.com/Automattic/mongoose/blob/5.12.5/lib/index.js#L480), which takes in a model name and a schema, and returns a pseudo-class that extends from
[Mongoose's model class](https://github.com/Automattic/mongoose/blob/5.12.5/lib/model.js).

```javascript
// lib/index L480-L597, with less significant details omitted
Mongoose.prototype.model = function(name, schema, collection, skipInit) {
  // ...
  const connection = options.connection || _mongoose.connection;
  model = _mongoose.Model.compile(model || name, schema, collection, connection, _mongoose);
  // ...

  _mongoose.models[name] = model;
  return _mongoose.models[name];
};
```

The particulars of `mongoose.Model.compile()` will be covered in a future tutorial on change tracking, but suffice
to say that, in the above logic, `model` is a pseudo-class that extends from `mongoose.Model`. It isn't strictly a
[JavaScript class](https://masteringjs.io/tutorials/fundamentals/class) because it isn't defined using the `class` keyword,
but for all practical purposes it behaves like a JavaScript class.

```javascript
const personSchema = mongoose.Schema({ name: String });
const Person = mongoose.model('Person', personSchema);

new Person() instanceof mongoose.Model; // true
```

An instance of a Model is typically called a _document_. Mongoose Models extend from the [Mongoose Document class](https://github.com/Automattic/mongoose/blob/5.12.5/lib/document.js):

```javascript
const person = new Person();

person instanceof mongoose.Model; // true
person instanceof mongoose.Document; // true
```

But, to avoid confusion between Model classes and instances, we typically refer to a Model instance as a document,
since users rarely work with the Document class directly.

Model classes have private static property `$__schema` that tracks the schema associated with the model. We assume
that each Model has exactly one Schema. The Model class uses `$__schema` to infer default options for certain operations.

For example, Mongoose schemas support configuring the [write concern](https://docs.mongodb.com/manual/reference/write-concern/) that the model will use by default for `save()`.

```javascript
const personSchema = new Schema({
  name: String
}, { writeConcern: { wtimeout: 1000 } });
const Person = mongoose.model('Person', personSchema);

const person = new Person();
await person.save(); // Mongoose sets `writeConcern` automatically

// Users can overwrite the `writeConcern` option for an individual `save()` call,
// but the schema-level write concern is the default
await person.save({ writeConcern: { w: 1000 } });
```

When the user calls `save()`, Mongoose [calls an internal helper `applyWriteConcern()`](https://github.com/Automattic/mongoose/blob/5.12.5/lib/model.js#L234) that [applies the schema-level write concern to the `save()` options object](https://github.com/Automattic/mongoose/blob/5.12.5/lib/helpers/schema/applyWriteConcern.js), if the user didn't set one.

```javascript
// lib/helpers/schema/applyWriteConcern.js
const get = require('../get'); // `get()` is similar to `lodash.get()` or the `?.` operator

module.exports = function applyWriteConcern(schema, options) {
  const writeConcern = get(schema, 'options.writeConcern', {});
  if (!('w' in options) && writeConcern.w != null) {
    options.w = writeConcern.w;
  }
  if (!('j' in options) && writeConcern.j != null) {
    options.j = writeConcern.j;
  }
  if (!('wtimeout' in options) && writeConcern.wtimeout != null) {
    options.wtimeout = writeConcern.wtimeout;
  }
};
```

Similar patterns appear frequently in the Mongoose codebase, because Mongoose allows setting options globally, on [connections](https://mongoosejs.com/docs/api/connection.html), on schemas, and on individual operations. Typically the order of priority is:

1. Individual operation option
2. Schema-level option
3. Connection-level option
4. Global option

As of Mongoose 5.12, Mongoose only supports `writeConcern` as an individual operation option for certain operations, and
as a schema-level option. Mongoose 5.12 doesn't have a global `writeConcern` option. But, for example, Mongoose allows
configuring the `maxTimeMS` option globally or on a given connection, so here's how the [`lib/helpers/query/applyGlobalMaxTimeMS` helper](https://github.com/Automattic/mongoose/blob/5.12.5/lib/helpers/query/applyGlobalMaxTimeMS.js) handles connection-level and global options:

```javascript
// lib/helpers/query/applyGlobalMaxTimeMS.js
const utils = require('../../utils');

module.exports = function applyGlobalMaxTimeMS(options, model) {
  if (utils.hasUserDefinedProperty(options, 'maxTimeMS')) {
    return;
  }

  if (utils.hasUserDefinedProperty(model.db.options, 'maxTimeMS')) {
    options.maxTimeMS = model.db.options.maxTimeMS;
  } else if (utils.hasUserDefinedProperty(model.base.options, 'maxTimeMS')) {
    options.maxTimeMS = model.base.options.maxTimeMS;
  }
};
```

Moving On
---------

So far, we've looked at the basics of Schemas and how Schemas configure Models. But there's a lot more to how Schemas
work that we glossed over, most notably change tracking, middleware, and subdocuments (nested schemas). Next up, we'll
take a look at change tracking and how `compile()` transforms a Schema into a Model class that knows to watch certain paths for
changes.