[Mongoose 4.5 introduced custom query methods](http://thecodebarbarian.com/mongoose-custom-query-methods), which
enabled you to extend Mongoose's [chainable query builder](http://mongoosejs.com/docs/queries.html) with your own custom helper functions. By attaching a function to your schemas `query` property, you could
create neat helper functions to encapsulate common query logic.

```javascript
var ProjectSchema = new Schema({ name: String, stars: Number });
ProjectSchema.query.byName = function(name) {
  return this.find({ name: name });
};
var Project = mongoose.model('Project', ProjectSchema);

// Works. Any Project query, whether it be `find()`, `findOne()`,
// `findOneAndUpdate()`, `delete()`, etc. now has a `byName()` helper
Project.find().where('stars').gt(1000).byName('mongoose');
```

Mongoose queries automatically cast, so you don't have to worry about a
non-string `name` in your query:

```javascript
Project.find().byName({ notA: String }).exec(function(error) {
  // CastError: Cast to string failed for value
  // "{ notA: [Function: String] }" at path "name"
  console.log(error);
});
```

That works for casting errors, but what about if your query method wants to
report an error? Enter in the `Query.prototype.error()` function.

Using `this.error()` to Report Errors
-------------------------------------

The above `byName()` function has a few potentially unexpected behaviors.
For example, it is perfectly OK to pass a regular expression to the `byName()`
function.

```javascript
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/test', { useMongoClient: true });

mongoose.set('debug', true);

var ProjectSchema = new mongoose.Schema({ name: String, stars: Number });
ProjectSchema.query.byName = function(name) {
  return this.find({ name: name });
};
var Project = mongoose.model('Project', ProjectSchema);

run().catch(error => console.error(error.stack));

async function run() {
  await mongoose.connection.dropDatabase();

  await Project.create({ name: 'mongoose', stars: 13000 });
  const projects = await Project.find().byName(/.*e.*/i);
  // Prints out the mongoose project
  console.log(projects);
}
```

[Regular expressions in MongoDB](https://docs.mongodb.com/manual/reference/operator/query/regex/) are useful, but
have some [performance ramifications](https://docs.mongodb.com/manual/reference/operator/query/regex/#index-use). In order to avoid a potential index miss on a huge collection, you might
want to disallow passing regexps to the `byName()` function. To do this, you
should call `this.error()` in your `byName()` function. The query promise will
then reject before actually executing the query.

```javascript
var ProjectSchema = new mongoose.Schema({ name: String, stars: Number });
ProjectSchema.query.byName = function(name) {
  if (name instanceof RegExp) {
    // Record an error and return this query builder instance
    return this.error(new Error(`Parameter to byName() cannot be a regexp, got ${name}`));
  }
  return this.find({ name: name });
};
var Project = mongoose.model('Project', ProjectSchema);

run().catch(error => console.error(error.stack));

async function run() {
  await mongoose.connection.dropDatabase();

  await Project.create({ name: 'mongoose', stars: 13000 });

  // Error: Parameter to byName() cannot be a regexp, got /.*e.*/i
  const projects = await Project.find().byName(/.*e.*/i);
  // Never executes
  console.log(projects);
}
```

The error will not be reported until you actually try to execute the query.
So you will get a promise rejection rather than an exception, and not until
you call `.exec()` or `.then()`. For example, you can clear the error with
`.error(null)`.

```javascript
async function run() {
  await mongoose.connection.dropDatabase();

  await Project.create({ name: 'mongoose', stars: 13000 });

  const projects = await Project.find().byName(/.*e.*/i).
    // Explicitly null out the error so the query executes
    error(null);
  // Prints out the mongoose project
  console.log(projects);
}
```

`.error()` records the **last** error that occurred, so errors that occur
later will overwrite previous errors. Casting happens after all custom query
logic, so cast errors will overwrite any user-reported errors.

```javascript
async function run() {
  await mongoose.connection.dropDatabase();

  await Project.create({ name: 'mongoose', stars: 13000 });

  try {
    await Project.find({ stars: 'bad value' }).byName(/.*e.*/i);
  } catch (error) {
    // CastError: Cast to number failed for value "bad value" at path "stars"
    console.log(error);
  }

  try {
    await Project.find().byName(/a/).byName(/b/);
  } catch (error) {
    // Error: Parameter to byName() cannot be a regexp, got /b/
    console.log(error);
  }
}
```

Why Not Just `throw`?
---------------------

Another alternative is to `throw` an error in your custom query method.

```javascript
var ProjectSchema = new mongoose.Schema({ name: String, stars: Number });
ProjectSchema.query.byName = function(name) {
  if (name instanceof RegExp) {
    throw new Error(`Parameter to byName() cannot be a regexp, got ${name}`);
  }
  return this.find({ name: name });
};
var Project = mongoose.model('Project', ProjectSchema);
```

If you're using async/await, the above code works as well the `.error()`
logic. The `try/catch` blocks will catch the synchronous error, but the
error thrown will be the **first** error, rather than the last.

```javascript
async function run() {
  await mongoose.connection.dropDatabase();

  await Project.create({ name: 'mongoose', stars: 13000 });

  try {
    await Project.find({ stars: 'bad value' }).byName(/.*e.*/i);
  } catch (error) {
    // Error: Parameter to byName() cannot be a regexp, got /.*e.*/i
    console.log(error);
  }

  try {
    await Project.find().byName(/a/).byName(/b/);
  } catch (error) {
    // Error: Parameter to byName() cannot be a regexp, got /a/
    console.log(error);
  }
}
```

Throwing an exception in the custom query method is a viable alternative if
you're using [async/await](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html), but not if you're using promise chaining. Currently,
exceptions in custom query methods bubble up as a synchronous exception. Also,
if your custom query method throws an exception then no other functions in
the chain will execute. In the `Project.find().byName(/a/).byName(/b/)`, the
`byName(/b/)` call never executes. Whether this is correct for your application
is open to debate.

Moving On
---------

Mongoose 4.12 has 8 new features, including [improved connection events](http://thecodebarbarian.com/mongoose-4.12-improved-connection-events.html) and [single embedded discriminators](http://thecodebarbarian.com/mongoose-4.12-single-embedded-discriminators.html). Make sure you upgrade to take advantage of these new features,
including custom query method errors!
