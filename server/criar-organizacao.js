const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function criarNovaOrganizacao() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sistema_relatorios'
    });

    try {
        console.log('🏢 === CRIAR NOVA ORGANIZAÇÃO (SISTEMA PARALELO) ===\n');

        // Coleta dos dados
        const nome = await question('📝 Nome da empresa: ');
        const slug = (await question('🔗 Slug (URL amigável, ex: minha-empresa): ')).toLowerCase().replace(/\s+/g, '-');
        const cnpj = await question('🏢 CNPJ (opcional): ');
        const email = await question('📧 Email de contato: ');
        const telefone = await question('📞 Telefone (opcional): ');
        
        console.log('\n📋 Escolha o plano:');
        console.log('1 - Básico (5 usuários, 50 relatórios/mês)');
        console.log('2 - Profissional (15 usuários, 200 relatórios/mês)');
        console.log('3 - Empresarial (50 usuários, 1000 relatórios/mês)');
        console.log('4 - Enterprise (999 usuários, 9999 relatórios/mês)');
        
        const planoEscolha = await question('Plano (1-4): ');
        const planos = {
            '1': { nome: 'basico', usuarios: 5, relatorios: 50, equipamentos: 25 },
            '2': { nome: 'profissional', usuarios: 15, relatorios: 200, equipamentos: 100 },
            '3': { nome: 'empresarial', usuarios: 50, relatorios: 1000, equipamentos: 500 },
            '4': { nome: 'enterprise', usuarios: 999, relatorios: 9999, equipamentos: 999 }
        };
        
        const plano = planos[planoEscolha] || planos['1'];

        console.log('\n👤 Dados do administrador:');
        const adminNome = await question('Nome completo: ');
        const adminUsername = await question('Username: ');
        const adminEmail = await question('Email: ');
        const adminSenha = await question('Senha: ');

        console.log('\n🏗️ Criando organização...');

        // 1. Criar organização
        const [result] = await connection.execute(`
            INSERT INTO organizacoes 
            (nome, slug, cnpj, email_contato, telefone, plano, max_usuarios, max_relatorios_mes, max_equipamentos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nome,
            slug,
            cnpj || null,
            email,
            telefone || null,
            plano.nome,
            plano.usuarios,
            plano.relatorios,
            plano.equipamentos
        ]);

        const tenantId = result.insertId;
        console.log(`✅ Organização criada com ID: ${tenantId}`);

        // 2. Criar admin
        const senhaHash = await bcrypt.hash(adminSenha, 10);
        await connection.execute(`
            INSERT INTO usuarios 
            (tenant_id, nome, username, email, setor, nivel_acesso, senha)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [tenantId, adminNome, adminUsername, adminEmail, 'Administração', 'admin', senhaHash]);

        console.log(`✅ Administrador criado: ${adminUsername}`);

        // 3. Criar local padrão
        await connection.execute(`
            INSERT INTO locais (tenant_id, nome, descricao)
            VALUES (?, ?, ?)
        `, [tenantId, `Sede ${nome}`, `Local principal da ${nome}`]);

        console.log('✅ Local padrão criado');

        // 4. Criar preferências de notificação
        const [admin] = await connection.execute(
            'SELECT id FROM usuarios WHERE tenant_id = ? AND nivel_acesso = "admin"',
            [tenantId]
        );

        if (admin.length > 0) {
            const tiposNotificacao = ['nova_atribuicao', 'atualizacao_historico', 'status_alterado', 'comentario', 'vencimento', 'novo_relatorio'];
            
            for (const tipo of tiposNotificacao) {
                await connection.execute(`
                    INSERT INTO notificacao_preferencias 
                    (usuario_id, tipo_notificacao, ativo, notificar_email, notificar_push)
                    VALUES (?, ?, true, true, true)
                `, [admin[0].id, tipo]);
            }
        }

        console.log('✅ Preferências de notificação configuradas');

        console.log('\n🎉 ORGANIZAÇÃO CRIADA COM SUCESSO!');
        console.log('\n📋 RESUMO:');
        console.log(`🏢 Organização: ${nome}`);
        console.log(`🔗 Slug: ${slug}`);
        console.log(`📊 Plano: ${plano.nome} (${plano.usuarios} usuários, ${plano.relatorios} relatórios/mês)`);
        console.log(`👤 Admin: ${adminUsername} / ${adminSenha}`);
        console.log(`🆔 Tenant ID: ${tenantId}`);

        console.log('\n🔐 COMO FAZER LOGIN:');
        console.log('POST /api/auth/login');
        console.log(`{
  "username": "${adminUsername}",
  "senha": "${adminSenha}"
}`);

        console.log('\n🌐 ACESSO VIA SUBDOMAIN (configure DNS):');
        console.log(`https://${slug}.seudominio.com`);

        console.log('\n👥 CONVIDAR USUÁRIOS:');
        console.log('POST /api/organizacoes/invite-user');
        console.log(`{
  "email": "usuario@${slug}.com",
  "nivel_acesso": "usuario"
}`);

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.error('❌ Erro: Slug ou email já existe. Tente outros valores.');
        } else {
            console.error('❌ Erro:', error.message);
        }
    } finally {
        await connection.end();
        rl.close();
    }
}

criarNovaOrganizacao(); 