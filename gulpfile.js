var gulp = require('gulp');

var compiler = require('./');

gulp.task('compile', function() {
  compiler();
});

gulp.task('watch', function() {
  gulp.watch('./lib/posts/*.md', ['compile']);
});