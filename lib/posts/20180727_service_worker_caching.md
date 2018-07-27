[Service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) are a versatile API used for numerous exciting new browser features, from [pre-fetching resources](https://googlechrome.github.io/samples/service-worker/prefetch/) to [push notifications](http://thecodebarbarian.com/sending-web-push-notifications-from-node-js). One interesting feature is the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache), which lets you store
assets on the client's machine and intercept requests for these assets to load
them from cache instead. Using the Cache API, you can make your site usable
when your user doesn't have internet access, as long as you cache the right assets.
In this article, I'll walk through creating a service worker that makes the [Mongoose schema docs](http://mongoosejs.com/docs/guide.html)
available offline.

Setting Up
----------

First, [here's a raw HTML version of the Mongoose schema docs](https://s3.amazonaws.com/valeri-karpov-test/guide.html) that has been
tweaked to use absolute paths so it appears normally in your browser when you
have internet access. Set up a static web server locally on port 5000 (I recommend [`npm install serve@9.4.0`](https://www.npmjs.com/package/serve) ), you should see the below
page when you visit `http://localhost:5000/guide`.

<img class="inline-image" src="https://i.imgur.com/5EkX0h1.png">

The Mongoose docs site is lean relative to your average site, which is [bigger than the original _Doom_ video game](https://www.wired.com/2016/04/average-webpage-now-size-original-doom/).
However, in order to render properly it still needs some fonts, CSS files, and
images. For the Mongoose docs, the JS files are non-essential, they just handle
ads and analytics.

<img class="inline-image" src="https://i.imgur.com/dzYT9fX.png">

If you turn on the "Offline" checkbox in the Chrome Network tab, the page will
no longer render. With service workers, you can make this page render perfectly,
even in offline mode.

Creating a Service Worker
-------------------------

Service workers are scoped to a domain, so in this case you need to register
a service worker for `localhost:5000`. You can only register service workers
on what [Chrome considers "secure domains"](https://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features). For the benefit of developers, 'localhost' is considered
secure, but any `http://` domain is not. To use service workers in production,
you **must** use HTTPS.

Let's create a `sw.js` file that prints out "Hello, World!" and put it in
the top level of the directory the static server uses, so you can access your service worker from `http://localhost:5000/sw.js`.

```
$ curl http://localhost:5000/sw.js
console.log('Hello, World!');
$
```

Next, run `navigator.serviceWorker.register('./sw.js')` from your Chrome console.
You should see "Hello, World!" pop up.

<img class="inline-image" src="https://i.imgur.com/iW5jxVe.png">

By itself, this service worker isn't interesting because it just prints a message
when it is registered and doesn't listen to any other events. For example, if
you reload the page, the `console.log()` won't execute again.

Service workers can intercept every outbound HTTP request from your page.
Change your `sw.js` file to the below to print out every single HTTP request
that the browser makes when rendering `guide.html`.

```javascript
self.addEventListener('fetch', function(event) {
  console.log('fetch', event);
});
```

<img class="inline-image" src="https://i.imgur.com/E0fyiI4.png">

The browser retains the service worker even in offline mode, so if you turn on
the "Offline" checkbox in Chrome's network tab you'll still see your service
worker intercept the HTTP request. Using this and the Cache API, you can
serve this page offline.

<img class="inline-image" src="https://i.imgur.com/p22JQQd.png">

Caching Assets in the Service Worker
------------------------------------

The [`Cache.addAll()` function](https://developer.mozilla.org/en-US/docs/Web/API/Cache/addAll) lets you pre-fetch a bunch of assets and store them in the cache. Combined with the
[`FetchEvent.respondWith()` function](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/respondWith), you can use promise chaining to `catch()` any network requests that fail and
check to see if the asset is cached locally. Google calls this caching strategy
["Network falling back to cache"](https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook/#network-falling-back-to-cache).

```javascript
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('mycache').then(function(cache) {
      return cache.addAll([
        'http://localhost:5000/guide',
        'https://fonts.googleapis.com/css?family=Open+Sans',
        'http://mongoosejs.com/docs/css/github.css',
        'http://mongoosejs.com/docs/css/mongoose5.css',
        'https://unpkg.com/purecss@1.0.0/build/pure-min.css',
        'http://mongoosejs.com/docs/images/mongoose5_62x30_transparent.png'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  console.log('fetch', event);

  return event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request.url))
  );
});
```

With this new service worker, you should see the Mongoose schema docs show up
even in offline mode. If the [service worker doesn't update automatically](https://developers.google.com/web/fundamentals/primers/service-workers/#update-a-service-worker), you may need to force an update using `navigator.serviceWorker.getRegistration().then(reg => reg.update())`.

<img class="inline-image" src="https://i.imgur.com/RD450C6.png">

Moving On
---------

Ever start a project on an airplane and realize that you desperately
need access to docs? Service workers promise to make it much easier to access
documentation that you rely on when internet is spotty or non-existent.
If you maintain a documentation site, consider using service workers to let
your users easily access your site offline.
