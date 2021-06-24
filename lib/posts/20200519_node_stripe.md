[Stripe Elements](https://stripe.com/docs/stripe-js) make it easy to collect
a customer's credit card information securely, but what happens after that? You still need to use [Stripe's Node.js API](https://stripe.com/docs/api/authentication) to actually accept a payment from a user. In this tutorial, you'll learn how to 
build a basic full stack checkout flow with Stripe and Node.js.

Stripe Client
-------------

Stripe Elements automatically creates a secure credit card form for you by
creating an `iframe` on your page and a JavaScript API to interact with
the credit card form. This tutorial will use Vue, but here's a [guide to setting up Stripe Elements with React](/accepting-credit-cards-with-stripe-elements-and-preact.html).

Below is a simple Stripe Elements checkout form using Vue. When you submit the
form, it creates a payment token from the card and prints it to the console.
Try entering in the [Stripe test card](https://stripe.com/docs/testing) `4242 4242 4242 4242` with any CVV, expiration date, and zip code to see it in action.

<div class="inline-image">
  <div id="stripe-example-1"></div>
</div>

<script src="https://unpkg.com/vue/dist/vue.js"></script>
<script src="https://js.stripe.com/v3/"></script>
<style>
  .stripe-form-input {
    width: 50%;
    padding: 8px;
  }
</style>
<script>
const stripe = Stripe('pk_test_CY6HxyQkOolO1B3h43MvkJE5');

new Vue({
  methods: {
    submit: async function(ev) {
      ev.preventDefault();

      const res = await stripe.createToken(this._card);
      console.log('Payment token is ', res.token.id);
    }
  },
  template: `
    <form @submit="submit($event)">
      <div class="stripe-form-input">
        <div ref="stripe">
        </div>
      </div>
      <button type="submit">Submit</button>
    </form>
  `,
  mounted: function() {
    this._card = stripe.elements().create('card');
    this._card.mount(this.$refs.stripe);
  }
}).$mount('#stripe-example-1');
</script>

Below is the code for the above form. The key thing to note is that, when
the component is mounted, the below code creates a Stripe card element, and
then uses that Stripe element to pull a secure token representing the
credit card information when the user submits the form.

```javascript
const stripe = Stripe('pk_test_CY6HxyQkOolO1B3h43MvkJE5');

new Vue({
  methods: {
    submit: async function(ev) {
      ev.preventDefault();

      const res = await stripe.createToken(this._card);
      console.log('Payment token is ', res.token.id);
    }
  },
  template: `
    <form @submit="submit($event)">
      <div class="stripe-form-input">
        <div ref="stripe">
        </div>
      </div>
      <button type="submit">Submit</button>
    </form>
  `,
  mounted: function() {
    this._card = stripe.elements().create('card');
    this._card.mount(this.$refs.stripe);
  }
}).$mount('#stripe-example-1');
```

This form collects credit card information, but doesn't do anything with it.
In order to actually charge the customer, you need to call the `stripe.confirmCardPayment()` function, which requires you to create a
[secret on the server side](https://stripe.com/docs/payments/accept-a-payment#web-setup).

Creating a Server Side Secret
--------------------

In order to charge the customer, you need to create a payment intent on the
server side, and send the payment intent's _secret_ to the client. This ensures
that the customer can't change what you expect them to pay. Below is an Express
app that sends back a secret for a $2 charge.

```javascript
'use strict';

const express = require('express');
// Set your stripe private key here
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

const app = express();
app.use(express.static('./public'));

app.get('/stripeSecret', function(req, res, next) {
  const amount = 2 * 100;
  const currency = 'usd';

  stripe.paymentIntents.create({ amount, currency }).
    then(intent => res.json({ secret: intent['client_secret'] })).
    catch(next);
});

app.use(function(err, req, res, next) {
  res.status(err.status || 500).json({ message: err.message });
});

app.listen(3000);
```

In order to get the Stripe secret, your Vue payment form needs to make a
request to the `/stripeSecret` endpoint in the `mounted()` hook.

```javascript
// ...
data: () => ({ secret: null }),
mounted: async function() {
  this._card = stripe.elements().create('card');
  this._card.mount(this.$refs.stripe);
  this.secret = await axios.get('/stripeSecret').
    then(res => res.data.secret);
}
// ...
```

Once you get the `secret` and the user entered in their credit card information,
you can make a request to `stripe.confirmCardPayment()` as shown below.

```javascript
submit: async function(ev) {
  ev.preventDefault();
  const res = await stripe.confirmCardPayment(this.secret, {
    payment_method: { card: this._card }
  });
  console.log('Payment result is', res);
}
```

Below is the complete Vue component that integrates with the Stripe secret
endpoint.

```javascript
new Vue({
  data: () => ({ secret: null }),
  methods: {
    submit: async function(ev) {
      ev.preventDefault();
      const res = await stripe.confirmCardPayment(this.secret, {
        payment_method: { card: this._card }
      });
      console.log('Payment result is', res);
    }
  },
  template: `
    <form @submit="submit($event)">
      <div class="stripe-form-input">
        <div ref="stripe"></div>
      </div>
      <button type="submit">Submit</button>
    </form>
  `,
  mounted: async function() {
    this._card = stripe.elements()..create('card');
    this._card.mount(this.$refs.stripe);
    this.secret = await axios.get('/stripeSecret').
      then(res => res.data.secret);
  }
}).$mount('#stripe-example-1');
```

Moving On
---------

Stripe's APIs are very developer friendly, and building a checkout flow is
straightforward. You need a little bit of help from the server side, but
with that you can collect payments directly on your site, without redirecting
users out to PayPal.
