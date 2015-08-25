var fileName = process.argv[2];
var load = require('./lib/load-watchers.js');
load('./sortedwatchers.csv', function (u, r) { global.r = r; global.u = u; });
var recommend = require('./lib/recommend.js');

