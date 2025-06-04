const { createSaasSchema } = require('./create-saas-schema');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function migrateToSaas() {
    console.log('🏢 MIGRAÇÃO PARA SAAS - SISTEMA DE GESTÃO DE EQUIPAMENTOS');
    console.log('================================================================');
    console.log('');
    console.log('⚠️  IMPORTANTE: Faça backup do banco de dados antes de continuar!');
    console.log('');
    console.log('Esta migração irá:');
    console.log('✅ Criar tabela de organizações (empresas)');
    console.log('✅ Adicionar tenant_id em todas as tabelas');
    console.log('✅ Implementar isolamento completo de dados');
    console.log('✅ Criar sistema de convites de usuários');
    console.log('✅ Implementar auditoria de ações');
    console.log('✅ Configurar planos e limites');
    console.log('');

    const continuar = await question('Deseja continuar com a migração? (sim/não): ');
    
    if (continuar.toLowerCase() !== 'sim') {
        console.log('❌ Migração cancelada pelo usuário');
        process.exit(0);
    }

    try {
        console.log('');
        console.log('🔄 Iniciando migração...');
        
        await createSaasSchema();
        
        console.log('');
        console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('');
        console.log('📋 Próximos passos:');
        console.log('1. ✅ Estrutura SaaS implementada');
        console.log('2. ✅ Organização padrão criada (ID: 1)');
        console.log('3. ✅ Todos os dados existentes preservados');
        console.log('4. ✅ Sistema de multi-tenancy ativo');
        console.log('');
        console.log('🔧 Para criar novas organizações:');
        console.log('   POST /api/organizacoes (apenas admin_master)');
        console.log('');
        console.log('👥 Para convidar usuários:');
        console.log('   POST /api/organizacoes/invite-user');
        console.log('');
        console.log('📊 Para ver estatísticas:');
        console.log('   GET /api/organizacoes/current');
        console.log('   GET /api/organizacoes/:id/stats');
        console.log('');
        console.log('🛡️ Recursos de Segurança:');
        console.log('   • Isolamento completo por tenant');
        console.log('   • Auditoria de todas as ações');
        console.log('   • Limites baseados em planos');
        console.log('   • Verificação de recursos habilitados');
        console.log('');
        console.log('🚀 Sistema pronto para múltiplas organizações!');

    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    migrateToSaas();
}

module.exports = { migrateToSaas }; 