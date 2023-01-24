-- Kokku isikuid baasis
SELECT
    count(1) INTO @isikuid_baasis
FROM
    `repis`.`kirjed`
WHERE
    persoon = kirjekood;

-- Kokku isikuid kodulehel
SELECT count(1) INTO @isikuid_veebis
FROM pub.nimekirjad;

-- Relevantseid isikuid kodulehel
SELECT count(1) INTO @emem
FROM pub.nimekirjad WHERE emem;

-- Isikuid mälestusseinal
SELECT count(1) INTO @kivis
FROM pub.nimekirjad WHERE kivi;

-- põgenikke
SELECT count(1) INTO @refugees
FROM pub.nimekirjad WHERE wwiiref;

INSERT INTO
    aruanded.statistika (
        isikuid_baasis,
        isikuid_veebis,
        emem,
        kivis,
        põgenikke
    )
SELECT
    @isikuid_baasis,
    @isikuid_veebis,
    @relevantseid,
    @kivis,
    @refugees;
