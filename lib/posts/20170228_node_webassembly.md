[WebAssembly](http://webassembly.org/) is an exciting new language that many JavaScript engines have added support for. WebAssembly promises to make it much easier to compile languages like C and C++ to something that runs in the browser. However, I'm most excited about the ability to write optimized custom arithmetic and buffer manipulations, like, say, [fast decimal floating point arithmetic in JavaScript](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-decimal.html) without having to [wait for TC39 to get around to it](https://mail.mozilla.org/pipermail/es-discuss/2008-February/005446.html). In this article, I'll show you how to get a couple rudimentary WebAssembly examples running in Node.js, and run a couple trivial benchmarks to show the performance impact.

Note that the code in this article is intended to be run with Node.js 12.14.0.

What is WebAssembly Anyway?
---------------------------

Node.js 12 has a [global `WebAssembly` object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly) which has several helper functions for creating WebAssembly _modules_. For the purposes of this article, a WebAssembly module is just a collection of functions written in WebAssembly.

```
$ ~/Workspace/libs/node-v12.14.0-darwin-x64/bin/node 
Welcome to Node.js v12.14.0.
Type ".help" for more information.
> WebAssembly
Object [WebAssembly] {
  compile: [Function: compile],
  validate: [Function: validate],
  instantiate: [Function: instantiate]
}
> 
```

To create a WebAssembly module, you need to call `WebAssembly.instantiate()` with a [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) that represents the module. Below is an example of instantiating an empty WebAssembly module.

```
$ ~/Workspace/libs/node-v12.14.0-darwin-x64/bin/node
> WebAssembly.instantiate(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
Promise { <pending> }
>
```

So at the basic level, creating a WebAssembly module consists of putting the correct hex digits into the `instantiate()` function. What do these hex numbers mean? These hex numbers are the [preamble](http://webassembly.org/docs/binary-encoding/#module-structure) that every `.wasm` file starts with (`.wasm` is the canonical extension for WebAssembly files). Every WebAssembly file must have these bytes, so this is the minimum viable WebAssembly module.

Adding Two Numbers
------------------

Thankfully, you don't have to write the bytes yourself. There's plenty of compilers out there for compiling C, C++, and even [Rust](https://github.com/brson/mir2wasm) to WebAssembly. There's also an [intermediate format](https://en.wikipedia.org/wiki/WebAssembly#Representation) called "WebAssembly AST", or "wast" for short. Here's what a function that returns the sum of its 2 parameters looks like in wast:

```
(module
  (func (export "addTwo") (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add))
```

You can use [this online tool](https://webassembly.github.io/wabt/demo/wat2wasm/) to compile wast code down into the `wasm` binary, or you can just download the [compiled `.wasm` from me](http://thecodebarbarian.com/sample/20170228/addTwo.wasm).

Next, how do you use a `.wasm` file in Node.js? In order to use the `.wasm`, you need to load the file and convert the [Node.js buffer](https://nodejs.org/api/buffer.html) that node's `fs` library returns into an Uint8Array.

```javascript
const fs = require('fs');
const buf = fs.readFileSync('./addTwo.wasm');
const lib = await WebAssembly.instantiate(new Uint8Array(buf)).
  then(res => res.instance.exports);

console.log(lib.addTwo(2, 2)); // Prints '4'
console.log(lib.addTwo.toString()); // Prints 'function addTwo() { [native code] }'
```

How fast is `addTwo` in WebAssembly versus a plain old JavaScript implementation? Here's a trivial benchmark:

```javascript
const fs = require('fs');
const buf = fs.readFileSync('./addTwo.wasm');
const lib = await WebAssembly.instantiate(new Uint8Array(buf)).
  then(res => res.instance.exports);

const Benchmark = require('benchmark');

const suite = new Benchmark.Suite;

suite.
  add('wasm', function() {
    lib.addTwo(2, 2);
  }).
  add('js', function() {
    addTwo(2, 2);
  }).
  on('cycle', function(event) {
    console.log(String(event.target));
  }).
  on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  }).
  run();

function addTwo(a, b) {
  return a + b;
}
```

```
$ ~/Workspace/libs/node-v12.14.0-darwin-x64/bin/node ./test
wasm x 91,797,305 ops/sec ±1.26% (88 runs sampled)
js x 763,373,634 ops/sec ±2.28% (89 runs sampled)
Fastest is js
$ 
```

Factorial
---------

WebAssembly doesn't have any performance benefit over plain old JS in the above example. Let's do something a little more complex: computing factorials recursively. Here's a `.wast` file that exposes a `fac()` function which computes factorial recursively.

```
(module
  (func $fac (param i32) (result i32)
    (if (i32.lt_s (get_local 0) (i32.const 1))
      (then (i32.const 1))
      (else
        (i32.mul
          (get_local 0)
          (call $fac
            (i32.sub
              (get_local 0)
              (i32.const 1)))))))
  (export "fac" $fac))
```

You can use [this tool](https://cdn.rawgit.com/WebAssembly/sexpr-wasm-prototype/2bb13aa785be9908b95d0e2e09950b39a26004fa/demo/index.html)) to compile the `.wasm` or just [download it here](http://thecodebarbarian.com/sample/20170228/factorial.wasm).

Below is another trivial benchmark comparing computing `100!` with WebAssembly versus with JavaScript:

```javascript
const fs = require('fs');
const buf = fs.readFileSync('./factorial.wasm');
const lib = Wasm.instantiateModule(new Uint8Array(buf).buffer).exports;

const Benchmark = require('benchmark');

const suite = new Benchmark.Suite;

suite.
  add('wasm', function() {
    lib.fac(100);
  }).
  add('js', function() {
    fac(100);
  }).
  on('cycle', function(event) {
    console.log(String(event.target));
  }).
  on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  }).
  run();

function fac(n) {
  if (n <= 0) {
    return 1;
  }
  // `x | 0` rounds down, so `2.0001 | 0 === 2`. This helps deal with floating point precision issues like `0.1 + 0.2 !== 0.3`
  return (n * fac(n - 1)) | 0;
}
```

```
$ ~/Workspace/node-v7.2.1-linux-x64/bin/node --expose-wasm ./factorial.js
wasm x 2,484,967 ops/sec ±2.09% (87 runs sampled)
js x 1,088,426 ops/sec ±2.63% (80 runs sampled)
Fastest is wasm
$
```

Moving On
---------

In these rudimentary examples, WebAssembly shows promise in terms of allowing you to really optimize JS code. My benchmarks are quite rudimentary and WebAssembly is still unstable and not well adopted, so don't rush to try to write your next web app in wast. However, now's the time to play with WebAssembly, especially since it is available in Node.js.

*I wrote this article (and many others) after a dose of [Ciltep](https://www.amazon.com/gp/product/B00GXPS4Q8/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=B00GXPS4Q8&linkCode=as2&tag=codebarbarian-20&linkId=e3467c80c382d0385811038575986e25) ([non-affiliate link here](https://www.amazon.com/Ciltep-Nootropic-Stack-Performance-Motivation/dp/B00GXPS4Q8/ref=sr_1_1_a_it?ie=UTF8&qid=1488867312&sr=8-1&keywords=ciltep)). Ciltep helps you stay focused and learn fast, without jitters or crashes. Give it a shot before you take a deep dive into WebAssembly.*
