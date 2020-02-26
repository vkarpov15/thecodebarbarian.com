[Puppeteer](https://developers.google.com/web/tools/puppeteer/) is Google's official npm module for controlling Chrome from Node.js. Using Puppeteer, you can open up a Chrome browser, navigate to an arbitrary page, and interact with the page by executing arbitrary JavaScript. Here's a short list of what you can do with Puppeteer:

* [Automated testing](http://thecodebarbarian.com/testing-vue-apps-with-puppeteer-and-mocha.html)
* Automatically generate screenshots of your app on different mobile devices
* Convert single page apps to static sites
* Scrape web pages

Hello, Puppeteer
----------------

To get started with Puppeteer, first [install the npm package](https://www.npmjs.com/package/puppeteer).

```
npm install puppeteer
```

This will also download [Chromium](https://www.chromium.org/), the open source core of Chrome. If you want to save space and use your
local Chrome installation instead, you can use [puppeteer-core](https://www.npmjs.com/package/puppeteer-core).

Once you've installed Puppeteer, you can `require()` it just like
any other npm package. You can then `launch()` a browser and
navigate to the Google home page as shown below.

```javascript
const puppeteer = require('puppeteer');

run().then(() => console.log('Done')).catch(error => console.log(error));

async function run() {
  // Create a new browser. By default, the browser is headless,
  // which means it runs in the background and doesn't appear on
  // the screen. Setting `headless: false` opens up a browser
  // window so you can watch what happens.
  const browser = await puppeteer.launch({ headless: false });

  // Open a new page and navigate to google.com
  const page = await browser.newPage();
  await page.goto('https://google.com');

  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Close the browser and exit the script
  await browser.close();
}
```

Here's what the above script looks like when it is running.

<img class="inline-image" src="https://i.imgur.com/yUNM9fc.png">

Evaluating JavaScript
---------------------

Now that you can pull up the Google home page in Puppeteer, how
about using Puppeteer to search for "JavaScript" on Google and 
scraping the results?

The most common way to interact with a page in Puppeteer is using
the [page's `evaluate()` function](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageevaluatepagefunction-args). The `evaluate()` function lets
you execute an arbitrary JavaScript function in Chrome, so you
can use built-in functions like [the `querySelector()` function](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) to manipulate the page.

For example, on the Google homepage, the search input field has name 'q', so you can use the `page.evaluate()` function to target
this `input` and change its value to JavaScript.

```javascript
const puppeteer = require('puppeteer');

run().then(() => console.log('Done')).catch(error => console.log(error));

async function run() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://google.com');

  // Type "JavaScript" into the search bar
  await page.evaluate(() => {
    document.querySelector('input[name="q"]').value = 'JavaScript';
  });

  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
}
```

<img class="inline-image" src="https://i.imgur.com/1naZZzt.png">

[Puppeteer's page class inherits from Node.js' EventEmitter class](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page) and emits several useful events. For example,
there's a 'load' event when a new page is loaded. To make Google
search for 'JavaScript' and wait for the search results to load,
you should call `evaluate()` to click on the "Google Search" button, and `await` until the 'load' event is emitted.

```javascript
const puppeteer = require('puppeteer');

run().then(() => console.log('Done')).catch(error => console.log(error));

async function run() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://google.com');

  // Type "JavaScript" into the search bar
  await page.evaluate(() => {
    document.querySelector('input[name="q"]').value = 'JavaScript';
  });

  // Click on the "Google Search" button and wait for the page to load
  const waitForLoad = new Promise(resolve => page.on('load', () => resolve()));
  await page.evaluate(() => {
    document.querySelector('input[value="Google Search"]').click();
  });
  await waitForLoad;

  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
}
```

<img class="inline-image" src="https://i.imgur.com/glUhsUX.png">

Now that `page` has the search results, you need to call `evaluate()` once more to scrape the search results. The function you pass to
the `evaluate()` function, which is called the `pageFunction` parameter, can return a value. For example, the `getUrls()` function in the below script returns the contents of all the 'cite' tags on the Google search results.

```javascript
const puppeteer = require('puppeteer');

run().then(() => console.log('Done')).catch(error => console.log(error));

async function run() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://google.com');

  // Type "JavaScript" into the search bar
  await page.evaluate(() => {
    document.querySelector('input[name="q"]').value = 'JavaScript';
  });

  // Click on the "Google Search" button and wait for the page to load
  const waitForLoad = new Promise(resolve => page.on('load', () => resolve()));
  await page.evaluate(() => {
    document.querySelector('input[value="Google Search"]').click();
  });
  await waitForLoad;

  // Get all the search result URLs
  const links = await page.evaluate(function getUrls() {
    return Array.from(document.querySelectorAll('a cite').values()).
      map(el => el.innerHTML);
  });
  console.log(links);

  await new Promise(resolve => setTimeout(resolve, 5000));
  await browser.close();
}
```

<img class="inline-image" src="https://i.imgur.com/qjEfEFh.png">

Here's what the script prints:

```
[ 'www.gun.io/',
  'learn.edx.org/JavaScript',
  'learn.freecodecamp.org/',
  'https://www.javascript.com/',
  'https://www.w3schools.com/js/',
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  'https://www.whatismybrowser.com/guides/how-to-enable-javascript/internet-explorer',
  'https://support.google.com/adsense/answer/12654?hl=en',
  'https://www.quirksmode.org/js/intro.html',
  'https://www.thoughtco.com/how-hard-is-javascript-to-learn-2037676',
  'https://en.wikipedia.org/wiki/JavaScript',
  'https://www.codecademy.com/learn/introduction-to-javascript',
  'https://www.codecademy.com/catalog/language/javascript',
  'https://www.geeksforgeeks.org/javascript-tutorial/',
  'https://javascript.info/',
  'https://www.pluralsight.com/paths/javascript' ]
Done
```

Screenshots and Devices
-----------------------

Puppeteer also lets you take [png, jpg, ](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagescreenshotoptions) or [pdf](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions) screenshots of the current page. Puppeteer also lets you [`emulate()` a device](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageemulateoptions) like an iPhone by setting the viewport and [User-Agent header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent). This means you can automatically generate screenshots of what a page would look like on a given device.

For example, here's how you can take a png screenshot of what
[the Mastering JS homepage](https://masteringjs.io/) looks like on
an iPhone X. Puppeteer's `screenshot()` function returns a promise
that resolves to a [Node.js buffer](https://masteringjs.io/tutorials/node/buffer).

```javascript
const fs = require('fs');
const puppeteer = require('puppeteer');

run().then(() => console.log('Done')).catch(error => console.log(error));

async function run() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Full list of devices here:
  // https://github.com/GoogleChrome/puppeteer/blob/master/lib/DeviceDescriptors.js
  await page.emulate(puppeteer.devices['iPhone X']);

  await page.goto('https://masteringjs.io');

  // The `screenshot()` function returns a promise that resolves
  // to a buffer.
  const buf = await page.screenshot();
  fs.writeFileSync('./screenshot.png', buf);
  
  await browser.close();
}
```

Here's what the screenshot looks like:

<img class="inline-image" src="/images/masteringjs.png" style="width: 300px">

Moving On
---------

Puppeteer allows you to control Chrome from Node.js. It is a great
tool for [automated testing](/testing-vue-apps-with-puppeteer-and-mocha.html), but it has uses beyond just testing that your login page works. Screenshots help with visualization and [snapshot testing](https://kentcdodds.com/blog/effective-snapshot-testing). Puppeteer runs an actual browser, so you can use it to scrape single page apps and other dynamic content.

Now that [PhantomJS development is suspended](https://phantomjs.org/), the only alternative to Puppeteer is [Nightmare](https://www.npmjs.com/package/nightmare). However, Puppeteer can control a real Chrome browser, whereas Nightmare is limited to Electron. This makes Puppeteer the only choice for controlling a user-facing browser from Node.js.