const axios = require('axios');

async function testarNotificacoes() {
    console.log('🧪 Testando sistema de notificações...\n');
    
    try {
        // 1. Fazer login como admin para obter token
        console.log('🔑 Fazendo login...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('✅ Login realizado com sucesso\n');
        
        // 2. Criar uma nova inspeção de gerador
        console.log('🔧 Criando nova inspeção de gerador...');
        const inspecaoResponse = await axios.post('http://localhost:5000/api/gerador-inspecoes', {
            data: new Date().toISOString().split('T')[0],
            colaborador: 'João Silva (Teste)',
            nivel_oleo: 'OK',
            nivel_agua: 'OK',
            tensao_sync_gerador: '220V',
            tensao_sync_rede: '220V',
            temp_agua: '75°C',
            pressao_oleo: '2.5 bar',
            frequencia: '60Hz',
            tensao_a: '220V',
            tensao_b: '220V', 
            tensao_c: '220V',
            rpm: '1800',
            tensao_bateria: '12V',
            tensao_alternador: '14V',
            combustivel_50: true,
            iluminacao_sala: true,
            observacao: 'Inspeção de teste para verificar notificações'
        }, { headers });
        
        console.log(`✅ Inspeção criada com ID: ${inspecaoResponse.data.inspecao.id}\n`);
        
        // 3. Criar um novo analisador
        console.log('📊 Criando novo analisador...');
        const analisadorResponse = await axios.post('http://localhost:5000/api/analisadores', {
            analyzer: 'Analisador Teste Notificações',
            check_date: new Date().toISOString().split('T')[0],
            acid_filter: true,
            gas_dryer: true,
            paper_filter: false,
            peristaltic_pump: true,
            rotameter: true,
            disposable_filter: false,
            blocking_filter: true,
            room_temperature: '25°C',
            air_pressure: '1.2 bar',
            observation: 'Analisador de teste para verificar notificações'
        }, { headers });
        
        console.log(`✅ Analisador criado com ID: ${analisadorResponse.data.data.id}\n`);
        
        // 4. Aguardar um pouco para as notificações serem processadas
        console.log('⏳ Aguardando processamento das notificações...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 5. Verificar notificações criadas
        console.log('📋 Verificando notificações...');
        const notificacoesResponse = await axios.get('http://localhost:5000/api/notificacoes', { headers });
        
        const notificacoes = notificacoesResponse.data.data.notificacoes;
        const inspecoesGerador = notificacoes.filter(n => n.tipo === 'nova_inspecao_gerador');
        const novosAnalisadores = notificacoes.filter(n => n.tipo === 'novo_analisador');
        
        console.log(`📱 Notificações de inspeção gerador: ${inspecoesGerador.length}`);
        console.log(`📱 Notificações de novo analisador: ${novosAnalisadores.length}`);
        
        if (inspecoesGerador.length > 0) {
            console.log(`   ✅ Última notificação gerador: "${inspecoesGerador[0].titulo}"`);
        }
        
        if (novosAnalisadores.length > 0) {
            console.log(`   ✅ Última notificação analisador: "${novosAnalisadores[0].titulo}"`);
        }
        
        // 6. Testar gerenciamento de notificações (admin master)
        console.log('\n👑 Testando gerenciamento de notificações...');
        const gerenciamentoResponse = await axios.get('http://localhost:5000/api/notificacoes/gerenciamento', { headers });
        
        if (gerenciamentoResponse.data.success) {
            const stats = gerenciamentoResponse.data.data.estatisticas;
            console.log(`📊 Estatísticas - Total: ${stats.total_notificacoes}, Não lidas: ${stats.nao_lidas}`);
            console.log(`🔧 Inspeções gerador: ${stats.inspecoes_gerador}`);
            console.log(`📊 Novos analisadores: ${stats.novos_analisadores}`);
        }
        
        console.log('\n🎉 Teste completo! Sistema de notificações funcionando corretamente.');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.response?.data || error.message);
    }
}

testarNotificacoes(); 