/* global __dirname, module, require */
const path = require('path');
const webpack = require('webpack');
const GenerateJsonPlugin = require('generate-json-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


// Addon directory
const dest_dir = path.resolve(__dirname, 'addon');

function buildManifest(env) {

  // Make manifest.json out of package.json information
  const {
      name,
      version,
      description,
      author
  } = require('./package.json');

  let {
    $schema,
    browser_specific_settings,
    ...manifest
  } = require('./webext-manifest.json');
  
  manifest = {
      ...manifest,
      name,
      version,
      description,
      author
  };

  const { browser } = env
  if (browser === 'firefox') {
    return {
      ...manifest,
      browser_specific_settings
    }
  } else if (browser === 'chrome') {
    return manifest
  }

}


module.exports = env => ({
  target: 'web',
  node: false,
  mode: 'development',
  devtool: 'cheap-source-map',

  entry: {
    'background/background': './js/background.js',
    'options/options': './js/options/options.js',
    'popup/popup': './js/popup/popup.js'
  },

  output: {
    path: dest_dir,
    filename: '[name].js'
  },

  plugins: [
    new GenerateJsonPlugin('manifest.json', buildManifest(env), null, 2),
    new CopyWebpackPlugin([
      { from: 'images/*', to: 'images', flatten: true },
      { from: 'fonts/*', to: 'fonts', flatten: true },
      { from: 'css/*', to: 'css', flatten: true },
      { from: 'js/libs/*', to: 'libs', flatten: true },
      // { from: 'js/indicator.js', to: 'indicator.js', flatten: true },
      { from: '_locales', to: '_locales', flatten: false },
      { from: 'js/popup/popup.html', to: 'popup', flatten: true },
      { from: 'js/popup/popup.css', to: 'popup', flatten: true },
      { from: 'js/options/*', to: 'options', flatten: true }
    ], {})
  ]
});
