const mysql = require('mysql2/promise');

async function updateNotificationsSchema() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sistema_relatorios'
    });

    try {
        console.log('🔄 Atualizando schema de notificações...');

        // 1. Verificar se as colunas enum precisam ser atualizadas
        const [columns] = await connection.execute(`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'sistema_relatorios' 
            AND TABLE_NAME = 'notificacoes' 
            AND COLUMN_NAME = 'tipo'
        `);

        if (columns.length > 0) {
            const currentType = columns[0].COLUMN_TYPE;
            console.log('📋 Tipo atual da coluna:', currentType);

            // Verificar se 'novo_relatorio' já está incluído
            if (!currentType.includes('novo_relatorio')) {
                console.log('➕ Adicionando tipo "novo_relatorio"...');
                
                await connection.execute(`
                    ALTER TABLE notificacoes 
                    MODIFY COLUMN tipo ENUM(
                        'nova_atribuicao', 
                        'atualizacao_historico', 
                        'status_alterado', 
                        'comentario', 
                        'vencimento',
                        'novo_relatorio',
                        'nova_inspecao_gerador',
                        'novo_analisador'
                    ) NOT NULL
                `);

                console.log('✅ Tipo "novo_relatorio" adicionado à tabela notificacoes');
            } else {
                console.log('ℹ️ Tipo "novo_relatorio" já existe');
            }
        }

        // 2. Atualizar tabela de preferências também
        const [prefColumns] = await connection.execute(`
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'sistema_relatorios' 
            AND TABLE_NAME = 'notificacao_preferencias' 
            AND COLUMN_NAME = 'tipo_notificacao'
        `);

        if (prefColumns.length > 0) {
            const currentPrefType = prefColumns[0].COLUMN_TYPE;
            
            if (!currentPrefType.includes('novo_relatorio')) {
                console.log('➕ Adicionando tipo "novo_relatorio" às preferências...');
                
                await connection.execute(`
                    ALTER TABLE notificacao_preferencias 
                    MODIFY COLUMN tipo_notificacao ENUM(
                        'nova_atribuicao', 
                        'atualizacao_historico', 
                        'status_alterado', 
                        'comentario', 
                        'vencimento',
                        'novo_relatorio',
                        'nova_inspecao_gerador',
                        'novo_analisador'
                    ) NOT NULL
                `);

                console.log('✅ Tipo "novo_relatorio" adicionado às preferências');
            } else {
                console.log('ℹ️ Tipo "novo_relatorio" já existe nas preferências');
            }
        }

        // 3. Inserir preferências padrão para o novo tipo
        console.log('📝 Inserindo preferências padrão para novo_relatorio...');
        
        await connection.execute(`
            INSERT IGNORE INTO notificacao_preferencias (usuario_id, tipo_notificacao, ativo, notificar_email, notificar_push)
            SELECT 
                id,
                'novo_relatorio',
                true,
                true,
                true
            FROM usuarios 
            WHERE ativo = true
        `);

        console.log('✅ Preferências padrão inseridas');

        // 4. Inserir preferências padrão para nova_inspecao_gerador
        console.log('📝 Inserindo preferências padrão para nova_inspecao_gerador...');
        
        await connection.execute(`
            INSERT IGNORE INTO notificacao_preferencias (usuario_id, tipo_notificacao, ativo, notificar_email, notificar_push)
            SELECT 
                id,
                'nova_inspecao_gerador',
                true,
                true,
                true
            FROM usuarios 
            WHERE ativo = true AND nivel_acesso IN ('admin_master', 'admin')
        `);

        console.log('✅ Preferências para inspeções de gerador inseridas');

        // 5. Inserir preferências padrão para novo_analisador
        console.log('📝 Inserindo preferências padrão para novo_analisador...');
        
        await connection.execute(`
            INSERT IGNORE INTO notificacao_preferencias (usuario_id, tipo_notificacao, ativo, notificar_email, notificar_push)
            SELECT 
                id,
                'novo_analisador',
                true,
                true,
                true
            FROM usuarios 
            WHERE ativo = true AND nivel_acesso IN ('admin_master', 'admin')
        `);

        console.log('✅ Preferências para analisadores inseridas');

        // 6. Criar algumas notificações de teste (opcional)
        console.log('🧪 Verificando se há relatórios para criar notificações de teste...');
        
        const [relatorios] = await connection.execute(`
            SELECT COUNT(*) as total FROM relatorios 
            WHERE data_criacao >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        console.log(`📊 ${relatorios[0].total} relatórios criados nos últimos 7 dias`);

        console.log('');
        console.log('🎉 Schema de notificações atualizado com sucesso!');
        console.log('');
        console.log('📋 Novos recursos:');
        console.log('   🔔 Notificações de novos relatórios');
        console.log('   👥 Notificação automática para admins');
        console.log('   🚨 Notificação para todos em prioridade alta/crítica');
        console.log('   ⚙️ Preferências configuráveis por usuário');
        console.log('   🎯 Isolamento por organização (tenant)');

    } catch (error) {
        console.error('❌ Erro ao atualizar schema:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    updateNotificationsSchema()
        .then(() => {
            console.log('🎉 Atualização concluída!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Falha na atualização:', error);
            process.exit(1);
        });
}

module.exports = { updateNotificationsSchema }; 