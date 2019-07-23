[Puppeteer](https://www.npmjs.com/package/puppeteer) is a powerful automation library for Google Chrome. With [Puppeteer](/control-chrome-from-node-js-with-puppeteer.html), you can launch a Chrome browser that you have full control over from Node.js. This makes UI testing easy: your client-side app runs in a real browser, no need to worry about [the painful quirks of Jest attempting to mimic a browser in Node.js](https://mongoosejs.com/docs/jest.html). Puppeteer runs in headless mode by default, which means the Chrome window isn't visible. But you can still take screenshots in headless mode, or you can disable headless mode and watch your tests click through your app.

In this article, I'll demonstrate how to use Puppeteer to test a simple [Vue](https://vuejs.org/) app using the [Mocha test framework](https://www.npmjs.com/package/mocha).

Getting Started With Puppeteer
------------------------------

First, let's take a look at how Puppeteer works in isolation by writing a Node.js script that searches for "Vue" on `google.com`.

```javascript
const puppeteer = require('puppeteer');

run().then(() => console.log('Done')).catch(error => console.log(error));

async function run() {
  // Create a new Chromium browser. `slowMo` means Chrome waits for 250ms
  // between operations, so you can see what's happening.
  const browser = await puppeteer.launch({ headless: false, slowMo: 250 });
  const page = await browser.newPage();
  await page.goto('https://google.com');

  // Type "Vue" into the search bar
  await page.evaluate(() => {
    document.querySelector('input[name="q"]').value = 'Vue';
  });

  // Click on the "Google Search" button and wait for the page to load
  const waitForLoad = new Promise(resolve => page.on('load', () => resolve()));
  await page.evaluate(() => {
    document.querySelector('input[value="Google Search"]').click();
  });
  await waitForLoad;

  // Get the contents of the first link in the search results. Should be
  // "https://vuejs.org/"
  const firstLink = await page.evaluate(() => document.querySelector('#search link').getAttribute('href'));
  console.log(firstLink);

  await browser.close();
}
```

Here's what the script looks like while it is in progress.

<img class="inline-image" src="https://i.imgur.com/fk9CXER.png">

The [`page.evaluate()` function](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageevaluatepagefunction-args) is the function you'll use most often with Puppeteer. The `evaluate()` function lets you execute a function in Chrome, which means you can use standard vanilla JS operations like [the `querySelector()` function](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) to manipulate the page. The function parameter, known as the `pageFunction`, can also return a result, like the `firstLink` result above.

Note that the `pageFunction` runs in the browser, which means it does **not** have access to any variables in Node.js. For example, the below `page.evaluate()` will error out because `foo` is not defined in the browser. Internally, Puppeteer converts `pageFunction` to a string using [`Function#toString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/toString) before sending it to Chrome.

```javascript
const foo = 42;
// Throws "Error: Evaluation failed: ReferenceError: foo is not defined"
const res = await page.evaluate(() => foo);
```

Puppeteer, Express, and Mocha
-----------------------------

Node.js' event loop makes testing easy, because you can start an Express server and then launch a Chrome browser with Puppeteer that connects to your Express server, all without worrying about threads. You can even [start Webpack to recompile your client-side code in Mocha](https://masteringjs.io/tutorials/webpack/programmatic-watch).

Below is an example of a Mocha test that starts an Express app, and launches a Puppeteer instance that interacts with the Express app.

```javascript
const assert = require('assert');
const express = require('express');
const puppeteer = require('puppeteer');

describe('my app', function() {
  let browser;
  let page;
  let server;

  before(async function() {
    this.timeout(10000);

    // Create a simple Express server that prints "Hello, World"
    const app = express();
    app.get('*', (req, res) => res.send('Hello, World'));
    server = await app.listen(3000);

    // Launch Puppeteer and navigate to the Express server
    browser = await puppeteer.launch({ headless: false, slowMo: 500 });
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });

  after(async function() {
    // Cleanup 
    await browser.close();
    await server.close();
  });

  it('works', async function() {
    const content = await page.evaluate(() => document.body.innerHTML);
    assert.equal(content, 'Hello, World');
  });
});
```

Here's what the controlled Chrome browser looks like while the test is running:

<img class="inline-image" src="https://i.imgur.com/Vc7IGqN.png">

Setting Up a Basic Vue App
--------------------------

Below is a [minimal single page app using Vue Router](https://masteringjs.io/tutorials/vue/router). This app has two routes, one that displays "Home" and one that displays "About."

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/0d346dcb826c4a75acf1cead82571be7" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

```html
<html>
  <body>
    <script src="https://unpkg.com/vue/dist/vue.js"></script>
    <script src="https://unpkg.com/vue-router/dist/vue-router.js"></script>

    <div id="content"></div>

    <script type="text/javascript">
      const router = new VueRouter({
        routes: [
          { path: '/home', component: { template: '<h1>Home</h1>' } },
          { path: '/about', component: { template: '<h1>About Us</h1>' } }
        ]
      });

      new Vue({
        el: '#content',
        router,
        template: `
          <div>
            <div>
              <router-link to="/home">Home</router-link>
              <router-link to="/about">About Us</router-link>
            </div>
            <div id="route">
              <router-view></router-view>
            </div>
          </div>
        `
      });
    </script>
  </body>
</html>
```

Here's how you would test that clicking on "Home" displays "Home" and clicking on "About" displays "About Us" using Mocha and Puppeteer:

```javascript
const assert = require('assert');
const puppeteer = require('puppeteer');

describe('my app', function() {
  let browser;
  let page;
  let server;

  before(async function() {
    this.timeout(10000);

    // Create an Express static server that will serve up `index.html` at
    // `http://localhost:3000/index.html`
    const app = require('express')();
    app.use(require('express-static')('.'));
    server = await app.listen(3000);

    // Launch Puppeteer and navigate to the Express server
    browser = await puppeteer.launch({ headless: false, slowMo: 250 });
    page = await browser.newPage();
    await page.goto('http://localhost:3000/index.html');
  });

  it('displays the current page', async function() {
    this.timeout(10000);

    // Click on the "Home" link and make sure "Home" shows up
    await page.evaluate(() => document.querySelector('a[href="#/home"]').click());
    let content = await page.evaluate(() => document.querySelector('#route').innerHTML);
    assert.equal(content, '<h1>Home</h1>');

    // Click on the "About" link and make sure "About Us" shows up
    await page.evaluate(() => document.querySelector('a[href="#/about"]').click());
    content = await page.evaluate(() => document.querySelector('#route').innerHTML);
    assert.equal(content, '<h1>About Us</h1>');
  });
});
````

Moving On
---------

There's a lot of different testing tools out there. [Jest](https://www.npmjs.com/package/jest) lets you run tests directly in Node.js, without the actual browser. [Cypress](https://www.cypress.io/) provides you an integrated testing framework that [supports multiple browsers](https://docs.cypress.io/guides/core-concepts/launching-browsers.html#Browser-Environment). Mocha and Puppeteer is a good middle ground that lets you run tests in an actual browser with minimal outside dependencies. As a beginner or a large enterprise project, you're likely better off using Cypress, but advanced users with smaller teams can be more nimble with a Mocha/Puppeteer setup.

*Confused by Puppeteer's async/await API? My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>*

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>