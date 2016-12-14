Static typing is becoming very popular in the JavaScript community. While I'm
sure [TypeScript](http://www.typescriptlang.org/) is a brilliant feat of
engineering, I believe it's a product that gives you a 20% advantage for 80%
extra work. In my mind, TypeScript is a supplement
for mature JS dev teams with a lot of unavoidable complexity in their business
logic. For most JavaScript apps, runtime type casting is all you need.

What's Wrong With TypeScript?
-----------------------------

Here's a simple server in TypeScript:

```
import * as express from 'express';
import { json } from 'body-parser';

const app = express();
app.use(json());

class Test {
  public a: string;
}

app.post('/', (req, res) => {
  res.send((<Test> req.body).a.substr(0, 1)); // <-- Danger!
});

app.listen(3000);
```

Look carefully at the POST route. Let's say you hit the POST route with an
HTTP request where the body has a string property 'a':

<img src="http://i.imgur.com/UHRx9FJ.png">

Everything works as expected. But what if 'a' is a number?

<img src="http://i.imgur.com/7DSCBEr.png">

Everything goes boom. Experienced [TypeScript developers shouldn't find this surprising](https://basarat.gitbooks.io/typescript/content/docs/types/type-assertion.html#type-assertion-vs-casting), but I'm sure most TypeScript developers have
gotten bit by this at some point.

Is this an obscure edge case? I'd argue not. Static typing was designed for
the good old days when network interaction was an afterthought in programming.
If this where 1975 and you were working on Unix at Bell Labs,
your colleagues' work would usually be in the same program as yours. In other
words, you'd usually interface with your colleagues' code by calling a function,
and your compiler could check your types were correct.

Fast forward to 2016. Today, most organizations divide their code into smaller
programs that talk over networks (microservices, etc.). If you were working on
Photoshop in the 90's, you had one giant monolith and your compiler could check
your UI code's types matched with lower level function signatures. Today, most developers work on code
that's that talks to countless services written in
completely different languages on many different machines. No compiler will help
you ensure that the data coming into your program from the network is correct.

Runtime Type Casting with Archetype
-----------------------------------

At [Booster](https://boosterfuels.com/), we decided to rewrite our [LoopBack-based](https://loopback.io/) API earlier this year. LoopBack
helped us get a product out the door fast, but was riddled with too many
embarrassing bugs for us to continue using beyond the MVP phase.

The primary problem we
wanted to solve was data validation. The HTTP layer was not a
problem because [Express'](http://expressjs.com/) rich feature set is already
borderline overkill for us. Concurrency (AKA [callback hell](http://thecodebarbarian.com/2015/03/20/callback-hell-is-a-myth), promise hell, etc.) was not a problem either because of [co](http://thecodebarbarian.com/introducing-80-20-guide-to-es2015-generators). What we lacked was a good way to make sure the data coming in to the API was
correct. We evaluated a bunch of options:

* TypeScript didn't solve our problem
* [Joi](http://npmjs.org/package/joi) had a hopelessly ugly API and made it difficult to add custom types
* The various JSON schema modules didn't do a good job of supporting nested types and custom types
* [Mongoose](https://www.npmjs.com/package/mongoose) makes introspection difficult and is too closely coupled to MongoDB to use effectively in the browser.

Naturally, the solution was to write our own, and [archetype](https://www.npmjs.com/package/archetype-js) was born. Archetype
is an extensible and nestable library for runtime type casting. Let's say you
want to define what makes a valid `Person`:

```javascript
const { ObjectId } = require('mongodb');
const moment = require('moment');

// `Person` is now a constructor
const Person = new Archetype({
  name: 'string',
  bandId: {
    $type: ObjectId,
    $required: true
  },
  createdAt: {
    $type: moment,
    $default: () => moment()
  }
}).compile('Person');
```

`Person` is now a constructor that throws an error if and only if the given
data is invalid.

```javascript
try {
  new Person({
    name: 'test',
    bandId: 'ImNotAValidObjectId'
  });
} catch(error) {
  error.errors['bandId'].message; // Mongodb ObjectId error
}
```

If the data is valid, archetype will cast all the object's properties into
the given types: 'name' will be a string, 'bandId' will be a fully fledged
MongoDB ObjectId, and 'createdAt' will be a [moment.js](https://www.npmjs.com/package/moment) object.

There's nothing special about the moment or MongoDB ObjectId types. Writing your
own custom type is as simple as writing a class. For example, suppose you wanted
to work around the issue where [technically any string of length 12 is a valid parameter to the MongoDB ObjectId constructor](https://github.com/mongodb/js-bson/issues/112):

```javascript
const mongodb = require('mongodb');

class MyObjectId extends mongodb.ObjectId {
  constructor(v) {
    if (typeof v !== 'string' || !/^[0-9a-f]{24}$/.test(v)) {
      throw new Error(`Invalid value ${v}`);
    }
    super(v);
  }
}

const Person = new Archetype({
  name: 'string',
  bandId: {
    $type: MyObjectId,
    $required: true
  }
}).compile('Person');
```

If the `MyObjectId` constructor throws an error, `new Person()` will throw an
error as well. Because of this, archetypes are nestable too.

```javascript
const Person = new Archetype({
  name: 'string'
}).compile('Person');

const Band = new Archetype({
  name: 'string',
  people: [Person]
}).compile('Band');

new Band({
  name: "Guns N' Roses",
  people: [{ name: 'Axl Rose' }]
});
```

Archetype works particularly well with [destructuring assignments](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment). Instead of writing this:

```javascript
const { name, bandId } = req.body;
if (name == null) {
  throw new Error('Name is required');
}
if (typeof name !== 'string') {
  throw new Error('Name must be a string');
}
if (bandId == null) {
  throw new Error('BandId is required');
}
try {
  bandId = new ObjectId(bandId);
} catch (error) {
  throw new Error('Invalid ObjectId');
}
```

You can just write:

```javascript
const Person = new Archetype({
  name: { $type: 'string', $required: true },
  band: { $type: ObjectId, $required: true }
}).compile('Person');

const { name, bandId } = new Person(req.body);
```

Archetype makes handling incoming data from HTTP or from user-provided options
a breeze. There's no more excuse to bury yourself in [walls of if statements](https://github.com/crocodilejs/custom-fonts-in-emails/blob/5715ea731b5977f472148efe6e3a327ea0641b56/src/index.js#L59-L114).

Conclusion
----------

If you're worried about type safety in JavaScript, you need a runtime casting
library, even if you're using Flow or TypeScript. When your data comes in over
the network, you have no way to check your data at compile time. In this case, static type checks are at best unnecessary and at worst lull you into a false sense of security. If you're looking to get serious about data integrity, check
out archetype and let us know what you think on
[GitHub](https://github.com/vkarpov15/archetype-js) or
in comments!
