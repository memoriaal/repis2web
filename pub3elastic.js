'use strict'
const MODE = process.env.MODE || 'recreate'

const ES_CREDENTIALS = process.env.ES_CREDENTIALS
const ES_HOST = process.env.ES_HOST || '94abc9318c712977e8c684628aa5ea0f.us-east-1.aws.found.io:9243'

const refDate = (new Date(2072, 2, 27)).setHours(0,0,0,0)
const nowDate = (new Date()).setHours(0,0,0,0)
const nOd = Math.round(Math.abs(nowDate-refDate)/1000/3600/24) + (MODE === 'update' ? 1 : 0)
const dayParity = nOd % 2
const INDEX = (process.env.ES_INDEX || 'test_index') // + '_' + dayParity
const SOURCE = process.env.SOURCE || 'test.csv'
const BULK_SIZE = 2500

console.log ({
  'ES_CREDENTIALS': ES_CREDENTIALS,
  'ES_HOST': ES_HOST,
  'INDEX': INDEX,
  'SOURCE': SOURCE,
  'BULK_SIZE': BULK_SIZE
})
require('array.prototype.flatmap').shim()

const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: 'https://' + ES_CREDENTIALS + '@' + ES_HOST })

const fs = require('fs')
const csv = require('@fast-csv/parse')
const stream = fs.createReadStream(SOURCE)


var cnt = {all:0, wwii:0, emem:0, kivi:0, isperson:0}

process.on('warning', e => console.warn(e.stack))

async function run () {
  if (MODE === 'recreate') {
    console.log('delete index ' + INDEX)
    try {
      await client.indices.delete({ index: INDEX })
      console.log('= deleted index ' + INDEX)
    } catch (e) {
      console.log(e)
    }
  
    console.log('= create index ' + INDEX)
    try {
      await client.indices.create(
        {
          index: INDEX,
          body: {
            mappings: {
              properties: {
                eesnimi: { type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                perenimi: { type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                kirje: { type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
  
                sünd: { type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                surm: { type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                }
              }
            }
          }
        }, 
        { ignore: [400] }
      )
      console.log('= created index ' + INDEX)
    } catch (e) {
      console.log(e)
    }
  }

  let bulk = []
  const csv_stream = csv.parseStream(stream)
  csv_stream
  .on('error', error => console.error(error))
  .on('data', async row => {
    csv_stream.pause()
    let isik = row2isik(row)
    cnt['all'] ++
    cnt['isperson'] += isik['isperson']
    cnt['wwii'] += isik['wwii']
    cnt['emem'] += isik['emem']
    cnt['kivi'] += isik['kivi']

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
    while(bulk.length > 0) {
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
  // const operations = bulk.flatMap(doc => [{ index: { _index: INDEX, '_id': doc.id } }, doc])
  let operations = []
  bulk.forEach(doc => {
    if (doc.kirje === '') {
      operations.push({ delete: { _index: INDEX, '_id': doc.id } })
    } else {
      operations.push({ index: { _index: INDEX, '_id': doc.id } }, doc)
    }
  })
  

  const bulkResponse = await client.bulk({ refresh: true, operations })
  .catch(e => {
    console.log(Object.keys(e.meta), e.meta.body, '===X===')
  })

  // console.log(JSON.stringify({bulk, operations, bulkResponse}, null, 2))

  let bix = 0
  if (bulkResponse && bulkResponse.items) {
    bulkResponse.items.forEach((item) => {
      const action = item.index || item.delete
      while (bulk[bix].id < action._id) {
        bix ++
      }
      if (bulk[bix].id === action._id) {
        bulk.splice(bix, 1)
      } else {
        console.log('problem with', {bix, isik:bulk[bix], action})
      }
    })
  }
  if (bulkResponse && bulkResponse.errors) {
    // The items array has the same order of the dataset we just indexed.
    // The presence of the `error` key indicates that the operation
    // that we did for the document has failed.
    bulkResponse.items.forEach((action, item) => {
      console.log('e:', item)
      const operation = Object.keys(action)[0]
      if (action[operation].error) {
        erroredDocuments.push(
          // If the status is 429 it means that you can retry the document,
          // otherwise it's very likely a mapping error, and you should
          // fix the document before to try it again.
          action[operation].status + ': ' +
          action[operation].error.reason,
          // operation: body[i * 2],
          // document: body[i * 2 + 1]
        )
      }
    })
  }
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
  try {isik['kirjed'] = JSON.parse(row[11])} catch(e) {console.log(e, row[11])}
  try {isik['pereseosed'] = JSON.parse(row[12])} catch(e) {console.log(e, row[12])}
  try {isik['tahvlikirje'] = JSON.parse(row[13])} catch(e) {console.log(e, row[13])}
  isik['isperson'] = row[14] === '1' ? 1 : 0
  isik['kivi'] = row[15] === '1' ? 1 : 0
  isik['emem'] = row[16] === '1' ? 1 : 0
  isik['evo'] = row[17] === '1' ? 1 : 0
  isik['wwii'] = row[18] === '1' ? 1 : 0
  isik['updated_at'] = new Date().toLocaleString()
  return isik
}

class TestEsClient {
  constructor() {}
}