/**
 * @copyright 2016-present, wpack team
 */

import * as fs from 'fs';
import * as path from 'path';
import debug from 'debug';
import {Minimatch} from 'minimatch';

import {
  mapping, object, partialObject, sequence, oneOf, maybe,
  string, boolean, any, enumeration,
  ValidationError, validationError
} from 'validated/schema';
import {validate as validateJSON5} from 'validated/json5';

let log = debug('wpack:config');

let outputSchema = oneOf(
  string.andThen(path => ({path})),
  object({
    path: string,
    filename: maybe(string),
  })
);

let loaderSchemaSingle = oneOf(
  string.andThen(loader => ({loader})),
  object({loader: string, query: maybe(mapping())})
).andThen(value => {
  if (loaders[value.loader]) {
    return {...value, loader: loaders[value.loader]};
  } else {
    return value;
  }
});

let loaderSchema = oneOf(
  loaderSchemaSingle,
  sequence(loaderSchemaSingle)
);

let pluginSchema = any;

let configSchemaSingle = object({

  entry: string,

  output: maybe(outputSchema),

  debug: maybe(string),

  target: maybe(enumeration('web', 'node')),

  bail: maybe(boolean),

  devtool: maybe(enumeration(
    'eval',
    'source-map',
    'inline-source-map',
    'eval-source-map',
    'cheap-source-map',
    'hidden-source-map',
    'cheap-module-source-map'
  )),

  module: maybe(object({

    loaders: maybe(mapping(loaderSchema)),

    globalLoaders: maybe(mapping(loaderSchema)),

  })),

  plugins: maybe(sequence(pluginSchema)),

});

let configSchema = object({
  ...configSchemaSingle.values,
  profile: maybe(mapping(configSchemaSingle)),
});

let configSchemaWithinPackageJSON = partialObject({
  wpack: maybe(configSchema)
});

export let loaders = {
  url: {
    loader: require.resolve('url-loader')
  },
  file: {
    loader: require.resolve('file-loader'),
  },
  babel: {
    loader: require.resolve('babel-loader'),
  },
  css: {
    loader: require.resolve('css-loader'),
  },
  style: {
    loader: require.resolve('style-loader'),
  },
  image: {
    loader: require.resolve('url-loader'),
    query: {prefix: 'img/', limit: 5000}
  },
  font: {
    loader: require.resolve('url-loader'),
    query: {prefix: 'font/', limit: 5000}
  },
  legacyFont: {
    loader: require.resolve('file-loader'),
    query: {prefix: 'font/'}
  }
};

export let defaultConfig = {
  debug: true,
  bail: true,
  devtool: 'cheap-module-eval-source-map',
  output: {
    filename: 'bundle.js',
    path: './build',
  },
  module: {
    loaders: {
      '**/*.js': loaders.babel,
    },
    globalLoaders: {
      '**/*.css': [loaders.style, loaders.css],
      '**/*.module.css': [loaders.style, {loader: loaders.css, query: {modules: true}}],

      '**/*.png': loaders.image,
      '**/*.jpg': loaders.image,
      '**/*.gif': loaders.image,

      '**/*.eot': loaders.legacyFont,
      '**/*.ttf': loaders.legacyFont,
      '**/*.svg': loaders.legacyFont,
      '**/*.woff': loaders.font,
      '**/*.woff2': loaders.font,
    },
  },
};

export function mergeConfig(configA, configB) {
  let moduleA = configA.module || {};
  let moduleB = configB.module || {};
  return {
    ...configA,
    ...configB,
    output: {
      ...configA.output,
      ...configB.output,
    },
    module: {
      loaders: {
        ...moduleA.loaders,
        ...moduleB.loaders
      },
      globalLoaders: {
        ...moduleA.globalLoaders,
        ...moduleB.globalLoaders
      },
    }
  };
}

export function readConfig(filename) {
  let content = fs.readFileSync(filename, 'utf8');
  return validateJSON5(configSchema, content);
}

export function readConfigFromPackage(directory) {
  let filename = path.join(directory, PACKAGEJSON);
  let content = fs.readFileSync(filename, 'utf8');
  return validateJSON5(configSchemaWithinPackageJSON, content);
}

const WPACKRC = '.wpackrc';
const PACKAGEJSON = 'package.json';

export function findConfig(directory) {
  let config = findConfigImpl(directory) || {};
  config = mergeConfig(defaultConfig, config);
  if (config.context === undefined) {
    config.context = directory;
  }
  return config;
}

function findConfigImpl(directory) {
  directory = path.join(directory, '__dummy_filename__');
  while(path.dirname(directory) !== directory) {
    directory = path.dirname(directory);
    let wpackrc = path.join(directory, WPACKRC);
    let packagejson = path.join(directory, PACKAGEJSON);
    if (fs.existsSync(wpackrc)) {
      try {
        return readConfig(wpackrc);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw enrichValidationErrorContext(error, `While validating ${wpackrc}`);
        } else {
          throw error;
        }
      }
    } else if (fs.existsSync(packagejson)) {
      let config;
      try {
        config = readConfigFromPackage(directory).wpack;
      } catch (error) {
        if (error instanceof ValidationError) {
          throw enrichValidationErrorContext(error, `While validating ${wpackrc}`);
        } else {
          throw error;
        }
      }
      if (config) {
        return config;
      }
    }
  }
  return null;
}

function enrichValidationErrorContext(error, ...messages) {
  return validationError(
    error.originalMessage,
    error.contextMessages.concat(messages)
  );
}

function configureWebpackLoaders(context, loaders, options = {}) {
  let result = [];
  for (let pattern in loaders) {
    if (loaders.hasOwnProperty(pattern)) {
      let loader = loaders[pattern];
      if (!options.global) {
        pattern = path.join(context, pattern);
      }
      let test = new Minimatch(pattern).makeRe();
      if (Array.isArray(loader)) {
        result.push({
          loaders: loader,
          test
        });
      } else {
        result.push({
          ...loader,
          test
        });
      }
    }
  }
  return result;
}

export function configureWebpack(config) {
  return {
    ...config,
    output: {
      ...config.output,
      path: path.resolve(config.context, config.output.path)
    },
    module: {
      loaders: []
        .concat(
          configureWebpackLoaders(config.context, config.module.loaders))
        .concat(
          configureWebpackLoaders(config.context, config.module.globalLoaders, {global: true}))
    }
  };
}
