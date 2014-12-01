#!/bin/bash
# This script will create stream of repository_url -> watcher events
# You will need to replace project id and destination table with your own:
PROJECT_ID=yasivcom
DESTINATION=yasivcom:github_watch.watch_events

echo "Gathering watchers. Data will be saved to $DESTINATION"

bq --project_id $PROJECT_ID \
  query --batch \
  --allow_large_results \
  --destination_table $DESTINATION \
  --replace \
"SELECT repository_url, actor_attributes_login
  FROM [githubarchive:github.timeline]
  WHERE type='WatchEvent' AND actor_attributes_login IN (
    SELECT actor_attributes_login FROM [githubarchive:github.timeline]
    WHERE type='WatchEvent'
    GROUP BY actor_attributes_login
    HAVING (count(*) > 1) AND (count (*) < 500)
  )
  GROUP EACH BY repository_url, actor_attributes_login"

