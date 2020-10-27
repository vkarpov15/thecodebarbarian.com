Mongoose has been receiving a lot of issues related to [TypeScript](https://www.typescriptlang.org/) support. We're currently working hard to ship officially
supported TypeScript bindings, so users no longer have to rely on community-supported
bindings from [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped).
In this article, I'll present the patterns that are commonly used to build Mongoose apps with TypeScript.

Hello, World
------------

First, install the necessary packages:

```
npm install mongoose typescript @types/mongoose
```

To get started with Mongoose, you should create a [model](https://mongoosejs.com/docs/models.html). In TypeScript, a _model_ is an interface that provides several ways
to access _documents_. A document is a single object stored in MongoDB.

```typescript
import { model, Schema, Model, Document } from 'mongoose';

interface IUser extends Document {
  email: string;
  firstName: string;
  lastName: string;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true }
});

const User: Model<IUser> = model('User', UserSchema);
```

Suppose the above code is in the file `test.ts`. Run `./node_modules/.bin/tsc test.ts`
to compile the above file into a `test.js` file that you can run with `node ./test.js`.

Here's how you can create a new user using the above model.

```typescript
(async function() {
  await connect('mongodb://localhost:27017/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const user: IUser = await User.create({
    email: 'bill@microsoft.com',
    firstName: 'Bill',
    lastName: 'Gates'
  });

  console.log('Done', user.email);
})();
```

Note that `IUser` and `User` are different. `User` is technically not a class
according to `@types/mongoose`, because [TypeScript doesn't have good support for functions that return classes](https://stackoverflow.com/questions/35314114/how-can-i-return-a-class-from-a-typescript-function). Instead, `User` is an
object that matches the `Model<IUser>` interface. In particular, `User` has a
constructor that returns an instance of `IUser`, **not** `User`.

```typescript
const user: IUser = new User({
  email: 'bill@microsoft.com',
  firstName: 'Bill',
  lastName: 'Gates'
});

await user.save();
```

Queries
-------

Creating a model is somewhat tricky, but once you have a model, executing queries
with Mongoose and TypeScript is much easier. For example, here's how you can execute
`findOne()` and [`find()`](/how-find-works-in-mongoose.html) queries with static type checking:

```javascript
const user: IUser = await User.findOne({ email: 'bill@microsoft.com' });

const users: Array<IUser> = await User.find({ email: 'bill@microsoft.com' });
```

TypeScript is smart enough to catch if you use the wrong type. For example, if
you instead do `const users: IUser = await User.find(...)`, the TypeScript compiler
will fail with the below error:

```
$ ./node_modules/.bin/tsc ./test.ts 
test.ts:31:9 - error TS2740: Type 'IUser[]' is missing the following properties from type 'IUser': email, firstName, lastName, increment, and 55 more.

31   const users: IUser = await User.find({ email: 'bill@microsoft.com' });
           ~~~~~


Found 1 error.

$ 
```

One issue with `@types/mongoose` that Mongoose's TypeScript bindings will fix is
better support for query chaining. For example, the below chaining syntax is
perfectly valid Mongoose code, but the TypeScript compiler will fail with a
`Property 'updateOne' does not exist` error.

```typescript
// Equivalent to `User.updateOne({ email }, { firstName })`
const res: any = await User.
  find({ email: 'bill@microsoft.com' }).
  updateOne({}, { firstName: 'William' });
```

Middleware
----------

Most Mongoose TypeScript tutorials don't discuss middleware, the only one I've
read is [this detailed tutorial](https://medium.com/@agentwhs/complete-guide-for-typescript-for-mongoose-for-node-js-8cc0a7e470c1). The general idea is that [`Schema#pre()`](https://mongoosejs.com/docs/api/schema.html#schema_Schema-pre) and [`Schema#post()`](https://mongoosejs.com/docs/api/schema.html#schema_Schema-post) take a generic parameter that determines the type of `this` within the middleware function. That's how you can take into account the [different types of middleware](https://mongoosejs.com/docs/middleware.html#types-of-middleware) in Mongoose.

For example, for document middleware, like `save()`, the generic parameter is the document type:

```typescript
UserSchema.pre<IUser>('save', function() {
  // `this` is an instance of `IUser`
  console.log(this.email);
});
```

For query middleware, like `findOne()`, the generic parameter is a `Query<IUser>`:

```typescript
UserSchema.pre<Query<IUser>>('findOne', function() {
  // Prints "{ email: 'bill@microsoft.com' }"
  console.log(this.getFilter());
});
```

However, it is up to you to make sure you pass the correct type, `@types/mongoose` doesn't always ensure you have the correct generic type for the correct middleware.
For example, TypeScript lets the below code pass, even though `this` is actually a query in the given middleware function.

```typescript
UserSchema.pre<IUser>('findOne', function() {
  console.log(this.email);
});
```

Moving On
---------

Thus far, Mongoose works fairly well with TypeScript, but there's a lot of work to be done to make Mongoose's TypeScript bindings line up with how Mongoose is meant to be used. As a first step, we've been working on [officially supported TypeScript bindings](https://github.com/Automattic/mongoose/issues/8108) for Mongoose, as an alternative to `@types/mongoose`. Please fill out [this Google form](https://docs.google.com/forms/d/e/1FAIpQLSdblAEh09uJJiDJ8ULyXkcF3oTNiqxM_5hZe0jwReaN0VgWMg/viewform) if you're interested in helping test out our TypeScript bindings!