# ghindex

Creates github index for similar repositories discovery. WIP

# Usage

## 1. Gatehring popular repositories

To index popular repositories (> 200 stars):

```
node repoIndexer.js --tokens="COMMA_SEPARATED_LIST_OF_GITHUB_TOKENS" > allrepo.json
```

This will save JSON stream of repositories with >= 200 stars into file `allrepo.json`.

If you think something does not go right, you can enable logging, by setting ENABLE_LOG
variable:

```
ENABLE_LOG=1 node repoIndexer.js --tokens=...
```

## 2. Gathering followers for repositories

Second step to building index of recommendations is to gather followers of popular
repositories. To do so run:

```
node followersIndex.js allRepo.json ./db/followers --tokens="COMMA_SEPARATED_LIST_OF_GITHUB_TOKENS"
```

This will create a new leveldb database `followers` inside `db` folder. The database
will include all repositories from `allrepo.json` along with users who gave them a star.

## 3. Gathering stars

Last indexing step is to collect all repositories which are starred by found users.
To do so run:

```
node starsIndexer.js ./db/followers ./db/stars  --tokens="COMMA_SEPARATED_LIST_OF_GITHUB_TOKENS"
```

This will read all unique followers from the followers database `./db/followers`,
constructed in step 2, and will output results into database called `./db/stars`.

This is the most time consuming step. As of Jun, 2014 GitHub had 13,000+ repositories
with more than 200 stars. This translates to 600,000+ unique users, who gave stars
to popular repositories. Even though majority of users gave less than 100 stars
to different projects, we still need to make at least one request to fetch stars. I.e.
we need to make more than 600,000 requests to GitHub.

GitHub's current rate limit is 5,000 per hour, thus if we are indexing with one
token: 600,000/5,000 = 120 hours of work.

# license

MIT
