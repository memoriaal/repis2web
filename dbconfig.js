const fs = require('fs')
const { Client } = require('ssh2')
const ssh = new Client()
const mysql     = require('mysql2')

const tunnelConfig = {
    host: process.env.DB_SSH_HOST,
    port: 22,
    username: process.env.DB_SSH_USER,
    // privateKey: fs.readFileSync(process.env.HOME + '/.ssh/id_ecdsa')
    privateKey: fs.readFileSync(process.env.HOME + '/.ssh/id_rsa')
}
const mysqlConfig = {
    multipleStatements: true,
    host: '127.0.0.1',
    user: process.env.M_MYSQL_U,
    password: process.env.M_MYSQL_P,
    database: process.env.M_DB_NAME || 'pub'
}

// console.log({ ...mysqlConfig, stream:'foo' })

var db = new Promise(function(resolve, reject) {
    console.log('connecting')
    ssh.on('ready', function() {
        console.log('ssh ready')
        ssh.forwardOut(
            '127.0.0.1',
            3306,
            'dev.memoriaal.ee',
            3306,
            function (err, stream) {
                console.log('stream', stream, err)
                if (err) throw err
                stream.on('close', () => {
                    console.log('stream close')
                }).on('data', (data) => {
                    console.log('stream data', data.toString())
                }).on('end', () => {    
                    console.log('stream end')
                }).on('error', (err) => {
                    console.log('stream error', err)
                }).on('finish', () => {
                    console.log('stream finish')
                }).on('readable', () => {
                    console.log('stream readable')
                }).on('drain', () => {
                    console.log('stream drain')
                }).on('pipe', () => {
                    console.log('stream pipe')
                }).on('unpipe', () => {
                    console.log('stream unpipe')
                }).on('error', (err) => {
                    console.log('stream error', err)
                })
                // use `sql` connection as usual
                connection = mysql.createConnection({ ...mysqlConfig, stream })
                connection.connect(function(err) {
                    if (err) {
                        console.log(err)
                        connection.end()
                        reject(err)
                    } else {
                        resolve(connection)
                    }
                })
            }
        )
    })
    ssh.on('error', function(err) {
        console.log('ssh error', err)
    })
    ssh.on('end', function() {
        console.log('ssh end')
    })
    ssh.on('close', function() {
        console.log('ssh close')
    })
    ssh.on('exit', function() {
        console.log('ssh exit')
    })
    ssh.connect(tunnelConfig)
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
                    console.log(`result a`, result)
                    resolve(JSON.parse(JSON.stringify(result)))
                })
            })
        })
    } catch(e) {
        console.log(e)
    }
}

NEW_SQLQUERY('SELECT * FROM `nimekiri` LIMIT 10')
.then((result) => {
    console.log(`result`, result)
})

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