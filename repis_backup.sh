#!/bin/bash

. ~/credentials.txt

echo $(date -u --iso-8601=seconds) Started repis backup

mysql -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" repis<<EOFMYSQL
CALL backups.backup_table('repis.kirjed');
CALL backups.backup_table('repis.v_kirjelipikud');
CALL backups.backup_table('repis.v_kirjesildid');
EOFMYSQL

echo $(date -u --iso-8601=seconds) Repis backup finished
