Let's be frank: backwards-breaking API changes are painful. Especially when
there's no good way for the library to tell you when you're using the API
incorrectly. This was my dilemma in upgrading a codebase from [MongoDB Node driver](http://npmjs.com/package/mongodb) 2.1.x to 3.x. In particular,
dropping support for the [`fields` parameter](https://github.com/mongodb/node-mongodb-native/blob/master/HISTORY.md#breaking-changes-1) was brutal because this syntax was used everywhere in the code.

```javascript
// In MongoDB Driver 2.x, `{ key: 1 }` would mean key2 was excluded from the
// results. Not in MongoDB Driver 3.x.
const doc = await db.collection('Test').findOne({}, { key1: 1 });
console.log(doc);

// Same for `find()`. MongoDB driver 3.x prints:
// `[ { _id: 5b9ae07d9b6dcf3725f3d74d, key1: 'foo', key2: 'bar' } ]`
// But 2.x prints:
// `[ { _id: 5b9ae07d9b6dcf3725f3d74d, key1: 'foo' } ]`
const docs = await db.collection('Test').find({}, { key1: 1 }).toArray();
console.log(docs);
```

I'm sure there are a lot of ways to migrate this code, but since we already had
a robust test suite and used [monogram](https://www.npmjs.com/package/monogram),
I used [Monogram's middleware](https://github.com/boosterfuels/monogram#enforcing-internal-best-practices) to throw an error every time `find()` and `findOne()` were used incorrectly.

An Overview of Middleware in Monogram
-------------------------------------

The key idea behind everything in Monogram is to [create an object representation of a function call](https://github.com/boosterfuels/monogram#actions). Whenever
you call any collection function in Monogram, like `find()` or `findOne()`, Monogram creates an object called an _action_ that contains the most pertinent information about that function call:

* The function's name
* The name of the collection it is operating on
* What parameters were passed in
* The original stack trace

Monogram actions are a similar concept to [Redux actions](https://redux.js.org/basics/actions). Monogram then passes the action through a list of user-defined middleware functions. For example, below is a
middleware function that prints out the function your code is calling and its parameters.

```javascript
const { connect } = require('monogram');
const { inspect } = require('util');

run().catch(error => console.error(error.stack));

async function run() {
  const db = await connect('mongodb://localhost:27017/test', {
    useNewUrlParser: true
  });

  await db.dropDatabase();

  // Monogram middleware takes in a single parameter, the action, an
  // object representation of the function being called.
  db.collection('Test').pre(action => {
    const paramsAsString = action.params.map(inspect).join(', ');
    // Prints:
    // "insertOne({ key1: 'foo', key2: 'bar' })"
    // "findOne({}, { key1: 1 })"
    console.log(`${action.name}(${paramsAsString})`);
  });

  await db.collection('Test').insertOne({ key1: 'foo', key2: 'bar' });

  const doc = await db.collection('Test').findOne({}, { key1: 1 });
  console.log(doc);
}
```

Now that you can define middleware that can see all function calls on a given
collection, let's take a look at how to actually solve the original problem of
catching code that's using the obsolete `find()` syntax.

Middleware to Detect Bad Function Calls
---------------------------------------

Among other things, Monogram middleware lets you throw errors when your function
call is using an outdated API. The general idea is to check if the 2nd argument
to `find()` and `findOne()` contains a property that isn't a [valid option for `findOne()`](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#findOne). In MongoDB Node driver 3.x, the 2nd parameter to `findOne()` is always
treated as an `options` object. Below is the middleware I used to throw an error
if the outdated API is used.

```javascript
db.collection('Test').pre(/^(find|findOne)$/, action => {
  const opts = action.params[1];
  const allowedOptions = ['projection', 'sort', 'skip', 'limit', 'hint'];
  if (opts != null &&
      Object.keys(opts).find(option => !allowedOptions.includes(option))) {
    throw new Error('MongoDB driver 3.x does not allow passing projection ' +
      'as 2nd arg to find(). Use `projection` instead. Got ' +
      require('util').inspect(opts));
  }
});
```

Monogram bubbles this error up with a neat stack trace. Even if this middleware
was async, Monogram would still retain the original stack trace from the initial
function call.

```
$ node test.js
Error: MongoDB driver 3.x does not allow passing projection as 2nd arg to find(). Use `projection` instead. Got { key1: 1 }
    at Object.db.collection.pre.action [as fn] (/home/project/test.js:16:13)
    at /home/project/node_modules/monogram/lib/collection.js:109:24
    at Generator.next (<anonymous>)
    at onFulfilled (/home/project/node_modules/co/index.js:65:19)
    at <anonymous>
    at process._tickCallback (internal/process/next_tick.js:188:7)
```

Moving On
---------

[Monogram](https://www.npmjs.com/package/monogram) provides a neat lightweight
middleware API on top of the [MongoDB Node.js Driver](https://www.npmjs.com/package/mongodb) for teams that find [Mongoose](https://www.npmjs.com/package/mongoose) too heavyweight. If you're
using the MongoDB Node.js Driver directly and are stuck on 2.x, give Monogram
a shot and save yourself the pain of tracking down every single place where
you use the 2.x-style projection syntax.
