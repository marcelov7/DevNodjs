const mysql = require('mysql2/promise');

async function createSaasSchemaSimple() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sistema_relatorios'
    });

    try {
        console.log('🏢 Criando estrutura SaaS Multi-Tenant (versão simplificada)...');

        // 1. Criar tabela de organizações (empresas)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS organizacoes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(200) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                cnpj VARCHAR(20) UNIQUE,
                email_contato VARCHAR(100) NOT NULL,
                telefone VARCHAR(20),
                endereco TEXT,
                
                plano ENUM('basico', 'profissional', 'empresarial', 'enterprise') DEFAULT 'basico',
                max_usuarios INT DEFAULT 10,
                max_relatorios_mes INT DEFAULT 100,
                max_equipamentos INT DEFAULT 50,
                
                recursos_habilitados JSON DEFAULT ('["relatorios", "equipamentos", "usuarios"]'),
                
                webhook_url VARCHAR(500) DEFAULT NULL,
                api_key VARCHAR(100) DEFAULT NULL,
                
                ativo BOOLEAN DEFAULT TRUE,
                suspenso BOOLEAN DEFAULT FALSE,
                motivo_suspensao TEXT DEFAULT NULL,
                data_vencimento DATE DEFAULT NULL,
                
                configuracoes JSON DEFAULT NULL,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_slug (slug),
                INDEX idx_cnpj (cnpj),
                INDEX idx_ativo (ativo),
                INDEX idx_plano (plano)
            )
        `);

        console.log('✅ Tabela organizacoes criada');

        // 2. Adicionar tenant_id nas tabelas existentes
        console.log('🔄 Adicionando tenant_id nas tabelas existentes...');

        const tabelas = [
            'usuarios', 'locais', 'equipamentos', 'motores', 'relatorios', 
            'relatorio_atribuicoes', 'relatorio_historico', 
            'relatorio_imagens', 'notificacoes', 'notificacao_preferencias'
        ];

        for (const tabela of tabelas) {
            try {
                // Verificar se coluna já existe
                const [columns] = await connection.execute(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = 'sistema_relatorios' 
                    AND TABLE_NAME = '${tabela}' 
                    AND COLUMN_NAME = 'tenant_id'
                `);

                if (columns.length === 0) {
                    await connection.execute(`ALTER TABLE ${tabela} ADD COLUMN tenant_id INT DEFAULT 1`);
                    console.log(`✅ tenant_id adicionado na tabela ${tabela}`);
                } else {
                    console.log(`⚠️ tenant_id já existe na tabela ${tabela}`);
                }

                // Adicionar índice
                try {
                    await connection.execute(`CREATE INDEX IF NOT EXISTS idx_tenant_${tabela} ON ${tabela}(tenant_id)`);
                } catch (error) {
                    // Ignorar se índice já existir
                }
            } catch (error) {
                console.log(`⚠️ Erro ao modificar ${tabela}: ${error.message}`);
            }
        }

        // 3. Criar organização padrão
        await connection.execute(`
            INSERT IGNORE INTO organizacoes 
            (id, nome, slug, email_contato, plano, max_usuarios, max_relatorios_mes, max_equipamentos)
            VALUES 
            (1, 'Organização Principal', 'principal', 'admin@principal.com', 'enterprise', 999, 9999, 999)
        `);

        console.log('✅ Organização padrão criada');

        // 4. Atualizar registros existentes
        for (const tabela of tabelas) {
            try {
                await connection.execute(`UPDATE ${tabela} SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0`);
            } catch (error) {
                console.log(`⚠️ Erro ao atualizar tenant_id em ${tabela}:`, error.message);
            }
        }

        console.log('✅ Dados existentes atualizados');

        // 5. Criar tabela de convites
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS usuario_convites (
                id INT PRIMARY KEY AUTO_INCREMENT,
                tenant_id INT NOT NULL,
                email VARCHAR(100) NOT NULL,
                token VARCHAR(100) UNIQUE NOT NULL,
                nivel_acesso ENUM('admin', 'usuario', 'visitante') DEFAULT 'usuario',
                convidado_por INT NOT NULL,
                usado BOOLEAN DEFAULT FALSE,
                data_expiracao TIMESTAMP NOT NULL,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_token (token),
                INDEX idx_tenant_email (tenant_id, email)
            )
        `);

        console.log('✅ Tabela de convites criada');

        // 6. Criar tabela de auditoria
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS auditoria_tenant (
                id INT PRIMARY KEY AUTO_INCREMENT,
                tenant_id INT NOT NULL,
                usuario_id INT DEFAULT NULL,
                acao VARCHAR(100) NOT NULL,
                entidade VARCHAR(50) NOT NULL,
                entidade_id INT DEFAULT NULL,
                dados_anteriores JSON DEFAULT NULL,
                dados_novos JSON DEFAULT NULL,
                ip_address VARCHAR(45) DEFAULT NULL,
                user_agent TEXT DEFAULT NULL,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tenant_data (tenant_id, data_criacao),
                INDEX idx_acao (acao),
                INDEX idx_entidade (entidade, entidade_id)
            )
        `);

        console.log('✅ Tabela de auditoria criada');

        // 7. Criar view para relatórios completos
        await connection.execute(`
            CREATE OR REPLACE VIEW vw_relatorios_completos AS
            SELECT 
                r.*,
                u.nome as usuario_nome,
                l.nome as local_nome,
                e.nome as equipamento_nome,
                o.nome as organizacao_nome,
                o.slug as organizacao_slug
            FROM relatorios r
            JOIN usuarios u ON r.usuario_id = u.id AND r.tenant_id = u.tenant_id
            JOIN locais l ON r.local_id = l.id AND r.tenant_id = l.tenant_id
            JOIN equipamentos e ON r.equipamento_id = e.id AND r.tenant_id = e.tenant_id
            JOIN organizacoes o ON r.tenant_id = o.id
            WHERE o.ativo = TRUE AND NOT o.suspenso
        `);

        console.log('✅ View vw_relatorios_completos criada');

        console.log('');
        console.log('🎉 Estrutura SaaS Multi-Tenant criada com sucesso!');
        console.log('');
        console.log('📋 Recursos implementados:');
        console.log('   🏢 Organizações com planos e limites');
        console.log('   🔐 Isolamento de dados por tenant_id');
        console.log('   👥 Sistema de convites de usuários');
        console.log('   📊 Auditoria de ações');
        console.log('   🔍 Views otimizadas para consultas');
        console.log('   ✅ Compatibilidade com dados existentes');

    } catch (error) {
        console.error('❌ Erro ao criar estrutura SaaS:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createSaasSchemaSimple()
        .then(() => {
            console.log('🎉 Migração SaaS concluída!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Falha na migração:', error);
            process.exit(1);
        });
}

module.exports = { createSaasSchemaSimple }; 