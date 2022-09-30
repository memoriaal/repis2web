const path = require('path')
const util = require('util')
const async = require('async')
const fs = require('fs')

var first_line_is_for_labels = false

const ES_CREDENTIALS = process.env.ES_CREDENTIALS
const INDEX = process.env.INDEX
const SOURCE = process.env.SOURCE
// const BULK_SIZE = 507
const BULK_SIZE = 2000
const START_TIME = Date.now()


var csv = require("fast-csv");
var labels = ["id","perenimi","eesnimi","isanimi","emanimi","perenimed","eesnimed","emanimed","isanimed","sünd","surm","kivi","tahvlikirje","tiib","tahvel","tulp","rida","ohvitser","auaste","VR","evonimi","evokirje","evoaastad","kirjed","pereseos","pereseosID","relevantne"]


const elasticsearch = require('elasticsearch')
const esOptions = { host: 'https://' + ES_CREDENTIALS + '@94abc9318c712977e8c684628aa5ea0f.us-east-1.aws.found.io:9243',
                    requestTimeout: 1*60e3, // 5 minutes
                    // log: 'trace' 
                  }
// console.log({ES_CREDENTIALS, esOptions})
const esClient = new elasticsearch.Client(esOptions)

const kirje2obj = function(kirje) {
  let o_kirje = {}
  let ksplit = kirje.split('#|')
  if (ksplit.length != 6) {
    console.log('---\n' + ksplit.length + ' --- ' + kirje)
  }
  o_kirje.persoon = ksplit.shift()
  o_kirje.kirjekood = ksplit.shift()
  o_kirje.RaamatuPere = o_kirje.kirjekood.slice(0, -2)
  o_kirje.kirje = ksplit.shift()
  o_kirje.words = o_kirje.kirje.split(' ').slice(0, 3).join(' ').replace(/[.,;]/g, '')
  // o_kirje.allikakood = o_kirje.kirjekood.split('-')[0]
  o_kirje.allikas = ksplit.shift()
  ksplit.shift() // o_kirje.allikasTxt = ksplit.shift()
  // console.log(o_kirje.persoon)
  try {
    _labels_str = ksplit.shift().split("'").join('"')
  } catch (error) {
    console.log({kirje});
    throw error
  }
  // console.log(o_kirje.kirjekood, _labels_str);
  _labels_o = JSON.parse(_labels_str)
  // console.log(_labels_o);
  if (_labels_o[0] === '') {
    _labels_o = []
  }
  o_kirje.labels = _labels_o['labels'].join(' ')
  return o_kirje
}

const nimekiri_o = {
  EMI: 'Represseeritute nimestik',
  EVO: 'Kommunistliku terrori läbi hukkunud Eesti ohvitserid',
  JWMR: 'Kommunismiohvritest Eesti juutide andmebaas',
  KIVI: 'Kommunismiohvrite Memoriaalile kantavate isikute nimestik',
  LMSS: 'Herbert Lindmäe, Suvesõda 1941',
  MM: 'Hukkunud metsavendade nimestik',
  PR: 'Pereregistri andmebaas',
  R1: 'Poliitilised arreteerimised Eestis 1940–1988',
  R2: 'Poliitilised arreteerimised Eestis',
  R3: 'Poliitilised arreteerimised Eestis',
  R41: 'Märtsiküüditamine 1949',
  R42: 'Märtsiküüditamine 1949',
  R5: 'Märtsiküüditamine 1949',
  R61: 'Küüditatud 1940',
  R62: 'Küüditatud juunis & juulis 1941',
  R63: 'Sakslastena küüditatud 15.08.1945',
  R64: 'Vahepealsetel aegadel küüditatud 1945-1953',
  R65: 'Küüditatud usutunnistuse pärast',
  R81: 'Represseeritute lisanimestik 1940-1990 (R8/1)',
  R82: 'Lisanimestik 1940-1990 (R8/2)',
  R83: 'Eestist 1945-1953 küüditatute nimekiri (R8/3)',
  RK: 'Poliitilistel põhjustel süüdimõistetud',
  RR: 'Rahvastikuregister',
  SJV: 'Nõukogude sõjavangi- ja filterlaagrites hukkunud eestlased',
  TS: 'Tagasiside veebist memoriaal.ee',
}

console.log('start 0')


async.series({
  reading: function(callback) {
    console.log('Reading ' + SOURCE);
    csv
      .fromPath(SOURCE)
      .on("data", function(data) {
        if (first_line_is_for_labels) {
          first_line_is_for_labels = false
          labels = data
          return
        }
        let isik = {}
        // console.log(data);
        for (var i = 0; i < labels.length; i++) {
          // console.log('--> ', data[i]);
          if (data[i] !== undefined && data[i] !== '') {
            isik[labels[i]] = data[i].replace(/@/g, '"')
          }
        }
        if (isik.id === '') {
          return
        }
        try {
          // console.log({'iki': isik['kirjed']})
          isik['kirjed'] = isik['kirjed'].split(';_\\\n')
          .filter((kirje) => kirje !== '')
          .map((kirje) => {
            return kirje2obj(kirje)
          })
          // console.log({'iki2': isik['kirjed']})
        } catch (e) {
          console.log(e)
          console.log(isik)
        }
        if (isik['pereseos'] !== undefined) {
          let pereseosed = isik['pereseos'].split(';_\\\n')
            .filter((kirje) => kirje !== '')
            .map((kirje) => {
              return kirje2obj(kirje)
            })
          let pered = {}
          pereseosed.forEach((kirje) => {
            let RaamatuPere = kirje.kirjekood.slice(0, -2)
            if (pered[RaamatuPere] === undefined) {
              let nimekiri = nimekiri_o[RaamatuPere.split('-')[0]] || '#N/A'
              pered[RaamatuPere] = {
                RaamatuPere: RaamatuPere,
                nimekiri: nimekiri,
                kirjed: []
              }
            }
            pered[RaamatuPere]['kirjed'].push(kirje)
          })
          isik['pereseos'] = Object.values(pered)
        }
        // console.log('Saving ' + isik.id);

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
                perenimi: {
                  type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                eesnimi: {
                  type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                perenimed: {
                  type: 'text'
                },
                eesnimed: {
                  type: 'text'
                },
                'sünd': { type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                'surm': { type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                'tiib': { type: 'text',
                  fields: {
                    raw: { type: 'keyword' }
                  }
                },
                pereseos: {
                  type: 'nested',
                  properties: {
                    kirjed: {
                      type: 'nested',
                      properties: {
                        persoon: {
                          type: 'keyword'
                        }
                      }
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

console.log('finito 1')


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
