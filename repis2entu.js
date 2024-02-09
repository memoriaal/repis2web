'use strict'

var path         = require('path')
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

async function run() {
  const connection = await mysql.createConnection(mysqlConfig)
  let q = `
  select e.entu_id, e.sync_ts, nk.*
  from pub.nimekirjad nk
  left join pub.entu e on e.persoon = nk.persoon
  where e.sync_ts is null
  order by nk.updated
  limit 10;
  `
  const [rows, fields] = await connection.execute(q)
  console.log({rows, fields: fields.map(f => f.name)})
  const persons = rows.map(r => r.persoon)
  for (let row of rows) {
    let q = `
      insert into pub.entu (persoon, entu_id, sync_ts) values (?, ?, current_timestamp())
      on duplicate key update entu_id = ?, sync_ts = current_timestamp();
    `
    const [rows, fields] = await connection.execute(q, [row.persoon, '123', '123'])
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
