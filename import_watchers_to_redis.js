/**
 * This script imports CSV file with watchers information into redis
 *
 * Each line is stored as a set twice:
 *
 * repo:repository_name -> [set of star gazers]
 * user:user_name -> [set of starred repositories]
 */

var fileName = process.argv[2];
var fs = require('fs');

if (!fs.existsSync(fileName)) {
  throw new Error('Cannot find input file with csv data: ' + fileName);
}

var redis = require("redis");
var client = redis.createClient();
var forEachLine = require('./lib/for-each-line-in-csv.js');

forEachLine(fileName, saveLine, function() { client.unref(); });

function saveLine(login, repo) {
  client.sadd('repo:' + repo, login, printError('repo', repo, login));
  client.sadd('user:' + login, repo, printError('user', repo, login));
}

function printError(type, repo, login) {
  return function(err) {
    if (err) console.log('!! Failed to save ' + type + ': ' + repo + '/' + login, err);
  };
}
