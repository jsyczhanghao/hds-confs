'use strict';

const path = require('path');
const utils = require('./utils');
const isProduction = /production|testing/.test(process.env.NODE_ENV);
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const OptimizeCSSPlugin = require('optimize-css-assets-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const apiMocker = require('webpack-api-mocker');

module.exports = function(context, basePath = '', nomocker = false){
    function resolve(dir){
        return path.join(context, dir || '');
    }   

    var p;

    if(nomocker){
        p = {proxy: require(resolve('conf/proxy.js'))};
    }else{
        var proxy = require(resolve('conf/proxy.js'));
        
        for(let id in proxy){
            proxy[id] = proxy[id].target;
        }

        p = {
            before: function(app){
                apiMocker(app, path.resolve(context, 'conf/mocker.js'), {
                    proxy: proxy,
                    changeHost: true
                });
            }
        };
    }

    return {
        devServer: {
            disableHostCheck: true,
            historyApiFallback: {
                rewrites: [
                    { from: /.*/, to: '/index.html' },
                ]
            },
            hot: true,
            compress: true,
            open: true,
            overlay: true,
            publicPath: '/',
            ...p,
            quiet: false
        },

        devtool: isProduction ? '#source-map' : 'cheap-module-eval-source-map',
        context: context,
        output: {
            path: isProduction ? resolve('dist') : resolve('_debug'),
            publicPath: '',
            ...(isProduction ? 
                {
                    filename: basePath + 'js/[name].[chunkhash].js',
                    chunkFilename: basePath + 'js/[id].[chunkhash].js'
                }
                : 
                {
                    filename: basePath + 'js/[name].[hash].js'
                }
            )
        },
        entry: {},
        resolve: {
            extensions: ['.js', '.vue', '.json'],
            alias: {
                'vue$': 'vue/dist/vue.js',
                'vuex$': 'vuex/dist/vuex.js',
                'vue-router$': 'vue-router/dist/vue-router.js',
                '@': resolve('src')
            }
        },
        resolveLoader: {
            modules: [ 
                'node_modules'//, path.resolve(__dirname, 'node_modules') 
            ]
        },
        module: {
            rules: [
                {
                    test: /\.(js|vue)$/,
                    loader: 'eslint-loader',
                    enforce: 'pre',
                    include: [resolve('src')],
                    options: {
                        formatter: require('eslint-friendly-formatter'),
                        emitWarning: true
                    }
                },
                ...utils.styleLoaders({
                    sourceMap: true,
                    extract: isProduction,
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
                        name: basePath + 'img/[name].[hash:7].[ext]'
                    }
                },
                {
                    test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        name: basePath + 'media/[name].[hash:7].[ext]'
                    }
                },
                {
                    test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        name: basePath + 'fonts/[name].[hash:7].[ext]'
                    }
                }
            ]
        },

        plugins: [
            // Ignore all locale files of moment.js
            new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /zh-cn/),
            ...(
                isProduction ? 
                    [
                        new webpack.DefinePlugin({
                            'process.env': {
                                NODE_ENV: '"' + process.env.NODE_ENV + '"'
                            }
                        }),
                        new ExtractTextPlugin({
                            filename: basePath + 'css/[name].[contenthash].css',
                            allChunks: true
                        }),
                        new UglifyJsPlugin(),
                        new OptimizeCSSPlugin({
                            cssProcessorOptions: { 
                                safe: true, 
                                map: { 
                                    inline: false 
                                } 
                            }
                        }),
                        new webpack.HashedModuleIdsPlugin(),
                        new webpack.optimize.ModuleConcatenationPlugin(),
                        new webpack.optimize.CommonsChunkPlugin({
                            name: 'vendor',
                            minChunks: function(module,count){
                                return (
                                    module.resource &&
                                    /\.js$/.test(module.resource) &&
                                    module.resource.indexOf(path.join(context, './node_modules')) === 0
                                );
                            }
                        }),
                        new webpack.optimize.CommonsChunkPlugin({
                            name: 'v~',
                            minChunks: function(module,count){
                                return (
                                    module.resource &&
                                    /vue\.js|vuex|vue-/.test(module.resource) &&
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
                    : [
                        new webpack.HotModuleReplacementPlugin(),
                        new webpack.NamedModulesPlugin(), // HMR shows correct file names in console on update.
                        new webpack.NoEmitOnErrorsPlugin()
                    ]
            )
        ]
    };
};