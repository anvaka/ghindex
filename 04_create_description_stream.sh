#!/bin/bash
# This script will create stream of repository name, description, watchers
source ./scripts_config

echo "Gathering description. Data will be saved to $DESCRIPTION_TABLE"

# This should yield approximately 1.6M+ records
bq --project_id $PROJECT_ID \
  query --batch \
  --allow_large_results \
  --destination_table $DESCRIPTION_TABLE \
  --replace \
"SELECT (repository_owner  + '/' + repository_name) as name,
       a.repository_description as description,
       a.repository_watchers as watchers
FROM [githubarchive:github.timeline] a
INNER JOIN EACH (
  SELECT MAX(repository_pushed_at) as last_push_date, repository_url
  FROM [githubarchive:github.timeline]
  WHERE type='PushEvent' AND repository_watchers > 0
  GROUP EACH BY repository_url
  ) b ON a.repository_url = b.repository_url AND a.repository_pushed_at = b.last_push_date
WHERE a.type='PushEvent' AND a.repository_watchers > 0
GROUP BY name, watchers, description , a.repository_watchers
ORDER BY a.repository_watchers DESC"
