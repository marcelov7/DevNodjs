const mysql = require('mysql2/promise');

async function createNotificationSchema() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sistema_relatorios'
    });

    try {
        console.log('🔧 Criando schema de notificações...');
        
        // Criar tabela de notificações
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notificacoes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario_id INT NOT NULL,
                relatorio_id INT DEFAULT NULL,
                tipo ENUM('nova_atribuicao', 'atualizacao_historico', 'status_alterado', 'comentario', 'vencimento') NOT NULL,
                titulo VARCHAR(200) NOT NULL,
                mensagem TEXT NOT NULL,
                dados_extras JSON DEFAULT NULL,
                lida BOOLEAN DEFAULT FALSE,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_leitura TIMESTAMP NULL DEFAULT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE
            )
        `);
        
        // Criar índices
        await connection.execute('CREATE INDEX IF NOT EXISTS idx_usuario_lida ON notificacoes (usuario_id, lida)');
        await connection.execute('CREATE INDEX IF NOT EXISTS idx_data_criacao ON notificacoes (data_criacao)');
        
        // Criar tabela de preferências
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS notificacao_preferencias (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario_id INT NOT NULL,
                tipo_notificacao ENUM('nova_atribuicao', 'atualizacao_historico', 'status_alterado', 'comentario', 'vencimento') NOT NULL,
                ativo BOOLEAN DEFAULT TRUE,
                notificar_email BOOLEAN DEFAULT TRUE,
                notificar_push BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_tipo (usuario_id, tipo_notificacao)
            )
        `);
        
        // Inserir preferências padrão
        const usuarios = await connection.execute('SELECT id FROM usuarios WHERE ativo = true');
        const tipos = ['nova_atribuicao', 'atualizacao_historico', 'status_alterado', 'comentario', 'vencimento'];
        
        for (const usuario of usuarios[0]) {
            for (const tipo of tipos) {
                await connection.execute(`
                    INSERT IGNORE INTO notificacao_preferencias (usuario_id, tipo_notificacao) 
                    VALUES (?, ?)
                `, [usuario.id, tipo]);
            }
        }
        
        console.log('✅ Schema de notificações criado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao criar schema:', error.message);
    } finally {
        await connection.end();
    }
}

createNotificationSchema(); 