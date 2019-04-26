It's finally happened: nearly 4 years after [the `import` keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) was introduced in ES6, Node.js introduced experimental support for ES6 imports and exports. In Node.js 12, you can use `import` and `export` in your project if you do both of the below items.

1) [Add the `--experimental-modules` flag when running Node.js](http://2ality.com/2019/04/nodejs-esm-impl.html#using-es-modules-on-nodejs)

2) Use the `.mjs` extension **or** set `"type": "module"` in your `package.json`.

In this article, I'll walk you through a basic "Hello, World" example of using `import` in Node.js, and demonstrate using imports with existing npm modules.

Hello, Imports
--------------

To start, let's set up 3 files: `index.js`, `test.js`, and `package.json`. The `index.js` file will import from `test.js`. Here's `index.js`:

```javascript
import test from './test.js';

test();
```

Note that, with ES6 imports, you **must** put the file extension `.js`, except
for [so-called "bare paths"](http://2ality.com/2019/04/nodejs-esm-impl.html#es-module-specifiers-in-nodejs) for importing packages like [lodash](http://npmjs.com/package/lodash). from your `./node_modules`. Here's `test.js`:

```javascript
export default function foo() {
  console.log('Hello, World!'); 
}
```

And, finally, `package.json`. This `package.json` is very important. The `type: "module"` property tells Node.js to treat `.js` files as [ESM modules](https://nodejs.org/api/esm.html#esm_code_package_json_code_code_type_code_field). In other words, `{"type":"module"}` tells Node.js to expect `import` and `export` statements in `.js` files.

```
{ "type": "module" }
```

These files are also available on [this GitHub gist](https://gist.github.com/vkarpov15/dbac89019245b10b7fb78d3530a1fed3).

Run `index.js` with Node.js 12 and you should see the below output. Don't forget the `--experimental-modules` flag. You need both.

```
node --experimental-modules index.js 
(node:7289) ExperimentalWarning: The ESM module loader is experimental.
Hello, world!
```

If you forget the `--experimental-modules` flag, you'll get the below error.

```
$ node index.js 
/index.js:1
import test from './test.js';
       ^^^^

SyntaxError: Unexpected identifier
```

You'll get a similar error if your `package.json` file doesn't contain `{"type":"module"}`.

```
$ rm package.json
$ node --experimental-modules index.js 
(node:9089) ExperimentalWarning: The ESM module loader is experimental.
/index.js:1
import test from './test.js';
       ^^^^

SyntaxError: Unexpected identifier
```

Using `.mjs`
------------

You can avoid the need for `{"type":"module"}` by using the `.mjs` extension, instead of `.js`. For example, here's `index.mjs`:

```javascript
import test from './test.mjs';

test();
```

Note that you need to change the file extension in the `import` statement as well:
`'./test.js'` to `'./test.mjs'`. Here's `test.mjs`:

```javascript
export default function foo() {
  console.log('Hello, world!');
}
```

Running `index.mjs` will give you the below output.

```
$ node --experimental-modules index.mjs
(node:10191) ExperimentalWarning: The ESM module loader is experimental.
Hello, world!
```

Note that, unlike `index.js`, Node.js doesn't resolve `index.mjs` if you run `node index` or `node .`.

```
$ node --experimental-modules .
(node:10296) ExperimentalWarning: The ESM module loader is experimental.
internal/modules/esm/default_resolve.js:69
  let url = moduleWrapResolve(specifier, parentURL);
            ^

Error: Cannot find module '/' imported from /
```

Importing CommonJS npm Modules
------------------------------

The `import` and `export` keywords are part of the ECMAScript Modules spec, or ESM for short. Most Node.js projects are written using CommonJS, using [the `require()` function](https://nodejs.org/api/modules.html#modules_require_id) to import other files.

Node.js' ESM loader supports CommonJS modules. That means npm packages that are written in CommonJS, like [Mongoose](https://www.npmjs.com/package/mongoose), work fine in `.mjs` files or with `{"type":"module"}` in your `package.json`.

```javascript
// Works even though Mongoose uses CommonJS
import mongoose from 'mongoose';

console.log(mongoose.version);
```

Bare paths like `'mongoose'` work, but keep in mind you need to put file extensions if you want to import subpaths. For example, in CommonJS you can import [lodash's `at()` function](https://lodash.com/docs/4.17.11#at) using the below syntax.

```javascript
const at = require('lodash/at');
```

You can still import `at` with ES6 imports, with the caveat that you must add `.js` at the end.

```javascript
// The `.js` is important. If you omit `.js`, Node.js will throw a
// "Cannot find module" error.
import at from 'lodash/at.js';

console.log(at({ a: { b: 'test' } }, ['a.b'])); // ['test']
```

Moving On
---------

ESM modules in Node.js means that you can finally write fully isomorphic JavaScript without transpilers. As long as you don't rely on Node.js core libraries like [`fs`](https://nodejs.org/api/fs.html), your JavaScript will run in both Chrome and Node. Once ESM imports are no longer behind a flag, you won't need transpilers for full ES6 support.