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

const mysqlConfig = {
  multipleStatements: true,
  host: '127.0.0.1',
  user: process.env.M_MYSQL_U,
  password: process.env.M_MYSQL_P,
  database: process.env.M_DB_NAME || 'pub'
}

const select_q = `
  select e.entu_id, e.sync_ts, nk.*
  from pub.nimekirjad nk
  left join pub.entu e on e.persoon = nk.persoon
  where e.sync_ts is null
  order by nk.updated
  limit 10;
`
const update_q = `
  insert into pub.entu (persoon, entu_id, sync_ts) values (?, ?, current_timestamp())
  on duplicate key update entu_id = ?, sync_ts = current_timestamp();
`

const entu = {
  token: await get_token(),
  folderE: await get_folderE(),
  victimE: await get_victimE()
}
console.log({entu})

run = async () => {
  const connection = await mysql.createConnection(mysqlConfig)
  const [rows, fields] = await connection.execute(select_q)
  console.log({rows, fields: fields.map(f => f.name)})
  const persons = rows.map(r => r.persoon)
  for (let row of rows) {
    const entu_id = await entu_post(row)
    const [rows, fields] = await connection.execute(update_q, [row.persoon, `entu_${row.persoon}`, `entu_${row.persoon}`])
    console.log(rows, row.persoon, row.eesnimi, row.perenimi, row.updated)
  }
  connection.end()
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
  const url = `https://${ENTU_HOST}${ENTU_AUTH_PATH}`



}



get_token = async () => {
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

get_folderE = async () => {
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

get_victimE = async () => {
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