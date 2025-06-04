const mysql = require('mysql2/promise');

async function testNotifications() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sistema_relatorios'
    });

    try {
        console.log('🧪 Criando dados de teste para notificações...');
        
        // Inserir algumas notificações de teste
        const testNotifications = [
            {
                usuario_id: 1,
                relatorio_id: 1,
                tipo: 'nova_atribuicao',
                titulo: 'Você foi atribuído ao relatório: Vazamento no compressor',
                mensagem: 'Admin atribuiu você para trabalhar neste relatório. Clique para ver detalhes.',
                dados_extras: JSON.stringify({
                    atribuido_por: 'Admin',
                    total_atribuidos: 2
                })
            },
            {
                usuario_id: 1,
                relatorio_id: 2,
                tipo: 'atualizacao_historico',
                titulo: 'Atualização no relatório: Problema na esteira',
                mensagem: 'Admin atualizou o progresso para 75%: Lubrificação dos rolamentos realizada',
                dados_extras: JSON.stringify({
                    progresso_anterior: 30,
                    progresso_novo: 75,
                    status_anterior: 'em_andamento',
                    status_novo: 'em_andamento',
                    tem_anexos: false
                })
            },
            {
                usuario_id: 1,
                relatorio_id: 3,
                tipo: 'status_alterado',
                titulo: 'Status alterado: Sistema de refrigeração',
                mensagem: 'Status alterado de "em_andamento" para "resolvido" por Admin',
                dados_extras: JSON.stringify({
                    status_anterior: 'em_andamento',
                    status_novo: 'resolvido'
                })
            }
        ];

        for (const notif of testNotifications) {
            await connection.execute(`
                INSERT INTO notificacoes 
                (usuario_id, relatorio_id, tipo, titulo, mensagem, dados_extras) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                notif.usuario_id,
                notif.relatorio_id,
                notif.tipo,
                notif.titulo,
                notif.mensagem,
                notif.dados_extras
            ]);
        }
        
        // Verificar quantas notificações foram criadas
        const [result] = await connection.execute('SELECT COUNT(*) as total FROM notificacoes');
        console.log(`✅ ${testNotifications.length} notificações de teste criadas!`);
        console.log(`📊 Total de notificações no banco: ${result[0].total}`);
        
    } catch (error) {
        console.error('❌ Erro ao criar dados de teste:', error.message);
    } finally {
        await connection.end();
    }
}

testNotifications(); 