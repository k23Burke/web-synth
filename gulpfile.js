var gulp = require('gulp');
var sass = require('gulp-sass');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');


gulp.task('default', function () {
	gulp.src('main.scss')
		.pipe(plumber())
		.pipe(sass())
		.pipe(rename('main.css'))
		.pipe(gulp.dest('./css'))
});