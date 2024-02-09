// dbConfig.js
// define connection config for the database
const dbServer = {
    host: process.env.M_DB_HOST || 'localhost',
    port: process.env.M_DB_PORT || 3306,
    user: process.env.M_MYSQL_U,
    password: process.env.M_MYSQL_P,
    database: process.env.M_DB_NAME || 'pub'
}
// define connection config for the ssh tunnel
const tunnelConfig = {
    host: process.env.DB_SSH_HOST,
    port: 22,
    username: process.env.DB_SSH_USER,
    privateKey: require('fs').readFileSync('~/.ssh/id_ecdsa')
}