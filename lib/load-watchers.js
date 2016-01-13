module.exports = loadWatchers;
var forEachLine = require('./for-each-line-in-csv.js');

function loadWatchers(fileName, doneCb) {
  var userRepo = new Map();
  var repoUsers = new Map();

  forEachLine(fileName, processLine, done);

  function processLine(user, repo) {
    addToMap(userRepo, user, repo);
    addToMap(repoUsers, repo, user);
  }

  function done() {
    doneCb(repoUsers, userRepo);
  }

  function addToMap(map, key, value) {
    var set = map.get(key);
    if (set) set.add(value);
    else map.set(key, new Set([value]));
  }
}
