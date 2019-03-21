The [`String#replace()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) function replaces instances of a substring with another substring, and returns the modified string. This function seems simple at first, but `String#replace()` can do a whole lot more than just replace 'foo' with 'bar'. In this article, I'll explain some more sophisticated ways to use `String#replace()`, and highlight some common pitfalls to avoid.

The Basics of Replacing a String
----------------------------

[JavaScript strings are immutable](https://www.sitepoint.com/immutability-javascript/),
so the `String#replace()` function returns the modified string. It does **not** modify
the existing string.

```javascript
const str1 = 'foo bar';
const str2 = str1.replace('foo', 'bar');

str1; // 'foo bar'
str2; // 'bar bar'
```

Generally, the first argument to `replace()` is called the _pattern_, and the 2nd
argument is called the _replacement_. In the above example, 'foo' is the pattern
and 'bar' is the replacement.

By default, `replace()` only replaces the first instance of the pattern. In
the below example, JavaScript only replaces the first instance of 'foo' with 'bar'.

```javascript
'foo foo'.replace('foo', 'bar'); // 'bar foo'
```

Unfortunately, in my experience it's rare you only want to replace the first instance
of a substring. To make JavaScript replace _all_ instances of a substring rather than
just one, you need to use a regular expression.

RegExps and the `global` Flag
-----------------------------

To replace all instances of 'foo' in a string, you need to use a
[regular expression with the `/g` flag](http://2ality.com/2013/08/regexp-g.html).

```javascript
// Note the 'g' after `/foo/`
'foo foo'.replace(/foo/g, 'bar'); // 'bar bar'

// Without 'g', `replace()` will only replace the first 'foo'
'foo foo'.replace(/foo/, 'bar'); // 'bar foo'
```

Using the `/str/` syntax can be inconvenient if the string you want to replace
has slashes or special characters. In that case, you can use
[JavaScript's `RegExp` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).

```javascript
// Pass 'g' as the 2nd argument to set the global flag
const re = new RegExp('/home/user', 'g');

'/home/user/path/to/file.txt'.replace(re, '~'); // '~/path/to/file.txt'

re.global; // true
```

If you want to make sanitize user input to make it safe to use with RegExps and
`.replace()`, you should use the [`escape-string-regexp` package](https://www.npmjs.com/package/escape-string-regexp).

```javascript
const escapeString = require('escape-string-regexp');

// Without escaping the string, `new RegExp('.*')` gives you a RegExp
// that matches any string, rather than just instances of '.*'.
const re = new RegExp(escapeString('.*'), 'g');

'.* .*'.replace(re, 'foo'); // foo foo
```

Replacement Patterns
--------------------

There are several [special character sequences that you can use in the 2nd argument to `replace()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter).
For example, suppose you want to wrap all numbers in a string in parentheses.
JavaScript replaces `$&` in the replacement string with the matched string,
so you can wrap all numbers in parentheses as shown below. Note that JavaScript
does **not** treat the replacement string as a regular expression, so you don't
need to escape the parentheses.

```javascript
const str = 'Like example 1, example 2 also shows this pattern';

// 'Like example (1), example (2) also shows this pattern'
str.replace(/\d+/g, '($&)');
```

A slightly more tricky task is prefixing all numbers in a string with a dollar
sign '$'. Using `$$&` as your replacement will **not** give you the right result.
You need to use `$$$&` with 3 `$` characters.

```javascript
// Year over year revenue grew from $4M to $5M
'Year over year revenue grew from 4M to 5M'.replace(/\d+/g, '$$$&');
```

If you want to add a single `$` sign immediately before a replacement pattern,
you need to [escape it by using `$$`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter).
You _only_ need to escape `$` if you're using it immediately before `$`, `&`, `` ` ``, `'`. You also need to escape `$` if it immediately precedes a digit and you're using capture groups.
For example, you do **not** need to escape `$`
if the next character in the replacement is a space:

```javascript
// Year over year revenue grew from $ 4M to $ 5M
'Year over year revenue grew from 4M to 5M'.replace(/\d+/g, '$ $&');
```

Passing a Function as the Replacement
-------------------------------------

You can get extra fancy and [pass a function as the replacement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter). JavaScript will call your replacement function for every
instance of the pattern, and replace with the return value of your replacement
function.

JavaScript calls your replacement function with 3 parameters _unless_ you use a
[RegExp capture group](https://javascript.info/regexp-groups#contents-of-parentheses).
The 3 arguments are:

* `name`: The substring matched by the pattern
* `offset`: The index of the start of `name` in the whole string
* `string`: The string you called `replace()` on.

Here's an example:

```javascript
const values = ['foo', 'bar', 'baz'];

// The below replaces '1 2 3' with 'foo bar baz'
'1 2 3'.replace(/\d+/g, function(name, offset, string) {
  // This function is called 3 times
  name; // '1', '2', '3'
  offset; // 0, 2, 4
  string; // Always '1 2 3'

  return values[Number(name) - 1]; // return 'foo', 'bar', 'baz'
});
```

Moving On
---------

Replacing substrings in JavaScript has some common pitfalls, most notably only
replacing only the first instance of the substring by default. But JavaScript
makes up for it with replacement patterns and replacement functions, which allow
for some powerful string manipulation patterns. Tricky tasks like prefixing
all numbers in a string with dollar signs become elegant one-liners. Try out
replacement patterns or replacement functions next time you're tempted to
chain together `.split().map().join()`.