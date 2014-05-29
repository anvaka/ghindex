/**
 * This module collects all followers of array of GitHub repositories
 */

var log = require('./log');

module.exports = indexFollowers;

function indexFollowers(remainingRepositories, db, ghClient) {
  var totalIndexed = 0;

  index(11000).then(function () {
    log('Finished indexing popular repositories followers');
  });

  function index(startFrom) {
    var hasMoreRepositories = remainingRepositories.length > startFrom;
    if (!hasMoreRepositories) return db.flush(); // we are done here.

    var repoName = remainingRepositories[startFrom].name;
    log('Indexing ', repoName);

    return ghClient.findFollowers(repoName)
      .then(save)
      .then(indexNextRepository);

    function save(followers) {
      log('Found', followers.length, 'followers');

      return db.save(repoName, followers);
    }

    function indexNextRepository() {
      totalIndexed++;
      if (totalIndexed % 100 === 0) log('Remaining repositories:', remainingRepositories.length - totalIndexed);

      return index(startFrom + 1);
    }
  }
}
