CREATE OR REPLACE TABLE aruanded.memoriaal_ee (
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
SELECT
    nk.kirjekood AS id,
    nk.perenimi,
    nk.eesnimi,
    nk.isanimi,
    nk.emanimi,
    REPLACE(
        REPLACE(
            group_concat(DISTINCT k.perenimi SEPARATOR ' '),
            ';',
            ' '
        ),
        '-',
        ' '
    ) AS perenimed,
    REPLACE(
        REPLACE(
            group_concat(DISTINCT k.eesnimi SEPARATOR ' '),
            ';',
            ' '
        ),
        '-',
        ' '
    ) AS eesnimed,
    REPLACE(
        REPLACE(
            group_concat(DISTINCT k.emanimi SEPARATOR ' '),
            ';',
            ' '
        ),
        '-',
        ' '
    ) AS emanimed,
    REPLACE(
        REPLACE(
            group_concat(DISTINCT k.isanimi SEPARATOR ' '),
            ';',
            ' '
        ),
        '-',
        ' '
    ) AS isanimed,
    LEFT(nk.sünd, 4) AS sünd,
    LEFT(nk.surm, 4) AS surm,
    IF(ks_k.silt IS NULL, '0', '1') AS kivi,
    IF(
        ks_k.silt = 'x - kivi',
        IFNULL(kt.kirje, 'N/A'),
        ''
    ) AS tahvlikirje,
    IF(ks_k.silt = 'x - kivi', IFNULL(kt.tiib, 'X'), '') AS tiib,
    IF(
        ks_k.silt = 'x - kivi',
        IFNULL(kt.tahvel, 'X'),
        ''
    ) AS tahvel,
    IF(ks_k.silt = 'x - kivi', IFNULL(kt.tulp, '-'), '') AS tulp,
    IF(ks_k.silt = 'x - kivi', IFNULL(kt.rida, '-'), '') AS rida,
    IF(evo.persoon IS NULL, '0', '1') AS ohvitser,
    IFNULL(evo.Auaste, '') AS auaste,
    IFNULL(evo.VR, '') AS VR,
    IFNULL(evo.Nimi, '') AS evonimi,
    IFNULL(evo.Kirje, '') AS evokirje,
    concat(evo.sünd, '-', evo.surm) AS evoaastad,
    IFNULL(
        REPLACE (
            group_concat(
                DISTINCT IF(
                    a.prioriteetkirje = 0,
                    NULL,
                    concat_ws(
                        '#|',
                        k.persoon,
                        k.kirjekood,
                        IF (
                            k.allikas = 'RR',
                            REGEXP_REPLACE(k.kirje, '\\|+', '|'),
                            k.kirje
                        ),
                        a.allikas,
                        a.nimetus,
                        concat(
                            '{ "labels": ["',
                            concat_ws(
                                '", "',
                                IF(k.EiArvesta = '!', 'skip', NULL),
                                IF(k.EkslikKanne = '!', 'wrong', NULL)
                            ),
                            '"] }'
                        )
                    )
                )
                ORDER BY
                    a.prioriteetkirje DESC SEPARATOR ';_\n'
            ),
            '"',
            "\'"
        ),
        ''
    ) AS kirjed,
    IFNULL(
        REPLACE(
            group_concat(
                DISTINCT IF(
                    kp.kirjekood IS NULL,
                    NULL,
                    concat_ws(
                        '#|',
                        -- kp.raamatupere,
                        kp.persoon,
                        kp.kirjekood,
                        kp.kirje,
                        kpa.allikas,
                        kpa.nimetus,
                        concat(
                            '{ "labels": ["',
                            concat_ws(
                                '", "',
                                IF(kp.EiArvesta = '!', 'skip', NULL),
                                IF(kp.EkslikKanne = '!', 'wrong', NULL)
                            ),
                            '"] }'
                        )
                    )
                )
                ORDER BY
                    kp.kirjekood ASC SEPARATOR ';_\n'
            ),
            '"',
            "\'"
        ),
        ''
    ) AS pereseos,
    IFNULL(
        group_concat(
            DISTINCT IF(kp.kirjekood IS NULL, NULL, kp.persoon) SEPARATOR ' '
        ),
        ''
    ) AS pereseosID,
    IF(ks_mr.kirjekood IS NULL, 1, 0) AS relevantne
FROM
    repis.kirjed AS k
    LEFT JOIN repis.allikad AS a ON a.kood = k.allikas
    LEFT JOIN repis.kirjed AS kp ON kp.RaamatuPere <> ''
    AND kp.RaamatuPere = k.RaamatuPere
    AND kp.allikas != 'Persoon'
    LEFT JOIN repis.allikad AS kpa ON kpa.kood = kp.allikas
    LEFT JOIN repis.kirjed AS nk ON nk.persoon = k.persoon
    AND nk.allikas = 'Persoon'
    AND nk.persoon = nk.kirjekood
    LEFT JOIN repis.v_kirjesildid AS ks_k ON ks_k.kirjekood = nk.persoon
    AND ks_k.silt = 'x - kivi'
    AND ks_k.deleted_at = '0000-00-00 00:00:00'
    LEFT JOIN repis.v_kirjesildid AS ks_mr ON ks_mr.kirjekood = nk.persoon
    AND ks_mr.silt = 'x - mitterelevantne'
    AND ks_mr.deleted_at = '0000-00-00 00:00:00'
    LEFT JOIN import.memoriaal_kivitahvlid kt ON kt.persoon = k.persoon
    LEFT JOIN import.memoriaal_evo evo ON evo.persoon = k.persoon
WHERE
    k.ekslikkanne = ''
    AND k.puudulik = ''
    AND k.allikas NOT IN ('KIVI')
    AND k.peatatud = ''
    AND nk.persoon IS NOT NULL
    AND IFNULL(a.nonPerson, '') != '!'
GROUP BY
    k.persoon
HAVING
    perenimi != ''
    AND kirjed != '';

