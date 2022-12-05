#!/bin/bash

echo $(date -u --iso-8601=seconds) Started update

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd "$SCRIPT_DIR"

git pull

./repis_update_2.sh
