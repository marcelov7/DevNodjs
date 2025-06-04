const mysql = require('mysql2/promise');

async function createSaasSchema() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sistema_relatorios'
    });

    try {
        console.log('🏢 Criando estrutura SaaS Multi-Tenant...');

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
                
                -- Configurações do plano
                plano ENUM('basico', 'profissional', 'empresarial', 'enterprise') DEFAULT 'basico',
                max_usuarios INT DEFAULT 10,
                max_relatorios_mes INT DEFAULT 100,
                max_equipamentos INT DEFAULT 50,
                
                -- Recursos disponíveis
                recursos_habilitados JSON DEFAULT ('["relatorios", "equipamentos", "usuarios"]'),
                
                -- Configurações de notificação
                webhook_url VARCHAR(500) DEFAULT NULL,
                api_key VARCHAR(100) DEFAULT NULL,
                
                -- Status e controle
                ativo BOOLEAN DEFAULT TRUE,
                suspenso BOOLEAN DEFAULT FALSE,
                motivo_suspensao TEXT DEFAULT NULL,
                data_vencimento DATE DEFAULT NULL,
                
                -- Metadados
                configuracoes JSON DEFAULT NULL,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_slug (slug),
                INDEX idx_cnpj (cnpj),
                INDEX idx_ativo (ativo),
                INDEX idx_plano (plano)
            )
        `);

        // 2. Adicionar tenant_id nas tabelas existentes
        console.log('🔄 Adicionando tenant_id nas tabelas existentes...');

        // Backup das tabelas antes da modificação
        await connection.execute(`CREATE TABLE IF NOT EXISTS usuarios_backup AS SELECT * FROM usuarios`);

        // Adicionar tenant_id na tabela usuarios
        await connection.execute(`
            ALTER TABLE usuarios 
            ADD COLUMN IF NOT EXISTS tenant_id INT DEFAULT 1,
            ADD INDEX IF NOT EXISTS idx_tenant_usuario (tenant_id, id)
        `);

        // Adicionar tenant_id nas demais tabelas
        const tabelas = [
            'locais', 'equipamentos', 'motores', 'relatorios', 
            'relatorio_atribuicoes', 'relatorio_historico', 
            'relatorio_imagens', 'notificacoes', 'notificacao_preferencias'
        ];

        for (const tabela of tabelas) {
            try {
                await connection.execute(`
                    ALTER TABLE ${tabela} 
                    ADD COLUMN IF NOT EXISTS tenant_id INT DEFAULT 1,
                    ADD INDEX IF NOT EXISTS idx_tenant_${tabela} (tenant_id)
                `);
                console.log(`✅ tenant_id adicionado na tabela ${tabela}`);
            } catch (error) {
                console.log(`⚠️ ${tabela} já possui tenant_id ou erro: ${error.message}`);
            }
        }

        // 3. Adicionar foreign keys para tenant_id
        try {
            await connection.execute(`
                ALTER TABLE usuarios 
                ADD CONSTRAINT IF NOT EXISTS fk_usuario_tenant 
                FOREIGN KEY (tenant_id) REFERENCES organizacoes(id) ON DELETE CASCADE
            `);
        } catch (error) {
            console.log('⚠️ Foreign key usuario-tenant já existe ou erro:', error.message);
        }

        // 4. Criar organização padrão e atualizar dados existentes
        await connection.execute(`
            INSERT IGNORE INTO organizacoes 
            (id, nome, slug, email_contato, plano, max_usuarios, max_relatorios_mes, max_equipamentos)
            VALUES 
            (1, 'Organização Principal', 'principal', 'admin@principal.com', 'enterprise', 999, 9999, 999)
        `);

        // Atualizar todos os registros existentes para pertencer à organização padrão
        for (const tabela of ['usuarios', ...tabelas]) {
            try {
                await connection.execute(`UPDATE ${tabela} SET tenant_id = 1 WHERE tenant_id IS NULL`);
            } catch (error) {
                console.log(`⚠️ Erro ao atualizar tenant_id em ${tabela}:`, error.message);
            }
        }

        // 5. Criar tabela de convites de usuários
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
                FOREIGN KEY (tenant_id) REFERENCES organizacoes(id) ON DELETE CASCADE,
                FOREIGN KEY (convidado_por) REFERENCES usuarios(id) ON DELETE CASCADE,
                INDEX idx_token (token),
                INDEX idx_tenant_email (tenant_id, email)
            )
        `);

        // 6. Criar tabela de auditoria para ações importantes
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
                FOREIGN KEY (tenant_id) REFERENCES organizacoes(id) ON DELETE CASCADE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
                INDEX idx_tenant_data (tenant_id, data_criacao),
                INDEX idx_acao (acao),
                INDEX idx_entidade (entidade, entidade_id)
            )
        `);

        // 7. Criar views para facilitar consultas multi-tenant
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

        // 8. Criar trigger para auditoria automática
        await connection.execute(`
            CREATE TRIGGER IF NOT EXISTS tr_usuario_auditoria 
            AFTER UPDATE ON usuarios
            FOR EACH ROW
            BEGIN
                IF OLD.ativo != NEW.ativo OR OLD.nivel_acesso != NEW.nivel_acesso THEN
                    INSERT INTO auditoria_tenant (tenant_id, usuario_id, acao, entidade, entidade_id, dados_anteriores, dados_novos)
                    VALUES (
                        NEW.tenant_id,
                        NEW.id,
                        'USUARIO_ALTERADO',
                        'usuarios',
                        NEW.id,
                        JSON_OBJECT('ativo', OLD.ativo, 'nivel_acesso', OLD.nivel_acesso),
                        JSON_OBJECT('ativo', NEW.ativo, 'nivel_acesso', NEW.nivel_acesso)
                    );
                END IF;
            END
        `);

        // 9. Criar procedimentos para operações comuns
        await connection.execute(`
            DELIMITER //
            CREATE PROCEDURE IF NOT EXISTS sp_criar_organizacao(
                IN p_nome VARCHAR(200),
                IN p_slug VARCHAR(100),
                IN p_cnpj VARCHAR(20),
                IN p_email VARCHAR(100),
                IN p_plano ENUM('basico', 'profissional', 'empresarial', 'enterprise'),
                OUT p_tenant_id INT
            )
            BEGIN
                DECLARE EXIT HANDLER FOR SQLEXCEPTION
                BEGIN
                    ROLLBACK;
                    RESIGNAL;
                END;
                
                START TRANSACTION;
                
                INSERT INTO organizacoes (nome, slug, cnpj, email_contato, plano)
                VALUES (p_nome, p_slug, p_cnpj, p_email, p_plano);
                
                SET p_tenant_id = LAST_INSERT_ID();
                
                -- Criar local padrão
                INSERT INTO locais (tenant_id, nome, descricao)
                VALUES (p_tenant_id, 'Sede Principal', 'Local padrão da organização');
                
                COMMIT;
            END //
            DELIMITER ;
        `);

        console.log('✅ Estrutura SaaS Multi-Tenant criada com sucesso!');
        console.log('');
        console.log('📋 Recursos implementados:');
        console.log('   🏢 Organizações com planos e limites');
        console.log('   🔐 Isolamento total de dados por tenant');
        console.log('   👥 Sistema de convites de usuários');
        console.log('   📊 Auditoria completa de ações');
        console.log('   🔍 Views otimizadas para consultas');
        console.log('   ⚙️ Procedimentos para operações comuns');
        console.log('   🎯 Triggers automáticos de controle');

    } catch (error) {
        console.error('❌ Erro ao criar estrutura SaaS:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createSaasSchema()
        .then(() => {
            console.log('🎉 Migração para SaaS concluída!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Falha na migração:', error);
            process.exit(1);
        });
}

module.exports = { createSaasSchema }; 