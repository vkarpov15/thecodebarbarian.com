[Mongoose 9.9.0 was released on July 30, 2026](https://github.com/Automattic/mongoose/releases/tag/9.9.0) and is primarily focused on improving performance.
We've been looking forward to taking a deep dive into JavaScript performance for many years and we're thrilled to share our first round of improvements.
These changes reduce overhead in several of Mongoose's most heavily used code paths and will make most Mongoose apps a little bit faster with no changes required.
This release includes several optimizations for `insertMany()`, document validation, and `toObject()`.

Most importantly, these changes do not bypass casting, change tracking, validation, middleware, getters, transforms, or any other Mongoose feature that your app relies on.
Mongoose is just now smarter about the bookkeeping it needs to do to support these features.

In this blog post, I'll cover the most important performance improvements in Mongoose 9.9, with a particular focus on `insertMany()`.

## Faster `insertMany()`

`insertMany()` is a convenient way to insert a large number of documents while still getting Mongoose casting, defaults, validation, timestamps, and middleware.
Mongoose does additional work to validate and hydrate each document, but there was also a lot of overhead that we could eliminate.
All in all, we've been able to improve Mongoose's performance on our [`insertManySimple` benchmark](https://github.com/Automattic/mongoose/blob/c14e17edd2e1223b361668774ac4124814d49d06/benchmarks/insertManySimple.js) by 35%.

<svg viewBox="0 0 760 420" width="100%" role="img" aria-labelledby="fieldnote-title fieldnote-desc" style="font-family: ui-sans-serif, system-ui, sans-serif; overflow: visible;"><text id="fieldnote-title" x="0" y="0" visibility="hidden">Mongoose insertMany() 1500 documents</text><text id="fieldnote-desc" x="0" y="0" visibility="hidden">A bar chart</text><text x="66" y="28" fill="#334155" font-size="20" font-weight="700">Mongoose insertMany() 1500 documents</text><text x="66" y="51" fill="#64748b" font-size="12">Mongoose 9.9.0 vs 9.8.1 vs MongoDB Node.js driver</text><g aria-hidden="true"><line x1="66" y1="344" x2="732" y2="344" stroke="#e5dfdb" stroke-dasharray="0"></line><text x="54" y="348" fill="#64748b" font-size="11" text-anchor="end">0ms</text><line x1="66" y1="292" x2="732" y2="292" stroke="#e5dfdb" stroke-dasharray="3 5"></line><text x="54" y="296" fill="#64748b" font-size="11" text-anchor="end">4ms</text><line x1="66" y1="240" x2="732" y2="240" stroke="#e5dfdb" stroke-dasharray="3 5"></line><text x="54" y="244" fill="#64748b" font-size="11" text-anchor="end">8ms</text><line x1="66" y1="188" x2="732" y2="188" stroke="#e5dfdb" stroke-dasharray="3 5"></line><text x="54" y="192" fill="#64748b" font-size="11" text-anchor="end">12ms</text><line x1="66" y1="136" x2="732" y2="136" stroke="#e5dfdb" stroke-dasharray="3 5"></line><text x="54" y="140" fill="#64748b" font-size="11" text-anchor="end">16ms</text><line x1="66" y1="84" x2="732" y2="84" stroke="#e5dfdb" stroke-dasharray="3 5"></line><text x="54" y="88" fill="#64748b" font-size="11" text-anchor="end">20ms</text></g><g class="fieldnote-bars"><rect x="140" y="167.45999999999998" width="74" height="176.54000000000002" rx="4" fill="#b0202b" tabindex="0" role="img" aria-label="mongoose@9.8.1: 13.58ms"><title>mongoose@9.8.1: 13.58ms</title></rect><text x="177" y="158.45999999999998" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">13.58ms</text><text x="177" y="371" fill="#334155" font-size="12" text-anchor="middle">mongoose@9.8.1</text><rect x="362" y="230.25" width="74" height="113.75" rx="4" fill="#c94b55" tabindex="0" role="img" aria-label="mongoose@9.9.0: 8.75ms"><title>mongoose@9.9.0: 8.75ms</title></rect><text x="399" y="221.25" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">8.75ms</text><text x="399" y="371" fill="#334155" font-size="12" text-anchor="middle">mongoose@9.9.0</text><rect x="584" y="274.97" width="74" height="69.02999999999999" rx="4" fill="#d98289" tabindex="0" role="img" aria-label="mongodb@7.5.0: 5.31ms"><title>mongodb@7.5.0: 5.31ms</title></rect><text x="621" y="265.97" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">5.31ms</text><text x="621" y="371" fill="#334155" font-size="12" text-anchor="middle">mongodb@7.5.0</text></g><text x="15" y="214" fill="#64748b" font-size="11" transform="rotate(-90 15 214)" text-anchor="middle">ms</text></svg>

Here's some of the biggest pieces of overhead that we were able to eliminate:

#### Using empty objects `{}` instead of `new Map()`

[Creating a new Map is 10x slower than creating an empty object](https://jsbenchmark.com/#eyJjYXNlcyI6W3siaWQiOiJLdmJOdGRtZjlPd2FoRjNaUHE2SlMiLCJjb2RlIjoicmV0dXJuIHsgfSIsIm5hbWUiOiJGaW5kIDk5IiwiZGVwZW5kZW5jaWVzIjpbXX0seyJpZCI6IlFVNFlna0U1MVpHUjVOd3dkRUdXTyIsImNvZGUiOiJyZXR1cm4gbmV3IE1hcCgpIiwibmFtZSI6IkZpbmQgMTk5IiwiZGVwZW5kZW5jaWVzIjpbXX1dLCJjb25maWciOnsibmFtZSI6IkJhc2ljIGV4YW1wbGUiLCJwYXJhbGxlbCI6dHJ1ZSwiZ2xvYmFsVGVzdENvbmZpZyI6eyJkZXBlbmRlbmNpZXMiOltdfSwiZGF0YUNvZGUiOiJyZXR1cm4gWy4uLkFycmF5KDEwMDApLmtleXMoKV0ifX0) - creating an empty object is heavily optimized in V8, even faster than using `Object.create(null)`.

We also entirely got rid of `originalDocIndex`, which was one of the maps `insertMany()` used to track order. I originally started moving toward using `new Map()` to minimize risk of prototype pollution, but the performance tradeoff is too great to justify in performance-sensitive code.

#### Leveraging Mongoose's fast path `toObjectShallow()` function to avoid deep cloning for documents that only have primitives.

Mongoose's `toObject()` function deep clones the document. `toObjectShallow()` is a faster alternative that skips all recursive cloning - about 40% faster than `toObject()` because it avoids a bunch of unnecessary options, object checks, and recursive cloning.

We also reuse the check for whether the document has only primitive values to avoid checking for subdocuments when resetting `isNew`.

#### Faster setting of `versionKey`.

Before, `insertMany()` would initialize the version key using `doc[versionKey] = 0`, which looks fine at first glance... until you realize that `doc[versionKey]` actually triggers Mongoose's entire `set()` path, including setters and checking `versionKey` for `.` to potentially split the version key path.

Now, `insertMany()` uses Mongoose's internal `$__setValue()` function with a pre-split version key path to avoid the extra `indexOf()` check and general `set()` overhead.
In particular, Mongoose documents' `$__setValue()` now has a fast path for when the given path is an array of length 1 - in this case, it simply sets the value directly without any `indexOf()` or `split()` overhead.

#### Faster `parallelLimit()` without sets

`insertMany()` uses a `parallelLimit()` function to ensure a maximum of `options.limit` validations can execute concurrently - this is helpful for async validators that make database queries.
Previously, `parallelLimit()` used a `Set` to track pending validations: `parallelLimit` starts a validation, adds it to the set, waits for the next validation to complete using `Promise.race()`, and removes the completed validation from the set.
Below is the old code.

```javascript
const results = [];
const executing = new Set();

for (let index = 0; index < params.length; index++) {
  const param = params[index];
  const p = fn(param, index);
  results.push(p);

  executing.add(p);

  const clean = () => executing.delete(p);
  p.then(clean).catch(clean);

  if (executing.size >= limit) {
    await Promise.race(executing);
  }
}

return Promise.all(results);
```

Like with maps, creating a `new Set()` is prohibitively slow.
Also, calling `Promise.race()` O(n) times is slow because `Promise.race()` creates a new promise every time _and_ iterates over all pending promises.
Instead of relying on a set, the new optimized `insertMany()` kicks off `limit` "worker" functions.
Each `worker()` call executes a single validation, and recursively calls `worker()` when it succeeds.
That means no set instantiation and no `Promise.race()`: `parallelLimit()` tracks the next validation to execute with a single `nextIndex` counter.

## Change tracking improvements

Mongoose's state machine class is simple, but it sits on a very hot path: documents use it on every property set and after a document is persisted in `insertMany()` or `save()`.
The `StateMachine` class stores:

1. A `states` object that maps state names to a list of paths in that state
2. A `paths` object that maps paths to their state - the inverse of `states`

The state machine class has a `clear()` method clears all paths from a given state.

```javascript
StateMachine.prototype.clear = function clear(state) {
  if (this.states[state] == null) {
    return;
  }
  const keys = Object.keys(this.states[state]);
  if (keys.length === 0) {
    return;
  }
  this.states[state] = {};
  let i = keys.length;

  while (i--) {
    delete this.paths[keys[i]];
  }
};
```

While this function may look inocuous at first glance, it is actually quite expensive.
Specifically, the [`delete` in a loop is a massive JIT deopt](https://dev.to/maxprilutskiy/hidden-classes-the-javascript-performance-secret-that-changed-everything-3p6c#the-delete-disaster).
While the overhead for a single `clear()` call is negligible, Mongoose calls `clear()` twice for every single document in the `insertMany()`.
When calling `insertMany()` on 1500 documents 10,000 times this small overhead adds up to a significant performance hit.
However, we don't need to call `clear()` - the idea is that Mongoose calls `clear()` multiple times to clear _almost_ all the change tracking for each document, minus the `init` state.
So instead of calling `clear()` multiple times, we can define a separate `clearAllExcept()` method that clears all states except for the given state.
This avoids the `delete` deopt.

```javascript
StateMachine.prototype.clearAllExcept = function clearAllExcept(state) {
  // State buckets are created lazily, so `states[state]` may not exist yet.
  const bucket = this.states[state];
  const keys = bucket == null ? [] : Object.keys(bucket);
  if (keys.length === 0) {
    this.paths = {};
    this.states = {};
    return;
  }
  this.paths = {};
  for (const path of keys) {
    this.paths[path] = state;
  }
  this.states = {
    [state]: this.states[state]
  };
};
```

The change tracking improvements don't just apply to `insertMany()`; `save()` also calls `clear()` under the hood.
Specifically, avoiding `clear()` combined with some optimizations to getting paths to `validate()` means creating and saving a new document with 10 properties is now about 10% faster, albeit still 15% slower than the MongoDB Node.js driver.

<svg viewBox="0 0 760 420" width="100%" role="img" aria-labelledby="fieldnote-title fieldnote-desc" style="font-family: ui-sans-serif, system-ui, sans-serif; overflow: visible;"><text id="fieldnote-title" x="0" y="0" visibility="hidden">Mongoose save() vs insertOne()</text><text id="fieldnote-desc" x="0" y="0" visibility="hidden">A bar chart</text><text x="66" y="28" fill="#334155" font-size="20" font-weight="700">Mongoose save() vs insertOne()</text><text x="66" y="51" fill="#64748b" font-size="12">Mongoose 9.9.0 vs 9.8.1 vs raw MongoDB Node driver for creating a new document with 10 properties</text><g aria-hidden="true"><line x1="66" y1="344" x2="732" y2="344" stroke="#e5dfdb" stroke-dasharray="0"></line><text x="54" y="348" fill="#64748b" font-size="11" text-anchor="end">0ms</text><line x1="66" y1="292" x2="732" y2="292" stroke="#e5dfdb" stroke-dasharray="3 5"></line><text x="54" y="296" fill="#64748b" font-size="11" text-anchor="end">1ms</text><line x1="66" y1="240" x2="732" y2="240" stroke="#e5dfdb" stroke-dasharray="3 5"></line><text x="54" y="244" fill="#64748b" font-size="11" text-anchor="end">2ms</text><line x1="66" y1="188" x2="732" y2="188" stroke="#e5dfdb" stroke-dasharray="3 5"></line><text x="54" y="192" fill="#64748b" font-size="11" text-anchor="end">3ms</text><line x1="66" y1="136" x2="732" y2="136" stroke="#e5dfdb" stroke-dasharray="3 5"></line><text x="54" y="140" fill="#64748b" font-size="11" text-anchor="end">4ms</text><line x1="66" y1="84" x2="732" y2="84" stroke="#e5dfdb" stroke-dasharray="3 5"></line><text x="54" y="88" fill="#64748b" font-size="11" text-anchor="end">5ms</text></g><g class="fieldnote-bars"><rect x="140" y="208.28" width="74" height="135.72" rx="4" fill="#b0202b" tabindex="0" role="img" aria-label="mongoose@9.8.1: 2.61ms"><title>mongoose@9.8.1: 2.61ms</title></rect><text x="177" y="199.28" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">2.61ms</text><text x="177" y="371" fill="#334155" font-size="12" text-anchor="middle">mongoose@9.8.1</text><rect x="362" y="221.8" width="74" height="122.2" rx="4" fill="#c94b55" tabindex="0" role="img" aria-label="mongoose@9.9.0: 2.35ms"><title>mongoose@9.9.0: 2.35ms</title></rect><text x="399" y="212.8" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">2.35ms</text><text x="399" y="371" fill="#334155" font-size="12" text-anchor="middle">mongoose@9.9.0</text><rect x="584" y="240" width="74" height="104" rx="4" fill="#d98289" tabindex="0" role="img" aria-label="mongodb@7.5.0: 2ms"><title>mongodb@7.5.0: 2ms</title></rect><text x="621" y="231" fill="#334155" font-size="12" font-weight="700" text-anchor="middle">2ms</text><text x="621" y="371" fill="#334155" font-size="12" text-anchor="middle">mongodb@7.5.0</text></g><text x="15" y="214" fill="#64748b" font-size="11" transform="rotate(-90 15 214)" text-anchor="middle">ms</text></svg>

## More efficient toObject()

Mongoose's `toObject()` and `toJSON()` methods are heavily used even when they aren't called directly by the application.
For example, when you call `JSON.stringify()` on a Mongoose document, `JSON.stringify()` calls `toJSON()` internally.
And Express.js' `res.json()` calls `JSON.stringify()` internally.
Also, the `save()` function uses `toObject()` internally when creating a new document.

First, Mongoose now caches which schema paths have transforms.
Before, even if your schema had no transforms, `toObject()` would still scan every path in your schema to check for transforms.
In the common case where a schema has no transforms, `toObject()` sees that the list of transforms is `null` and skips the entire transform check.
Checking for `null` is also slightly faster than checking if an array has `length === 0`.

Similarly, applying getters now skips paths that do not have getters before checking whether the path is selected by caching which paths have getters.
Mongoose no longer needs to scan every path in your schema to check for getters.
This improvement is even more significant when working with complex projections.
In Mongoose 9.8, Mongoose would scan every path in your schema _and check whether the path was included in the projection_, which could be O(n*p) where `n` is the number of paths in your schema and `p` is the number of paths in the projection.
Mongoose 9.9 avoids checking whether the path is included in the projection for paths that do not have getters - if your schema still has a lot of getters, like if you use global getters to automatically convert ObjectIds to strings, you would see less of a performance improvement.

## Timestamp updates only add `createdAt` for upserts

When applying timestamps to an update, Mongoose needs to set `updatedAt` on every update.
However, `$setOnInsert` is guaranteed to be ignored if `upsert` is not set, so setting `createdAt` in `$setOnInsert` without upsert is a waste of memory and bandwidth.
Mongoose 9.9 now avoids adding `$setOnInsert.createdAt` to ordinary updates:

```javascript
const userSchema = new mongoose.Schema({ name: String }, { timestamps: true });
const User = mongoose.model('User', userSchema);

// No longer sets `createdAt` in `$setOnInsert`
await User.updateOne(
  { name: 'John' },
  { $set: { name: 'John Smith' } }
);

// Only add `createdAt` to `$setOnInsert` if `upsert: true` is set
await User.updateOne(
  { name: 'John' },
  { $set: { name: 'John Smith' } },
  { upsert: true }
);
```

This produces an update with `updatedAt`, but does not add a `createdAt` value that can never be used by the non-upsert operation. For an upsert, Mongoose still adds `createdAt` to `$setOnInsert` as expected.

## Moving On

Mongoose 9.9 features widespread performance improvements that will help most Mongoose apps run a little bit faster.
The changes we made are all fairly small, but they add up to a noticeable performance boost in `insertMany()` and document serialization, particularly in documents with no nested paths.

As always, if you are upgrading a production application, run your existing test suite and test it out for yourself.
The benchmarks in this release are intentionally simple; schemas with nested documents, custom validators, middleware, getters, and transforms will have different performance characteristics.

Install Mongoose 9.9 and try it out for yourself!

```bash
npm install mongoose@9.9
```
