[Preact](https://www.npmjs.com/package/preact) is a simplified alternative to React that focuses on bundle size. A minified bundle with Preact and a minimal [Webpack](https://webpack.js.org/) config ends up being around 10KB. A minimal unbundled React bundle ends up being around 100KB because of [react-dom](https://www.npmjs.com/package/react-dom). Because Preact bundles are comparatively tiny, Preact is a great choice for making sure your app feels snappy.

```
$ ./node_modules/.bin/webpack
Hash: a1fc672a4a8c9742be78
Version: webpack 4.23.1
Time: 1769ms
Built at: 2018-11-01 13:00:14
    Asset      Size  Chunks             Chunk Names
preact.js  9.64 KiB       0  [emitted]  preact
 react.js   109 KiB       1  [emitted]  react
Entrypoint preact = preact.js
Entrypoint react = react.js
[2] ./preact.js 33 bytes {0} [built]
[4] ./react.js 71 bytes {1} [built]
    + 8 hidden modules
```

I used the below Webpack config to get the above result.

```javascript
module.exports = {
  entry: {
    preact: './preact.js',
    react: './react.js'
  },
  target: 'web',
  output: {
    path: `${process.cwd()}/bin`,
    filename: '[name].js'
  }
};
```

Vanilla JS has gotten very good these days and you often don't need any framework, but
once you need to manage state and user input, a framework makes
things much easier. Preact is great because it doesn't add too much bloat to your
app bundle and gives you just enough of React to save you from having to manually
register event listeners on DOM events. In this article, I'll walk through
building a basic form using Preact.

Setting Up Preact
-----------------

Like React, Preact is much easier with JSX, so you'll need to install Webpack, [Babel](https://www.npmjs.com/package/@babel/core), and a [Babel transform for JSX](https://www.npmjs.com/package/@babel/plugin-transform-react-jsx). You should
also install a static HTTP server like [serve](https://www.npmjs.com/package/serve).

```
npm install preact babel-loader@8.x @babel/core@7.x @babel/plugin-transform-react-jsx@7.x webpack@4.x webpack-cli@3.x serve@10.x
```

This may seem like a lot to install for a simple app, but Babel and Webpack don't
end up in the end bundle, so your app size will still be small.

First, let's set up a basic `index.html` file that will serve as the entry point for the
app.

```
<html>
  <head>
    <title>Preact Test</title>
  </head>

  <body>
    <div id="content"></div>
    <script type="text/javascript" src="bin/index.js"></script>
  </body>
</html>
```

Next, let's create an `index.js` file that will render some basic JSX:

```javascript
const React = require('preact');

class App extends React.Component {
  render() {
    return <h1>Hello, World!</h1>;
  }
}

React.render(<App></App>, document.querySelector('#content'));
```

To create the `bin/index.js` bundle that `index.html` will use, we'll need Webpack:

```javascript
module.exports = {
  entry: {
    index: './index.js'
  },
  target: 'web',
  output: {
    path: `${process.cwd()}/bin`,
    filename: '[name].js'
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: {
        loader: 'babel-loader'
      }
    }]
  }
};
```

And to configure Babel, we'll need a `.babelrc` file as well:

```
{
  "plugins": ["@babel/plugin-transform-react-jsx"]
}
```

To compile, run `./node_modules/.bin/webpack`

```
$ ./node_modules/.bin/webpack
Hash: a4ff19ba7c622174cb97
Version: webpack 4.23.1
Time: 578ms
Built at: 2018-11-01 13:20:32
   Asset      Size  Chunks             Chunk Names
index.js  9.85 KiB       0  [emitted]  index
Entrypoint index = index.js
[0] ./index.js 288 bytes {0} [built]
    + 1 hidden module
```

Finally, run `serve` using `./node_modules/.bin/serve` and visit `http://localhost:5000`. You should see "Hello, World" show up.

## A Basic Form

Forms in Preact are much easier with the [linkstate](https://www.npmjs.com/package/linkstate)
module, which was split off from core Preact. The linkstate module is tiny relative to Preact
itself, so don't worry about it adding bloat.

```
npm install linkstate@1.x
```

Like [in React](https://stackoverflow.com/questions/52531081/how-to-use-componentdidmount-to-render-values-to-form-in-react), the standard pattern for a form with [controlled inputs](https://reactjs.org/docs/forms.html) in Preact is:

1) Load form data in `componentDidMount()`
2) Display the inputs with the input value bound to `state` and update `state` when the user modifies the form
3) Call a `save()` function when the user submits the form

In the interest of making this form a bit more realistic, I'll put the form behind a `setTimeout()`. When you're building an actual app, you will likely be loading this data via an HTTP request in `componentDidMount()`. To avoid having to set up an actual HTTP server, this example will use `setTimeout()` instead.

```javascript
componentDidMount() {
  this.setState({ loading: true });

  setTimeout(() => {
    this.setState({ loading: false, firstName: 'Foo', lastName: 'Bar' });
  }, 100);
}
```

Next, let's take a look at the `render()` function. Preact `render()` functions
are slightly different than React's in that they take 2 params: `props` and `state`.
For this example, `props` doesn't matter, but `state` contains the component state.

```javascript
render(props, state) {
  if (state.loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <div>
        <h3>First Name</h3>
        // linkstate updates `state.firstName` every time the user types in
        // this input
        <input type="text" value={state.firstName} onInput={linkstate(this, 'firstName')} />
      </div>
      <div>
        <h3>Last Name</h3>
        <input type="text" value={state.lastName} onInput={linkstate(this, 'lastName')} />
      </div>

      <div>
        <br/>
        <input type="button" value="Submit" onClick={this.save()} />
      </div>
    </div>
  );
}
```

Why is `linkstate` useful? Take a look at the `save()` function below. This is
because JavaScript functions lose context when they're assigned to a value. If
`save()` didn't return a function and you just used `onClick={this.save}`, `this`
would be undefined in the `save()` function. You would instead need to do `this.save.bind(this)`, but [`bind()` is slow](https://stackoverflow.com/questions/18895305/will-function-prototype-bind-always-be-slow).

```javascript
save() {
  return () => console.log(this.state.firstName, this.state.lastName);
}
```

## A Form Component

In practice, your form will usually not be responsible for loading its own data.
You'll likely have a top-level component that loads the data, and then several
different components underneath that allow the user to modify different parts of
the data.

Having a separate form component is tricky because the top-level component will
pass in the initial state of the data as `props`. The form component will then
store any modifications as `state` internally.

But, when the user submits the form, you'll send an HTTP request to the server
and then the top-level component will get back new data from the server. The
form component then needs to be able to react to the new `props`. The way to
handle this in Preact is the [`componentWillReceiveProps()` hook](https://preactjs.com/guide/api-reference).

```javascript
class Form extends React.Component {
  componentDidMount() {
    this.setState(Object.assign({}, this.state, this.props));
  }

  componentWillReceiveProps(nextProps) {
    // Will get called when the component is already mounted, but `props`
    // changed.
    this.setState(Object.assign({}, this.state, nextProps));
  }

  render(props, state) {
    return (
      <div>
        <div>
          <h3>First Name</h3>
          <input type="text" value={state.firstName} onInput={linkstate(this, 'firstName')} />
        </div>
        <div>
          <h3>Last Name</h3>
          <input type="text" value={state.lastName} onInput={linkstate(this, 'lastName')} />
        </div>

        <div>
          <br/>
          // Assume `props` contains a `save()` function in the interest of
          // not adding something like Redux to this relatively simple example.
          <input type="button" value="Submit" onClick={() => props.save(state)} />
        </div>
      </div>
    );
  }
}
```

Below is the updated `save()` and `render()` for the top-level `App` component.
The big change here is that the `App` component passes the `save()` function
to the `Form` component as a prop. This is to avoid having to add
[Redux](http://npmjs.com/package/redux) or something similar to this simple example.
In practice you probably should just use a Redux store.

```javascript
save(data) {
  console.log(data.firstName, data.lastName);
  setTimeout(() => {
    this.setState(Object.assign({}, data));
  }, 100);
}

render(props, state) {
  if (state.loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <Form
        firstName={this.state.firstName}
        lastName={this.state.lastName}
        save={data => this.save(data)} />
    </div>
  );
}
```

All in all, the total page weight is 12KB without any gzipping. Not bad!

<img class="inline-image" src="https://i.imgur.com/lifNj6B.png">

## Moving On

Preact is a great library for when you want to build a simple form without adding 100KB+ to your total [page weight](https://deviceatlas.com/blog/understanding-web-page-weight). Vanilla JS is great for display-only pages, but starts getting cumbersome once you need to handle some non-trivial user input. Next time you want to use React but feel like it is too heavy, give Preact a shot.
