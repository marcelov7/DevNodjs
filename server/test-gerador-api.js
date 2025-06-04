const mysql = require('mysql2/promise');
const express = require('express');

async function testAPI() {
    try {
        console.log('🔍 Testando API de Inspeções do Gerador...');
        
        // Testar conexão com banco
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root', 
            password: '',
            database: 'sistema_relatorios'
        });
        
        console.log('✅ Conexão com banco estabelecida');
        
        // Testar se a tabela existe
        const [tables] = await connection.execute("SHOW TABLES LIKE 'gerador_inspecoes'");
        if (tables.length === 0) {
            console.log('❌ Tabela gerador_inspecoes não encontrada!');
            return;
        }
        console.log('✅ Tabela gerador_inspecoes encontrada');
        
        // Testar query básica
        try {
            const [results] = await connection.execute(`
                SELECT 
                    gi.*,
                    u.nome as usuario_nome
                FROM gerador_inspecoes gi
                LEFT JOIN usuarios u ON gi.user_id = u.id
                WHERE gi.tenant_id = ?
                ORDER BY gi.data DESC, gi.criado_em DESC
                LIMIT 10 OFFSET 0
            `, [1]);
            
            console.log('✅ Query principal executada com sucesso');
            console.log(`📊 Encontrados ${results.length} registros`);
            
            // Testar query de contagem
            const [countResult] = await connection.execute(`
                SELECT COUNT(*) as total
                FROM gerador_inspecoes gi
                WHERE gi.tenant_id = ?
            `, [1]);
            
            console.log('✅ Query de contagem executada com sucesso');
            console.log(`📈 Total de registros: ${countResult[0].total}`);
            
        } catch (queryError) {
            console.error('❌ Erro na query:', queryError.message);
            console.error('Stack:', queryError.stack);
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
        console.error('Stack:', error.stack);
    }
}

testAPI(); 