#!/bin/bash
# This script will create stream of repository name, description, watchers
source ./scripts_config

echo "Gathering description. Data will be saved to $WATCHERS_TABLE"

# This should yield approximately 16M+ records
bq --project_id $PROJECT_ID \
  query --batch \
  --allow_large_results \
  --destination_table $WATCHERS_TABLE \
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

