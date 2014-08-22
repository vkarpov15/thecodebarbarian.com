I've received several emails asking for instructions on how to set up a basic MEAN stack app. I'm going to take it one step further and give you guys a two-part post that will walk you through creating your first MEAN stack app- from installing the tools to actually writing the code. In Part One we'll go through the setup and installation process. Next in Part Two we'll walk through the steps for building a very simple to-do list. Part One consists of seven steps, although only the first two are are strictly necessary.

We'll start by installing all of our tools. NodeJS and MongoDB are designed to be as close to operating system independent as possible and we will be covering three of the most common operating systems here - OSX, Windows 7/8, and Ubuntu. The one tool that you'll need to get started is a bash shell (the standard linux command line). This tool takes different names on different operating systems, but they are all effectively the same for the purposes of this tutorial. If I use the term terminal, shell, or command line, I'm referring to a bash shell window. If you're on a Mac or an Ubuntu machine, you're looking for the Terminal. Windows doesn't have one by default, but there are several alternatives. The [git installer for Windows](http://msysgit.github.io/) comes with "git bash," which is the tool that I currently prefer.

If you're on OSX, I highly recommend you install [Brew](http://mxcl.github.io/homebrew/) to help with this process. Brew is a phenomenally useful tool for installing programs directly from your command line. For example, if you wanted to install git the hard way, you would have to open up your browser, google "git," click on a few links, download an installer, and run it. With brew, you would simply open up the Terminal, type brew install git , hit enter, and you're done. Brew will help a lot with setting up MongoDB and NodeJS.

1) Installing MongoDB
-------------------

First, we're going to install MongoDB.

**OSX:** Open up your Terminal window and run

```
sudo brew install mongodb
```

**Ubuntu:** Open up your shell and run:

```
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/10gen.list
sudo apt-get update
sudo apt-get install mongodb-10gen
```

**Windows:** Go to http://www.mongodb.org/downloads and download the latest version of MongoDB for Windows, which should be a plain zip file. Once the download is done, extract the contents of the zip file to a memorable directory, such as 'c:\mongodb'.

That's it! After the installation process is done, you should be able to run the command

```
mongod
```

directly from your command line on Mac and Ubuntu. On Windows, you'll need to run it as

```
/c/mongodb/bin/mongod
```

Think of mongod as your local MongoDB server- you need to have a mongod process running in order to be able to use MongoDB. You can now leave mongod running, open up another terminal, and run `mongo test` (or `/c/mongodb/bin/mongo test` on Windows). This should open up the MongoDB shell. Hit ctrl-c to close the MongoDB shell.

2) Installing NodeJS and npm
----------------

Next we're going to install NodeJS and npm (node package manager).

**OSX:** Open your terminal and run

```
sudo brew install node
curl http://npmjs.org/install.sh | sh
```

(Instructions from http://madebyhoundstooth.com/blog/install-node-with-homebrew-on-os-x/)

**Ubuntu:**

```
sudo apt-get update
sudo apt-get install python-software-properties python g++ make
sudo add-apt-repository ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get install nodejs npm
```

**Windows:** Download the installer from http://nodejs.org/download/. I recommend using the installer rather than the binary to save yourself the extra work of adding the binary location to the system path.

Once you have successfully installed NodeJS, you should be able to run the "node" and "npm" commands from your terminal. When you run "node," you should see a single ">." This is the node shell, hit ctrl-c to close it.

When you run `npm` with no arguments, you should see a bunch of usage information. Keep in mind that `npm` sometimes requires root permissions to run. If an npm command fails for unclear reasons, try running it through "sudo."

At this point, you've done essentially all you need to do to run a MEAN stack application. You can simply clone/fork https://github.com/vkarpov15/mean-stack-skeleton , start a "mongod" process, navigate to the git repo, and run

```
npm install
```

You should then be able to run

```
node app.js
```

to start your server. However, I recommend at least reading through the rest of the below steps, as they will explain in a bit more detail some of the tools that you will be using. You can follow along step by step from the [mean-stack-skeleton repo commit log](https://github.com/vkarpov15/mean-stack-skeleton/commits/master), because, conveniently, the commits correspond one-to-one with steps 4-7.

3) Installing ExpressJS
-------------------

Now that we have MongoDB and NodeJS, it is time to install ExpressJS- this is pretty trivial now that we already have npm installed from step 2. In Mac, Linux, and Windows, you should open up a terminal and run:

```
npm install express -g
```

The "-g" flag means that the package will be installed so you can run it from your terminal.

We're using ExpressJS here because it adds some extremely useful tools for web development that NodeJS lacks. Contrary to what you may have heard, NodeJS is not a fully featured web server. NodeJS is simply a tool for doing I/O in an event-based concurrency framework with Javascript. It may be sufficient for a trivial server that prints "Hello, World" for every HTTP request, but it makes more sophisticated web development more difficult than it has to be. ExpressJS provides a familiar MVC (Model-View-Controller) framework for you to work with.

4) Creating an ExpressJS application
---------------------

Now that we have all of our server tools in place, let's create an ExpressJS application. Start by running the command

```
express mytestapp
cd mytestapp
npm install
```

This should create a "mytestapp" folder in your current directory that will contain your application. You should be able to now run `node app.js` from the "mytestapp" folder. If you point your browser to http://localhost:3000, you should see a simple "Welcome to Express" screen.

The "mytestapp" directory will contain a few sub-directories: `routes`, `views`, `public`, and `node_modules`, as well as `app.js` and `package.json` files. Here's a brief description of what these files and directories do:

* **app.js:** The main point of entry into your web server. This file defines the port that your application listens for requests on, includes dependencies via the "require" function, and defines handler functions for different REST-ful paths your clients can access.
* **package.json:** Defines internal dependencies for your application. Running "npm install -d" (which we will do shortly when we modify this file) installs all the dependencies listed in the "dependencies" file.
* **routes:** The routes directory will contain Javascript handlers for REST-ful paths defined in app.js. For example, if you open index.js, you'll see the handler for requests to the "/" path, which renders the "index" template that resides in "views/index.jade".
* **views:** The views directory will contain templates defined in the Jade language. Jade is a cleaner and more human-readable version of HTML with several extraordinarily useful features, such as inheritance and partials. Your routes will access these views via the "res.render" function that you saw in routes/index.js.
* **public:** The public directory is usually used for images, client-side Javascript, and other static assets. ExpressJS will route requests that correspond to files under the public directory directly to the file. For example, if you run `node app.js` and point your browser to http://localhost:3000/stylesheets/style.css, you'll see that Express returned the contents of the "public/stylesheets/style.css" file.
* **node_modules:** The node_modules file contains source code for tools installed via npm. You can feel safe ignoring its contents for now.

5) Installing drivers and MongooseJS
----------------------

Now we're going to install the MongoDB driver for NodeJS, as well as another useful tool called MongooseJS. MongoDB is organized with language-specific drivers that interface with the core database, so in order to use MongoDB with NodeJS, we need the NodeJS driver. MongooseJS is an ORM for NodeJS and MongoDB that is relatively similar to Ruby on Rails' ActiveRecord. For more discussion of MongooseJS, see my [original introductory post about the MEAN Stack](/2013/04/29/easy-web-prototyping-with-mongodb-and-nodejs), as well as the MongooseJS-specific follow-up [Mistakes You're Probably Making With MongooseJS, And How To Fix Them](/2013/06/06/61/).

Open up the package.json file in "mytestapp" using your text editor of choice. I prefer [SublimeText](http://www.sublimetext.com/) on Mac and Windows, and [gedit](https://projects.gnome.org/gedit/) or [vim](http://www.vim.org/) on Linux, but anything like Notepad or Textmate should work fine. The `package.json` file should contain a list of dependencies which looks like this:

```
"dependencies": {
  "express": "3.0.3",
  "jade": "*"
}
```

We're going to add two more lines

```
"dependencies": {
  "express": "3.0.3",
  "jade": "*",
  "mongodb": ">= 0.9.6-7",
  "mongoose" : ">= 3.6"
}
```

Next run

```
npm install
```

If you're on OSX or Ubuntu, you may have to run `sudo npm install -d` to get it working. Now that we have both the NodeJS MongoDB driver and MongoDB, we can create a connection to MongoDB via Mongoose in our app.js file:

```
var Mongoose = require('mongoose');
var db = Mongoose.createConnection('localhost', 'mytestapp');
```

You can see the diff for this step on github [here](https://github.com/vkarpov15/mean-stack-skeleton/commit/2eec604f6698ee99d9d3d88070835073c0e8e0c6). Run "node app.js" now -  your "mongod" process should output a message that looks something like "[initandlisten] connection accepted from 127.0.0.1," which indicates that your app has successfully connected to your mongod process.

6) Use Bower for adding AngularJS
------------------

Bower is another npm tool that we will use to add AngularJS to our app. It is essentially an npm for client-side Javascript. For example, if you want to add jQuery to your project, Bower enables you to do so from your terminal with the command "bower install jquery." Install it with

```
npm install bower -g
```

from your terminal.

Bower has one minor quirk that you need to be aware of - it will install components into a "bower_components" directory by default, which unfortunately is not under the public directory. From your "mytestapp" directory, create a directory called "vendor" under "public/javascripts." You can do this by running the command "mkdir public/javascripts/vendor." Next, in the "mytestapp" directory, create a plain text file called ".bowerrc" that contains:

```
{ "directory" : "public/javascripts/vendor" }
```

This configuration file will tell Bower to install tools into the "public/javascripts/vendor" directory. You can see the diff for this step on github [here](https://github.com/vkarpov15/mean-stack-skeleton/commit/35afa3e3c11bb2cf100b294eb74adf4158446755).

7) Installing AngularJS
------------------

Now lets install AngularJS v1.0.6 using "bower install angular#1.0.6." You should see a *public/javascripts/vendor/angular* directory that contains "angular.js," "angular.min.js," and "bower.json" once you're done.

To be continued
-------------

Congratulations, you've now officially completed Part One and set up the MEAN Stack on your machine! Part Two will be posted in a week, and in it we'll go step-by-step for building a simple to-do list application using the MEAN Sack. In the MEANtime (pun very much intended), I encourage you to play around with these tools and see if you can build anything cool with them. Could you whip up a sweet little MEAN Stack application before I get a chance to drop the next part of the guide? I certainly think you guys can figure it out. It's always great to hear about the awesome ways people are using the MEAN Stack, so if you decide to make something please go ahead and share it with everybody in the comments. Maybe it will turn into a real product and you'll make billions of dollars and commission the construction of a solid gold yacht despite the insistence of your engineers that it will totally sink but you build it anyway because you're so rich it doesn't matter if it ends up on the bottom of the ocean, laws of physics be damned. Or maybe the other readers will just say "sweet app bro." Either way, what are you waiting for?!

*Want to learn more in advance of Part Two? Howtonode.org has a good tutorial on how to use the NodeJS MongoDB driver and ExpressJS to build a simple blogging platform at http://howtonode.org/express-mongodb. In a [previous post](http://thecodebarbarian.wordpress.com/2013/05/12/how-to-easily-validate-any-form-ever-using-angularjs/) I described how integrate MongooseJS validation and AngularJS, which will be useful for the next post. Thanks as always to my partner William Kelly (@idostartups) for his help writing this post, and for getting MEAN Stack shared across all of the internets.*
