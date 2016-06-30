#!/bin/bash
# This script will create stream of repository_url -> watcher events
# You will need to replace project id and destination table with your own:
source ./scripts_config

echo "Gathering watchers. Data will be saved to $WATCHERS_TABLE"

# This should yield approximately 19M+ records
bq --project_id $PROJECT_ID \
  query --batch \
  --allow_large_results \
  --destination_table $WATCHERS_TABLE \
  --replace \
"SELECT actor.login, repo.name
 FROM
 (TABLE_DATE_RANGE([githubarchive:day.],
    TIMESTAMP('2015-01-01'),
    TIMESTAMP('2016-01-04')
  ))
Where type = 'WatchEvent'"

