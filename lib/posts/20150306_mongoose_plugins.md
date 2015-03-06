One of my favorite underused mongoose features is
[plugins](http://mongoosejs.com/docs/plugins.html).
Plugins are the answer to
[several mongoose feature requests](https://github.com/LearnBoost/mongoose/labels/plugin). As a matter of
fact, I just released my first mongoose plugin,
[mongoose-autopopulate](https://www.npmjs.com/package/mongoose-autopopulate),
last week. Still, the term "plugin" is nebulous and 
intimidating to many users. In this article, I'll explain
what mongoose plugins are all about and provide some examples
for things you can do with mongoose plugins.

Overview
========

First, we're going to play a
[very exciting game called "what is a mongoose plugin and what can it do?"](https://www.youtube.com/watch?v=lLl0DVzRksk)
A mongoose plugin is a single JavaScript function that takes
two parameters: the schema, and an optional options object.

```javascript
function MyPlugin(schema, options) {}
```

The `options` parameter lets you define tuneable parameters
for your plugin. But the more interesting parameter is the
schema.

The core purpose of plugins is to manipulate your schemas.
Plugins don't touch models or documents, so they can't execute
queries or write to the database directly. What can they do?
Here's a few examples of useful things they can do:

* Add middleware (AKA pre, post hooks)

```javascript
function ProfileQueryPlugin(schema) {
  schema.pre('find', function() {
    this.start = Date.now();
  });
  schema.post('find', function() {
    console.log('Query time: ' + (Date.now() - this.start));
  });
}
```

* Add paths to the schema

```javascript
function CreatedAtPlugin(schema) {
  schema.path('createdAt', Date).default(Date.now);
}
```

* Tweak schema options

```javascript
function InvertDefaultToJSONOptionsPlugin(schema) {
  schema.set('toObject', {
    getters: true,
    virtuals: true,
    minimize: false,
    depopulate: true
  });
}
```

In this article, you'll take a look at 3 plugins that each do
one of these operations. By diving into these plugins, you'll
hopefully be more comfortable using plugins in your own code.

Adding Middleware: mongoose-autopopulate
========================================

The aforementioned `mongoose-autopopulate` plugin is an
excellent example of using a plugin to define middleware.
The purpose of this plugin is to address a commonly requested
mongoose feature: the ability to say "this field should
always be populated every time I run a query on this model."
For instance, if you define a schema as below:

```javascript
var bandSchema = new Schema({
  name: String,
  lead: { type: ObjectId, ref: 'people', autopopulate: true }
});
bandSchema.plugin(require('mongoose-autopopulate'));

var Band = mongoose.model('band2', bandSchema, 'bands');
```

Every time you call `Band.find()` or `Band.findOne()`,
`mongoose-autopopulate` will populate the `lead` field
for you. Now that mongoose 4.0 has pre and post hooks for
`find()` and `findOne()`, this plugin's implementation is
concise.

```javascript
module.exports = function(schema) {
  var pathsToPopulate = [];
  // Find every path that has an `autopopulate` option
  schema.eachPath(function (pathname, schemaType) {
    if (schemaType.options && schemaType.options.autopopulate) {
      var option = schemaType.options.autopopulate;
      pathsToPopulate.push({ path: pathname, autopopulate: option });
    }
  });

  /**
   *  On find() and findOne(), process autopopulate option
   *  for each path. If `autopopulate` is a function,
   *  mongoose-autopopulate will call it.
   */
  var autopopulateHandler = function() {
    var numPaths = pathsToPopulate.length;
    var optionsToUse;
    for (var i = 0; i < numPaths; ++i) {
      processOption.call(this,
        pathsToPopulate[i].autopopulate, pathsToPopulate[i].path);
    }
  };

  schema.
    pre('find', autopopulateHandler).
    pre('findOne', autopopulateHandler);
};
```

You can see the [full implementation on GitHub](https://github.com/vkarpov15/mongoose-autopopulate/blob/master/index.js).
The key pattern here is
[the `eachPath()` function](http://mongoosejs.com/docs/api.html#schema_Schema-eachPath).
This function allows you to iterate over every path in the
schema and check for `autopopulate` options. You will see
this function used in many plugins in order to find options
specified in the schema. Take note of this, you will see
this feature again when you look at the `mongoose-hidden`
plugin later.

Adding Extra Fields: mongoose-random
==================================

I recently ran into the
[`mongoose-random` plugin](https://www.npmjs.com/package/mongoose-random),
a plugin that enables you to efficiently query for a random 
document in your collection. This case is a good example for
where a plugin is excellent: this feature (probably) isn't 
important enough to be in the mongodb server or mongoose 
core. But, I implemented the same algorithm for querying a
random document back when I was working on Ascot Project,
so N=1 sample says that people still need to implement this
feature.

An efficient way to pull a random document from a
MongoDB collection is to associate a randomly generated
point `(x, y)` with each document such that `0 <= x, y < 1`.
To generate a random document, you pick another random
point `(a, b)` and ask MongoDB for the document closest
to `(a, b)`. You can do this efficiently by creating a
`2dsphere` index on the `(x, y)` points.


Here's how the plugin is implemented. You can find the
[full implementation on GitHub](https://github.com/matomesc/mongoose-random/blob/master/index.js).
The below code doesn't match the GitHub exactly, I changed
comments to flow better with this article and removed
some redundant code to make it more concise.

```javascript
function random(schema, options) {
  options = options || {};

  // Can specify a random function other than Math.random
  var randFn = options.fn || Math.random;
  var randCoords = function () { return [randFn(), randFn()] }

  // Create a path 'random' that's a GeoJSON point
  var path = options.path || 'random';
  var field = {};
  field[path] = {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: randCoords }
  };
  var index = {};
  index[path] = '2dsphere';

  // Add the 'random' field and a 2dsphere index on it
  schema.add(field);
  schema.index(index);

  /**
   *  Attach a `findRandom()` helper to the schema for
   *  syntactic sugar
   */
  schema.statics.findRandom = function (conditions, fields, options, callback) {
    if (!conditions || typeof conditions === 'function') {
      conditions = {};
    }

    conditions[path] = conditions[path] || {
      $near: {
        $geometry: { type: 'Point', coordinates: randCoords() }
      }
    };

    return this.find(conditions, fields, options, callback);
  };
}
```

*The above code is included from
[this GitHub repo](https://github.com/matomesc/mongoose-random)
and subject to the
[MIT license](http://opensource.org/licenses/MIT)*

Note that you can also create helper methods and functions
in your plugins, like the `findRandom()` function above.

Modifying Schema Options: mongoose-hidden
===========================================

The last plugin use case you'll see in this article is
tweaking schema options. This use case is primary useful
for defining
[transform functions](http://mongoosejs.com/docs/api.html#document_Document-toObject)
for the `toObject()` function. A classic example is
hiding certain sensitive fields before sending the object to 
the client, like passwords or email addresses.

The
[mongoose-hidden](https://www.npmjs.com/package/mongoose-hidden)
plugin gives you an easy way to always hide certain fields
from `toObject()` output. For instance, suppose you had
the following schema.

```javascript
var userSchema = new mongoose.Schema({
  name: String,
  password: { type: String, hide: true }
});
userSchema.plugin(require('mongoose-hidden'));

var User = mongoose.model('User', userSchema, 'users');
var user = new User({ name: 'Val', password: 'pwd' });
// Prints `{ "name": "Val" }`. No password!
console.log(JSON.stringify(user.toObject()));
```

The implementation of `mongoose-hidden` is pretty complex
because it has numerous options and has the ability to hide
virtuals. However, the general idea for implementing
the `hide` option for schemas is pretty straightforward.

```javascript
function HidePlugin(schema) {
  var toHide = [];
  schema.eachPath(function(pathname, schemaType) {
    if (schemaType.options && schemaType.options.hide) {
      toHide.push(pathname);
    }    
  });
  schema.options.toObject = schema.options.toObject || {};
  schema.options.toObject.transform = function(doc, ret) {
    // Loop over all fields to hide
    toHide.forEach(function(pathname) {
      // Break the path up by dots to find the actual
      // object to delete
      var sp = pathname.split('.');
      var obj = ret;
      for (var i = 0; i < sp.length - 1; ++i) {
        if (!obj) {
          return;
        }
        obj = obj[sp[i]];
      }
      // Delete the actual field
      delete obj[sp[sp.length - 1]];
    });

    return ret;
  };
}
```

The `transform` option is passed to `toObject()` and
`toJSON()`. It lets you define a function that manipulates
the returned object (the `ret` parameter in the transform
function above) before it is returned. In the above
case, you use the same `eachPath()` pattern you saw in the
mongoose-autopopulate plugin to get a list of fields to
hide. The `transform` function loops through all the
fields marked "hide" and deletes them in the final object.

Conclusion
==========

Mongoose plugins are a powerful feature that enable you to
reuse sophisticated functionality across your schemas. Too
often mongoose users ignore plugins. Using established
plugins can save you a lot of work, and writing your own
plugins gives you another way to
[DRY up](http://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
your code.