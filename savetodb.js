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
  console.log('Read ' + allRepo.length + ' repositories;');
  return allRepo;
}

function saveOutput(array, dbFileName) {
  var level = require('level');
  var db = level(dbFileName, {valueEncoding: 'json'});

  var writeOps = array.map(function (x) {
    return { type: 'put', key: x.name, value: x };
  });

  db.batch(writeOps, function (err) {
    if (err) throw new Error('Failed to save ' + array.length + ' records for ' + dbFileName + '. Error: ' + err);
    console.log('Saved records to database: ', array.length);
  });
}

function printUsage() {
  console.log('Save json file of popular repositories into a leveldb database');
  console.log('  node savetodb ./allrepo.json ./db/repositories');
}

function handleError(err) {
  if (err) throw err;
}
