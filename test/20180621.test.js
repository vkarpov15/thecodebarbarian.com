'use strict';

const assert = require('assert');

const { Component, createElement } = require('react');
const { renderToString } = require('react-dom/server');

// For monkeypatched console later
const _console = console;

describe('20180621', function() {
  let logged = [];
  const console = {
    logged: [],
    log: function() {
      console.logged.push(Array.prototype.slice.call(arguments));
    }
  };

  beforeEach(function() {
    console.logged = [];
  });

  it('example 1', function() {
    const { Component, createElement } = require('react');
    const { renderToString } = require('react-dom/server');

    class MyComponent extends Component {
      async render() {
        return null;
      }
    }

    // Throws "Invariant Violation: Objects are not valid as a React child
    // (found: [object Promise])"
    assert.throws(function() {
      renderToString(createElement(MyComponent));
    }, /Objects are not valid as a React child/);
  });

  it('example 2', function() {
    class MyComponent extends Component {
      async componentWillMount() {
        this.setState({ text: 'Before' });
        await new Promise(resolve => setImmediate(resolve));
        this.setState({ text: 'After' });
      }

      render() {
        return createElement('h1', null, this.state.text);
      }
    }

    // Prints '<h1 data-reactroot="">Before</h1>'
    // Note React does **not** wait for the `componentWillMount()` promise
    // to settle.
    // Also prints "Warning: setState(...): Can only update a
    // mounting component."
    console.log(renderToString(createElement(MyComponent)));
    // acquit:ignore:start
    assert.equal(console.logged.length, 1);
    assert.equal(console.logged[0].length, 1);
    assert.ok(console.logged[0][0].includes('Before'), console.logged[0]);
    // acquit:ignore:end
  });

  it('example 3', function(done) {
    // Create a Redux store with `redux-thunk` middleware
    const { applyMiddleware, createStore } = require('redux');
    const thunk = require('redux-thunk').default;
    const reducer = (state, action) => {
      switch(action.type) {
        case 'INCREMENT': return { count: state.count + 1 };
        case 'DECREMENT': return { count: state.count - 1 };
        default:          return state;
      };
    };
    const store = createStore(reducer, { count: 0 }, applyMiddleware(thunk));

    // Create a React component that is tied to the store
    class MyComponent extends Component {
      componentWillMount() {
        this.setState(store.getState());
        store.subscribe(() => this.setState(store.getState()));
      }

      render() {
        return createElement('h1', null, `Count: ${this.state.count}`);
      }
    }

    // Dispatch an async function. The `redux-thunk` middleware handles
    // running this function.
    store.dispatch(async function(dispatch) {
      dispatch({ type: 'INCREMENT' });
      // <h1 data-reactroot="">Count: 1</h1>
      console.log(renderToString(createElement(MyComponent)));

      await new Promise(resolve => setImmediate(resolve));

      dispatch({ type: 'DECREMENT' });
      // <h1 data-reactroot="">Count: 0</h1>
      console.log(renderToString(createElement(MyComponent)));
      // acquit:ignore:start
      assert.equal(console.logged.length, 2);
      assert.equal(console.logged[0].length, 1);
      assert.ok(console.logged[0][0].includes('Count: 1'), console.logged[0][0]);

      assert.equal(console.logged[1].length, 1);
      assert.ok(console.logged[1][0].includes('Count: 0'), console.logged[1][0]);
      done();
      // acquit:ignore:end
    });
  });

  it('example 4', function(done) {
    const { applyMiddleware, createStore } = require('redux');
    const thunk = require('redux-thunk').default;
    // ...
    // acquit:ignore:start
    const reducer = (state, action) => {
      switch(action.type) {
        case 'INCREMENT': return { count: state.count + 1 };
        case 'DECREMENT': return { count: state.count - 1 };
        default:          return state;
      };
    };
    const store = createStore(reducer, { count: 0 }, applyMiddleware(thunk));

    // Create a React component that is tied to the store
    class MyComponent extends Component {
      componentWillMount() {
        this.setState(store.getState());
        store.subscribe(() => this.setState(store.getState()));
      }

      render() {
        return createElement('h1', null, `Count: ${this.state.count}`);
      }
    }
    // acquit:ignore:end

    store.dispatch(async function(dispatch) {
      dispatch({ type: 'INCREMENT' });
      // <h1 data-reactroot="">Count: 1</h1>
      console.log(renderToString(createElement(MyComponent)));

      await new Promise(resolve => setImmediate(resolve));
      // acquit:ignore:start
      process.once('unhandledRejection', err => {
        assert.equal(err.message, 'Oops!');
        done();
      });
      // acquit:ignore:end

      // Unhandled promise rejection! See
      // http://bit.ly/unhandled-promise-rejection
      throw new Error('Oops!');
    });
  });

  it('example 5', function(done) {
    const { applyMiddleware, createStore } = require('redux');
    const thunk = require('redux-thunk').default;
    const reducer = (state, action) => {
      // acquit:ignore:start
      if (action.type === 'ERROR') {
        setImmediate(() => {
          console.log(renderToString(createElement(MyComponent)));

          assert.equal(console.logged.length, 2);
          assert.equal(console.logged[0].length, 1);
          assert.ok(console.logged[0][0].includes('Count: 1'), console.logged[0][0]);

          assert.equal(console.logged[1].length, 1);
          assert.ok(console.logged[1][0].includes('Count: Oops'), console.logged[1][0]);
          done();
        });
      }
      // acquit:ignore:end
      switch(action.type) {
        case 'INCREMENT': return { count: state.count + 1 };
        case 'DECREMENT': return { count: state.count - 1 };
        case 'ERROR':     return { count: action.error.message };
        default:          return state;
      };
    };
    // ...
    // acquit:ignore:start
    const store = createStore(reducer, { count: 0 }, applyMiddleware(thunk));

    // Create a React component that is tied to the store
    class MyComponent extends Component {
      componentWillMount() {
        this.setState(store.getState());
        store.subscribe(() => this.setState(store.getState()));
      }

      render() {
        return createElement('h1', null, `Count: ${this.state.count}`);
      }
    }
    // acquit:ignore:end

    store.dispatch(wrap(async function(dispatch) {
      dispatch({ type: 'INCREMENT' });
      // <h1 data-reactroot="">Count: 1</h1>
      console.log(renderToString(createElement(MyComponent)));

      await new Promise(resolve => setImmediate(resolve));

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
  });
});
