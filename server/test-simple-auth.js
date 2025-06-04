const axios = require('axios');

async function testeSimples() {
    console.log('🧪 Teste simples de autenticação...\n');
    
    try {
        // 1. Fazer login
        console.log('🔑 Fazendo login...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            identifier: 'marcelo',
            senha: '123456'
        });
        
        console.log('📱 Resposta do login:');
        console.log(JSON.stringify(loginResponse.data, null, 2));
        
        const token = loginResponse.data.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        
        // 2. Verificar token
        console.log('\n🔐 Verificando token...');
        const verifyResponse = await axios.post('http://localhost:5000/api/auth/verify', {}, { headers });
        
        console.log('📋 Dados do usuário:');
        console.log(JSON.stringify(verifyResponse.data, null, 2));
        
        // 3. Tentar acessar notificações
        console.log('\n📬 Testando acesso às notificações...');
        const notificacoesResponse = await axios.get('http://localhost:5000/api/notificacoes', { headers });
        
        console.log('✅ Acesso às notificações funcionando!');
        console.log(`Total notificações: ${notificacoesResponse.data.data?.notificacoes?.length || 0}`);
        
    } catch (error) {
        console.error('❌ Erro:', error.response?.data || error.message);
        if (error.response?.data) {
            console.log('📋 Headers da resposta:', error.response.headers);
        }
    }
}

testeSimples(); 