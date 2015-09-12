var gulp = require('gulp');
var sass = require('gulp-sass');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');

gulp.task('default', function () {
	gulp.src('main.scss')
		.pipe(plumber())
		.pipe(sass())
		.pipe(rename('main.css'))
		.pipe(gulp.dest('./public/css'))

	gulp.start('buildJS');

	gulp.watch('./app/javascripts/**/*.js', ['buildJS'])
});

gulp.task('buildJS', function() {
	gulp.src(['./app/javascripts/app.js', './app/javascripts/components/**/*.js'])
	.pipe(plumber())
	.pipe(concat('main.js'))
	// .pipe(uglify())
	.pipe(gulp.dest('./public/js'))
})