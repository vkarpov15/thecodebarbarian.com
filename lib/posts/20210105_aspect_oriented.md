[Aspect oriented programming](https://en.wikipedia.org/wiki/Aspect-oriented_programming) is a relatively new (early 2000s) design paradigm that makes code more modular by allowing you to add additional implicit behavior to existing functions in a controlled way. A more concrete example that Wikipedia uses
is "how do you log the parameters passed to every function whose name starts with 'create'?" Aspect oriented programming makes that easy: you can think of it as a
more general approach to middleware as it is implemented in [Express](https://masteringjs.io/tutorials/express/middleware) or [Mongoose](https://mongoosejs.com/docs/middleware.html).

I got started thinking about aspect oriented programming when I found myself
needing to paste the same `slack.send()` call in a bunch of different functions.
There had to be a better way to share this code between functions in a more
[framework-free](https://www.getrevue.co/profile/masteringjs/issues/framework-free-javascript-why-it-matters-188138) way: using Express middleware
would mean I wouldn't be able to execute the full stack of code without making
an HTTP request.

A More Concrete Example
-----------------------

Suppose you have an async function `createUser()` that adds a new user to the
database.

```javascript
async function createUser(params) {
  const user = new User(params);

  await user.save();

  return { user };
}
```

Suppose you call this function with `await createUser({ name: 'Bill Gates', email: 'bill@microsoft.com' })`. You can think of that function call as an object that
looks like this:

```
{
  _id: 777,
  functionName: 'createUser',
  params: { name: 'Bill Gates', email: 'bill@microsoft.com' },
  calledAt: '2021-01-01T00:00:01.000Z'
}
```

Now, imagine every time you call `createUser()`, that ends up as an object in
a stream or [observable](/rest-apis-with-observables.html) or event emitter or
some other structure that represents a sequence of multiple events. You can add logging, transform parameters, handle errors, or even change the function being called under the hood!

I wrote a highly simplified aspect oriented programming framework called [tao](https://www.npmjs.com/package/tao-js) a couple years ago that makes aspect oriented
programming line up with common JavaScript patterns. Here's how you can use tao to
log every function call that starts with `create`:

```javascript
const tao = require('tao-js');

const lib = tao({
  createUser: () => async function createUser() {
    // Simple stub
    return { user: null };
  }
})();

// Add middleware that checks the function name, and prints params
// if the function name starts with 'create'
lib.use(function middleware(action) {
  if (action.name.startsWith('create')) {
    console.log(action.params);
  }
});

// Prints "{ name: 'Bill Gates' }"
await lib.createUser({ name: 'Bill Gates' });
```

The `use()` function, which intentionally looks like [Express' `use()` function](https://masteringjs.io/tutorials/express/app-use), adds a middleware to `lib`.
Every time you call a function in `lib`, tao will execute the middleware. In
aspect-oriented programming terminology, `use()` adds an _advice_ called `middleware()`.

Advice is inherently implicit. Someone calling `createUser()` doesn't need to
be aware of what advice is being executed. Nor does someone working on the
`createUser()` function itself. This is interesting because a few years ago [avoiding the "implicit" side effects of middleware](https://github.com/vercel/micro/issues/8#issuecomment-178362486) was a trend in the JavaScript community, but thankfully this trend was short-lived and developers realized how silly it was.

Don't go overboard on making everything middleware. But, if we really want to
avoid all "implicit" behavior, your web application would have to explicity move bits around in the CPU cache and tell the hard drive disk head what part of the magnetic strip to read. 

Promises and Async Functions
----------------------------

If you read more than a few sentences about aspect oriented programming, you're
bound to stumble across the terms "pointcut" and "join point". Simply put, a
_join point_ is a point in your code where you can attach _advice_, and a _pointcut_ is a set of join points.

In tao, the only allowed join points are before a function call and after a function call, similar to `pre()` and `post()` in Mongoose. A pointcut is then a raw function,
without any associated middleware, like `createUser()` in the previous example.

How does tao allow you to add middleware without explicitly specifying `pre()`
or `post()`? Promises! In tao, an _action_ is an object representation of a
function call. And, yes, "action" is a metaphor for Redux actions. Each action
has a `promise` property that represents the eventual success or failure of this
function call. So to add middleware that executes after the function is done,
you use promise chaining and the [`then()` function](https://masteringjs.io/tutorials/fundamentals/then).

```javascript
lib.use(function printExecutionTime(action) {
  const start = Date.now();
  action.promise = action.promise.then(res => {
    console.log('Elapsed time', Date.now() - start);
    return res;
  });
});

// Prints "Elapsed time 1"
lib.createUser({ name: 'Bill Gates' });
```

Promises are normally "hot" in the sense that the underlying asyc operation starts 
executing immediately, but tao does [some extra work](https://github.com/vkarpov15/tao/blob/fee1a078029c87f2715add17a875b87324554885/lib/Library.js#L166-L171) to create a promise that represents the eventual result of `createUser()` without actually calling `createUser()` until all advice (middleware) is done executing.

As a consequence, tao only works with async functions. If create a tao library
with a sync function, tao will make that function return a promise.

An idea for some potential followup work is supporting [async generator functions](/async-generator-functions-in-javascript.html). JavaScript makes it difficult to interrupt a normal function while it is executing, but generator functions make it easy. Every `yield` statement in an async generator could be a new join point!

Versus Object Oriented Programming
----------------------------------

It's surprisingly common to dismiss aspect oriented programming out of hand by
saying "ugh, why do we need another alternative to OOP?" And that's a fair concern:
developers already know OOP, so introducing a new pattern can cause a lot of
confusion.

So, here's a thought exercise. How can you complete the "log all function calls that start with 'create'" task using object oriented programming, assuming that going through and adding a log statement to every function call isn't an option?

One approach would be to wrap every function in a class, and add a base class that
handles logging for you.

```javascript
class FunctionBase {
  constructor(name, executor) {
    this.name = name;
    this.executor = executor;
  }

  exec() {
    if (this.name.startsWith('create')) {
      console.log(arguments);
    }

    return this.executor.apply(null, arguments);
  }
}

class CreateUser extends FunctionBase {
  constructor() {
    super('createUser', createUser);
  }
}
```

This approach works. But the problem is that `FunctionBase` then becomes a 
[God class](https://en.wikipedia.org/wiki/God_object) that does way too much.
Without multiple inheritance, you're left with no way to break up `FunctionBase`
unless you create a middleware-based approach, which leads you right back to
aspect oriented programming.

The limitation of object oriented programming in JavaScript is that
inheritance is inherently many-to-one. Aspect oriented programming provides a
neater pattern for approaching many-to-many relationships, like "add logging to
this set of functions" or "add locking to this other set of functions", than
even multiple inheritance.

Moving On
---------

Aspect oriented programming is an interesting pattern that is worth exploring
more. I've been reading though [AspectJ in Action](https://www.manning.com/books/aspectj-in-action-second-edition), which explains aspect oriented programming as it is implemented in Java. However, JavaScript is a wildly different language with its own community and its own patterns. Try [tao](https://www.npmjs.com/package/tao-js) for a JavaScript flavored take on aspect oriented programming and let me know what you think in the comments!