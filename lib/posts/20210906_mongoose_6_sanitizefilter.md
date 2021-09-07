[Mongoose 6](/introducing-mongoose-6.html) was released August 24, 2021, with over 50 (mostly minor) breaking changes.
This release also introduces a new feature that I've started using across my Mongoose apps: the `sanitizeFilter` option, and its corresponding `mongoose.trusted()` function.
The `sanitizeFilter` option protects your apps against [query selector injection attacks](/2014/09/04/defending-against-query-selector-injection-attacks.html), which are a potentially serious security issue.
Enabling `sanitizeFilter` allows you to use untrusted user data in query filters without risking query selector injections.

Primer on Query Selector Injection Attacks
-----------------------------------------

Query selector injection vulnerabilities occur when you pass user-specified data to query filters, like the first parameter to `findOne()`.
For example, suppose you use the below logic to implement logging in with a password.
Of course, the below code is bad for several reasons, some of which you can read about [here](/thoughts-on-user-passwords-in-rest-apis.html), but please consider it for the sake of an example.

```javascript
const user = await User.findOne({ email: req.body.email, hashedPassword: req.body.hashedPassword });
```

The above query assumes that `req.body.hashedPassword` is a string, or at least a [primitive](https://masteringjs.io/tutorials/fundamentals/primitives).
In some cases, that might be safe.
For example, [Express route params](https://masteringjs.io/tutorials/express/route-parameters) and headers are always strings or [nullish](https://masteringjs.io/tutorials/fundamentals/falsy#nullish-values).
But what happens if `req.body` is the below JavaScript object?

```
{
  email: 'john@acme.com',
  hashedPassword: { $ne: null }
}
```

The above `req.body` will make the `User.findOne()` query find users whose `email` is 'john@acme.com', and whose password is _any_ non-null value.
If you use this section's `User.findOne()` query for login, that means a malicious user can log in to any user's account **without their password.**

Why doesn't Mongoose protect against this by default?
Because Mongoose can't tell at runtime whether you're passing it trusted data, or unsanitized user-specified data.
For example, you may be writing a script that needs to iterate through all users that have a non-null password, and, in that case, Mongoose should let the `$ne: null` query filter through.

The way to prevent query selector injections is to _explicitly specify a query selector_ when the query filter property isn't always a primitive.

```javascript
const user = await User.findOne({
  email: { $eq: req.body.email },
  hashedPassword: { $eq: req.body.hashedPassword }
});
```

There's nothing stopping you from adding `$eq` to every query filter property.
But Mongoose 6 can make that easier for you using the `sanitizeFilter` option.

Using `sanitizeFilter`
----------------------

The `sanitizeFilter` option is an option for [queries](https://mongoosejs.com/docs/queries.html), as well as [`mongoose.set()`](https://mongoosejs.com/docs/api/mongoose.html#mongoose_Mongoose-set).
If `sanitizeFilter` is enabled, Mongoose will wrap any objects in the query filter with [MongoDB's `$eq` query operator](https://docs.mongodb.com/manual/reference/operator/query/eq/), which blocks query selector injections.

```javascript
// With `sanitizeFilter`, Mongoose converts the below query to
// `{ email, hashedPassword: { $eq: { $ne: null } } }`
const user = await User.findOne({ email: 'john@acme.com', hashedPassword: { $ne: null } }).
  setOptions({ sanitizeFilter: true });
```

The `$eq` operator means the above query will find documents whose `email` is 'john@acme.com', and whose `hashedPassword` property is deep equal the object `{ $ne: null }`.
By default, Mongoose will throw a `CastError` on the above query, because `{ $ne: null }` isn't something that Mongoose can convert to a string.

The `sanitizeFilter` option is false by default, because making it true by default would break too many people's code.
Thus far, I typically enable `sanitizeFilter` on individual queries.
If a query takes parameters directly from `req.body` or `req.query`, I add `setOptions({ sanitizeFilter })`.

But, like with many other Mongoose options, you can tell Mongoose to make `sanitizeFilter` true by default as shown below.

```javascript
// Make `sanitizeFilter` true by default
mongoose.set('sanitizeFilter', true);
```

The above line changes the default value of `sanitizeFilter`.
You can still turn `sanitizeFilter` off for individual queries:

```javascript
// Disable `sanitizeFilter` for this query if `sanitizeFilter` is true by default
const users = await User.find({ hashedPassword: { $ne: null } }).setOptions({ sanitizeFilter: false });
```

If you prefer explicitly calling a function rather than setting an option, Mongoose also exports a `sanitizeFilter()` function.
The `sanitizeFilter()` function lets you sanitize input against query selector injections yourself.

```javascript
const filter = mongoose.sanitizeFilter({
  email: req.body.email,
  hashedPassword: req.body.hashedPassword
});

const user = await User.findOne(filter);
```

Mixing Trusted and Untrusted Filters with `trusted()`
-----------------------------------------------------

Sometimes you may want to add a couple query selectors to an otherwise untrusted query.
For example, suppose you want to add an additional filter to the `User.findOne({ email, hashedPassword })` query that filters out deleted users.

```javascript
const user = await User.findOne({
  // Throws a CastError because `sanitizeFilter` will convert `{ $ne: true }` to
  // `{ $eq: { $ne : true } }`
  isDeleted: { $ne: true },
  email: req.body.email,
  hashedPassword: req.body.hashedPassword
}).setOptions({ sanitizeFilter: true });
```

Here the fundamental problem of query selector injections pops up again: there's no way for Mongoose to know at runtime whether `{ $ne: true }` is a safe constant hard-coded by the app developer or potentially malicious user-specified data.

In order to explicitly label part of a query as trusted, you can use the `mongoose.trusted()` function as shown below.

```javascript
const user = await User.findOne({
  // Tell Mongoose to not sanitize `{ $ne: true }`
  isDeleted: mongoose.trusted({ $ne: true }),
  email: req.body.email,
  hashedPassword: req.body.hashedPassword
}).setOptions({ sanitizeFilter: true });
```

Another alternative to using `trusted()` is using the [spread operator](/object-assign-vs-object-spread.html) with the `sanitizeFilter()` function.
Keep the `sanitizeFilter` option off by default, and instead mix in the sanitized data to the filter using `...` as shown below.

```javascript
const user = await User.findOne({
  isDeleted: { $ne: true },
  ...mongoose.sanitizeFilter({
    email: req.body.email,
    hashedPassword: req.body.hashedPassword
  })
});
```

An Alternative Pattern: `eq()` Query Helper
----------------------------------------

Here's an interesting idea to consider: why are there no update selector injections in MongoDB?
The answer is that update operators are top-level properties in the update object:

```javascript
const update = {
  $set: {
    email: 'john@acme.com'
  }
};
```

As opposed to nested within the properties being updated:

```javascript
// This is NOT valid MongoDB syntax, but illustrates the key difference between filters and
// updates in the context of security vulnerabilities.
const update = {
  email: {
    $set: 'john@acme.com'
  }
};
```

This means it is safe to do `const update = { $set: req.body }` (using Mongoose to validate data of course) because you specified that you're `$set`-ing _all_ the properties of `req.body`.
There's no way for a malicious user to overwrite the `$set`.

Another option we considered for defending against query selector injections in Mongoose is a chaining syntax inspired by updates.
This syntax was [discussed in this GitHub issue](https://github.com/Automattic/mongoose/pull/10430).
Below is how the proposed syntax would look on the query from the previous section.
Please note that this syntax is **not yet supported** as of Mongoose 6.0.x.

```javascript
const user = await User.findOne().
  ne({ isDeleted: true }). // `{ isDeleted: { $ne: true } }
  eq({
    email: req.body.email,
    hashedPassword: req.body.hashedPassword
  }); // `{ email: { $eq: req.body.email }, hashedPassword: { $eq: req.body.hashedPassword } }
```

This syntax makes it easier to ensure that _every_ property in the query filter has an explicit query selector.
Query selector injections only happen when you don't explicitly set a filter, so this syntax also blocks query selector injections.

We may support this syntax in a future Mongoose version.
But we decided against it for Mongoose 6 because the fact that such an `eq()` helper would protect against security vulnerabilities isn't as immediately obvious as we would like.

Moving On
---------

The `sanitizeFilter` option and `sanitizeFilter()` function are just a couple of the improvements we've made in Mongoose 6.
Mongoose 6 is our first breaking change in over 3 years, and is packed with cool new features and improvements, like [arrays as proxies](/introducing-mongoose-6.html#arrays-as-proxies).
Next in our Mongoose 6 series, I'll cover the `Connection#asPromise()` method and duplicate query detection.
