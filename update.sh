#!/bin/bash

echo $(date -u --iso-8601=seconds) Started update

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd "$SCRIPT_DIR"

git pull

. ~/.env

ssh -N -L 3306:127.0.0.1:3306 dev.memoriaal.ee -f

./repis_update_2.sh

./repis_backup.sh
