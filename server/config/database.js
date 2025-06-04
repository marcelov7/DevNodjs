const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('🔄 Configurando conexão com MySQL...');
console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`Database: ${process.env.DB_DATABASE || 'sistema_relatorios'}`);
console.log(`User: ${process.env.DB_USER || 'root'}`);

// Configuração do pool de conexões
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'sistema_relatorios',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'local'
});

// Função para testar a conexão
const testConnection = async () => {
    try {
        console.log('🔄 Testando conexão com MySQL...');
        const connection = await pool.getConnection();
        console.log('✅ Conexão com MySQL estabelecida com sucesso!');
        
        // Testar uma query simples
        await connection.execute('SELECT 1 as test');
        console.log('✅ Query de teste executada com sucesso!');
        
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar com MySQL:', error.message);
        console.error('Detalhes do erro:', {
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            hostname: error.hostname
        });
        return false;
    }
};

// Função para executar queries
const query = async (sql, params = []) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [results] = await connection.execute(sql, params);
        return results;
    } catch (error) {
        console.error('❌ Erro na query:', error.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Função para inicializar o banco (criar tabelas se não existirem)
const initializeDatabase = async () => {
    try {
        console.log('🔄 Verificando estrutura do banco de dados...');
        
        // Verificar se a tabela de usuários existe
        const [tables] = await pool.execute("SHOW TABLES LIKE 'usuarios'");
        
        if (tables.length === 0) {
            console.log('⚠️  Tabelas não encontradas. Execute o arquivo database.sql para criar a estrutura.');
            return false;
        }
        
        console.log('✅ Estrutura do banco de dados verificada!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao verificar banco de dados:', error.message);
        return false;
    }
};

// Fechar pool quando o processo terminar
process.on('SIGINT', async () => {
    console.log('🔄 Fechando pool de conexões MySQL...');
    await pool.end();
    console.log('✅ Pool de conexões fechado!');
});

module.exports = {
    pool,
    query,
    testConnection,
    initializeDatabase
}; 