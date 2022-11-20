'use strict'

const ES_CREDENTIALS = process.env.ES_CREDENTIALS
const ES_HOST = process.env.ES_HOST || '94abc9318c712977e8c684628aa5ea0f.us-east-1.aws.found.io:9243'
const INDEX = process.env.ES_INDEX || 'test_index'
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

async function run () {
  let bulk = []
  // await client.indices.create({
  //   index: INDEX,
  //   body: {
  //     mappings: {
  //       properties: {
  //         eesnimi: { type: 'text',
  //           fields: {
  //             raw: { type: 'keyword' }
  //           }
  //         },
  //         perenimi: { type: 'text',
  //           fields: {
  //             raw: { type: 'keyword' }
  //           }
  //         },
  //         kirje: { type: 'text',
  //           fields: {
  //             raw: { type: 'keyword' }
  //           }
  //         },
  //         kirjed: { type: 'nested',
  //           properties: {
  //             kirje: { type: 'keyword' }
  //           }
  //         }
  //       }
  //     }
  //   }
  // }, { ignore: [400] })  

  csv.parseStream(stream)
  .on('error', error => console.error(error))
  .on('data', async row => {
    let isik = row2isik(row)

    cnt['all'] ++
    cnt['isperson'] += isik['isperson']
    cnt['wwii'] += isik['wwii']
    cnt['emem'] += isik['emem']
    cnt['kivi'] += isik['kivi']

    bulk.push(isik)
    if (cnt['all']%BULK_SIZE === 0) {
      console.log('read', cnt)

      bulk = await bulk_upload(bulk)
    }
  })
  .on('end', async rowCount => {
    if(bulk.length > 0) {
      await bulk_upload(bulk)
    }
    console.log(`Parsed ${rowCount} rows`)
    console.log(cnt)
  })
  
}
run().catch(console.log)

async function bulk_upload(bulk) {
  const operations = bulk.flatMap(doc => [{ index: { _index: INDEX, '_id': doc.id } }, doc])
  const bulkResponse = await client.bulk({ refresh: true, operations })
  if (bulkResponse.errors) {
    const erroredDocuments = []
    // The items array has the same order of the dataset we just indexed.
    // The presence of the `error` key indicates that the operation
    // that we did for the document has failed.
    bulkResponse.items.forEach((action, i) => {
      const operation = Object.keys(action)[0]
      if (action[operation].error) {
        erroredDocuments.push({
          // If the status is 429 it means that you can retry the document,
          // otherwise it's very likely a mapping error, and you should
          // fix the document before to try it again.
          status: action[operation].status,
          error: action[operation].error,
          foo: Object.keys(action),
          // operation: body[i * 2],
          // document: body[i * 2 + 1]
        })
      }
    })
    console.log(erroredDocuments)
  }
  bulk = []
  return bulk
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
  isik['kirjed'] = JSON.parse(row[9])
  isik['pereseosed'] = JSON.parse(row[10])
  isik['tahvlikirje'] = JSON.parse(row[11])
  isik['isperson'] = row[12] ? 1 : 0
  isik['kivi'] = row[13] ? 1 : 0
  isik['emem'] = row[14] ? 1 : 0
  isik['evo'] = row[15] ? 1 : 0
  isik['wwii'] = row[16] ? 1 : 0
  return isik
}
