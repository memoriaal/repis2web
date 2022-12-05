#!/bin/bash

echo $(date -u --iso-8601=seconds) Started update

cd "$(dirname "$0")"

git pull

# . ./repis_update_2.sh
