var _ = require('underscore');
var fs = require('fs');
var markdown = require('markdown').markdown;
var jade = require('jade');
var file = require('file');

var Orchestrator = require('orchestrator');
var orchestrator = new Orchestrator();

var posts = require('./lib/posts');

var postTemplate = null;

orchestrator.add('loadPostTemplate', function(callback) {
  fs.readFile('./lib/views/post.jade', function(err, view) {
    if (err) {
      console.error('Error loading post template: ' + err);
      return callback(err);
    }
    postTemplate = jade.compile(view, {});
    callback(null);
  });
});

var tasks = [];
_.each(posts, function(post) {
  var taskName = 'post-' + post.title;
  tasks.push(taskName);
  orchestrator.add(taskName, ['loadPostTemplate'], function(callback) {
    fs.readFile(post.src, function(err, md) {
      if (err) {
        console.error('Error reading file: ' + err);
        return callback(err);
      }
      var output = postTemplate({ post: post, content: markdown.toHTML(md.toString()) });
      file.mkdirs(post.dest.directory, 0777, function(err) {
        if (err) {
          console.error('Error making dir: ' + err);
          return callback(err);
        }
        fs.writeFile(file.path.join(post.dest.directory, post.dest.name), output, function(err) {
          if (err) {
            console.error('Error writing file: ' + err);
          }
          return callback(err);
        });
      });
    });
  });
});

orchestrator.start(tasks, function(err) {
  if (err) {
    return console.log("Errors occurred");
  }
  console.log("Done");
});
