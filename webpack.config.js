/* global __dirname, module, require */
const path = require('path');
const webpack = require('webpack');
const GenerateJsonPlugin = require('generate-json-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


// Addon directory
const dest_dir = path.resolve(__dirname, 'addon');


// Make manifest.json out of package.json information
const {
    name,
    version,
    description,
    author
} = require('./package.json');

let {$schema, ...manifest} = require('./webext-manifest.json');

manifest = {
    ...manifest,
    name,
    version,
    description,
    author
};


module.exports = {
  target: 'web',
  node: false,
  mode: 'development',
  devtool: 'cheap-source-map',

  entry: {
    'background/background': './js/background.js',
    'options/options': './js/options/options.js'
  },

  output: {
    path: dest_dir,
    filename: '[name].js'
  },

  plugins: [
    // new webpack.DefinePlugin({
    //   'process.env': {
    //     NODE_ENV: '"production"'
    //   }
    // }),
    new GenerateJsonPlugin('manifest.json', manifest, null, 2),
    new CopyWebpackPlugin([
      { from: 'images/*', to: 'images', flatten: true },
      { from: 'fonts/*', to: 'fonts', flatten: true },
      { from: 'css/*', to: 'css', flatten: true },
      { from: 'js/libs/*', to: 'libs', flatten: true },
      // { from: 'js/indicator.js', to: 'indicator.js', flatten: true },
      { from: '_locales', to: '_locales', flatten: false },
      { from: 'js/popup/*', to: 'popup', flatten: true },
      { from: 'js/options/*', to: 'options', flatten: true }
    ], {})
  ]
};
