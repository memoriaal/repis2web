-- Kokku isikuid baasis
SELECT count(1) INTO @isikuid_baasis
FROM repis.kirjed
WHERE persoon = kirjekood;

-- Kokku isikuid kodulehel
SELECT count(1) INTO @isikuid_veebis
FROM pub.nimekirjad
WHERE persoon > 0
  AND redirect = '';

-- Relevantseid isikuid kodulehel
SELECT count(1) INTO @emem
FROM pub.nimekirjad 
WHERE persoon > 0
  AND redirect = ''
  AND emem;

-- Isikuid mälestusseinal
SELECT count(1) INTO @kivis
FROM pub.nimekirjad 
WHERE persoon > 0
  AND redirect = ''
  AND kivi;

-- põgenikke
SELECT count(1) INTO @refugees
FROM pub.nimekirjad 
WHERE persoon > 0
  AND redirect = ''
  AND wwiiref;

-- põgenikke, kellel on PR
SELECT count(1) INTO @refugees
FROM pub.nimekirjad 
WHERE persoon > 0
  AND redirect = ''
  AND wwiiref
  AND persoon IN
  (SELECT DISTINCT persoon FROM import.pereregister);

-- Isikuid kellel on sünniaeg teadmata
SELECT COUNT(1) INTO @sünd_teadmata
 FROM pub.nimekirjad nk
WHERE persoon > 0
  AND redirect = ''
  AND nk.`sünd` = '';

INSERT INTO
    aruanded.statistika (
        isikuid_baasis,
        isikuid_veebis,
        e_memoriaalil,
        kivis,
        põgenikke,
        PRga_põgenikke,
        sünd_teadmata
    )
SELECT
    @isikuid_baasis,
    @isikuid_veebis,
    @emem,
    @kivis,
    @refugees,
    @refugeesWithPR,
    @sünd_teadmata;
