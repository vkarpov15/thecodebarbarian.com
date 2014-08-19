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
  }
];
