var moment = require('moment');

module.exports = [
  {
    src: './lib/posts/20130429_mean_stack.md',
    dest: {
      directory: './bin/2013/04/29/',
      name: 'easy-web-prototyping-with-mongodb-and-nodejs'
    },
    title: 'The MEAN Stack: MongoDB, ExpressJS, AngularJS, and Node.js',
    date: moment('2013-04-29'),
    tags: ['MongoDB', 'AngularJS', 'NodeJS'],
    image: '//www.newmancraneins.com/wp-content/uploads/2012/10/The-Benefits-of-Rapid-Prototyping-in-the-Manufacturing-Industry.jpg'
  },
  {
    src: './lib/posts/20130512_validate_any_form.md',
    dest: {
      directory: './bin/2013/05/12/',
      name: 'how-to-easily-validate-any-form-ever-using-angularjs'
    },
    title: 'How to Easily Validate Any Form Ever Using AngularJS',
    date: moment('2013-05-12'),
    tags: ['MongoDB', 'AngularJS'],
    image: '//blog.enfocussolutions.com/Portals/134568/images/istock_000017831176xsmall.jpg'
  },
  {
    src: './lib/posts/20130606_mongoose_mistakes.md',
    dest: {
      directory: './bin/2013/06/06/',
      name: '61'
    },
    title: 'Mistakes You\'re Probably Making With MongooseJS, And How To Fix Them',
    date: moment('2013-06-06'),
    tags: ['MongoDB', 'NodeJS'],
    image: '//www.eacgs.com/wp-content/uploads/MongooseEnvGr_Newsletter_WP_03.jpg'
  },
  {
    src: './lib/posts/20130621_paleo_dev.md',
    dest: {
      directory: './bin/2013/06/21/',
      name: '8-reasons-why-better-nutrition-makes-you-a-better-developer'
    },
    title: '8 Reasons Why Better Nutrition Makes You a Better Developer',
    date: moment('2013-06-21'),
    tags: ['Paleo'],
    image: '//picketfencepaleo.com/wp-content/uploads/2012/12/Keep_Calm_and_Eat_Paleo1.jpeg'
  },
  {
    src: './lib/posts/20130722_mean_part_i.md',
    dest: {
      directory: './bin/2013/07/22/',
      name: 'introduction-to-the-mean-stack-part-one-setting-up-your-tools'
    },
    title: 'Introduction to the MEAN Stack, Part One: Setting Up Your Tools',
    date: moment('2013-07-22'),
    tags: ['MongoDB', 'AngularJS', 'NodeJS'],
    image: '//developers.google.com/cloud/mean/images/mean_stack.png'
  },
  {
    src: './lib/posts/20130729_mean_part_ii.md',
    dest: {
      directory: './bin/2013/07/29/',
      name: 'introduction-to-the-mean-stack-part-two-building-and-testing-a-to-do-list'
    },
    title: 'Introduction to the MEAN Stack, Part Two: Building and Testing a To-do List',
    date: moment('2013-07-29'),
    tags: ['MongoDB', 'AngularJS', 'NodeJS'],
    image: '//developers.google.com/cloud/mean/images/mean_stack.png'
  },
  {
    src: './lib/posts/20130923_directives.md',
    dest: {
      directory: './bin/2013/09/23/',
      name: 'the-8020-guide-to-writing-angularjs-directives'
    },
    title: 'The 80/20 Guide to Writing AngularJS Directives',
    date: moment('2013-09-23'),
    tags: ['AngularJS'],
    image: '//thehospitalitycoach.net/wp-content/uploads/2011/07/80-20-Cafe-Restaurant-Rule.jpg'
  },
  {
    src: './lib/posts/20131202_currencies.md',
    dest: {
      directory: './bin/2013/12/02',
      name: 'price-internationalization-with-the-mean-stack'
    },
    title: 'Price Internationalization with the MEAN Stack',
    date: moment('2013-12-02'),
    tags: ['NodeJS', 'AngularJS'],
    code: 'https://github.com/vkarpov15/mean-exchange-rates',
    image: '//thumbs.dreamstime.com/x/small-currency-dice-forex-chart-18044052.jpg'
  },
  {
    src: './lib/posts/20140110_andrew_luck.md',
    dest: {
      directory: './bin/2014/01/10',
      name: 'want-to-ace-your-next-developer-interview-channel-andrew-luck'
    },
    title: 'Want To Ace Your Next Developer Interview? Channel Andrew Luck',
    date: moment('2014-01-10'),
    tags: ['Random'],
    image: '//thecodebarbarian.files.wordpress.com/2014/01/andrew-luck.jpg'
  },
  {
    src: './lib/posts/20140117_angular_filters.md',
    dest: {
      directory: './bin/2014/01/17',
      name: 'the-8020-guide-to-writing-and-using-angularjs-filters'
    },
    title: 'The 80/20 Guide to Writing and Using AngularJS Filters',
    date: moment('2014-01-17'),
    tags: ['AngularJS'],
    image: '//thecodebarbarian.files.wordpress.com/2014/01/hanashuriken2.png'
  },
  {
    src: './lib/posts/20140124_paleo_nyc.md',
    dest: {
      directory: './bin/2014/01/24',
      name: 'my-top-5-paleo-lifestyle-hacks-for-new-yorkers'
    },
    title: 'My Top 5 Paleo Lifestyle Hacks for New Yorkers',
    date: moment('2014-01-24'),
    tags: ['Paleo'],
    image: '//thecodebarbarian.files.wordpress.com/2014/01/img_5016.jpg'
  },
  {
    src: './lib/posts/20140131_data_binding.md',
    dest: {
      directory: './bin/2014/01/31',
      name: 'what-you-need-to-know-about-angularjs-data-binding'
    },
    title: 'What You Need To Know About AngularJS Data Binding',
    date: moment('2014-01-31'),
    tags: ['AngularJS'],
    image: '//thecodebarbarian.files.wordpress.com/2014/01/fiendishchain-tf05-jp-vg.png'
  },
  {
    src: './lib/posts/20140214_nba.md',
    dest: {
      directory: './bin/2014/02/14',
      name: 'crunching-30-years-of-nba-data-with-mongodb-aggregation'
    },
    title: 'Crunching 30 Years of NBA Data with MongoDB Aggregation',
    date: moment('2014-02-14'),
    tags: ['MongoDB'],
    previewText: 'A MongoDB aggregation tutorial using a data set of all NBA games from 1985 to 2015, including charts and correlation analysis.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/basketball.jpeg'
  },
  {
    src: './lib/posts/20140228_2x.md',
    dest: {
      directory: './bin/2014/02/28',
      name: 'the-optimal-setup-for-listening-to-talks-at-2x-playback-speed'
    },
    title: 'The Optimal Setup for Listening to Talks at 2x Playback Speed',
    date: moment('2014-02-28'),
    tags: ['Random'],
    image: '//lh4.googleusercontent.com/HmVWuOlZ3L0le0QELn3yrTzYLJlM1ZMrmWPc1yuOMKC7HmRtwnyXQ1x-uNdwJai_WG9qJ5049XYw_l94ngF4j9Rj_gx7iu4OUIEYO6io9JmoVIK_sAI36YeV-A'
  },
  {
    src: './lib/posts/20140314_math.md',
    dest: {
      directory: './bin/2014/03/14',
      name: 'why-math-is-necessary-for-cs-majors'
    },
    title: 'Why Math is Necessary for CS Majors',
    date: moment('2014-03-14'),
    tags: ['Random'],
    image: '//thecodebarbarian.files.wordpress.com/2014/03/pure-mathematics-formulc3a6-blackboard.jpg'
  },
  {
    src: './lib/posts/20140328_nutrition.md',
    dest: {
      directory: './bin/2014/03/28',
      name: 'plugging-usda-nutrition-data-into-mongodb'
    },
    title: 'Plugging USDA Nutrition Data into MongoDB',
    date: moment('2014-03-28'),
    tags: ['MongoDB'],
    code: 'https://github.com/vkarpov15/usda-sr25-mongodb',
    image: '//investorplace.com/wp-content/uploads/2014/02/bacon.jpg'
  },
  {
    src: './lib/posts/20140410_text_search.md',
    dest: {
      directory: './bin/2014/04/10',
      name: 'a-nodejs-perspective-on-whats-new-in-mongodb-2-6-part-i-text-search'
    },
    title: 'A NodeJS Perspective on What\'s New in MongoDB 2.6, Part I: Text Search',
    date: moment('2014-04-10'),
    image: '//samuellam.files.wordpress.com/2012/09/nodemongo.png',
    tags: ['MongoDB', 'NodeJS']
  },
  {
    src: './lib/posts/20140425_aggregation_out.md',
    dest: {
      directory: './bin/2014/04/25',
      name: 'a-nodejs-perspective-on-whats-new-in-mongodb-2-6-part-ii-aggregation-out'
    },
    title: 'A NodeJS Perspective on What\'s New in MongoDB 2.6, Part II: Aggregation $out',
    date: moment('2014-04-25'),
    tags: ['MongoDB', 'NodeJS'],
    image: '//samuellam.files.wordpress.com/2012/09/nodemongo.png',
    code: 'https://github.com/vkarpov15/lean-mean-nutrition/blob/master/dependencies/aggregate_weekly_calories.js#L15-79'
  },
  {
    src: './lib/posts/20140509_mongoose_389.md',
    dest: {
      directory: './bin/2014/05/09',
      name: 'whats-new-in-mongoose-3-8-9'
    },
    title: 'What\'s New in Mongoose 3.8.9',
    date: moment('2014-05-09'),
    tags: ['MongoDB', 'NodeJS'],
    image: '//houstonbeerweek.com/cal/uploads/mvsc.jpg'
  },
  {
    src: './lib/posts/20140603_mongoose_future.md',
    dest: {
      directory: './bin/2014/06/03',
      name: 'the-future-of-mongoosejs'
    },
    title: 'The Future of MongooseJS',
    date: moment('2014-06-03'),
    tags: ['MongoDB', 'NodeJS'],
    image: '//html5hub.com/wp-content/uploads/2013/11/es6-hiway-sign.png'
  },
  {
    src: './lib/posts/20140904_query_selector_injection.md',
    dest: {
      directory: './bin/2014/09/04',
      name: 'defending-against-query-selector-injection-attacks'
    },
    title: 'Defending Against Query Selector Injection Attacks',
    date: moment('2014-09-04'),
    tags: ['MongoDB', 'NodeJS'],
    image: '//farm3.static.flickr.com/2457/3826282995_3e69f496b4_m.jpg'
  },
  {
    src: './lib/posts/20141204_new_blog.md',
    dest: {
      directory: './bin/2014/12/04',
      name: 'new-blog-and-book-announcement'
    },
    title: 'New Blog and Book Announcement',
    date: moment('2014-12-04'),
    tags: ['AngularJS'],
    image: '//i.imgur.com/n3Ekf24.png'
  },
  {
    src: './lib/posts/20141219_mongoose_397.md',
    dest: {
      directory: './bin/2014/12/19',
      name: 'mongoose-397'
    },
    title: 'What\'s new in Mongoose 3.9.7',
    date: moment('2014-12-19'),
    tags: ['NodeJS', 'MongoDB'],
    image: '//upload.wikimedia.org/wikipedia/commons/d/d9/Vosmangoesten_zoo_Lille.JPG'
  },
  {
    src: './lib/posts/20150117_loopback_angularjs.md',
    dest: {
      directory: './bin/2015/01/17',
      name: 'angularjs-loopback'
    },
    title: 'Creating REST APIs and Clients with LoopBack and AngularJS',
    date: moment('2015-01-17'),
    tags: ['AngularJS', 'NodeJS'],
    image: '//i.imgur.com/PULVzVs.png'
  },
  {
    src: './lib/posts/20150124_angularjs_interceptors.md',
    dest: {
      directory: './bin/2015/01/24',
      name: 'angularjs-interceptors'
    },
    title: 'An 80/20 Guide to AngularJS HTTP Interceptors',
    date: moment('2015-01-24'),
    tags: ['AngularJS'],
    image: '//i.imgur.com/teSiqj9.jpg'
  },
  {
    src: './lib/posts/20150206_static_site_generators.md',
    dest: {
      directory: './bin/2015/02/06',
      name: 'static_site_generators'
    },
    title: 'Static Site Generators are Overkill',
    date: moment('2015-02-06'),
    tags: ['NodeJS'],
    image: '//i.imgur.com/qGhic5f.png'
  },
  {
    src: './lib/posts/20150213_travis_coveralls.md',
    dest: {
      directory: './bin/2015/02/13',
      name: 'travis_coveralls'
    },
    title: 'Building Better npm Modules with Travis and Coveralls',
    date: moment('2015-02-13'),
    tags: ['NodeJS'],
    image: '//www.progearphil.com/-/products/b-coverall-01.jpg'
  },
  {
    src: './lib/posts/20150220_angularjs_mongoose.md',
    dest: {
      directory: './bin/2015/02/20',
      name: 'better-angularjs-form-validation-with-mongoose'
    },
    title: 'Better AngularJS Form Validation with Mongoose',
    date: moment('2015-02-20'),
    tags: ['NodeJS', 'AngularJS'],
    image: '//i.imgur.com/gZwWByl.jpg'
  },
  {
    src: './lib/posts/20150227_npm_install_g.md',
    dest: {
      directory: './bin/2015/02/27',
      name: 'npm-install--g'
    },
    title: 'Why I (Almost) Never Use npm\'s -g Flag',
    date: moment('2015-02-27'),
    tags: ['NodeJS'],
    image: '//i.imgur.com/Qi3TwnH.png'
  },
  {
    src: './lib/posts/20150306_mongoose_plugins.md',
    dest: {
      directory: './bin/2015/03/06',
      name: 'guide-to-mongoose-plugins'
    },
    title: 'An 80/20 Guide to Mongoose Plugins',
    date: moment('2015-03-06'),
    tags: ['NodeJS'],
    image: '//i.imgur.com/HQMSGsl.jpg'
  },
  {
    src: './lib/posts/20150313_testing_rest_apis_with_acquit.md',
    dest: {
      directory: './bin/2015/03/13',
      name: 'testing-rest-apis-with-acquit'
    },
    title: 'Testing and Documenting Node.js APIs with Mocha and Acquit',
    date: moment('2015-03-13'),
    tags: ['NodeJS'],
    image: '//i.imgur.com/8pNmul8.jpg'
  },
  {
    src: './lib/posts/20150320_callback_hell.md',
    dest: {
      directory: './bin/2015/03/20',
      name: 'callback-hell-is-a-myth'
    },
    title: 'Callback Hell is a Myth',
    date: moment('2015-03-20'),
    tags: ['NodeJS', 'AngularJS'],
    image: '//i.imgur.com/nGgScTr.jpg'
  },
  {
    src: './lib/posts/20150410_shippable.md',
    dest: {
      directory: './bin/2015/04/10',
      name: 'shippable-an-alternative-take-on-travis'
    },
    title: 'Shippable: An Alternative Take on Travis',
    date: moment('2015-04-10'),
    tags: ['NodeJS'],
    image: '//i.imgur.com/sotdDGi.png'
  },
  {
    src: './lib/posts/20150424_proxies.md',
    dest: {
      directory: './bin/2015/04/24',
      name: '80-20-guide-to-ecmascript-6-proxies'
    },
    title: 'An 80/20 Guide to ECMAScript 6 Proxies',
    date: moment('2015-04-24'),
    tags: ['NodeJS'],
    image: 'http://www.anotherthink.com/wp-content/uploads/2013/08/superman.jpg'
  },
  {
    src: './lib/posts/20150508_karma.md',
    dest: {
      directory: './bin/2015/05/08',
      name: 'testing-client-side-javascript-with-karma'
    },
    title: 'Testing Client-side JavaScript with Karma',
    date: moment('2015-05-08'),
    tags: ['NodeJS', 'AngularJS'],
    image: 'http://i.imgur.com/NDZxX2t.png'
  },
  {
    src: './lib/posts/20150612_directive_testing.md',
    dest: {
      directory: './bin/2015/06/12',
      name: 'testing-angularjs-directives'
    },
    title: 'Testing AngularJS Directives',
    date: moment('2015-06-12'),
    tags: ['NodeJS', 'AngularJS'],
    image: 'http://i.imgur.com/beDSHUq.png'
  },
  {
    src: './lib/posts/20150626_nba_finals.md',
    dest: {
      directory: './bin/2015/06/26',
      name: 'crunching-nba-finals-history-with-mongodb'
    },
    title: 'Crunching NBA Finals History with MongoDB',
    date: moment('2015-06-26'),
    tags: ['MongoDB'],
    image: 'http://i.imgur.com/ffjB4tP.png'
  },
  {
    src: './lib/posts/20150724_mongoose_discriminators.md',
    dest: {
      directory: './bin/2015/07/24',
      name: 'guide-to-mongoose-discriminators'
    },
    title: 'An 80/20 Guide to Mongoose Discriminators',
    date: moment('2015-07-24'),
    tags: ['MongoDB'],
    image: 'http://i.imgur.com/HCseIcc.png'
  },
  {
    src: './lib/posts/20150807_loopback_ionic_i.md',
    dest: {
      directory: './bin/2015/08/07',
      name: 'ionic-loopback-rest-api'
    },
    title: 'Ionic Framework and LoopBack, Part I: Building a LoopBack REST API',
    date: moment('2015-08-07'),
    tags: ['NodeJS', 'AngularJS'],
    image: 'http://i.imgur.com/gh86st3.png'
  },
  {
    src: './lib/posts/20150904_loopback_ionic_ii.md',
    dest: {
      directory: './bin/2015/09/04',
      name: 'ionic-loopback-directives'
    },
    title: 'Ionic Framework and LoopBack, Part II: Directives with the AngularJS LoopBack SDK',
    date: moment('2015-09-04'),
    tags: ['NodeJS', 'AngularJS'],
    image: 'http://i.imgur.com/gh86st3.png'
  },
  {
    src: './lib/posts/20151009_loopback_ionic_iii.md',
    dest: {
      directory: './bin/2015/10/09',
      name: 'ionic-loopback-mobile-app'
    },
    title: 'Ionic Framework and LoopBack, Part III: Building an Ionic App',
    date: moment('2015-10-09'),
    tags: ['NodeJS', 'AngularJS'],
    image: 'http://i.imgur.com/gh86st3.png'
  },
  {
    src: './lib/posts/20151023_mongodb_gridfs.md',
    dest: {
      directory: './bin',
      name: 'mongodb-gridfs-stream'
    },
    title: 'The MongoDB Node.js Driver\'s New Streaming GridFS API',
    date: moment('2015-10-23'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/VMIyLa5.png'
  },
  {
    src: './lib/posts/20151113_loopback_ionic_iv.md',
    dest: {
      directory: './bin',
      name: 'ionic-loopback-testing'
    },
    title: 'Ionic Framework and LoopBack, Part IV: Testing with Travis',
    date: moment('2015-11-13'),
    tags: ['NodeJS', 'AngularJS'],
    image: 'http://i.imgur.com/gh86st3.png'
  },
  {
    src: './lib/posts/20151211_mongodb_32.md',
    dest: {
      directory: './bin',
      name: 'node-perspective-on-mongodb-3.2-bitwise-query-operators'
    },
    title: 'A Node.js Perspective on MongoDB 3.2: Bitwise Query Operators',
    date: moment('2015-12-10'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/rEq04f1.png'
  },
  {
    src: './lib/posts/20151218_mongodb_32_sample.md',
    dest: {
      directory: './bin',
      name: 'node-perspective-on-mongodb-3.2-$lookup-$sample'
    },
    title: 'A Node.js Perspective on MongoDB 3.2, Part 2: $lookup and $sample',
    date: moment('2015-12-18'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/Dv4ltMX.png'
  },
  {
    src: './lib/posts/20160108_mongoose_2015.md',
    dest: {
      directory: './bin',
      name: 'mongoose-2015-year-in-review'
    },
    title: 'Mongoose 2015 Year in Review',
    date: moment('2016-01-07'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/pR8tHKE.jpg'
  },
  {
    src: './lib/posts/20160129_book_announcement.md',
    dest: {
      directory: './bin',
      name: 'introducing-80-20-guide-to-es2015-generators'
    },
    title: 'Introducing The 80/20 Guide to ES2015 Generators',
    date: moment('2016-01-29'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/UC5trHd.png'
  },
  {
    src: './lib/posts/20160205_npm_run.md',
    dest: {
      directory: './bin',
      name: '3-neat-tricks-with-npm-run'
    },
    title: '3 Neat Tricks With npm run',
    date: moment('2016-02-05'),
    tags: ['NodeJS'],
    previewText: 'The `npm run` shortcut is useful for more than just running tests. Here\'s 3 ways `npm run` can make your life easier.',
    image: 'http://i.imgur.com/eTsJfMF.jpg'
  },
  {
    src: './lib/posts/20160212_dookie.md',
    dest: {
      directory: './bin',
      name: 'dookie-import-export-mongodb'
    },
    title: 'Introducing Dookie, A Better Way To Import/Export MongoDB Data',
    date: moment('2016-02-12'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/DL9R14Y.png'
  },
  {
    src: './lib/posts/20160219_coroutines.md',
    dest: {
      directory: './bin',
      name: 'write-your-own-co-using-es2015-generators'
    },
    title: 'Write Your Own Co Using ES2015 Generators',
    date: moment('2016-02-19'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/gTrI7tf.png'
  },
  {
    src: './lib/posts/20160226_react_native.md',
    dest: {
      directory: './bin',
      name: 'react-native-keep-awake-android-java'
    },
    title: 'Diving Into React Native Java to Keep the Android Screen On',
    date: moment('2016-02-26'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/noFg1sU.png'
  },
  {
    src: './lib/posts/20160304_circle_ci.md',
    dest: {
      directory: './bin',
      name: 'setting-up-circle-ci-with-node-js'
    },
    title: 'Setting Up Circle CI With Node.js',
    date: moment('2016-03-04'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/3HiTMYc.jpg'
  },
  {
    src: './lib/posts/20160311_superagent.md',
    dest: {
      directory: './bin',
      name: 'replacing-angular-js-$http-backend-with-superagent'
    },
    title: 'Replacing AngularJS\' $httpBackend With Superagent',
    date: moment('2016-03-11'),
    tags: ['NodeJS', 'AngularJS'],
    image: 'http://f.cl.ly/items/3d282n3A0h0Z0K2w0q2a/Screenshot.png'
  },
  {
    src: './lib/posts/20160318_github_npm.md',
    dest: {
      directory: './bin',
      name: 'github-is-my-favorite-private-npm-registry'
    },
    title: 'GitHub is My Favorite Private npm Registry',
    date: moment('2016-03-18'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/6zW9cKn.png'
  },
  {
    src: './lib/posts/20160422_binary_tree.md',
    dest: {
      directory: './bin',
      name: 'i-dont-want-to-hire-you-if-you-cant-reverse-a-binary-tree'
    },
    title: 'I Don\'t Want To Hire You If You Can\'t Reverse a Binary Tree',
    date: moment('2016-04-22'),
    tags: ['NodeJS'],
    previewLink: 'Debunking the common myth that whiteboard interviews are not useful.',
    image: 'http://i.imgur.com/xK5Inwu.jpg'
  },
  {
    src: './lib/posts/20160506_co_design.md',
    dest: {
      directory: './bin',
      name: '3-common-co-design-patterns'
    },
    title: '3 Common Co Design Patterns',
    date: moment('2016-05-06'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/mtG2ry9.png'
  },
  {
    src: './lib/posts/20160523_mongoose_cursor.md',
    dest: {
      directory: './bin',
      name: 'cursors-in-mongoose-45'
    },
    title: 'Cursors in Mongoose 4.5',
    date: moment('2016-05-23'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/RB1CHhD.jpg'
  },
  {
    src: './lib/posts/20160610_react_native.md',
    dest: {
      directory: './bin',
      name: 'react-native-the-bad-parts'
    },
    title: 'React Native: The Bad Parts',
    date: moment('2016-06-10'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/XLrTvxx.png'
  },
  {
    src: './lib/posts/20160701_mongoose_error_handling.md',
    dest: {
      directory: './bin',
      name: 'mongoose-error-handling'
    },
    title: 'Mongoose 4.5 Error Handling',
    date: moment('2016-07-01'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/TNkBPsR.png'
  },
  {
    src: './lib/posts/20160718_mongoose_virtual_populate.md',
    dest: {
      directory: './bin',
      name: 'mongoose-virtual-populate'
    },
    title: 'Mongoose 4.5 Virtual Populate',
    date: moment('2016-07-18'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/OBMNAFj.png'
  },
  {
    src: './lib/posts/20160804_mongoose_custom_query_methods.md',
    dest: {
      directory: './bin',
      name: 'mongoose-custom-query-methods'
    },
    title: 'Mongoose 4.5 Custom Query Methods',
    date: moment('2016-08-04'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/lwWYU5Q.png'
  },
  {
    src: './lib/posts/20160923_ramda_di.md',
    dest: {
      directory: './bin',
      name: 'using-ramda-as-a-dependency-injector'
    },
    title: 'Using Ramda as a Dependency Injector',
    date: moment('2016-09-23'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/MttUY1D.jpg'
  },
  {
    src: './lib/posts/20161014_mongodb_geo.md',
    dest: {
      directory: './bin',
      name: '80-20-guide-to-mongodb-geospatial-queries'
    },
    title: 'The 80/20 Guide to MongoDB Geospatial Queries',
    date: moment('2016-10-14'),
    tags: ['MongoDB'],
    image: 'http://i.imgur.com/oEshByg.png'
  },
  {
    src: './lib/posts/20161028_proxies_perf.md',
    dest: {
      directory: './bin',
      name: 'thoughts-on-es6-proxies-performance'
    },
    title: 'Thoughts on ES6 Proxies Performance',
    date: moment('2016-10-28'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/Jn1jazf.png'
  },
  {
    src: './lib/posts/20161118_engineering_lessons.md',
    dest: {
      directory: './bin',
      name: '10-lessons-from-10-years-as-a-software-engineer'
    },
    title: '10 Lessons from 10 Years as a Software Engineer',
    date: moment('2016-11-18'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/jsBO7wD.png'
  },
  {
    src: './lib/posts/20161124_observables.md',
    dest: {
      directory: './bin',
      name: 'this-thanksgiving-im-thankful-for-observables'
    },
    title: 'This Thanksgiving I\'m Thankful for Observables',
    date: moment('2016-11-24'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/KzfxcFV.png'
  },
  {
    src: './lib/posts/20161214_archetype.md',
    dest: {
      directory: './bin',
      name: 'static-typing-is-dead-runtime-type-casting-archetype'
    },
    title: 'Static Typing is Dead: Runtime Type Casting with Archetype',
    date: moment('2016-12-14'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/o5E9kir.png'
  },
  {
    src: './lib/posts/20170104_archetype_query.md',
    dest: {
      directory: './bin',
      name: 'casting-mongodb-queries-with-archetype'
    },
    title: 'Casting MongoDB Queries with Archetype',
    date: moment('2017-01-04'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/g4xbjym.png'
  },
  {
    src: './lib/posts/20170112_mongodb_graphlookup.md',
    dest: {
      directory: './bin',
      name: 'a-nodejs-perspective-on-mongodb-34-graphlookup'
    },
    title: 'A Node.js Perspective on MongoDB 3.4: $graphLookup',
    date: moment('2017-01-12'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/3blGuMX.png'
  },
  {
    src: './lib/posts/20170119_mongodb_facet.md',
    dest: {
      directory: './bin',
      name: 'a-nodejs-perspective-on-mongodb-34-facet'
    },
    title: 'A Node.js Perspective on MongoDB 3.4: $facet',
    date: moment('2017-01-19'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/U4G4pxc.png'
  },
  {
    src: './lib/posts/20170126_mongodb_decimal.md',
    dest: {
      directory: './bin',
      name: 'a-nodejs-perspective-on-mongodb-34-decimal'
    },
    title: 'A Node.js Perspective on MongoDB 3.4: Decimal Type',
    date: moment('2017-01-26'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/fypknCl.png'
  },
  {
    src: './lib/posts/20170202_mongoose_embedded_discriminators.md',
    dest: {
      directory: './bin',
      name: 'mongoose-4.8-embedded-discriminators'
    },
    title: 'Embedded Discriminators in Mongoose 4.8',
    date: moment('2017-02-02'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/bBY1Y8M.jpg'
  },
  {
    src: './lib/posts/20170209_mongoose_save_error.md',
    dest: {
      directory: './bin',
      name: 'mongoose-4.8-save-errors'
    },
    title: 'The saveErrorIfNotFound Option in Mongoose 4.8',
    date: moment('2017-02-09'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/fFnUqLo.png'
  },
  {
    src: './lib/posts/20170216_observable_server.md',
    dest: {
      directory: './bin',
      name: 'rest-apis-with-observables'
    },
    title: 'Building REST APIs with Observables',
    date: moment('2017-02-16'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/AEDwARd.png'
  },
  {
    src: './lib/posts/20170223_mongodb_collations.md',
    dest: {
      directory: './bin',
      name: 'a-nodejs-perspective-on-mongodb-34-collations'
    },
    title: 'A Node.js Perspective on MongoDB 3.4: Collations',
    date: moment('2017-02-23'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/0psdXaz.jpg'
  },
  {
    src: './lib/posts/20170228_node_webassembly.md',
    dest: {
      directory: './bin',
      name: 'getting-started-with-webassembly-in-node.js'
    },
    title: 'Getting Started With WebAssembly in Node.js',
    date: moment('2017-02-28'),
    tags: ['NodeJS'],
    previewText: 'An introduction to writing, compiling, and using webassembly in Node.js. Updated for 2020.',
    image: 'http://thecodebarbarian.com/images/gear.jpg'
  },
  {
    src: './lib/posts/20170308_async_await.md',
    dest: {
      directory: './bin',
      name: '80-20-guide-to-async-await-in-node.js'
    },
    title: 'The 80/20 Guide to Async/Await in Node.js',
    date: moment('2017-03-08'),
    tags: ['NodeJS', 'asyncawait'],
    previewLink: 'Async/await is new to Node.js in v7.6.0. Here\'s how you can get started using async/await in Node.js.',
    image: 'http://i.imgur.com/9D2tvfU.png'
  },
  {
    src: './lib/posts/20170315_async_await_patterns.md',
    dest: {
      directory: './bin',
      name: 'common-async-await-design-patterns-in-node.js'
    },
    title: 'Common Async/Await Design Patterns in Node.js',
    date: moment('2017-03-15'),
    tags: ['NodeJS', 'asyncawait'],
    previewText: '3 neat tricks using async/await: retrying failed requests, processing MongoDB cursors, and executing requests in parallel.',
    image: 'http://i.imgur.com/plEwB6L.png'
  },
  {
    src: './lib/posts/20170324_nodejs_versions.md',
    dest: {
      directory: './bin',
      name: 'managing-node.js-versions-without-external-tools'
    },
    title: 'Managing Node.js Versions Without External Tools',
    date: moment('2017-03-24'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/gGKNuu9.png'
  },
  {
    src: './lib/posts/20170330_mongodb_agenda.md',
    dest: {
      directory: './bin',
      name: 'node.js-task-scheduling-with-agenda-and-mongodb'
    },
    title: 'Node.js Task Scheduling With Agenda and MongoDB',
    date: moment('2017-03-30'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/ZyuD8do.png'
  },
  {
    src: './lib/posts/20170404_unhandled_rejections.md',
    dest: {
      directory: './bin',
      name: 'unhandled-promise-rejections-in-node.js'
    },
    title: 'Unhandled Promise Rejections in Node.js',
    date: moment('2017-04-04'),
    tags: ['NodeJS'],
    previewText: 'What is an `UnhandledPromiseRejectionWarning`? This article explains what an unhandled promise rejection is, and what you can do about it.',
    image: 'http://i.imgur.com/AefJJ21.png'
  },
  {
    src: './lib/posts/20170412_preact_firebase.md',
    dest: {
      directory: './bin',
      name: 'server-side-rendering-with-preact-and-firebase'
    },
    title: 'Server-side Rendering With Preact and Firebase',
    date: moment('2017-04-12'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/AdK7X61.png'
  },
  {
    src: './lib/posts/20170420_async_fp.md',
    dest: {
      directory: './bin',
      name: 'basic-functional-programming-with-async-await'
    },
    title: 'Basic Functional Programming With Async/Await',
    date: moment('2017-04-20'),
    tags: ['NodeJS', 'asyncawait'],
    image: 'http://i.imgur.com/pNQZG9E.jpg'
  },
  {
    src: './lib/posts/20170426_nextjs_mongodb.md',
    dest: {
      directory: './bin',
      name: 'building-a-nextjs-app-with-mongodb'
    },
    title: 'Building a Next.js App With MongoDB',
    date: moment('2017-04-26'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/nwQdiR8.jpg'
  },
  {
    src: './lib/posts/20170503_pkg_express.md',
    dest: {
      directory: './bin',
      name: 'standalone-express-apis-binaries-with-pkg'
    },
    title: 'Standalone Express API Binaries with pkg',
    date: moment('2017-05-03'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/oW5ZLCn.png'
  },
  {
    src: './lib/posts/20170509_nextjs_pubnub.md',
    dest: {
      directory: './bin',
      name: 'realtime-chat-with-next-js-and-pubnub'
    },
    title: 'Building a Realtime Chat With Next.js and PubNub',
    date: moment('2017-05-09'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/VUu1pGn.jpg'
  },
  {
    src: './lib/posts/20170516_mongoose_unique_array.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-4.10-unique-in-arrays'
    },
    title: 'What\'s New in Mongoose 4.10: Unique in Arrays',
    date: moment('2017-05-16'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/2Lb4p37.png'
  },
  {
    src: './lib/posts/20170526_async_mocha.md',
    dest: {
      directory: './bin',
      name: 'using-async-await-with-mocha-express-and-mongoose'
    },
    title: 'Using Async/Await with Mocha, Express, and Mongoose',
    date: moment('2017-05-26'),
    tags: ['NodeJS', 'MongoDB', 'asyncawait'],
    previewText: 'How to use async/await with 3 common Node.js modules. Mocha and Mongoose have great support for async/await, Express requires extra work.',
    image: 'http://i.imgur.com/WhnVOcp.png'
  },
  {
    src: './lib/posts/20170602_express_load_balancer.md',
    dest: {
      directory: './bin',
      name: 'building-your-own-load-balancer-with-express-js'
    },
    title: 'Building Your Own Load Balancer with ExpressJS',
    date: moment('2017-06-02'),
    tags: ['NodeJS'],
    image: 'http://i.imgur.com/jxJ08U2.png'
  },
  {
    src: './lib/posts/20170608_mongoose_runSettersOnQuery.md',
    dest: {
      directory: './bin',
      name: 'mongoose-4.10-runSettersOnQuery-option'
    },
    title: 'What\'s New in Mongoose 4.10: The runSettersOnQuery Option',
    date: moment('2017-06-08'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/hnOe2XB.png'
  },
  {
    src: './lib/posts/20170615_partial_unique_indexes.md',
    dest: {
      directory: './bin',
      name: 'enforcing-uniqueness-with-mongodb-partial-unique-indexes'
    },
    title: 'Enforcing Uniqueness With MongoDB Partial Indexes in Node.js',
    date: moment('2017-06-15'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/PC51A3B.png'
  },
  {
    src: './lib/posts/20170707_mongoose_lean_virtuals.md',
    dest: {
      directory: './bin',
      name: 'mongoose-4.11-lean-virtuals'
    },
    title: 'What\'s New in Mongoose 4.11: Virtuals with Lean Queries',
    date: moment('2017-07-07'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/SxVLe41g.png'
  },
  {
    src: './lib/posts/20170714_mongoose_use_mongo_client.md',
    dest: {
      directory: './bin',
      name: 'mongoose-4.11-use-mongo-client'
    },
    title: 'What\'s New in Mongoose 4.11: useMongoClient',
    date: moment('2017-07-14'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/3Ojk94g.jpg'
  },
  {
    src: './lib/posts/20170721_monogram.md',
    dest: {
      directory: './bin',
      name: 'introducing-monogram-the-anti-odm-for-mongodb-nodejs'
    },
    title: 'Introducing Monogram, the Anti-ODM for Node.js and MongoDB',
    date: moment('2017-07-21'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/DrY1SiZ.jpg'
  },
  {
    src: './lib/posts/20170728_importance_of_apis.md',
    dest: {
      directory: './bin',
      name: 'importance-of-apis-in-a-full-stack-world'
    },
    title: 'The Importance of APIs in a Full Stack World',
    date: moment('2017-07-28'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/y6qzPpc.png'
  },
  {
    src: './lib/posts/20170804_express_error_handling.md',
    dest: {
      directory: './bin',
      name: '80-20-guide-to-express-error-handling'
    },
    title: 'The 80/20 Guide to Express Error Handling',
    date: moment('2017-08-04'),
    tags: ['NodeJS'],
    previewText: 'Express supports error handling middleware, which gets called when an error occurs in one of your routes. Here\'s what you need to know.',
    image: 'http://i.imgur.com/xmiL2zE.jpg'
  },
  {
    src: './lib/posts/20170811_rest_api_passwords.md',
    dest: {
      directory: './bin',
      name: 'thoughts-on-user-passwords-in-rest-apis'
    },
    title: 'Thoughts on User Passwords in REST APIs',
    date: moment('2017-08-11'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/xbgdmGo.png'
  },
  {
    src: './lib/posts/20170908_node_mongodb_queueing.md',
    dest: {
      directory: './bin',
      name: 'queueing-function-calls-with-node.js-and-mongodb'
    },
    title: 'Queueing Function Calls with Node.js and MongoDB',
    date: moment('2017-09-08'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'http://i.imgur.com/8ZVJyfD.jpg'
  },
  {
    src: './lib/posts/20170927_node_mongodb_connections.md',
    dest: {
      directory: './bin',
      name: 'managing-connections-with-the-mongodb-node-driver'
    },
    title: 'Managing Connections with the MongoDB Node.js Driver',
    date: moment('2017-09-27'),
    tags: ['NodeJS', 'MongoDB'],
    previewLink: 'Recommendations for how to set up and monitor MongoDB connections in Node.js from the maintainer of Mongoose.',
    image: 'https://i.imgur.com/urAxn05.png'
  },
  {
    src: './lib/posts/20171004_geojson_archetype.md',
    dest: {
      directory: './bin',
      name: 'casting-and-validating-geojson-with-archetype'
    },
    title: 'Casting and Validating GeoJSON With Archetype',
    date: moment('2017-10-04'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/uboKEWQ.jpg'
  },
  {
    src: './lib/posts/20171012_mongoose_single_discriminator.md',
    dest: {
      directory: './bin',
      name: 'mongoose-4.12-single-embedded-discriminators'
    },
    title: 'What\'s New in Mongoose 4.12: Single Embedded Discriminators',
    date: moment('2017-10-12'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/1mS7e2f.jpg'
  },
  {
    src: './lib/posts/20171017_mongoose_reconnect_failed.md',
    dest: {
      directory: './bin',
      name: 'mongoose-4.12-improved-connection-events'
    },
    title: 'What\'s New in Mongoose 4.12: Improved Connection Events',
    date: moment('2017-10-17'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/yMoUYaQ.jpg'
  },
  {
    src: './lib/posts/20171025_mongoose_query_function_error.md',
    dest: {
      directory: './bin',
      name: 'mongoose-4.12-custom-query-function-errors'
    },
    title: 'What\'s New in Mongoose 4.12: Errors for Custom Query Functions',
    date: moment('2017-10-25'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/5iuaDxY.png'
  },
  {
    src: './lib/posts/20171103_promise_mutex.md',
    dest: {
      directory: './bin',
      name: 'mutual-exclusion-patterns-with-node-promises'
    },
    title: 'Mutual Exclusion Patterns with Node.js Promises',
    date: moment('2017-11-02'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/H9gu8x5.png'
  },
  {
    src: './lib/posts/20171109_mongoose_virtual_fn.md',
    dest: {
      directory: './bin',
      name: 'mongoose-4.13-virtual-populate-dynamic-refs-fields'
    },
    title: 'What\'s New In Mongoose 4.13: Dynamic Refs and Fields for Virtual Populate',
    date: moment('2017-11-09'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/CSVk0mm.png'
  },
  {
    src: './lib/posts/20171117_mongoose_aggregate_middleware.md',
    dest: {
      directory: './bin',
      name: 'mongoose-4.13-aggregation-middleware'
    },
    title: 'What\'s New In Mongoose 4.13: Aggregation Middleware',
    date: moment('2017-11-17'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/4qSvIRF.png'
  },
  {
    src: './lib/posts/20171124_monogram_embedding.md',
    dest: {
      directory: './bin',
      name: 'managing-embedded-documents-with-monogram'
    },
    title: 'Managing Embedded Documents with Monogram',
    date: moment('2017-11-24'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/sC2ozYo.png'
  },
  {
    src: './lib/posts/20171201_turf.md',
    dest: {
      directory: './bin',
      name: 'wrangling-geojson-with-turf'
    },
    title: 'Wrangling GeoJSON with Turf.js',
    date: moment('2017-12-01'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/6kP4Bcm.jpg'
  },
  {
    src: './lib/posts/20171229_mongoose_5.md',
    dest: {
      directory: './bin',
      name: 'introducing-mongoose-5'
    },
    title: 'Introducing Mongoose 5.0.0-rc0',
    date: moment('2017-12-29'),
    tags: ['NodeJS', 'MongoDB'],
    image: '/images/mongoose5.png'
  },
  {
    src: './lib/posts/20180105_express_patreon.md',
    dest: {
      directory: './bin',
      name: 'write-your-own-express-from-scratch'
    },
    title: 'Preview: Write Your Own Express.js From Scratch',
    date: moment('2018-01-05'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/siEy12i.png'
  },
  {
    src: './lib/posts/20180112_mongoose_5_middleware.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5-improved-post-hooks'
    },
    title: 'What\'s New in Mongoose 5: Improved Post Hooks',
    date: moment('2018-01-12'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/H7gyZfP.png'
  },
  {
    src: './lib/posts/20180119_mongoose_5_connections.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5-improved-connections'
    },
    title: 'What\'s New in Mongoose 5: Improved Connections',
    date: moment('2018-01-19'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/hv2oVuz.png'
  },
  {
    src: './lib/posts/20180202_mongodb_array_filters.md',
    dest: {
      directory: './bin',
      name: 'a-nodejs-perspective-on-mongodb-36-array-filters'
    },
    title: 'A Node.js Perspective on MongoDB 3.6: Array Filters',
    date: moment('2018-02-02'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/NFzvLez.png'
  },
  {
    src: './lib/posts/20180209_mongodb_change_streams.md',
    dest: {
      directory: './bin',
      name: 'a-nodejs-perspective-on-mongodb-36-change-streams'
    },
    title: 'A Node.js Perspective on MongoDB 3.6: Change Streams',
    date: moment('2018-02-09'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/J2NBMg5.jpg'
  },
  {
    src: './lib/posts/20180216_mongodb_lookup.md',
    dest: {
      directory: './bin',
      name: 'a-nodejs-perspective-on-mongodb-36-lookup-expr'
    },
    title: 'A Node.js Perspective on MongoDB 3.6: $lookup and $expr',
    date: moment('2018-02-16'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/Z0b9D29.jpg'
  },
  {
    src: './lib/posts/20180221_promise_finally.md',
    dest: {
      directory: './bin',
      name: 'using-promise-finally-in-node-js'
    },
    title: 'Using Promise.prototype.finally in Node.js',
    date: moment('2018-02-21'),
    tags: ['NodeJS'],
    previewLink: 'Finally, Node.js promises have an analagous helper to `try/catch/finally`. Here\'s how you can use `Promise#finally()` in Node.js',
    image: 'https://i.imgur.com/oLw5tRE.jpg'
  },
  {
    src: './lib/posts/20180302_glob_matching.md',
    dest: {
      directory: './bin',
      name: 'algorithm-interview-questions-in-js-glob-matching'
    },
    title: 'Algorithm Interview Questions in JavaScript: Glob Matching',
    date: moment('2018-03-02'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/0e7Sa0H.jpg'
  },
  {
    src: './lib/posts/20180309_wine_ml.md',
    dest: {
      directory: './bin',
      name: 'building-a-wine-tasting-neural-network-with-node-js'
    },
    title: 'Building a Wine Tasting Neural Network with Node.js',
    date: moment('2018-03-09'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/EzQ9d8W.png'
  },
  {
    src: './lib/posts/20180316_slink.md',
    dest: {
      directory: './bin',
      name: 'single-link-clustering-with-node-js'
    },
    title: 'Single Link Clustering with Node.js',
    date: moment('2018-03-16'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/NhVPj8B.png'
  },
  {
    src: './lib/posts/20180323_azure.md',
    dest: {
      directory: './bin',
      name: 'getting-started-with-azure-functions-and-mongodb'
    },
    title: 'Getting Started With Azure Functions and MongoDB',
    date: moment('2018-03-23'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://user-images.githubusercontent.com/1620265/37794683-9a8d53de-2de8-11e8-9078-e639d08052bc.png'
  },
  {
    src: './lib/posts/20180330_ibm.md',
    dest: {
      directory: './bin',
      name: 'getting-started-with-ibm-cloud-functions-and-mongodb'
    },
    title: 'Getting Started With IBM Cloud Functions and MongoDB',
    date: moment('2018-03-30'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/nfDBmrx.jpg'
  },
  {
    src: './lib/posts/20180405_promises_from_scratch.md',
    dest: {
      directory: './bin',
      name: 'write-your-own-node-js-promise-library-from-scratch'
    },
    title: 'Write Your Own Node.js Promise Library from Scratch',
    date: moment('2018-04-05'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/dPaWp33.jpg'
  },
  {
    src: './lib/posts/20180425_mongodb_google_cloud.md',
    dest: {
      directory: './bin',
      name: 'getting-started-with-google-cloud-functions-and-mongodb'
    },
    title: 'Getting Started With Google Cloud Functions and MongoDB',
    date: moment('2018-04-25'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/RVPygN1.jpg'
  },
  {
    src: './lib/posts/20180503_async_generators.md',
    dest: {
      directory: './bin',
      name: 'the-difference-between-async-await-and-generators'
    },
    title: 'The Difference Between Async/Await and Generators',
    date: moment('2018-05-03'),
    tags: ['NodeJS', 'asyncawait'],
    image: 'https://i.imgur.com/hrpJBRt.jpg'
  },
  {
    src: './lib/posts/20180508_web_notifications.md',
    dest: {
      directory: './bin',
      name: 'sending-web-push-notifications-from-node-js'
    },
    title: 'Sending Web Push Notifications from Node.js',
    date: moment('2018-05-08'),
    tags: ['NodeJS'],
    previewText: 'End-to-end tutorial describing how to use the web-push npm module to send push notifications to web browsers, including how to set up VAPID keys and service workers.',
    image: 'https://i.imgur.com/YuhERzK.jpg'
  },
  {
    src: './lib/posts/20180516_mongoose_maps.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5.1-map-support'
    },
    title: 'What\'s New in Mongoose 5.1: Map Support',
    date: moment('2018-05-16'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/CaYuCtz.jpg'
  },
  {
    src: './lib/posts/20180524_ripple.md',
    dest: {
      directory: './bin',
      name: 'getting-started-with-ripple-xrp-and-node-js'
    },
    title: 'Getting Started With Ripple (XRP) and Node.js',
    date: moment('2018-05-24'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/jsufHDS.png'
  },
  {
    src: './lib/posts/20180531_acquit.md',
    dest: {
      directory: './bin',
      name: 'announcing-acquit-1-0-0'
    },
    title: 'Announcing Acquit 1.0.0: Generate Docs from Mocha Tests',
    date: moment('2018-05-31'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/b1PMm1t.png'
  },
  {
    src: './lib/posts/20180606_stock_notifications.md',
    dest: {
      directory: './bin',
      name: 'stock-price-notifications-with-mongoose-and-mongodb-change-streams'
    },
    title: 'Stock Price Notifications with Mongoose and MongoDB Change Streams',
    date: moment('2018-06-06'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/BvLogsw.jpg'
  },
  {
    src: './lib/posts/20180614_mastering_async_await.md',
    dest: {
      directory: './bin',
      name: 'new-ebook-mastering-async-await'
    },
    title: 'New Ebook: Mastering Async/Await',
    date: moment('2018-06-14'),
    tags: ['NodeJS', 'asyncawait'],
    image: 'https://i.imgur.com/qDwCRtE.jpg'
  },
  {
    src: './lib/posts/20180621_async_react_redux.md',
    dest: {
      directory: './bin',
      name: 'async-await-with-react-and-redux-thunk'
    },
    title: 'Async/Await with React and Redux using Thunks',
    date: moment('2018-06-21'),
    tags: ['NodeJS', 'asyncawait'],
    previewText: 'Here\'s how you can use async/await with React using the redux-thunk middleware',
    image: 'https://i.imgur.com/98c0ZXR.jpg'
  },
  {
    src: './lib/posts/20180629_run_rs.md',
    dest: {
      directory: './bin',
      name: 'introducing-run-rs-zero-config-mongodb-runner'
    },
    title: 'Introducing run-rs, a Zero Config MongoDB Replica Set Runner',
    date: moment('2018-06-29'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/yFlPczm.png'
  },
  {
    src: './lib/posts/20180702_mongodb_transactions.md',
    dest: {
      directory: './bin',
      name: 'a-node-js-perspective-on-mongodb-4-transactions'
    },
    title: 'A Node.js Perspective on MongoDB 4.0: Transactions',
    date: moment('2018-07-02'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/RrTiade.png'
  },
  {
    src: './lib/posts/20180705_mongoose_sync_indexes.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5-2-syncindexes'
    },
    title: 'What\'s New in Mongoose 5.2.0: syncIndexes()',
    date: moment('2018-07-05'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/jUDmTsd.jpg'
  },
  {
    src: './lib/posts/20180710_fastify_async.md',
    dest: {
      directory: './bin',
      name: 'building-rest-apis-with-async-await-and-fastify'
    },
    title: 'Building REST APIs with Async/Await and Fastify',
    date: moment('2018-07-10'),
    tags: ['NodeJS', 'asyncawait'],
    image: 'https://i.imgur.com/TFlbKfa.jpg'
  },
  {
    src: './lib/posts/20180712_cypress.md',
    dest: {
      directory: './bin',
      name: 'testing-a-vanilla-js-app-with-cypress'
    },
    title: 'Testing a Vanilla JS App with Cypress',
    date: moment('2018-07-12'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/7qgczuu.jpg'
  },
  {
    src: './lib/posts/20180717_async_iterator.md',
    dest: {
      directory: './bin',
      name: 'getting-started-with-async-iterators-in-node-js'
    },
    title: 'Getting Started with Async Iterators in Node.js',
    date: moment('2018-07-17'),
    tags: ['NodeJS', 'asyncawait'],
    image: 'https://i.imgur.com/OdQsoAx.jpg'
  },
  {
    src: './lib/posts/20180719_redux_saga.md',
    dest: {
      directory: './bin',
      name: 'redux-saga-vs-async-await'
    },
    title: 'Redux Saga vs Async/Await',
    date: moment('2018-07-19'),
    tags: ['NodeJS', 'asyncawait'],
    image: 'https://i.imgur.com/Xk3qyn8.jpg'
  },
  {
    src: './lib/posts/20180724_stitch_analytics.md',
    dest: {
      directory: './bin',
      name: 'web-analytics-with-mongodb-stitch'
    },
    title: 'Web Analytics with MongoDB Stitch',
    date: moment('2018-07-24'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://i.imgur.com/zbSgrdq.jpg'
  },
  {
    src: './lib/posts/20180727_service_worker_caching.md',
    dest: {
      directory: './bin',
      name: 'offline-caching-with-service-workers'
    },
    title: 'Offline Caching With Service Workers',
    date: moment('2018-07-27'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/Il2PXsU.png'
  },
  {
    src: './lib/posts/20180803_destructuring.md',
    dest: {
      directory: './bin',
      name: 'an-overview-of-destructuring-assignments-in-node-js'
    },
    title: 'An Overview of Destructuring Assignments in Node.js',
    date: moment('2018-08-03'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/Bejggnu.jpg'
  },
  {
    src: './lib/posts/20180814_buffers.md',
    dest: {
      directory: './bin',
      name: 'an-overview-of-buffers-in-node-js'
    },
    title: 'An Overview of Buffers in Node.js',
    date: moment('2018-08-14'),
    tags: ['NodeJS'],
    image: 'https://i.imgur.com/Lo6aVkP.jpg'
  },
  {
    src: './lib/posts/20180828_stitch.md',
    dest: {
      directory: './bin',
      name: 'building-a-serverless-app-with-mongodb-stitch'
    },
    title: 'Building a Serverless App with MongoDB Stitch',
    date: moment('2018-08-28'),
    tags: ['MongoDB'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/matterhorn.jpeg'
  },
  {
    src: './lib/posts/20180831_await_express.md',
    dest: {
      directory: './bin',
      name: 'introducing-await-js-express-async-support-for-express-apps'
    },
    title: 'Introducing Awaitjs-Express: Async Function Support for Express',
    date: moment('2018-08-31'),
    tags: ['NodeJS', 'asyncawait'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/waterfalls20180831.jpeg'
  },
  {
    src: './lib/posts/20180911_bigint.md',
    dest: {
      directory: './bin',
      name: 'an-overview-of-bigint-in-node-js'
    },
    title: 'An Overview of BigInt in Node.js',
    date: moment('2018-09-11'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/mountains20180911.jpeg'
  },
  {
    src: './lib/posts/20180913_driver_upgrade.md',
    dest: {
      directory: './bin',
      name: 'using-monogram-to-upgrade-from-mongodb-node-driver-2-to-3'
    },
    title: 'Using Monogram to Upgrade From MongoDB Node Driver 2.x to 3.x',
    date: moment('2018-09-13'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/sewing20180913.jpeg'
  },
  {
    src: './lib/posts/20180918_changelog.md',
    dest: {
      directory: './bin',
      name: 'keeping-a-changelog-in-nodejs'
    },
    title: 'Keeping a Changelog in Node.js',
    date: moment('2018-09-18'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/history20180918.jpeg'
  },
  {
    src: './lib/posts/20180925_lambda_webpack.md',
    dest: {
      directory: './bin',
      name: 'bundling-a-node-js-function-for-aws-lambda-with-webpack'
    },
    title: 'Bundling a Node.js Function for AWS Lambda with Webpack',
    date: moment('2018-09-25'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20180925_motorcycle.jpeg'
  },
  {
    src: './lib/posts/20180927_redux_observable.md',
    dest: {
      directory: './bin',
      name: 'a-beginners-guide-to-redux-observable'
    },
    title: 'A Beginner\'s Guide to Redux-Observable',
    date: moment('2018-09-27'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/photo20180828.jpeg'
  },
  {
    src: './lib/posts/20181003_mongoose_53_part_1.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-53-orfail-and-global-toobject'
    },
    title: 'What\'s New in Mongoose 5.3: `orFail()` and Global `toObject` Options',
    date: moment('2018-10-03'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20181003_mongoose.jpeg'
  },
  {
    src: './lib/posts/20181011_mongoose_53_part_2.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-53-async-iterators'
    },
    title: 'What\'s New in Mongoose 5.3: Async Iterators',
    date: moment('2018-10-11'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20181011_stairs.jpeg'
  },
  {
    src: './lib/posts/20181025_qr_code.md',
    dest: {
      directory: './bin',
      name: 'creating-qr-codes-with-node-js'
    },
    title: 'Creating and Reading QR Codes with Node.js',
    date: moment('2018-10-25'),
    tags: ['NodeJS'],
    previewText: 'A tutorial explaining how you can use the `qrcode` npm module to create and read QR codes in Node.js',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20181025_ipad.jpeg'
  },
  {
    src: './lib/posts/20181102_preact_form.md',
    dest: {
      directory: './bin',
      name: 'building-a-form-with-preact'
    },
    title: 'Building a Form with Preact',
    date: moment('2018-11-02'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20181102_checkbox.jpeg'
  },
  {
    src: './lib/posts/20181107_static_properties.md',
    dest: {
      directory: './bin',
      name: 'static-properties-in-javascript-with-inheritance'
    },
    title: 'Static Properties in JavaScript Classes with Inheritance',
    date: moment('2018-11-07'),
    tags: ['NodeJS'],
    previewText: 'What happens with static properties using ES6 class inheritance? This article describes a common gotcha.',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20181107_oldcar.jpg'
  },
  {
    src: './lib/posts/20181114_stripe_preact.md',
    dest: {
      directory: './bin',
      name: 'accepting-credit-cards-with-stripe-elements-and-preact'
    },
    title: 'Accepting Credit Cards with Stripe Elements and Preact',
    date: moment('2018-11-14'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/cc.jpeg'
  },
  {
    src: './lib/posts/20181129_lessons.md',
    dest: {
      directory: './bin',
      name: '10-lessons-from-my-20s'
    },
    title: '10 Lessons from My 20\'s',
    date: moment('2018-11-29'),
    tags: [],
    image: 'https://s3.amazonaws.com/codebarbarian-images/hmb.jpeg'
  },
  {
    src: './lib/posts/20181203_mongoose_security.md',
    dest: {
      directory: './bin',
      name: 'mongoose-prototype-pollution-vulnerability-disclosure'
    },
    title: 'Mongoose Prototype Pollution Vulnerability Disclosure',
    date: moment('2018-12-03'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/tiger.jpeg'
  },
  {
    src: './lib/posts/20190103_mongoose_54.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-54-global-schematype-configuration'
    },
    title: 'What\'s New in Mongoose 5.4: Global SchemaType Configuration',
    date: moment('2019-01-03'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190103_globe.jpeg'
  },
  {
    src: './lib/posts/20190108_async_stack_trace.md',
    dest: {
      directory: './bin',
      name: 'async-stack-traces-in-node-js-12'
    },
    title: 'Async Stack Traces in Node.js 12',
    date: moment('2019-01-08'),
    tags: ['NodeJS'],
    previewText: 'Node.js 12 includes experimental support for async stack traces, so no more stack traces that end with `nextTick()`. Here\'s what you need to know.',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20180108_ships.jpg'
  },
  {
    src: './lib/posts/20190114_mongoose_events.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-54-model-events-and-populate-count'
    },
    title: 'What\'s New in Mongoose 5.4: Model Events and Populate Count',
    date: moment('2019-01-14'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190114_provence.jpg'
  },
  {
    src: './lib/posts/20190122_string_to_number.md',
    dest: {
      directory: './bin',
      name: 'convert-a-string-to-a-number-in-javascript'
    },
    title: 'Convert a String to a Number in JavaScript',
    date: moment('2019-01-22'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190122.jpg'
  },
  {
    src: './lib/posts/20190129_rest_assign.md',
    dest: {
      directory: './bin',
      name: 'object-assign-vs-object-spread'
    },
    title: 'Object.assign vs Object Spread in Node.js',
    date: moment('2019-01-29'),
    tags: ['NodeJS'],
    previewText: 'JavaScript\'s Object.assign() function is similar to the spread operator `...`. Which one should you use?',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190128_beaver_creek.jpg'
  },
  {
    src: './lib/posts/20190205_es2019.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-es2019-flat-flatmap-catch'
    },
    title: 'What\'s New in ES2019: Array flat and flatMap, Object.fromEntries',
    date: moment('2019-02-05'),
    tags: ['NodeJS'],
    previewText: 'The 2019 edition of the JavaScript language spec includes 2 new Array methods and a new function for creating objects. Here\'s what you need to know.',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190205_cocoa_beach.jpg'
  },
  {
    src: './lib/posts/20190212_archetype_string.md',
    dest: {
      directory: './bin',
      name: 'convert-values-to-strings-in-javascript-with-archetype'
    },
    title: 'Convert Values to Strings in JavaScript with Archetype',
    date: moment('2019-02-12'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190207_statue.jpeg'
  },
  {
    src: './lib/posts/20190220_loops.md',
    dest: {
      directory: './bin',
      name: 'for-vs-for-each-vs-for-in-vs-for-of-in-javascript'
    },
    title: 'For vs forEach() vs for/in vs for/of in JavaScript',
    date: moment('2019-02-20'),
    tags: ['NodeJS'],
    previewText: 'There are 4 different ways to iterate through an array in JavaScript: `for`, `forEach`, `for/in`, `for/of`. What are the tradeoffs between them?',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190220_montenegro.jpg'
  },
  {
    src: './lib/posts/20190226_mongoose_find.md',
    dest: {
      directory: './bin',
      name: 'how-find-works-in-mongoose'
    },
    title: 'How find() Works in Mongoose',
    date: moment('2019-02-26'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'What actually happens when you call `find()` in Mongoose? This tutorial describes how to use `find()` and explains some common causes of confusion.',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190226_plitvice.jpg'
  },
  {
    src: './lib/posts/20190305_es6_class.md',
    dest: {
      directory: './bin',
      name: 'an-overview-of-es6-classes'
    },
    title: 'An Overview of ES6 Classes',
    date: moment('2019-03-05'),
    tags: ['NodeJS'],
    previewText: 'A practical introduction to ES6 classes, including statics, methods, getters, setters, and inheritance. Also explains how ES6 class inheritance differs from Node.js\' util.inherits().',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190305_napa.jpg'
  },
  {
    src: './lib/posts/20190312_vue_form.md',
    dest: {
      directory: './bin',
      name: 'building-a-form-with-vue'
    },
    title: 'Building a Form with Vue.js',
    date: moment('2019-03-12'),
    tags: ['NodeJS', 'Vue'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190309_switzerland.jpg'
  },
  {
    src: './lib/posts/20190321_string_replace.md',
    dest: {
      directory: './bin',
      name: 'string-replace-in-javascript'
    },
    title: 'String Replace in JavaScript',
    date: moment('2019-03-21'),
    tags: ['NodeJS'],
    previewLink: 'An in-depth overview of how to replace part of a string with another string in JavaScript, from basic substitutions to replacement patterns and custom replacement functions.',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190321_alta.jpg'
  },
  {
    src: './lib/posts/20190326_npm.md',
    dest: {
      directory: './bin',
      name: 'an-introduction-to-npm'
    },
    title: 'An Introduction to npm',
    date: moment('2019-03-26'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190326_cdm.jpg'
  },
  {
    src: './lib/posts/20190402_npx.md',
    dest: {
      directory: './bin',
      name: '80-20-guide-to-the-npx-package-runner'
    },
    title: 'The 80/20 Guide to npx',
    date: moment('2019-04-02'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190402_npx.jpg'
  },
  {
    src: './lib/posts/20190412_mongoose_55.md',
    dest: {
      directory: './bin',
      name: 'mongoose-5-5-static-hooks-and-populate-match-functions'
    },
    title: 'What\'s New in Mongoose 5.5: Static Hooks, Populate Match Functions',
    date: moment('2019-04-12'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190412_alta.jpg'
  },
  {
    src: './lib/posts/20190426_node_12_imports.md',
    dest: {
      directory: './bin',
      name: 'nodejs-12-imports'
    },
    title: 'What\'s New in Node.js 12: ESM Imports',
    date: moment('2019-04-25'),
    tags: ['NodeJS'],
    previewText: 'Node.js 12 introduced experimental support for ES6 imports. Here\'s how you can use imports in Node.js.',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190425_breck.jpg'
  },
  {
    src: './lib/posts/20190506_mongodb_slow_trains.md',
    dest: {
      directory: './bin',
      name: 'slow-trains-in-mongodb-and-nodejs'
    },
    title: 'Slow Trains in MongoDB and Node.js',
    date: moment('2019-05-06'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190506_train.jpeg'
  },
  {
    src: './lib/posts/20190514_private_class.md',
    dest: {
      directory: './bin',
      name: 'nodejs-12-private-class-fields'
    },
    title: 'What\'s New in Node.js 12: Private Class Fields',
    date: moment('2019-05-14'),
    tags: ['NodeJS'],
    previewLink: 'Node.js 12 introduced support for private class fields, a new feature in ES2020. Here\'s how you can use private class fields in Node.js.',
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190514_arista.jpg'
  },
  {
    src: './lib/posts/20190522_promises.md',
    dest: {
      directory: './bin',
      name: 'the-80-20-guide-to-promises-in-node-js'
    },
    title: 'The 80/20 Guide to Promises in Node.js',
    date: moment('2019-05-22'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190522_surf.jpeg'
  },
  {
    src: './lib/posts/20190528_json_stringify.md',
    dest: {
      directory: './bin',
      name: 'the-80-20-guide-to-json-stringify-in-javascript'
    },
    title: 'The 80/20 Guide to JSON.stringify in JavaScript',
    date: moment('2019-05-28'),
    tags: ['NodeJS'],
    image: 'https://s3.amazonaws.com/codebarbarian-images/20190528_hbp.jpg'
  },
  {
    src: './lib/posts/20190605_vue_puppeteer.md',
    dest: {
      directory: './bin',
      name: 'testing-vue-apps-with-puppeteer-and-mocha'
    },
    title: 'Testing Vue Apps with Puppeteer and Mocha',
    date: moment('2019-06-05'),
    tags: ['NodeJS', 'Vue'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/20190605_geneva.jpg'
  },
  {
    src: './lib/posts/20190611_arrays.md',
    dest: {
      directory: './bin',
      name: 'the-80-20-guide-to-javascript-arrays'
    },
    title: 'The 80/20 Guide to JavaScript Arrays',
    date: moment('2019-06-11'),
    tags: ['NodeJS'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/20190611_bijela.jpg'
  },
  {
    src: './lib/posts/20190618_mongoose_immutable.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5-6-immutable-properties'
    },
    title: 'What\'s New in Mongoose 5.6.0: Immutable Properties',
    date: moment('2019-06-18'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/20190618_mountain.jpeg'
  },
  {
    src: './lib/posts/20190627_async_function.md',
    dest: {
      directory: './bin',
      name: 'async-functions-in-javascript'
    },
    title: 'Async Functions in JavaScript',
    date: moment('2019-06-26'),
    tags: ['NodeJS', 'asyncawait'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/20190627_pacifica.jpg'
  },
  {
    src: './lib/posts/20190709_async_error.md',
    dest: {
      directory: './bin',
      name: 'async-await-error-handling-in-javascript'
    },
    title: 'Async Await Error Handling in JavaScript',
    date: moment('2019-07-09'),
    tags: ['NodeJS', 'asyncawait'],
    previewLink: '3 design patterns for handling errors in async functions, and recommendations for which patterns to use when.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/20190709_sfba.jpg'
  },
  {
    src: './lib/posts/20190723_puppeteer.md',
    dest: {
      directory: './bin',
      name: 'control-chrome-from-node-js-with-puppeteer'
    },
    title: 'Control Chrome from Node.js with Puppeteer',
    date: moment('2019-07-23'),
    tags: ['NodeJS'],
    previewText: 'Puppeteer is Google\'s official npm module for controlling Chrome from Node.js. Here\'s how you can use Puppeteer to interact with a live browser from Node.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/20190722_bigsky.jpg'
  },
  {
    src: './lib/posts/20190807_async_generator.md',
    dest: {
      directory: './bin',
      name: 'async-generator-functions-in-javascript'
    },
    title: 'Async Generator Functions in JavaScript',
    date: moment('2019-08-07'),
    tags: ['NodeJS'],
    previewText: 'JavaScript has generator functions and async functions, so why does it need async generator functions? Here\'s how async generator functions work and why you should care.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/bigsky2.jpg'
  },
  {
    src: './lib/posts/20190828_symbols.md',
    dest: {
      directory: './bin',
      name: 'a-practical-guide-to-symbols-in-javascript'
    },
    title: 'A Practical Guide to Symbols in JavaScript',
    date: moment('2019-08-28'),
    tags: ['NodeJS'],
    previewText: 'Symbols, what are they good for? Here\'s some practical examples of what symbols are useful for in JavaScript.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/sfba.jpg'
  },
  {
    src: './lib/posts/20190911_mongoose_57.md',
    dest: {
      directory: './bin',
      name: 'mongoose-5-7-conditional-immutability-document-array-perf'
    },
    title: 'What\'s New in Mongoose 5.7: Conditional Immutability, Faster Document Arrays',
    date: moment('2019-09-11'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/nj.jpg'
  },
  {
    src: './lib/posts/20190918_javascript_map.md',
    dest: {
      directory: './bin',
      name: 'the-80-20-guide-to-maps-in-javascript'
    },
    title: 'The 80/20 Guide to Maps in JavaScript',
    date: moment('2019-09-18'),
    tags: ['NodeJS'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/201909_globe.jpeg'
  },
  {
    src: './lib/posts/20191009_mongoose_schema.md',
    dest: {
      directory: './bin',
      name: 'mongoose-schema-design-pattern-store-what-you-query-for'
    },
    title: 'Mongoose Design Pattern: Store What You Query For',
    date: moment('2019-10-09'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/sba.jpg'
  },
  {
    src: './lib/posts/20191016_svg.md',
    dest: {
      directory: './bin',
      name: 'the-80-20-guide-to-svgs-in-javascript'
    },
    title: 'The 80/20 Guide to SVGs in JavaScript',
    date: moment('2019-10-16'),
    tags: ['NodeJS'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/ca.jpg'
  },
  {
    src: './lib/posts/20191023_moment.md',
    dest: {
      directory: './bin',
      name: 'formatting-javascript-dates-with-moment-js'
    },
    title: 'Formatting JavaScript Dates with Moment.js',
    date: moment('2019-10-23'),
    tags: ['NodeJS'],
    previewText: 'A tutorial about how to format date strings with Moment.js, with numerous examples.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/pebblebeach.jpg'
  },
  {
    src: './lib/posts/20191106_prototype.md',
    dest: {
      directory: './bin',
      name: 'understanding-prototype-inheritance-in-javascript'
    },
    title: 'Understanding JavaScript\'s Prototype-Based Inheritance',
    date: moment('2019-11-06'),
    tags: ['NodeJS'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/carmel.jpg'
  },
  {
    src: './lib/posts/20191113_javascript_interview_questions.md',
    dest: {
      directory: './bin',
      name: 'my-3-favorite-javascript-interview-questions'
    },
    title: 'My 3 Favorite JavaScript Interview Questions',
    date: moment('2019-11-13'),
    tags: ['NodeJS'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/IMG_20190921_134034.jpg'
  },
  {
    src: './lib/posts/20191224_mongoose_58.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-58-schema-pick-and-better-stack-traces'
    },
    title: 'What\'s New in Mongoose 5.8: `Schema#pick()` and Better Stack Traces',
    date: moment('2019-12-24'),
    tags: [],
    image: 'https://codebarbarian-images.s3.amazonaws.com/carneros.jpg'
  },
  {
    src: './lib/posts/20200107_remote_work.md',
    dest: {
      directory: './bin',
      name: 'why-i-work-remotely'
    },
    title: 'Why I Work Remotely',
    date: moment('2020-01-07'),
    tags: [],
    image: 'https://codebarbarian-images.s3.amazonaws.com/20190611_bijela.jpg'
  },
  {
    src: './lib/posts/20200114_oauth.md',
    dest: {
      directory: './bin',
      name: 'oauth-with-node-js-and-express'
    },
    title: 'Implementing an OAuth Server With Node.js and Express',
    date: moment('2020-01-15'),
    tags: ['NodeJS'],
    previewText: 'A tutorial describing how to build a minimal OAuth server with Node.js and Express.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/npb.jpg'
  },
  {
    src: './lib/posts/20200121_jsx.md',
    dest: {
      directory: './bin',
      name: 'overview-of-jsx-with-non-react-examples'
    },
    title: 'An Overview of JSX With 3 Non-React Examples',
    date: moment('2020-01-21'),
    tags: ['NodeJS'],
    previewText: 'JSX is an extension of the JavaScript language that supports XML-like syntax. While JSX is usually used for React, it doesn\'t have to be - here\'s 3 examples that don\'t involve React.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/southpointe.jpg'
  },
  {
    src: './lib/posts/20200129_github_streak.md',
    dest: {
      directory: './bin',
      name: '1000-days-of-code-lessons-from-4-year-github-streak'
    },
    title: '1000 Days of Code: Lessons from a 4 Year GitHub Streak',
    date: moment('2020-01-29'),
    tags: ['NodeJS'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/lone.png'
  },
  {
    src: './lib/posts/20200204_facebook_login.md',
    dest: {
      directory: './bin',
      name: 'passport-free-facebook-login-with-node-js'
    },
    title: 'Passport-Free Facebook Login with Node.js',
    date: moment('2020-02-04'),
    tags: ['NodeJS'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/sb.jpg'
  },
  {
    src: './lib/posts/20200218_geojson.md',
    dest: {
      directory: './bin',
      name: 'a-practical-introduction-to-geojson-with-node-js'
    },
    title: 'A Practical Introduction to GeoJSON with Node.js',
    date: moment('2019-02-17'),
    tags: ['NodeJS'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/cascades.JPG'
  },
  {
    src: './lib/posts/20200226_mongodb_indexes.md',
    dest: {
      directory: './bin',
      name: 'when-should-you-use-mongodb-indexes'
    },
    title: 'When Should You Use MongoDB Indexes?',
    date: moment('2020-02-26'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/washington2.JPG'
  },
  {
    src: './lib/posts/20200304_github_app.md',
    dest: {
      directory: './bin',
      name: 'building-a-github-app-with-node-js'
    },
    title: 'Building a GitHub App With Node.js',
    date: moment('2020-03-04'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'GitHub apps let you get webhook notifications for all activity on a GitHub repo, and perform automated checks. Here\'s a tutorial showing how to build a GitHub app from scratch.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/cascades2.jpg'
  },
  {
    src: './lib/posts/20200311_mongoose_59.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-59-schematype-default-options-and-per-document-populate'
    },
    title: 'What\'s New in Mongoose 5.9: SchemaType Default Options and Better Populate Limit',
    date: moment('2020-03-11'),
    tags: ['NodeJS', 'MongoDB'],
    image: 'https://codebarbarian-images.s3.amazonaws.com/utah-sunrise.jpg'
  },
  {
    src: './lib/posts/20200317_wfh.md',
    dest: {
      directory: './bin',
      name: 'tips-and-tricks-for-working-from-home'
    },
    title: 'Tips and Tricks for Working From Home',
    date: moment('2020-03-17'),
    tags: [],
    image: 'https://codebarbarian-images.s3.amazonaws.com/placitas.jpg'
  },
  {
    src: './lib/posts/20200324_codemirror.md',
    dest: {
      directory: './bin',
      name: 'building-a-code-editor-with-codemirror'
    },
    title: 'Building a Code Editor with CodeMirror',
    date: moment('2020-03-24'),
    tags: [],
    previewText: 'CodeMirror is a popular text editor library for the browser. Here\'s how you can get started using CodeMirror.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/dubrovnik.jpg'
  },
  {
    src: './lib/posts/20200331_github_oauth.md',
    dest: {
      directory: './bin',
      name: 'github-oauth-login-with-node-js'
    },
    title: 'GitHub OAuth Login with Node.js',
    date: moment('2020-03-31'),
    tags: ['NodeJS'],
    previewText: 'GitHub OAuth lets you build apps that take action on behalf of users. Here\'s how you can build your own basic GitHub OAuth app with GitHub login.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/montenegro-island.jpg'
  },
  {
    src: './lib/posts/20200408_node_pdf.md',
    dest: {
      directory: './bin',
      name: 'working-with-pdfs-in-node-js'
    },
    title: 'Working With PDFs in Node.js Using pdf-lib',
    date: moment('2020-04-08'),
    tags: ['NodeJS'],
    previewText: 'The pdf-lib npm module makes it easy to create and modify PDFs, including combining two PDFs and adding page numbers. Here\'s what you need to know.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/hmb-2017.jpg'
  },
  {
    src: './lib/posts/20200415_route_53.md',
    dest: {
      directory: './bin',
      name: 'working-aws-route-53-in-node-js'
    },
    title: 'Working With AWS Route 53 in Node.js',
    date: moment('2020-04-15'),
    tags: ['NodeJS'],
    previewText: 'Route 53 is AWS\' URL management tool. Here\'s how you can use Route 53 to add and remove subdomains using Node.js.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/naples.jpg'
  },
  {
    src: './lib/posts/20200423_tojson.md',
    dest: {
      directory: './bin',
      name: 'what-is-the-tojson-function-in-javascript'
    },
    title: 'What is the `toJSON()` Function in JavaScript?',
    date: moment('2020-04-23'),
    tags: ['NodeJS'],
    previewText: 'The `toJSON()` function is a handy hook that tells `JSON.stringify()` how to represent a given object in JSON. Here\'s what you need to know.',
    image: '/images/hmb3.jpg'
  },
  {
    src: './lib/posts/20200428_reduce.md',
    dest: {
      directory: './bin',
      name: 'javascript-reduce-in-5-examples'
    },
    title: 'Understand JavaScript Reduce With 5 Examples',
    date: moment('2020-04-28'),
    tags: ['NodeJS'],
    previewText: 'Here\'s 5 examples to help you understand how to use `Array#reduce()` in JavaScript, including 4 common use cases and one not-so-common use case.',
    image: '/images/tahoe.jpg'
  },
  {
    src: './lib/posts/20200512_node_epub.md',
    dest: {
      directory: './bin',
      name: 'creating-epub-files-with-node-js'
    },
    title: 'Creating ePub Files with Node.js',
    date: moment('2020-05-12'),
    tags: ['NodeJS'],
    previewText: 'ePub is a common format for eBook readers. Here\'s how you can use the epub-gen npm module to create an ePub from an HTML file.',
    image: '/images/southpointe2.jpg'
  },
  {
    src: './lib/posts/20200519_node_stripe.md',
    dest: {
      directory: './bin',
      name: 'accepting-stripe-payments-with-node-js'
    },
    title: 'Accepting Stripe Payments with Node.js',
    date: moment('2020-05-19'),
    tags: ['NodeJS'],
    previewText: 'Accepting payments with Stripe is easy with Node.js. Here\'s how you can accept payment, verify the payment, and send a confirmation.',
    image: '/images/misson-peak.jpg'
  },
  {
    src: './lib/posts/20200528_mastering_mongoose.md',
    dest: {
      directory: './bin',
      name: 'new-ebook-mastering-mongoose'
    },
    title: 'New eBook: Mastering Mongoose',
    date: moment('2020-05-28'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'An introduction to Mastering Mongoose, the official Mongoose eBook.',
    image: '/images/hb2.jpeg'
  },
  {
    src: './lib/posts/20200609_moment_timezone.md',
    dest: {
      directory: './bin',
      name: 'a-practical-guide-to-moment-timezone'
    },
    title: 'A Practical Guide to moment-timezone',
    date: moment('2020-06-09'),
    tags: ['NodeJS'],
    previewText: 'An introduction to moment-timezone, the library for formatting dates in any timezone in Node.js.',
    image: '/images/jc.jpg'
  },
  {
    src: './lib/posts/20200616_curl.md',
    dest: {
      directory: './bin',
      name: 'what-javascript-developers-should-know-about-curl'
    },
    title: 'What JavaScript Developers Should Know About Curl',
    date: moment('2020-06-16'),
    tags: ['NodeJS'],
    previewText: 'Curl is a popular command-line HTTP client that comes bundled with OSX and most common Linux distros. Here\'s what you need to know about curl as a Node.js developer.',
    image: '/images/aspen2.jpg'
  },
  {
    src: './lib/posts/20200623_rubber_duck_debugging.md',
    dest: {
      directory: './bin',
      name: 'rubber-duck-debugging-for-javascript-developers'
    },
    title: 'Rubber Duck Debugging For JavaScript Developers',
    date: moment('2020-06-23'),
    tags: ['NodeJS'],
    previewText: 'Rubber duck debugging is a helpful debugging technique that asks you to explain the problem in detail, and often helps you find the fix faster. Here\'s what you need to know.',
    image: '/images/batman-duck.jpeg'
  },
  {
    src: './lib/posts/20200702_mailgun.md',
    dest: {
      directory: './bin',
      name: 'sending-emails-using-the-mailgun-api'
    },
    title: 'Sending Emails from Node.js Using the Mailgun API',
    date: moment('2020-07-02'),
    tags: ['NodeJS'],
    previewText: 'Mailgun is my go-to tool for sending emails from Node.js. Here\'s how you can use Mailgun to send emails.',
    image: '/images/sobe3.jpg'
  },
  {
    src: './lib/posts/20200721_zip.md',
    dest: {
      directory: './bin',
      name: 'working-with-zip-files-in-node-js'
    },
    title: 'Working with Zip Files in Node.js',
    date: moment('2020-07-21'),
    tags: ['NodeJS'],
    previewText: 'The adm-zip npm module makes it easy to create, extract, and update zip files in Node.js. Here\'s what you need to know.',
    image: '/images/zagreb.jpg'
  },
  {
    src: './lib/posts/20200728_slack.md',
    dest: {
      directory: './bin',
      name: 'working-with-the-slack-api-in-node-js'
    },
    title: 'Working with the Slack API in Node.js',
    date: moment('2020-07-28'),
    tags: ['NodeJS'],
    previewText: 'Here\'s how you can use Node.js to send messages to Slack.',
    image: '/images/nyc2.jpg'
  },
  {
    src: './lib/posts/20200805_cli.md',
    dest: {
      directory: './bin',
      name: 'building-a-cli-tool-with-node-js'
    },
    title: 'Building a CLI Tool with Node.js',
    date: moment('2020-08-06'),
    tags: ['NodeJS'],
    previewText: 'Here\'s how you can use Node.js to build a CLI for Slack.',
    image: '/images/baysunrise.jpg'
  },
  {
    src: './lib/posts/20200826_mongoose_510.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5-10-improved-transactions'
    },
    title: 'What\'s New in Mongoose 5.10: Improved Transactions',
    date: moment('2020-08-26'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 5.10 introduces a new `transaction()` function that handles resetting document state if a transaction fails. Here\'s what you need to know.',
    image: '/images/shore.jpg'
  },
  {
    src: './lib/posts/20200902_mongoose_510_concurrency.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5-10-optimistic-concurrency'
    },
    title: 'What\'s New in Mongoose 5.10: Optimistic Concurrency',
    date: moment('2020-09-02'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 5.10 introduces a new `optimisticConcurrency` option that enables a more strict form of document versioning. Here\'s what you need to know.',
    image: '/images/biltmore.jpg'
  },
  {
    src: './lib/posts/20200910_mongoose_510_subdocs.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5-10-global-subdocument-configs'
    },
    title: 'What\'s New in Mongoose 5.10: Global Subdocument Configuration',
    date: moment('2020-09-10'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 5.10 introduces the ability to set subdocument schematype options globally, like disabling `_id` for all document arrays. Here\'s what you need to know.',
    image: '/images/nc.jpg'
  },
  {
    src: './lib/posts/20200915_node_cli_oauth.md',
    dest: {
      directory: './bin',
      name: 'oauth-in-nodejs-cli-apps'
    },
    title: 'OAuth in Node.js CLI Apps',
    date: moment('2020-09-15'),
    tags: ['NodeJS'],
    previewText: 'OAuth is a popular tool for logging in to web apps, but Node makes it easy to use OAuth for CLI apps too. Here\'s how you can add OAuth support to a Slack CLI app.',
    image: '/images/lakej.jpg'
  },
  {
    src: './lib/posts/20200923_json_stringify_pretty.md',
    dest: {
      directory: './bin',
      name: 'pretty-json-stringify-output'
    },
    title: 'Pretty `JSON.stringify()` Output in JavaScript',
    date: moment('2020-09-23'),
    tags: ['NodeJS'],
    previewText: 'By default, `JSON.stringify()` output is hard to read: no formatting, no colors. Here\'s how you can make `JSON.stringify()` output more readable.',
    image: '/images/shore2.jpg'
  },
  {
    src: './lib/posts/20201007_async_generator_websocket.md',
    dest: {
      directory: './bin',
      name: 'async-generator-functions-and-websockets-in-node-js'
    },
    title: 'Async Generator Functions and Websockets in Node.js',
    date: moment('2020-10-07'),
    tags: ['NodeJS'],
    previewText: 'By default, `JSON.stringify()` output is hard to read: no formatting, no colors. Here\'s how you can make `JSON.stringify()` output more readable.',
    image: '/images/shore3.jpg'
  },
  {
    src: './lib/posts/20201027_mongoose_typescript.md',
    dest: {
      directory: './bin',
      name: 'working-with-mongoose-in-typescript'
    },
    title: 'Working with Mongoose in TypeScript',
    date: moment('2020-10-25'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose is the most popular ODM for Node.js and MongoDB. Here\'s a survey of different patterns for using Mongoose with TypeScript.',
    image: '/images/keybiscayne.jpg'
  },
  {
    src: './lib/posts/20201111_vue_node_static.md',
    dest: {
      directory: './bin',
      name: 'using-vue-as-a-node-js-static-site-generator'
    },
    title: 'Using Vue as a Node.js Static Site Generator',
    date: moment('2020-11-10'),
    tags: ['NodeJS'],
    previewText: 'Here\'s how you can build a static site blog using vanilla Vue and Node.js.',
    image: '/images/naples.jpg'
  },
  {
    src: './lib/posts/20201209_mongoose_511_cast.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5-11-custom-casting-for-paths'
    },
    title: 'What\'s New in Mongoose 5.11: Custom Casting for Paths',
    date: moment('2020-12-09'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 5.11 lets you define custom casting logic for individual paths in your schema. Here\'s what you need to know.',
    image: '/images/keybiscayne3.jpg'
  },
  {
    src: './lib/posts/20210105_aspect_oriented.md',
    dest: {
      directory: './bin',
      name: 'practical-aspect-oriented-programming-in-javascript'
    },
    title: 'Practical Aspect Oriented Programming in JavaScript',
    date: moment('2021-01-05'),
    tags: ['NodeJS'],
    previewText: 'Aspect oriented programming is a paradigm that a lot of JavaScript frameworks borrow from, but there\'s no definitive way to do aspect oriented programming in JavaScript yet. Here\'s an idea for how you can think of aspect oriented programming in a JavaScript-ey way.',
    image: '/images/keybiscayne4.jpg'
  },
  {
    src: './lib/posts/20210212_kafka.md',
    dest: {
      directory: './bin',
      name: 'getting-started-with-apache-kafka-in-node-js'
    },
    title: 'Getting Started with Apache Kafka in Node.js',
    date: moment('2021-02-11'),
    tags: ['NodeJS'],
    previewText: 'Kafka is a powerful distributed pub/sub platform that is popular in large organizations. Here\'s how you can get started with Kafka in Node.js using the KafkaJS npm module.',
    image: '/images/was3.jpg'
  },
  {
    src: './lib/posts/20210224_protobuf.md',
    dest: {
      directory: './bin',
      name: 'working-with-protobufs-in-node-js'
    },
    title: 'Working with Protobufs in Node.js',
    date: moment('2021-02-24'),
    tags: ['NodeJS'],
    previewText: 'Kafka is a powerful distributed pub/sub platform that is popular in large organizations. Here\'s how you can get started with Kafka in Node.js using the KafkaJS npm module.',
    image: '/images/dv.jpeg'
  },
  {
    src: './lib/posts/20210324_mongoose_512_transform.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5-12-populate-transform'
    },
    title: 'What\'s New in Mongoose 5.12: Populate Transform',
    date: moment('2021-03-24'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 5.12 introduces a new `transform` option for `populate()` that lets you register a function that Mongoose will call on every populated document. Here\'s what you need to know.',
    image: 'https://images.unsplash.com/photo-1512572525676-f9b59951929e?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1852&q=80'
  },
  {
    src: './lib/posts/20210421_mongoose_internals_schema.md',
    dest: {
      directory: './bin',
      name: 'mongoose-internals-schemas-options-models'
    },
    title: 'Mongoose Internals: Schemas, Schema Options, and Models',
    date: moment('2021-04-21'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Looking to start contributing to Mongoose but don\'t know where to start? Check out this series.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/dv1.jpg'
  },
  {
    src: './lib/posts/20210614_mongoose_internals_change_tracking.md',
    dest: {
      directory: './bin',
      name: 'mongoose-internals-schemas-options-models'
    },
    title: 'Mongoose Internals: Compiling Models and Change Tracking',
    date: moment('2021-06-14'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Looking to start contributing to Mongoose but confused by `this.$__.activePaths`? Here\'s how change tracking works internally in Mongoose.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/IMG-0754.jpg'
  },
  {
    src: './lib/posts/20210812_mongoose_513_projection.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-5-13-sanitizeprojection'
    },
    title: 'What\'s New in Mongoose 5.13: The sanitizeProjection Option',
    date: moment('2021-08-12'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 5.13.0 introduces a new `sanitizeProjection` option that helps protect you from potentially untrusted query projections leaking sensitive data. Here\'s what you need to know.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/georgia.jpeg'
  },
  {
    src: './lib/posts/20210825_mongoose_6.md',
    dest: {
      directory: './bin',
      name: 'introducing-mongoose-6'
    },
    title: 'Introducing Mongoose 6.0.0',
    date: moment('2021-08-25'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 6.0.0 was released on August 24! Here\'s some highlights.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/sobe4.jpeg'
  },
  {
    src: './lib/posts/20210906_mongoose_6_sanitizefilter.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-6-sanitizefilter'
    },
    title: 'What\'s New in Mongoose 6: The `sanitizeFilter` Option',
    date: moment('2021-09-06'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 6.0.0 has a new `sanitizeFilter` option that protects you against query selector injection attacks. Here\'s what you need to know.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/sobe5.jpeg'
  },
  {
    src: './lib/posts/20221108_mongoose_6_5_castobject.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-6-5-castobject-applydefaults'
    },
    title: 'What\'s New in Mongoose 6.5: The `castObject()` and `applyDefaults()` Functions',
    date: moment('2022-11-08'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 6.5.0 introduces two new Model functions, `castObject()` and `applyDefaults()`, that make Mongoose schemas more portable by letting you apply schema-defined logic to POJOs. Here\'s what you need to know.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/elijah-mears-nW3N78niwss-unsplash.jpg'
  },
  {
    src: './lib/posts/20221215_mongoose_68_deno.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-6-8-deno-and-error-messages'
    },
    title: 'What\'s New in Mongoose 6.8: Deno Support and Document-Specific Validation Error Messages',
    date: moment('2022-12-15'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 6.8.0 introduces support for Deno and several other new features. Here\'s what you need to know.',
    image: 'https://images.unsplash.com/photo-1613864557842-388228d9cbf4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1631&q=80'
  },
  {
    src: './lib/posts/20230314_mongoose_7.md',
    dest: {
      directory: './bin',
      name: 'introducing-mongoose-7'
    },
    title: 'Introducing Mongoose 7',
    date: moment('2023-03-14'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 7 was released in February 2023. Here\'s what you need to know about what changed in Mongoose 7.',
    image: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=710&q=80'
  },
  {
    src: './lib/posts/20230327_mongoose_cassandra.md',
    dest: {
      directory: './bin',
      name: 'were-working-on-cassandra-support-for-mongoose'
    },
    title: 'We\'re Working on Cassandra Support for Mongoose',
    date: moment('2023-03-29'),
    tags: ['NodeJS'],
    previewText: 'At Cassandra Forward, we previewed stargate-mongoose, a project that lets you use Mongoose with Cassandra. Here\'s some more info on how stargate-mongoose works and what that means for Mongoose.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Cassandra_logo.svg/1920px-Cassandra_logo.svg.png'
  },
  {
    src: './lib/posts/20230428_mongoose_71.md',
    dest: {
      directory: './bin',
      name: 'whats-new-in-mongoose-7-1-bigint-support-createcollections'
    },
    title: 'What\'s New in Mongoose 7.1: BigInt Support and createCollections()',
    date: moment('2023-04-28'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 7.1 was released on April 27, 2023. Here\'s more info on a couple of new features in 7.1.',
    image: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=710&q=80'
  },
  {
    src: './lib/posts/20230525_mongoose_astra.md',
    dest: {
      directory: './bin',
      name: 'introducing-private-preview-for-stargate-mongoose-astra'
    },
    title: 'Introducing Private Preview for Stargate-Mongoose Astra Support',
    date: moment('2023-05-25'),
    tags: ['NodeJS'],
    previewText: 'Learn how you can sign up to beta test Mongoose with Astra, DataStax\'s cloud DBaaS for Cassandra, with stargate-mongoose, eliminating the need to run Stargate locally.',
    image: 'https://images.unsplash.com/photo-1515705576963-95cad62945b6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=710&q=80'
  },
  {
    src: './lib/posts/20230710_vector_dbs.md',
    dest: {
      directory: './bin',
      name: 'getting-started-with-vector-databases-in-node-js'
    },
    title: 'Getting Started with Vector Databases in Node.js',
    date: moment('2023-07-10'),
    tags: ['NodeJS'],
    previewText: 'A brief introduction to vector databases in Node.js using Chroma.',
    image: 'https://images.unsplash.com/photo-1604884223364-9bd06ccb3c8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=710&q=80'
  },
  {
    src: './lib/posts/20231108_astra_vector_search.md',
    dest: {
      directory: './bin',
      name: 'rag-vector-search-with-astra-and-mongoose'
    },
    title: 'Retrieval Augmented Generation with Astra and Mongoose',
    date: moment('2023-11-08'),
    tags: ['NodeJS'],
    previewText: 'A brief introduction to vector search with retrieval augmented generation using Astra DB and Mongoose.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/mongoose-rag.png'
  },
  {
    src: './lib/posts/20231129_mongoose_8.md',
    dest: {
      directory: './bin',
      name: 'introducing-mongoose-8'
    },
    title: 'Introducing Mongoose 8',
    date: moment('2023-11-29'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 8 was released in October 2023. Here\'s what you need to know about what changed in Mongoose 8.',
    image: 'https://codebarbarian-images.s3.amazonaws.com/mongoose-8.png'
  },
  {
    src: './lib/posts/20240201_astra_representative_vector.md',
    dest: {
      directory: './bin',
      name: 'topic-classifiers-in-nodejs-using-astra-vector-search'
    },
    title: 'Topic Classifiers in Node.js Using Astra Vector Search',
    date: moment('2024-02-01'),
    tags: ['NodeJS'],
    previewText: 'You can build a topic classifier using vector search by storing representative vectors for each topic. Here\'s how you can build a representative vector based classifier in Node.js with Astra and Mongoose.',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
  {
    src: './lib/posts/20240418_astra_rag_notes.md',
    dest: {
      directory: './bin',
      name: 'building-a-note-taking-app-with-rag'
    },
    title: 'Building a Note-Taking App With Retrieval Augmented Generation (RAG)',
    date: moment('2024-04-18'),
    tags: ['NodeJS'],
    previewText: 'You can build a topic classifier using vector search by storing representative vectors for each topic. Here\'s how you can build a representative vector based classifier in Node.js with Astra and Mongoose.',
    image: 'https://images.unsplash.com/photo-1612367980327-7454a7276aa7?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.0.3'
  },
  {
    src: './lib/posts/20240618_mongoose_84.md',
    dest: {
      directory: './bin',
      name: 'mongoose-8.4-transactionasynclocalstorage-and-inferrawdoctype'
    },
    title: 'What\'s New in Mongoose 8.4: transactionAsyncLocalStorage and inferRawDocType',
    date: moment('2024-06-18'),
    tags: ['NodeJS', 'MongoDB'],
    previewText: 'Mongoose 8.4 was released on May 17, 2024. Here\'s more info on a couple of new features in 8.4.',
    image: 'https://images.unsplash.com/photo-1587117120810-89ea0ab26bf8?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.0.3'
  },
  {
    src: './lib/posts/20250514_astra_mongoose.md',
    dest: {
      directory: './bin',
      name: 'introducing-astra-mongoose'
    },
    title: 'Introducing @datastax/astra-mongoose: The New Way to Use DataStax Astra with Mongoose',
    date: moment('2025-05-14'),
    tags: ['NodeJS'],
    previewText: 'Mongoose 8.4 was released on May 17, 2024. Here\'s more info on a couple of new features in 8.4.',
    image: 'https://images.unsplash.com/photo-1510981023495-45fca86762e9?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  }
].map((post, id) => Object.assign(post, { id }));
