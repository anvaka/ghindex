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
similarity(A, B) = number_of_shared_stars(A, B)/(number_of_stars(A) + number_of_stars(B))
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

For example, this simple query:

``` sql
SELECT repository_url, actor_attributes_login
FROM [githubarchive:github.timeline]
WHERE type='WatchEvent'
```

Will give us list of repositories, along with users who gave them stars:

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
project. We can also find out how many shared stars each project has with every
other project. But... The dataset is huge. Today (Nov 30, 2014) there are 25M
watch events produced, by more than 1.8M unique users. They are given to more than
1.2M unique repositories. We need to reduce this dataset:

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

To save the CPU power. Is this bad? There are only 0.7% of users who gave more
than 500 stars.

This query reduces dataset from 25M to 16M records.

# license

MIT
