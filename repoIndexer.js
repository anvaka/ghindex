/**
 * This file indexes all popular repositories on github which has more than 200 
 * stars
 */
var Q = require('q');
var tokens = require('./lib/tokens')();
var JSONStream = require('JSONStream');
var outStream = JSONStream.stringify();
outStream.pipe(process.stdout);

if (tokens.enabled > 0) {
  var githubClient = require('./lib/ghclient')(tokens);
  findRepositories(100000, []).fail(function(err) {
    console.error(err);
  });
} else {
  printTokenHelp();
}

var seen = {};
function findRepositories(minStars) {
  // github client can only process 1000 records. Split that into pages:
  if (minStars) {
    return githubClient.findRepo('stars:<' + (minStars + 1))
       .then(pause(5000))
       .then(processNextPage);
  } else {
    throw new Error('Min stars is required');
  }

  function processNextPage(repositories) {
    var minWatchers;
    for (var i = 0; i < repositories.length; ++i) {
      var repo = repositories[i];
      minWatchers = repo.watchers;
      if (minWatchers >= 200) {
        if (!seen[repo.name]) {
          outStream.write(repo);
          seen[repo.name] = true;
        }
      }
    }

    if (minWatchers && minWatchers >= 200) return findRepositories(minWatchers);
    outStream.end();
  }
}

function printTokenHelp() {
  [
    'Github access token is not present in environment variables',
    'Go to https://github.com/settings/applications and click "Create new token"',
    'Pass tokens as a comma-separated argument --tokens="A,B,C"'
  ].forEach(function (line) { console.log(line); });
}

function pause(timeMS) {
  return function (result) {
    var deferred = Q.defer();
    setTimeout(function () {
      deferred.resolve(result);
    }, timeMS);

    return deferred.promise;
  };
}
