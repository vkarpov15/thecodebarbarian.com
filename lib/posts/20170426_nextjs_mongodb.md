[Next.js](https://github.com/zeit/next.js/) is a powerful framework for building server-side rendered applications. Next.js is just a wrapper around [React](http://npmjs.org/package/react), but it abstracts away all the ugly bits of React: build systems, transpilation, routing, CSS, etc. Most importantly, it makes server-side rendering with React dead simple, no need to carefully structure your code for use with [preact-render-to-string](https://www.npmjs.com/package/preact-render-to-string) or figure out the [`lastChild` pattern for replacing the server-side rendered component with the client-side rendered component](http://thecodebarbarian.com/server-side-rendering-with-preact-and-firebase.html). In this article, I'll show you how to build a basic Next.js app with server-side rendering on top of an Express and MongoDB API.

Introducing the App
-------------------

The app is a simple reading list, here's the [GitHub repo](https://github.com/vkarpov15/reading-list). There's a list of books in MongoDB, and you can add/remove books from the list. Here's a quick video demo:

<iframe width="630" height="355" src="https://www.useloom.com/embed/992212569715435696845a0cba5bdbbf" frameborder="0" allowfullscreen></iframe>

Here's what the data looks like in MongoDB. Each book is a document in the `Book` collection, and has a title, author, and `createdAt` timestamp.

```
$ mongo test
MongoDB shell version v3.4.1
connecting to: mongodb://127.0.0.1:27017/test
MongoDB server version: 3.4.1
> db.Book.find().pretty()
{
	"_id" : ObjectId("5900e3a30294b115c21cdd05"),
	"author" : "Valeri Karpov",
	"title" : "Professional AngularJS",
	"createdAt" : ISODate("2017-04-26T18:14:17.276Z")
}
>
```

The key to server-side rendering is being able to load the initial data necessary to render the page on both the client and the server. In order to load the initial data on the server side you need to execute a query against MongoDB, and to load the initial data on the client side you need to hit an API. So to start a Next.js app, you need a [`index.js` file](https://github.com/vkarpov15/reading-list/blob/master/index.js) that creates an express app configured to handle Next.js.

```javascript
const { MongoClient } = require('mongodb')
const api = require('./lib/api')
const body = require('body-parser')
const co = require('co')
const express = require('express')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const MONGO_URL = 'mongodb://localhost:27017/test'
const PORT = 3000

co(function * () {
  // Initialize the Next.js app
  yield app.prepare()

  console.log(`Connecting to ${MONGO_URL}`)
  const db = yield MongoClient.connect(MONGO_URL)

  // Configure express to expose a REST API
  const server = express()
  server.use(body.json())
  server.use((req, res, next) => {
    // Also expose the MongoDB database handle so Next.js can access it.
    req.db = db
    next()
  })
  server.use('/api', api(db))

  // Everything that isn't '/api' gets passed along to Next.js
  server.get('*', (req, res) => {
    return handle(req, res)
  })

  server.listen(PORT)
  console.log(`Listening on ${PORT}`)
}).catch(error => console.error(error.stack))
```

The Express REST API exposes 3 endpoints: an endpoint to get all books, an endpoint to insert a new book, and an endpoint do delete an existing book. I use [Archetype](https://www.npmjs.com/package/archetype-js) to handle type conversion to MongoDB ObjectIds.

```javascript
const Archetype = require('archetype-js')
const BookType = require('./book')
const { ObjectId } = require('mongodb')
const express = require('express')

module.exports = db => {
  const router = express.Router()

  // Wrap an async function so we catch any errors that might occur
  const wrapAsync = handler => (req, res) => handler(req)
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ error: error.message }))

  // Get all books
  router.get('/', wrapAsync(async function(req) {
    return db.collection('Book').find().sort({ createdAt: -1 }).toArray()
  }))

  // Add a new book
  router.post('/', wrapAsync(async function(req) {
    const book = new BookType(req.body)
    await db.collection('Book').insertOne(book)
    return { book }
  }))

  // Delete an existing Book
  router.delete('/:id', wrapAsync(async function(req) {
    const { result } = await db.collection('Book').deleteOne({
      _id: Archetype.to(req.params.id, ObjectId)
    })
    return { result }
  }))

  return router
}
```

Integrating with Next.js
------------------------

The express app defines an entry point for your Next.js app:

```javascript
server.get('*', (req, res) => {
  return handle(req, res)
})
```

Next.js integrates server-side routing and client-side routing for you. All you need to do for routing is to put a JS file in the right place. If you put a React component in [the `pages/index.js` file](https://github.com/vkarpov15/reading-list/blob/master/pages/index.js), Next.js will render that component for you when you visit `http://localhost:3000`. To keep things simple, this reading list app has only 1 component, here's a high level view of this component.

<img src="http://i.imgur.com/qsjqMLc.png" />

The component's state has 2 properties, the current `list` of books and the current state of the author and title input fields in `formData`. When this component is initially rendered, the `list` will come in from the component's `props`. But, once the `list` of books gets mutated, the `list` needs to be tracked by the component's state.

Where do `props` come from? Next.js adds support for a `getInitialProps()` function on components that gets the initial props for the component. The `getInitialProps()` function needs to be isomorphic, because it will be called for both server-side rendering and client-side rendering.

```javascript
export default class extends React.Component {
  static async getInitialProps ({ req }) {
    if (req) {
      // If `req` is defined, we're rendering on the server and should use
      // MongoDB directly. You could also use the REST API, but that's slow
      // and inelegant.
      const { db } = req
      // Note that `db` above comes from express middleware
      const list = await db.collection('Book').find().sort({ createdAt: -1 })
        .toArray()
      return { list }
    }

    // Otherwise, we're rendering on the client and need to use the API
    const { list } = await superagent.get('http://localhost:3000/api')
      .then(res => res.body)
    return { list }
  }

  /* ... */
}
```

Once you've written `getInitialProps()`, you're [just writing React](https://github.com/gothinkster/react-redux-realworld-example-app). You can plug in [redux](http://npmjs.org/package/redux) if you're feeling the 2015-style React or you can plug in some fancy RxJS-based solution. You can use [aphrodite](https://www.npmjs.com/package/aphrodite) or whatever other CSS toolkit for React you like. However, Next.js has its own built-in way of doing CSS using the `<style jsx>` tag [as demonstrated here](https://github.com/vkarpov15/reading-list/blob/5f5d2d034789c56205376713ed1a2a96d17bdcb7/pages/index.js#L118-L156), which works for most basic use cases. Next.js also [scopes your CSS to each individual component](https://www.npmjs.com/package/next#css), which is so powerful.

Moving On
---------

It's been a long time since I've really been excited about a frontend framework. React itself introduced a lot of groundbreaking ideas, including making components the core unit of organization for frontend, but the actual execution on those ideas was buried by bloated build systems, the routing mess, the cumbersome server-side rendering API, and the ES5-ES6 transition. Next does a great job of building over the bad parts of React and letting you get straight to actually building the app.

_New to React? I produced a [video course on React with Redux](https://thinkster.io/tutorials/build-a-real-world-react-redux-application). Mastering the basics of React is essential to mastering Next.js. My video course is the best one I've seen in terms of avoiding the wasteful cruft of the React ecosystem and cutting straight to the essentials of how React itself works. Unfortunately I had to use Redux, but the course does a modest job of not letting Redux get too much in the way of learning React._

*After a lazy winter filled with skiing and drinking [gluhwein](https://en.wikipedia.org/wiki/Mulled_wine#Gl.C3.BChwein), I'm cutting weight for beach season. Thanks to the help of the [PAGG stack](https://www.amazon.com/gp/product/B00UG4MYJA/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=B00UG4MYJA&linkCode=as2&tag=codebarbarian-20&linkId=c5b84a25be1b24a79e97a2dd8b0003b7) ([non-affiliate link](https://www.amazon.com/Ultimate-PAGG-Stack-Hour-Ferriss/dp/B00UG4MYJA/ref=sr_1_2?ie=UTF8&qid=1493239609&sr=8-2-spons&keywords=pagg+stack&psc=1)) my abs are mostly back. Check it out if you're falling behind on your weight loss resolution.*
