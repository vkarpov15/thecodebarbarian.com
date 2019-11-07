In JavaScript, a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) is an object that stores key/value pairs. Maps are
similar to [general JavaScript objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object), but there are a few key [differences between objects and maps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#Objects_and_maps_compared) that make maps useful.

Maps vs Objects
---------------

Suppose you want to create a JavaScript object that stores some
key/value paths. You could define a plain-old JavaScript object,
or a ["POJO"](https://masteringjs.io/tutorials/fundamentals/pojo) for short, as shown below.

```javascript
const obj = {
  name: 'Jean-Luc Picard',
  age: 59,
  rank: 'Captain'
};

obj.name; // 'Jean-Luc Picard'
```

You could also define a map that contains the same keys and values as shown below.

```javascript
const map = new Map([
  // You define a map via an array of 2-element arrays. The first
  // element of each nested array is the key, and the 2nd is the value
  ['name', 'Jean-Luc Picard'],
  ['age', 59],
  ['rank', 'Captain']
]);

// To get the value associated with a given `key` in a map, you
// need to call `map.get(key)`. Using `map.key` will **not** work.
map.get('name'); // 'Jean-Luc Picard'
```

Suppose you wanted to get Captain Picard's `age`. With an object,
you can use `obj.age`. With a map, you would use `map.get('age')`.
That works fine for properties that don't conflict with built-in
JavaScript functionality, but what about if you wanted to get the
object's [`constructor` property](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/constructor)? In this case, `obj.constructor`
is defined, but `map.get('constructor')` is not.

```javascript
obj.constructor; // [Function: Object]
map.get('constructor'); // undefined
```

With JavaScript objects, you could use
[`Object.create(null)`](https://davidwalsh.name/object-create-null) to create an object
that doesn't inherit from any class, and
so doesn't have a `constructor` property.
That is one approach to the issue of separating
user data from program data: maps are another.

Maps don't have any notion of [inheritance](https://masteringjs.io/tutorials/fundamentals/prototype): a map does not have any inherited keys. This makes maps ideal for storing raw
data without worrying about that data conflicting with existing
methods and properties. For example, maps are immune to [prototype pollution](https://snyk.io/blog/after-three-years-of-silence-a-new-jquery-prototype-pollution-vulnerability-emerges-once-again/), a security vulnerability where naive copying of user data can allow a malicious user to overwrite class methods.

Another key difference is that maps allow you to store object keys,
not just strings. This can cause some confusion when you're storing
objects like Dates or Numbers as keys.

```javascript
const map = new Map([]);

const n1 = new Number(5);
const n2 = new Number(5);

map.set(n1, 'One');
map.set(n2, 'Two');

// `n1` and `n2` are objects, so `n1 !== n2`. That means the map has
// separate keys for `n1` and `n2`.
map.get(n1); // 'One'
map.get(n2); // 'Two'
map.get(5); // undefined

// If you were to do this with an object, `n2` would overwrite `n1`
const obj = {};
obj[n1] = 'One';
obj[n2] = 'Two';

obj[n1]; // 'Two'
obj[5]; // 'Two'
```

Maps also have a `size` property that returns the number of key/value 
pairs in the map. To get the number of keys in an object, you would
have to do `Object.keys(obj).length`.

```javascript
map.size; // 3
```

Another difference you'll likely read about is the order of the keys
in a map is guaranteed. In other words, if you call `map.keys()`, you 
will _always_ get the keys in the order in which they were added to
the map. In the Captain Picard example, `map.keys()` will always
return `name`, `age`, and `rank` in that order.

[Object key order is also guaranteed for ES6-compliant browsers](https://www.stefanjudis.com/today-i-learned/property-order-is-predictable-in-javascript-objects-since-es2015/). For example, `Object.keys(obj)` will always return
`['name', 'age', 'rank']` in ES6-compliant JavaScript runtimes. But,
in older runtimes (Internet Explorer, etc.) `Object.keys(obj)` may
return the keys in a different order.

`Map#keys()`, `Map#values()`, `Map#entries()`
---------------------------------------------

Maps have 3 built-in methods for iterating through the map: `keys()`, [`values()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/values), and [`entries()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/entries). Unlike `Object.keys()`, the `Map#keys()` function returns an [iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators), not an array. That means the easiest way to
iterate a map's keys is using a [`for/of` loop](/for-vs-for-each-vs-for-in-vs-for-of-in-javascript).

```javascript
const map = new Map([
  ['name', 'Jean-Luc Picard'],
  ['age', 59],
  ['rank', 'Captain']
]);

const iterator = map.keys();
console.log(iterator); // MapIterator { 'name', 'age', 'rank' }

// `map.keys()` returns an iterator, not an array, so you can't
// access the values using `[]`
iterator[0]; // undefined

// The `for/of` loop can loop through iterators
for (const key of map.keys()) {
  key; // 'name', 'age', 'rank'
}
```

Sometimes it is handy to convert an iterator into an array so you
can use array methods like [`filter()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) and [`map()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map). The easiest way to convert an iterator into an array is using [the built-in `Array.from()` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from).

```javascript
const arr = Array.from(map.keys());

arr.length; // 3
arr[0]; // 'name'
arr[1]; // 'age'
arr[2]; // 'rank'
```

The `Map#values()` function also returns an iterator. The iterator
iterates through the map's values:

```javascript
for (const v of map.values()) {
  v; // 'Jean-Luc Picard', 59, 'Captain'
}
```

Finally, `Map#entries()` returns an iterator that iterates through
the map's key/value pairs in a similar format to the `Map` 
constructor. The `Map#entries()` function is the `Map` class's
equivalent to [`Object.entries()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries).

```javascript
for (const [key, value] of map.entries()) {
  key; // 'name', 'age', 'rank'
  value; // 'Jean-Luc Picard', 59, 'Captain'
}
```

The `Map#entries()` function makes it easy to copy a map. Cloning
a map is as simple as converting `map.entries()` into an array:

```javascript
// `clone` is now a separate map that contains the same keys/values
// as `map`.
const clone = new Map(Array.from(map.entries()));
```

Moving On
---------

Although JavaScript developers typically use objects to store user
data, maps have some advantages: there's no risk of prototype
pollution or JSON data overwriting class methods. Maps also let
you store object keys, which can be useful if you want to associate
data with an object without setting a [symbol](a-practical-guide-to-symbols-in-javascript.html). Maps are still
pretty uncommon in open source JavaScript, the only significant
use case I've seen is [Mongoose's map type](https://thecodebarbarian.com/whats-new-in-mongoose-5.1-map-support.html). But maps are worth experimenting with for representing JSON
data because they avoid the risk of prototype pollution.
