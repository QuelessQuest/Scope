const { src, dest, series, parallel } = require('gulp');
const gulp = require('gulp');
const less = require('gulp-less');
const zip = require('gulp-zip');
const del = require('del');

const clean = () => del(['./styles/*.css']);
const cleanMain = () => del(['./scope.css']);

function themeStyles() {
  return src([
      './less/themes/whiteSpace.less'
    ], {allowEmpty: true})
      .pipe(less())
      .pipe(dest('./styles/'))
}

const themes = series(clean, themeStyles);

function stageRelease() {
  return src([
    './assets/**',
    './libs/**',
    './module/**/*.js',
    './lang/**/*.json',
    './styles/**/*.*',
    './templates/**/*.html',
    'system.json',
    'template.json',
    'scope.js',
    'scope.css'
  ], {base: '.'})
      .pipe(dest('./stage/ms'));
}

const stageTask = series(stageRelease);

function zipRelease() {
  return src(['./stage/ms/**/*.*'])
      .pipe(zip('ms.zip'))
      .pipe(dest('stage'));
}

const zipTask = series(zipRelease);

/* ----------------------------------------- */
/*  Compile LESS
/* ----------------------------------------- */

const SIMPLE_LESS = ["less/*.less"];

function compileLESS() {
  return src("less/scope.less")
      .pipe(less())
      .pipe(dest("./"))
}

const css = series(cleanMain, compileLESS);

/* ----------------------------------------- */

/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
  gulp.watch(SIMPLE_LESS, css);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = series(
    parallel(css),
    watchUpdates
);
exports.css = css;
exports.stage = stageTask;
exports.zip = zipTask;
exports.themes = themes;