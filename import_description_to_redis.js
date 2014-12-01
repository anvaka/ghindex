/**
 * This script imports CSV file with projects information into redis
 *
 * Projects information is stored as hashes, where keys is "desc:" + project name
 * and value is { description: string, watchers: number }
 */

var fileName = process.argv[2];
var fs = require('fs');

if (!fs.existsSync(fileName)) {
  throw new Error('Cannot find input file with csv data: ' + fileName);
}

var inputFile = require('fs').createReadStream('./description.csv'),
  redis = require("redis"),
  client = redis.createClient(),
  csv = require('csv-parse'),
  parser = csv();

var processed = 0;
parser.on('readable', saveLine);
parser.on('end', function() {
  client.unref();
});

inputFile.pipe(parser);

function saveLine() {
  var line = parser.read();
  processed += 1;
  if (processed % 10000 === 0) console.log('Saved: ', processed);
  var repo = line[0];
  var splitIndex = repo.indexOf('/');
  if (splitIndex <= 0) return; // Ignore invalid repositories

  client.hmset('desc:' + repo,
    'description', line[1],
    'watchers', line[2],
    printError(repo));
}

function printError(name) {
  return function(err, res) {
    if (err) console.log('!! Failed to save ' + name, err);
  };
}
