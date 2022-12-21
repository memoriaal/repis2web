#!/bin/bash

. ~/.env
echo $(date -u --iso-8601=seconds) Started repis update

####
#### maintenance
####
# echo $(date -u --iso-8601=seconds) Repair repis.kirjed.kirje IS NULL
mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" repis<<EOFMYSQL
update repis.kirjed
set kirje = repis.func_person_text(persoon)
where kirje is null;

CALL REPIS.proc_clear_newline();
EOFMYSQL


####
#### pub.nimekirjad
####
last_ts=`cat last_ts.out`

new_ts=`mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" pub<<EOFMYSQL
select max(updated) as ts from pub.nimekirjad;
EOFMYSQL
`
new_ts=`echo $new_ts | cut -d " " -f2,3`
echo $new_ts > last_ts.out

echo "Updating between $last_ts <--> $new_ts"

# echo $(date -u --iso-8601=seconds) Recreate table pub.nimekirjad
# mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" pub < recreate_pub_nimekirjad.sql


####
#### memoriaal.ee emem
####
csv_filename="/paringud/$(date +%Y%m%d_%H%M%S)_memoriaal_ee_emem.csv"
echo $(date -u --iso-8601=seconds) Exporting to $csv_filename
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

echo $(date -u --iso-8601=seconds) uploading $csv_filename to memoriaal.ee
SOURCE=${csv_filename} ES_INDEX=emem_persons ES_CREDENTIALS="${ES_CREDENTIALS}" ES_HOST="${ES_HOST}" node pub3elastic.js > o.out

####
#### Wrap up
####
echo $(date -u --iso-8601=seconds) Refresh statistics
mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded < statistika.sql


echo $(date -u --iso-8601=seconds) Repis update finished

