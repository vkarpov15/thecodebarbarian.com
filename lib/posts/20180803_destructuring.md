JavaScript introduced [destructuring assignments](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) as part of the [2015 edition of the JavaScript language spec](https://www.ecma-international.org/ecma-262/6.0/). Destructuring assignments let you assign multiple variables in a single statement, making it much easier to pull values out of arrays and objects.
Below are examples of the two types of destructuring assignment: [array destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Array_destructuring) and [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring).

```javascript
// Below is equivalent to `const a = [1, 2][0]; const b = [1, 2][1];`
const [a, b] = [1, 2];
console.log(a, b); // "1 2"

// Below is equivalent to `const x = ({x:1,y:2}).x; const y = ({x:1,y:2}).y;`
const { x, y } = { x: 1, y: 2 };
console.log(x, y); // "1 2"
```

Destructuring assignments are powerful, but they also come with several
syntactic quirks. Plus, you can get some truly baffling error
messages if you do destructuring assignments incorrectly. In this article,
I'll provide an overview of what you need to know to successfully use
destructuring assignments in Node.js.

Array Destructuring and Iterators
---------------------------------

The right hand side of an array destructuring assignment must be an
[iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators#Iterables). JavaScript arrays are iterables, and you will
almost always see an array on the right hand side, but there's nothing stopping you from
using array destructuring with a [generator](http://es2015generators.com/),
a [set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set), or any other iterable.

```javascript
const [x, y] = new Set([1, 2]);
console.log(x, y); // "1 2"

function* generatorFunction() {
  const arr = [1, 2];
  for (const el of arr) {
    yield el;
  }
}

const [a, b] = generatorFunction();
console.log(a, b); // "1 2"
```

Array Destructuring Error Cases
-------------------------------

Here's a fun exercise: what happens if you try to use array destructuring where
the right hand side isn't an array or iterable?

```javascript
const [a, b] = {};
```

In Node.js 10.x you get a nice sane error: `TypeError: {} is not iterable`. But in Node.js 6.x and 8.x you get a baffling "undefined is not a function" error.

```
$ ./node-v6.9.5-linux-x64/bin/node
> const [a, b] = {};
TypeError: undefined is not a function
    at repl:1:1
    at sigintHandlersWrap (vm.js:22:35)
    at sigintHandlersWrap (vm.js:96:12)
    at ContextifyScript.Script.runInThisContext (vm.js:21:12)
    at REPLServer.defaultEval (repl.js:346:29)
    at bound (domain.js:280:14)
    at REPLServer.runBound [as eval] (domain.js:293:12)
    at REPLServer.<anonymous> (repl.js:545:10)
    at emitOne (events.js:101:20)
    at REPLServer.emit (events.js:188:7)
>
```

If you see this error, don't panic, [it is a bug in V8](https://bugs.chromium.org/p/v8/issues/detail?id=5532). The issue is that
the right hand side of an array destructuring assignment must be an [iterable](http://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js.html#your-first-async-iterator), which means it must have a `Symbol.iterator` function. V8 throws this error because it tries to call the
non-existent `Symbol.iterator` function on an empty object.

Another edge case with destructuring assignments might make you throw out
[standard](http://npmjs.com/package/standard) and run for the safety of semi-colons. What does the below script print?

```javascript
const map = {}
[1, 2, 3].forEach(x => console.log(x))
```

It will not print '1, 2, 3', you'll instead get an error `Cannot read property 'forEach' of undefined`. That's because the above code is equivalent to:

```javascript
const map = {}[1, 2, 3].forEach(x => console.log(x))
```

You need a semicolon `;` before destructuring assignment _unless_ you use `let`
or `const`.

```javascript
const map = {}
;[1, 2, 3].forEach(x => console.log(x))
```

If you use semicolons, it isn't a problem. If you use a linter like standard
that doesn't require semicolons,
your linter will give you a ["Unexpected newline between object and [ of property access" error](https://eslint.org/docs/2.0.0/rules/no-unexpected-multiline).

Object Destructuring
--------------------

Object destructuring is different from array destructuring. It doesn't use
iterables, object destructuring is just a shorthand for multiple property
accesses.

```javascript
const obj = { name: 'Val', age: 29 };

// Same as `const name = obj.name; const age = obj.age;`
const { name, age } = obj;
```

By default, the variable name must match the property name, but you can
change that. This is handy if you're working with an API that prefers
[snake case property names](https://en.wikipedia.org/wiki/Snake_case) and
your linter only accepts [camel case variable names](https://en.wikipedia.org/wiki/Camel_case).

```javascript
const obj = { name: 'Val', 'date_of_birth': '19881031' };

// Same as `const name = obj.name; const birthday = obj['date_of_birth'];`
const { name, date_of_birth: birthday } = obj;
```

Things get messy when you use object destructuring without `let` or `const`.
That's because if you do `{ name } = obj;`, the JavaScript interpretter
interprets `{ name }` as a [block](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/block). If you use object destructuring without `let`, `const`, or `var` , you **must** wrap your assignment in parenthesis `()` as shown below.

```javascript
const obj = { name: 'Val', age: 29 };

let name;
let age;
// Same as `name = obj.name; age = obj.age;`
({ name, age } = obj);
```

This becomes cumbersome when you're not using semi-colons, because JavaScript
interprets `()` as a function call unless it is preceded by a semicolon `;`.
The below is perfectly valid.

```javascript
const obj = { name: 'Val' };
// Prints "Hello, undefined!" because the below is a multi-line function call
hello
({ name } = obj)

function hello({ name }) {
  console.log(`Hello, ${name}!`);
}
```

If you're not using semicolons, you need to be careful to use both a semicolon `;` _and_ parenthesis `()` when using object destructuring.

```javascript
const obj = { name: 'Val' };
hello // Not called because of the semicolon on the next line
;({ name } = obj)
console.log(name); // Prints "Val"

function hello({ name }) {
  console.log(`Hello, ${name}!`);
}
```

If you choose to write JavaScript without semicolons, make sure you use a
linter. The alternative is to be well versed in [all the exceptions to automatic semicolon insertion (ASI)](https://eslint.org/docs/2.0.0/rules/no-unexpected-multiline) and
be committed to keeping up with all [future changes in the JavaScript language that may change the list of ASI exceptions](https://github.com/tc39/ecma262/pull/1062#issuecomment-357039873).

Moving On
---------

Destructuring assignments are one of the slickest new features from ES2015,
they can make your code a lot more concise and make working with CSVs much easier. But destructuring assignments come with several quirks that you
need to be aware of, particularly when you aren't using semicolons. Make
sure you use semicolons or a linter, and take advantage of destructuring
assignments to save yourself from repetitive code.
