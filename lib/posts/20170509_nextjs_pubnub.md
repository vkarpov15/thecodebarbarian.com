I've been looking at [PubNub](https://www.pubnub.com/docs/web-javascript/pubnub-javascript-sdk) as a potential alternative to [Firebase](https://github.com/firebase/quickstart-nodejs) for push notifications. At a high level, PubNub is pubsub-as-a-service: once you plug in PubNub's JavaScript library, you can start publishing messages and subscribing to channels without having to deploy [Kafka](https://kafka.apache.org/), [ZeroMQ](http://zeromq.org/), etc.

Like Firebase, PubNub handles client-side socket connections for you, so your client apps don't have to worry about retrying failed HTTP requests and maintaining connection state. Unlike Firebase's realtime database, PubNub does not maintain state for you. If you subscribe to a channel after a message is sent, you will not get that message (modulo [PubNub's replay](https://www.pubnub.com/docs/nodejs-javascript/storage-and-history)), whereas in Firebase you can always get the last state.

In this article, I'll walk you through a small realtime chat app I built with PubNub and [Next.js](http://npmjs.org/package/next). You can find the chat app on [GitHub](https://github.com/vkarpov15/pubnub-next-chat), below is a demo video:

<iframe width="630" height="355" src="https://www.useloom.com/embed/6764b8af3f774b6bb82fa8f80244bb8c" frameborder="0" allowfullscreen></iframe>

Setting Up PubNub
-----------------

Creating a PubNub instance is simple. There are 2 keys: a `publishKey` and a `subscribeKey`. The `publishKey` gives you permission to publish to channels,
and the `subscribeKey` gives you permission to subscribe to channels. PubNub has
[more sophisticated security settings](https://www.pubnub.com/docs/web-javascript/pam-security), but these two keys are sufficient for this example.

```javascript
const PubNub = require('pubnub');

const { publishKey, subscribeKey } = require('./config');
const pubnub = new PubNub({ publishKey, subscribeKey });
```

The above code works well on both the client and the server. Note that I used `require()` above. If you're using ES6 imports, you need to do `import pubnub from 'pubnub';`, `import * as PubNub from 'pubnub';` will **not** work.

The `pubnub` object above has 2 methods you'll be concerned with in this article, `publish()` and `subscribe()`. The `publish()` method lets you send a message to a channel:

```javascript
const message = {
  client: 'Brian K.',
  content: 'Hello, World!'
};
// Send a JSON object to the 'messages' channel
pubnub.publish({
  channel: 'messages',
  message
});
```

The `subscribe()` method lets you register a callback that will be called every time a message is received on a given channel:

```javascript
// Now subscribed to the 'messages' channel
pubnub.subscribe({
  channels: ['messages']
});

pubnub.addListener({
  // PubNub calls this function every time a message comes in on _any_ channel
  // you have subscribed to.
  message: ({ message }) => {
    // Prints "Brian K.: Hello, World!"
    console.log(`${message.client}: ${message.content}`);
  }
});
```

The above code is fully isomorphic, so your server can `publish()` a message and any client that called `subscribe()` on that channel will receive it. Communicating between client and server becomes very easy when you don't have to worry about failed HTTP requests and potentially disconnected sockets!

Integrating With Next.js
------------------------

Here's how I set up the server-side code that handles serving up the client-side Next.js app:

```javascript
const body = require('body-parser');
const express = require('express');
const next = require('next');

const app = next({ dev: true });
const handle = app.getRequestHandler();

const PubNub = require('pubnub');

const { port, publishKey, subscribeKey } = require('./config');
const pubnub = new PubNub({ publishKey, subscribeKey });

async function start() {
  await app.prepare();

  const server = express();
  const messages = [];

  server.use(body.json());
  server.use((req, res, next) => {
    req.state = { messages };
    next();
  });

  server.get('/message', /* get a list of messages */);

  server.post('/message/:client', /* publish a new message from a client */);

  server.get('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port);
  console.log(`Listening on ${port}`);
}

start().catch(error => console.error(error.stack));
```

There's separate REST-ish endpoints for getting a list of messages and publishing a new message. In this example, the client does **not** have permission to push to the 'messages' channel. The API sits as a layer in front of PubNub to make sure every message published is properly formatted. In this case, the validation is simple and not terribly robust:

```javascript
server.post('/message/:client', (req, res) => {
  const message = {
    client: req.params.client,
    content: req.body.message
  };
  messages.push(message);
  pubnub.publish({
    channel: 'messages',
    message
  });
  res.json({ message });
});
```

You can imagine a more sophisticated validation layer, but I'm skipping that in the interest of keeping this example lean. The Next.js app lives in a single component, [`pages/index.js`](https://github.com/vkarpov15/pubnub-next-chat/blob/master/pages/index.js):

```javascript
const PubNub = require('pubnub');
const React = require('react');
// `config` is the client config, which *only* contains the `subscribeKey`.
// To publish a new message, need to go through the POST /message API endpoint
const config = require('../config.client.json');
// HTTP client
const superagent = require('superagent');

// Random colors to represent different users
const clientColors = ['FF0B69', '1DACCC', '1195B2', 'FFEB25', 'ccbc1d'];

export default class extends React.Component {
  static async getInitialProps({ req }) {
    /* get current messages for server-side rendering */
  }

  constructor() {
    /* initialize state */
  }

  componentDidMount() {
    // When the component initializes, subscribe to the 'messages' channel
    // to get new messages.
    this.pubnub = new PubNub({
      subscribeKey: config.subscribeKey
    });

    this.pubnub.subscribe({
      channels: ['messages']
    });

    this.pubnub.addListener({
      message: ({ message }) => {
        this.setState(Object.assign({}, this.state, {
          messages: (this.state.messages || this.props.messages).concat([message])
        }));
      }
    });
  }

  componentWillUnmount() {
    this.pubnub.unsubscribe();
  }

  /* ... */

  submitMessage() {
    // Note that we do **not** update the state here. Any messages added
    // to the state must go through the PubNub handler in `componentDidMount()`
    return ev => {
      superagent.post(`/message/${this.client}`, { message: this.state.input }).
        then(() => {
          this.setState(Object.assign({}, this.state, { input: '' }));
        })
    }
  }
}
```

Conclusion
----------

PubNub looks like a great tool for pushing state changes from the server to the client. Unlike [socket.io](https://www.npmjs.com/package/socket.io), it's a hosted solution, so you don't have to worry about the nuances of scaling websocket connections. Unlike Firebase, PubNub is message based, so you don't have to worry about managing persistent state. Give it a shot next time you're looking to build push notifications into an app and let me know what you think!

*Got JavaScript fatigue? There's better ways to fight it than reaching for yet another crappy opinionated app starter. I've been experimenting with [Bulletproof's new Neuromaster supplement](https://www.amazon.com/gp/product/B06XJPN6JH/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=B06XJPN6JH&linkCode=as2&tag=codebarbarian-20&linkId=2d45c96fc830a32958564d09ef8c76f2) ([non-affiliate link](https://www.amazon.com/Bulletproof-NeuroMaster-Capsules-Brain-Derived-Neurotrophic/dp/B06XJPN6JH/ref=sr_1_1_a_it?ie=UTF8&qid=1494367527&sr=8-1&keywords=neuromaster+bulletproof)) during my work-from-home days. It's helped me stay motivated and focused even as distractions and interruptions pile up.*
