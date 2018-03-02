Much to [many people's chagrin](http://thecodebarbarian.com/i-dont-want-to-hire-you-if-you-cant-reverse-a-binary-tree), the practice of asking algorithms questions in tech interviews doesn't seem like it is going anywhere. From what I've heard though, more and more companies are allowing people to answer algorithms questions in JavaScript. In this week's article, I'll walk through a common interview question, [glob matching](https://en.wikipedia.org/wiki/Glob_(programming)), and implement the solution in JavaScript.

Introducing Glob Matching
-------------------------

The exercise is that, given a `pattern` and a `str`, determine if `str` matches
`pattern`. The only special character you need to support is the wildcard character '*', which matches any number of characters, including no characters. For example:

* `patternMatches('a*b', 'aabb')` returns true
* `patternMatches('a*b', 'aabbc')` returns false
* `patternMatches('ab*', 'abcd')` returns true
* `patternMatches('a*b*c', 'abc')` returns true
* `patternMatches('a*b*c', 'aaabccc')` returns true
* `patternMatches('a*b*c', 'abca')` returns false

You don't need to worry about supporting escaping '*'. Of course, you can implement this using regular expressions, like [minimatch](https://www.npmjs.com/package/minimatch) does, but for the purposes of this exercise pretend regular expressions don't exist.

Recursive Solution
------------------

The idea behind the recursive solution is that it is easy to verify whether a pattern that only has one '*' at the end matches. Given the pattern 'ab*', all you need to do to verify whether the string matches is to check whether the string starts with 'ab'.
Here's the idea of the recursive algorithm:

* If `pattern` does not contain any '*' characters, then `str` matches only if `pattern === string`.
* If `pattern` contains a '*', then `str` matches if `pattern` up to the first '*' character matches the first `i` characters of `str` and the rest of `pattern` matches the rest of `str`.

Here's the implementation:

```javascript
function patternMatches(pattern, str) {
  if (!pattern.includes('*')) {
    // No wildcards, so must be an exact match
    return pattern === str;
  }

  const starIndex = pattern.indexOf('*');
  const leftPattern = pattern.substr(0, starIndex);
  const rightPattern = pattern.substr(starIndex + 1);

  if (leftPattern !== str.substr(0, starIndex)) {
    // Non-wildcard characters at the start of `pattern` are different from
    // the start of `str`, for example `ab*` and `ba`
    return false;
  }

  if (rightPattern.length === 0) {
    // Nothing left in pattern
    return pattern.startsWith(str);
  }

  for (let numChars = 0; numChars < str.length - starIndex; ++numChars) {
    // Check to see if the remaining part of `pattern` matches some part of `str`
    if (patternMatches(rightPattern, str.substr(starIndex + numChars))) {
      return true;
    }
  }

  return false;
}
```

Dynamic Programming
----------------------------

The recursive solution is neat, but also has exponential running time. Getting
the recursive solution is good, but getting the [dynamic programming](https://en.wikipedia.org/wiki/Dynamic_programming) solution is
impressive. Like most dynamic programming solutions, the trick is to create a `pattern.length + 1` x `str.length + 1` array of booleans, where `arr[i][j]` is true iff the first `i` characters of `pattern` matches the first `j` characters of `str`. Once you have this array, all you need to do is return `arr[pattern.length][str.length]`.

The dynamic programming solution operates on the same idea as the recursive solution: its easy to calculate whether a pattern that contains only one '*' at the end matches. The difference is that dynamic programming uses a loop instead of recursion. Like most dynamic programming solutions, you build up your 2-dimensional array using a recurrence relationship. In order words, `arr[i][j]` must be a function of previous values in the array. Here's the pseudo-code:

* `arr[0][0]` is true: empty pattern matches empty string
* If `pattern[i - 1]` is '*', we either use the wildcard or we don't. `arr[i][j]` represents whether the first `i` characters of `pattern` match the first `j` characters of `str`. If we use the wildcard, then the first `i` characters of pattern must also match the first `j - 1` characters of `i`, so `arr[i][j - 1]` must be true. If we don't use the wildcard, then the first `i - 1` characters of pattern must also match the first `j` characters, so `arr[i][j - 1]`.
* If `pattern[i - 1]` is not '*', `pattern[i - 1]` must equal `str[j - 1]` and the first `i - 1` characters of `pattern` must match the first `j - 1` characters of `str`.

Here's the actual implementation.

```javascript
function patternMatches(pattern, str) {
  if (!pattern.includes('*')) {
    // No wildcards, so must be an exact match
    return pattern === str;
  }

  const arr = [];
  for (let i = 0; i <= pattern.length; ++i) {
    arr.push([]);
    for (let j = 0; j <= str.length; ++j) {
      arr[i].push(false);
    }
  }

  // Empty pattern matches empty string
  arr[0][0] = true;

  // Empty str only matches if pattern is '*'
  for (let i = 1; i < pattern.length; ++i) {
    arr[i][0] = pattern === '*';
  }

  // Empty pattern is always false

  // Build up array using recurrence relationship
  for (let i = 1; i <= pattern.length; ++i) {
    for (let j = 1; j <= str.length; ++j) {
      if (pattern[i - 1] === '*') {
        // Two cases: either we use the wildcard, in which case `arr[i][j - 1]` must be true for a match,
        // or we don't, in which case `arr[i - 1][j]` must be true
        arr[i][j] = arr[i - 1][j] || arr[i][j - 1];
      } else {
        // If no wildcard, chars must be equal and previous substrs must match
        arr[i][j] = pattern[i - 1] === str[j - 1] && arr[i - 1][j - 1];
      }
    }
  }

  return arr[pattern.length][str.length];
}
```  

Moving On
---------

Glob matching is a great exercise to build your understanding of recursion and dynamic programming. In practice you'd use a package like [minimatch](https://www.npmjs.com/package/minimatch), but you're not going to stop doing [bench presses](https://en.wikipedia.org/wiki/Bench_press) even if the limit of your physical exertion on an average day is lifting a cup of coffee. Like doing bench presses, I find it helpful to work through an algorithmic exercises like these to challenge myself and stay sharp, even if I rarely need to do dynamic programming in my day-to-day.
