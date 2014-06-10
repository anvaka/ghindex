/**
 * GitHub stars indexer. Collects stars for a given user.
 * Usage:
 *   node starsIndexer followers stars  --tokens="A,B,C"
 *
 * Where:
 *   - followers: leveldb database name with indexed followers (produced by followersIndexer)
 *   - stars: leveldb database name where to save followers -> projects records.
 *   - tokens: Comma separated list of github access tokens (could be just one).
 *
 * Note: We treat users who gave more than 600 stars as users who gave 0 stars.
 * Theortically the more stars someone gives to projects, the less is the value
 * of a star, thus they can be ignored for similar projects constructions. In
 * practice, there is approx. 2% of GitHub users who gave more than 600 stars.
 */
var Promise = require("bluebird");
var tokens = require('./lib/tokens')();

if (tokens.enabled === 0) {
  printGenericHelp();
  return -1;
}

var githubClient = require('./lib/ghclient')(tokens);

console.log('Loading databases...');
var followersDB = loadDB(process.argv[2], true);
var starsDB = loadDB(process.argv[3]);

Promise.all([getUniqueFollowers(followersDB), starsDB.getAllKeys()])
  .spread(getRemainingFollowers)
  .then(getStarsForRemainingFollowers);

function getRemainingFollowers(allFollowers, indexedFollowers) {
  var indexed = {};
  indexedFollowers.forEach(function (f) { indexed[f] = 1; });

  var remaining = [];
  allFollowers.forEach(function (f) { if (!indexed[f]) remaining.push(f); });

  console.log('Total unique followers: ', allFollowers.length);
  console.log('Processed followers so far:', indexedFollowers.length);
  console.log('Remaining followers: ', remaining.length);

  return remaining;
}

function getStarsForRemainingFollowers(remainingFollowers) {
  var indexStars = require('./lib/indexStars');
  indexStars(remainingFollowers, starsDB, githubClient);
}

function printGenericHelp() {
  [
  'GitHub stars indexer. Collects stars for a given user.',
  'Usage:',
  '  node starsIndexer followers stars  --tokens="A,B,C"',
  '',
  'Where:',
  '  - followers: leveldb database name with indexed followers (produced by followersIndexer)',
  '  - stars: leveldb database name where to save followers -> projects records.',
  '  - tokens: Comma separated list of github access tokens (could be just one).',
  ].forEach(function (line) { console.log(line); });
}

function loadDB(name, required) {
  var fs = require('fs');
  if (required && !fs.existsSync(name)) throw new Error('Cannot load required database ' + name);

  return require('./lib/ldb')(name);
}

function getUniqueFollowers(followersDB) {
  var uniqueFollowers = {};

  return followersDB.forEach(recordProjectFollowers)
      .then(function () { return Object.keys(uniqueFollowers); });

  function recordProjectFollowers(projectName, followers) {
    followers.forEach(addFollower);
  }

  function addFollower(name) {
    uniqueFollowers[name] = 1;
  }
}
