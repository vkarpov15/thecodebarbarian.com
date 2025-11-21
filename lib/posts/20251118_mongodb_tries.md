Autocomplete seems like one of the easiest features to build.
You take the user's input, loop through your list of options, and filter anything that starts with the same prefix:

```javascript
const matches = words.filter(w => w.startsWith(prefix));
```

And that works for small lists of text.
But once your dataset gets large, or your completions come from structured text (like `user.address.city` or `$gte`), simple loops start to fall short.

That's where tries come in.
Tries are trees built for prefix search.
They're fast, but more importantly, they mirror the structure of the data you’re autocompleting.
Instead of treating `user.address.city` as one long string, a trie naturally breaks it into nested levels (user → address → city), making it easier to suggest valid continuations even inside structured syntax.

We used tries to implement autocomplete for MongoDB in [Mongoose Studio, our web based MongoDB GUI](https://mongoosestudio.app).
But the same principles apply anywhere you need fast, contextual completions.

In this post, I'll explain how tries work, build one in JavaScript, and show how to use tries to autocomplete MongoDB queries.
MongoDB queries are just an example, this approach could work for any syntax-aware editor or API playground.

<style>
  tr {
    display: table-row !important;
  }

  td {
    padding: 4px !important;
  }
</style>

## What's a Trie?

A [trie](https://en.wikipedia.org/wiki/Trie) is a tree structure optimized for prefix lookups. Each node represents a single character, and the path from the root to a node spells out a word.

That means you can find all words starting with `user.a` just by walking down the characters `u → s → e → r → . → a`.
No need to check every word in your dataset.

Visually, a trie looks something like this:

```
root
 ├── u
 │   └── s
 │       └── e
 │           └── r
 │               └── .
 │                   ├── a → "user.address"
 │                   ├── e → "user.email"
 │                   └── n → "user.name"
```

This representation is perfect for nested identifiers, file paths, API routes, and MongoDB field paths.

## Step 1: Building a Basic Trie

Let's start with a simple implementation that supports inserting words and fetching completions by prefix.
A `Trie` is a tree structure that stores `TrieNode` instances.
You can `insert()` words into the trie, and `suggest()` completions by prefix.

```javascript
class TrieNode {
  constructor() {
    this.children = Object.create(null);
    this.isEnd = false;
    this.freq = 0;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, freq = 1) {
    if (!word) return;
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) {
        node.children[ch] = new TrieNode();
      }
      node = node.children[ch];
    }
    node.isEnd = true;
    node.freq += freq;
  }

  bulkInsert(words, freq = 1) {
    if (!Array.isArray(words)) return;
    for (const word of words) {
      this.insert(word, freq);
    }
  }

  collect(node, prefix, out) {
    if (node.isEnd) out.push([prefix, node.freq]);
    for (const [ch, child] of Object.entries(node.children)) {
      this.collect(child, prefix + ch, out);
    }
  }

  suggest(prefix, limit = 10) {
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }
    const results = [];
    this.collect(node, prefix, results);
    results.sort((a, b) => b[1] - a[1]);
    return results.slice(0, limit).map(([word]) => word);
  }
}
```

Here's a basic example of using a trie to suggest fruits based on a prefix:

```javascript
const t = new Trie();
t.bulkInsert(['apple', 'banana', 'orange', 'mango', 'mangosteen'], 1);
console.log(t.suggest('a')); // ['apple']
console.log(t.suggest('man')); // ['mango', 'mangosteen']
```

With this structure, you can preload any set of completions, from MongoDB operators to schema paths to commands.

## Step 2: Inferring syntactic context

Now let's apply this to MongoDB queries. MongoDB queries look like this:

```
{ "user.age": { "$gte": 24 } }
```

There are two distinct syntactic positions:

1. Field name position (before the colon):

```
{ "user.a|" }
           ^--- fieldName context
```

2. Operator position (after the colon, inside an object):

```
{ "user.age": { "$gte|" }
                  ^--- operator context
```

If the user types $ in a field name position, showing `$gte`, `$in`, `$regex` is wrong.

This is the primary motivation for going beyond simple filtering: you need autocomplete that understands where the cursor is.

But you don't need a full parser, just regular expressions is enough for practical purposes to check whether you're before or after a colon.
But first, we also need to add a notion of `roles` to a `TrieNode`.
A role indicates whether a particular `TrieNode` instance valid as a field name or operator, or both.

```javascript
class TrieNode {
  constructor() {
    this.children = Object.create(null);
    this.isEnd = false;
    this.freq = 0;
    this.roles = new Set(); // semantic roles like 'fieldName', 'operator'
  }
}

class Trie {
  insert(word, freq = 1, role = null) {
    if (!word) return;
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isEnd = true;
    node.freq += freq;
    if (role) node.roles.add(role);
  }

  bulkInsert(words, freq = 1, role = null) {
    for (const w of words) this.insert(w, freq, role);
  }
}
```

Now we need to determine whether the user is typing:

1. a field name (before a colon), or
2. an operator (inside an object after a colon)

For JSON-like structures, the following works extremely well:

```javascript
function getContext(beforeCursor) {
  // If we're after a colon, assume we're inside a value → operator context
  const colonMatch = beforeCursor.match(/:\s*([^,\}\]]*)$/);
  return colonMatch ? 'operator' : 'fieldName';
}
```

Examples:

| Input before cursor  | getContext() |
| -------------------- | ------------ |
| `{ "user.`           | `fieldName`  |
| `{ "user.age": { "$` | `operator`   |
| `{ us`               | `fieldName`  |
| `{ "age": $g`        | `operator`   |

With roles, you can create a trie for MongoDB operators as follows:

```javascript
// Field paths → fieldName role
trie.bulkInsert(
  ['user.email', 'user.age', 'user.address.city', 'metadata.updatedAt'],
  10,
  'fieldName'
);

// MongoDB operators → operator role
trie.bulkInsert(
  ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$exists', '$regex'],
  5,
  'operator'
);

console.log(trie.suggest('user.', { context: 'fieldName' })); // [ 'user.email', 'user.age', 'user.address.city' ]
console.log(trie.suggest('$g', { context: 'operator' })); // [ '$gt', '$gte' ]
```

## Step 3: Tie it all together

Now that we have a trie with semantic roles, let’s talk about how to actually use it in a query editor — because this is the part that trips people up.

A trie can only autocomplete tokens:

```
user.
user.email
$gt
$regex
```

But when someone is typing a MongoDB query, the text before the cursor looks like this:

```
{ "user.a" }
{ "user.age": { "$g" } }
{ us
```

If you pass the entire buffer, like `{ us`, into the trie, you'll get nothing back, because the trie doesn't store those strings.
To accomplish that, you can use a small regex that grabs the last word after a `{` or a `,`:

```javascript
function extractToken(beforeCursor) {
  // Find the partial token being typed where keys or operators appear
  const match = beforeCursor.match(/(?:\{|,)\s*([^:\s]*)$/);
  return match ? match[1].replace(/["']/g, '') : '';
}
```

| Input (`beforeCursor`) | extractToken() |
| ---------------------- | -------------- |
| `{ us`                 | `us`           |
| `{ "user.a"`           | `user.a`       |
| `{ "user.age": { $g`   | `$g`           |
| `{}`                   | `` (empty)     |

Combine `getContext()` and `extractToken()` into one call to get the following:

```javascript
function suggestAt(text, cursorPos) {
  const beforeCursor = text.slice(0, cursorPos);

  // 1. Extract current token fragment (prefix for the trie)
  const prefix = extractToken(beforeCursor);

  // 2. Infer semantic context
  const context = getContext(beforeCursor);

  if (!prefix) return [];

  // 3. Ask the trie for context-aware suggestions
  return trie.suggest(prefix, { context, limit: 10 });
}
```

Now the trie behaves more intelligently:

1. It sees only the meaningful part being typed (the token, not the entire buffer)
2. It understands where the user is in the syntax (fieldName vs operator)

And it filters completions accordingly.

```javascript
console.log(suggestAt('{ us', 4)); // [ 'user.email', 'user.age', 'user.address.city' ]
console.log(suggestAt('{ "user.age": { "$g', 21)); // [ '$gt', '$gte' ]
```

## Moving On

Tries are one of those data structures that feel almost old-fashioned.
Something you learned once in an algorithms class and promptly forgot. But for structured autocomplete, they're a perfect fit.
They work especially well with MongoDB queries, which look a lot like JSON.
We were able to use this technique to power the query autocomplete in Mongoose Studio, letting users get suggestions for both schema fields and MongoDB operators in the right context.

Tries are small, elegant, dependency-free, and surprisingly powerful.
Try them out next time you want to build an autocomplete!
