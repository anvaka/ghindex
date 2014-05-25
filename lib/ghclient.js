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
    },

    findFollowers: function (projectName) {
      return getAllPages('repos/' + projectName + '/stargazers', tokens)
              .then(function (pagedData) {
                return pagedData.data.map(function (u) { return u.login; });
              });
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

function getLastPageFromRel(rel) {
  if (rel) {
    for (var i = 0; i < rel.length; ++i) {
      if (rel[i].rel === 'last') {
        var pageMatch = rel[i].href.match(/page=(\d+)/);
        return pageMatch && parseInt(pageMatch[1], 10);
      }
    }
  }
}

function extractRel(response) {
  var rel = [];
  var relLink = response.headers.link;
  if (relLink) {
    rel = relLink.split(',').map(function(x) {
      var rel = {};
      var relMatch = x.match(/<(.+)>; rel="(.+)"/i);
      if (relMatch) {
        rel.href = relMatch[1];
        rel.rel = relMatch[2];
      }
      return rel;
    });
  }
  return rel;
}

/**
 * This function traverses all pages of a given resource on github. It assumes
 * sequential page numbers, which will not be necessary true in future.
 */
function getAllPages(resource, tokens, options) {
  options = options || {};

  var deferred = Q.defer();
  var data = [];
  var checkLimits = (typeof options.rejectIfMoreThan === 'number');

  getFirstPage()
    .then(saveFirstPage)
    .then(processRemaining, deferred.reject);

  return deferred.promise;

  function save(rawRecords) {
    for (var i = 0; i < rawRecords.length; ++i) {
      data.push(rawRecords[i]);
    }
  }

  function processRemaining(firstPageData) {
    if (checkLimits && firstPageData.lastPage > options.rejectIfMoreThan) {
      deferred.resolve({
        data: data,
        pages: firstPageData.lastPage,
        beyondLimit: true
      });
    } else {
      getRemainingPagesIfAny(firstPageData);
    }
  }

  function savePage(pageNumber) {
    return function (data) {
      log('Got page ' + pageNumber + ' for ' + resource);
      save(data.body);
    };
  }

  function getRemainingPagesIfAny(firstPageData) {
    var lastPage = firstPageData.lastPage;
    if (lastPage) {
      var remainingPages = [];
      for (var i = 2; i <= lastPage; ++i) {
        var promise = makeRequest(resource, {page: i, per_page: 100}, tokens).then(savePage(i));
        remainingPages.push(promise);
      }
      Q.all(remainingPages).then(function(){
          deferred.resolve({
            data: data,
            pages: lastPage
          });
        }, deferred.reject);
    } else {
      // It has only one page:
      deferred.resolve({
        data: data,
        pages: 1
      });
    }
  }

  function getFirstPage() {
    log('Downloading ' + resource);
    return makeRequest(resource, {page: 1, per_page: 100}, tokens);
  }

  function saveFirstPage(serverResponse) {
    var lastPage = getLastPageFromRel(serverResponse.rel);
    deferred.notify({ total: lastPage });
    log('Got page: 1 for ' + resource);
    save(serverResponse.body);
    return {
      data: serverResponse,
      lastPage: lastPage
    };
  }
}

function makeRequest(resource, args, tokenService, retryAttempt) {
    args = args || {};
    var accessToken = tokenService.getNextAvailable();
    args.access_token = accessToken;
    var url = endpoint + '/' + resource + '?' + qs.stringify(args);
    var requestParams = {url: url, headers: { 'User-Agent': 'anvaka/gazer' }};

    var defer = Q.defer();
    if (typeof retryAttempt !== 'number') {
      retryAttempt = 0;
    }

    request(requestParams, function (err, response) {
      if (err) {
        log('Make request got an error: ' + err + ' at retry attemp #' + retryAttempt);
        if (retryAttempt < 3) {
          log('Retrying...' + JSON.stringify(args));
          makeRequest(resource, args, tokenService, retryAttempt + 1).then(defer.resolve, defer.reject);
        } else {
          log('Giving up.');
          defer.reject(err);
        }
        return;
      }
      try {
        var rateLimit = response.headers['x-ratelimit-remaining'];
        if (rateLimit <= 0) {
          var waitTime = 1000;

          log(rateLimit);
          log(response.headers);
          tokenService.expire(accessToken); // inform the token service that this token is expired.
          log('Rate limit exceeded. Waiting for the next window in ' + waitTime + ' ms');
          setTimeout(function () {
            makeRequest(resource, args, tokenService).then(defer.resolve, defer.reject);
          }, waitTime);
        } else {
          if ((rateLimit % 100) === 0) {
            log('Rate limit: ' + rateLimit);
          }
          var parsedBody;
            parsedBody = JSON.parse(response.body);
            defer.resolve({
              body: parsedBody,
              rel: extractRel(response)
            });
        }
      } catch (e) {
        log('Error! Failed to parse server response.', e);
        defer.reject(e);
      }
    });

    return defer.promise;
  }
