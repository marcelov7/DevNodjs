USE sistema_relatorios;

-- Tabela de Notificações
CREATE TABLE IF NOT EXISTS notificacoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    relatorio_id INT DEFAULT NULL,
    tipo ENUM('nova_atribuicao', 'atualizacao_historico', 'status_alterado', 'comentario', 'vencimento') NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    dados_extras JSON DEFAULT NULL,
    lida BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_leitura TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE,
    INDEX idx_usuario_lida (usuario_id, lida),
    INDEX idx_data_criacao (data_criacao)
);

-- Tabela de Preferências de Notificação por Usuário
CREATE TABLE IF NOT EXISTS notificacao_preferencias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    tipo_notificacao ENUM('nova_atribuicao', 'atualizacao_historico', 'status_alterado', 'comentario', 'vencimento') NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    notificar_email BOOLEAN DEFAULT TRUE,
    notificar_push BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_tipo (usuario_id, tipo_notificacao)
);

-- Inserir preferências padrão para usuários existentes
INSERT IGNORE INTO notificacao_preferencias (usuario_id, tipo_notificacao) 
SELECT u.id, tipo.tipo 
FROM usuarios u 
CROSS JOIN (
    SELECT 'nova_atribuicao' as tipo
    UNION SELECT 'atualizacao_historico'
    UNION SELECT 'status_alterado'
    UNION SELECT 'comentario'
    UNION SELECT 'vencimento'
) as tipo
WHERE u.ativo = true;

SELECT 'Schema de notificações criado com sucesso!' as status; 