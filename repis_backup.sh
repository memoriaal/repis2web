#!/bin/bash

. ~/.env

echo $(date -u --iso-8601=seconds) Refresh statistics
mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" aruanded < statistika.sql

echo $(date -u --iso-8601=seconds) Started repis backup

mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" repis<<EOFMYSQL
CALL backups.backup_table('repis.kirjed');
CALL backups.backup_table('repis.v_kirjelipikud');
CALL backups.backup_table('repis.v_kirjesildid');
CALL pub.repub();
EOFMYSQL

echo $(date -u --iso-8601=seconds) Repis backup finished
