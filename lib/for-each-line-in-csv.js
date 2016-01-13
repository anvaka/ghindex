/**
 * Reads csv file of watch events line by line
 */
var fs = require('fs');
var csv = require('csv-parse');
module.exports = forEachLine;

function forEachLine(fileName, cb, done) {
  var inputFile = fs.createReadStream(fileName);
  var parser = csv();
  var processed = 0;

  parser.on('readable', processLine);
  parser.on('end', function() {
    done();
  });

  inputFile.pipe(parser);

  function processLine() {
    var line = parser.read();
    if (!line) return;
    var user = line[0];
    var repo = line[1];

    // we want to fix twitter. Normally we should not care about it
    // but in this it has to be changed, since it is so popular
    if (user === 'twitter' && repo === 'bootstrap') {
      user = 'twbs';
    }

    if (!repo || repo.indexOf('/') <= 0) return; // ignore invalid data.

    cb(user, repo);
    processed += 1;
    if (processed % 100000 === 0) console.log('Read ' + processed + ' lines of ' + fileName);
  }
}
