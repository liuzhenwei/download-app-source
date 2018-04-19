#!/usr/bin/env node

var path = require('path');
var downloadUrl = require('download')
var gitclone = require('git-clone')
var rm = require('rimraf').sync
var yargs = require('yargs');
var cmd = require('node-cmd');

yargs.parse(process.argv.slice(2), (err, argv, output) => {
	var repo = null, name = null;
	var {help, version, $0, ...args} = argv;

	if (args.repo) {
		repo = args.repo;
	} else {
		name = args._[0];
		try {
			var appListPath = '../pull-app-source/app-list.js';
			fs.accessSync(path.resolve(appListPath), fs.F_OK);

			var appList = require(appListPath);
			repo = appList[name];
		} catch (error) {
			return console.error('repository [' + (name || '') + '] not found');
		}
	}

	if (repo) {
		console.log('Downloading ...............');

		download(repo, args.dest || './', args, (err) => {
			if (err) {
				return console.error(err);
			}

			console.log('Download success ===================');

			if (args.init) {
				console.log('Start init app ===================');

				cmd.get(`npm install --registry https://registry.npm.taobao.org`, (initErr, data) => {
					if (initErr) {
						return console.error('Init app error!');
					}

					console.log('Init app success ===================');
				});
			}
		});
	} else {
		console.error('repository [' + (path || name || '') + '] not found');
	}
});

function download (repo, dest, opts, fn) {
	if (typeof opts === 'function') {
		fn = opts
		opts = null
	}
	opts = opts || {};

	repo = normalize(repo);

	var url = getUrl(repo, opts);

	if (opts.clone) {
		var _dest = dest == './' ? 'tmp' : dest;

		rm(_dest);

		gitclone(url, _dest, { checkout: repo.checkout, shallow: repo.checkout === 'master' }, function (err) {
			if (err === undefined) {
				rm(_dest + '/.git');
				if (dest == './') {
					cmd.get('mv ' + _dest + '/* ' + path.resolve(dest), (mvErr, data) => {
						if (mvErr) {
							return console.error('Move files error! [' + mvErr.message + ']');
						}
						rm(_dest);
						fn();
					});
				} else {
					fn();
				}
			} else {
				fn(err);
			}
		});
	} else {
		downloadUrl(url, dest, { extract: true, strip: 1, mode: '666', headers: { accept: 'application/zip' } }).then(data => {
			fn();
		}).catch(err => {
			fn(err);
		});
	}
}

function normalize (repo) {
	var regex = /^((github|gitlab|bitbucket):)?((.+):)?([^/]+)\/([^#]+)(#(.+))?$/
	var match = regex.exec(repo)
	var type = match[2] || 'github'
	var origin = match[4] || null
	var owner = match[5]
	var name = match[6]
	var checkout = match[8] || 'master'

	if (origin == null) {
		if ((owner === 'https:' || owner === 'http:') && type === 'github') {
			type = 'http';
			origin = repo;
		} else {
			if (type === 'github')
				origin = 'github.com'
			else if (type === 'gitlab')
				origin = 'gitlab.com'
			else if (type === 'bitbucket')
				origin = 'bitbucket.org'
		}
	}

	return {
		type: type,
		origin: origin,
		owner: owner,
		name: name,
		checkout: checkout
	}
}

function addProtocol (origin, clone) {
	if (!/^(f|ht)tps?:\/\//i.test(origin)) {
		if (clone)
			origin = 'git@' + origin
		else
			origin = 'https://' + origin
	}

	return origin
}

function getUrl (repo, opts) {
	var url

	var origin = addProtocol(repo.origin, opts.clone)

	if (/^git\@/i.test(origin))
		origin = origin + ':'
	else
		origin = origin + '/'

	if (repo.type === 'http') {
		return repo.origin;
	}
	if (opts.clone) {
		url = origin + repo.owner + '/' + repo.name + '.git'
	} else {
		if (repo.type === 'github')
			url = origin + repo.owner + '/' + repo.name + '/archive/' + repo.checkout + '.zip'
		else if (repo.type === 'gitlab')
			url = origin + repo.owner + '/' + repo.name + '/repository/archive.zip?ref=' + repo.checkout
		else if (repo.type === 'bitbucket')
			url = origin + repo.owner + '/' + repo.name + '/get/' + repo.checkout + '.zip'
	}

	return url || repo.origin;
}
