In case you haven't come across Petko Petkov's post on injection attacks against MongoDB and NodeJS yet, [its definitely worth a careful read](http://blog.websecurify.com/2014/08/hacking-nodejs-and-mongodb.html). In this article, he explains a pretty simple exploit that I suspect affects a fair number of applications, including some that I've implemented.

The general idea behind Petko's exploit is that, typically, when you want to get all documents where username is equal to the user-provided username, you may do something like this:

```
User.findOne(
  { username: req.body.username },
  function(err, user) {
    // Handler code here
  });
```

However, let's say you've exposed a JSON-based API and I'm a malicious user that sends you the following body JSON:

```
{ username: { $gt: "" } }
```

The query that will get sent to MongoDB then looks like this:

```
{ username: { $gt: "" } }
```

Assuming your usernames are strings, that query will return a random user!

Even if you're using URL encoding instead of JSON for your API, you may not be safe. ExpressJS' body parser middleware, by default, uses the [qs](https://www.npmjs.org/package/qs#readme) module to parse URL-encoded HTTP request bodies. The qs module is designed to parse URL-encoded strings in a way that makes decoding objects easier, so parsing the string `username[$gt]=` gives you a nested object `{ username: { $gt: undefined } }`. This is really bad news bears.

Thankfully, query selector injection attacks are pretty easy to defend against, so no need to throw your Express JSON API out the window. Here are two strategies to make sure you're not vulnerable.

Remove keys that start with `$` from user input
------------------------

One of the cruxes of Petko's exploit is that, in the above example, MongoDB determines the query selector by scanning the `req.body.username` object for a key that matches a [query selector](http://docs.mongodb.org/manual/reference/operator/query/#query-selectors). There are two ways you can avoid this. The first, and probably most obvious, is to make sure `req.body.username` is a string rather than an object. JavaScript's `toString()` function should be sufficient:

```
var username = (req.body.username || "");
username = username.toString();
User.findOne(
  { username: username },
  function(err, user) {
    // Handler code here
  });
```

However, in some cases, you may want to query on user-provided objects, and so casting to a string isn't sufficient. Since all MongoDB query selectors start with `$`, you can check if `req.body.username` is an object, and, if so, remove any keys from the object that start with `$`. I put together a really simple npm module called [mongo-sanitize](https://www.npmjs.org/package/mongo-sanitize) (see it on [Github](https://github.com/vkarpov15/mongo-sanitize)) does this for you, in case you don't want to implement this yourself.

```
var sanitize = require('mongo-sanitize');
 
// The sanitize function will strip out any keys that start with '$' in the
// input, so you can pass it to MongoDB without worrying about malicious users
// overwriting query selectors.
var clean = sanitize(req.params.username);
 
Users.findOne({ name: clean }, function(err, doc) {
  // ...
});
```

If this approach doesn't work for you for whatever reason, don't worry, there's another way.

Explicitly specify the query selector when querying with untrusted data
-----------------------------

The other crux of Petko's exploit is that, typically, you don't specify a query selector when you want to find a document where username is exactly equal to the user input. As a matter of fact, MongoDB doesn't have a fully supported `$eq` query selector just yet (although the core server team is [working on it](https://jira.mongodb.org/browse/SERVER-14973)). In lieu of `$eq`, however, you can use the `$in` selector:

```
User.findOne(
  { username: { $in: [req.body.username] } },
  function(err, user) {
    // Handler code here
  });
```

This is slightly more verbose, but if a malicious user tried a query selector injection attack, the query passed would look like this:

```
{ username: { $in: [{ $gt: "" }] } }
```

Assuming that your usernames were all strings, this query would return no results, as expected.

Conclusion
----------

Query selector injection attacks are pretty insidious and its easy to be vulnerable, especially if you've been happily implementing JSON REST APIs. Thankfully, using one of the above principles, either by using mongo-sanitize or by explicitly specifying a query selector for untrusted data, you can avoid the query selector injection pitfall without having to give up the ease-of-use of JSON APIs. If you want more details on securing your MongoDB application, check out the [security checklist](http://docs.mongodb.org/manual/administration/security-checklist/) and MongoDB's blog post on [security design and configuration](http://blog.mongodb.org/post/86408399868/mongodb-security-part-1-design-and-configuration).
