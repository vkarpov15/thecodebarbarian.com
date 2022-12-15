[Mongoose 6.8.0 was released on December 5, 2022](https://github.com/Automattic/mongoose/releases/tag/6.8.0) and includes several cool new features.
The most notable change is alpha support for [Deno](https://deno.land/).
Deno support is a huge step for Mongoose, because this is the first time Mongoose has introduced support for a server-side JavaScript runtime that isn't Node.
This blog post will also cover document-specific validation error messages, another new feature in 6.8.

Using Mongoose with Deno
-----------------

[Deno](https://deno.land/) is a server-side JavaScript runtime.
It serves a similar purpose to Node, but Deno makes several different design decisions, like default support for ESM and denying access to the file system by default.
With Mongoose 6.8 and Deno 1.28, you can import Mongoose using [Deno's CommonJS module compatibility layer](https://deno.land/std@0.166.0/node/README.md?source=#commonjs-modules-loading) as follows.

```javascript
import { createRequire } from 'https://deno.land/std/node/module.ts';
const require = createRequire(import.meta.url);

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/test')
  .then(() => console.log('Connected!'));
```

You can then run the above script using the following command.

```
deno run --allow-read --allow-env --allow-net --allow-sys ./deno-test.js 
```

Mongoose requires the following Deno permissions:

- `allow-read` because CommonJS `require()` reads from the file system
- `allow-env` because the MongoDB Node driver reads certain environment variables for AWS credentials support
- `allow-net` to open a socket connection to MongoDB
- `allow-sys` because the MongoDB Node driver reads information about your OS release

You can also use Deno's new [npm specifiers](https://deno.land/manual@v1.29.0/node/npm_specifiers) to import Mongoose.
We currently use `createRequire()` in Mongoose's docs and test suite, but npm specifiers also work.
With npm specifiers, you still need to load Deno's `std/node` polyfill, because Mongoose uses Node built-ins like `process`.

```javascript
import 'https://deno.land/std/node/module.ts';
import mongoose from 'npm:mongoose@6';

mongoose.connect('mongodb://localhost:27017/test')
  .then(() => console.log('Connected!'));
```

Keep in mind that Mongoose's support for Deno is new, there will likely be unforeseen bugs.
We're currently running a simple Mongoose app in production with Deno, and we haven't run into any issues.
But we advise using caution if you're looking to switch an existing Mongoose app over to Deno, or using Mongoose in an existing Deno app.

In particular, it is worth noting that, while Mongoose does support Deno, the MongoDB Node driver that Mongoose uses to talk to MongoDB does not.
If you run into any issues, please report them on [Mongoose's GitHub](https://github.com/Automattic/mongoose/issues/new/choose).

Document-Specific Validation Error Messages
--------------

Document-specific validation error messages are a much smaller, but still very useful, new feature in Mongoose 6.8.
Mongoose supports custom validation errors: when a validator function returns a falsy value, Mongoose creates a new validator error with the given error message.

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    match: [
      /^[^@]+@\w+(\.\w+)+\w$/, // Regex from https://masteringjs.io/tutorials/fundamentals/email-validation
      'Email is invalid' // Error message if email doesn't match
    ]
  }
});

const User = mongoose.model('User', userSchema);

const doc = new User({ email: 'fail' });
// "User validation failed: email: Please enter a valid email address"
console.log(doc.validateSync());
```

The 2nd element in the `match` array is the message that Mongoose reports if the `email` doesn't match the given regular expression.
The message parameter can also be a function.
If the message parameter is a function, Mongoose calls the function with the current value as the first argument.

As of Mongoose 6.8, Mongoose also passes the current document being validated as the 2nd argument to the message function.
This makes it easier to switch the error message based on a different property of the document.
For example, suppose you want to switch the language of the error message based on a `locale` property in the document.

```javascript
const messages = {
  en: 'Email is invalid', // English
  es: 'Email es invalido' // Spanish
};

const userSchema = new mongoose.Schema({
  locale: {
    type: String,
    enum: ['en', 'es'],
    default: 'en'
  },
  email: {
    type: String,
    match: [
      /^[^@]+@\w+(\.\w+)+\w$/, // Regex from https://masteringjs.io/tutorials/fundamentals/email-validation
      function formatEmailValidatorError(value, doc) {
        // `doc` parameter is new in Mongoose 6.8.
        return messages[doc.locale];
      }
    ]
  }
});
```

Moving On
---------

Deno support is the most exciting new feature in Mongoose 6.8.
This represents a big step forward for Mongoose, as the first major step we've taken outside of Node since we introduced basic browser support in 2015 with 4.0.
There are 7 other new features in 6.8 as well, including document-specific validation error messages, a `$clone()` method for [documents](https://mongoosejs.com/docs/documents.html), and automatically inferred [timestamps](https://mongoosejs.com/docs/timestamps.html) in TypeScript.
Make sure you upgrade to take advantage of the new features!

_Want to become your team's MongoDB expert? "Mastering Mongoose" distills 10 years of hard-earned lessons building Mongoose apps at scale into 153 pages. That means you can learn what you need to know to build production-ready full-stack apps with Node.js and MongoDB in a few days. <a href="https://masteringjs.io/ebooks/mastering-mongoose">Get your copy</a>!_

<a href="https://masteringjs.io/ebooks/mastering-mongoose" class="async-await-banner">
  <img src="https://masteringjs.io/ebooks/mastering-mongoose-horizontal.png">
</a>