#!/bin/bash

source ./scripts_config

echo "Importing projects information from $PLAIN_DESCRIPTION_FILE to redis"

node ./import_description_to_redis.js $PLAIN_DESCRIPTION_FILE
