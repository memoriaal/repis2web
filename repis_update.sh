#!/bin/bash

. ~/credentials.txt

echo $(date -u --iso-8601=seconds) Started repis update

echo $(date -u --iso-8601=seconds) Repair repis.kirjed.kirje IS NULL
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded<<EOFMYSQL
update repis.kirjed
set kirje = repis.func_person_text(persoon)
where kirje is null;
EOFMYSQL


####
#### memoriaal.ee
####
csv_filename="/paringud/$(date +%Y%m%d_%H%M%S)_memoriaal_ee.csv"
echo $(date -u --iso-8601=seconds) Recreate table aruanded.memoriaal_ee
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded < recreate_memoriaal_ee.sql


echo $(date -u --iso-8601=seconds) Exporting to $csv_filename
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded<<EOFMYSQL
SELECT * from aruanded.memoriaal_ee
INTO OUTFILE '${csv_filename}'
CHARACTER SET utf8
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
EOFMYSQL


echo $(date -u --iso-8601=seconds) uploading $csv_filename to memoriaal.ee
INDEX=allpersons SOURCE=${csv_filename} ES_CREDENTIALS="${ELASTIC_C}" node import_once.js


####
#### wwii-refugees.ee
####
csv_filename="/paringud/$(date +%Y%m%d_%H%M%S)_wwii.csv"
echo $(date -u --iso-8601=seconds) Recreate table pub.wwii_refugees
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded < recreate_wwii.sql


echo $(date -u --iso-8601=seconds) Exporting to $csv_filename
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded<<EOFMYSQL
SELECT * from pub.wwiirefugees
INTO OUTFILE '${csv_filename}'
CHARACTER SET utf8
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
EOFMYSQL

echo $(date -u --iso-8601=seconds) exported
echo $(date -u --iso-8601=seconds) upload to wwii-refugees.ee

INDEX=wwiirefugees SOURCE=${csv_filename} ES_CREDENTIALS="${ELASTIC_C}" node import_once.js


echo $(date -u --iso-8601=seconds) Refresh statistics
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded < statistika.sql


echo $(date -u --iso-8601=seconds) Repis update finished
