const axios = require('axios');

const BASE_URL = 'https://server-poy8.onrender.com/api';

async function testRoutes() {
    console.log('🔧 Testando rotas da API...\n');

    try {
        // 1. Login first
        console.log('1️⃣ Fazendo login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            identifier: 'admin',
            senha: 'password'
        });
        
        if (!loginResponse.data.success) {
            console.log('❌ Login falhou');
            return;
        }

        const token = loginResponse.data.data.token;
        console.log('✅ Login sucesso');

        // Headers para as próximas requisições
        const headers = { Authorization: `Bearer ${token}` };

        // 2. Teste Dashboard (que funciona)
        console.log('\n2️⃣ Testando Dashboard...');
        try {
            const dashResponse = await axios.get(`${BASE_URL}/dashboard/estatisticas`, { headers });
            console.log('✅ Dashboard funciona:', dashResponse.data.success);
        } catch (error) {
            console.log('❌ Dashboard erro:', error.response?.status, error.response?.data?.message);
        }

        // 3. Teste Usuários (que não funciona)
        console.log('\n3️⃣ Testando Usuários...');
        try {
            const usersResponse = await axios.get(`${BASE_URL}/usuarios`, { headers });
            console.log('✅ Usuários funciona:', usersResponse.data.success);
            console.log('📊 Total usuários:', usersResponse.data.data?.usuarios?.length || 0);
        } catch (error) {
            console.log('❌ Usuários erro:', error.response?.status, error.response?.data?.message);
        }

        // 4. Teste Setores
        console.log('\n4️⃣ Testando Setores...');
        try {
            const setoresResponse = await axios.get(`${BASE_URL}/setores`, { headers });
            console.log('✅ Setores funciona:', setoresResponse.data.success);
        } catch (error) {
            console.log('❌ Setores erro:', error.response?.status, error.response?.data?.message);
        }

        // 5. Teste Equipamentos
        console.log('\n5️⃣ Testando Equipamentos...');
        try {
            const equipResponse = await axios.get(`${BASE_URL}/equipamentos`, { headers });
            console.log('✅ Equipamentos funciona:', equipResponse.data.success);
        } catch (error) {
            console.log('❌ Equipamentos erro:', error.response?.status, error.response?.data?.message);
        }

        // 6. Teste Relatórios
        console.log('\n6️⃣ Testando Relatórios...');
        try {
            const relatoriosResponse = await axios.get(`${BASE_URL}/relatorios`, { headers });
            console.log('✅ Relatórios funciona:', relatoriosResponse.data.success);
        } catch (error) {
            console.log('❌ Relatórios erro:', error.response?.status, error.response?.data?.message);
        }

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    }
}

testRoutes(); 