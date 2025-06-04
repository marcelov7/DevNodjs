const express = require('express');
const fs = require('fs');
const path = require('path');

console.log('🔍 Debug Render - Verificando ambiente...');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);

const app = express();

// Middleware básico
app.use(express.json());

// Rota de debug principal
app.get('/', (req, res) => {
    try {
        const rootFiles = fs.readdirSync(__dirname);
        const configExists = fs.existsSync(path.join(__dirname, 'config'));
        const databaseExists = fs.existsSync(path.join(__dirname, 'config', 'database.js'));
        
        let configFiles = [];
        if (configExists) {
            configFiles = fs.readdirSync(path.join(__dirname, 'config'));
        }

        res.json({
            status: 'debug-ok',
            platform: process.platform,
            nodeVersion: process.version,
            workingDirectory: process.cwd(),
            __dirname: __dirname,
            rootFiles: rootFiles,
            configDirectoryExists: configExists,
            databaseFileExists: databaseExists,
            configFiles: configFiles,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Rota para testar importação do database
app.get('/test-import', (req, res) => {
    try {
        console.log('Tentando importar database...');
        const db = require('./config/database');
        res.json({
            status: 'import-success',
            message: 'Database module importado com sucesso',
            exports: Object.keys(db)
        });
    } catch (error) {
        console.error('Erro ao importar database:', error);
        res.status(500).json({
            status: 'import-error',
            message: error.message,
            stack: error.stack,
            code: error.code
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Debug server rodando na porta ${PORT}`);
    console.log(`🔗 Debug info: http://localhost:${PORT}`);
    console.log(`🔗 Test import: http://localhost:${PORT}/test-import`);
});

// Log de erros
process.on('uncaughtException', (error) => {
    console.error('❌ Exceção não capturada:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
}); 