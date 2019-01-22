Converting a string to a number in JavaScript is [surprisingly subtle](https://gomakethings.com/converting-strings-to-numbers-with-vanilla-javascript/). With `NaN`, [implicit radixes](https://www.w3schools.com/jsref/jsref_parseint.asp), and numbers vs [Numbers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number), there are a lot of ways to shoot yourself in the foot. In this article, I'll cover the tradeoffs of `parseFloat()` vs `Number()` and `Number.isNaN()` vs `isNaN()`. I'll also describe how to enforce these rules with [eslint](https://eslint.org/).

The [TLDR](https://en.wiktionary.org/wiki/tl;dr) is you should use [`Number(x)`] to convert generic JavaScript values to numbers if you want to be permissive, or [`parseFloat(x)`](https://www.w3schools.com/jsref/jsref_parsefloat.asp) if you want to be more strict. You should always use [`Number.isNaN()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN) to check if the conversion failed. You should _not_ use the [global `isNaN()` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN).

```javascript
typeof parseFloat('42'); // 'number'
Number.isNaN(Number('42')); // false

typeof parseFloat('fail'); // 'number'
Number.isNaN(Number('fail')); // true
```

Using `Number(x)` has several edge cases that may be correct depending on your perspective. You can also use a tool like [archetype](https://www.npmjs.com/package/archetype) that handles some of these edge cases for you:

```javascript
archetype.to('42', 'number'); // 42

Number(''); // 0
archetype.to('', 'number'); // throws
```

What's Wrong With `Number(x)`?
------------------------------

`Number(x)` and `parseFloat(x)` handle edge cases very differently. `parseFloat()` is more permissive when it comes to accepting different strings:

```javascript
Number('42 fail'); // NaN
parseFloat('42 fail'); // 42
parseInt('42 fail'); // 42

Number(' 10'); // NaN
parseFloat(' 10'); // 10
parseInt(' 10'); // 10
```

You might mistakenly assume this means `Number(x)` is safer and more strict. Unfortunately, `Number(x)` is more lax when it comes to whitespace, `null`, and other edge cases. It converts a lot of surprising values to 0. For example:

```javascript
Number(null); // 0
Number(''); // 0
Number('    '); // 0
Number(false); // 0
Number({ toString: () => '' }); // 0
Number({ valueOf: () => '  ' }); // 0
```

This is because the JavaScript language spec has a [fairly complex set of rules](http://www.ecma-international.org/ecma-262/6.0/#sec-tonumber) for converting values to numbers.

The rules for how [`parseFloat()` converts values](http://www.ecma-international.org/ecma-262/6.0/#sec-parsefloat-string) are simpler. The interpretter _must_ convert the value to a string, trim whitespace, and then check for the longest prefix that matches [JavaScript's regular expression definition of a numeric literal](http://www.ecma-international.org/ecma-262/6.0/#sec-tonumber-applied-to-the-string-type).

```javascript
// `parseInt()` behaves like `parseFloat()` on these values
parseFloat(null); // NaN
parseFloat(''); // NaN
parseFloat('    '); // NaN
parseFloat(false); // NaN
parseFloat({ toString: () => '' }); // NaN
parseFloat({ valueOf: () => '  ' }); // NaN
```

`Number.isNaN()` vs `isNaN()`
-----------------------------

Another nuance of converting values to numbers is that JavaScript doesn't throw an error if it fails to convert a value `x` to a number. It instead returns a special value [`NaN`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN). To make things more confusing, the `typeof` operator reports that `NaN` is a `'number'`.

```javascript
Number('fail'); // NaN
typeof Number('fail'); // number
```

The reason why `Number.isNaN()` and `isNaN()` exist is because `==` and `===` do **not** work as expected with `NaN`.

```javascript
Number('fail') == Number('fail'); // false
Number('fail') === Number('fail'); // false
Number('fail') == NaN; // false
NaN === NaN; // false
```

[`Number.isNaN()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN) was a new feature in ES6, but unfortunately didn't get much attention. `Number.isNaN()` is more robust and you should use it instead of `isNaN()` unless you explicitly mean to use `isNaN()`.

```javascript
// Need to use a function because checking `=== NaN` does **not** work
isNaN(Number('fail')); // true
Number.isNaN(Number('fail')); // true
```

Here's a handy analogy for understanding the difference: `Number.isNaN()` is to `isNaN()` as `===` is to `==`. The `isNaN()` function [converts the given value to a number](http://www.ecma-international.org/ecma-262/6.0/#sec-isnan-number) _before_ checking it the given number is equal to `NaN`.

```javascript
isNaN('fail'); // true
isNaN({}); // true

Number.isNaN('fail'); // false
Number.isNaN({}); // false
```

On the other hand, [`Number.isNaN(x)` returns `false` if `x` is not of type number](http://www.ecma-international.org/ecma-262/6.0/#sec-number.isnan). You can polyfill `Number.isNaN()` using the below function:

```javascript
Number.isNaN = function(x) {
  return typeof x === 'number' && isNaN(x);
};
```

Conversely, `isNaN(x)` is equivalent to `Number.isNaN(Number(x))`.

When you're checking whether the result of `Number(x)` or `parseFloat(x)` is equal to `NaN`, you're safe using `isNaN()` because you already tried to convert the value to a number. But in general, you should prefer `Number.isNaN()` over `isNaN()` in the same way that you (hopefully) use `===` unless you really know you mean `==`.

ESLint Rules
------------

You can configure [eslint](https://eslint.org/) to force you to use `Number.isNaN()` and your choice of `Number()` or `parseFloat()` using the [`no-restricted-globals` rule](https://eslint.org/docs/rules/no-restricted-globals). There's more info on [this GitHub issue](https://github.com/eslint/eslint/issues/10313). Below is an example of a `.eslintrc.yml` that would disallow using global `isNaN()` and `parseFloat()`

```javascript
rules:
  no-restricted-globals:
    - error
    - name: isNaN
      message: Use `Number.isNaN()` instead
    - name: parseFloat
      message: Use `Number()` instead
```

Requiring `parseFloat()` instead of `Number()` is trickier, but doable with eslint's generic [`no-restricted-syntax` rule](https://eslint.org/docs/rules/no-restricted-syntax).

```
rules:
  no-restricted-globals:
    - error
    - name: isNaN
      message: Use `Number.isNaN()` instead
  no-restricted-syntax:
    - error
    - selector: CallExpression[callee.name='Number']
      message: Do not use `Number()`, use `parseFloat()` instead
```

Moving On
---------

Converting a value to a number in JavaScript is filled with odd edge cases. If you don't want to think about edge cases, you're best off just using `parseFloat()` and `Number.isNaN()`. If you want to be more flexible, you can use `Number()`. Personally, I just use [archetype](https://www.npmjs.com/package/archetype) for this because I don't want to worry about checking for `NaN`.

*Can't keep up with what's going on in your `node_modules`? Check out [JSReport's Slack integration](https://js.report/slack). JSReport posts to a Slack channel whenever an npm package you're watching, like [lodash](http://npmjs.com/package/lodash) or [webpack](https://www.npmjs.com/package/webpack), publishes a new release.*

<a href="https://js.report/slack" class="async-await-banner"><img src="https://s3.amazonaws.com/codebarbarian-images/jserport.png"></a>
