#!/bin/bash

. ~/credentials.txt

echo $(date -u --iso-8601=seconds) Started repis update

####
#### maintenance
####
echo $(date -u --iso-8601=seconds) Repair repis.kirjed.kirje IS NULL
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" repis<<EOFMYSQL
update repis.kirjed
set kirje = repis.func_person_text(persoon)
where kirje is null;
EOFMYSQL


####
#### pub.nimekirjad
####
echo $(date -u --iso-8601=seconds) Recreate table pub.nimekirjad
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" pub < recreate_pub_nimekirjad.sql


####
#### memoriaal.ee emem
####
csv_filename="/paringud/$(date +%Y%m%d_%H%M%S)_memoriaal_ee_emem.csv"
echo $(date -u --iso-8601=seconds) Exporting to $csv_filename
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" pub<<EOFMYSQL
SELECT persoon, kirje, kirjed, pereseosed, tahvlikirje from pub.nimekirjad
WHERE emem
INTO OUTFILE '${csv_filename}'
CHARACTER SET utf8
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
EOFMYSQL

echo $(date -u --iso-8601=seconds) uploading $csv_filename to memoriaal.ee
INDEX=emem_persons SOURCE=${csv_filename} ES_CREDENTIALS="${ELASTIC_C}" node pub2elastic.js


####
#### memoriaal.ee EVO
####
csv_filename="/paringud/$(date +%Y%m%d_%H%M%S)_memoriaal_ee_evo.csv"
echo $(date -u --iso-8601=seconds) Exporting to $csv_filename
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" pub<<EOFMYSQL
SELECT persoon, kirje, kirjed, pereseosed, tahvlikirje from pub.nimekirjad
WHERE evo
INTO OUTFILE '${csv_filename}'
CHARACTER SET utf8
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
EOFMYSQL

echo $(date -u --iso-8601=seconds) uploading $csv_filename to memoriaal.ee
INDEX=emem_persons SOURCE=${csv_filename} ES_CREDENTIALS="${ELASTIC_C}" node pub2elastic.js


####
#### wwii-refugees.ee
####
csv_filename="/paringud/$(date +%Y%m%d_%H%M%S)_wwii.csv"
echo $(date -u --iso-8601=seconds) Exporting to $csv_filename
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded<<EOFMYSQL
SELECT * from pub.wwiirefugees
INTO OUTFILE '${csv_filename}'
CHARACTER SET utf8
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
EOFMYSQL

echo $(date -u --iso-8601=seconds) uploading $csv_filename to wwii-refugees.ee
INDEX=wwiiref_persons SOURCE=${csv_filename} ES_CREDENTIALS="${ELASTIC_C}" node pub2elastic.js


####
#### Wrap up
####
echo $(date -u --iso-8601=seconds) Refresh statistics
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded < statistika.sql


echo $(date -u --iso-8601=seconds) Repis update finished

. ./repis_backup.sh
