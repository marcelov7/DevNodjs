-- Migração: Adicionar tabela de setores
-- Data: 2024-01-10
-- Descrição: Criação da tabela setores para gerenciar os setores da organização

-- Criar tabela setores
CREATE TABLE IF NOT EXISTS setores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome_setor VARCHAR(100) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    tenant_id INT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_setor_tenant (nome_setor, tenant_id),
    INDEX idx_setores_tenant (tenant_id),
    INDEX idx_setores_ativo (ativo)
);

-- Inserir setores baseados nos setores existentes nos usuários
INSERT IGNORE INTO setores (nome_setor, descricao, tenant_id)
SELECT DISTINCT 
    u.setor as nome_setor,
    CONCAT('Setor: ', u.setor) as descricao,
    u.tenant_id
FROM usuarios u 
WHERE u.setor IS NOT NULL 
  AND u.setor != ''
  AND u.tenant_id IS NOT NULL;

-- Inserir setor padrão "TI" se não existir
INSERT IGNORE INTO setores (nome_setor, descricao, tenant_id)
SELECT 'TI', 'Setor de Tecnologia da Informação', 1
WHERE NOT EXISTS (
    SELECT 1 FROM setores WHERE nome_setor = 'TI' AND (tenant_id = 1 OR tenant_id IS NULL)
);

-- Verificar resultados da migração
SELECT 'Migração de setores concluída!' as status;
SELECT COUNT(*) as total_setores_criados FROM setores;
SELECT nome_setor, COUNT(*) as usuarios_vinculados 
FROM setores s 
LEFT JOIN usuarios u ON u.setor = s.nome_setor AND u.tenant_id = s.tenant_id
GROUP BY s.nome_setor; 