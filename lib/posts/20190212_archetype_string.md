Converting an [arbitrary value to a string in JavaScript](http://2ality.com/2012/03/converting-to-string.html) is surprisingly nuanced. There are 3 common ways to convert `v` to a string:

```javascript
v.toString();
'' + v;
String(v);
```

Each of the 3 methods have tradeoffs and quirks. For example, if `v` is null or
undefined:

```javascript
const v = null;

'' + v; // 'null'
String(v); // 'null'
v.toString(); // Throws a TypeError
```

For another, more complex, example, consider the following object.

```javascript
const v = { valueOf: () => null };
```

What do you get when you try to convert this object to a string?

```javascript
v.toString(); // '[object Object]'
'' + v; // 'null'
String(v); // '[object Object]'
```

That's because `'' + v` and `String(v)` are _almost_ equivalent, except for how
they handle `valueOf()`. `String(v)` doesn't attempt to convert `v` to a
primitive before converting the value to a string, which is generally safer.

```javascript
const v = { valueOf: () => { throw Error('Oops!') } };

v.toString(); // '[object Object]'
String(v); // '[object Object]'
'' + v; // Throws an error
```

Using Archetype
---------------

The nuance of what happens when you're converting one value to a string is
confusing enough. What happens when you have an embedded object with multiple
arrays of strings that you need to convert? After all, [recursion is hard](http://thecodebarbarian.com/algorithm-interview-questions-in-js-glob-matching).

I wrote [Archetype](https://www.npmjs.com/package/archetype) to specifically address the problem of validating and casting complex JSON objects. Archetype is a full schema validation library, but it also exposes a neat `to()` function for converting individual values. Archetype calls `to()` internally.

```javascript
const Archetype = require('archetype');

// Archetype refuses to cast POJOs to strings because generally this means you
// got bad JSON data from a network request.
Archetype.to({ valueOf: () => null }, 'string'); // Throws an error
Archetype.to({ valueOf: () => '42' }, 'string'); // Throws an error

// But dates, etc. are ok:
Archetype.to(new Date(), 'string'); // 'Tue Feb 12 2019 09:24:55 GMT-0500 (EST)'
Archetype.to(42, 'string'); // '42'
Archetype.to(Number(42), '42');
```

Archetype doesn't convert `null` or `undefined` ("nullish" values) to a string.
That's intentional because when you get a `null` value in a request body, you
usually want to treat it as `null` rather than as a string.

```javascript
Archetype.to(null, 'string'); // null
Archetype.to(undefined, 'string'); // undefined
```

Complex Objects
---------------

Where Archetype really shines is casting complex objects that contain string-like
values using the same rules as `Archetype.to()`. For example, suppose you have
this complex object:

```javascript
const obj = {
  tags: [false, 42],
  comments: [
    {
      time: new Date(),
      body: 'Hello'
    }
  ]
};
```

Archetype can cast and validate all these deeply nested properties into strings:

```javascript
const Comment = new Archetype({
  time: 'string',
  body: 'string'
}).compile('Comment');

const Type = new Archetype({
  tags: ['string'],
  comments: [Comment]
});

new Type(obj); // `tags`, `comments.time`, `comments.body` are now all strings
```

Moving On
---------

To convert a value `v` to a string, you should generally use `String(v)`, because
`String(v)` doesn't throw if `v` is nullish and doesn't convert objects that have a
`valueOf()` function. If you're looking to convert a value coming in from an HTTP
request, you should consider using [Archetype](https://www.npmjs.com/package/archetype).
Archetype is designed to handle the nasty surprises that can happen when converting
JSON data to strings or [numbers](http://thecodebarbarian.com/convert-a-string-to-a-number-in-javascript.html),
so you can handle HTTP requests and responses with confidence.
