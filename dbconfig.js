const fs = require('fs')
const { Client } = require('ssh2')
const mysql     = require('mysql2')

const tunnelConfig = {
    host: process.env.DB_SSH_HOST,
    port: 22,
    username: process.env.DB_SSH_USER,
    privateKey: fs.readFileSync(process.env.HOME + '/.ssh/id_rsa')
}
const mysqlConfig = {
    host: 'dev.memoriaal.ee',
    user: process.env.M_MYSQL_U,
    password: process.env.M_MYSQL_P,
    database: process.env.M_DB_NAME || 'pub'
}

console.log({tunnelConfig, mysqlConfig})

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('uptime', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect(tunnelConfig)

process.exit(0)


tunnel.connect(tunnelConfig, mysqlConfig)
    .then(client => {
        client.query('SELECT * FROM `nimekiri` LIMIT 10', function (err, results, fields) {
            if (err) throw err
            console.log(results)
            tunnel.close()
        })
    })
    .catch(err => {
        console.log(err)
    })