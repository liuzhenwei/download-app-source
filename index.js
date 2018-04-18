#!/usr/bin/env node

var yargs = require('yargs');
var download = require('download-git-repo');

yargs.parse(process.argv.slice(2), (err, argv, output) => {
	var path = null, name = null;
	if (argv.path) {
		path = argv.path;
	} else {
		name = argv._[0];
		try {
			var appListPath = '../download-app-source/app-list.js';
			fs.accessSync(path.resolve(appListPath), fs.F_OK);

			var appList = require(appListPath);
			path = appList[name];
		} catch (error) {
			return console.error('path [' + (name || '') + '] not found');
		}
	}
	if (path) {
		console.log('Downloading ......');

		download(path, './', function (err) {
			if (err) {
				return console.error(err);
			}
			console.log('Success ===================');
		});
	} else {
		console.error('path [' + (path || name || '') + '] not found');
	}
});
