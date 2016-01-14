/**
 * This is core of our recommendation generation. The following 200 lines of code
 * will construct a database of related projects. The database is based on file system
 * and has the following structure:
 *
 * out
 *  user_a
 *    repository_a.json
 *    repository_b.json
 *  user_b
 *    repository_c.json
 *  ...
 *
 * Each .json file contains array of related projects.
 */
var OUTPUT_ROOT = 'out';

// Doesn't make sense to recommend for projects with less than 150 watchers:
// results are usually very poor in that case
var MIN_STARS = 150;

var redis = require('redis');
var path = require('path');
var fs = require('fs');
var Promise = require('bluebird');
var client = redis.createClient();

Promise.promisifyAll(client);
ensureFolderStructure();
cacheProjectInfo().then(runRecommender);

// there is no top-level code beyond this point
return;

function ensureFolderStructure() {
  if (!fs.existsSync(OUTPUT_ROOT)) fs.mkdirSync(OUTPUT_ROOT);
}

function runRecommender(projectCache) {
  var projectsToProcess = Object.keys(projectCache)
    .filter(byWatchersThreshold)
    .sort(byWatchersCount);

  Promise.map(projectsToProcess, toRecommendation, {
    concurrency: 1
  }).then(function (projects) {
    var targetFile = path.join(OUTPUT_ROOT, 'projects.json');
    fs.writeFileSync(targetFile, JSON.stringify(projects));
    console.log('Done!');
    client.unref();
  });

  function byWatchersCount(x, y) {
    return projectCache[y].watchers - projectCache[x].watchers;
  }

  function byWatchersThreshold(projectName) {
    var starsCount = projectCache[projectName].watchers;
    return MIN_STARS < starsCount;
  }

  function toRecommendation(projectName) {
    return findSimilarTo(projectName, projectCache).then(save);

    function save(recommendation) {
      console.log('Saving recommendation for', projectName);
      var pair = projectName.split('/');
      var user = pair[0];
      var repo = pair[1];
      var targetPath = path.join(OUTPUT_ROOT, user);
      var targetFile = path.join(targetPath, repo + '.json').toLowerCase();

      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath);
      }

      fs.writeFileSync(targetFile, JSON.stringify(recommendation.map(shorten)));
      return projectName;
    }
  }
}

function shorten(record) {
  // since we are serving from S3, want to minimize amount of data:
  return {
    n: record.name,
    r: record.index.toFixed(4) * 100,
    d: record.description,
    w: record.watchers
  };
}

function cacheProjectInfo() {
  // key - project name; value - { watchers: number, description: string };
  var project = Object.create(null);
  var totalCached = 0;

  return client.keysAsync('repo:*').then(function(keys) {
    return keys.filter(byValidName);
  }).map(toNumberOfStars, {
    concurrency: 3
  }).then(returnProjects);

  function byValidName(repo) {
    var parts = repo.substr(5).split('/');  // remove first five letters "repo:"
    return parts[0] && parts[1];
  }

  function toNumberOfStars(key) {
    return client.scardAsync(key).then(saveStars);

    function saveStars(watchers) {
      totalCached += 1;
      var name = key.substr(5); // remove first five letters "repo:"
      project[name] = new ProjectInfo(watchers);
      if (totalCached % 50000 === 0) {
        console.log('Cached information about', totalCached, 'projects');
      }
    }
  }

  function returnProjects() {
    console.log('Projects are cached');
    return project;
  }
}

function findSimilarTo(projectName, projectCache) {
  console.log('Building recommendations for', projectName);
  return client.smembersAsync('repo:' + projectName)
    .then(buildRecommendations);

  function buildRecommendations(stargazers) {
    var ourStars = stargazers.length;
    var sharedStars = Object.create(null);

    return Promise.all(stargazers.map(toSharedStars))
      .then(calculateSimilarityIndex);

    function toSharedStars(user) {
      return client.smembersAsync('user:' + user).then(calculateSharedStars);

      function calculateSharedStars(watchingRepositories) {
        watchingRepositories.forEach(markAsShared);
        return sharedStars;
      }

      function markAsShared(project) {
        if (!project) {
          return; // Data is not as clean as I'd like it to be...
        }
        if (sharedStars[project]) {
          sharedStars[project] += 1;
        } else {
          sharedStars[project] = 1;
        }
      }
    }

    function calculateSimilarityIndex() {
      var topSuggestions = Object.keys(sharedStars)
        .map(toSimilarityIndex)
        .sort(bySimilarityIndex)
        .splice(0, 101);
      return Promise.map(topSuggestions, toIndexWithDescription, {
        concurrency: 3
      });
    }

    function toIndexWithDescription(similarityInfo) {
      if (similarityInfo.description !== undefined) {
        // Good. Data is already here.
        return similarityInfo;
      }
      var project = projectCache[similarityInfo.name];
      if (project.description !== undefined) {
        // data was cached, but still not assigned to record
        similarityInfo.description = project.description;
        similarityInfo.watchers = project.watchers;
        return similarityInfo;
      }

      // let's go get this data from the database
      return client.hgetallAsync('desc:' + similarityInfo.name)
        .then(function(dbInfo) {
          if (!dbInfo) {
            // project database does not have it.
            project.description = '';
            similarityInfo.description = '';
            return similarityInfo;
          }
          similarityInfo.description = dbInfo.description;
          similarityInfo.watchers = dbInfo.watchers;
          return similarityInfo;
        });
    }

    function bySimilarityIndex(x, y) {
      return y.index - x.index;
    }

    function toSimilarityIndex(repo) {
      var sharedStarsCount = sharedStars[repo];
      var info = projectCache[repo];
      if (!info) {
        console.log('Something is wrong. Cannot find stars info about ' + repo);
      }
      // regular Sorensen-Dice similarity coefficient:
      var index = 2 * sharedStarsCount / (info.watchers + ourStars);
      return new SimilarityInfo(repo, index, ourStars, info);
    }
  }
}

function SimilarityInfo(name, similarityIndex, actualWatchers, info) {
  this.name = name;
  this.index = similarityIndex;
  this.description = info.description;
  this.watchers = info.watchers !== undefined ? info.watchers : actualWatchers;
}

function ProjectInfo(watchers, description) {
  this.watchers = watchers;
  this.description = description;
}
