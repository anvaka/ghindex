module.exports = githubClient;

var githubRequest = require('./githubRequest.js');
var Promise = require('bluebird');

function extractRepoInfo(repo) {
  return {
    name: repo.full_name,
    description: repo.description,
    fork: repo.fork,
    created_at: repo.created_at, // "2014-01-02T05:27:25Z",
    updated_at: repo.updated_at, // "2016-01-11T21:38:19Z",
    pushed_at: repo.pushed_at,   // "2015-09-25T04:43:04Z",
    size: repo.size,
    watchers: repo.stargazers_count,
    forks: repo.forks_count
  };
}

function githubClient(token) {
  var tokenPart = '';
  if (token) tokenPart = 'access_token=' + token + '&';

  var REPO_DETAILS = 'https://api.github.com/repos/';

  return {
    getRepositoriesInfo: getRepositoriesInfo
  };

  function getRepositoriesInfo(repositories) {
    return Promise.map(repositories, toRequest, {
      concurrency: 3
    });
    function toRequest(repoName) {
      var detailsRequest = createRequestArgs(REPO_DETAILS + repoName + '?' + tokenPart);
      console.log('Indexing https://github.com/' + repoName);

      return githubRequest(detailsRequest).then(extractRepoInfo).catch(handleError);

      function handleError(err) {
        if (err && err.statusCode === 404) {
          console.log('repository not found: ' + repoName);
          return { name: repoName, error: 404 };
        }
        throw err;
      }
    }
  }
}


function createRequestArgs(uri) {
  return {
    uri: uri,
    resolveWithFullResponse: true,
    headers: {
      'User-Agent': 'anvaka/ghindex'
    }
  };
}
