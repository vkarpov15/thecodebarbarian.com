var moment = require('moment');

module.exports = [
  {
    src: './lib/posts/20130429_mean_stack.md',
    dest: {
      directory: './bin/2013/04/29/',
      name: 'easy-web-prototyping-with-mongodb-and-nodejs',
    },
    title: 'The MEAN Stack: MongoDB, ExpressJS, AngularJS, and Node.js',
    date: moment('2013-04-29')
  },
  {
    src: './lib/posts/20130512_validate_any_form.md',
    dest: {
      directory: './bin/2013/05/12/',
      name: 'how-to-easily-validate-any-form-ever-using-angularjs'
    },
    title: 'How to Easily Validate Any Form Ever Using AngularJS',
    date: moment('2013-05-12')
  },
  {
    src: './lib/posts/20130606_mongoose_mistakes.md',
    dest: {
      directory: './bin/2013/06/06/',
      name: '61'
    },
    title: 'Mistakes You\'re Probably Making With MongooseJS, And How To Fix Them',
    date: moment('2013-06-06')
  },
  {
    src: './lib/posts/20130621_paleo_dev.md',
    dest: {
      directory: './bin/2013/06/21/',
      name: '8-reasons-why-better-nutrition-makes-you-a-better-developer'
    },
    title: '8 Reasons Why Better Nutrition Makes You a Better Developer',
    date: moment('2013-06-21')
  },
  {
    src: './lib/posts/20130722_mean_part_i.md',
    dest: {
      directory: './bin/2013/07/22/',
      name: 'introduction-to-the-mean-stack-part-one-setting-up-your-tools'
    },
    title: 'Introduction to the MEAN Stack, Part One: Setting Up Your Tools',
    date: moment('2013-07-22')
  }
];
