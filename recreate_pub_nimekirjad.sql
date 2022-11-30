CREATE OR REPLACE TABLE pub.nimekirjad (
	persoon CHAR(10) NOT NULL COLLATE 'utf8_estonian_ci',
  kirje TEXT NULL DEFAULT NULL COLLATE 'utf8_estonian_ci',
  evokirje TEXT NULL DEFAULT NULL COLLATE 'utf8_estonian_ci',
	perenimi VARCHAR(50) NOT NULL DEFAULT '' COLLATE 'utf8_estonian_ci',
	eesnimi VARCHAR(50) NOT NULL DEFAULT '' COLLATE 'utf8_estonian_ci',
	isanimi VARCHAR(50) NOT NULL DEFAULT '' COLLATE 'utf8_estonian_ci',
	emanimi VARCHAR(50) NOT NULL DEFAULT '' COLLATE 'utf8_estonian_ci',
	sünd VARCHAR(50) NOT NULL DEFAULT '' COLLATE 'utf8_estonian_ci',
	surm VARCHAR(50) NOT NULL DEFAULT '' COLLATE 'utf8_estonian_ci',
	isPerson BIT(1) NOT NULL DEFAULT b'0',
	kivi BIT(1) NOT NULL DEFAULT b'0',
	emem BIT(1) NOT NULL DEFAULT b'0',
	evo BIT(1) NOT NULL DEFAULT b'0',
	wwiiref BIT(1) NOT NULL DEFAULT b'0',
	kirjed LONGTEXT NOT NULL DEFAULT '[]' COLLATE 'utf8_estonian_ci',
	pereseosed LONGTEXT NOT NULL DEFAULT '[]' COLLATE 'utf8_estonian_ci',
	tahvlikirje LONGTEXT NOT NULL DEFAULT '[]' COLLATE 'utf8_estonian_ci',
	PRIMARY KEY (persoon) USING BTREE,
	CONSTRAINT FK_nimekirjad_repis_kirjed FOREIGN KEY (persoon) REFERENCES repis.kirjed (kirjekood) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT `CC1` CHECK (json_valid(`kirjed`)),
	CONSTRAINT `CC2` CHECK (json_valid(`pereseosed`)),
	CONSTRAINT `CC3` CHECK (json_valid(`tahvlikirje`))
)
COMMENT='Persoonide kuulumine erinevatesse avaldatud nimekirjadesse'
COLLATE='utf8_estonian_ci'
ENGINE=InnoDB
;

INSERT ignore INTO pub.nimekirjad (persoon, kirje, perenimi, eesnimi, isanimi, emanimi, sünd, surm)
SELECT persoon, kirje, perenimi, eesnimi, isanimi, emanimi, sünd, surm FROM repis.kirjed
 WHERE persoon = kirjekood
   AND persoon > 0
;

UPDATE pub.nimekirjad
SET kirjed = repis.json_persoonikirjed(persoon)
;
CALL pub.proc_pereseosed_nimekirja();

--
-- Not a person
UPDATE pub.nimekirjad SET isPerson = 0;
UPDATE pub.nimekirjad SET isPerson = 1 WHERE persoon IN
(
  SELECT DISTINCT persoon
  FROM repis.kirjed k
  WHERE k.allikas not in ('persoon')
    and k.EkslikKanne = ''
    and k.Peatatud = ''
    and k.Puudulik = ''
);

--
-- Värskenda kivitahvlite persoonid
UPDATE import.memoriaal_kivitahvlid mt
LEFT JOIN repis.kirjed k0 ON k0.kirjekood = mt.kirjekood
SET mt.persoon = k0.persoon;

--
-- Kuulub memoriaali seinale
UPDATE pub.nimekirjad 
   SET kivi = 1
     , tahvlikirje = ifnull(repis.json_tahvlikirje(persoon), JSON_OBJECT())
 WHERE persoon IN (
  SELECT DISTINCT kirjekood AS persoon
  FROM repis.v_kirjesildid
  WHERE silt = 'x - kivi'
  AND deleted_at = 0
);

--
-- Kuulub e-memoriaalis avaldamisele
UPDATE pub.nimekirjad SET emem = 1 WHERE persoon IN
(
  SELECT DISTINCT persoon
  FROM repis.kirjed k
  WHERE k.allikas IN (
    SELECT kood FROM repis.allikad 
	  WHERE ifnull(nonPerson,0) = 0
	    AND kood NOT IN ('kirm','elk','PR','RR')
  )
  and k.EkslikKanne = ''
  and k.Peatatud = ''
  and k.Puudulik = ''
);
-- mitterelevantsed muidugi mitte
UPDATE pub.nimekirjad SET emem = 0 WHERE emem = 1 and persoon IN
(
  SELECT DISTINCT kirjekood AS persoon
  FROM repis.v_kirjesildid
  WHERE silt = 'x - mitterelevantne'
  AND deleted_at = 0
);

--
-- Avaldatud Eesti Vabariigi ohvitseride seinal
UPDATE pub.nimekirjad nk
RIGHT JOIN import.memoriaal_evo evo ON evo.persoon = nk.persoon
SET nk.evo = 1, nk.evokirje = evo.kirje;

--
-- Kuulub II Maailmasõja põgenike nimekirja
UPDATE pub.nimekirjad SET wwiiref = 1 WHERE persoon IN
(
  SELECT DISTINCT persoon FROM repis.kirjed
  WHERE allikas IN ('kirm','elk')
);
