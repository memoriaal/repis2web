CREATE
or replace table pub.wwiirefugees (
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
    kirjed LONGTEXT COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    pereseos LONGTEXT COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    pereseosID TEXT COLLATE utf8_estonian_ci NOT NULL DEFAULT '',
    relevantne TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
) ENGINE = INNODB DEFAULT CHARSET = utf8 COLLATE = utf8_estonian_ci AS
select
    -- k4.kirjekood AS kirjekood,
    -- k4.pereregister AS pereregister,
    k4.kirjekood AS id,
    k4.perenimi AS perenimi,
    k4.eesnimi AS eesnimi,
    '' AS isanimi,
    '' AS emanimi,
    '' AS perenimed,
    '' AS eesnimed,
    '' AS isanimed,
    '' AS emanimed,
    k4.sünd AS sünd,
    '' AS surm,
    '' AS kivi,
    '' AS tahvlikirje,
    '' AS tiib,
    '' AS tahvel,
    '' AS tulp,
    '' AS rida,
    '' AS kirjed,
    '' AS pereseos,
    '' AS pereseosID,
    0 AS relevantne
from
    import.kirmus4 k4
where
    k4.sisestamata = 'EI'
union
all
select
    -- ek.kirjekood AS kirjekood,
    -- ek.pereregister AS pereregister,
    ek.kirjekood AS id,
    ek.perenimi AS perenimi,
    ek.eesnimi AS eesnimi,
    '' AS isanimi,
    '' AS emanimi,
    '' AS perenimed,
    '' AS eesnimed,
    '' AS isanimed,
    '' AS emanimed,
    ek.SündISO AS sünd,
    '' AS surm,
    '' AS kivi,
    '' AS tahvlikirje,
    '' AS tiib,
    '' AS tahvel,
    '' AS tulp,
    '' AS rida,
    ek.Viit AS kirjed,
    '' AS pereseos,
    '' AS pereseosID,
    0 AS relevantne
from
    import.el_kart ek
;
