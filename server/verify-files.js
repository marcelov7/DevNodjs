const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando estrutura de arquivos...');

const filesToCheck = [
    './config/database.js',
    './services/notificationService.js',
    './utils/networkUtils.js',
    './middleware/permissions.js',
    './routes/auth.js',
    './routes/usuarios.js',
    './routes/organizacoes.js',
    './routes/setores.js',
    './routes/locais.js',
    './routes/equipamentos.js',
    './routes/motores.js',
    './routes/relatorios.js',
    './routes/analisadores.js',
    './routes/gerador-inspecoes.js',
    './routes/dashboard.js',
    './routes/configuracoes.js',
    './routes/notificacoes.js'
];

filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - FALTANDO`);
    }
});

console.log('\n🔍 Testando importações...');

try {
    const { testConnection, initializeDatabase } = require('./config/database');
    console.log('✅ config/database importado com sucesso');
} catch (error) {
    console.log('❌ Erro ao importar config/database:', error.message);
}

try {
    const NotificationService = require('./services/notificationService');
    console.log('✅ notificationService importado com sucesso');
} catch (error) {
    console.log('❌ Erro ao importar notificationService:', error.message);
}

try {
    const { getAllowedOrigins } = require('./utils/networkUtils');
    console.log('✅ networkUtils importado com sucesso');
} catch (error) {
    console.log('❌ Erro ao importar networkUtils:', error.message);
}

try {
    const { refreshPermissionsCache } = require('./middleware/permissions');
    console.log('✅ permissions middleware importado com sucesso');
} catch (error) {
    console.log('❌ Erro ao importar permissions:', error.message);
}

console.log('\n✅ Verificação concluída!'); 