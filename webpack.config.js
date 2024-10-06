/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv/config');
const fs = require('node:fs');
const path = require('node:path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env = {}) => {
  const mode = env.production ? 'production' : 'development';
  const defaultPageConfig = {
    mode,
    entry: {
      auth: './src/js/auth.js',
      index: './src/js/index.js',
      live_create: './src/js/live-create.js',
      live_host: './src/js/live-host.js',
      live_room: './src/js/live-room.js',
    },
    resolve: {
      extensions: ['.js', '.ts'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.ts/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      // new webpack.ProvidePlugin({
      //   $: 'jquery',
      //   jQuery: 'jquery',
      //   Popper: ['popper.js', 'default'],
      // }),
      new HtmlWebpackPlugin({
        template: './src/html/index.html',
        filename: 'index.html',
        chunks: ['auth', 'index'],
      }),
      new HtmlWebpackPlugin({
        template: './src/html/live-sign-up.html',
        filename: 'live-sign-up.html',
        chunks: ['auth'],
      }),
      new HtmlWebpackPlugin({
        template: './src/html/live-sign-in.html',
        filename: 'live-sign-in.html',
        chunks: ['auth'],
      }),
      new HtmlWebpackPlugin({
        template: './src/html/live-create.html',
        filename: 'live-create.html',
        chunks: ['auth', 'live_create'],
      }),
      new HtmlWebpackPlugin({
        template: './src/html/live-host.html',
        filename: 'live-host.html',
        chunks: ['auth', 'live_host'],
      }),
      new HtmlWebpackPlugin({
        template: './src/html/live-room.html',
        filename: 'live-room.html',
        chunks: ['auth', 'live_room'],
      }),
      new HtmlWebpackPlugin({
        template: './src/html/about.html',
        filename: 'about.html',
        chunks: ['auth'],
      }),
      new HtmlWebpackPlugin({
        template: './src/html/contact.html',
        filename: 'contact.html',
        chunks: ['auth'],
      }),
    ],
    output: {
      filename: '[contenthash].js',
      path: path.resolve(__dirname, 'dist'),
    },
    devServer: {
      // SSL options
      server: {
        type: 'https',
        options: {
          key: fs.readFileSync(process.env.SSL_KEY_FILE),
          cert: fs.readFileSync(process.env.SSL_CERT_FILE),
        },
      },
      static: './public',
      // historyApiFallback: {
      //   rewrites: [{ from: /^\/page/, to: '/page.html' }],
      // },
    },
  };

  return defaultPageConfig;
};
