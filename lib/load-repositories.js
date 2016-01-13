/**
 * loads set of unique repositories within csv file
 */
module.exports = loadRepositories;
var forEachLine = require('./for-each-line-in-csv.js');

function loadRepositories(fileName, doneCb) {
  var repos = new Set();

  forEachLine(fileName, processLine, done);

  function processLine(user, repo) {
    repos.add(user + '/' + repo);
  }

  function done() {
    doneCb(repos);
  }
}
