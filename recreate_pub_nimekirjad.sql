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
  sünnikoht VARCHAR(50) NOT NULL DEFAULT '' COLLATE 'utf8_estonian_ci',
  surmakoht VARCHAR(50) NOT NULL DEFAULT '' COLLATE 'utf8_estonian_ci',
  isPerson BIT(1) NOT NULL DEFAULT b'0',
  kivi BIT(1) NOT NULL DEFAULT b'0',
  emem BIT(1) NOT NULL DEFAULT b'0',
  evo BIT(1) NOT NULL DEFAULT b'0',
  wwiiref BIT(1) NOT NULL DEFAULT b'0',
  kirjed LONGTEXT NOT NULL DEFAULT '[]' COLLATE 'utf8_estonian_ci',
  pereseosed LONGTEXT NOT NULL DEFAULT '[]' COLLATE 'utf8_estonian_ci',
  tahvlikirje LONGTEXT NOT NULL DEFAULT '[]' COLLATE 'utf8_estonian_ci',
  updated DATETIME NOT NULL DEFAULT current_timestamp ON UPDATE current_timestamp,
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

INSERT ignore INTO pub.nimekirjad (persoon, kirje, perenimi, eesnimi, isanimi, emanimi
     , sünd, surm, sünnikoht, surmakoht
     , kirjed
     , isPerson, emem, kivi, wwiiref, evo)
SELECT persoon, kirje, perenimi, eesnimi, isanimi, emanimi
     , sünd, surm, sünnikoht, surmakoht
     , repis.json_persoonikirjed(persoon)
     , pub_isPerson, pub_emem, pub_kivi, pub_wwiiref, pub_evo
  FROM repis.kirjed
 WHERE persoon = kirjekood
   AND persoon > 0
;

UPDATE pub.nimekirjad pu 
RIGHT JOIN import.memoriaal_evo me ON me.persoon = pu.persoon
SET pu.evokirje = me.kirje;

CALL pub.proc_pereseosed_nimekirja(NULL);

--
-- Värskenda kivitahvlite persoonid
UPDATE import.memoriaal_kivitahvlid mt
LEFT JOIN repis.kirjed k0 ON k0.kirjekood = mt.kirjekood
SET mt.persoon = k0.persoon;

UPDATE pub.nimekirjad 
   SET tahvlikirje = ifnull(repis.json_tahvlikirje(persoon), JSON_OBJECT())
 WHERE kivi;
