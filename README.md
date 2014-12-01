# ghindex

Creates GitHub index for similar repositories discovery. You can see working
website here: [Gazing Stargazers](http://www.yasiv.com/github/) (Last time indexed on Jun 9 - Jun 13, 2014). 

# Usage - Old approach

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

Note: `COMMA_SEPARATED_LIST_OF_GITHUB_TOKENS` - can be just a single token, which you can create in [Personal access tokens](https://github.com/settings/applications) page.


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

# Alternative ways to source data? (New approach)

It looks like [Google's BigQuery](https://bigquery.cloud.google.com) is a good candidate 
for faster sourcing. E.g. this command:

``` sql
SELECT repository_url, actor_attributes_login
FROM [githubarchive:github.timeline]
WHERE type='WatchEvent' AND actor_attributes_login IN (
  SELECT actor_attributes_login FROM [githubarchive:github.timeline] 
  WHERE type='WatchEvent'
  GROUP BY actor_attributes_login HAVING (count(*) > 1) AND (count (*) < 500)
)
GROUP EACH BY repository_url, actor_attributes_login;
```

## Why are we limiting lower bound to at least 2 stars?

Since we are using  [Sorensen-Dice similarity coefficient](https://en.wikipedia.org/wiki/S%C3%B8rensen%E2%80%93Dice_coefficient),
users who gave only 1 star total, can be excluded from "shared stars" metric.
In theory this will slightly skew similarity coefficient and make two projects more
similar than they should be, but in practice results seem to be helpful enough. This
also serves as a good filter against [bot attacks](https://github.com/Rohfosho/CosmosBrowserBackend/issues/13).

## Why do we limit upper  bound to at most 500? 

Computing similarity coefficient is very much CPU/Memory intensive. We limit to 500
to make computation faster. In theory this should impact skew similarity coefficient
towards user who gave less stars, but in pracrice, there seem to be ony 0.7% of users
who gave more than 500 stars.

The 0.7% is calculated from comparing number of results when executing

``` sql
SELECT actor_attributes_login, COUNT(actor_attributes_login) FROM [githubarchive:github.timeline] 
WHERE type='WatchEvent'
GROUP BY actor_attributes_login 
HAVING (count(*) > 1) AND (COUNT(*) <= 500)
```

(~`787,000`) and

``` sql
SELECT actor_attributes_login, COUNT(actor_attributes_login) FROM [githubarchive:github.timeline] 
WHERE type='WatchEvent'
GROUP BY actor_attributes_login 
HAVING (count(*) > 500)
```

`5,532`.

To produce final file with repository descriptions we need to get all descriptions:

``` sql
SELECT (repository_owner  + '/' + repository_name) as name, 
       a.repository_description as description, 
       a.repository_watchers as watchers
FROM [githubarchive:github.timeline] a
INNER JOIN EACH (
  SELECT MAX(repository_pushed_at) as last_push_date, repository_url
  FROM [githubarchive:github.timeline]
  WHERE type="PushEvent" AND repository_watchers > 0
  GROUP EACH BY repository_url
  ) b ON a.repository_url = b.repository_url AND a.repository_pushed_at = b.last_push_date
WHERE a.type='PushEvent' AND a.repository_watchers > 0
GROUP BY name, watchers, description , a.repository_watchers 
ORDER BY a.repository_watchers DESC
```

I'm also returning stars here, since this information is rendered on www.yasiv.com/github/

will give a list of repositories along with user names who liked them. In theory 
this should be enough to start building recommendation database.

# license

MIT
