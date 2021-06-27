const { src, dest, series, parallel } = require('gulp');
const gulp = require('gulp');
const less = require('gulp-less');
const zip = require('gulp-zip');
const del = require('del');

function clean() {
  return del(['stage/*']);
}

const cleanTask = series(clean);

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
    './templates/**/*.html',
    'system.json',
    'template.json',
    'scope.js',
    'scope.css'
  ], {base: '.'})
      .pipe(dest('./stage/scope'));
}

const stageTask = series(stageRelease);

function zipRelease() {
  return src(['./stage/scope/**/*.*'])
      .pipe(zip('scope.zip'))
      .pipe(dest('stage'));
}

const zipTask = series(zipRelease);

/* ----------------------------------------- */
/*  Compile LESS
/* ----------------------------------------- */

function compileLESS() {
  return src("less/scope.less")
      .pipe(less())
      .pipe(dest("./"))
}

const css = series(cleanMain, compileLESS);

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = series(
    parallel(css)
);
exports.css = css;
exports.stage = stageTask;
exports.zip = zipTask;
exports.themes = themes;
exports.clean = cleanTask;