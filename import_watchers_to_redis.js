/**
 * This script imports CSV file with watchers information into redis
 *
 * Each line is stored as a set twice:
 *
 * repo:repository_name -> [list of star gazers]
 * user:user_name -> [list of starred repositories]
 */

var fileName = process.argv[2];
var fs = require('fs');

if (!fs.existsSync(fileName)) {
  throw new Error('Cannot find input file with csv data: ' + fileName);
}

var inputFile = require('fs').createReadStream(fileName),
  redis = require("redis"),
  client = redis.createClient(),
  csv = require('csv-parse'),
  parser = csv();

var processed = 0;
parser.on('readable', saveLine);
parser.on('end', function() { client.unref(); });

inputFile.pipe(parser);

function saveLine() {
  var line = parser.read();
  if (!line) return;
  var login = line[0];
  var repo = line[1];

  // we want to fix twitter. Normally we should not care about it
  // but in this it has to be changed, since it is so popular
  if (login === 'twitter' && repo === 'bootstrap') {
    login = 'twbs';
  }
  if (!repo || repo.indexOf('/') <= 0) return; // ignore invalid data.

  processed += 1;
  if (processed % 10000 === 0) console.log('Saved: ', processed);
  client.sadd('repo:' + repo, login, printError('repo', repo, login));
  client.sadd('user:' + login, repo, printError('user', repo, login));
}

function printError(type, repo, login) {
  return function(err, res) {
    if (err) console.log('!! Failed to save ' + type + ': ' + repo + '/' + login, err);
  };
}
