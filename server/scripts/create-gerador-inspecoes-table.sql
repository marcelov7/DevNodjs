-- Criação da tabela gerador_inspecoes para o sistema SaaS
CREATE TABLE IF NOT EXISTS gerador_inspecoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    data DATE NOT NULL,
    colaborador VARCHAR(255) NOT NULL,
    nivel_oleo VARCHAR(50),
    nivel_agua VARCHAR(50),
    tensao_sync_gerador DECIMAL(10,2),
    tensao_sync_rede DECIMAL(10,2),
    temp_agua DECIMAL(10,2),
    pressao_oleo DECIMAL(10,2),
    frequencia DECIMAL(10,2),
    tensao_a DECIMAL(10,2),
    tensao_b DECIMAL(10,2),
    tensao_c DECIMAL(10,2),
    rpm INT,
    tensao_bateria DECIMAL(10,2),
    tensao_alternador DECIMAL(10,2),
    combustivel_50 ENUM('Sim', 'Não') DEFAULT 'Não',
    iluminacao_sala ENUM('Sim', 'Não') DEFAULT 'Não',
    observacao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (tenant_id) REFERENCES organizacoes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Índices para performance
    INDEX idx_gerador_tenant (tenant_id),
    INDEX idx_gerador_user (user_id),
    INDEX idx_gerador_data (data),
    INDEX idx_gerador_colaborador (colaborador),
    INDEX idx_gerador_ativo (ativo),
    INDEX idx_gerador_criado (criado_em)
);

-- Inserir dados de exemplo para teste
INSERT INTO gerador_inspecoes (
    tenant_id, user_id, data, colaborador, nivel_oleo, nivel_agua,
    tensao_sync_gerador, tensao_sync_rede, temp_agua, pressao_oleo,
    frequencia, tensao_a, tensao_b, tensao_c, rpm, tensao_bateria,
    tensao_alternador, combustivel_50, iluminacao_sala, observacao
) VALUES 
(1, 1, '2025-05-16', 'Marcelo Vinicius', 'Mínimo', 'Mínimo', 220.00, 221.00, 23.00, 3.00, 62.70, 220.00, 220.00, 210.00, 1800, 24.00, 24.00, 'Sim', 'Não', 'Inspeção ok'),
(1, 1, '2025-05-15', 'Ana Silva', 'Normal', 'Normal', 230.00, 225.00, 25.00, 3.50, 60.50, 230.00, 225.00, 215.00, 1850, 24.50, 24.20, 'Sim', 'Sim', 'Tudo funcionando normalmente'),
(1, 1, '2025-05-14', 'Carlos Santos', 'Máximo', 'Máximo', 240.00, 230.00, 28.00, 4.00, 59.80, 240.00, 235.00, 220.00, 1900, 25.00, 25.00, 'Não', 'Sim', 'Verificar nível de combustível'); 