#!/bin/bash

cd /home/michelek/Documents/scripts/repis2web
mypidfile=/home/michelek/Documents/scripts/repis2web/update_all.sh.pid

if [ -e $mypidfile ]; then
    echo "-- minut --"
    # echo -n ". "
    exit 0
fi

echo $$ > "$mypidfile"
# Ensure PID file is removed on program exit.
trap "rm -f -- '$mypidfile'" EXIT

# echo workin\' at `pwd`

. /home/michelek/.env

# ssh tunnel to mysql proxy (control file in ~/.ssh/config)
ssh -f -N -T -M -L 3306:127.0.0.1:3306 repis-proxy

new_ts=`mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" pub<<EOFMYSQL
SELECT current_timestamp() as ts;
EOFMYSQL
`
echo "new timestamp: ${new_ts}"
node update_all.js

# close the ssh tunnel
ssh -T -O "exit" repis-proxy
