_This blog post originally appeared on [LogRocket's Medium publication](https://blog.logrocket.com/a-beginners-guide-to-redux-observable-c0381da8ed3a)._

[Redux-Observable](https://www.npmjs.com/package/redux-observable) is a [Redux middleware](https://www.codementor.io/vkarpov/beginner-s-guide-to-redux-middleware-du107uyud) that allows you to filter and map actions using [RxJS operators](https://www.npmjs.com/package/rxjs). RxJS operators like [`filter()`](https://www.learnrxjs.io/operators/filtering/filter.html) and [`map()`](https://www.learnrxjs.io/operators/transformation/map.html) let you transform streams of actions just like how [JavaScript's `Array.prototype.filter()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) lets you transform arrays. In this article,
I'll show you how to get started with redux-observable using scripts you can run from Node.js.

Your First Epic
---------------

In redux-observable, an ["epic"](https://redux-observable.js.org/docs/basics/Epics.html) is a function that takes a stream of actions and returns a modified stream of actions. You can think of an epic as a description of what additional actions redux-observable should dispatch. An epic is analogous to the concept of a ["saga" in redux-saga](http://thecodebarbarian.com/redux-saga-vs-async-await.html).

Before you write your first epic, you need to [install redux-observable](https://www.npmjs.com/package/redux-observable#install). This
article assumes you already have Node.js and npm installed. To install redux-observable along with [redux](https://www.npmjs.com/package/redux) and RxJS, run the below command.

```
npm install redux@4.x redux-observable@1.x rxjs@6.x
```

The most fundamental function in the redux-observable API is the [`createEpicMiddleware()` function](https://redux-observable.js.org/docs/api/createEpicMiddleware.html). This function creates the actual Redux middleware you should pass to [Redux's `applyMiddleware()` function](https://redux.js.org/api/applymiddleware). Below is an example of creating a middleware that transforms actions with type 'CLICK_INCREMENT' into actions with type 'INCREMENT'.

```javascript
const { createEpicMiddleware } = require('redux-observable');
const { filter, map } = require('rxjs/operators');
const redux = require('redux');

// An 'epic' takes a single parameter, `action$`, which is an RxJS observable
// that represents the stream of all actions going through Redux
const countEpic = action$ => action$.pipe(
  filter(action => action.type === 'CLICK_INCREMENT'),
  map(action => {
    return { type: 'INCREMENT', amount: 1 };
  })
);

const observableMiddleware = createEpicMiddleware();
const store = redux.createStore(reducer, redux.applyMiddleware(observableMiddleware));

// **Must** add the epic to the observable after calling `applyMiddleware()`.
// Otherwise you'll get a warning: "epicMiddleware.run(rootEpic) called before
// the middleware has been setup by redux. Provide the epicMiddleware instance
// to createStore() first"
observableMiddleware.run(countEpic);

// Sample Redux reducer
function reducer(state = 0, action) {
  console.log('Action', action);

  switch (action.type) {
    case 'INCREMENT':
      return state + action.amount;
    default:
      return state;
  }
}
```

Say you dispatch an action with type 'CLICK_INCREMENT' to the above store as shown
below.

```javascript
store.dispatch({ type: 'CLICK_INCREMENT' });
```

Your `filter()` and `map()` calls will run, and redux-observable will dispatch
an additional action of type 'INCREMENT'. Below is the output from the `console.log()` statement in the `reducer()` function.

```
Action { type: '@@redux/INIT7.2.m.z.p.l' }
Action { type: 'CLICK_INCREMENT' }
Action { type: 'INCREMENT', amount: 1 }
```

Note that redux-observable dispatches an additional action: the 'CLICK_INCREMENT' action still gets through to the reducer. Epics add actions to the stream by default.

Asynchronous Dispatch
---------------------

The above example serves as a simple introduction but doesn't capture why you would want to use redux-observable in the first place. What makes redux-observable so interesting is the ability to use [RxJS' `mergeMap()` function](https://www.learnrxjs.io/operators/transformation/mergemap.html) to handle asynchronous functions. In other words, redux-observable is a viable alternative to [redux-saga](http://thecodebarbarian.com/redux-saga-vs-async-await.html) and [redux-thunk](http://thecodebarbarian.com/async-await-with-react-and-redux-thunk.html). Below is an example of using redux-observable with a simple [async function](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js.html).

```javascript
const { createEpicMiddleware } = require('redux-observable');
const { filter, mergeMap } = require('rxjs/operators');
const redux = require('redux');

const startTime = Date.now();

const countEpic = action$ => action$.pipe(
  filter(action => action.type === 'CLICK_INCREMENT'),
  // `mergeMap()` supports functions that return promises, as well as observables
  mergeMap(async (action) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { type: 'INCREMENT', amount: 1 };
  })
);

const observableMiddleware = createEpicMiddleware();
const store = redux.createStore(reducer, redux.applyMiddleware(observableMiddleware));

observableMiddleware.run(countEpic);

// Sample Redux reducer
function reducer(state = 0, action) {
  console.log(`+${Date.now() - startTime}ms`, action);

  switch (action.type) {
    case 'INCREMENT':
      return state + action.amount;
    default:
      return state;
  }
}

store.dispatch({ type: 'CLICK_INCREMENT' });
```

The `countEpic()` will now wait about 1 second before dispatching the 'INCREMENT' action.

```
+1ms { type: '@@redux/INIT7.i.8.v.i.t' }
+7ms { type: 'CLICK_INCREMENT' }
+1012ms { type: 'INCREMENT', amount: 1 }
```

If you've read [_Mastering Async/Await_](http://thecodebarbarian.com/new-ebook-mastering-async-await), you know that this isn't the whole story with supporting async/await. What happens if your async function errors out? The below `countEpic()` will crash.

```javascript
const countEpic = action$ => action$.pipe(
  filter(action => action.type === 'CLICK_INCREMENT'),
  mergeMap(async () => {
    throw new Error('Oops!');
  })
);
```

To handle errors, you should always put an [RxJS `catchError()`](https://www.learnrxjs.io/operators/error_handling/catch.html) at the end of your epic as shown below.

```javascript
const { createEpicMiddleware } = require('redux-observable');
const { catchError, filter, mergeMap } = require('rxjs/operators');
const redux = require('redux');

const startTime = Date.now();

const countEpic = action$ => action$.pipe(
  filter(action => action.type === 'CLICK_INCREMENT'),
  mergeMap(async () => {
    throw new Error('Oops!');
  }),
  catchError(err => Promise.resolve({ type: 'Error', message: err.message }))
);
```

The `countEpic()` will now dispatch an action of type 'ERROR' with the error message.

```
+1ms { type: '@@redux/INIT0.a.g.q.3.o' }
+6ms { type: 'CLICK_INCREMENT' }
+8ms { type: 'Error', message: 'Oops!' }
```

Making an HTTP Request
----------------------

The above examples are simple but not very realistic. Let's use redux-observable for a more realistic use case: making an
HTTP request using [node-fetch](https://www.npmjs.com/package/node-fetch) to get the current MongoDB stock price from the [IEX API](https://iextrading.com/developer/). To get the stock price, you need to make a GET request to the following URL.

```
https://api.iextrading.com/1.0/stock/MDB/price
```

Since you can use async/await with `mergeMap()`, making an HTTP request with redux-observable is similar to the asynchronous dispatch example. [Node-fetch returns a promise](https://www.npmjs.com/package/node-fetch#usage), so you can `await` on an
HTTP request and then dispatch a new action with the result of the request.

In the below code, `fetchEpic()` fires off a GET request to the IEX API every time an action of type 'FETCH_STOCK_PRICE'
comes through the system. If the request succeeds, `fetchEpic()` dispatches a new action of type 'FETCH_STOCK_PRICE_SUCCESS'
with the stock price.

```javascript
const fetch = require('node-fetch');

// ...

const fetchEpic = action$ => action$.pipe(
  filter(action => action.type === 'FETCH_STOCK_PRICE'),
  mergeMap(async (action) => {
    const url = `https://api.iextrading.com/1.0/stock/${action.symbol}/price`;
    const price = await fetch(url).then(res => res.text());
    return Object.assign({}, action, { type: 'FETCH_STOCK_PRICE_SUCCESS', price });
  }),
  catchError(err => Promise.resolve({ type: 'FETCH_STOCK_PRICE_ERROR', message: err.message }))
);
```

To glue `fetchEpic()` to Redux, the below reducer stores a map `prices` that maps stock symbols to prices. To store the
stock price of MongoDB in Redux, the below reducer listens for actions of type 'FETCH_STOCK_PRICE_SUCCESS', not 'FETCH_STOCK_PRICE'.

```javascript
// Sample Redux reducer
function reducer(state = { prices: {} }, action) {
  console.log(`+${Date.now() - startTime}ms`, action);

  switch (action.type) {
    case 'FETCH_STOCK_PRICE_SUCCESS':
      const prices = Object.assign({}, state.prices, { [action.symbol]: action.price });
      state = Object.assign({}, state, { prices });
      console.log('New state', state);
      return state;
    default:
      return state;
  }
}

store.dispatch({ type: 'FETCH_STOCK_PRICE', symbol: 'MDB' });
```

Below is the sample output from running a 'FETCH_STOCK_PRICE' action through a Redux store with `fetchEpic()` and `reducer()`. The 'FETCH_STOCK_PRICE' action goes through, `fetchEpic()` sees this action and sends off an HTTP request.
When `fetchEpic()` gets a response from the IEX API, it sends out a 'FETCH_STOCK_PRICE_SUCCESS' action, and then the reducer
updates the state.

```
+1ms { type: '@@redux/INITg.3.m.s.8.f.i' }
+5ms { type: 'FETCH_STOCK_PRICE', symbol: 'MDB' }
+198ms { type: 'FETCH_STOCK_PRICE_SUCCESS',
  symbol: 'MDB',
  price: '79.94' }
New state { prices: { MDB: '79.94' } }
```

Moving On
---------

Redux-observable is a tool for handling [async logic with React and Redux](http://thecodebarbarian.com/async-await-with-react-and-redux-thunk.html).
This is important because React doesn't generally support async functions. Redux-observable is an interesting alternative to redux-saga and redux-thunk, particularly if you're already experienced with RxJS. So next time you find
yourself wanting to [write your own promise middleware](https://www.codementor.io/vkarpov/beginner-s-guide-to-redux-middleware-du107uyud), give redux-observable a shot.
