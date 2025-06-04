-- Sistema de Permissões Granulares
-- Execute este script após o database.sql principal

USE sistema_relatorios;

-- Tabela de Recursos (páginas/módulos do sistema)
CREATE TABLE IF NOT EXISTS recursos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255),
    slug VARCHAR(100) NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT TRUE,
    ordem INT DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Ações (operações que podem ser realizadas)
CREATE TABLE IF NOT EXISTS acoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255),
    slug VARCHAR(100) NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT TRUE,
    ordem INT DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Permissões (relaciona nível de acesso com recurso e ação)
CREATE TABLE IF NOT EXISTS permissoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nivel_acesso ENUM('admin_master', 'admin', 'usuario', 'visitante') NOT NULL,
    recurso_id INT NOT NULL,
    acao_id INT NOT NULL,
    permitido BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (recurso_id) REFERENCES recursos(id) ON DELETE CASCADE,
    FOREIGN KEY (acao_id) REFERENCES acoes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_permissao (nivel_acesso, recurso_id, acao_id)
);

-- Tabela de Auditoria de Permissões
CREATE TABLE IF NOT EXISTS auditoria_permissoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    nivel_acesso ENUM('admin_master', 'admin', 'usuario', 'visitante') NOT NULL,
    recurso_id INT NOT NULL,
    acao_id INT NOT NULL,
    valor_anterior BOOLEAN,
    valor_novo BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (recurso_id) REFERENCES recursos(id) ON DELETE CASCADE,
    FOREIGN KEY (acao_id) REFERENCES acoes(id) ON DELETE CASCADE
);

-- Inserir recursos padrão do sistema
INSERT INTO recursos (nome, descricao, slug, ordem) VALUES
('Dashboard', 'Página inicial com visão geral do sistema', 'dashboard', 1),
('Relatórios', 'Gerenciamento de relatórios de manutenção', 'relatorios', 2),
('Usuários', 'Gerenciamento de usuários do sistema', 'usuarios', 3),
('Setores', 'Gerenciamento de setores da empresa', 'setores', 4),
('Locais', 'Gerenciamento de locais e instalações', 'locais', 5),
('Equipamentos', 'Gerenciamento de equipamentos', 'equipamentos', 6),
('Motores', 'Gerenciamento de motores elétricos', 'motores', 7),
('Analisadores', 'Gerenciamento de analisadores', 'analisadores', 8),
('Gerador de Inspeções', 'Geração automática de inspeções', 'gerador-inspecoes', 9),
('Configurações', 'Configurações gerais do sistema', 'configuracoes', 10),
('Notificações', 'Gerenciamento de notificações', 'notificacoes', 11)
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao), ordem = VALUES(ordem);

-- Inserir ações padrão
INSERT INTO acoes (nome, descricao, slug, ordem) VALUES
('Visualizar', 'Acessar e visualizar a página/recurso', 'visualizar', 1),
('Criar', 'Criar novos registros', 'criar', 2),
('Editar', 'Modificar registros existentes', 'editar', 3),
('Excluir', 'Remover registros do sistema', 'excluir', 4),
('Exportar', 'Exportar dados em diferentes formatos', 'exportar', 5),
('Importar', 'Importar dados de arquivos externos', 'importar', 6)
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao), ordem = VALUES(ordem);

-- Configurar permissões padrão para Admin Master (todas as permissões)
INSERT INTO permissoes (nivel_acesso, recurso_id, acao_id, permitido)
SELECT 'admin_master', r.id, a.id, TRUE
FROM recursos r
CROSS JOIN acoes a
ON DUPLICATE KEY UPDATE permitido = TRUE;

-- Configurar permissões padrão para Admin (todas exceto configurações)
INSERT INTO permissoes (nivel_acesso, recurso_id, acao_id, permitido)
SELECT 'admin', r.id, a.id, TRUE
FROM recursos r
CROSS JOIN acoes a
WHERE r.slug != 'configuracoes'
ON DUPLICATE KEY UPDATE permitido = TRUE;

-- Configurar permissões padrão para Usuário (apenas visualizar e criar relatórios)
INSERT INTO permissoes (nivel_acesso, recurso_id, acao_id, permitido)
SELECT 'usuario', r.id, a.id, 
CASE 
    WHEN r.slug IN ('dashboard', 'relatorios', 'equipamentos', 'motores', 'analisadores', 'locais') AND a.slug = 'visualizar' THEN TRUE
    WHEN r.slug = 'relatorios' AND a.slug IN ('criar', 'editar') THEN TRUE
    ELSE FALSE
END
FROM recursos r
CROSS JOIN acoes a
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

-- Configurar permissões padrão para Visitante (apenas visualizar dashboard e relatórios)
INSERT INTO permissoes (nivel_acesso, recurso_id, acao_id, permitido)
SELECT 'visitante', r.id, a.id, 
CASE 
    WHEN r.slug IN ('dashboard', 'relatorios') AND a.slug = 'visualizar' THEN TRUE
    ELSE FALSE
END
FROM recursos r
CROSS JOIN acoes a
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

-- Índices para performance
CREATE INDEX idx_permissoes_nivel ON permissoes(nivel_acesso);
CREATE INDEX idx_permissoes_recurso ON permissoes(recurso_id);
CREATE INDEX idx_permissoes_acao ON permissoes(acao_id);
CREATE INDEX idx_auditoria_usuario ON auditoria_permissoes(usuario_id);
CREATE INDEX idx_auditoria_data ON auditoria_permissoes(data_alteracao);

-- Confirmação
SELECT 'Sistema de permissões criado com sucesso!' as status;
SELECT COUNT(*) as total_recursos FROM recursos;
SELECT COUNT(*) as total_acoes FROM acoes;
SELECT COUNT(*) as total_permissoes FROM permissoes; 