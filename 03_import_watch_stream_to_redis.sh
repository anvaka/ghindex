#!/bin/bash

source ./scripts_config

echo "Importing watchers information from $PLAIN_WATCHERS_FILE to redis"

node ./import_watchers_to_redis.js $PLAIN_WATCHERS_FILE
