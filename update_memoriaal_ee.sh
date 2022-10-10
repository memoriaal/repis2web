#!/bin/bash

. ~/credentials.txt

csv_filename="/paringud/$(date +%Y%m%d_%H%M%S)_memoriaal_ee.csv"




echo exporting to $csv_filename

mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded<<EOFMYSQL
SELECT * from aruanded.memoriaal_ee
INTO OUTFILE '${csv_filename}'
CHARACTER SET utf8
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
EOFMYSQL

echo exported

mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded<<EOFMYSQL
call aruanded.statistika();
EOFMYSQL


echo importing
INDEX=allpersons SOURCE=${csv_filename} ES_CREDENTIALS="${ELASTIC_C}" node ~/scripts/import_once.js

echo bye

# rm ${csv_filename}
