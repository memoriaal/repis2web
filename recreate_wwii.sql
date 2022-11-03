CREATE OR REPLACE TABLE pub.wwiirefugees (
    id CHAR(10) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    perenimi VARCHAR(300) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    eesnimi VARCHAR(300) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    isanimi VARCHAR(300) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    emanimi VARCHAR(300) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    perenimed VARCHAR(300) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    eesnimed VARCHAR(300) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    isanimed VARCHAR(300) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    emanimed VARCHAR(300) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    sünd VARCHAR(300) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    surm VARCHAR(300) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    kivi VARCHAR(1) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    tahvlikirje VARCHAR(47) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    tiib VARCHAR(1) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    tahvel VARCHAR(5) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    tulp VARCHAR(1) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    rida VARCHAR(2) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    ohvitser VARCHAR(1) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    auaste VARCHAR(13) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    VR VARCHAR(19) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    evonimi VARCHAR(55) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    evokirje VARCHAR(55) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    evoaastad VARCHAR(21) COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    kirjed LONGTEXT COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    pereseos LONGTEXT COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    pereseosID TEXT COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    relevantne TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
) ENGINE = INNODB DEFAULT CHARSET = utf8 COLLATE = utf8_estonian_ci AS
select
    *
from pub.memoriaal_ee
where kirjed REGEXP 'elk-|kirm-';
