#!/usr/bin/env node
/**
 * @copyright 2016-present, wpack team
 */

import path from 'path';
import webpack from 'webpack';
import program from 'commander';
import {ValidationError} from 'validated/schema';
import pkg from '../../package.json';
import {findConfig, configureWebpack} from '../config';

let args = program
  .version(pkg.version)
  .command('wpack [directory]')
  .parse(process.argv);

let [directory = process.cwd()] = args.args;

directory = path.resolve(directory);

let config = null
try {
  config = findConfig(directory);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message);
    process.exit(1);
  } else {
    throw error;
  }
}

let webpackConfig = configureWebpack(config);
let compiler = webpack(webpackConfig);

compiler.run(error => {
  if (error) {
    if (error.details) {
      console.error(error.details);
    } else {
      console.error(error.stack || error);
    }
    process.exit(1);
  }
});
