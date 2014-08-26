var moment = require('moment');

module.exports = [
  {
    src: './lib/posts/20130429_mean_stack.md',
    dest: {
      directory: './bin/2013/04/29/',
      name: 'easy-web-prototyping-with-mongodb-and-nodejs',
    },
    title: 'The MEAN Stack: MongoDB, ExpressJS, AngularJS, and Node.js',
    date: moment('2013-04-29'),
    tags: ['MongoDB', 'AngularJS', 'NodeJS']
  },
  {
    src: './lib/posts/20130512_validate_any_form.md',
    dest: {
      directory: './bin/2013/05/12/',
      name: 'how-to-easily-validate-any-form-ever-using-angularjs'
    },
    title: 'How to Easily Validate Any Form Ever Using AngularJS',
    date: moment('2013-05-12'),
    tags: ['MongoDB', 'AngularJS']
  },
  {
    src: './lib/posts/20130606_mongoose_mistakes.md',
    dest: {
      directory: './bin/2013/06/06/',
      name: '61'
    },
    title: 'Mistakes You\'re Probably Making With MongooseJS, And How To Fix Them',
    date: moment('2013-06-06'),
    tags: ['MongoDB', 'NodeJS']
  },
  {
    src: './lib/posts/20130621_paleo_dev.md',
    dest: {
      directory: './bin/2013/06/21/',
      name: '8-reasons-why-better-nutrition-makes-you-a-better-developer'
    },
    title: '8 Reasons Why Better Nutrition Makes You a Better Developer',
    date: moment('2013-06-21'),
    tags: ['Paleo']
  },
  {
    src: './lib/posts/20130722_mean_part_i.md',
    dest: {
      directory: './bin/2013/07/22/',
      name: 'introduction-to-the-mean-stack-part-one-setting-up-your-tools'
    },
    title: 'Introduction to the MEAN Stack, Part One: Setting Up Your Tools',
    date: moment('2013-07-22'),
    tags: ['MongoDB', 'AngularJS', 'NodeJS']
  },
  {
    src: './lib/posts/20130729_mean_part_ii.md',
    dest: {
      directory: './bin/2013/07/29/',
      name: 'introduction-to-the-mean-stack-part-two-building-and-testing-a-to-do-list'
    },
    title: 'Introduction to the MEAN Stack, Part Two: Building and Testing a To-do List',
    date: moment('2013-07-29'),
    tags: ['MongoDB', 'AngularJS', 'NodeJS']
  },
  {
    src: './lib/posts/20130923_directives.md',
    dest: {
      directory: './bin/2013/09/23/',
      name: 'the-8020-guide-to-writing-angularjs-directives'
    },
    title: 'The 80/20 Guide to Writing AngularJS Directives',
    date: moment('2013-09-23'),
    tags: ['AngularJS']
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
    code: 'https://github.com/vkarpov15/mean-exchange-rates'
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
  }
];
