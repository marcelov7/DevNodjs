-- Script para atualizar estrutura do banco existente
-- Execute este script se já tem o banco criado

USE sistema_relatorios;

-- Adicionar coluna progresso na tabela relatorios (se não existir)
ALTER TABLE relatorios 
ADD COLUMN IF NOT EXISTS progresso INT DEFAULT 0 
CHECK (progresso >= 0 AND progresso <= 100)
AFTER prioridade;

-- Atualizar progresso baseado no status atual
UPDATE relatorios SET 
progresso = CASE 
    WHEN status = 'pendente' THEN 0
    WHEN status = 'resolvido' THEN 100
    WHEN status = 'em_andamento' THEN 50
    ELSE 0
END
WHERE progresso IS NULL OR progresso = 0;

-- Verificar se as tabelas de histórico e atribuições existem
SELECT 'Estrutura atualizada com sucesso!' as status;

-- Verificar se a coluna nome_original já existe antes de adicionar
SET @sql = 'SELECT COUNT(*) AS column_exists
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = "sistema_relatorios" 
AND TABLE_NAME = "relatorio_imagens" 
AND COLUMN_NAME = "nome_original"';

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar coluna nome_original se não existir
ALTER TABLE relatorio_imagens 
ADD COLUMN IF NOT EXISTS nome_original VARCHAR(255) NULL 
AFTER nome_arquivo;

-- Atualizar registros existentes: usar nome_arquivo como nome_original
UPDATE relatorio_imagens 
SET nome_original = nome_arquivo 
WHERE nome_original IS NULL;

-- Verificar atualização
SELECT 'Coluna nome_original adicionada com sucesso!' as status;
SELECT COUNT(*) as total_imagens_atualizadas FROM relatorio_imagens WHERE nome_original IS NOT NULL; 