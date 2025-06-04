const axios = require('axios');

const BASE_URL = 'https://server-poy8.onrender.com/api';

async function testAPIs() {
    console.log('🔧 Testando APIs...\n');

    try {
        // 1. Teste de login
        console.log('1️⃣ Testando login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            identifier: 'admin',
            senha: 'password'
        });
        
        if (loginResponse.data.success) {
            console.log('✅ Login funcionando');
            console.log('👤 Usuário:', loginResponse.data.data.usuario.nome);
            const token = loginResponse.data.data.token;
            
            // 2. Teste de verificação de token
            console.log('\n2️⃣ Testando verificação de token...');
            const verifyResponse = await axios.post(`${BASE_URL}/auth/verify`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (verifyResponse.data.success) {
                console.log('✅ Verificação de token funcionando');
                console.log('👤 Dados do usuário no verify:', verifyResponse.data.data.usuario);
            } else {
                console.log('❌ Verificação de token falhou:', verifyResponse.data);
            }
            
            // 3. Teste de estatísticas
            console.log('\n3️⃣ Testando estatísticas...');
            const statsResponse = await axios.get(`${BASE_URL}/dashboard/estatisticas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (statsResponse.data.success) {
                console.log('✅ Estatísticas funcionando');
                console.log('📊 Totais:', statsResponse.data.data.totais);
            } else {
                console.log('❌ Estatísticas falharam:', statsResponse.data);
            }
            
            // 4. Teste de relatórios recentes
            console.log('\n4️⃣ Testando relatórios recentes...');
            const reportsResponse = await axios.get(`${BASE_URL}/dashboard/relatorios-recentes?limit=5`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (reportsResponse.data.success) {
                console.log('✅ Relatórios recentes funcionando');
                console.log('📋 Quantidade de relatórios:', reportsResponse.data.data.relatorios.length);
            } else {
                console.log('❌ Relatórios recentes falharam:', reportsResponse.data);
            }
            
        } else {
            console.log('❌ Login falhou:', loginResponse.data);
        }
        
    } catch (error) {
        console.error('❌ Erro geral:', error.response?.data || error.message);
    }
}

testAPIs(); 