[`JSON.stringify()`](/the-80-20-guide-to-json-stringify-in-javascript) is the canonical way to convert a JavaScript
object to JSON. Many JavaScript frameworks use `JSON.stringify()` internally, like [Express' `res.json()`](https://masteringjs.io/tutorials/express/json) and [Axios' body serialization](https://masteringjs.io/tutorials/axios/post-json). However,
by default, `JSON.stringify()` outputs minified JSON, with no whitespace or colors.

```javascript
// {"name":"Jean-Luc Picard","rank":"Captain","ship":"Enterprise D"}
JSON.stringify({ name: 'Jean-Luc Picard', rank: 'Captain', ship: 'Enterprise D' });
```

In this article, I'll explain how to make `JSON.stringify()` output more readable.

Using the `spaces` Parameter
----------------------------

The 3rd parameter to `JSON.stringify()` is called `spaces`. If spaces is not undefined, `JSON.stringify()` will put
each key on its own line, and prefix each key with `spaces`. If `spaces` is a number, that's the number of spaces `' '`
`JSON.stringify()` will put before each key.

```javascript
// {
//   "name":"Jean-Luc Picard",
//   "rank":"Captain",
//   "ship":"Enterprise D"
// }
JSON.stringify({ name: 'Jean-Luc Picard', rank: 'Captain', ship: 'Enterprise D' }, null, 2);
```

If you set `spaces` to a string, `JSON.stringify()` will use that string as a prefix. For example, here's how you
can prefix each key using tabs instead of spaces.

```javascript
/**
 * {
 *     "name": "Jean-Luc Picard",
 *     "rank": "Captain",
 *     "ship": "Enterprise D"
 * }
 */
JSON.stringify({ name: 'Jean-Luc Picard', rank: 'Captain', ship: 'Enterprise D' }, null, '\t');
```

For frameworks where you don't call `JSON.stringify()` directly, there is typically an option to set the `spaces`
parameter. For example, [Express has a global `'json spaces'` option](https://expressjs.com/en/4x/api.html#app.settings.table)
that lets you set `spaces` for all `res.json()` calls.

```javascript
const express = require('express');
const app = express();

// Make `res.json()` call `JSON.stringify()` with `spaces = 2`
app.set('json spaces', 2);

app.get('*', (req, res) => res.json({ name: 'Jean-Luc Picard', rank: 'Captain', ship: 'Enterprise D' }));
await app.listen(3000);

// Make a test request
const axios = require('axios');

const res = await axios.get('http://localhost:3000', {
  transformResponse: body => body // Disable JSON parsing so `res.data` is a string
});

// Nicely formatted JSON:
// {
//   "name": "Jean-Luc Picard",
//   "rank": "Captain",
//   "ship": "Enterprise D"
// }

console.log(res.data);
```

Axios doesn't have an [explicit option](https://masteringjs.io/tutorials/axios/options) to format JSON, but you
can use the [`transformRequest` option](https://stackoverflow.com/questions/48819885/axios-transformrequest-how-to-alter-json-payload) to handle JSON serialization yourself. This lets you format
the JSON:

```javascript
const app = express();
app.use(express.text({ type: '*/*' }));

app.post('*', (req, res) => {
  console.log(req.body);
  res.end(req.body);
});
await app.listen(3000);

// Make a test request
const axios = require('axios');

const obj = { name: 'Jean-Luc Picard', rank: 'Captain', ship: 'Enterprise D' };
const res = await axios.post('http://localhost:3000', obj, {
  transformRequest: data => JSON.stringify(data, null, 2), // Send pretty formatted JSON
  transformResponse: body => body
});

// {
//   "name": "Jean-Luc Picard",
//   "rank": "Captain",
//   "ship": "Enterprise D"
// }
console.log(res.data);
```

Using [prettyjson](https://www.npmjs.com/package/prettyjson)
----------------------------

The [prettyjson npm package](https://www.npmjs.com/package/prettyjson) is a great way to add neat color formatting
to your JSON output. Prettyjson only works on the [CLI](/building-a-cli-tool-with-node-js.html), you won't get colors
if you send prettyjson output as an HTTP response.

Below is an example of pretty printing JSON from Node.js using prettyjson:

```javascript
const prettyjson = require('prettyjson');

console.log(prettyjson.render({ name: 'Jean-Luc Picard', rank: 'Captain', ship: 'Enterprise D' }));
```

Below is what the output of the above script looks like:

<img src="/images/prettyjson.jpg" class="inline-image">

Moving On
---------

[`JSON.stringify()`](/the-80-20-guide-to-json-stringify-in-javascript) has several neat features. The `spaces` parameter,
in particular, makes formatting JSON much easier. In Node.js, you can also use a tool like prettyjson to add highlighting
for extra readability.