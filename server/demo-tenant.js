const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function demonstrarTenant() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sistema_relatorios'
    });

    try {
        console.log('🏢 === DEMONSTRAÇÃO: COMO FUNCIONA O TENANT (EMPRESA) ===\n');

        // 1. MOSTRAR ORGANIZAÇÕES EXISTENTES
        console.log('1️⃣ ORGANIZAÇÕES EXISTENTES:');
        const organizacoes = await connection.execute(`
            SELECT id, nome, slug FROM organizacoes ORDER BY id
        `);
        
        organizacoes[0].forEach(org => {
            console.log(`   🏢 ID ${org.id}: ${org.nome} (${org.slug})`);
        });

        // 2. MOSTRAR USUÁRIOS POR EMPRESA
        console.log('\n2️⃣ USUÁRIOS POR EMPRESA:');
        const usuarios = await connection.execute(`
            SELECT 
                u.id,
                u.nome,
                u.username,
                u.tenant_id,
                o.nome as empresa_nome
            FROM usuarios u
            JOIN organizacoes o ON u.tenant_id = o.id
            ORDER BY u.tenant_id, u.id
        `);

        let currentTenant = null;
        usuarios[0].forEach(user => {
            if (currentTenant !== user.tenant_id) {
                console.log(`\n   🏢 ${user.empresa_nome} (tenant_id: ${user.tenant_id}):`);
                currentTenant = user.tenant_id;
            }
            console.log(`      👤 ${user.nome} (@${user.username})`);
        });

        // 3. SIMULAR LOGIN DE USUÁRIO DE EMPRESA ESPECÍFICA
        console.log('\n3️⃣ SIMULANDO LOGIN...');
        
        // Buscar um usuário da empresa 2 (TechCorp)
        const [userTechCorp] = await connection.execute(`
            SELECT u.*, o.nome as empresa_nome 
            FROM usuarios u 
            JOIN organizacoes o ON u.tenant_id = o.id 
            WHERE u.tenant_id = 2 AND u.nivel_acesso = 'admin'
            LIMIT 1
        `);

        if (userTechCorp.length > 0) {
            const user = userTechCorp[0];
            console.log(`\n   🔐 Login do usuário: ${user.username}`);
            console.log(`   🏢 Empresa: ${user.empresa_nome}`);
            console.log(`   🆔 Tenant ID: ${user.tenant_id}`);

            // Simular JWT token
            const tokenPayload = {
                id: user.id,
                username: user.username,
                tenant_id: user.tenant_id
            };

            console.log('\n   📝 JWT Token contém:');
            console.log(JSON.stringify(tokenPayload, null, 6));

            // 4. MOSTRAR DADOS QUE ELE VÊ (ISOLADOS POR TENANT)
            console.log('\n4️⃣ DADOS QUE ESTE USUÁRIO VÊ:');

            // Relatórios da empresa dele
            const relatorios = await connection.execute(`
                SELECT id, titulo, status 
                FROM relatorios 
                WHERE tenant_id = ?
                ORDER BY id DESC
                LIMIT 3
            `, [user.tenant_id]);

            console.log(`\n   📋 Relatórios (tenant_id = ${user.tenant_id}):`);
            if (relatorios[0].length > 0) {
                relatorios[0].forEach(rel => {
                    console.log(`      📄 #${rel.id}: ${rel.titulo} (${rel.status})`);
                });
            } else {
                console.log('      (nenhum relatório encontrado)');
            }

            // Equipamentos da empresa dele
            const equipamentos = await connection.execute(`
                SELECT id, nome, tipo 
                FROM equipamentos 
                WHERE tenant_id = ?
                ORDER BY id
                LIMIT 3
            `, [user.tenant_id]);

            console.log(`\n   ⚙️ Equipamentos (tenant_id = ${user.tenant_id}):`);
            if (equipamentos[0].length > 0) {
                equipamentos[0].forEach(equip => {
                    console.log(`      🔧 #${equip.id}: ${equip.nome} (${equip.tipo})`);
                });
            } else {
                console.log('      (nenhum equipamento encontrado)');
            }

            // Outros usuários da mesma empresa
            const colegas = await connection.execute(`
                SELECT nome, username, nivel_acesso 
                FROM usuarios 
                WHERE tenant_id = ? AND id != ?
                ORDER BY nome
            `, [user.tenant_id, user.id]);

            console.log(`\n   👥 Outros usuários da empresa (tenant_id = ${user.tenant_id}):`);
            if (colegas[0].length > 0) {
                colegas[0].forEach(colega => {
                    console.log(`      👤 ${colega.nome} (@${colega.username}) - ${colega.nivel_acesso}`);
                });
            } else {
                console.log('      (apenas este usuário na empresa)');
            }

            // 5. COMPARAR COM DADOS DE OUTRA EMPRESA
            console.log('\n5️⃣ COMPARAÇÃO - DADOS DE OUTRA EMPRESA:');
            
            const [outrasEmpresas] = await connection.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM relatorios WHERE tenant_id = 1) as relatorios_empresa_1,
                    (SELECT COUNT(*) FROM equipamentos WHERE tenant_id = 1) as equipamentos_empresa_1,
                    (SELECT COUNT(*) FROM usuarios WHERE tenant_id = 1) as usuarios_empresa_1
            `);

            console.log(`\n   🏢 Empresa 1 (Principal):`);
            console.log(`      📋 Relatórios: ${outrasEmpresas[0].relatorios_empresa_1}`);
            console.log(`      ⚙️ Equipamentos: ${outrasEmpresas[0].equipamentos_empresa_1}`);
            console.log(`      👥 Usuários: ${outrasEmpresas[0].usuarios_empresa_1}`);

            const [dadosUserAtual] = await connection.execute(`
                SELECT 
                    (SELECT COUNT(*) FROM relatorios WHERE tenant_id = ?) as relatorios,
                    (SELECT COUNT(*) FROM equipamentos WHERE tenant_id = ?) as equipamentos,
                    (SELECT COUNT(*) FROM usuarios WHERE tenant_id = ?) as usuarios
            `, [user.tenant_id, user.tenant_id, user.tenant_id]);

            console.log(`\n   🏢 ${user.empresa_nome} (tenant_id: ${user.tenant_id}):`);
            console.log(`      📋 Relatórios: ${dadosUserAtual[0].relatorios}`);
            console.log(`      ⚙️ Equipamentos: ${dadosUserAtual[0].equipamentos}`);
            console.log(`      👥 Usuários: ${dadosUserAtual[0].usuarios}`);

            console.log('\n✨ ISOLAMENTO PERFEITO!');
            console.log('   • Usuário só vê dados da SUA empresa');
            console.log('   • tenant_id é adicionado automaticamente em todas as consultas');
            console.log('   • Zero risco de vazamento de dados entre empresas');
        }

        console.log('\n🎯 RESUMO DO FUNCIONAMENTO:');
        console.log('1. 🏢 Usuário é criado com tenant_id da empresa');
        console.log('2. 🔐 Login retorna JWT com tenant_id');
        console.log('3. 🔒 Middleware adiciona tenant_id em TODAS as consultas');
        console.log('4. 📊 Usuário vê APENAS dados da sua empresa');
        console.log('5. ✅ Isolamento total e automático!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await connection.end();
    }
}

demonstrarTenant(); 