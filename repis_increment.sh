#!/bin/bash

cd /home/michelek/Documents/scripts/repis2web
mypidfile=/home/michelek/Documents/scripts/repis2web/repis_increment.sh.pid

if [ -e $mypidfile ]; then
    echo -n ". "
    exit 0
fi

echo $$ > "$mypidfile"
# Ensure PID file is removed on program exit.
trap "rm -f -- '$mypidfile'" EXIT

# if [ `pidof -x "repis_increment.sh" | wc --words` != "2" ]; then
#     echo -n ". "
#     exit 0
# fi

# echo workin\' at `pwd`

. /home/michelek/.env
# echo $(date -u --iso-8601=seconds) Started repis incremental update

####
#### maintenance
####
# echo $(date -u --iso-8601=seconds) Repair repis.kirjed.kirje IS NULL
# mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" repis<<EOFMYSQL
# update repis.kirjed
# set kirje = repis.func_person_text(persoon)
# where kirje is null;

# CALL repis.proc_clear_newline();
# EOFMYSQL


####
#### pub.nimekirjad
####
last_ts=`cat last_ts.out`
# echo "last timestamp: ${last_ts}"

new_ts=`mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" pub<<EOFMYSQL
select max(updated) as ts from pub.nimekirjad;
EOFMYSQL
`
new_ts=`echo $new_ts | cut -d " " -f2,3`
# echo "new timestamp: ${new_ts}"
echo $new_ts > last_ts.out

if [ "${new_ts}" == "${last_ts}" ]
then
    echo $(date -u --iso-8601=seconds) no news after $new_ts
    exit 0
fi

# echo "Updating between $last_ts <--> $new_ts"


####
#### memoriaal.ee emem
####
csv_filename="/paringud/$(date +%Y%m%d_%H%M%S)_memoriaal_ee_emem.csv"
# echo $(date -u --iso-8601=seconds) Exporting to $csv_filename
mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" pub<<EOFMYSQL
SELECT persoon, kirje, evokirje, perenimi, eesnimi, isanimi, emanimi
, left(sünd,10), left(surm,10)
, sünnikoht, surmakoht
, kirjed, pereseosed, tahvlikirje
, case when isperson IS TRUE then 1 ELSE 0 end isperson
, case when kivi IS TRUE then 1 ELSE 0 end kivi
, case when emem IS TRUE then 1 ELSE 0 end emem
, case when evo IS TRUE then 1 ELSE 0 end evo
, case when wwiiref IS TRUE then 1 ELSE 0 end wwiiref
from pub.nimekirjad
WHERE updated BETWEEN DATE_ADD('${last_ts}', INTERVAL 1 second) AND '${new_ts}'
INTO OUTFILE '${csv_filename}'
CHARACTER SET utf8
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
ESCAPED BY '\\\'
LINES TERMINATED BY '\n';
EOFMYSQL

scp dev.memoriaal.ee:${csv_filename} ${csv_filename}
sed -i 's/\\\"/\"\"/g' $csv_filename
sed -i 's/\\\\\"\"/\\\"\"/g' $csv_filename

# echo $(date -u --iso-8601=seconds) uploading $csv_filename to memoriaal.ee
echo -n "$(date -u --iso-8601=seconds) Between ${last_ts} and ${new_ts}: "
MODE=update SOURCE=${csv_filename} ES_INDEX=emem_persons ES_CREDENTIALS="${ES_CREDENTIALS}" ES_HOST="${ES_HOST}" node pub3elastic.js | grep Uploaded

####
#### Wrap up
####

# echo $(date -u --iso-8601=seconds) Repis update finished
