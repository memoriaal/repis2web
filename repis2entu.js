'use strict'

var path         = require('path')
const fs         = require('fs')
const csv        = require('@fast-csv/parse')
const { exit }   = require('process')

const SOURCE         = process.env.SOURCE         || 'test.csv'
const ENTU_HOST      = process.env.ENTU_HOST      || 'api.entu.app'
const ENTU_AUTH_PATH = process.env.ENTU_AUTH_PATH || '/auth?account=emi'
const ENTU_WRITE_KEY = process.env.ENTU_WRITE_KEY

const BULK_SIZE      = 2500
const LOG_PATH       = process.env.LOG_PATH       || path.join(process.cwd(),'..')

const stream = fs.createReadStream(SOURCE)

console.log({
  'SOURCE': SOURCE,
  'ENTU_HOST': ENTU_HOST,
  'ENTU_AUTH_PATH': ENTU_AUTH_PATH,
  'ENTU_WRITE_KEY': ENTU_WRITE_KEY,
})

const fetch = require('node-fetch')

// Get token
// GET {{hostname}}/auth?account=emi HTTP/1.1
// Accept-Encoding: deflate
// Authorization: Bearer {{key}}
async function get_token() {
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
    // Handle the case where json is not an array or is an empty array
    console.error('Invalid json data')
    return null
  }}

// POST {{hostname}}/entity HTTP/1.1
// Accept-Encoding: deflate
// Authorization: Bearer {{token}}
// Content-Type: application/json; charset=utf-8
const entu_post = async (doc) => {
  const url = `https://${ENTU_HOST}/entity`
  const token = await get_token()
  console.log('entu_post', {token})
  const options = {
    method: 'POST',
    headers: {
      'Accept-Encoding': 'deflate',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(doc)
  }
  const response = await fetch(url, options)
  const json = await response.json()
  console.log(json)
  return json
}

require('array.prototype.flatmap').shim()

var cnt = { all: 0, wwii: 0, emem: 0, kivi: 0, mv: 0, isperson: 0 }

process.on('warning', e => console.warn(e.stack))

async function run() {

  let bulk = []
  const csv_stream = csv.parseStream(stream)
  csv_stream
    .on('error', error => console.error(error))
    .on('data', async row => {
      csv_stream.pause()
      let isik = row2entity(row)

      bulk.push(isik)
      if (bulk.length === BULK_SIZE) {
        console.log('read', JSON.stringify(cnt, null, 0))
        // while(bulk.length > 0) {
        await bulk_upload(bulk)
        if (bulk.length) {
          console.log(bulk.length, 'left in bulk.', bulk.map(i => i.id))
        }
        // }
      }
      csv_stream.resume()
    })
    .on('end', async rowCount => {
      console.log('Enter last bulk with', bulk.length, 'left')
      while (bulk.length > 0) {
        await bulk_upload(bulk)
        console.log(bulk.length, 'left in bulk.', bulk.map(i => i.id));
      }
      console.log('errored', erroredDocuments)
      console.log(`Uploaded ${rowCount - erroredDocuments.length} of ${rowCount} documents`)
    })
}
run().catch(console.log)

const erroredDocuments = []
async function bulk_upload(bulk) {
  console.log('bulk_upload', bulk.length, bulk[0].id)
  // remove records one by one
  while (bulk.length > 0) {
    let doc = bulk[0]
    if (doc.kirje === '') {
      // delete from entu
      console.log('delete', doc.id)
    } else {
      await entu_post(doc)
      console.log('posted', doc.id)
    }
    bulk.splice(0, 1)
  } 
  return
}


// Create a structure for Entu
// [
//   {"type": "_type", "string": "victim"},
//   {"type": "forename", "string": "John"},
//   {"type": "surname", "string": "Doe"},
//   {"type": "mother", "string": "Jane"},
//   {"type": "father", "string": "Jack"},
//   {"type": "birth", "string": "2000-01-01"},
//   {"type": "death", "string": "2020-01-01"},
//   {"type": "birthplace", "string": "Tallinn"},
//   {"type": "_parent", "reference": "65c34b4fa732c040f16a8e44" },
//   ... etc
// ]
function row2entity(row) {
  let entity = []
  entity.push({ "type": "_type", "string": "victim" })
  entity.push({ "type": "persoon", "string": row[0] })
  entity.push({ "type": "kirje", "string": row[1] })
  entity.push({ "type": "evokirje", "string": row[2] })
  entity.push({ "type": "perenimi", "string": row[3] })
  entity.push({ "type": "eesnimi", "string": row[4] })
  entity.push({ "type": "isanimi", "string": row[5] })
  entity.push({ "type": "emanimi", "string": row[6] })
  if (row[7]) entity.push({ "type": "birth", "string": row[7] })
  if (row[8]) entity.push({ "type": "death", "string": row[8] })
  if (row[9]) entity.push({ "type": "birthplace", "string": row[9] })
  if (row[10]) entity.push({ "type": "deathplace", "string": row[10] })
  try { entity.push({ "type": "kirjed", "text": JSON.parse(row[11]) }) } catch (e) { console.log(e, row[11]) }
  try { entity.push({ "type": "pereseosed", "text": JSON.parse(row[12]) }) } catch (e) { console.log(e, row[12]) }
  try { entity.push({ "type": "tahvlikirje", "text": JSON.parse(row[13]) }) } catch (e) { console.log(e, row[13]) }
  try { entity.push({ "type": "episoodid", "text": JSON.parse(row[14]) }) } catch (e) { console.log(e, row[14]) }
  entity.push({ "type": "isperson", "boolean": row[15] === '1' })
  entity.push({ "type": "kivi", "boolean": row[16] === '1' })
  entity.push({ "type": "emem", "boolean": row[17] === '1' })
  entity.push({ "type": "evo", "boolean": row[18] === '1' })
  entity.push({ "type": "wwii", "boolean": row[19] === '1' })
  entity.push({ "type": "mv", "boolean": row[20] === '1' })
  entity.push({ "type": "redirect", "string": row[21] })
  entity.push({ "type": "_parent", "reference": "65c34b4fa732c040f16a8e44" })
  return entity
}

function row2isik(row) {
  let isik = {}
  isik['id'] = row[0]
  isik['kirje'] = row[1]
  isik['evokirje'] = row[2]
  isik['perenimi'] = row[3]
  isik['eesnimi'] = row[4]
  isik['isanimi'] = row[5]
  isik['emanimi'] = row[6]
  if (row[7]) isik['sünd'] = row[7]
  if (row[8]) isik['surm'] = row[8]
  if (row[9]) isik['sünnikoht'] = row[9]
  if (row[10]) isik['surmakoht'] = row[10]
  try { isik['kirjed'] = JSON.parse(row[11]) } catch (e) { console.log(e, row[11]) }
  try { isik['pereseosed'] = JSON.parse(row[12]) } catch (e) { console.log(e, row[12]) }
  try { isik['tahvlikirje'] = JSON.parse(row[13]) } catch (e) { console.log(e, row[13]) }
  try { isik['episoodid'] = JSON.parse(row[14]) } catch (e) { console.log(e, row[14]) }
  isik['isperson'] = row[15] === '1' ? 1 : 0
  isik['kivi'] = row[16] === '1' ? 1 : 0
  isik['emem'] = row[17] === '1' ? 1 : 0
  isik['evo'] = row[18] === '1' ? 1 : 0
  isik['wwii'] = row[19] === '1' ? 1 : 0
  isik['mv'] = row[20] === '1' ? 1 : 0
  isik['redirect'] = row[21]
  isik['updated_at'] = new Date().toLocaleString()
  return isik
}
