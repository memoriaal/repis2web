const mysqlssh = require('mysql-ssh')
const fs = require('fs')
 
tunnelConfig = {
    host: process.env.DB_SSH_HOST,
    user: process.env.DB_SSH_USER,
    privateKey: fs.readFileSync(process.env.HOME + '/.ssh/id_rsa')
}
mysqlConfig = {
    host: 'dev.memoriaal.ee',
    user: process.env.M_MYSQL_U,
    password: process.env.M_MYSQL_P,
    database: process.env.M_DB_NAME || 'pub'
}

console.log({tunnelConfig, mysqlConfig})

mysqlssh.connect(tunnelConfig, mysqlConfig)
    .then(client => {
        client.query('SELECT * FROM `nimekiri` LIMIT 10', function (err, results, fields) {
            if (err) throw err
            console.log(results)
            mysqlssh.close()
        })
    })
    .catch(err => {
        console.log(err)
    })