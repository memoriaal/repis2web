const fs = require('fs')
const { Client } = require('ssh2')
const ssh = new Client()
const mysql     = require('mysql2')

const tunnelConfig = {
    host: process.env.DB_SSH_HOST,
    port: 22,
    username: process.env.DB_SSH_USER,
    privateKey: fs.readFileSync(process.env.HOME + '/.ssh/id_rsa')
}
const mysqlConfig = {
    multipleStatements: true,
    host: 'dev.memoriaal.ee',
    user: process.env.M_MYSQL_U,
    password: process.env.M_MYSQL_P,
    database: process.env.M_DB_NAME || 'pub',
    stream: stream
}

console.log({tunnelConfig, mysqlConfig})

var db = new Promise(function(resolve, reject){
    ssh.on('ready', function() {
      ssh.forwardOut(
        '127.0.0.1',
        3306,
        '127.0.0.1',
        3306,
        function (err, stream) {
            if (err) throw err
              // use `sql` connection as usual
            connection = mysql.createConnection(mysqlConfig)
            connection.connect(function(err){
                if (err) {
                    connection.end()
                    reject(err)
                } else {
                    resolve(connection)
                }
            });
        });
    }).connect(tunnelConfig)
})

function NEW_SQLQUERY(command) {
    try{
        console.log(command)
        return new Promise(function(resolve, reject) {
            db.then(function(connection) {
                connection.query(command, async function (err, result, fields) {
                    if (err) {
                        console.log(err)
                        reject()
                        return
                    }
                    resolve(JSON.parse(JSON.stringify(result)))
                })
            })
        })
    } catch(e) {
        console.log(e)
    }
}

NEW_SQLQUERY('SELECT * FROM `nimekiri` LIMIT 10')
.then(console.log)

ssh.end()

// tunnel.connect(tunnelConfig, mysqlConfig)
//     .then(client => {
//         client.query('SELECT * FROM `nimekiri` LIMIT 10', function (err, results, fields) {
//             if (err) throw err
//             console.log(results)
//             tunnel.close()
//         })
//     })
//     .catch(err => {
//         console.log(err)
//     })