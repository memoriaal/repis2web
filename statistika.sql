-- Kokku isikuid baasis
SELECT
    count(1) INTO @isikuid_baasis
FROM
    `repis`.`kirjed`
WHERE
    persoon = kirjekood;

-- Kokku isikuid kodulehel
SELECT
    count(1) INTO @isikuid_veebis
FROM
    `aruanded`.`memoriaal_ee`;

-- Relevantseid isikuid kodulehel
SELECT
    count(1) INTO @relevantseid
FROM
    `aruanded`.`memoriaal_ee`
WHERE
    relevantne = 1;

-- Isikuid mälestusseinal
SELECT
    count(1) INTO @kivis
FROM
    `aruanded`.`memoriaal_ee`
WHERE
    kivi = 1;

INSERT INTO
    aruanded.statistika (
        isikuid_baasis,
        isikuid_veebis,
        relevantseid,
        kivis
    )
SELECT
    @isikuid_baasis,
    @isikuid_veebis,
    @relevantseid,
    @kivis;
