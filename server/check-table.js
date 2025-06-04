const mysql = require('mysql2/promise');

async function checkTable() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'sistema_relatorios'
        });

        console.log('Conectado ao MySQL!');
        
        // Verificar se a tabela existe
        const [tables] = await connection.execute("SHOW TABLES LIKE 'gerador_inspecoes'");
        
        if (tables.length > 0) {
            console.log('✅ Tabela gerador_inspecoes existe!');
            
            // Mostrar estrutura da tabela
            const [columns] = await connection.execute('DESCRIBE gerador_inspecoes');
            console.log('📋 Estrutura da tabela:');
            columns.forEach(col => {
                console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
            });
            
            // Contar registros
            const [count] = await connection.execute('SELECT COUNT(*) as total FROM gerador_inspecoes');
            console.log(`📊 Total de registros: ${count[0].total}`);
            
        } else {
            console.log('❌ Tabela gerador_inspecoes não existe!');
            console.log('Executando script para criar...');
            
            // Ler e executar o script SQL
            const fs = require('fs');
            const sql = fs.readFileSync('./scripts/create-gerador-inspecoes-table.sql', 'utf8');
            
            // Dividir o SQL em statements
            const statements = sql.split(';').filter(stmt => stmt.trim());
            
            for (const statement of statements) {
                if (statement.trim()) {
                    await connection.execute(statement);
                }
            }
            
            console.log('✅ Tabela criada com sucesso!');
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

checkTable(); 