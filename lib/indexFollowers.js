/**
 * This module collects all followers of array of GitHub repositories
 */

var Promise = require('bluebird');
var log = require('./log');

module.exports = indexFollowers;

function indexFollowers(remainingRepositories, db, ghClient) {
  var totalIndexed = 0;
  var parallelRequestsCount = 5; // fetch N repositories as parallel request.

  index(0).then(function () {
    log('Finished indexing popular repositories followers');
  });

  function index(startFrom) {
    var hasMoreRepositories = remainingRepositories.length > startFrom;
    if (!hasMoreRepositories) return db.flush(); // we are done here.

    var repoNames = getNames(startFrom, parallelRequestsCount);
    log('Indexing ', repoNames.join(', '));

    return Promise.all(repoNames.map(findFollowers)).then(indexNextRepository);

    function indexNextRepository() {
      totalIndexed += parallelRequestsCount;
      if (totalIndexed % 100 === 0) log('Remaining repositories:', remainingRepositories.length - totalIndexed);

      return index(startFrom + parallelRequestsCount);
    }
  }

  function findFollowers(repoName) {
    return ghClient.findFollowers(repoName).then(save);

    function save(followers) {
      log('Found', followers.length, 'followers');

      return db.save(repoName, followers);
    }
  }

  function getNames(startFrom) {
    var names = [];
    var endAt = Math.min(remainingRepositories.length, startFrom + parallelRequestsCount);

    for (var i = startFrom; i < endAt; ++i) {
      names.push(remainingRepositories[i].name);
    }

    return names;
  }
}
