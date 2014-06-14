/**
 * Constructs GitHub recommendation database. Based on followers of a project
 * attemtps to find related proejcts. This program saves results into `out` folder
 *
 * Usage:
 *   node --max-old-space-size=8192 constructRecommendations.js ./db/followers ./db/stars
 *
 * Where:
 *   - followers: leveldb database name with indexed followers (produced by followersIndexer)
 *   - stars: leveldb database name with indexed stars (produced by starsIndexer)
 *
 * Note: we are using large heap size for node, since we load full databases in memory.
 * You don't have to do this, but processing will be extremely slow otherwise.
 *
 * Information about 671,072 followers requires ~6GB of RAM.
 */
var fs = require('fs');
var saveRecommendation = require('./lib/saveRecommendation');

if (!checkInput()) {
  printHelp();
  return -1;
}

fs.mkdirSync('./out');
fs.mkdirSync('./projects');

// we will iterate over each project:
var projectsDB = openDB(process.argv[2]);

// and we will need all followers:
loadFullDBInMemory(process.argv[3]).then(processProjects);

function processProjects(usersDB) {
  var projects = [];
  projectsDB.forEach(constructRecommendations).then(writeProjectsFile);

  function constructRecommendations(projectName, followers) {
    console.log('Processing', projectName);
    var related = require('./lib/findRelated')(followers, usersDB);
    saveRecommendation(projectName, related);
    projects.push(projectName);
  }

  function writeProjectsFile() {
    var projectsFile ='./projects/projects.json';
    console.log('Saving projects file to', projectsFile);
    fs.writeFileSync(projectsFile, JSON.stringify(projects));
  }
}

function openDB(name) {
  console.log('Opening ' + name + '...');
  return require('./lib/ldb')(name);
}

function loadFullDBInMemory(name) {
  var db = openDB(name);
  var records = Object.create(null);
  var totalRead = 0;

  return db.forEach(readRecord).then(returnRecords);

  function readRecord(key, value) {
    records[key] = value;
    totalRead += 1;
  }

  function returnRecords() {
    console.log('Loaded ' + totalRead + ' records');
    return records;
  }
}

function checkInput() {
  console.log('Checking command arguments');

  console.log('Followers database:', process.argv[2]);
  if (!fs.existsSync(process.argv[2])) {
   console.log('Followers database is missing' + name);
   return;
  }

  console.log('Stars database:', process.argv[3]);
  if (!fs.existsSync(process.argv[3])) {
   console.log('Stars database is missing' + name);
   return;
  }

  if (fs.existsSync('./out')) {
    // just to make sure we do not overwrite old stuff.
    console.log('Output folder `./out` is present. Please remove it to proceed.');
    return;
  }

  return true; // all is good
}

function printHelp() {
  [
'--------------------------------------------------------------------------',
'Constructs GitHub recommendation database. Based on followers of a project',
'attemtps to find related proejcts. This program saves results into `out` folder',
'',
'Usage:',
'  node --max-old-space-size=8192 constructRecommendations.js ./db/followers ./db/stars',
'',
'Where:',
'  - followers: leveldb database name with indexed followers (produced by followersIndexer)',
'  - stars: leveldb database name with indexed stars (produced by starsIndexer)',
'',
'Note: we are using large heap size for node, since we load full databases in memory.',
'You don\'t have to do this, but processing will be extremely slow otherwise.',
'',
'Information about 671,072 followers requires ~6GB of RAM.']
.forEach(function (line) { console.log(line); });
}
