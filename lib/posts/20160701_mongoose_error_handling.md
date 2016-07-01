Mongoose 4.5.0 introduces the ability to handle errors in middleware. This lets
you write middleware and plugins to transform errors into something useful
for your application. In other words, no more [cryptic "E11000 duplicate key" errors will leak to your users](https://github.com/Automattic/mongoose/issues/2284) if you set up
the correct middleware. If you've
used [Express' error handling middleware](http://expressjs.com/en/guide/error-handling.html),
mongoose's will look familiar.

An Aside On Mongoose Post Middleware
------------------------------------

Mongoose has 2 types of middleware, "pre" middleware and "post" middleware.
Pre middleware executes before the wrapped function, and post middleware
executes after the wrapped function.

```javascript
schema.pre('save', function(next) {
  console.log('before save');
  next();
});

schema.post('save', function(doc) {
  console.log('after save');
});

doc.save(); // Prints 'before save' followed by 'after save'
```

However, since mongoose 3.x post middleware has been interchangeable with
`on()` calls. In other words, `schema.post('save')` is the same thing as
`schema.on('save')`. Therefore, by design, mongoose document post middleware
does _not_ get flow control
([query post middleware does](http://mongoosejs.com/docs/middleware.html), and in 5.0 document post middleware will too).

```javascript
schema.post('save', function() {
  console.log('after save');
});

doc.save(function() {
  // May print "after save" after "save callback" or vice versa,
  // the order is undefined.
  console.log('save callback');
});
```

Mongoose 4.5 introduces a special type of document post middleware that
_does_ get flow control: error handlers.

Introducing Mongoose Error Handling Middleware
----------------------------------------------

You define an error handler the same way you define a normal post middleware.
To mark a post middleware as an error handler, you need to make it take 3
parameters:

```javascript
var schema = new Schema({
  name: {
    type: String,
    unique: true
  }
});

// Handler **must** take 3 parameters: the error that occurred, the document
// in question, and the `next()` function
schema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('There was a duplicate key error'));
  } else {
    next(error);
  }
});

var Person = mongoose.model('Person', schema);

var person = { name: 'Val' };

Person.create([person, person], function(error) {
  // Will print out "There was a duplicate key error"
  console.log(error);
});
```

An error handler middleware _only_ gets called when an error occurred. In
other words, the above error handler middleware will only execute if a
pre save hook called `next()` with an error, if `save()` calls back with
an error, or if a previous post hook called `next()` with an error.

```javascript
schema.pre('save', function(next) {
  // This middleware will prevent `save()` from executing and go straight
  // to executing the error handling middleware
  next(new Error('pre save error'));
});

schema.post('save', function(doc, next) {
  // If this hook is defined _before_ an error handler middleware, this will
  // skip all other non-error-handler post save hooks and execute the next
  // error handler middleware
  next(new Error('post save error'));
});
```

As an aside, there are 4 functions in mongoose that can trigger a
duplicate key error: `save()`, `insertMany()`, `update()`, and
`fineOneAndUpdate()`. The `create()` function can also trigger a duplicate
key error, but `create()` is just a thin wrapper around `save()`. Here's how
you can handle duplicate key errors for all these functions:

```javascript
var schema = new Schema({
  name: {
    type: String,
    unique: true
  }
}, { emitIndexErrors: true });

var handleE11000 = function(error, res, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('There was a duplicate key error'));
  } else {
    next();
  }
};

schema.post('save', handleE11000);
schema.post('update', handleE11000);
schema.post('findOneAndUpdate', handleE11000);
schema.post('insertMany', handleE11000);

var Person = mongoose.model('Person', schema);
```

With this new feature, you can write plugins that can convert MongoDB-specific
errors (like the duplicate key error above) as well as mongoose-specific errors
(like validation errors) into something that makes sense for your application.

Moving On
---------

Mongoose error handling middleware gives you a centralized mechanism for
handling errors in your application. You can use error handlers for logging
and even transforming errors, so you can standardize error formatting for your
API. I'm especially excited to see what [plugins](http://thecodebarbarian.com/2015/03/06/guide-to-mongoose-plugins)
you can write using error handling middleware.
