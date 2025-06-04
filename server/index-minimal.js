const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🚀 Iniciando servidor minimal...');
console.log(`Node.js version: ${process.version}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.version,
        env: process.env.NODE_ENV
    });
});

// Rota de teste de banco
app.get('/api/test-db', async (req, res) => {
    try {
        const { testConnection } = require('./config/database');
        const isConnected = await testConnection();
        
        res.json({
            status: isConnected ? 'connected' : 'disconnected',
            message: isConnected ? 'Banco conectado com sucesso' : 'Falha na conexão com banco'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Listar arquivos disponíveis
app.get('/api/debug/files', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const files = {
            root: fs.readdirSync(__dirname),
            config: fs.existsSync(path.join(__dirname, 'config')) ? fs.readdirSync(path.join(__dirname, 'config')) : [],
            routes: fs.existsSync(path.join(__dirname, 'routes')) ? fs.readdirSync(path.join(__dirname, 'routes')) : [],
            middleware: fs.existsSync(path.join(__dirname, 'middleware')) ? fs.readdirSync(path.join(__dirname, 'middleware')) : [],
            services: fs.existsSync(path.join(__dirname, 'services')) ? fs.readdirSync(path.join(__dirname, 'services')) : []
        };
        
        res.json({ files, __dirname, 'process.cwd()': process.cwd() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
    });
});

// Tratamento de erros
app.use((error, req, res, next) => {
    console.error('❌ Erro:', error);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Servidor minimal rodando na porta ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Test DB: http://localhost:${PORT}/api/test-db`);
    console.log(`🔗 Debug files: http://localhost:${PORT}/api/debug/files`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Exceção não capturada:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada:', reason);
    process.exit(1);
}); 