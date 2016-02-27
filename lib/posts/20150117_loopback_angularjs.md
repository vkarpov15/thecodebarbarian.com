Recently, I've been looking into [StrongLoop's LoopBack framework](http://strongloop.com/node-js/loopback-framework/). LoopBack generates Express REST APIs by asking you a few simple questions at the command line. LoopBack lets you swap out different storage layers. For each model you define, you can choose to store it in MongoDB, Oracle, MySQL, or Microsoft SQL Server (or even in memory). Say you decide to store your users in MongoDB but your user's gift cards in MySQL (for transactions). Even if you started writing your code with gift cards stored in MongoDB, LoopBack's database abstraction layer makes switching a one-liner. Furthermore, LoopBack has SDKs for generating REST API clients in AngularJS, Android, and iOS. In short, LoopBack is a powerful tool for generating REST APIs that you can extend to scaffold client-side code.

I'm usually not particularly keen on application scaffolding. Scaffolding frameworks generate code that your application may not need. This means your new project already starts off bloated. Furthermore, clearing away the scaffolding requires learning the framework's internals. But, LoopBack has several sweet features that help offset these difficulties.

Setting Up LoopBack
-------------------

Before you dive into these features, you'll install LoopBack and create a new project. LoopBack comes with the `strongloop` npm module. StrongLoop recommends installing their npm module with the `-g` flag, but I avoid using `-g` where possible. You can install this module with `-g`, but it's not necessary. You'll want to go grab a cup of coffee, installing the `strongloop` module can take a few minutes.

`mkdir loopback-example && cd loopback-example && npm install strongloop`

You can now access StrongLoop's command-line tools through the `slc` command line utility. Since you didn't install with `-g`, the executable lives at `./node_modules/strongloop/bin/slc`. To create scaffolding for your new `loopback-example` app, run `./node_modules/strongloop/bin/slc loopback`. You should see the following output with StrongLoop v2.10.1:

```
specter:loopback-example vkarpov$ ./node_modules/strongloop/bin/slc loopback

     _-----_
    |       |    .--------------------------.
    |--(o)--|    |  Let's create a LoopBack |
   `---------´   |       application!       |
    ( _´U`_ )    '--------------------------'
    /___A___\    
     |  ~  |     
   __'.___.'__   
 ´   `  |° ´ Y ` 

? What's the name of your application? loopback-example


I'm all done. Running npm install for you to install the required dependencies. If this fails, try running the command yourself.
```

You can now use the LoopBack framework to create a database model. For the sake of minimizing this example's dependencies, you'll store your model in memory. For this example, you'll create a `Breakfast` model that will store good places to get some eggs and bacon in New York (which is surprisingly difficult to do given the number of places that think pastries are a breakfast food). You can create a new model by running `./node_modules/strongloop/bin/slc loopback:model`. StrongLoop will then ask you to add properties to your model. To keep it simple, add 2 properties: a name and an address.

```
specter:loopback-example vkarpov$ ./node_modules/strongloop/bin/slc loopback:model
? Enter the model name: Breakfast
? Select the data-source to attach Breakfast to: db (memory)
? Select model's base class: PersistedModel
? Expose Breakfast via the REST API? Yes
? Custom plural form (used to build REST URL): BreakfastSpots
Let's add some Breakfast properties now.

Enter an empty property name when done.
? Property name: name
   invoke   loopback:property
? Property type: string
? Required? Yes

Let's add another Breakfast property.
Enter an empty property name when done.
? Property name: address
   invoke   loopback:property
? Property type: string
? Required? Yes

Let's add another Breakfast property.
Enter an empty property name when done.
? Property name: 
```

You may not have noticed it, but you've just created a very simple REST API. Run `./node_modules/strongloop/bin/slc run` to start up a web server, and navigate to `localhost:3000/explorer`. You should see a nice web UI with all your models and their corresponding REST API endpoints.

<img src="//i.imgur.com/JrBuH78.png" style="width: 100%">

Here, you see that LoopBack generates basic documentation as well as routes. Generating documentation is a key feature that too many scaffolding frameworks ignore altogether. LoopBack's API Explorer, on the other hand, provides some basic API endpoint documentation that even lets you simulate HTTP requests.

<img src="//i.imgur.com/VN2EXKt.png" style="width: 100%">

You can even use the API Explorer to add sample data.

<img src="//i.imgur.com/zxkiYVX.png" style="width: 100%">

Integrating the LoopBack AngularJS SDK
--------------------------------------

The LoopBack AngularJS SDK is packaged with v2.8.10 of the `strongloop` module. The AngularJS SDK builds AngularJS services on top of the [`$resource` service](http://www.sitepoint.com/creating-crud-app-minutes-angulars-resource/) for interacting with the LoopBack-generated REST API from the previous section. You can generate a service for the `BreakfastSpots` module without any extra work by running the following command.

```
cd client
mkdir js
../node_modules/strongloop/node_modules/loopback-sdk-angular-cli/bin/lb-ng ../server/server.js js/services.js
```

The `lb-ng` script is the CLI for the LoopBack AngularJS SDK. If you installed LoopBack with `-g` you should be able to run it with `lb-ng`. Running the above command generates a `client/js/services.js` file. This file contains an AngularJS service for each model defined in your LoopBack REST API. While this is very cool, be careful: the `services.js` file will get bloated very quickly. With this one added service, the generated `services.js` file is 55kb - the code for the `BreakfastSpots` service alone is over 600 lines. The vast majority of this code is documentation, and maybe I'm just being a crusty curmudgeon, but this seems excessive.

<img src="//i.imgur.com/vBuDOOu.png">

Rant aside, tying `services.js` into an AngularJS client is pleasantly trivial. First, you need to tweak LoopBack's middleware configuration, `server/middleware.json`, to look like this:

```
{
  "initial:before": {
    "loopback#favicon": {}
  },
  "initial": {
    "compression": {}
  },
  "session": {
  },
  "auth": {
  },
  "parse": {
  },
  "routes": {
    "loopback#status": {
      "paths": "/status"
    }
  },
  "files": {
    "loopback#static": {
      "params": "$!../client"
    }
  },
  "final": {
    "loopback#urlNotFound": {}
  },
  "final:after": {
    "errorhandler": {}
  }
}
```

The `files` key above is the most important part. This setting tells the LoopBack server to serve static files from the `client` directory. Once you've tweaked this configuration, you can create an `index.html` file that displays a list of all `BreakfastSpots`.

```html
<html ng-app="myApp">
  <head>
    <script type="text/javascript"
            src="//code.angularjs.org/1.2.16/angular.js">
    </script>
    <script type="text/javascript"
            src="//code.angularjs.org/1.2.16/angular-resource.js">
    </script>
    <script type="text/javascript"
            src="js/services.js">
    </script>
    <script type="text/javascript">
      angular.module('myApp', ['lbServices']);

      function TestController($scope, Breakfast) {
        $scope.allBreakfastSpots = Breakfast.find();
      }
    </script>
  </head>

  <body>
    <div ng-controller="TestController">
      <ul>
        <li ng-repeat="spot in allBreakfastSpots">
          {{spot.name}} ({{spot.address}})
        </li>
      </ul>
    </div>
  </body>
</html>
```

LoopBack's services have a very nice property: `find()` returns an array that gets populated whenever the HTTP call returns. Thanks to AngularJS two-way data binding, you don't even need to pass a callback to `find()`.

<img src="//i.imgur.com/ddQPrDM.png" style="border: 2px dashed #777">

Note that you *must* include the `angular-resource.js` file. The `services.js` file explicitly relies on `ngResource`, which isn't part of the core `angular.js` file.

Conclusion
----------

In this tutorial, you used StrongLoop's LoopBack framework to generate a REST API and a corresponding AngularJS client. While I am still suspicious of scaffolding, I hope you saw the benefits of LoopBack's ability to generate rigorous documentation. Furthermore, LoopBack is just one part of StrongLoop's new product [Arc](http://docs.strongloop.com/display/ARC/StrongLoop+Arc). Arc provides a GUI on top of the command line tools you saw in this tutorial. In addition, Arc provides a monitoring tool for your LoopBack REST APIs. While I haven't tried the monitoring tool yet, the idea of a scaffolding framework that generates documentation and sets up monitoring is what first piqued my interest in LoopBack. I'm excited to see what StrongLoop has in store for the future of LoopBack and Arc.
