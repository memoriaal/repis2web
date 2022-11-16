const path = require('path')
const util = require('util')
const async = require('async')
const fs = require('fs')

const ES_CREDENTIALS = process.env.ES_CREDENTIALS
const INDEX = process.env.INDEX
const SOURCE = process.env.SOURCE
// const BULK_SIZE = 507
const BULK_SIZE = 2000
const START_TIME = Date.now()


var csv = require("fast-csv");
// data is expected as ["id", "kirje", "kirjed", "pereseosed", "tahvlikirje"]

const elasticsearch = require('elasticsearch')
const esOptions = { host: 'https://' + ES_CREDENTIALS + '@94abc9318c712977e8c684628aa5ea0f.us-east-1.aws.found.io:9243',
                    requestTimeout: 1 * 60e3,
                    // log: 'trace' 
                  }
// console.log({ES_CREDENTIALS, esOptions})
const esClient = new elasticsearch.Client(esOptions)

console.log('start 0')

async.series({
  reading: function(callback) {
    console.log('Reading ' + SOURCE);
    csv
      .fromPath(SOURCE)
      .on("data", function(data) {
        let isik = {}
        // console.log(data);
        isik['id'] = data[0]
        isik['kirje'] = data[1]
        isik['perenimi'] = data[2]
        isik['eesnimi'] = data[3]
        isik['isanimi'] = data[4]
        isik['emanimi'] = data[5]
        isik['sünd'] = data[6]
        isik['surm'] = data[7]
        isik['kirjed'] = JSON.parse(data[8])

        // console.log(JSON.stringify(isik, 0, 2))
        save2list(isik, function(error) {
          if (error) {
            console.log(error)
            process.exit(1)
          } else {}
        })
      })
      .on("end", function() {
        console.log('on end: done with reading ' + isikud_list.length + ' records')
        callback(null, 'done with reading')
      })
  },
  delete: function(callback) {
    console.log('Deleting ' + INDEX);
    esClient.indices.delete({
        index: INDEX
      },
      function(err, resp, status) {
        console.log("deleted", resp)
        callback(null, resp)
      }
    )
  },
  create: function(callback) {
    console.log('Creating ' + INDEX);
    esClient.indices.create({
        index: INDEX,
        body: {
          mappings: {
            isik: {
              // _all: { enabled: false },
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
                kirjed: {
                  type: 'nested',
                  properties: {
                    kirje: {
                      type: 'keyword'
                    }
                  }
                }
              }
            }
          }
        }
      },
      function(err, resp, status) {
        if (err) {
          console.log(err);
          callback(err)
        } else {
          console.log('created', resp);
          callback(null, resp)
        }
      }
    )
  },
  upload: function(callback) {
    let i = 0
    async.eachSeries(bulk, function iterator(batch, callback) {
      i = i + 1
      console.log('processing batch nr. ' + i + ' [' + Math.floor((Date.now()-START_TIME)/1000) + '] ')
      esClient.bulk({
        body: batch.join('\n')
      }, function(error, response) {
        if (error) {
          console.log('Error ' + error.status)
          if (error.status === 408) {
            console.log('Timed out')
          }
          return callback(error)
        }
        async.setImmediate(function () {
          callback(null)
        })
      })
    })
  },
  wait_a_sec: function(callback) {
    setTimeout(function () {
      callback(null)
    }, 1e3)
  },
  count: function(callback) {
    esClient.count({
      index: INDEX
    }, function(err, resp, status) {
      let create = {}
      create.index = 'imports'
      create.type = 'import'
      create.id = Date.now()
      create.body = {
        'INDEX': INDEX,
        'records': resp.count,
        'ISODate': new Date().toISOString()
      }
      esClient.create(create, function(error, response) {
        if (error) {
          console.error(error)
          console.log(response)
        }
        console.log('bye')
      })
      callback(null, resp)
    })
  }
}, function(err, results) {
  console.log(results)
})

console.log('checkpoint 1')


var bulk = []
var bulk_cnt = 0
bulk[bulk_cnt] = []
var isikud_list = []
const save2list = function save2list(isik, callback) {
  if (isik !== false) {
    isikud_list.push(isik)

    bulk[bulk_cnt].push(JSON.stringify({
      'index': {
        '_index': INDEX,
        '_type': 'isik',
        '_id': isik.id
      }
    }))
    bulk[bulk_cnt].push(JSON.stringify(isik))

    if (isikud_list.length % BULK_SIZE === 0) {
      bulk_cnt = bulk_cnt + 1
      bulk[bulk_cnt] = []
    }
  }
  return callback(null)
}
