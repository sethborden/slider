//include gulp
var gulp = require('gulp');

//include our plugins
var jshint = require('gulp-jshint');
var sass = require("gulp-sass");
var concat = require("gulp-concat");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");
var stylish = require("jshint-stylish");
var browserSync = require("browser-sync");

//setup browser-sync
gulp.task('browser-sync', function() {
    browserSync({
        server: {
            baseDir: "./dist"
        }
    });
});

// lint task
gulp.task('lint', function() {
    return gulp.src('js/*.js')
               .pipe(jshint())
               .pipe(jshint.reporter(stylish));
});

//compile the sass
gulp.task('sass', function() {
    return gulp.src('scss/*.scss')
               .pipe(sass({errLogToConsole: true}))
               .pipe(gulp.dest('dist/css'));
});

//concate and minify
gulp.task('scripts', function() {
    return gulp.src('js/*.js')
               .pipe(concat('all.js'))
               .pipe(gulp.dest('dist'))
               .pipe(rename('all.min.js'))
               .pipe(uglify())
               .pipe(gulp.dest('dist'));
});

//BS reload
gulp.task('bs-reload', function() {
    browserSync.reload();
});

//watch files for changes
gulp.task('watch', function() {
    gulp.watch('scss/*.scss', ['sass', 'bs-reload']);
    gulp.watch('dist/*.html', ['bs-reload']);
    gulp.watch('dist/*.css', ['bs-reload']);
    gulp.watch('js/*.js', ['lint', 'scripts', 'bs-reload']);
});

//default task
gulp.task('default', ['lint', 'scripts', 'browser-sync', 'watch']);
