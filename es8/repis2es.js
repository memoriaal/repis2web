'use strict'

var path         = require('path')
const fs         = require('fs')
const csv        = require('@fast-csv/parse')
const { Client } = require('@elastic/elasticsearch')

const MODE           = process.env.MODE           || 'recreate'
const ES_CREDENTIALS = process.env.ES_CREDENTIALS || ''
const ES_HOST        = process.env.ES_HOST        || ''
const INDEX          = process.env.ES_INDEX       || 'test_index'
const SOURCE         = process.env.SOURCE         || 'test.csv'
const BULK_SIZE      = 2500
const LOG_PATH       = process.env.LOG_PATH       || path.join(process.cwd(),'.')

const stream = fs.createReadStream(SOURCE)
const client = new Client({ node: 'https://' + ES_CREDENTIALS + '@' + ES_HOST })

console.log({
  'ES_CREDENTIALS': ES_CREDENTIALS,
  'ES_HOST': ES_HOST,
  'INDEX': INDEX,
  'SOURCE': SOURCE,
  'BULK_SIZE': BULK_SIZE,
  'LOG_PATH': LOG_PATH
})
require('array.prototype.flatmap').shim()

var cnt = { all: 0, wwii: 0, emem: 0, kivi: 0, mv: 0, isperson: 0 }

process.on('warning', e => console.warn(e.stack))

async function run() {
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
                eesnimi: {
                  type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                perenimi: {
                  type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                kirje: {
                  type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                sünd: {
                  type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                surm: {
                  type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                episoodid: {
                  type: 'nested',  // Define "episoodid" as a nested field
                  properties: {
                    nimetus: { type: 'text' },
                    asukoht: { type: 'text' },
                    aeg: { type: 'text' },
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
      cnt['all']++
      cnt['isperson'] += isik['isperson']
      cnt['wwii'] += isik['wwii']
      cnt['mv'] += isik['mv']
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
  // const operations = bulk.flatMap(doc => [{ index: { _index: INDEX, '_id': doc.id } }, doc])
  let operations = []
  bulk.forEach(doc => {
    if (doc.kirje === '') {
      operations.push({ delete: { _index: INDEX, '_id': doc.id } })
    } else {
      operations.push({ delete: { _index: INDEX, '_id': doc.id } }
        , { index: { _index: INDEX, '_id': doc.id } }
        , doc)
    }
  })


  const bulkResponse = await client.bulk({ refresh: true, operations })
    .catch(e => {
      console.log(Object.keys(e.meta), e.meta.body, '===X===')
    })

  const nowMinute = (new Date()).setSeconds(0, 0)
  // fs.writeFileSync( path.join(LOG_PATH, `${nowMinute}.json.out`)
  //                 , JSON.stringify({bulk, operations, bulkResponse}, null, 2))

  if (bulkResponse && bulkResponse.items) {
    bulkResponse.items.forEach((item) => {
      const action = item.index || item.delete

      function findIxBy_id(item) {
        return item.id === this
      }
      let bix = bulk.findIndex(findIxBy_id, action._id)
      // console.log({bulk, bix, item, action})
      if (bix > -1) {
        bulk.splice(bix, 1) // keep first bix elements, remove one
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
