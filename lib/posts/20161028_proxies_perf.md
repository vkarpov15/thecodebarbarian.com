[Proxies](http://thecodebarbarian.com/2015/04/24/80-20-guide-to-ecmascript-6-proxies) are a powerful ES2015 feature that let you intercept operations on object properties by defining "traps" (function handlers) for getting/setting a property. For example:

```javascript
const obj = {};
const proxy = new Proxy(obj, {
  get: () => {
    console.log('hi');
  }
});

obj.a; // prints "hi"
```

Proxies have been hailed as the [replacement for the now-defunct `Object.observe()` proposal](https://www.bitovi.com/blog/long-live-es6-proxies). Unfortunately,
they have one big limitation: [performance](http://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html#representing-path-to-the-property). It still blows my mind that `Object.observe()` was scrapped for performance limitations when, in my admittedly naive understanding of V8, `Object.observe()` is much easier for the [JIT](http://thibaultlaurens.github.io/javascript/2013/04/29/how-the-v8-engine-works/) to optimize than proxies.

How Slow Are Proxies?
---------------------

Here's a rudimentary [benchmark]() using node v6.9.0:

```javascript
var Benchmark = require('benchmark');

var suite = new Benchmark.Suite;

var obj = {};

var _obj = {};
var proxy = new Proxy(_obj, {
  set: (obj, prop, value) => { _obj[prop] = value; }
});

var defineProp = {};
Object.defineProperty(defineProp, 'prop', {
  configurable: false,
  set: v => defineProp._v = v
});

suite.
  add('vanilla', function() {
    obj.prop = 5;
  }).
  add('proxy', function() {
    proxy.prop = 5;
  }).
  add('defineProperty', function() {
    defineProp.prop = 5;
  }).
  on('cycle', function(event) {
    console.log(String(event.target));
  }).
  on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  }).
  run();
```

Here are the results:

```
$ node proxy.js
vanilla x 74,288,023 ops/sec ±0.78% (86 runs sampled)
proxy x 3,625,152 ops/sec ±2.51% (86 runs sampled)
defineProperty x 74,815,513 ops/sec ±0.80% (85 runs sampled)
Fastest is defineProperty,vanilla
$
```

In this simple benchmark, setting on a proxy object is an order of magnitude
slower than setting a property on a vanilla POJO or a property with a custom
setter.

In case you're curious, here's the results with an empty `Object.observe()` function in node 4.2.1, back when we had `Object.observe()`.

```
$ node proxy.js
vanilla x 78,615,272 ops/sec ±1.55% (84 runs sampled)
defineProperty x 79,882,188 ops/sec ±1.31% (85 runs sampled)
Object.observe() x 5,234,672 ops/sec ±0.86% (89 runs sampled)
Fastest is defineProperty,vanilla
```

Some [reading](http://www.2ality.com/2014/12/es6-proxies.html) might lead you to believe proxies are faster if you bypass the get/set traps and just define your own
`getOwnPropertyDescriptor()` trap.

```javascript
var _obj = {};
var propertyDescriptor = {
  configurable: true,
  set: v => { _obj.prop = v; }
};
var proxy = new Proxy(_obj, {
  getOwnPropertyDescriptor: (target, prop) => propertyDescriptor
});
```

Unfortunately, the `getOwnPropertyDescriptor()` trick actually makes this benchmark even slower.

```
$ node proxy.js
vanilla x 73,695,484 ops/sec ±1.04% (88 runs sampled)
proxy x 2,026,006 ops/sec ±0.74% (90 runs sampled)
defineProperty x 74,137,733 ops/sec ±1.25% (88 runs sampled)
Fastest is defineProperty,vanilla
$
```

In case you were wondering, using proxies to wrap function calls is also
an order of magnitude less performant than just wrapping the function call.

```javascript
var Benchmark = require('benchmark');

var suite = new Benchmark.Suite;

var fn = () => 5;
var proxy = new Proxy(function() {}, {
  apply: (target, context, args) => fn.apply(context, args)
});

var wrap = () => fn();

// add tests
suite.
  add('vanilla', function() {
    fn();
  }).
  add('proxy', function() {
    proxy();
  }).
  add('wrap', function() {
    wrap();
  }).
  on('cycle', function(event) {
    console.log(String(event.target));
  }).
  on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  }).
  run();
```

```
$ node proxy2.js
vanilla x 78,426,813 ops/sec ±0.93% (88 runs sampled)
proxy x 5,244,789 ops/sec ±2.17% (87 runs sampled)
wrap x 75,350,773 ops/sec ±0.85% (85 runs sampled)
Fastest is vanilla
```

Tricks for Improving Proxy Performance
--------------------------------------

So far the biggest impact I've seen on proxy performance comes from making the property being modified not [configurable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty#Description):

```javascript
var _obj = {};
Object.defineProperty(_obj, 'prop', { configurable: false });
var propertyDescriptor = {
  configurable: false,
  enumerable: true,
  set: v => { _obj.prop = v; }
};
var proxy = new Proxy(_obj, {
  getOwnPropertyDescriptor: (target, prop) => propertyDescriptor
});
```

```
$ node proxy.js
vanilla x 74,622,163 ops/sec ±0.95% (85 runs sampled)
proxy x 4,649,544 ops/sec ±0.47% (85 runs sampled)
defineProperty x 77,048,878 ops/sec ±0.60% (88 runs sampled)
Fastest is defineProperty
$
```

Unfortunately, if you're going to take this approach, you might as well just use `Object.defineProperty()` for getters/setters. The reason is that you'd have to make every property you want to access on the proxy non-configurable. Otherwise V8 will crash, because your proxy can't return a property descriptor that V8 doesn't think is compatible with the underlying object.

```javascript
var _obj = {};
Object.freeze(_obj);
var propertyDescriptor = {
  configurable: false,
  enumerable: true,
  set: v => { _obj.prop = v; }
};
var proxy = new Proxy(_obj, {
  getOwnPropertyDescriptor: (target, prop) => propertyDescriptor
});

// Throws:
// "TypeError: 'getOwnPropertyDescriptor' on proxy: trap returned
// descriptor for property 'prop' that is incompatible with the
// existing property in the proxy target"
proxy.prop = 5;
```

Are Proxies Dead on Arrival?
----------------------------

Proxies have some neat advantages over `Object.defineProperty()`: you can nest
proxies (but you can't nest getters/setters) and you don't have to know every
property you want to track ahead of time. As a side effect, you can also use
proxies to intercept array accesses, something that wasn't possible in general
in ES5. However, proxies also come with very significant performance impact over
POJOs or `Object.defineProperty()`.

How significant is this performance impact? Let's compare the performance impact
of proxies against the performance impact of using promises over callbacks:

```javascript
var Benchmark = require('benchmark');

var suite = new Benchmark.Suite;

var handleCb = cb => cb(null);

// add tests
suite.
  add('new function', function() {
    handleCb(function(error, res) {});
  }).
  add('new promise', function() {
    return new Promise((resolve, reject) => {});
  }).
  add('promise resolve', function() {
    Promise.resolve().then(() => {});
  }).
  on('cycle', function(event) {
    console.log(String(event.target));
  }).
  on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  }).
  run();
```

```
$ node promise.js
new function x 26,282,805 ops/sec ±0.74% (90 runs sampled)
new promise x 1,953,037 ops/sec ±1.02% (86 runs sampled)
promise resolve x 194,173 ops/sec ±13.80% (61 runs sampled)
Fastest is new function
$
```

But wait, doesn't [bluebird](https://www.npmjs.com/package/bluebird) offer "exceptionally good performance" relative to other promise libraries? Let's see what happens if we replace native node promises with bluebird 2.11.1 in the above benchmark.

```
$ node promise.js
new function x 26,986,342 ops/sec ±0.48% (89 runs sampled)
new promise x 11,157,758 ops/sec ±1.05% (87 runs sampled)
promise resolve x 671,079 ops/sec ±27.01% (18 runs sampled)
Fastest is new function
```

Wow! Looks like promises are way slower than callbacks. Is it time to give up
on promises and return to simpler times when [men were men and used design patterns rather than whiz-bang async primitives?](https://en.wikiquote.org/wiki/Linus_Torvalds#1991-94) There's been
[some concern](http://softwareengineering.stackexchange.com/questions/278778/why-are-native-es6-promises-slower-and-more-memory-intensive-than-bluebird) about the performance implications of promises, but plenty of companies use promises without feeling the performance overhead, [my current employer](https://www.boosterfuels.com/join-the-team) included. While I can't find confirmation, I'd guess that even
Uber uses promises given that [the author of Q works there](https://www.linkedin.com/in/kkowal).

Conclusion
----------

In case you were wondering, yes, proxies do have terrible performance in Node.js
compared to POJOs in basic benchmarks. But before you start [thumping your chest about how real engineers don't use proxies because they're slow](http://widgetsandshit.com/teddziuba/2008/04/im-going-to-scale-my-foot-up-y.html), keep in mind that promises, which have seen [rapid adoption](https://npm-stat.com/charts.html?package=bluebird&from=2014-01-01&to=2016-08-01) over the last couple years, are about as bad for performance relative to callbacks. If you want to use proxies, odds are you won't feel the performance
implications unless you've ever found yourself changing promise libraries (or eschewing them altogether) for performance reasons.
