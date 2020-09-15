I recently wrote about [building a CLI app in Node.js](/building-a-cli-tool-with-node-js.html), which showed how to
build a CLI app that sent Slack messages from Node.js. But it omitted a key detail: [how to get a Slack OAuth token](/working-with-the-slack-api-in-node-js.html). And that's a big omission, because getting auth credentials right is
typically the hardest part of working with any API. In this article, I'll describe how you can use [Express](https://masteringjs.io/express) and [open](https://www.npmjs.com/package/open) to get an OAuth token for a CLI app.

Review
------

In the [previous tutorial](/building-a-cli-tool-with-node-js.html#token-storage), I explained how to add a `login`
command to your Slack CLI that you could run using `node ./index.js login`, or as `slack-cli login` after bundling for npm.
Below is how you can implement this command using [yargs](http://npmjs.com/package/yargs):

```javascript
const Configstore = require('configstore');
const { prompt } = require('enquirer');
const yargs = require('yargs');

// `slack-cli` is the name of the file that configstore will use.
const config = new Configstore('slack-cli');

yargs.command(
  'login',
  'Set your bot token',
  () => {},
  async function handler(argv) {
    // Open an enquirer prompt to ask for the user's token
    const { token } = await prompt({
      type: 'password',
      name: 'token',
      message: 'Enter your Slack bot token:'
    });

    // Persist the token to the user's disk using configstore
    config.set({ token });
    console.log('Token stored successfully!');
  });
```

This `login` command is simple, but it puts the responsibility of [setting up a Slack app](/working-with-the-slack-api-in-node-js.html#getting-started) on your user, and setting up a Slack app is an intricate
UI-based process that is hard to automate. If you want to build a CLI tool on top of an API, you're better off using
[OAuth](/oauth-with-node-js-and-express.html).

If you use [OAuth](/github-oauth-login-with-node-js.html), you can create an app once and then, when a user logs in,
you get a token for that one Slack OAuth app.

OAuth From a CLI
----------------

The normal workflow for authorizing a Slack app is to redirect the user to `https://slack.com/oauth/authorize`.
For CLI apps, the go-to tool for opening a web browser is the [npm package `open`](https://www.npmjs.com/package/open).
For example, here's how your CLI can open Google's homepage:

```javascript
const open = require('open');

open('https://google.com');
```

In order to let your user authorize your Slack app, you need your Slack app's `clientId`, a space-delimited list of
[Slack scopes](https://api.slack.com/legacy/oauth-scopes), and a `redirectUri`. For example, here's how you can
redirect the user to the Slack OAuth page from a yargs command:

```javascript
const clientId = 'OMITTED';
const clientSecret = 'OMITTED';
const scope = encodeURIComponent('chat:write:bot channels:read chat:write:user');
const redirect = encodeURIComponent('http://localhost:3000/oauth');

yargs.command(
  'login',
  'Log in to Slack and get your token',
  () => {},
  async function handler(argv) {
    open(`https://slack.com/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirect}`);
  });
```

Here's what the result of running `node ./index.js login` with the above script looks like:

<img src="/images/slack-screenshot-2.png" class="inline-image">

Notice that `redirectUri` points to `localhost`. Remember the 3 steps of a standard web OAuth 2.0 login flow:

1. Your app client opens a dialog that displays a dialog that asks the user to authorize your app. 
2. The dialog redirects back to your app client's domain with an _auth code_ in the query string. An auth code is a short-lived code that you can exchange for a long-lived _access token_.
3. Your app pulls the `code` parameter from the query string, and makes a POST request to the authorizing app's server with the access code. The authorizing app's server verifies the access code and sends back an _access token_ your app can use for authorization going forward.

So the `redirectUri` needs to point to a web server that the CLI App has access to. This is where Node really shines:
you can plug in an Express web server into your `login` command handler, no threads or headache required.

```javascript
const clientId = 'OMITTED';
const clientSecret = 'OMITTED';
const scope = encodeURIComponent('chat:write:bot channels:read chat:write:user');
const redirect = encodeURIComponent('http://localhost:3000/oauth');

yargs.command(
  'login',
  'Log in to Slack and get your token',
  () => {},
  async function handler(argv) {
    const app = express();

    app.get('/oauth', function(req, res) {
      // Will print the OAuth auth code
      console.log(req.query.code);
      res.end('');
    });
    const server = await app.listen(3000);

    open(`https://slack.com/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirect}`);
  });
```

That handles steps (1) and (2) of OAuth login: redirecting to Slack's OAuth page, and pulling the auth code from the
query string when Slack redirects back to your app. That leaves step (3): making an HTTP POST request to Slack's API
to exchange the auth code for an access token.

To do that, your `handler()` needs to wait for the OAuth token, and then make an [HTTP POST request using Axios](https://masteringjs.io/tutorials/axios/post). Here's one way to make that work using a [deferred promise](https://www.getrevue.co/profile/masteringjs/issues/promises-and-the-deferred-antipattern-235313):

```javascript
yargs.command(
  'login',
  'Log in to Slack and get your token',
  () => {},
  async function handler(argv) {
    const app = express();

    let resolve;
    const p = new Promise((_resolve) => {
      resolve = _resolve;
    });
    app.get('/oauth', function(req, res) {
      resolve(req.query.code);
      res.end('');
    });
    const server = await app.listen(3000);

    open(`https://slack.com/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirect}`);

    // Wait for the first auth code
    const code = await p;

    // Exchange the auth code for an access token. Note that the Slack API expects a form-encoded HTTP
    // body, **not** JSON.
    const res = await axios.post('https://slack.com/api/oauth.access',
      `client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirect}`);
    const token = res.data['access_token'];

    await server.close();

    config.set({ token });

    console.log('Logged in successfully with token ' + token);
    process.exit(0);
  });
```

Security and Proxies
--------------------

Notice that the `axios.post()` request that exchanges an auth code for an access token uses the Slack app's client
secret (the `clientSecret` variable). That's why you shouldn't ship this CLI app as-is: you would need to publish your
Slack App's client secret in order to make the above CLI app work.

One alternative to avoid using your client secret in the above app is to have an API endpoint that sets the Slack secret
for you. For example, you can run the below server which takes an incoming POST request and adds a client secret to the
HTTP body:

```javascript
const axios = require('axios');
const express = require('express');

const clientSecret = encodeURIComponent('OMITTED');

const app = express();
app.use(express.raw({ type: '*/*' }));
app.post('*', (req, res) => {
  const body = req.body.toString('utf8') + '&client_secret=' + clientSecret;
  const options = {
    url: req.url,
    method: 'post',
    data: body,
    headers: req.headers
  };
  axios(options).
    then(response => res.json(response.data)).
    catch(err => res.status(response.status).json(response.data));
});

app.listen(3001);
```

You can then use the `proxy` [Axios option](https://masteringjs.io/tutorials/axios/options) to proxy your login
request through the above server. Ideally the above server should be running on a trusted machine to hide the
client secret.

```javascript
const data = `client_id=${clientId}&code=${code}&redirect_uri=${redirect}`;

// Rely on the `proxy` to set the client secret.
const res = await axios.post('https://slack.com/api/oauth.access', data, { proxy: { host: 'localhost', port: 3001 } });
const token = res.data['access_token'];
```

Moving On
---------

The basic proof of concept for OAuth login from a CLI tool is easy with Node: start an Express server and ask the
authorizing server (Slack in this case) to redirect back to `localhost`. The tricky part is that the CLI tool needs
to know the OAuth client secret in order to get the OAuth access token, which may be an unacceptable security risk
depending on who has access to your CLI tool. One alternative is [OAuth implicit flow](https://developer.okta.com/blog/2019/05/01/is-the-oauth-implicit-flow-dead). Another alternative is to keep your client secret on a trusted server and proxy
requests through it, or rely on the trusted server to serve as the `redirectUri` and make your CLI tool talk to the
trusted server.