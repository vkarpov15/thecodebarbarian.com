The [redux-saga](https://www.npmjs.com/package/redux-saga) module is a plugin for [redux](https://www.npmjs.com/package/redux) that runs [generator-based](http://thecodebarbarian.com/3-common-co-design-patterns) functions in response to redux actions. Redux-saga generator functions are nice because they behave like [co](http://npmjs.com/package/co): if you `yield` a promise, redux-saga will unwrap the promise for you and throw a catchable error if the promise rejects. If you read [The 80/20 Guide to ES2015 Generators](http://es2015generators.com/), a [simple saga](https://www.npmjs.com/package/redux-saga#sagasjs) should look familiar. However, [redux-saga intends to keep using generators](https://github.com/redux-saga/redux-saga/issues/1373) rather than async/await. In this article, I'll provide a basic example of using redux-saga, explain why redux-saga can't move to async/await, and consider whether you even need redux-saga in the first place.

Introducing Redux-Saga
----------------------

Redux-saga's goal is to provide a mechanism for orchestrating complex
async operations with Redux. In many ways, redux-saga is an alternative
to [redux-thunk](http://thecodebarbarian.com/async-await-with-react-and-redux-thunk.html), but redux-saga provides more functionality and a
different syntax. For example, suppose you wanted to load some data
from the [GitHub API](https://developer.github.com/v3/). Below is
a standalone Node.js example of using redux-saga to `fetch()` data from
the GitHub API and put it in a redux store.

```javascript
const fetch = require('node-fetch');
const { createStore, applyMiddleware } = require('redux');
const { call, put, takeLatest } = require('redux-saga/effects');
const util = require('util');

const sagaMiddleware = require('redux-saga').default();
const store = createStore(reducer, applyMiddleware(sagaMiddleware));

sagaMiddleware.run(initSagas);

store.dispatch({ type: 'FETCH_USER', name: 'vkarpov15' });

// A _saga_ is a generator function that yields promises or redux-saga
// objects like the return value of `put()`
function* saga(action) {
  try {
    // If `fetch()` fails, redux-saga will throw a catchable error
    let user = yield fetch(`https://api.github.com/users/${action.name}`);
    user = yield user.json();
    // `put()` is redux-saga's wrapper around `store.dispatch()`
    yield put({ type: 'FETCH_USER_SUCCESS', user });
  } catch (error) {
    yield put({ type: 'FETCH_USER_ERROR', error });
  }
}

// You need to map your sagas to action types. This function will
// ensure that `saga` runs every time a `FETCH_USER` action comes
// in, but only one `FETCH_USER` action can run at a time
function* initSagas() {
  yield takeLatest('FETCH_USER', saga);
}

function reducer(state = {}, action) {
  // Prints:
  // "Action { type: '@@redux/INIT6.j.8.1.9' }"
  // "Action { type: 'FETCH_USER', name: 'vkarpov15' }"
  // "Action { type: 'FETCH_USER_SUCCESS', user: [Object] }"
  console.log('Action', util.inspect(action, { colors: true, depth: 0 }));
  switch (action.type) {
    case 'FETCH_USER_SUCCESS': return Object.assign({}, state, action);
    case 'FETCH_USER_ERROR': return Object.assign({}, state, action);
  }
  return state;
}
```

The `saga()` generator function looks a lot like [async/await](https://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html#return-values-and-exceptions), modulo some minor
differences like `yield` on `put()`. This syntax may seem strange,
but it has some powerful benefits. For example, `takeLatest()`
ensures that only the latest `FETCH_USER` action runs through to
completion, even if you dispatch two nearly simultaneous `FETCH_USER`
actions.

```javascript
store.dispatch({ type: 'FETCH_USER', name: 'vkarpov15', id: 1 });
// Redux-saga's `takeLatest` is smart enough to "cancel" the first FETCH_USER
// action and only execute this one. You'll only get one 'FETCH_USER_SUCCESS'
// action with `id = 2`
setImmediate(() => store.dispatch({ type: 'FETCH_USER', name: 'vkarpov15', id: 2 }));

function* saga(action) {
  try {
    let user = yield fetch(`https://api.github.com/users/${action.name}`);
    user = yield user.json();
    yield put({ type: 'FETCH_USER_SUCCESS', user, id: action.id });
  } catch (error) {
    yield put({ type: 'FETCH_USER_ERROR', error, id: action.id });
  }
}

function* initSagas() {
  yield takeLatest('FETCH_USER', saga);
}

function reducer(state = {}, action) {
  // Prints:
  // "Action { type: '@@redux/INIT6.j.8.1.9' }"
  // "Action { type: 'FETCH_USER', name: 'vkarpov15', id: 1 }"
  // "Action { type: 'FETCH_USER', name: 'vkarpov15', id: 2 }"
  // "Action { type: 'FETCH_USER_SUCCESS', user: [Object], id: 2 }"
  console.log('Action', util.inspect(action, { colors: true, depth: 0 }));
  switch (action.type) {
    case 'FETCH_USER_SUCCESS': return Object.assign({}, state, action);
    case 'FETCH_USER_ERROR': return Object.assign({}, state, action);
  }
  return state;
}
```

No Async/Await?
---------------

While async/await and generators are similar, the fact remains that
generators are considerably more powerful for advanced users.
You can transpile async/await into generators, but you can't do
the reverse. As a [userland library](http://thecodebarbarian.com/the-difference-between-async-await-and-generators#the-benefits-of-userland-libraries), redux-saga can
handle asynchronous behavior in ways that async/await doesn't.


The `takeLatest()` behavior is an example of something that you
can't do with async/await: you can't abort an async function once
it has started unless the async function errors or returns.
Because redux-saga uses generators, it is responsible for calling
[`generator.next()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator/next) to continue the function after the function yields. So cancellation is easy:
just add an early return and don't call `generator.next()` as
shown below.

```javascript
const fetch = require('node-fetch');
const util = require('util');

// Prints:
// "{ type: 'FETCH_USER_SUCCESS', user: [Object], id: 2 }"
const put = action => console.log(util.inspect(action, { colors: true, depth: 0 }));

function* saga(action) {
  try {
    let user = yield fetch(`https://api.github.com/users/${action.name}`);
    user = yield user.json();
    yield put({ type: 'FETCH_USER_SUCCESS', user, id: action.id });
  } catch (error) {
    yield put({ type: 'FETCH_USER_ERROR', error, id: action.id });
  }
}

function* saga(action) {
  try {
    let user = yield fetch(`https://api.github.com/users/${action.name}`);
    user = yield user.json();
    yield put({ type: 'FETCH_USER_SUCCESS', user, id: action.id });
  } catch (error) {
    yield put({ type: 'FETCH_USER_ERROR', error, id: action.id });
  }
}

// Toy example of how you can make a generator cancellable
const cancellable = function(generator) {
  let cancelled = false;
  next();

  function next(v) {
    // Was `cancel()` called? If so, don't go on to the next step
    if (cancelled) {
      return;
    }
    // Otherwise, go through to the next step and check for promises
    const { value, done } = generator.next(v);
    if (done) {
      return;
    }
    if (value != null && typeof value.then === 'function') {
      return value.then(
        res => next(res),
        err => generator.throw(err)
      );
    }
    next(value);
  }

  return { cancel: () => cancelled = true };
};

const call1 = cancellable(saga({ name: 'vkarpov15', id: 1 }));

setImmediate(() => {
  cancellable(saga({ name: 'vkarpov15', id: 2 }));
  // This will cancel the first action while the `fetch()` is in flight,
  // so it will never dispatch a 'FETCH_USER_SUCCESS' action
  call1.cancel();
});
```

Do You Need Redux-Saga?
-----------------------

There's certainly advantages to `takeLatest()`, particularly if you
have a good reason to want to avoid more than one action of a given
type from taking place at the same time. However, is there a practical
advantage to taking the latest instance of an action and cancelling
previous ones rather than just taking the first one? I can't think
of any use cases other than autocompletes.

If you just want to ensure only one instance of a given action runs
at any one time, you can write your own [redux middleware](https://www.codementor.io/vkarpov/beginner-s-guide-to-redux-middleware-du107uyud) to handle it.

```javascript
const fetch = require('node-fetch');
const { createStore, applyMiddleware } = require('redux');
const util = require('util');

const inflight = {};
const dedupeMiddleware = store => next => action => {
  if (action.payload == null || action.payload.constructor.name !== 'AsyncFunction') {
    // If `action.payload` isn't a function, we can't really cancel this action, and
    // if this function isn't async then assume it is sync
    return next(action);
  }
  if (inflight[action.type]) {
    // Ignore if there's an action with this type already in progress
    return;
  }

  inflight[action.type] = true;
  action.payload(action).then(
    () => { inflight[action.type] = false; },
    () => { inflight[action.type] = false; }
  );
  next(action);
};

const store = createStore(reducer, applyMiddleware(dedupeMiddleware));

store.dispatch({ type: 'FETCH_USER', name: 'vkarpov15', id: 1, payload: fetchUser });
setImmediate(() => store.dispatch({ type: 'FETCH_USER', name: 'vkarpov15', id: 2, payload: fetchUser }));

async function fetchUser({ name, id }) {
  try {
    let user = await fetch(`https://api.github.com/users/${name}`);
    user = await user.json();
    store.dispatch({ type: 'FETCH_USER_SUCCESS', user, id });
  } catch (error) {
    store.dispatch({ type: 'FETCH_USER_ERROR', error, id });
  }
}

function reducer(state = {}, action) {
  // Prints:
  // "Action { type: '@@redux/INITy.d.z.l.g' }"
  // "Action { type: 'FETCH_USER', name: 'vkarpov15', id: 1, payload: [AsyncFunction: fetchUser] }"
  // "Action { type: 'FETCH_USER_SUCCESS', user: [Object], id: 1 }"
  // 2nd action is ignored!
  console.log('Action', util.inspect(action, { colors: true, depth: 0 }));
  switch (action.type) {
    case 'FETCH_USER_SUCCESS': return Object.assign({}, state, action);
    case 'FETCH_USER_ERROR': return Object.assign({}, state, action);
  }
  return state;
}
```

Moving On
---------

Redux-saga is a very interesting library and it does a good job of
highlighting where you might want to use generators instead of async/await. In general, I don't see much benefit to using redux-saga
over plain old async/await, but the ability to cancel in-flight
sagas automatically is pretty cool.

_Want to learn how to identify whether your favorite npm modules work with
async/await without cobbling together contradictory answers from Google and Stack Overflow? Chapter 4 of
my new ebook, Mastering Async/Await, explains the basic principles for determining whether frameworks like [React](https://reactjs.org/) and [Socket.IO](https://www.npmjs.com/package/socket.io) support async/await. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net"><img src="/images/asyncawait.png"/></a>
