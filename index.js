
var path = require('path');
var fs = require('fs');
var glob = require('glob');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
var merge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = (function(){
    var CWD = process.cwd();
    var extraConfigs = {};

    try{
        extraConfigs = require(process.extra_config);
    }catch(e){};

    var commonConfigs = require(path.join(CWD, 'conf/conf.js'));
    var nomocker = commonConfigs.nomocker || extraConfigs.nomocker;
    delete commonConfigs.nomocker;
    delete extraConfigs.nomocker;
    
    var htmlPluginOptions = commonConfigs.htmlPluginOptions || extraConfigs.htmlPluginOptions;
    delete commonConfigs.htmlPluginOptions;
    delete extraConfigs.htmlPluginOptions;

    var userDefineConfigs = merge(commonConfigs, extraConfigs);
    var publicPath = '/static', basePath = 'static';
    
    try{
        publicPath = userDefineConfigs.output.publicPath;
    }catch(e){};

    publicPath.replace(/((?:(?:https?:)?\/\/\w+(?:\.\w+)+)?\/?)?(.*)/, function(all, domain, base){
        publicPath = domain || '';
        basePath = base;
    });

    if(basePath){
        basePath = basePath.replace(/\/$/, '') + '/';
    }

    var configs = merge(require('./config')(CWD, basePath, nomocker), userDefineConfigs, {
        output: {
            publicPath: publicPath
        }
    });

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

            configs.plugins.push(new HtmlWebpackPlugin(
                Object.assign({
                    template: file,
                    filename: subpath,
                    chunks: entry ? ['manifest', 'v~', 'vendor', 'app', entry] : []
                }, htmlPluginOptions || {})
            ));
        }
    });

    if(process.env.NODE_ENV == 'dev'){
        return require('./port').then((port) => {
            configs.devServer.port = port;
            return configs;
        });
    }else{
        const ora = require('ora');
        const chalk = require('chalk');
        const rm = require('rimraf');
        const spinner = ora('building for production...');

        spinner.start();

        rm(configs.output.path, err => {
            if (err) throw err;
            webpack(configs, (err, stats) => {
                spinner.stop();
                if (err) throw err;
                process.stdout.write(stats.toString({
                    colors: true,
                    modules: false,
                    children: false,
                    chunks: false,
                    chunkModules: false
                }) + '\n\n')

                if (stats.hasErrors()) {
                    console.log(chalk.red('  Build failed with errors.\n'));
                    process.exit(1);
                }

                console.log(chalk.cyan('  Build complete.\n'));
                console.log(chalk.yellow(
                '  Tip: built files are meant to be served over an HTTP server.\n' +
                '  Opening index.html over file:// won\'t work.\n'
                ));
            });
        });
    }
})();