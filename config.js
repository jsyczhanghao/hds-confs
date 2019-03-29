'use strict';

const path = require('path');
const utils = require('./utils');
const isProduction = /production|testing/.test(process.env.NODE_ENV);
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = function(context){
    function resolve(dir){
        return path.join(context, dir);
    }

    return {
        devServer: {
          historyApiFallback: {
            rewrites: [
              { from: /.*/, to: '/index.html' },
            ],
          },
          hot: true,
          compress: true,
          open: true,
          overlay: true,
          publicPath: '/',
          proxy: {},
          quiet: true,
          watchOptions: {
            poll: true
          }
        },

        devtool: isProduction ? '#source-map' : 'cheap-module-eval-source-map',
        context: context,
        output: {
            path: isProduction ? resolve('output') : resolve('_debug'),
            filename: '[name].[hash].js',
            publicPath: '/'
        },
        entry: {},
        resolve: {
            extensions: ['.js', '.vue', '.json'],
            alias: {
                'vue$': 'vue/dist/vue.esm.js',
                'vuex$': 'vuex/dist/vuex.esm.js',
                'vue-router$': 'vue-router/dist/vue-router.esm',
                '@': resolve('src')
            }
        },
        module: {
            rules: [
                ...(isProduction ? [
                  {
                    test: /\.(js|vue)$/,
                    loader: 'eslint-loader',
                    enforce: 'pre',
                    include: [resolve('src')],
                    options: {
                      formatter: require('eslint-friendly-formatter'),
                      emitWarning: true
                    }
                  }
                ] : []),
                ...utils.styleLoaders({
                    sourceMap: true,
                    extract: true,
                    usePostCSS: true
                }),
                {
                    test: /\.vue$/,
                    loader: 'vue-loader',
                    options: {
                        loaders: utils.cssLoaders({
                            sourceMap: true,
                            extract: isProduction
                        }),
                        cssSourceMap: true,
                        cacheBusting: true,
                        transformToRequire: {
                            video: ['src', 'poster'],
                            source: 'src',
                            img: 'src',
                            image: 'xlink:href'
                        }
                    }
                },
                {
                    test: /\.js$/,
                    loader: 'babel-loader',
                    include: [resolve('src'), resolve('node_modules/webpack-dev-server/client')]
                },
                {
                    test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
                    loader: 'url-loader',
                    options: {
                        limit: 100,
                        name: 'img/[name].[hash:7].[ext]'
                    }
                },
                {
                    test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        name: 'media/[name].[hash:7].[ext]'
                    }
                },
                {
                    test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        name: 'fonts/[name].[hash:7].[ext]'
                    }
                }
            ]
        },

        plugins: [
        ...(
          isProduction ? [        
            new UglifyJsPlugin({
              uglifyOptions: {
                compress: {
                  warnings: false
                }
              },
              sourceMap: true,
              parallel: true
            }),
            new webpack.HashedModuleIdsPlugin()
          ] : [new webpack.HotModuleReplacementPlugin()]),

          new webpack.optimize.ModuleConcatenationPlugin(),
          new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor',
            filename: '[name].js',
            minChunks: function (module,count) {
              return (
                module.resource &&
                /\.js$/.test(module.resource) &&
                module.resource.indexOf(path.join(context, './node_modules')) === 0
              )
            }
          }),
          // extract webpack runtime and module manifest to its own file in order to
          // prevent vendor hash from being updated whenever app bundle is updated
          new webpack.optimize.CommonsChunkPlugin({
            name: 'manifest',
            minChunks: Infinity
          }),
          // This instance extracts shared chunks from code splitted chunks and bundles them
          // in a separate chunk, similar to the vendor chunk
          // see: https://webpack.js.org/plugins/commons-chunk-plugin/#extra-async-commons-chunk
          new webpack.optimize.CommonsChunkPlugin({
            async: 'children-async',
            children: true,
            minChunks: 2
          })
        ]
    };
};