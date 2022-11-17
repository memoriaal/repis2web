const ES_CREDENTIALS = process.env.ES_CREDENTIALS
const INDEX = process.env.INDEX

const elasticsearch = require('elasticsearch')
const esOptions = { host: 'https://' + ES_CREDENTIALS + '@94abc9318c712977e8c684628aa5ea0f.us-east-1.aws.found.io:9243',
                    requestTimeout: 1 * 60e3,
                    log: 'trace' 
                  }

const esClient = new elasticsearch.Client(esOptions)

esClient.indices.delete(
  {index: INDEX},
  function(err, resp, status) {
    console.log("deleted", resp)
  }
)
