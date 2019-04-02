#!/usr/bin/env node

'use strict';

var path = require('path');
var argvs = process.argv;
var config = {};
var env = argvs[argvs.length - 1];
var c;

if(/^\w+$/.test(env)){
    c = env;
    process.argv.pop();
}else{
    c = process.env.NODE_ENV;
}

process.extra_config = path.join(process.cwd(), 'conf/env', c + '.js');

if(process.env.NODE_ENV == 'dev'){
    process.argv.push('--config', path.join(__dirname, '../index.js'));
    require('webpack-dev-server/bin/webpack-dev-server.js');
}else{
    require('../index.js');
}