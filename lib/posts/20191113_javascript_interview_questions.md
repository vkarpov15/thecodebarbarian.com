Over the last 7 years I've interviewed about 100 candidates for various JavaScript
roles, ranging from standard React/Angular/Vue frontend roles to database driver
development to full stack logistics optimization. Most of the JavaScript
interviewing guides out there [overemphasize topics that are nice to learn but rarely matter in practice](https://medium.com/javascript-scene/10-interview-questions-every-javascript-developer-should-know-6fa6bdf5ad95), like prototypical inheritance and functional programming. Here's the 3 questions that
I usually use:

The Standard Junior Frontend Test
---------------------------------

My first priority when considering a hire is whether they can code. If
I'm hiring someone as a JavaScript developer, I want to know they can
write JavaScript, not just talk about writing JavaScript. These interview
questions are usually a follow-up to a code test.

There are two reasons why I
do coding interviews even after doing a code test. First, you can find an answer
for most questions online, and it's harder to Google your way through a short
in-person interview. Second, I want to see the candidate's thought process and
see how they work their way through a problem. Seeing the final product of their
work can only tell you so much.

In my experience, as a frontend developer, you need to be able to load data
from a REST-ish API and render it. Seems pretty basic, but you'd be surprised
how many developers struggle with it. Here's the problem prompt I put on 
[collabedit](http://collabedit.com/):

```javascript
/**
 * Alpha Vantage exposes an API endpoint that lets you get the current price
 * of a stock. For example, if you make the below request, you get the current
 * price of Microsoft stock (MSFT).
 *
 * GET https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=MSFT&apikey=demo
 *
 * The response looks like `sampleResult` below.
 *
 * Implement a component `StockPriceComponent` that displays the current price
 * of a stock passed in to the component as `props.symbol`.
 *
 * You may use whatever HTTP client you prefer - fetch, Axios, etc. You should
 * not use Redux for the purposes of this exercise.
 */

import React from 'react';

class StockPriceComponent extends React.Component {

}
 
const sampleResult = {
  "Global Quote": {
    "01. symbol": "MSFT",
    "02. open": "139.3900",
    "03. high": "140.4200",
    "04. low": "138.6700",
    "05. price": "139.7850",
    "06. volume": "28338704",
    "07. latest trading day": "2019-10-24",
    "08. previous close": "137.2400",
    "09. change": "2.5450",
    "10. change percent": "1.8544%"
  }
};
```

TLDR; given a stock symbol like 'MSFT' or 'AAPL', write a React component that
pings a REST API and displays the current price. React is a placeholder -
I've asked the same question with Vue and Angular.

The API data is a little ugly, but that's part of the test. Tasks like
accessing nested properties and properties with '.' in the name happen in
practice.

Here's a basic solution in React using [Axios](https://masteringjs.io/tutorials/vue/axios).

```javascript
const React = require('react');
const axios = require('axios');

class StockPriceComponent extends React.Component {
  constructor() {
    super();
    this.state = { status: 'LOADING' };
  }

  componentDidMount() {
    const symbol = this.props.symbol;
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=demo`;

    axios.get(url).
      then(res => this.setState({
        error: null,
        status: 'DONE',
        price: res.data['Global Quote']['05. price']
      })).
      catch(err => this.setState({
        error: err.message,
        status: 'ERROR',
        price: 'N/A'
      }));
  }

  render() {
    if (this.state.status === 'ERROR') {
      return (<h1>Error: {this.state.error}</h1>);
    } else if (this.state.status === 'DONE') {
      return (<h1>Price: {this.state.price}</h1>);
    } else {
      return (<h1>Loading...</h1>);
    }
  }
}
```

Depending on how well the candidate did, there's several follow up questions:

- Error handling. How did the candidate surface errors? If using React, do they know about error boundaries?
- Cleaning up resources. Suppose instead of displaying the price once, you want to ping the API every 5 seconds to update the price. How do you ensure the component cleans up after itself when it unmounts?
- React hooks. How would this code look if written with hooks?
- Promises. What happens if the response body changes? How would you rewrite this using Suspense?

The Async/Reactive Programming Test
-----------------------------------

Frontend framework tests are handy, but for full stack or backend devs I usually
prefer to go into more detail about async, promises, and [reactive vs imperative](https://www.getrevue.co/profile/masteringjs/issues/reactive-vs-imperative-programming-193784) rather than getting lost in the minutiae of frontend frameworks. Here's the prompt:

```javascript
/**
 * A Node.js readable stream (https://nodejs.org/api/stream.html#stream_readable_streams)
 * can be thought of as an event emitter that emits 3 events:
 *
 * - 'data' when a new chunk of data is available, `stream.on('data', chunk => {})`
 * - 'error' when an error occurred, `stream.on('error', err => {})`
 * - 'end' when the stream has successfully completed, `stream.on('end', () => {})`
 *
 * You may assume that the `chunk` passed to the 'data' event handler is a string.
 *
 * Write a function `streamToPromise()` that, given a stream, returns an ES6
 * promise that resolves to the concatenation of all chunks emitted in 'data'
 * if the stream successfully completes, or rejects with the error emitted
 * in 'error' if there was one.
 */

function streamToPromise(stream) {
  return Promise.reject(new Error('not implemented'));
}
```

TLDR; given a simplified stream (no backpressure, etc.), return a promise that fulfills with the concatenation of all 'data' events emitted by the stream.

One thing I love about this question is that I've had to write this code dozens
of times. There's always some odd npm module like [ftp](https://www.npmjs.com/package/ftp) that insists on only providing a stream-based API when I really only want a promise-based API. Naturally, this wouldn't work for large files, but it works fine for the small CSV files that I use ftp to download. You can hear more about that on [my latest appearance on the JavaScript Jabber podcast](https://devchat.tv/js-jabber/jsj-399-debugging-with-async08-with-valeri-karpov/).

Here's the solution:

```javascript
function streamToPromise(stream) {
  return new Promise((resolve, reject) => {
    let res = '';
    stream.on('data', data => { res += data; });
    stream.on('error', err => reject(err));
    stream.on('end', () => resolve(res));
  });
}
```

There isn't much code to write, but a lot of thought and understanding goes into
writing this. The only potentially tricky bit of syntax is remembering what
the `Promise` constructor looks like. But the most common cause of confusion
when working through this question is reactive programming: you can easily
tell the interviewer's JavaScript is rusty when they start writing a `while()`
loop to try to exhaust the stream imperatively.

Here's a few follow-up questions that illustrate some of the details:

- Suppose you have a malformed stream that emits an 'error' event after an 'end' event. What happens to the promise?
- Is it possible for the above function to miss a 'data' event?
- Can you [process  a stream imperatively](https://thecodebarbarian.com/3-common-co-design-patterns#processing-a-stream)? Why is doing so a bad idea?

The Node + MongoDB Test
-----------------------

Dealing with data that's too big to fit in memory is a common task in Node.
In my experience data usually fits into memory, hence the `streamToPromise()` 
exercise, but even if you're not working with a huge data set, you'll likely
see code that's designed to handle huge data sets. This exercise is about
[iterating through a MongoDB cursor](https://thecodebarbarian.com/cursors-in-mongoose-45).

```javascript
/**
 * A MongoDB cursor can be thought of as an object that exposes a single
 * function `next()`. The `next()` function returns a promise that resolves
 * to the next document in the query result, or `null` if there are no
 * more documents.
 * 
 * Suppose you have a collection of stock holding documents in MongoDB
 * that look like this:
 * 
 * { symbol: 'AAPL', shares: 10, userId: 123 }
 * 
 * Given a `cursor` over this collection, write a function that calculates
 * the average value of a user's portfolio.
 * 
 * You may assume the `getPrice()` function asynchronously calculates the
 * current price of a given stock symbol.
 */

const getPrice = require('./getPrice');

async function calculateAveragePortfolio(cursor) {
}
```

TLDR; given a collection of stock holdings that do **not** include the current
price, calculate the average value of a user's holdings.

At a high level, this looks a lot like the React `StockPriceComponent` question,
but geared towards backend. Depending on the candidate's experience, I may
ask them to implement `getPrice()` as well. Here's a few concepts this exercise
tests:

- Collecting unique values
- Basic caching of requests
- Comfort level with promises and async/await. Can the candidate actually iterate a cursor with async/await?

Below is the solution:

```javascript
const getPrice = require('./getPrice');

async function calculateAveragePortfolio(cursor) {
  const prices = {};
  const userIds = new Set();
  let totalValue = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    let price = 0;
    if (prices.hasOwnProperty(doc.symbol)) {
      price = prices[doc.symbol];
    } else {
      price = await getPrice(doc.symbol);
      prices[doc.symbol] = price;
    }

    userIds.add(doc.userId);
    totalValue += doc.shares * price;
  }

  // Optimization: no need to calculate the size of each individual user's
  // portfolio if all you need is the average. You just need the sum of all
  // the portfolio sizes and the number of users.
  return totalValue / userIds.size;
}
```

Here's some follow-up questions:

- Why wouldn't you use a stream for this? What happens when you try to do async operations like `getPrice()` in a stream?
- What about [async iterators](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js)?
- [`in` vs `hasOwnProperty()`](https://masteringjs.io/tutorials/fundamentals/hasownproperty)

Moving On
---------

Interviewing is a [touchy subject](https://thecodebarbarian.com/i-dont-want-to-hire-you-if-you-cant-reverse-a-binary-tree#comment-2637578523). These are the questions that I've used to screen JavaScript developers for the 
last several years. Take them with a grain of salt - I guarantee you that other 
people use different interview questions. However, I think these interview
questions best capture the skills that I've found most valuable in my own
day-to-day work. Feel free to try them out, whether you're an interviewer
looking for inspiration for your own questions or an interviewee looking for
practice problems.