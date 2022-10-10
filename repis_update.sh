#!/bin/bash

. ~/credentials.txt

echo $(date -u --iso-8601=seconds) Started repis update

echo $(date -u --iso-8601=seconds) CALL aruanded.memoriaal_ee()
mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded<<EOFMYSQL
call aruanded.memoriaal_ee();
EOFMYSQL


csv_filename="/paringud/$(date +%Y%m%d_%H%M%S)_memoriaal_ee.csv"
echo $(date -u --iso-8601=seconds) Exporting to $csv_filename

mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded<<EOFMYSQL
SELECT * from aruanded.memoriaal_ee
INTO OUTFILE '${csv_filename}'
CHARACTER SET utf8
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
EOFMYSQL

echo $(date -u --iso-8601=seconds) exported
echo $(date -u --iso-8601=seconds) upload to memoriaal.ee

INDEX=allpersons SOURCE=${csv_filename} ES_CREDENTIALS="${ELASTIC_C}" node ~/scripts/import_once.js



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

echo $(date -u --iso-8601=seconds) exported
echo $(date -u --iso-8601=seconds) upload to wwii-refugees.ee

INDEX=wwiirefugees SOURCE=${csv_filename} ES_CREDENTIALS="${ELASTIC_C}" node ~/scripts/import_once.js



mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded<<EOFMYSQL
call aruanded.statistika();
EOFMYSQL

# rm ${csv_filename}

echo $(date -u --iso-8601=seconds) Repis update finished
