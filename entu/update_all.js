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
  select nk.*
  from pub.entu
  where e.sync_ts is null
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


const entu = {}
const run = async () => {
  entu.token = await get_token()
  
  // const connection = await mysql.createConnection(mysqlConfig)
  const [rows, fields] = await pool.execute(select_q, [bulk_size])
  console.log({fields: fields.map(f => f.name)})
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
  return rows.length
}

run()
.catch(console.log)
.then((msg) => {
  console.log('done', msg)
  // process.exit(0)
})

const entu_post = async (row) => {
  // const entu_id = `entu_${row.persoon}`
  const url = `https://${ENTU_HOST}/entity/${row.entu_id}`
  const entu_options = {
    method: 'POST',
    headers: {
      'Accept-Encoding': 'deflate',
      'Authorization': `Bearer ${entu.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([
      { "type": "_inheritrights", "boolean": true }
    ])
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