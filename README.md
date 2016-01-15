# Finding related projects on GitHub

This repository creates a recommendation database of "related" projects on GitHub.
Interactive version is available here: http://www.yasiv.com/github/#/

# How does it work?

How can we tell whether Project A is more related to Project B, than it is related
to Project C?

Turns out, that we, project followers, tend to give stars to similar projects.
If I gave stars to `A`, `B`, and `C`, and you gave stars to `A`, `B`, `C`, and `D`,
then I should probably go check out `D` as well. Giving stars on GitHub, most of
the time, is a good sign of project appreciation. So if we have starred three
projects together, then we value similar things.

To turn this fact into a number, I'm using [Sorensen-Dice](https://en.wikipedia.org/wiki/S%C3%B8rensen%E2%80%93Dice_coefficient)
similarity coefficient:

```
                        number_of_shared_stars(A, B)
similarity(A, B) = ---------------------------------------
                   number_of_stars(A) + number_of_stars(B)
```

"Developers who gave star to this repository, also gave star to ..." metric
works decently well for projects with 150 .. 2000 stars. For projects with
smaller amount of stars there is not enough intersection between watchers.
For extremely popular projects coefficient becomes higher when other project is
also extremely popular. Thus projects like Bootstrap get Angular, jQuery, and
Node as the most relevant.

# Data Gathering

[GitHub Archive](http://www.githubarchive.org/) provides gigabytes of data from
GitHub. We can query it using [Google's BigQuery API](https://bigquery.cloud.google.com).

For example, this query:

``` sql
SELECT repository_url, actor_attributes_login
FROM [githubarchive:github.timeline]
WHERE type='WatchEvent'
```

Give us list of repositories, along with users who gave them stars:

```
| Row | repository_url                                     | actor_attributes_login |
| --- | -------------------------------------------------- | ---------------------- |
| 1   | https://github.com/alump/Masonry                   | markiewb               |
| 2   | https://github.com/andrewjstone/rafter             | kirsn                  |
| 3   | https://github.com/jgraph/draw.io                  | nguyennamtien          |
| 4   | https://github.com/samvermette/SVWebViewController | dlo                    |
| 5   | https://github.com/mafintosh/peerflix              | 0xPr0xy                |
| ..  | ...                                                | ...                    |
```

By iteratively processing each record we can calculate number of stars for each
project. We can also find how many shared stars each project has with every
other project. But... The dataset is huge. Today (Nov 30, 2014) there are 25M
watch events produced, by more than 1.8M unique users. They are given to more than
1.2M unique repositories. We need to reduce the dataset:

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

## Why do we limit lower bound to at least 2 stars?

Since we are using [Sorensen-Dice similarity coefficient](https://en.wikipedia.org/wiki/S%C3%B8rensen%E2%80%93Dice_coefficient),
users who gave only 1 star total, can be excluded from "shared stars" metric.
In theory this will slightly skew similarity coefficient and make two projects more
similar than they should be, but in practice results seem to be helpful enough. This
also serves as a good filter against [bot attacks](https://github.com/Rohfosho/CosmosBrowserBackend/issues/13).

## Why do we limit upper  bound to at most 500?

To save the CPU power. Is this bad? There are only 0.7% of users who gave more
than 500 stars.

This query reduces dataset from 25M to 16M records.

# Data storing

We got the dataset, downloaded and stored into CSV file, for further processing.

To calculate similarity we need to be able to quickly answer two questions:

1. Who gave stars to `project A`?
2. Which projects were starred by `User B`?

If only we could save this into hash-like data structure - that would give us
O(1) time to answer both of these questions.

Naive solution to store all inside one process into hash (using either C++ or node)
turned out to be extremely inefficient. My processes exceeded 8GB RAM limit,
and started killing my laptop with constant swapping.

Maybe I should save it into a local database?

I tried to use [neo4j](http://neo4j.com/) but it failed with out of memory exception
during CSV import.

Next and last stop was [redis](http://redis.io/). Absolutely beautiful piece of
software. It swallowed 16M rows without blinking an eye. RAM was within sane 3GB
range, and disk utilization is only 700MB.

# Building recommendations

**EDIT (Jan 2016):**
At the moment GitHub Archive has changed it's API. Unfortunately repository
description and actual number of stars are no longer available.

I'm building offline indexer to crawl this information independently, but doing
this very slowly
** end of edit **


Recommendation database is created by these [~200 lines of code](https://github.com/anvaka/ghindex/blob/master/recommend.js).
There is a lot of asynchronous code in there, hidden behind promises.

In nutshell, this is what it's doing:

```
1. Find all repositories with more than 150 stars.
2. For each repository find users who gave it a star.
     For each user who gave a star, find which other projects were starred.
     For each other project increase number of shared stars
3. Produce similarity coefficient.
```

Final results are saved to disk, and then uploaded to S3, so that the [frontend](http://www.yasiv.com/github/)
can immediately get them.

# Final Notes

It takes ~2 hours 20 minutes to construct recommendations for 15K most popular
GitHub projects. It also takes another 40 minutes to prepare/download data from
BigQuery.

My previous approach, where I had to manually index GitHub via GitHub's API,
was taking approximately 5 days to build the index, and one more day to calculate
recommendations.

GitHub Archive is awesome; Redis is awesome too! Maybe next step will be improving
results with content-based recommendation. E.g. we could index source code and
find similarity based on AST. Anyway, please let me know what you think.

# license

MIT
