module.exports = recommend;

function recommend(repoName, repoMap, userMap) {
  var followers = repoMap.get(repoName);
  var result = [];
  var related = getRepositoriesStarredByFollowers(followers);
  related.forEach(computeSimilarity);

  return result.sort(bySimilarity);

  function computeSimilarity(otherRepo) {
    var otherFollowers = repoMap.get(otherRepo);
    var total = followers.size + otherFollowers.size;
    var shared = 0;
    var a = followers.size < otherFollowers.size ? followers : otherFollowers;
    var b = followers.size < otherFollowers.size ? otherFollowers : followers;
    for (var i of a) {
      if (b.has(i)) shared += 1;
    }
    result.push({
      n: otherRepo,
      r: shared / (total - shared)
    });
  }

  function getRepositoriesStarredByFollowers(followers) {
    var repositories = new Set();
    followers.forEach(getStarredRepositories);
    return repositories;

    function getStarredRepositories(user) {
      userMap.get(user).forEach(function(otherRepo) {
        repositories.add(otherRepo);
      });
    }
  }


  function bySimilarity(x, y) {
    return y.r - x.r;
  }
}
