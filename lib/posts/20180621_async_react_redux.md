There's a lot of [misinformation on how to use async/await with React](https://stackoverflow.com/questions/38357234/is-it-possible-to-use-async-await-in-react-js) and Redux. In general, React does **not** support async/await, but you can make it work with some caveats. In particular, `render()` cannot be async, but [React suspense](https://www.youtube.com/watch?v=v6iR3Zk4oDY) may change this. For example, the below minimal example with Node.js 8.9.4, React 16.4.1, and React-DOM 16.4.1 will throw an error.

```javascript
[require:20180621.*example 1$]
```

You can make [lifecycle methods async](https://stackoverflow.com/questions/43312223/asynchronous-call-in-componentwillmount-finishes-after-render-method), like `componentWillMount()`, in some
cases. However, async `componentWillMount()` doesn't work at all with server-side
rendering.

```javascript
[require:20180621.*example 2$]
```

Since React doesn't support async/await in general, you still need to use
a library like [redux](http://npmjs.com/package/redux) and a middleware tool
like [redux-thunk](https://www.npmjs.com/package/redux-thunk) to handle
async/await.
There are alternatives like [redux-saga](https://www.npmjs.com/package/redux-saga) which I'll cover in
another article.

Introducing Redux-Thunk
-----------------------

The [redux-thunk](https://www.npmjs.com/package/redux-thunk) framework is a [Redux middleware](https://www.codementor.io/vkarpov/beginner-s-guide-to-redux-middleware-du107uyud) that lets you dispatch a function which may or may not be async.
The function takes a single parameter, a function `dispatch()`, which lets
you dispatch actions. This function is called an _action creator_.
Below is an example of dispatching actions from an async action creator
using `redux-thunk`.

```javascript
[require:20180621.*example 3$]
```

Side note: `redux-thunk` has nothing to do with the [normal definition of a thunk](https://github.com/thunks/thunks#what-is-a-thunk) as "a function that takes a single parameter, a `callback`". When working with React, a thunk is
typically [any function that encapsulates logic that will be run later](https://www.npmjs.com/package/redux-thunk#whats-a-thunk), which is not
a very useful definition. Broadly, React's definition of a thunk is a superset
of the conventional JavaScript definition of a thunk.

What happens if your async thunk throws an error? Turns out [`redux-thunk` has no built-in error handling](https://github.com/reduxjs/redux-thunk/issues/81),
so you'll get an [unhandled promise rejection](http://thecodebarbarian.com/unhandled-promise-rejections-in-node.js.html).

```javascript
[require:20180621.*example 4$]
```

In other words, `redux-thunk` doesn't support async/await any more than
React itself does. However, since `redux-thunk` accepts a function rather than
relying on classes, you can create a `wrap()` function that ensures you
`dispatch()` an error event if your async thunk errors out. This is the same
pattern you need to use for handling async functions with [Express](http://thecodebarbarian.com/using-async-await-with-mocha-express-and-mongoose#express).

```javascript
[require:20180621.*example 5$]
```

Next, let's take a look at an example of using a wrapper function with a
more realistic React setup.

Running in the Browser
----------------------

The previous examples are all minimal code samples designed to run in vanilla
Node.js. They're meant to illustrate key points without unnecessary bloat.
But, of course, the vast majority of React apps run in the browser, use JSX,
and hook up Redux using [`react-redux`](https://www.npmjs.com/package/react-redux).

First, install all the minimal tooling you need to compile and run a React app,
as well as React and Redux themselves.

```
$ npm install babel-loader babel-preset-react webpack webpack-cli serve --save
$ npm install react react-dom redux-thunk redux --save
```

Minimal `webpack.config.js`:

```javascript
module.exports = {
  entry: ['./index.js'],
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/i,
      use: {
          loader: 'babel-loader'
        }
    }]
  }
};
```

Minimal `.babelrc`:

```
{
  "presets": ["react"]
}
```

Minimal `index.html`:

```
<html>
  <body>
    <div id="container">
    </div>
    <script type="text/javascript" src="dist/main.js"></script>
  </body>
</html>
```

Below is the `index.js` file. This example uses `wrap()` to handle errors
in async action creators. The below example uses a long-lived action creator
that dispatches an 'INCREMENT' action after 5 seconds and then throws an
error after another 5 seconds. The `wrap()` function handles the error and
dispatches an error action.

```javascript
import React from 'react';
import { applyMiddleware, createStore } from 'redux';
import dom from 'react-dom';
import thunk from 'redux-thunk';

// Set up Redux
const reducer = (state, action) => {
  switch(action.type) {
    case 'INCREMENT': return { count: state.count + 1 };
    case 'DECREMENT': return { count: state.count - 1 };
    case 'ERROR':     return { count: action.error.message };
    default:          return state;
  };
};
const store = createStore(reducer, { count: 0 }, applyMiddleware(thunk));

// Create React component
class MyComponent extends React.Component {
  componentWillMount() {
    this.setState(store.getState());
    store.subscribe(() => this.setState(store.getState()));
  }

  render() {
    return <h1>{this.state.count}</h1>;
  }
}

// Render the React component to the DOM
dom.render(<MyComponent />, document.querySelector('#container'));

// Dispatch an action creator
store.dispatch(wrap(async function(dispatch) {
  dispatch({ type: 'INCREMENT' });

  await new Promise(resolve => setTimeout(resolve, 5000));
  dispatch({ type: 'DECREMENT' });

  await new Promise(resolve => setTimeout(resolve, 5000));
  // Caught by the `wrap()` function and becomes an action with
  // `type: 'ERROR'`
  throw new Error('Oops!');
}));

// Wrap the async function and dispatch an error if an error occurred
function wrap(fn) {
  return function(dispatch) {
    fn(dispatch).catch(error => dispatch({ type: 'ERROR', error }));
  };
}
```

Moving On
---------

Async/await is still fairly new and the React and Redux ecosystem don't have
great support for async functions yet. I'm looking forward to seeing
[React Suspense](https://www.youtube.com/watch?v=v6iR3Zk4oDY) when it is
finally released. For now, `redux-thunk` doesn't have a good solution for
handling async/await errors beyond wrapper functions or `try/catch`. This
means, as a Redux developer, the responsibility is on you to handle async
function errors.

_Want to learn how to identify whether your favorite npm modules work with
async/await without resorting to Google or Stack Overflow? Chapter 4 of
my new ebook, Mastering Async/Await, explains the basic principles for determining whether frameworks like [React](https://reactjs.org/) and [Socket.IO](https://www.npmjs.com/package/socket.io) support async/await. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net"><img src="/images/asyncawait.png"/></a>
