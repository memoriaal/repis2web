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
  const url = `https://${ENTU_HOST}/entity?_type.string=entity&name.string=victim&props=_id`
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

  if (!row.kirje) { return false }
  entity.push({ "type": "kirje", "string": row.kirje })

  if (!row.eesnimi && !row.perenimi) { return false }
  row.eesnimi && entity.push({ "type": "forename", "string": row.eesnimi })
  row.perenimi && entity.push({ "type": "surname", "string": row.perenimi })

  row.evokirje && entity.push({ "type": "evokirje", "string": row.evokirje })
  row.father && entity.push({ "type": "father", "string": row.isanimi })
  row.mother && entity.push({ "type": "mother", "string": row.emanimi })
  row.birth && entity.push({ "type": "birth", "string": row.sünd })
  row.death && entity.push({ "type": "death", "string": row.surm })
  row.birthplace && entity.push({ "type": "birthplace", "string": row.sünnikoht })
  row.deathplace && entity.push({ "type": "deathplace", "string": row.surmakoht })
  
  row.kirjed && entity.push({ "type": "kirjed", "string": row.kirjed })
  row.pereseosed && (row.pereseosed !== '[]') && entity.push({ "type": "pereseosed", "string": row.pereseosed })
  row.tahvlikirje && (row.tahvlikirje !== '{}') && entity.push({ "type": "tahvlikirje", "string": row.tahvlikirje })
  row.episoodid && (row.episoodid !== '[]') && entity.push({ "type": "episoodid", "string": row.episoodid })
  
  row.isperson === '1' && entity.push({ "type": "isperson", "boolean": true })
  row.kivi === '1' && entity.push({ "type": "kivi", "boolean": true })
  row.emem === '1' && entity.push({ "type": "emem", "boolean": true })
  row.evo === '1' && entity.push({ "type": "evo", "boolean": true })
  row.wwii === '1' && entity.push({ "type": "wwii", "boolean": true })
  row.mv === '1' && entity.push({ "type": "mv", "boolean": true })
  
  entity.push({ "type": "_parent", "reference": entu.folderE })

  return entity
}

const entu = {}
const run = async () => {
  entu.token = await get_token()
  entu.folderE = await get_folderE()
  entu.victimE = await get_victimE()
  
  // const connection = await mysql.createConnection(mysqlConfig)
  const [rows, fields] = await pool.execute(select_q, [bulk_size])
  console.log({fields: fields.map(f => f.name)})
  const persons = rows.map(r => r.persoon)
  let counter = 0
  for (let row of rows) {
    counter++
    const entu_id = await entu_post(row)
    if (!entu_id) {
      continue 
    }
    await pool.execute(update_q, [row.persoon, `${entu_id}`, `${entu_id}`])
    const [updated] = await pool.execute(select_updated, [row.persoon])
    console.log(counter, row.eesnimi, row.perenimi, row.updated, updated)
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
  const json = await response.json()
  if (json._id) {
    return json._id
  } else {
    console.error('entu_post: Invalid json data', {persoon: row.persoon, kirje: row.kirje, response})
    process.exit(1)
  }
}
