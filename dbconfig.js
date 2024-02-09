const fs = require('fs')
 
const tunnelConfig = {
    host: process.env.DB_SSH_HOST,
    user: process.env.DB_SSH_USER,
    privateKey: fs.readFileSync(process.env.HOME + '/.ssh/id_rsa')
}
const mysqlConfig = {
    host: 'dev.memoriaal.ee',
    user: process.env.M_MYSQL_U,
    password: process.env.M_MYSQL_P,
    database: process.env.M_DB_NAME || 'pub'
}

console.log({tunnelConfig, mysqlConfig})


const mysql     = require('mysql2')
const Client    = require('ssh2').Client;

const tunnel = {

    /**
     * @var ssh2.Connection _conn The SSH connection
     */
    _conn: null,

    /**
     * @var mysql2.Connection _conn The MySQL connection
     */
    _sql: null,

    /**
     * @param obj sshConfig SSH Configuration as defined by ssh2 package
     * @param obj dbConfig MySQL Configuration as defined by mysql(2) package
     * @return Promise <mysql2 connection>
     */
    connect: function(sshConfig, dbConfig) {
        dbConfig = tunnel._addDefaults(dbConfig)
        return new Promise(function(resolve, reject) {
            tunnel._conn = new Client();
            tunnel._conn.on('ready', function() {
                tunnel._conn.forwardOut(
                    '127.0.0.1',
                    12345,
                    dbConfig.host,
                    dbConfig.port,
                    function (err, stream) {
                        if (err) {
                            var msg = err.reason == 'CONNECT_FAILED'
                            ? 'Connection failed.'
                            : err
                            console.error(msg)
                            tunnel.close()
                            return reject(msg)
                        }

                        // override db host, since we're operating from within the SSH tunnel
                        dbConfig.host = 'localhost'
                        dbConfig.stream = stream

                        tunnel._sql = mysql.createConnection(dbConfig)
                        resolve(tunnel._sql)
                    }
                )
            }).connect(sshConfig)
        })
    },

    close: function() {
        if ('end' in tunnel._sql) {
            tunnel._sql.end(function(err) {})
        }

        if ('end' in tunnel._conn) {
            tunnel._conn.end()
        }
    },

    _addDefaults(dbConfig) {
        if (!('port' in dbConfig)) {
            dbConfig.port = 3306
        }

        if (!('host' in dbConfig)) {
            dbConfig.host = 'localhost'
        }

        return dbConfig
    }
}

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