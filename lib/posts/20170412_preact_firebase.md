[Firebase](https://firebase.google.com/) is a great tool for getting data from a server to a client. Firebase handles caching, retries, socket management, and all the other unpleasant details of getting data to a client with spotty internet connection. In particular, Firebase is excellent for mobile web and mobile apps. In this article, I'll walk you through using Firebase with [Preact](http://npmjs.org/package/preact), a lightweight React alternative, to build a [simple app with server-side rendering](https://github.com/vkarpov15/pushups).

Setting Up The App
------------------

Here's the [pushups app on GitHub](https://github.com/vkarpov15/pushups). The general idea is that you assign pushups to people when they're late for meetings and then mark your pushup assignments as complete. Here's a quick video:

<iframe width="630" height="355" src="https://www.useloom.com/embed/83f7f32e777f4859bc5b1e21613198fa" frameborder="0" allowfullscreen></iframe>

To set up a Firebase project for this app, follow [Firebase onboarding](https://firebase.google.com) and create a new project. Clone the [GitHub repo](https://github.com/vkarpov15/pushups) and copy the project's web config (from Authentication -> Web Setup) into `firebaseConfig.js`. Your `firebaseConfig.js` should then look like:

```javascript
module.exports = {
  apiKey: /* ... */,
  authDomain: /* ... */,
  databaseURL: /* ... */,
  projectId: /* ... */,
  storageBucket: /* ... */,
  messagingSenderId: /* ... */
};
```

You should then be able to run `npm start` and run the app.

How the App Works
-----------------

There's 3 meaningful files in this project:

* [`index.js`](https://github.com/vkarpov15/pushups/blob/master/index.js) is the server
* [`firebase.js`](https://github.com/vkarpov15/pushups/blob/master/firebase.js) is the isomorphic firebase database. At least it should be isomorphic, [I still haven't figured out how to get non-`firebase-admin` connections to not hang in Node.js](https://github.com/firebase/quickstart-nodejs/issues/15)
* [`client.jsx`](https://github.com/vkarpov15/pushups/blob/master/client.jsx) is the Preact component.

The `firebase.js` file is the simplest, it configures firebase and exposes a firebase database handle:

<img src="http://i.imgur.com/aqQiE1Y.png">

The client-side app in `client.jsx` is a single Preact component called `App`. Once transpiled and browserify-ied, the `typeof window` logic will let the app run when included with a `<script>` tag. The `lastChild` bit tells Preact to replace the server-side rendered `App` component that the server will insert into the body. I got this pattern from [this JSFiddle](https://jsfiddle.net/developit/2vgozmvc/).

<img src="http://i.imgur.com/2AAvx2Y.png">

There's two data models that this app cares about. The `people` property tracks the total number of pushups each person owes, and the `timeline` property tracks each individual pushup assignment so the user can complete them. When the component mounts, the component starts listening to Firebase for changes:

<img src="http://i.imgur.com/voDEmUj.png">

There's one more subtlety with the `App` component. In Preact, the `render()` function [takes 2 parameters](https://www.npmjs.com/package/preact#components), the component `props` and the `state`. In the browser, the `App` component will track its internal state using `state` and `setState()`, much like [React sans Redux](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367). However, the server-side rendering tool I used for this project passes state via `props`, so `render()` should handle both.

<img src="http://i.imgur.com/iqMNTpu.png">

Server-Side Rendering
---------------------

Great, so now that we've built a rudimentary client-side app that listens to Firebase. How do you get the server to render the app? The [preact-render-to-string](https://www.npmjs.com/package/preact-render-to-string) npm module can render Preact markup to a string:

<img src="http://i.imgur.com/xt04m26.png">

The first parameter to preact-render-to-string's `render()` function is a Preact virtual DOM element (e.g. `preact.h`) and the second parameter is props to pass to that element. These props will get passed to the `App` component's `render()` function as the first parameter. Once you've rendered the component to HTML, all you need to add some surrounding HTML boilerplate:

<img src="http://i.imgur.com/Ky8Uy1R.png">

The last step is getting the actual data from Firebase, so we can render real data on the server. Unfortunately, I haven't been able to figure out how to get the Firebase web client working in Node.js. There's the [firebase-admin](https://www.npmjs.com/package/firebase-admin) module, but that module comes with its own complexities, so in this case I found the easiest solution to be [Firebase's REST API](https://www.npmjs.com/package/firebase-admin). Two simple HTTP requests using [superagent](https://www.npmjs.com/package/superagent) and the app has all the data it needs for initial render.

<img src="http://i.imgur.com/R45QQds.png">

And that's a wrap! Server-side rendering sounds intimidating, but all you need to do is load the correct data and render the right HTML. With Preact, preact-render-to-string, and the `lastChild` trick rendering the HTML is straightforward. Loading the correct data is the hard part, but if you [structure your firebase data correctly](https://firebase.google.com/docs/database/web/structure-data) you can load the data with one or more calls to Firebase's REST API (or using the realtime connection, if you can figure out how to make that work in Node.js).

*Got JavaScript fatigue? Your diet might be every bit as responsible as Firebase's lackluster documentation. I just bought [Dave Asprey the Bulletproof Coffee Guy's new book "Head Strong"](https://www.amazon.com/gp/product/0062652419/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=0062652419&linkCode=as2&tag=codebarbarian-20&linkId=2a8014f07c615bb17e5e3056a31e6baa) to learn more about how I can optimize my diet and environment for maximum productivity.*
