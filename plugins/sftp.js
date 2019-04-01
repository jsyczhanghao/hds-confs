var fs = require('fs');
var path = require('path')
var node_ssh = require('node-ssh');
var glob = require('glob');

function Sftp(options) {
	this.options = options;
}

Sftp.prototype.apply = function(compiler){
    var Sftp = new node_ssh();
    var self = this;
    var chalk = require('chalk').constructor({ enabled: true });

	compiler.plugin("done", function(compilation){
        //connect sftp  
        var list = glob.sync(path.join(self.options.from, '**'), {nodir: true}).map(function(file){
            var name = path.relative(self.options.from, file);

            return {
                id: name,
                from: file,
                to: path.join(self.options.to, name).replace(/\\/g, '/')
            }
        });

        var promise = Sftp.connect({
            host: self.options.host,
            username: self.options.username,
            port: self.options.port || 22,
            password: self.options.password
        }).then(function(){
            console.log(chalk.yellow('  Sftp Uploading....'));
            console.log('');
        });
        list.forEach(function(item){
            promise = promise.then(function(){
                return Sftp.putFile(item.from, item.to).then(function(){
                    console.log(chalk.blue('    ' + item.id + ' => ' + item.to + ' Complete!'));
                }, function(){
                    console.log(chalk.red('    ' + item.id + ' => ' + item.to + '  Failure!'));
                });
            })
        });

        promise.finally(function(){
            Sftp.dispose();
            console.log('\n', chalk.yellow(' Sftp Upload Complete!'));
        });
	});
};


module.exports = Sftp;