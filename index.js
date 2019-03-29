var path = require('path');
var fs = require('fs');
var glob = require('glob');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
var merge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

function getUserDefineConfig(CWD, commonConfigs){
    var argvs = process.argv;
    var config = {};
    var env = argvs[argvs.length - 1];

    if(/^\w+$/.test(env)){
        var file = path.join(CWD, 'conf/env', env + '.js');

        try{
            config = require(file);
        }catch(e){}
    }

    var useServer = /webpack-dev-server/.test(process.argv[1]);

    config.watch = useServer;

    return {
        server: useServer,
        config: merge(config, commonConfigs)
    };
}

exports.init = function(CWD, commonConfigs = {}){ 
    var userDefineConfigs = getUserDefineConfig(CWD, commonConfigs);

    var configs = require('./config')(CWD);
    var files = glob.sync(path.join(CWD, '*.html'));
    var entrys = configs.entry;

    files.forEach((file) => {
        var subpath = path.relative(CWD, file);
        var basename = path.basename(file, '.html');
        var js = path.join(
            CWD,
            'src',
            subpath.split('/').slice(0, -1).join('/') + '/' + basename
        );

        if(fs.existsSync(js + '.js')){
            entry = path.relative(CWD, js).replace('\\', '/');
            entrys[entry] = [js + '.js'];

            configs.plugins.push(new HtmlWebpackPlugin({
                template: file,
                filename: subpath,
                chunks: entry ? ['manifest', 'vendor', entry] : []
            }))
        }
    });

    //copy
    configs.plugins.push(
        new ExtractTextPlugin({
            filename: '[name].[contenthash].css',
            allChunks: true
        })
    );

    if(userDefineConfigs.server){
        return require('./port').then((port) => {
            configs.devServer.port = port;
            return configs;
        });
    }else{
        webpack(configs);
    }
};
