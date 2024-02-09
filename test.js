'use strict'

var path         = require('path')
const fs         = require('fs')
const csv        = require('@fast-csv/parse')
const fetch      = require('node-fetch')

// const SOURCE         = process.env.SOURCE         || 'test.csv'
const ENTU_HOST      = process.env.ENTU_HOST      || 'api.entu.app'
const ENTU_AUTH_PATH = process.env.ENTU_AUTH_PATH || '/auth?account=emi'
const ENTU_WRITE_KEY = process.env.ENTU_WRITE_KEY

const M_MYSQL_U      = process.env.M_MYSQL_U
const M_MYSQL_P      = process.env.M_MYSQL_P

// const stream = fs.createReadStream(SOURCE)

// set working dir to script dir
process.chdir(__dirname)
const LOG_PATH       = process.env.LOG_PATH       || path.join(__dirname,'logs')

const BULK_SIZE      = 250000
const entu = {}


// prepare data for Entu
const { execSync } = require('child_process')

// Read .env file
execSync('source ~/.env', (err, stdout, stderr) => {
    if (err) {
        return
    }
    console.log(`stdout: ${stdout}`)
    console.log(`stderr: ${stderr}`)
});


console.log('Create ssh tunnel to mysql proxy')
// ssh tunnel to mysql proxy (control file in ~/.ssh/config)
// ssh -f -N -T -M -L 3306:127.0.0.1:3306 repis-proxy
execSync('ssh -f -N -T -M -L 3306:127.0.0.1:3306 repis-proxy', (err, stdout, stderr) => {
  if (err) {
    return
  }

  // the *entire* stdout and stderr (buffered)
  console.log(`stdout: ${stdout}`)
  console.log(`stderr: ${stderr}`)
})

console.log('Fetch date from mysql')
// fetch new timestamp from database
execSync(`mysql --port=3306 -u"${M_MYSQL_U}" -p"${M_MYSQL_P}" pub<<EOFMYSQL\nSELECT current_timestamp();\nEOFMYSQL`, (err, stdout, stderr) => {
  if (err) {
    return
  }
  console.log(`stdout: ${stdout}`)
  console.log(`stderr: ${stderr}`)
})
const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')


// lastEntuTimestamp from file
const tsFile = path.join(__dirname, 'lastEntuTimestamp.ts')
// create file if not exists
if (!fs.existsSync(tsFile)) {
  fs.writeFileSync(tsFile, '', 'utf8')
}
const lastEntuTimestamp = fs.readFileSync(tsFile, 'utf8')
console.log('lastEntuTimestamp', lastEntuTimestamp)


// write lastEntuTimestamp to file
fs.writeFileSync(tsFile, currentTimestamp, 'utf8')

var cnt = { all: 0, wwii: 0, emem: 0, kivi: 0, mv: 0, isperson: 0 }

process.on('warning', e => console.warn(e.stack))


async function run() {
  entu.token = await get_token()
  entu.folderE = await get_folderE()
  entu.victimE = await get_victimE()
  await remove_empty_victims()
  // console.log('entu', entu)

  let bulk = []
  const csv_stream = csv.parseStream(stream)
  csv_stream
    .on('error', error => console.error(error))
    .on('data', async row => {
      csv_stream.pause()
      let isik = row2entity(row)
      if (isik !== false) {
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
// run().catch(console.log)

const erroredDocuments = []
async function bulk_upload(bulk) {
  console.log('bulk_upload', bulk.length)
  // remove records one by one
  while (bulk.length > 0) {
    const doc = bulk[0]
    const posted = await entu_post(doc)
    const persoon = doc.find(i => i.type === 'persoon').string
    console.log(`Entu ${bulk.length}: ${posted._id} ${persoon}`)
    bulk.splice(0, 1) // remove first element
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
  
  entity.push({ "type": "_type", "reference": entu.victimE })
  
  if (!row[0]) {
    return false
  }
  entity.push({ "type": "persoon", "string": row[0] })
  
  if (row[21]) {
    entity.push({ "type": "redirect", "string": row[21] })
    return entity
  }

  if (!row[1]) {
    return false
  }
  // also return false, if row[1] doesnot have any letters
  if (!/[a-zõüöäA-ZÕÜÖÄ]/.test(row[1])) {
    return false
  }
  row[1]  && entity.push({ "type": "kirje", "string": row[1] })

  // return false if forename && surname are empty
  if (!row[3] && !row[4]) {
    return false
  }
  row[3]  && entity.push({ "type": "surname", "string": row[3] })
  row[4]  && entity.push({ "type": "forename", "string": row[4] })

  row[2]  && entity.push({ "type": "evokirje", "string": row[2] })
  row[5]  && entity.push({ "type": "father", "string": row[5] })
  row[6]  && entity.push({ "type": "mother", "string": row[6] })
  row[7]  && entity.push({ "type": "birth", "string": row[7] })
  row[8]  && entity.push({ "type": "death", "string": row[8] })
  row[9]  && entity.push({ "type": "birthplace", "string": row[9] })
  row[10] && entity.push({ "type": "deathplace", "string": row[10] })
  row[11] && entity.push({ "type": "kirjed", "string": row[11] })
  // try { entity.push({ "type": "kirjed", "string": JSON.parse(row[11]) }) } catch (e) { console.log(e, row[11]) }
  row[12] && (row[12] !== '[]') && entity.push({ "type": "pereseosed", "string": row[12] })
  row[13] && (row[13] !== '{}') && entity.push({ "type": "tahvlikirje", "string": row[13] })
  row[14] && (row[14] !== '[]') && entity.push({ "type": "episoodid", "string": row[14] })
  row[15] === '1' && entity.push({ "type": "isperson", "boolean": row[15] === '1' })
  row[16] === '1' && entity.push({ "type": "kivi", "boolean": row[16] === '1' })
  row[17] === '1' && entity.push({ "type": "emem", "boolean": row[17] === '1' })
  row[18] === '1' && entity.push({ "type": "evo", "boolean": row[18] === '1' })
  row[19] === '1' && entity.push({ "type": "wwii", "boolean": row[19] === '1' })
  row[20] === '1' && entity.push({ "type": "mv", "boolean": row[20] === '1' })
  entity.push({ "type": "_parent", "reference": entu.folderE })
  return entity
}


// remove empty persons
// ?_type.string=victim&redirect.string.gt=&forename.string=
// DELETE {{hostname}}/entity?_type.string=victim&redirect.string.gt=&forename.string= HTTP/1.1
// Accept-Encoding: deflate
// Authorization: Bearer {{token}}
async function remove_empty_victims() {
  const url = `https://${ENTU_HOST}/entity?_type.string=victim&surname.string=&forename.string=`
  const options = {
    method: 'GET',
    headers: {
      'Accept-Encoding': 'deflate',
      'Authorization': `Bearer ${entu.token}`
    }
  }
  const response = await fetch(url, options)
  const json = await response.json()
  console.log(json.entities.length, 'empty persons found')
  const entityIds = json.entities.filter(i => i._id).map(i => i._id)
  delete_entities(entityIds)
}

async function delete_entities(entityIds) {
  while (entityIds.length > 0) {
    const id = entityIds[0]
    const url = `https://${ENTU_HOST}/entity/${id}`
    const options = {
      method: 'DELETE',
      headers: {
        'Accept-Encoding': 'deflate',
        'Authorization': `Bearer ${entu.token}`
      }
    } 
    const response = await fetch(url, options)
    const json = await response.json()
    console.log(json)
    entityIds.splice(0, 1)
  }
}