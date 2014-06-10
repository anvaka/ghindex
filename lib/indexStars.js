/**
 * This module collects all stars of array of GitHub users
 */

var Promise = require('bluebird');
var log = require('./log');

module.exports = indexStars;

function indexStars(remainingUsers, db, ghClient) {
  var totalIndexed = 0;
  var parallelRequestsCount = 10; // fetch N users as parallel request.

  index(0).then(function () {
    log('Finished indexing stars for users');
  });

  function index(startFrom) {
    var hasMoreUsers = remainingUsers.length > startFrom;
    if (!hasMoreUsers) return db.flush(); // we are done here.

    var users = getNames(startFrom);
    log('Indexing ', users.join(', '));

    return Promise.all(users.map(findStars)).then(indexNextUser);

    function indexNextUser() {
      totalIndexed += parallelRequestsCount;
      var remaining = remainingUsers.length - totalIndexed;
      log('Remaining users:', remaining, (100 * remaining/remainingUsers.length).toFixed(2) + '%');

      return index(startFrom + parallelRequestsCount);
    }
  }

  function findStars(userName) {
    return ghClient.findStars(userName).then(save);

    function save(repositores) {
      log('Found', repositores.length, 'projects starred by', userName);

      return db.save(userName, repositores);
    }
  }

  function getNames(startFrom) {
    var names = [];
    var endAt = Math.min(remainingUsers.length, startFrom + parallelRequestsCount);

    for (var i = startFrom; i < endAt; ++i) {
      names.push(remainingUsers[i]);
    }

    return names;
  }
}
