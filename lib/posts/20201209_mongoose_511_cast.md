[Mongoose 5.11.0 was released on November 30, 2020](https://github.com/Automattic/mongoose/blob/master/History.md#5110--2020-11-30) and includes 17 new features, including 5 community contributions. The biggest
change is [officially supported TypeScript bindings](/working-with-mongoose-in-typescript.html), but one of the
ones we're most excited about is customizable casting logic for individual paths. In this article, I'll
discuss this new feature and what it can be used for.

The `cast` Option
-----------------

[Mongoose SchemaTypes](https://mongoosejs.com/docs/schematypes.html) support numerous options, including a `cast`
option that lets you change the error message for casting errors for this path. This option was a new feature in
[Mongoose 5.8.0](https://github.com/Automattic/mongoose/blob/master/History.md#580--2019-12-09):

```javascript
const schema = mongoose.Schema({
  numFriends: {
    type: Number
  },
  age: {
    type: Number,
    cast: 'Age must be a valid number!'
  }
});
const TestModel = mongoose.model('Test', schema);

const doc = new TestModel({ age: 'not a number', numFriends: 'not a number' });
const err = doc.validateSync();

// Prints the default error message:
// 'Cast to Number failed for value "not a number" at path "numFriends"'
console.log(err.errors['numFriends'].message);

// Prints custom error message: 'Age must be a valid number!'
console.log(err.errors['age'].message);
```

In v5.8.0, the `cast` option only let you configure the cast error message. As of v5.11.0, you can now also set `cast`
to a function. Mongoose will then use that function to cast that particular path. For example, suppose you want to
support automatically converting dates to the user's age in years. Here's how you might do that using a custom
`cast` function for the `age` property:

```javascript
const schema = mongoose.Schema({
  age: {
    type: Number,
    cast: function castAge(v) {
      if (typeof v === 'number') {
        return v;
      }
      if (typeof v === 'string' && !isNaN(v)) {
        return +v;
      }
      if (v instanceof Date) {
        // Approximate age in years, modulo leap years, etc.
        return Math.floor((Date.now() - v) / (1000 * 60 * 60 * 24 * 365)); 
      }
      throw new Error('Invalid age!');
    }
  }
});
const TestModel = mongoose.model('Test', schema);

const doc = new TestModel({ age: new Date('1978/08/23') });
const err = doc.validateSync(); // null, no error!

console.log(doc.age); // 42 in December 2020
```

The tricky part of writing a custom cast function is that you need to handle all the different cases you want to cast.
[Mongoose's default number caster](https://github.com/Automattic/mongoose/blob/dd348b1e5ad7b6b0b07c8e3f3aaaa67f87bd2c45/lib/cast/number.js) does a pretty good job, so you can reuse it as shown below. Just check if `v` is a `Date` for your one special
case, and defer to Mongoose's default for the rest of the cases.

```javascript
// `mongoose.Schema.Number.cast()` returns the currently defined caster
// for number types.
const castNumber = mongoose.SchemaTypes.Number.cast();
const schema = mongoose.Schema({
  age: {
    type: Number,
    cast: v => {
      if (v instanceof Date) {
        // Approximate age in years, modulo leap years, etc. 
        return Math.floor((Date.now() - v) / (1000 * 60 * 60 * 24 * 365));
      }
      // Fall back to Mongoose's default if `v` isn't a date
      return castNumber(v);
    }
  }
});
const TestModel = mongoose.model('Test', schema);

const doc = new TestModel({ age: new Date('1978/08/23') });
const err = doc.validateSync(); // null, no error!

console.log(doc.age); // 42 in December 2020
```

Of course, it is easy to convert an object's `age` property on your own, so why use Mongoose to do it? First,
using Mongoose schemas keeps your code DRY so you don't have to add this casting logic everywhere you set the `age`
property. Second, Mongoose casting works within nested objects, arrays, arrays of objects, and any other arbitrarily
complex data structure. For example, suppose you have an array of objects with an `age` property.

```javascript
// `mongoose.Schema.Number.cast()` returns the currently defined caster
// for number types.
const castNumber = mongoose.SchemaTypes.Number.cast();
function castAge(v) {
  if (v instanceof Date) {
    // Approximate age in years, modulo leap years, etc. 
    return Math.floor((Date.now() - v) / (1000 * 60 * 60 * 24 * 365));
  }
  // Fall back to Mongoose's default if `v` isn't a date
  return castNumber(v);
}
const schema = mongoose.Schema({
  characters: [{ age: { type: Number, cast: castAge } }]
});
const TestModel = mongoose.model('Test', schema);

const doc = new TestModel({
  characters: [
    { age: new Date('1978/08/23') },
    { age: new Date('1984/11/15') }
  ]
});

console.log(doc.characters[0].age); // 42 in December 2020
console.log(doc.characters[1].age); // 36 in December 2020
```

Disabling Casting For Paths
---------------------------

While Mongoose casting is a powerful tool for coercing types, sometimes it makes sense to disable casting. In other
words, make Mongoose ensure that `age` is always set to a number or throw an error, don't try to convert values into
numbers. You can do that by setting the `cast` option to `false`:

```javascript
const schema = mongoose.Schema({
  age: {
    type: Number,
    cast: false
  }
});
const TestModel = mongoose.model('Test', schema);

const doc = new TestModel({ age: '42' });
const err = doc.validateSync();

// 'Cast to Number failed for value "42" at path "age"'
console.log(err.errors['age'].message);
```

In the above example, even though `age` is a string that can easily be converted to a number, Mongoose will still
throw an error because `age` is not strictly a number.

Global Configuration
--------------------

Remember that [Mongoose supports configuring schema types globally](/whats-new-in-mongoose-54-global-schematype-configuration.html). That means you can set custom casters, or disable
casting, for _all_ instances of a given schema type.

For example, suppose you want to disable casting for all booleans. You can do that with a one-liner:

```javascript
mongoose.SchemaTypes.Boolean.cast(false); // Disable casting for all booleans

const schema = mongoose.Schema({
  isEnabled: Boolean,
  hasSpecialFeature: Boolean
});
const TestModel = mongoose.model('Test', schema);

const doc = new TestModel({ isEnabled: true, hasSpecialFeature: 'yes' });
const err = doc.validateSync();

// Unless you disabled casting, this wouldn't error because Mongoose casts
// the string 'yes' to `true` for booleans by default.
// Prints: 'Cast to Boolean failed for value "yes" at path "hasSpecialFeature"'
console.log(err.errors['hasSpecialFeature'].message);
```

You can also define custom caster functions for all instances of a schema type with a one-liner. For example, here's
how you can configure all number schema types to handle dates by default:

```javascript
// For all numbers, convert dates to age in years
const castNumber = mongoose.SchemaTypes.Number.cast();
mongoose.SchemaTypes.Number.cast(function castNumberWithDates(v) {
  if (v instanceof Date) {
    // Approximate age in years, modulo leap years, etc. 
    return Math.floor((Date.now() - v) / (1000 * 60 * 60 * 24 * 365));
  }
  // Fall back to Mongoose's default if `v` isn't a date
  return castNumber(v);
});

const schema = mongoose.Schema({
  age: {
    type: Number
  }
});
const TestModel = mongoose.model('Test', schema);

const doc = new TestModel({ age: new Date('1978/08/23') });
const err = doc.validateSync(); // null, no error!

console.log(doc.age); // 42 in December 2020
```

[You can read more about global custom casting in the Mongoose docs](https://mongoosejs.com/docs/tutorials/custom-casting.html).

Moving On
---------

Custom casting logic is a powerful tool for configuring Mongoose. Depending on your needs, you can add handling for specific
edge cases for a single path, add more general syntactic sugar for a specific type, or disable casting for all types. For example, you can add support for [Chinese numerals](https://en.wikipedia.org/wiki/Chinese_numerals) for numbers, automatically cast [Moment objects](/formatting-javascript-dates-with-moment-js.html) to dates, or convert coordinate pairs into [GeoJSON](https://mongoosejs.com/docs/geojson.html) points. Custom casting is just one of 17 new features in Mongoose 5.11. Make sure you upgrade to take advantage of optimistic concurrency and all the other new features!

_Want to become your team's MongoDB expert? "Mastering Mongoose" distills 8 years of hard-earned lessons building Mongoose apps at scale into 153 pages. That means you can learn what you need to know to build production-ready full-stack apps with Node.js and MongoDB in a few days. <a href="https://masteringjs.io/ebooks/mastering-mongoose">Get your copy</a>!_

<a href="https://masteringjs.io/ebooks/mastering-mongoose" class="async-await-banner">
  <img src="https://masteringjs.io/ebooks/mastering-mongoose-horizontal.png">
</a>