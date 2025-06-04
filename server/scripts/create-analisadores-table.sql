-- Script para criar a tabela de analisadores

CREATE TABLE IF NOT EXISTS analisadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    analyzer VARCHAR(100) NOT NULL COMMENT 'Tipo do analisador (TORRE, CHAMINÉ, CAIXA DE FUMAÇA)',
    check_date DATE NOT NULL COMMENT 'Data do check/verificação',
    
    -- Status dos filtros (boolean - 0/1)
    acid_filter TINYINT(1) DEFAULT 0 COMMENT 'Filtro ácido conforme',
    gas_dryer TINYINT(1) DEFAULT 0 COMMENT 'Secador de gás conforme',
    paper_filter TINYINT(1) DEFAULT 0 COMMENT 'Filtro de papel conforme',
    peristaltic_pump TINYINT(1) DEFAULT 0 COMMENT 'Bomba peristáltica conforme',
    rotameter TINYINT(1) DEFAULT 0 COMMENT 'Rotâmetro conforme',
    disposable_filter TINYINT(1) DEFAULT 0 COMMENT 'Filtro descartável conforme',
    blocking_filter TINYINT(1) DEFAULT 0 COMMENT 'Filtro de bloqueio conforme',
    
    -- Condições ambientais
    room_temperature DECIMAL(5,2) NULL COMMENT 'Temperatura do ambiente em °C',
    air_pressure DECIMAL(6,2) NULL COMMENT 'Pressão do ar',
    
    -- Observações e anexos
    observation TEXT NULL COMMENT 'Observações do check',
    image VARCHAR(255) NULL COMMENT 'Nome/caminho da imagem anexada',
    
    -- Controle
    ativo TINYINT(1) DEFAULT 1 COMMENT 'Se o registro está ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_user_id (user_id),
    INDEX idx_analyzer (analyzer),
    INDEX idx_check_date (check_date),
    INDEX idx_ativo (ativo),
    INDEX idx_created_at (created_at),
    
    -- Chaves estrangeiras (assumindo que as tabelas existem)
    FOREIGN KEY (tenant_id) REFERENCES organizacoes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela para armazenar checks dos analisadores';

-- Inserir alguns dados de exemplo (opcional - remover em produção)
INSERT INTO analisadores (
    tenant_id, 
    user_id, 
    analyzer, 
    check_date, 
    acid_filter, 
    gas_dryer, 
    paper_filter, 
    peristaltic_pump, 
    rotameter, 
    disposable_filter, 
    blocking_filter, 
    room_temperature, 
    air_pressure, 
    observation,
    ativo
) VALUES 
(1, 2, 'ANALISADOR DA TORRE', '2025-05-14', 1, 1, 1, 1, 1, 1, 1, 30.0, 5.1, 'Check mensal - todos os componentes conformes', 1),
(1, 2, 'ANALISADOR DA CHAMINÉ', '2025-05-14', 1, 1, 1, 1, 0, 1, 1, 25.0, 5.1, 'Rotâmetro necessita ajuste', 1),
(1, 2, 'ANALISADOR DA CAIXA DE FUMAÇA', '2025-05-14', 0, 1, 0, 1, 1, 0, 1, 30.0, 5.1, 'Filtro ácido e papel necessitam troca', 1)
ON DUPLICATE KEY UPDATE id=id; 