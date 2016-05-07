# wpack

wpack is a [webpack][] configuration API.

## Installation & Usage

Install with [pnpm][]:

```
% pnpm install wpack
```

or with npm if you are up for a cup of coffee while it runs:

```
% npm install wpack
```

## Configuration

wpack is a thin configuration layer on top of webpack and most of the webpack
configuration works.

### Using .wpackrc

You can put wpack configuration in `.wpackrc` file in [JSON5][] format.

### Using package.json

You can put wpack configuration in `package.json` file under `"wpack"` key.

### Primer

```js
{
  context: __dirname,

  entry: '.',

  output: 'bundle.js',

  bail: true,

  devtool: '#cheap-module-source-map',

  target: 'web',

  module: {

    // Loaders which are applied on the current package's source code
    loaders: {
      '**/*.js': 'babel',
    },

    // Loaders which is applied even on content within node_modules/
    globalLoaders: {
      '**/*.css': ['style', 'css'],
      '**/*.png': 'url',
      '**/*.gif': 'url',
      '**/*.gif': 'url',
    }
  }
}
```

[pnpm]: https://github.com/rstacruz/pnpm
[webpack]: https://github.com/webpack/webpack
