const axios = require('axios');

async function testAPI() {
    try {
        console.log('🔍 Testando API de Inspeções do Gerador...');
        
        // Primeiro vou fazer login para obter um token válido
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@empresa.com',
            senha: '123456'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login realizado com sucesso');
        
        // Agora testar a API de inspeções
        const response = await axios.get('http://localhost:5000/api/gerador-inspecoes?page=1&limit=10', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ API funcionando corretamente!');
        console.log('📊 Dados retornados:', response.data);
        
    } catch (error) {
        console.error('❌ Erro na API:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
    }
}

// Aguardar um pouco para o servidor iniciar
setTimeout(testAPI, 3000); 