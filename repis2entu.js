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
  // multipleStatements: true,
  host: '127.0.0.1',
  user: process.env.M_MYSQL_U,
  password: process.env.M_MYSQL_P,
  database: process.env.M_DB_NAME || 'pub'
}

console.log('mysqlConfig', mysqlConfig)

async function run() {
  const connection = await mysql.createConnection(mysqlConfig)
  const [rows, fields] = await connection.execute('SELECT current_timestamp();')
  console.log({rows, fields})
}

run()
.catch(console.log)
.then(() => process.exit(0))

console.log('done')