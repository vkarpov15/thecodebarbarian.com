The [Object Rest/Spread Proposal](https://github.com/tc39/proposal-object-rest-spread) reached [stage 4](https://tc39.github.io/process-document/) in 2018, which means it will be included in a future iteration of the ECMAScript spec. It's also been included in Node.js LTS since Node.js 8, so you can safely start using it today.

```
$ node -v
v8.9.4
$ node
> const obj = { foo: 1, bar: 1 };
undefined
> { ...obj, baz: 1 };
{ foo: 1, bar: 1, baz: 1 }
```

The Object spread operator `{...obj}` is similar to [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign), so which one should you use? Turns out the answer is a bit more nuanced than you might expect.

Quick Overview of Object Spread
-------------------------------

The fundamental idea of the object spread operator is to create a new plain object using the [own properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames) of an existing object. So `{...obj}` creates a new object with the same properties and values as `obj`. For [plain old JavaScript objects](http://g-liu.com/blog/2015/08/object-oriented-programming-javascript-using-pojos-for-good/), you're essentially creating a copy of `obj`.

```javascript
const obj = { foo: 'bar' };
const clone = { ...obj }; // `{ foo: 'bar' }`
obj.foo = 'baz';
clone.foo; // 'bar'
```

Like `Object.assign()`, the object spread operator does _not_ copy inherited properties or class information. It _does_ copy [ES6 symbols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol).

```javascript
class BaseClass {
  foo() { return 1; }
}

class MyClass extends BaseClass {
  bar() { return 2; }
}

const obj = new MyClass();
obj.baz = function() { return 3; };
obj[Symbol.for('test')] = 4;

// Does _not_ copy any properties from `MyClass` or `BaseClass`
const clone = { ...obj };

console.log(clone); // { baz: [Function], [Symbol(test)]: 4 }
console.log(clone.constructor.name); // Object
console.log(clone instanceof MyClass); // false
```

You can also mix in other properties with the object spread operator. Order matters: the object spread operator will overwrite properties that are defined before it, but not after.

```javascript
const obj = { a: 'a', b: 'b', c: 'c' };
{ a: 1, b: null, c: void 0, ...obj }; // { a: 'a', b: 'b', c: 'c' }
{ a: 1, b: null, ...obj, c: void 0 }; // { a: 'a', b: 'b', c: undefined }
{ a: 1, ...obj, b: null, c: void 0 }; // { a: 'a', b: null, c: undefined }
{ ...obj, a: 1, b: null, c: void 0 }; // { a: 1, b: null, c: undefined }
```

Differences Versus `Object.assign()`
------------------------------------

The [`Object.assign()` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) is essentially interchangeable with the object spread operator for the above examples. In fact, the [object spread spec](https://github.com/tc39/proposal-object-rest-spread/blob/master/Spread.md) explicitly states that `{ ...obj }` is equivalent to `Object.assign({}, obj)`.

```javascript
const obj = { a: 'a', b: 'b', c: 'c' };
Object.assign({ a: 1, b: null, c: void 0 }, obj); // { a: 'a', b: 'b', c: 'c' }
Object.assign({ a: 1, b: null }, obj, { c: void 0 }); // { a: 'a', b: 'b', c: undefined }
Object.assign({ a: 1 }, obj, { b: null, c: void 0 }); // { a: 'a', b: null, c: undefined }
Object.assign({}, obj, { a: 1, b: null, c: void 0 }); // { a: 1, b: null, c: undefined }
```

So why would you use one or the other? One key difference is that the object spread operator always gives you a POJO back. The `Object.assign()` function modifies its first parameter in place:

```javascript
class MyClass {
  set val(v) {
    console.log('Setter called', v);
    return v;
  }
}
const obj = new MyClass();

Object.assign(obj, { val: 42 }); // Prints "Setter called 42"
```

In other words, `Object.assign()` modifies an object in place, and so it can trigger [ES6 setters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set). If you prefer using [immutable](https://facebook.github.io/immutable-js/) techniques, the object spread operator is a clear winner. With `Object.assign()`, you would have to ensure you always pass an empty object `{}` as the first argument.

What about performance? Here's a couple simple benchmarks. It looks like object spread is faster if you pass an empty object as the first parameter to `Object.assign()`, but otherwise they're interchangeable.

Here's a [benchmark](https://www.npmjs.com/package/benchmark) using `Object.assign()` with in-place assignment:

```javascript
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite;

const obj = { foo: 1, bar: 2 };

suite.
  add('Object spread', function() {
    ({ baz: 3, ...obj });
  }).
  add('Object.assign()', function() {
    Object.assign({ baz: 3 }, obj);
  }).
  on('cycle', function(event) {
    console.log(String(event.target));
  }).
  on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  }).
  run({ 'async': true });
```

In this case, the two are similar:

```
Object spread x 3,170,111 ops/sec +-1.50% (90 runs sampled)
Object.assign() x 3,290,165 ops/sec +-1.86% (88 runs sampled)
Fastest is Object.assign()
```

However, once you throw in an empty object parameter to `Object.assign()`, the object spread operator is consistently faster:

```javascript
suite.
  add('Object spread', function() {
    ({ baz: 3, ...obj });
  }).
  add('Object.assign()', function() {
    Object.assign({}, obj, { baz: 3 });
  })
```

Here's the output:

```
Object spread x 3,065,831 ops/sec +-2.12% (85 runs sampled)
Object.assign() x 2,461,926 ops/sec +-1.52% (88 runs sampled)
Fastest is Object spread
```

ESLint Configuration
--------------------

By default, ESLint [disallows the object rest/spread operator](https://github.com/eslint/eslint/issues/10307) at the parser level. You need to set `parserOptions.ecmaVersion` option to at least `9` in `.eslintrc.yml`, otherwise you'll get a parsing error.

```
parserOptions:
  # Otherwise object spread causes 'Parsing error: Unexpected token ..'
  ecmaVersion: 9
```

ESLint [added a new rule `prefer-object-spread`](https://github.com/eslint/eslint/pull/9955) that allows you to enforce using object spread instead of `Object.assign()`. To enable this rule, use:

```
parserOptions:
  ecmaVersion: 9
rules:
  prefer-object-spread: error
```

Now ESLint will report an error if you use `Object.assign()` instead of object spread.

```
Use an object spread instead of `Object.assign` eg: `{ ...foo }`  prefer-object-spread
```

Moving On
---------

The object rest/spread operators are both syntactically neat and offer performance benefits over `Object.assign()`. If you're running Node.js 8 or higher, try these new operators out and make your code more concise.
