const mysql = require('mysql2/promise');

async function criarTabelaVisualizacoes() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gestao_equipamentos'
    });

    try {
        console.log('🔄 Criando tabela de visualizações...');

        // Criar tabela de visualizações
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS relatorio_visualizacoes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                relatorio_id INT NOT NULL,
                usuario_id INT NOT NULL,
                data_visualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                UNIQUE KEY unique_relatorio_usuario (relatorio_id, usuario_id)
            )
        `);

        console.log('✅ Tabela relatorio_visualizacoes criada com sucesso');

        // Criar índices
        await connection.execute(`
            CREATE INDEX IF NOT EXISTS idx_relatorio_visualizacoes_relatorio 
            ON relatorio_visualizacoes(relatorio_id)
        `);

        await connection.execute(`
            CREATE INDEX IF NOT EXISTS idx_relatorio_visualizacoes_usuario 
            ON relatorio_visualizacoes(usuario_id)
        `);

        await connection.execute(`
            CREATE INDEX IF NOT EXISTS idx_relatorio_visualizacoes_data 
            ON relatorio_visualizacoes(data_visualizacao)
        `);

        console.log('✅ Índices criados com sucesso');

        // Verificar estrutura
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME, TABLE_COMMENT 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'gestao_equipamentos' 
            AND TABLE_NAME = 'relatorio_visualizacoes'
        `);

        console.log('📋 Tabela criada:', tables);

    } catch (error) {
        console.error('❌ Erro ao criar tabela:', error.message);
    } finally {
        await connection.end();
    }
}

criarTabelaVisualizacoes(); 