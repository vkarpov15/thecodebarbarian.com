[pkg](https://www.npmjs.com/package/pkg) is [Zeit](http://thecodebarbarian.com/building-a-nextjs-app-with-mongodb.html)'s (the company behind [Next.js](http://thecodebarbarian.com/building-a-nextjs-app-with-mongodb.html)) new tool for bundling Node.js projects into standalone binary executables. A standalone executable has numerous advantages: as long as you're on a compatible OS, you can run the executable without installing Node.js, docker, or any other runtime. You can ship your executable to a vanilla EC2 instance and run it without any extra setup, no need to maintain [AMIs](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html) or use [Packer](https://www.packer.io/intro/). You can also [cross-compile](https://www.npmjs.com/package/pkg#targets) with pkg, so you can build an OSX-compatible executable on your Linux box and vice-versa. In other words, pkg gives you the best parts of [Golang](https://dave.cheney.net/2015/08/22/cross-compilation-with-go-1-5) in Node.js.

pkg is far from the first tool to do standalone executables for node. I've used [lone](https://www.npmjs.com/package/lone) with solid results since 2014, however, lone's docs and functionality are limited in scope compared to pkg's. Plus, the Zeit team has built a track record for producing elegant and well-documented products, so I'm eager to give pkg a short as an alternative to my current least favorite everyday dev tool: [Docker](https://www.docker.com/).

Compiling an Express API
------------------------

You can find [the Express app with pkg-based build system on GitHub](https://github.com/vkarpov15/pkgtest). The `src` directory contains a rudimentary Express app that uses [async/await](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html), so this project needs Node.js 7.6.0. The `src/index.js` file exports a function that takes `config` as a parameter, connects to the MongoDB instance that `config` specifies, and starts an API server on the port that `config` specifies.

<a href="http://i.imgur.com/8fVDeUK.png"><img src="http://i.imgur.com/8fVDeUK.png"></a>

The Express API is identical to the one from my [Next.js reading list app](http://thecodebarbarian.com/building-a-nextjs-app-with-mongodb.html). It exposes 3 endpoints, one for getting a list of books, one for adding a new book, and one for deleting a book, using [archetype](http://npmjs.org/package/archetype-js) for lightweight data validation.

<a href="http://i.imgur.com/BE4Mf32.png"><img src="http://i.imgur.com/BE4Mf32.png"></a>

The actual Express API is structured so it is easy to bootstrap with multiple configs, **without** relying on environment variables. I'm wary of using environment variables in Node.js because, like all global state, it can have nasty and unintended side effects. Express itself has several places where it switches behavior based on the `NODE_ENV` environment variable, and [the effects are only documented under "advanced usage"](https://expressjs.com/en/advanced/best-practice-performance.html#set-nodeenv-to-production). If you're an advanced Express user you can work around this, but if you're a casual user of a library built on top of Express, you can be in for a nasty surprise. And that's not counting the other node modules: the trivial `pkgtest` app has 31 instances of `NODE_ENV` in its `node_modules` directory according to `grep -r "NODE_ENV" node_modules/* | wc -l`, and I have no idea what the vast majority of them are.

<a href="http://i.imgur.com/nBIf5S9.png"><img src="http://i.imgur.com/nBIf5S9.png"></a>

Better for configuration to explicit rather than "surprise, I'm breaking your code in production because undocumented [best practice, duh](https://github.com/facebook/react-native/pull/7878)!"

<img src="http://i.imgur.com/kuCuFtY.png">

Bundling Express App and Config With pkg
----------------------------------------

As far as I know `pkg` doesn't support the [Node.js `-r` flag](https://nodejs.org/api/cli.html#cli_r_require_module) so to support multiple configs you need multiple entry points to your application. In this case, one for dev and one for prod, that each pull different configs. Here's the dev entrypoint:

<a href="http://i.imgur.com/KzuvIQs.png"><img src="http://i.imgur.com/KzuvIQs.png"></a>

And the prod entrypoint:

<a href="http://i.imgur.com/Fc6mWsm.png"><img src="http://i.imgur.com/Fc6mWsm.png"></a>

So to run the API with dev configs, as long as you have Node installed, all you need to do is run `node .`, or `npm start` with the help of `package.json`. To run the API with prod configs, you run `node ./.prod/app.js`. In practice, you'd store your prod configs in a separate repo so you can isolate permissions, and use `npm` to [list your API server's GitHub repo as a dependency](http://thecodebarbarian.com/github-is-my-favorite-private-npm-registry), but since this is just a quick example, I'm keeping the prod config in the same repo.

In order to use pkg to build an `app.dev` executable with the dev config and an `app` executable with the prod config, you need 2 separate `build-dev` and `build-prod` scripts that use `index.js` and `.prod/app.js` as entry points, respectively:

```javascript

{
  "name": "pkgtest",
  "version": "1.0.0",
  "description": "Rudimentary API packaged with pkg",
  "author": "Valeri Karpov <val@karpov.io>",
  "license": "ISC",
  "dependencies": {
    "archetype-js": "0.6.1",
    "body-parser": "1.17.1",
    "co": "4.6.0",
    "express": "4.15.2",
    "mongodb": "2.2.26"
  },
  "devDependencies": {
    "pkg": "3.0.1"
  },
  "scripts": {
    "build-dev": "pkg -t latest-linux-x64 -o ./app.dev ./index.js",
    "build-prod": "pkg -t latest-linux-x64 -o ./app ./.prod/app.js",
    "start": "node ."
  }
}
```

Now, when you run `npm run build-prod`, you get a single executable `app` that you can run on any compatible Linux distro, without installing Node.js or running `npm install`. It also has configs bundled, so no need for a container to isolate environment variables. Just throw the executable onto a vanilla Linux VM from EC2, Azure, DigitalOcean, or cloud provider of your choice and it all works!

Also, building with pkg is relatively fast and produces a 38 MB executable. Nothing to write home about, but certainly better than docker's famously slow builds and minimum ~643MB for the officially supported Node.js image.

```
$ time npm run build-prod

> pkgtest@1.0.0 build-prod
> pkg -t latest-linux-x64 -o ./app ./.prod/app.js


real	0m3.466s
user	0m2.938s
sys	0m0.506s
$ ls -al | grep "app"
-rwxrwxr-x   1 val val 38674432 May  3 16:16 app
$
```

Moving On
---------

I'm not switching wholesale off of Docker for all my prod use cases anytime soon, but I like what I see so far with pkg. At the very least, I'm eager to start using it for dev use cases, because I'm not nearly good enough with Docker to teach junior devs how to use it well. Pkg even has support for [bundling assets](https://github.com/zeit/pkg#config), so instead of sharing a docker container with MongoDB, I can use tools like [mongodb-version-manager](https://www.npmjs.com/package/mongodb-topology-manager) to send standalone executables that start and manage MongoDB replica sets and sharded clusters with no configuration. Give pkg a shot and see what new ideas you can come up with!

_As you saw in this blog post, async/await is powerful, but [limited to Node.js >= 7.6.0](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html). If you're stuck using Node.js 4.x or 6.x because of LTS (especially since [Node.js 8 is delayed](https://github.com/nodejs/CTC/issues/99)), you can still use similar patterns with ES6 generators and [co](http://npmjs.org/package/co). If you're looking for a much deeper dive into co, including how to write your own co replacement from scratch, check out my ebook, [The 80/20 Guide to ES2015 Generators](http://es2015generators.com/)_

<a href="http://es2015generators.com"><img width="200" src="http://i.imgur.com/iBT2ZEw.png"/></a>
