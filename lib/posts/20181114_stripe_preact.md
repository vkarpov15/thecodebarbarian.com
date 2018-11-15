Stripe's v3 API introduced a controversial change: you can no longer use Stripe with custom payment forms, you [must use the new Stripe Elements interface](https://github.com/stripe/react-stripe-elements/issues/19). This change is brutal from a developer experience perspective, because you need to figure out how to rewrite your app to use the new API, and the [existing docs](https://stripe.com/docs) are written for vanilla JavaScript. There is a [React library](https://www.npmjs.com/package/react-stripe-elements), but it is [heavy](https://github.com/stripe/react-stripe-elements/issues/19#issue-233402236) and there's no information as to whether it actually works with [Preact](http://npmjs.com/package/preact). In this article, I'll present a basic proof of concept of using the vanilla Stripe Elements library and Preact.

Setting Up Preact and Stripe Elements
-------------------------------------

Preact bundles might be lightweight, but the dev setup certainly isn't. To get started, you'll need to install Preact itself, Webpack as a compiler, Babel to transform JSX, and [serve](https://www.npmjs.com/package/serve) to start an HTTP server.

```
npm install preact babel-loader@8.x @babel/core@7.x @babel/plugin-transform-react-jsx@7.x webpack@4.x webpack-cli@3.x serve@10.x
```

Next, let's set up a basic `index.html` that loads the Stripe.js file. [Stripe suggests that you load the client-side `stripe.js` library via `script` tag](https://stripe.com/docs/stripe-js/elements/quickstart#setup) rather than via `require()`.

```
<html>
  <head>
    <title>Preact/Stripe Test</title>

    <script src="https://js.stripe.com/v3/"></script>
    <style>
      #content {
        width: 300px;
        padding: 10px;
        border: 1px solid #e3e3e3;
      }
    </style>
  </head>

  <body>
    <div id="content">
      <div id="cc-form"></div>
      <input type="submit" value="Submit" />
    </div>

    <script src="bin/index.js"></script>
  </body>
</html>
```

Now, let's create a basic `index.js` file that will set up Stripe Elements. For now, this file won't use Preact at all, it'll be a proof of concept for getting a payment token from a Stripe Element.

```javascript
const { h, Component } = require('preact');

const stripe = Stripe('pk_test_CY6HxyQkOolO1B3h43MvkJE5');
const elements = stripe.elements();

const card = elements.create('card');
card.mount('#cc-form'); // The `cc-form` div from `index.html`

// Stripe Elements only collects the credit card info, you still need to support
// a "submit" button
document.querySelector('input[type="submit"]').addEventListener('click', () => {
  stripe.createToken(card).
    then(res => {
      const el = document.createElement('div');
      el.innerHTML = res.error ? `Error: ${res.error.message}` : `Token: ${res.token.id}`;
      document.querySelector('body').append(el);
    }).
    catch(err => console.log('Unexpected error', err.message));
});
```

Next, let's add a `webpack.config.js` to bundle `index.jsx` into `bin/index.js`:

```javascript
module.exports = {
  entry: {
    index: './index.jsx'
  },
  target: 'web',
  output: {
    path: `${process.cwd()}/bin`,
    filename: '[name].js'
  },
  module: {
    rules: [{
      test: /\.jsx$/,
      use: {
        loader: 'babel-loader'
      }
    }]
  }
};
```

Let's also add a `.babelrc` file to tell Babel to use the JSX loader:

```
{
  "plugins": ["@babel/plugin-transform-react-jsx"]
}
```

Run `./node_modules/.bin/webpack` to compile, and then visit `http://localhost:5000` and you should be able to enter in payment info. Just use one of the fake credit cards from [Stripe's list of test cards](https://stripe.com/docs/testing#cards).

<div style="position: relative; padding-bottom: 62.5%; height: 0;"><iframe src="https://www.useloom.com/embed/4c5b634b9139483db4dece654765685b" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

Integrating Preact with Stripe Elements
---------------------------------------

The key to making a Preact component that works with Stripe Elements is to create a component that mounts the Stripe element when the component mounts, and then [never updates](https://github.com/developit/preact#components). The `shouldComponentUpdate` lifecycle hook lets you make sure the component never updates, so you can mount the Stripe element in `componentDidMount()` without any problems.

```javascript
class StripeElement extends React.Component {
  render() {
    return <div id="cc-form"></div>;
  }

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    card.mount('#cc-form');
  }
}
```

The downside of this approach is that the ID is hard coded, so you can't do multiple `StripeElement` components on one page. You can easily work around this with a counter, but that's outside the scope of this article.

Now that you have a `StripeElement` component that sets up a Stripe Element to accept credit cards, here's the main `App` component that actually uses the `StripeElement` component and displays the results:

```javascript
const React = require('preact');

const stripe = Stripe('pk_test_CY6HxyQkOolO1B3h43MvkJE5');
const elements = stripe.elements();
const card = elements.create('card');

class App extends React.Component {
  componentWillMount() {
    this.responses = [];
    this.setState({ responses: [] });
  }

  onSubmit() {
    stripe.createToken(card).
      then(res => {
        this.responses.push(res.error ? `Error: ${res.error.message}` : `Token: ${res.token.id}`);
        this.setState({ responses: this.responses.slice() });
      }).
      catch(err => {
        this.responses.push(err.message);
        this.setState({ responses: this.responses.slice() });
      });
  }

  render() {
    return (
      <div>
        <StripeElement />
        <input type="submit" onClick={() => this.onSubmit()} />
        {
          this.state.responses.map(res => <div>{res}</div>)
        }
      </div>
    );
  }
}
```

Here's the video of entering in a fake card number with the new Preact component:

<div style="position: relative; padding-bottom: 62.5%; height: 0;"><iframe src="https://www.useloom.com/embed/497ee069b35f402c9a0b6676a3406266" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

Moving On
---------

You often don't need [heavy binding libraries](https://github.com/stripe/react-stripe-elements) if you're building an app that needs to integrate with a library whose API assumes vanilla JS. A component that never re-renders and instantiates the library in `componentDidMount()` is often enough to get a vanilla JS library to work with [Preact](http://npmjs.com/package/preact) or even [React](https://reactjs.org/docs/react-component.html#shouldcomponentupdate). Next time you want to Google for an officially supported React component for library X, consider writing a simple one yourself.
