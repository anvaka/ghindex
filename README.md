# ghindex

Creates GitHub index for similar repositories discovery. You can see working
website here: [Gazing Stargazers](http://www.yasiv.com/github/) (Last time indexed on Jun 9 - Jun 13, 2014). 

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
Each record in `./db/stars` will have user name as a key, and starred repositories
as a value.

This is the most time consuming step. As of Jun, 2014 GitHub had 13,000+ repositories
with more than 200 stars. This translates to 600,000+ unique users, who gave stars
to popular repositories.

Even though majority of users gave less than 100 stars to different projects, we
still need to make at least one request to fetch stars. I.e. we need to make more
than 600,000 requests to GitHub.

GitHub's current rate limit is 5,000 requests per hour, thus if we are indexing
with one token: `600,000/5,000 = 120` hours of work.

Good news, this indexer can be interrupted, and resumed at any time.

## 4. Constructing Recommendations

Now that we have all popular repositories with stargazers, let's construct 
recommendations database.

```
node constructRecommendations.js ./db/followers ./db/stars
```

This will read followers database produced in step 2, and stars database produced
in step 3. Results will be stored into two folders:

`out` - will contain `username/repoName.json` files for each repository with more than 200 stars
`projects` - will contain only `projects.json`. This file is array of all indexed repositories.

# That's it.

Normally this will be enough. I'm also uploading results into s3 bucket. This bucket
then used by yasiv frontend: http://www.yasiv.com/github/

# Help

If I can summarize this entire project in one line of code, [here it is](https://github.com/anvaka/ghindex/blob/03eba6e4b0f317f99f3b997fec62bf9f9b87e956/lib/findRelated.js#L31):

``` js
var index = 100 * 2 * sharedStarsCount/(analyzeRatio * (theirStarsCount + ourStarsCount));
```

This is variation of [Sørensen–Dice coefficient](http://en.wikipedia.org/wiki/S%C3%B8rensen%E2%80%93Dice_coefficient).
While it gives pretty decent starting point for projects discovery on GitHub,
it is not perfect. If you want to help me improve recommendations please feel free
to reach out to me: Open PR/[tweet](https://twitter.com/anvaka) to me/[email](mailto:anvaka@gmail.com) me.

PS: If you are working for GitHub, can you please make this feature part of GitHub?

# license

MIT
