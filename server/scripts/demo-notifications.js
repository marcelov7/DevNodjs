const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Simular uma demonstração do sistema de notificações
async function demoNotifications() {
    console.log('🎬 Iniciando demonstração do sistema de notificações...\n');

    // Gerar token JWT de teste (normalmente seria do login)
    const testToken = jwt.sign(
        { id: 1, nome: 'Usuário Demo' },
        process.env.JWT_SECRET || 'seu_jwt_secret_aqui',
        { expiresIn: '1h' }
    );

    // Conectar ao servidor WebSocket
    const socket = io('http://localhost:5000', {
        auth: { token: testToken }
    });

    socket.on('connect', () => {
        console.log('✅ Conectado ao servidor de notificações!');
        console.log(`🔌 Socket ID: ${socket.id}\n`);

        // Solicitar notificações existentes
        console.log('📋 Carregando notificações existentes...');
        socket.emit('buscar_notificacoes', { limit: 10 });
    });

    socket.on('contagem_nao_lidas', (data) => {
        console.log(`📊 Total de notificações não lidas: ${data.total}\n`);
    });

    socket.on('notificacoes_carregadas', (data) => {
        console.log(`📥 ${data.notificacoes.length} notificações carregadas:`);
        data.notificacoes.forEach((notif, index) => {
            const status = notif.lida ? '✅' : '🔔';
            const tempo = new Date(notif.data_criacao).toLocaleString('pt-BR');
            console.log(`   ${status} [${notif.tipo}] ${notif.titulo}`);
            console.log(`      📅 ${tempo}`);
            if (index < data.notificacoes.length - 1) console.log('');
        });
        console.log(`\n📊 Total não lidas: ${data.total_nao_lidas}\n`);

        // Demonstrar marcação como lida
        if (data.notificacoes.length > 0 && !data.notificacoes[0].lida) {
            console.log('🖱️  Marcando primeira notificação como lida...');
            socket.emit('marcar_lida', { notificacaoId: data.notificacoes[0].id });
        }
    });

    socket.on('nova_notificacao', (notificacao) => {
        console.log('🔔 NOVA NOTIFICAÇÃO RECEBIDA EM TEMPO REAL!');
        console.log(`   📋 ${notificacao.titulo}`);
        console.log(`   💬 ${notificacao.mensagem}`);
        console.log(`   🏷️  Tipo: ${notificacao.tipo}`);
        if (notificacao.relatorio_titulo) {
            console.log(`   📁 Relatório: ${notificacao.relatorio_titulo}`);
        }
        console.log('');
    });

    socket.on('notificacao_lida', (data) => {
        console.log(`✅ Notificação ${data.id} marcada como lida!\n`);
    });

    socket.on('todas_notificacoes_lidas', () => {
        console.log('✅ Todas as notificações foram marcadas como lidas!\n');
    });

    socket.on('disconnect', () => {
        console.log('🔌 Desconectado do servidor');
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Erro de conexão:', error.message);
    });

    // Demonstração de funcionalidades após 3 segundos
    setTimeout(() => {
        console.log('🎯 Testando funcionalidade "marcar todas como lidas"...');
        socket.emit('marcar_todas_lidas');
    }, 3000);

    // Encerrar demonstração após 10 segundos
    setTimeout(() => {
        console.log('🎬 Demonstração concluída!');
        console.log('📝 Para ver o sistema completo:');
        console.log('   1. Acesse http://localhost:3000');
        console.log('   2. Faça login com admin/password');
        console.log('   3. Observe o ícone de notificações no header');
        console.log('   4. Clique para ver o painel de notificações\n');
        
        socket.disconnect();
        process.exit(0);
    }, 10000);
}

// Executar demonstração
demoNotifications().catch(console.error); 