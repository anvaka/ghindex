/**
 * For each unique repository in the watchers.csv file
 * index repository from github and save it into
 * redis database
 */
console.log('Loading set of unique repositories');
var redis = require('redis');
var githubClient = require('./lib/githubClient.js')(process.env.GH_TOKEN);
var Promise = require('bluebird');
var client = redis.createClient();

Promise.promisifyAll(client);

getUnindexedRepositories()
  .then(crawlNextChunk);

function crawlNextChunk(projects) {
  if (projects.length === 0) {
    console.log('All done. No more projects to index.');
    client.unref();
    return;
  }

  processNext(projects, 10);
}

function processNext(array, count) {
  count = Math.min(count, array.length);
  var chunk = [];
  for (var i = 1; i < count + 1; ++i) {
    chunk.push(array[array.length - i]);
  }
  array.length -= count;
  console.log('Remaining count: ' + array.length);

  githubClient.getRepositoriesInfo(chunk)
    .then(saveRepositories)
    .then(function () {
      crawlNextChunk(array);
    });
}

function saveRepositories(repositories) {
  return Promise.map(repositories, addRepositoryInfo, {
    concurrency: 3
  });

  function addRepositoryInfo(repo) {
    if (!repo.name) throw new Error('Cannot save undefined repository!');
    return client.hmset('rinfo:' + repo.name, repo, printError(repo));
  }
}

function getUnindexedRepositories() {
  return client.keysAsync('repo:*').then(function(keys) {
    return keys.map(toName);
  });

  function toName(repo) {
    // remove 'repo:' prefix from the key:
    return repo.substr(5);
  }
}

function printError(repo) {
  return function(err) {
    if (err) console.log('!! Failed to save ' + JSON.stringify(repo) + '; Error: ' + err);
  };
}
