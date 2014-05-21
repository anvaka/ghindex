var Q = require('q');
var qs = require('querystring');
var request = require('request');
var log = require('./log');
var endpoint = 'https://api.github.com';

module.exports = githubClient;

function githubClient(tokens) {

  return {
    findRepo: function (q) {
      var requests = [];
      // GitHub can only return 1,000 paged items. Each page is 100 items long,
      // thus we schedule 10 requests.
      for (var i = 0; i < 10; ++i){
        requests.push(searchRepositories(q, i + 1, tokens));
      }

      return Q.all(requests).then(combine);
    }
  };
}

/**
  * Performs search request to github with given query `q` and page index `pageIdx`
  * This function will attempt to retry search if token has expired.
  *
  * @returns promise which resolves when results with array of repositories,
  * matching your query
  */
function searchRepositories(q, pageIdx, tokens) {
  var deferred = Q.defer();
  var currentToken = tokens.getNextAvailable();

  var search = endpoint + '/search/repositories?q=' + q + '&' + qs.stringify({
    access_token: currentToken,
    per_page: 100,
    sort: 'stars',
    page: pageIdx
  });

  var requestParams = {url: search, headers: { 'User-Agent': 'anvaka/gazer' }};
  log('getting ' + search);

  request(requestParams, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var data = JSON.parse(body);
      deferred.resolve(extractFields(data.items));
    } else if (!error && /API rate limit exceeded/.test(response.body)) {
      // next iteration should use another token:
      log(response.body);
      tokens.expire(currentToken);
      searchRepositories(q, pageIdx, tokens).then(function (items) {
        deferred.resolve(items);
      });
    } else {
      log('Error:', error, response && response.body);
      deferred.reject(error);
    }
  });

  return deferred.promise;
}

function combine(pages) {
  var result = [];
  pages.forEach(function (page) { result = result.concat(page); });
  return result.sort(function (a, b) {
    return b.watchers - a.watchers;
  });
}

function extractFields(items) {
  return items.map(function (item) {
    return {
      username: item.owner.login,
      name: item.full_name,
      description: item.description,
      language: item.language,
      watchers: item.watchers,
      forks: item.forks
    };
  });
}
