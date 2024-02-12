'use strict'

const path         = require('path')
const fs         = require('fs')
const csv        = require('@fast-csv/parse')
const fetch      = require('node-fetch')
const mysql     = require('mysql2/promise')


const ENTU_HOST      = process.env.ENTU_HOST      || 'api.entu.app'
const ENTU_AUTH_PATH = process.env.ENTU_AUTH_PATH || '/auth?account=emi'
const ENTU_WRITE_KEY = process.env.ENTU_WRITE_KEY

// set working dir to script dir
process.chdir(__dirname)

const bulk_size = 200000
const mysqlConfig = {
  host: '127.0.0.1',
  user: process.env.M_MYSQL_U,
  password: process.env.M_MYSQL_P,
  database: process.env.M_DB_NAME || 'pub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}
const pool = mysql.createPool(mysqlConfig)

const select_q = `
  select e.entu_id, e.sync_ts, nk.*
  from pub.nimekirjad nk
  left join pub.entu e on e.persoon = nk.persoon
  where e.sync_ts is null
  order by nk.updated
  limit ?;
`
const update_q = `
  insert into pub.entu (persoon, entu_id, sync_ts) values (?, ?, current_timestamp())
  on duplicate key update entu_id = ?, sync_ts = current_timestamp();
`
const select_updated = `
  select e.*
  from pub.entu e
  where e.persoon = ?;
`


const get_token = async () => {
  const url = `https://${ENTU_HOST}${ENTU_AUTH_PATH}`
  const options = {
    method: 'GET',
    headers: {
      'Accept-Encoding': 'deflate',
      'Authorization': `Bearer ${ENTU_WRITE_KEY}`
    }
  }
  const response = await fetch(url, options)
  const json = await response.json()
  if (Array.isArray(json) && json.length > 0) {
    if (json[0].token) {
      return json[0].token
    } else {
      console.error('no token in json data')
      return null
    }
  } else {
    console.error('get_token: Invalid json data')
    return null
  }
}

const get_folderE = async () => {
  const url = `https://${ENTU_HOST}/entity?_type.string=folder&name.string=Publitseeritud+kirjed&props=_id`
  const options = {
    method: 'GET',
    headers: {
      'Accept-Encoding': 'deflate',
      'Authorization': `Bearer ${entu.token}`
    }
  }
  const response = await fetch(url, options)
  const json = await response.json()
  if (json.entities && Array.isArray(json.entities) && json.entities.length > 0) {
    if (json.entities[0]._id) {
      return json.entities[0]._id
    } else {
      console.error('no _id in json data')
      return null
    }
  } else {
    console.error('get_folderE: Invalid json data', {json, entities: json.entities, length: json.entities.length})
    return null
  }
}

const get_victimE = async () => {
  const url = `https://${ENTU_HOST}/entity?_type.string=entity&name.string=repisPerson&props=_id`
  const options = {
    method: 'GET',
    headers: {
      'Accept-Encoding': 'deflate',
      'Authorization': `Bearer ${entu.token}`
    }
  }
  const response = await fetch(url, options)
  const json = await response.json()
  if (json.entities && Array.isArray(json.entities) && json.entities.length > 0) {
    if (json.entities[0]._id) {
      return json.entities[0]._id
    } else {
      console.error('no _id in json data')
      return null
    }
  } else {
    console.error('get_victimE: Invalid json data', {json, entities: json.entities, length: json.entities.length})
    return null
  }
}

const row2entity = (row) => {
  const entity = []

  entity.push({ "type": "_type", "reference": entu.victimE })
  
  if (!row.persoon) { return false }
  entity.push({ "type": "persoon", "string": row.persoon })
  
  if (row.redirect) {
    entity.push({ "type": "redirect", "string": row.redirect })
    return entity
  }
  
  if (!row.kirje) {
    console.log(`Missing kirje for persoon ${row.persoon}`)
    return false 
  }
  if (!/[a-zõüöäA-ZÕÜÖÄ]/.test(row.kirje)) {
    console.log(`Invalid kirje for persoon ${row.persoon}: ${row.kirje}`)
    return false
  }

  entity.push({ "type": "kirje", "string": row.kirje })

  if (!row.eesnimi && !row.perenimi) { 
    console.log(`Missing eesnimi and perenimi for persoon ${row.persoon}`)
    return false 
  }
  row.eesnimi && entity.push({ "type": "eesnimi", "string": row.eesnimi })
  row.perenimi && entity.push({ "type": "perenimi", "string": row.perenimi })

  row.emanimi && entity.push({ "type": "emanimi", "string": row.emanimi })
  row.isanimi && entity.push({ "type": "isanimi", "string": row.isanimi })
  /* Ü != Y */ row.sünd && entity.push({ "type": "synd", "string": row.sünd })
  /* Ü != Y */ row.sünnikoht && entity.push({ "type": "synnikoht", "string": row.sünnikoht })
  row.surm && entity.push({ "type": "surm", "string": row.surm })
  row.surmakoht && entity.push({ "type": "surmakoht", "string": row.surmakoht })
  
  // multiproerties
  if (row.kirjed && row.kirjed !== '[]') {
    try {
      const kirjed = JSON.parse(row.kirjed)
      kirjed.forEach(k => {
        entity.push({ "type": "kirjed", "string": JSON.stringify(k, null, 2) })
      })
    } catch (e) {
      console.error('Invalid kirjed', row.kirjed)
    }
  }
  if (row.pereseosed && row.pereseosed !== '[]') {
    try {
      const pereseosed = JSON.parse(row.pereseosed)
      pereseosed.forEach(p => {
        entity.push({ "type": "pereseosed", "string": JSON.stringify(p, null, 2) })
      })
    } catch (e) {
      console.error('Invalid pereseosed', row.pereseosed)
    }
  }
  if (row.episoodid && row.episoodid !== '[]') {
    try {
      const episoodid = JSON.parse(row.episoodid)
      episoodid.forEach(e => {
        entity.push({ "type": "episoodid", "string": JSON.stringify(e, null, 2) })
      })
    } catch (e) {
      console.error('Invalid episoodid', row.episoodid)
    }
  }

  row.tahvlikirje && (row.tahvlikirje !== '{}') && entity.push({ "type": "tahvlikirje", "string": row.tahvlikirje })
  row.evokirje && entity.push({ "type": "evokirje", "string": row.evokirje })
  
  
  row.isPerson === '1' && entity.push({ "type": "isPerson", "boolean": true })
  row.kivi === '1' && entity.push({ "type": "kivi", "boolean": true })
  row.emem === '1' && entity.push({ "type": "emem", "boolean": true })
  row.evo === '1' && entity.push({ "type": "evo", "boolean": true })
  row.wwiiref === '1' && entity.push({ "type": "wwiiref", "boolean": true })
  row.mv === '1' && entity.push({ "type": "mv", "boolean": true })
  
  row.updated && entity.push({ "type": "updated", "string": row.updated })

  entity.push({ "type": "_parent", "reference": entu.folderE })

  return entity
}

const entu = {}
const run = async () => {
  entu.token = await get_token()
  entu.folderE = await get_folderE()
  entu.victimE = await get_victimE()
  console.log({entu})
  
  // const connection = await mysql.createConnection(mysqlConfig)
  const [rows, fields] = await pool.execute(select_q, [bulk_size])
  console.log({fields: fields.map(f => f.name)})
  const persons = rows.map(r => r.persoon)
  let counter = 0
  for (let row of rows) {
    counter++
    let entu_id = false
    // while (!entu_id) {
      entu_id = await entu_post(row)
      if (!entu_id) {
        console.log(counter, row.persoon, 'not posted to entu')
        // wait a second and try again
        await wait_a_sec()
        continue
      }
    // }
    await pool.execute(update_q, [row.persoon, `${entu_id}`, `${entu_id}`])
    const [updated] = await pool.execute(select_updated, [row.persoon])
    console.log(counter, row.persoon, row.updated, updated[0].entu_id, updated[0].sync_ts, row.eesnimi, row.perenimi)
    // console.log(counter, row.eesnimi, row.perenimi, row.updated, updated.persoon, updated.entu_id, updated.sync_ts)
  }
  // connection.end()
  return persons
}

run()
.catch(console.log)
.then((msg) => {
  console.log('done', msg)
  // process.exit(0)
})

const entu_post = async (row) => {
  // const entu_id = `entu_${row.persoon}`
  const entity = row2entity(row)
  if (!entity) {
    // console.error('entu_post: Invalid entity', {row})
    return false
  }
  const url = `https://${ENTU_HOST}/entity`
  const entu_options = {
    method: 'POST',
    headers: {
      'Accept-Encoding': 'deflate',
      'Authorization': `Bearer ${entu.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entity)
  }
  const response = await fetch(url, entu_options)
  response.ok || console.error(`entu_post response error: ${response.status} ${response.statusText} | Persoon: ${row.persoon}`)
  const json = await response.json()
  if (json._id) {
    return json._id
  } else {
    console.error(`entu_post Invalid json data: ${response.status} ${response.statusText} | Persoon: ${row.persoon}`)
    return false
  }
}

const wait_a_sec = async () => {
  return new Promise(resolve => setTimeout(resolve, 1000))
}