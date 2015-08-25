module.exports = loadWatchers;

function loadWatchers(fileName, doneCb) {
  var fs = require('fs');
  var inputFile = require('fs').createReadStream(fileName),
    csv = require('csv-parse'),
    parser = csv();

  var userRepo = new Map();
  var repoUsers = new Map();

  var processed = 0;
  parser.on('readable', processLine);
  parser.on('end', function() {
    doneCb(userRepo, repoUsers);
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
    addToMap(userRepo, user, repo);
    addToMap(repoUsers, repo, user);

    processed += 1;
    if (processed % 100000 === 0) console.log('Processed: ', processed);
  }

  function addToMap(map, key, value) {
    var set = map.get(key);
    if (set) set.add(value);
    else map.set(key, new Set([value]));
  }
}
