[Mongoose 5.1.0](https://github.com/Automattic/mongoose/blob/master/History.md#510--2018-05-10) was released on May 10, and introduced 10 new features. The feature I'm most
excited about is the new [`Map` type](http://mongoosejs.com/docs/schematypes.html#maps). One of the reasons why this feature is noteworthy is because it closed
out what was [the oldest open issue on Mongoose's GitHub repo](https://github.com/Automattic/mongoose/issues/681), originally posted in January 2012. In this article, I'll demonstrate how to use the map type and highlight why
it is so important.

Introducing Mongoose Maps
-------------------------

Before Mongoose 5.1.0, you had to declare every property that you wanted mongoose
to track and validate in your schema ahead of time. For example, let's say you
had a `UserSchema` and wanted to store the user's Twitter, GitHub, Instagram, and
other social media accounts in a `socialHandles` property. With a map type, this
is simple, you don't have to list out each social media service explicitly.

```javascript
const userSchema = new Schema({
  socialHandles: {
    type: Map, // `socialHandles` is a key/value store for string keys
    of: String // Values must be strings
  }
});
```

Without the map type, you have 3 alternatives:

* List out every social media service you want to support in your schema. This
is the best option, but the list may grow out of control depending on how quickly
you add new services. Plus, what if you wanted to add validation to each property?

```javascript
const userSchema = new Schema({
  socialHandles: {
    twitter: String,
    github: String,
    instagram: String,
    // ...
  }
});
```

* Make `socialHandles` a [mixed type property](http://mongoosejs.com/docs/schematypes.html#mixed). This works, but
mongoose will no longer handle casting or validation, so you're responsible for
making sure each value in `socialHandles` is a string.

```javascript
const userSchema = new Schema({
  // You can store anything in `socialHandles`, mongoose won't cast or validate
  socialHandles: {}
});
```

* Set [`strict` to false](http://mongoosejs.com/docs/guide.html#strict) for your whole schema. This approach is theoretically possible, but not a good alternative
because mongoose won't cast or validate any additional properties in `socialHandles`.

```javascript
const userSchema = new Schema({
  socialHandles: {
    twitter: String,
    github: String,
    instagram: String,
    // ...
    // Because of `strict: false`, you can store any additional properties
    // in `socialHandles` as well
  }
}, { strict: false });
```

With maps, you get the best of both worlds: mongoose will ensure every value in
`socialHandles` is a string for you, and you don't have to list out every single
social media service you support. Plus, you can declare validation for all your
properties in one place.

```javascript
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/test');

const userSchema = new mongoose.Schema({
  socialHandles: {
    type: Map, // `socialHandles` is a key/value store for string keys
    of: String // Values must be strings
  }
});
const User = mongoose.model('User', userSchema);

const doc = new User({
  socialHandles: {
    github: 'vkarpov15',
    twitter: '@code_barbarian',
    instagram: 'vkarpov15'
  }
});
// { _id: 5afc7e04b6ec54518c76fb5b,
//  socialHandles: Map {
//     'github' => 'vkarpov15',
//     'twitter' => '@code_barbarian',
//     'instagram' => 'vkarpov15' } }
console.log(doc);
```

Working With Maps
-----------------

Mongoose maps [inherit from native JavaScript's `Map` type](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), so you get the same functionality as JavaScript maps with some extra mongoose syntactic sugar baked in. For example, you can get a list of the map's keys and values using the `keys()` and `values()` methods:

```javascript
const doc = new User({
  socialHandles: {
    github: 'vkarpov15',
    twitter: '@code_barbarian',
    instagram: 'vkarpov15'
  }
});

for (const key of doc.socialHandles.keys()) {
  // Prints "github", "twitter", "instagram"
  console.log(key);
}
for (const val of doc.socialHandles.values()) {
  // Prints "vkarpov15", "@code_barbarian", "vkarpov15"
  console.log(val);
}
```

Because mongoose maps inherit from native JavaScript maps, if you want to get/set
an individual key in the map, you need to use the [`get()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/get) and [`set()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/set) methods. Mongoose documents have [`get()`](http://mongoosejs.com/docs/api.html#document_Document-get) and [`set()`](http://mongoosejs.com/docs/api.html#document_Document-set) functions that you can use instead of `get()` and `set()` on the mongoose map as well. However,
conventional assignment, like `doc.socialHandles.github = 'vkarpov15'`, does **not** work.

```javascript
// Getting
console.log(doc.socialHandles.github); // undefined
console.log(doc.socialHandles.get('github')); // vkarpov15
// Mongoose-specific
console.log(doc.get('socialHandles.github')); // vkarpov15

// Setting
doc.socialHandles.stackOverflow = 'vkarpov15'; // Does **not** work
console.log(doc.get('socialHandles.stackOverflow')); // undefined

doc.socialHandles.set('stackOverflow', 'vkarpov15'); // works
doc.set('socialHandles.stackOverflow', 'vkarpov15'); // works too
console.log(doc.get('socialHandles.stackOverflow')); // "vkarpov15"
```

Map Validation
--------------

Mongoose provides two mechanisms for [validating](http://mongoosejs.com/docs/validation.html) your map. You can
validate the whole map, or you can validate individual values in the map.
Here's how you would add a [custom validator](http://mongoosejs.com/docs/validation.html#custom-validators) to the
`socialHandles` map.

```javascript
const userSchema = new mongoose.Schema({
  socialHandles: {
    type: Map,
    of: String,
    validate: function(map) {
      for (const handle of map.values()) {
        if (handle.startsWith('http://')) {
          throw new Error(`Handle ${handle} must not be a URL`);
        }
      }
      return true;
    }
  }
});
const User = mongoose.model('User', userSchema);
```

With the custom validator in place, the below code will print an error.

```javascript
const doc = new User({
  socialHandles: {
    github: 'http://github.com/vkarpov15', // Validator will fail
    twitter: '@code_barbarian',
    instagram: 'vkarpov15'
  }
});

// User validation failed: socialHandles: Validator failed for path `socialHandles` with value `[object Map]`
console.log(doc.validateSync().message);
```

The other option is to add a custom validator for the individual values in the
map as opposed to the map as a whole. You do this by specifying a nested
`validate` property in the `of` property.

```javascript
const userSchema = new mongoose.Schema({
  socialHandles: {
    type: Map,
    of: {
      type: String,
      validate: function(str) {
        if (str.startsWith('http://')) {
          throw new Error(`Handle ${handle} must not be a URL`);
        }
        return true;
      }
    }
  }
});
const User = mongoose.model('User', userSchema);
```

By putting a custom validator on the individual value, you'll get an error
with a slightly different error message:

```javascript
const doc = new User({
  socialHandles: {
    github: 'http://github.com/vkarpov15', // Validator will fail
    twitter: '@code_barbarian',
    instagram: 'vkarpov15'
  }
});

// User validation failed: socialHandles.github: Validator failed for path `socialHandles.$*` with value `http://github.com/vkarpov15`
console.log(doc.validateSync().message);
```

The `$*` in `socialHandles.$*` is a special placeholder specifically for
map types. `socialHandles.$*` is the path you use to access the [`SchemaType`](http://mongoosejs.com/docs/schematypes.html) of the map's values.
For example, below is another way to add a custom validator to the map's values
using [the `validate()` function on `SchemaType`](http://mongoosejs.com/docs/api.html#schematype_SchemaType-validate).

```javascript
const userSchema = new mongoose.Schema({
  socialHandles: {
    type: Map,
    of: String
  }
});

// "SchemaMap"
console.log(userSchema.path('socialHandles').constructor.name);
// "SchemaString"
console.log(userSchema.path('socialHandles.$*').constructor.name);

userSchema.path('socialHandles.$*').validate(function(str) {
  if (str.startsWith('http://')) {
    throw new Error(`Handle ${handle} must not be a URL`);
  }
  return true;
});
```

Moving On
---------

Mongoose maps let you store arbitrary keys in your mongoose documents without
losing the casting and validation that makes mongoose so powerful. Mongoose
maps extend from native JavaScript maps, so you need
to use `get()` and `set()` to access values in a map, but you also get all
the [features of JavaScript maps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map). The `Map` type is just one of [10 new features in Mongoose 5.1.0](https://github.com/Automattic/mongoose/blob/master/History.md#510--2018-05-10), so make sure you upgrade and take advantage of the new features!
