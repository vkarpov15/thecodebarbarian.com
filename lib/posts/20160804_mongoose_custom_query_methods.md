One particularly neat feature of mongoose is the [chainable query builder API](http://mongoosejs.com/docs/queries.html). This API provides the ability to build up MongoDB queries with helper methods, rather than via a JSON object.

```javascript
// Query the Project model using the query builder API
Project.find().where('name').equals('mongoose');

// Using JavaScript
Project.find({ name: 'mongoose' });
```

The `find()` function returns a [mongoose Query object](http://mongoosejs.com/docs/queries.html).

Before mongoose 4.5, the query builder API was not extensible. In other words,
you could define a static function on the model which would create a query
for you, but that function would not be chainable.

```javascript
ProjectSchema.statics.byName = function(name) {
  return this.find({ name: name });
};
var Project = mongoose.model('Project', ProjectSchema);

// Works
Project.byName('mongoose').where('stars').gt(1000);

// Doesn't work - `byName` is only defined on the `Project` model,
// not the Query object that `find()` returns.
Project.find().where('stars').gt(1000).byName('mongoose');
```

Introducing Custom Query Methods
--------------------------------

In mongoose 4.5 there is a separate notion of a [query method](http://mongoosejs.com/docs/guide.html#query-helpers).
You can define a custom query method by attaching a property to a schema's
`query` property:

```javascript
ProjectSchema.query.byName = function(name) {
  return this.find({ name: name });
};
var Project = mongoose.model('Project', ProjectSchema);

// Works. Any Project query, whether it be `find()`, `findOne()`,
// `findOneAndUpdate()`, `delete()`, etc. now has a `byName()` helper
Project.find().where('stars').gt(1000).byName('mongoose');
```

Custom query methods make code more semantic and easier to read. For example,
using custom query functions, you can take this somewhat obfuscated query:

```javascript
Event.find({
  loc: {
    $geoWithin: {
      $center: [[-122.33, 37.57], 10 / 3963.2
    }
  },
  start: {
    $gte: new Date()
  }
});
```

Into something easier to grok:

```javascript
EventSchema.query.withinMiles = function(coords, miles) {
  return this.find({
    loc: {
      $geoWithin: {
        $center: [coords, miles / 3963.2]
      }
    }
  });
};
EventSchema.query.inTheFuture = function() {
  return this.find({
    $gte: new Date()
  });
};

// Get all events within 10 miles of the San Mateo Caltrain stop that
// have not started yet.
Event.find().withinMiles([-122.33, 37.57], 10).inTheFuture().exec();
```

Writing An Access Control Plugin
--------------------------------

Query methods are especially powerful with [plugins](http://mongoosejs.com/docs/plugins.html). For example, let's say you
wanted to write a rudimentary plugin that would restrict access to an object
to the user that owns the object and admin users.

```javascript
const ACLPlugin = schema => {
  schema.add({
    ownerId: mongoose.Schema.Types.ObjectId
  });

  schema.query.checkPermissions = function(user) {
    if (user.isAdmin) {
      return this;
    }
    return this.find({ ownerId: user._id });
  };
};

// Apply plugin to ProjectSchema
ProjectSchema.plugin(ACLPlugin);

Project.
  find({ name: 'mongoose' }).
  checkPermissions(user).
  update({ version: '4.5.0' }, function(error, res) {
    // Will only apply update if user is admin or owner because of
    // ACLPlugin
  });
```

You can even put the `checkPermissions()` call in a [pre hook](http://mongoosejs.com/docs/middleware.html).

Moving On
---------

Custom query methods are the last of the [mongoose 4.5.0 features](https://github.com/Automattic/mongoose/blob/master/History.md#450--2016-06-13) I'll cover on my blog. The other features I covered are [virtual populate](http://thecodebarbarian.com/mongoose-virtual-populate.html),
[error handling middleware](http://thecodebarbarian.com/mongoose-error-handling.html),
and [cursors (AKA the new streaming API)](http://thecodebarbarian.com/cursors-in-mongoose-45.html). Be sure to
check out the articles you've missed, mongoose 4.5.0 has some extraordinary
new features that can save you a lot of time and hassle.
