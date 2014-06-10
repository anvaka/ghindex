var Promise = require('bluebird');
var request = Promise.promisify(require("request"));
var qs = require('querystring');
var log = require('./log');
var endpoint = 'https://api.github.com';

module.exports = githubClient;

function githubClient(tokens) {

  return {
    findRepositories: function (q) {
      var requests = [];
      // GitHub can only return 1,000 paged items for searc. Each page is 100
      // items long. Thus we schedule 10 requests.
      for (var i = 0; i < 10; ++i) {
        requests.push(searchRepositories(q, i + 1, tokens));
      }

      return Promise.all(requests).then(combine);
    },

    findStars: function (userName) {
      return getAllPages('users/' + userName + '/starred', tokens, 6)
              .then(function (repositories) {
                return repositories.map(compactRepositoryInfo);
              });
    },

    findFollowers: function (projectName) {
      return getAllPages('repos/' + projectName + '/stargazers', tokens)
              .then(function (followers) {
                return followers.map(function (follower) { return follower.login; });
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
  var currentToken = tokens.getNextAvailable();

  var search = endpoint + '/search/repositories?q=' + q + '&' + qs.stringify({
    access_token: currentToken,
    per_page: 100,
    sort: 'stars',
    page: pageIdx
  });

  var requestParams = {url: search, headers: { 'User-Agent': 'anvaka/gazer' }};
  log('getting ' + search);

  return request(requestParams)
    .spread(function (response, body) {
      if (response.statusCode === 200) {
        var data = JSON.parse(body);
        return extractFields(data.items);
      } else if (/API rate limit exceeded/.test(response.body)) {
        // next iteration should use another token:
        log(response.body);
        tokens.expire(currentToken);
        return searchRepositories(q, pageIdx, tokens);
      }
    });
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

function getLastPageNumberFromRel(rel) {
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
function getAllPages(resource, tokens, stopAfter) {
  if (typeof stopAfter !== 'number') stopAfter = Number.MAX_VALUE;

  var data = [];

  return getFirstPage()
          .then(saveFirstPage)
          .then(processRemaining);

  function getFirstPage() {
    log('Downloading ' + resource);
    return makeRequest(resource, {page: 1, per_page: 100}, tokens);
  }

  function saveFirstPage(serverResponse) {
    log('Got page: 1 for ' + resource);
    save(serverResponse.body);

    return {
      data: serverResponse,
      lastPageNumber: getLastPageNumberFromRel(serverResponse.rel)
    };
  }

  function save(rawRecords) {
    for (var i = 0; i < rawRecords.length; ++i) {
      data.push(rawRecords[i]);
    }
  }

  function savePage(pageNumber) {
    return function (data) {
      log('Got page ' + pageNumber + ' for ' + resource);
      save(data.body);
    };
  }

  function processRemaining(firstPageData) {
    var lastPageNumber = firstPageData.lastPageNumber;
    if (lastPageNumber) {
      if (lastPageNumber > stopAfter) {
        return []; // ignore this user. Too many stars
      }

      var remainingPages = [];

      for (var i = 2; i <= lastPageNumber; ++i) {
        var promise = makeRequest(resource, {page: i, per_page: 100}, tokens).then(savePage(i));
        remainingPages.push(promise);
      }

      return Promise.all(remainingPages).then(function(){ return data; });
    }

    // It has only one page or `rel` did not include information about pages
    return data;
  }
}

function makeRequest(resource, args, tokenService, retryAttempt) {
    args = args || {};
    var accessToken = tokenService.getNextAvailable();
    args.access_token = accessToken;
    var url = endpoint + '/' + resource + '?' + qs.stringify(args);
    var requestParams = {url: url, headers: { 'User-Agent': 'anvaka/gazer' }};

    if (typeof retryAttempt !== 'number') retryAttempt = 0;

    return request(requestParams).spread(processGithubResponse).error(processError);

    function processGithubResponse(response, body) {
      var rateLimit = response.headers['x-ratelimit-remaining'];
      if ((rateLimit % 100) === 0) log('Current GitHub API rate limit: ' + rateLimit);

      if (rateLimit > 0) {
        return {
          body: JSON.parse(response.body),
          rel: extractRel(response)
        };
      }

      // inform the token service that this token is expired.
      tokenService.expire(accessToken);
      var waitTime = 1000;
      log('Rate limit exceeded (', rateLimit, '). Waiting for the next window in ', waitTime, 'ms');
      log('Headers: ', response.headers);

      // todo: promisify token service, so that we are waiting exactly required
      // amount of time.
      return Promise.delay(waitTime).then(retry);
    }

    function processError(err){
      log('Make request got an error: ' + err + ' at retry attemp #' + retryAttempt);

      if (retryAttempt < 3) {
        log('Retrying...' + JSON.stringify(args));
        return retry(retryAttempt + 1);
      }

      throw new Error('Github did not return data afetr 3 retries. Giving up');
    }

    function retry(retryAttempt) {
      return makeRequest(resource, args, tokenService, retryAttempt);
    }
}

function compactRepositoryInfo(repo) {
  return {
    full_name : repo.full_name,
    description: repo.description,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    forks_count: repo.forks_count,
    watchers_count: repo.watchers_count,
    language: repo.language
  };
}
