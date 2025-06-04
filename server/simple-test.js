console.log('🔍 Teste simples de inicialização...');

try {
    console.log('1. Testando módulos básicos...');
    const express = require('express');
    console.log('✅ Express OK');

    const mysql = require('mysql2/promise');
    console.log('✅ MySQL2 OK');

    console.log('2. Testando diretório atual...');
    console.log('__dirname:', __dirname);
    console.log('process.cwd():', process.cwd());

    console.log('3. Testando path para config...');
    const path = require('path');
    const configPath = path.join(__dirname, 'config', 'database.js');
    console.log('Config path:', configPath);
    
    const fs = require('fs');
    if (fs.existsSync(configPath)) {
        console.log('✅ Arquivo database.js existe');
    } else {
        console.log('❌ Arquivo database.js NÃO existe');
    }

    console.log('4. Testando require...');
    const db = require('./config/database');
    console.log('✅ Database module carregado com sucesso');

    console.log('✅ Todos os testes passaram!');
} catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
} 