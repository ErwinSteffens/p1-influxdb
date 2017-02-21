var gulp = require('gulp');
var rsync = require('gulp-rsync');

var host = '10.0.1.11'; 

var paths = {
  app: '*',
  config: 'config/**',
  lib: 'lib/**',
  forever: 'forever/**',
};

// Copy app
gulp.task('copy', function() {
  gulp.src([paths.app, paths.config, paths.lib, paths.forever])
    .pipe(rsync({
      hostname: host,
      username: 'pi',
      root: './',
      destination: '/home/pi/p1-influxdb'
    }));
});

// Watch for file changes
gulp.task('watch', function() {
  gulp.watch([ paths.app, paths.config, paths.lib, paths.forever], ['copy']);
});

gulp.task('default', ['watch', 'copy']);