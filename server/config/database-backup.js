// Versão backup simplificada do database.js
const mysql = require('mysql2/promise');

console.log('📁 Carregando database-backup.js...');

// Configuração básica
const dbConfig = {
    host: process.env.DB_HOST || 'srv1196.hstgr.io',
    user: process.env.DB_USER || 'u845362736_sistemasmc',
    password: process.env.DB_PASSWORD || '^rt2T;88K',
    database: process.env.DB_DATABASE || 'u845362736_sistemasmc',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
};

console.log('🔧 Configuração do banco:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port
});

const pool = mysql.createPool(dbConfig);

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexão backup estabelecida!');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão backup:', error.message);
        return false;
    }
};

const query = async (sql, params = []) => {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('❌ Erro na query backup:', error.message);
        throw error;
    }
};

const initializeDatabase = async () => {
    try {
        const [tables] = await pool.execute("SHOW TABLES LIKE 'usuarios'");
        return tables.length > 0;
    } catch (error) {
        console.error('❌ Erro ao verificar banco backup:', error.message);
        return false;
    }
};

module.exports = {
    pool,
    query,
    testConnection,
    initializeDatabase
}; 