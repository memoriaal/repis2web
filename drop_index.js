const ES_CREDENTIALS = process.env.ES_CREDENTIALS
const INDEX = process.env.INDEX

const elasticsearch = require('elasticsearch')
const esOptions = { host: 'https://' + ES_CREDENTIALS + '@repis7.us-east-1.aws.found.io:9243',
// const esOptions = { host: 'https://' + ES_CREDENTIALS + '@0f0ded6654224bb78086ae6ee8aef020.es.eu-central-1.aws.cloud.es.io:9243',
                    requestTimeout: 1 * 60e3,
                    log: 'trace' 
                  }

const esClient = new elasticsearch.Client(esOptions)

esClient.indices.delete(
  {index: INDEX},
  function(err, resp, status) {
    if (err) {
      console.log('err', err)
    }
    console.log("deleted", resp)
  }
)
