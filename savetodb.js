/* Saves repository followers into a file */

var inputFile = process.argv[2];
if (!inputFile) {
  printUsage();
  return -2;
}
var dbFileName = process.argv[3];
if (!dbFileName) {
  printUsage();
  return -1;
}

saveOutput(readInput(inputFile), dbFileName);

function readInput(inputFile) {
  var allRepo = require(inputFile);
  console.log('Read ' + Object.keys(allRepo).length + ' repositories;');
  return allRepo;
}

function saveOutput(repositories, dbFileName) {
  var level = require('level');
  var db = level(dbFileName, {valueEncoding: 'json'});
  var repoNames = Object.keys(repositories);

  var writeOps = repoNames.map(function (name) {
    return { type: 'put', key: name, value: repositories[name] };
  });

  db.batch(writeOps, function (err) {
    if (err) throw new Error('Failed to save ' + repoNames.length + ' records for ' + dbFileName + '. Error: ' + err);
    console.log('Saved records to database: ', repoNames.length);
  });
}

function printUsage() {
  console.log('Save json file of followers into a leveldb database');
  console.log('  node savetodb ./allRepoFollowers.json ./db/followers');
}

function handleError(err) {
  if (err) throw err;
}
