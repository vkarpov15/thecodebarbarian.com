In last week's blog post, I showed you how to install all of the basic tools that you need to get up and running with the MEAN Stack. Didn't catch that one and need help getting started with the MEAN Stack? You can find everything you need in [Introduction to the MEAN Stack, Part One](http://thecodebarbarian.wordpress.com/2013/07/22/introduction-to-the-mean-stack-part-one-setting-up-your-tools/).

This time we're going to take that shiny new MEAN Stack and put it to good use by building a very simple to-do list. We'll also set up a basic automated testing suite. This process will take 12 steps and you can follow along here. I will link to the diff on github for each step below as well. The `mean-stack-todo` repo started off as a direct duplicate of the `mean-stack-skeleton` repo from last week.

Over the course of this tutorial, you'll see some of the key features and concepts that make the MEAN stack such a powerful development tool. Here are a few highlights to keep in mind:

* **The MEAN stack comes with a very powerful suite of testing tools.** Javascript's flexibility makes writing tests extremely easy, Jasmine syntax makes your tests into a set of stories that help lower the barrier to understanding your code base, and tools like Karma and Nodeunit enable you to have unit test coverage of your entire stack. Even if you decide to not write unit tests for your application, AngularJS's end-to-end test runner enables you to fully automate your integration testing.
* **You can include dynamic Javascript directly into your templates.** The first rule of writing AngularJS code is that your Javascript should never reference the DOM. In the AngularJS world, `$('input#inputName').val('vkarpov')` is (almost) always the wrong thing to do. Your Jade templates should be the definitive guide to all of your app's UI/UX decisions, while your client Javascript should simply maintain the state of your data.
* **You use the same language all the way through.** MongoDB stores your objects in a format that is very similar to JSON and the database shell uses Javascript-like syntax. NodeJS queries MongoDB using JSON queries, then passes the resulting objects to AngularJS as JSON objects. What does all this mean? All Javascript, all day. This streamlines the code itself and makes coordinating development across your team way easier.

1) Create some sample data for the server to display [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/9baed5a3546e13dd5d34e9ea6f4b298c644a923d)
----------------------------

Our to-dos are going to have a description, a due date, and a boolean flag to indicate whether or not they're already done. Our app.js file shows that when the user accesses the `GET /` route, ExpressJS will call `routes/index.js` "index" function, which in turn renders `views/index.jade`. Let's add a couple of sample to-dos to `index.jade`'s template parameters.

2) Modify the index.jade template to display our sample data using ExpressJS templates [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/4ca0e7cdac304e4da0b84d4fe2452be0f8742a05)
-------------------------------

Let's create a very simple layout to display our to-dos. We'll have to separate our to-dos into two lists: one for completed to-dos, and one for outstanding to-dos. It's very important here to note that by default, ExpressJS uses Jade for templating. Jade is a controversial templating library which uses a simplified and more human-readable version of HTML syntax. For example, let's say we have the following HTML:

```
<ul class="span6 text-center"
    id="tools-list">
  <li>
    <a href="http://www.angularjs.org">
      AngularJS
    </a>
  </li>
  <li>
    <a href="http://www.expressjs.com">
      ExpressJS
    </a>
  </li>
</ul>
```

In Jade, this looks like:

```
ul#tools-list.span6.text-center
  li
    a(href='http://www.angularjs.org')
      | AngularJS
  li
    a(href='http://www.expressjs.com')
      | ExpressJS
```

3) Add Bootstrap to our project using Bower [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/0ded5ae648d3de6c7ab30777d86e01879da840ed#commitcomment-3730103)
---------------------------------

You'll want to scroll all the way to the bottom of the diff, because this diff includes all of Bootstrap and jQuery. In addition to changes in the layout, you'll notice that we take advantage of some of Jade's inheritance features. The `index.jade` template inherits from `layout.jade` using the `extends layout` on the first line. In this commit, we added `block head` to `layout.jade`, and then in `index.jade` we overwrote `block head` to include bootstrap in our template.

As an aside, you'll want to install bootstrap via

```
bower install bootstrap-css
bower-install bootstrap-javascript
```

because `bower install bootstrap` only gives you an un-compiled version of Bootstrap. This is pretty silly considering the fact that Twitter maintains both Bower and Bootstrap. [Fate, it seems, is not without a sense of irony](http://www.quickmeme.com/meme/3vbz9u/).

4) Use AngularJS to make our template dynamic [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/bc89f2c811fd94ef0259a782bcb8cd2c8fd932a7)
------------------------------

One big problem with our to-do list right now is that there is no way to move a to-do from the outstanding list to the completed list, or vice versa. A Jade template is compiled once and then served up as static HTML to the user. However, if we use AngularJS's two-way data-binding as a templating tool, our template updates automatically to reflect the state on the client side. Once you've implemented this, items will automatically move to the completed list when you click the checkbox on the outstanding list.

5) Install AngularJS's end-to-end test runner and write a simple test [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/0dc48bfba23eb62dad51e7546ac4f757c7116cd#commitcomment-3730094)
-------------------------------

One of AngularJS's original co-authors was Misko Hevery, my former mentor at Google whose sole mission in the professional world is to make sure every piece of software has 100% test coverage. As you might expect, AngularJS was built with ease of automated testing as a core design consideration. Angular-scenario is a part of AngularJS that essentially hijacks an iframe to perform tests on your site as the user would see it. After this commit, run `node app.js` and navigate to `http://localhost:3000/tests/e2e/runner.html`. You should see something like this:

[<img src="http://thecodebarbarian.files.wordpress.com/2013/07/screenshot-linux.png" style="width: 100%">](http://thecodebarbarian.files.wordpress.com/2013/07/screenshot-linux.png)

This page will run the test we defined in `/public/tests/e2e/scenarios.js`. As you can see, Jasmine syntax does a pretty good job of making tests read like stories. Our test says when we navigate to "/," we should see two to-dos in the outstanding list and one in the completed list. Then we click on a checkbox and expect that one of the to-dos moved to the completed list. You can install angular-scenario via bower:

```
bower install angular-scenario
```

6) Write code for a REST-ful path to let the user add a to-do and a unit test [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/c1511cbd6e1d6a3f37f7eaeb7166258642e9348c)
------------------------------

For this step, you need to install nodeunit with

```
npm install -g nodeunit
```

You can run the test suite with

```
nodeunit nodeunit/*
```

from the repo root directory. You'll notice that the route is defined as a function that returns a function. The purpose of this is two-fold. First, it lets you write a proper unit test for this function. The core tenant of writing unit tests is that if you introduce a bug to a clean code base, the only tests that should fail are the ones that test the newly broken function. If the to-do objects were not passed to the route as a parameter, the route would have a hidden dependency that we wouldn't be able to mock out, so bugs in the to-do object itself could potentially break the route's test as well. This would be especially bad if to-dos were a complex object rather than a simple list. The secondary purpose for defining routes in the manner described above is that this syntax allows you to easily see which functions depend on a given module, which is very important if you have to change how a module works.

7) Open up the REST-ful path for adding a to-do [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/67859d39e5f18e2b4762abc39064349c931e9c7e)
--------------------------------

In line with the argument in step 6, we'll move the todos array into `app.js` for now and inject it into our `GET /` and `POST /todo.json` routes. This pattern is called *dependency injection*.

8) Create a basic form to add a to-do [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/5f108282aa99d750322cf4a2929de3b83454a4d8)
--------------------------------

AngularJS gives us the ability to override the default form-submission action using the `ng-submit` directive, so we can perform the `POST /todo.json` action without refreshing the page by using AngularJS's `$http` service.

9) Add angular-ui-bootstrap and use its datepicker [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/194efcfb00b5dcfbb7949bb75bfcce3da8da5fe4)
--------------------------------

Fair warning, this commit is a little difficult to read because it includes all of angular-bootstrap. You can install it through bower using

```
bower install angular-bootstrap
```

One critical feature that was hardcoded into the previous commit was the due date of the new to-do. It was set to one week from now and there was no way to change it. Thankfully, the angular-bootstrap module includes, among other features, a nice datepicker directive. The hardest part is setting up an AngularJS module so that we can include angular-bootstrap. AngularJS uses modules to organize dependencies, so we need to create a TodoModule in `public/javascripts/TodoModule.js` and explicitly tell AngularJS that this module depends on the `ui.bootstrap` module (in addition to including the actual ui-bootstrap Javascript file). Once this is done, adding a datepicker input with two-way data-binding to a Javascript date becomes a trivial one-liner:

```
datepicker(ng-model="newTodo.due")
```

10) Set up a MongooseJS model [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/0772a8b15898b671fb156f333e3ba4a9cca2e29d)
-----------------------------------

[MongooseJS](http://mongoosejs.com/) is a schema and validation tool for NodeJS and MongoDB. You use MongooseJS essentially the same way you would use an ORM in other development environments. Here we define a basic schema which tells MongooseJS the form that objects in the todos collection must take and define a Todo "model" which allows us to perform ORM-like operations on the todos collection. If you want to learn more about MongooseJS, I've written about it in much greater detail here and here.

11) Use the Todo model for database persistence and then fix our tests [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/c22f4af1c4ef88ac16c15a87998094cb8bcf8d4a)
-------------------------------------

Now that we have an object that lets us save and query a todos collection in MongoDB, we can make our `GET /` route query for all to-dos and our `POST /todo.json` route add a new to-do to the collection. Note that the function to save a new to-do can fail – if the posted object takes on an incorrect form (e.g. the "description" is empty), we'll return an error object. For more information about handling this error object, you can read my post How to Easily Validate Any Form Ever Using AngularJS.

12) Tie up some loose ends: persist checking and un-checking, and reload data periodically [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/e8fc93e12f68a962ee3dae0eb748e7dc4af62853)
--------------------------------------

If you've been paying close attention, you may have noticed that up until now we missed a very important feature: we never actually update the backend when we mark a to-do as done. You would also be more observant than I was when I was outlining the steps for this post, because I missed that until I got to this step. However, like most of the tasks in this post, it is pretty trivial. We open up a `PUT /todo/:id.json` route that updates an existing to-do, create a function called `update` in TodoListController that uses `$http` to perform a PUT, and use the ng-change directive to call "update" every time the checked/unchecked status of a to-do changes.

Finally, we can add one more feature that I find tragically lacking in my personal to-do list app of choice, [Todoist](http://www.todoist.com/): periodic syncing with the server. I find it really frustrating to check off something as done on my laptop and then have to refresh the page on my Ubuntu box when I get back home. The simplest way to improve this is to add a dependency to AngularJS's `$timeout` service and set it to ping the server for a full to-do list every 30 minutes.

[*Corrected on 8/2/13* : Using $timeout causes the E2E test runner to [hang until all outstanding calls to $timeout finish](https://groups.google.com/forum/#!msg/angular/e2CfWnHjvfU/h9xA5lBkKjsJ). This is a bug that the AngularJS team is currently working on. Until that's fixed, I recommend avoiding using $timeout in favor of Javascript's native `setInterval` [(diff)](https://github.com/vkarpov15/mean-stack-todo/commit/27ecf9bba1b668b7080c098a536207df9639f834), or, better yet, your own custom AngularJS service that wraps `setInterval`. ]

Conclusion
----------------

Hey, guess what? You've just successfully built a to-do list app! How badass is that? What's even better is that in some ways this fancy new app you built is in some ways more useful than commercial offerings like Todoist. *[Note: To any Todoist team members who read this- I love many things about your software but hot damn there are some really annoying issues with it that I think could be improved].* Hope you found this little code adventure useful. By the way, I've been toying with the idea of building a more sophisticated to-do list/task management app in the near future that addresses a lot of the issues I've had working with Todoist, Wedoist, Asana, Jira, Github, Trello, Streak, etc. Would you guys be interested in something like this? Something along the lines of using Github to successfully coordinate tasks that aren't actually code-related. What sort of features would you want to see in something like this? What annoys you about existing to-do or team management tools? Feel free to discuss in the comments section.

*Have any questions about the code featured in this post? Want to suggest a better approach? Go ahead and leave a comment below, or tweet me at @code_barbarian. I'm always down for both unfettered praise and horribly vicious flame wars. Until then, feel free to rant about which task management apps you like and which make you want to feel like this in the comments. You know what's better than a task management app? A guy like William Kelly (@idostartups). Major props to him as always for helping make this post happen.*
