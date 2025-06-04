-- Sistema de Relatórios - Estrutura do Banco de Dados
-- Este arquivo pode ser executado múltiplas vezes sem erro

-- Remover banco se existir e criar novo
DROP DATABASE IF EXISTS sistema_relatorios;
CREATE DATABASE sistema_relatorios CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sistema_relatorios;

-- Remover tabelas se existirem (ordem inversa das dependências)
DROP TABLE IF EXISTS relatorio_imagens;
DROP TABLE IF EXISTS relatorio_historico;
DROP TABLE IF EXISTS relatorio_atribuicoes;
DROP TABLE IF EXISTS relatorios;
DROP TABLE IF EXISTS equipamentos;
DROP TABLE IF EXISTS motores;
DROP TABLE IF EXISTS locais;
DROP TABLE IF EXISTS usuarios;

-- Tabela de Usuários
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    setor VARCHAR(100) NOT NULL,
    nivel_acesso ENUM('admin_master', 'admin', 'usuario', 'visitante') NOT NULL DEFAULT 'usuario',
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Locais
CREATE TABLE locais (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    endereco TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Equipamentos
CREATE TABLE equipamentos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    descricao TEXT,
    local_id INT NOT NULL,
    tipo VARCHAR(50),
    fabricante VARCHAR(100),
    modelo VARCHAR(100),
    numero_serie VARCHAR(100),
    data_instalacao DATE,
    status_operacional ENUM('operando', 'manutencao', 'inativo') DEFAULT 'operando',
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (local_id) REFERENCES locais(id) ON DELETE CASCADE
);

-- Tabela de Motores
CREATE TABLE motores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    descricao TEXT,
    tipo VARCHAR(50),
    potencia DECIMAL(10,2),
    voltagem DECIMAL(10,2),
    corrente DECIMAL(10,2),
    rpm INT,
    fabricante VARCHAR(100),
    modelo VARCHAR(100),
    numero_serie VARCHAR(100),
    data_instalacao DATE,
    status_operacional ENUM('operando', 'manutencao', 'inativo') DEFAULT 'operando',
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Relatórios
CREATE TABLE relatorios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    local_id INT NOT NULL,
    equipamento_id INT NOT NULL,
    data_ocorrencia TIMESTAMP NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    status ENUM('pendente', 'em_andamento', 'resolvido') DEFAULT 'pendente',
    prioridade ENUM('baixa', 'media', 'alta', 'critica') DEFAULT 'media',
    progresso INT DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
    editavel BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (local_id) REFERENCES locais(id) ON DELETE CASCADE,
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id) ON DELETE CASCADE
);

-- Tabela de Atribuições de Relatórios
CREATE TABLE relatorio_atribuicoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    relatorio_id INT NOT NULL,
    usuario_id INT NOT NULL,
    atribuido_por INT NOT NULL,
    data_atribuicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (atribuido_por) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_atribuicao (relatorio_id, usuario_id)
);

-- Tabela de Histórico de Atualizações
CREATE TABLE relatorio_historico (
    id INT PRIMARY KEY AUTO_INCREMENT,
    relatorio_id INT NOT NULL,
    usuario_id INT NOT NULL,
    status_anterior ENUM('pendente', 'em_andamento', 'resolvido'),
    status_novo ENUM('pendente', 'em_andamento', 'resolvido') NOT NULL,
    descricao TEXT,
    progresso TEXT,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de Imagens/Anexos
CREATE TABLE relatorio_imagens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    relatorio_id INT,
    historico_id INT,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    tamanho_arquivo INT,
    tipo_mime VARCHAR(100),
    data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (relatorio_id) REFERENCES relatorios(id) ON DELETE CASCADE,
    FOREIGN KEY (historico_id) REFERENCES relatorio_historico(id) ON DELETE CASCADE
);

-- Inserir usuário Admin Master padrão (senha: password)
INSERT INTO usuarios (nome, username, email, senha, setor, nivel_acesso) VALUES 
('Administrador Master', 'admin', 'admin@sistema.com', '$2a$10$HIgFUbbPz/k1aFOmgSzm2e8ahjEI6w8L5OdR/1qEG3ovr8WA/6Gku', 'TI', 'admin_master');

-- Inserir alguns dados de exemplo
INSERT INTO locais (nome, descricao, endereco) VALUES 
('Fábrica Principal', 'Prédio principal da fábrica', 'Rua Industrial, 123'),
('Oficina de Manutenção', 'Local para manutenção de equipamentos', 'Setor B - Térreo'),
('Depósito', 'Depósito de materiais e equipamentos', 'Setor C - Subsolo');

INSERT INTO equipamentos (nome, codigo, descricao, local_id, tipo, fabricante, modelo) VALUES 
('Compressor de Ar 01', 'COMP-001', 'Compressor de ar principal', 1, 'Compressor', 'Atlas Copco', 'GA 15'),
('Esteira Transportadora', 'EST-001', 'Esteira principal da linha de produção', 1, 'Transportador', 'Dorner', 'Series 2200'),
('Torno CNC', 'TORNO-001', 'Torno CNC para usinagem de precisão', 2, 'Máquina-Ferramenta', 'Haas', 'ST-20');

INSERT INTO motores (nome, codigo, descricao, tipo, potencia, voltagem, corrente, rpm, fabricante, modelo) VALUES 
('Motor Trifásico 10CV', 'MOT-001', 'Motor elétrico trifásico 10CV', 'Trifásico', 7.50, 380.00, 10.00, 1750, 'WEG', 'W22'),
('Motor Monofásico 2CV', 'MOT-002', 'Motor elétrico monofásico 2CV', 'Monofásico', 1.50, 220.00, 2.00, 3450, 'Kohlbach', 'K21');

-- Inserir alguns relatórios de exemplo
INSERT INTO relatorios (usuario_id, local_id, equipamento_id, data_ocorrencia, titulo, descricao, status, prioridade) VALUES 
(1, 1, 1, NOW(), 'Vazamento de ar no compressor', 'Detectado vazamento de ar na conexão principal do compressor', 'pendente', 'alta'),
(1, 1, 2, DATE_SUB(NOW(), INTERVAL 2 DAY), 'Ruído excessivo na esteira', 'Esteira apresentando ruídos anômalos durante operação', 'em_andamento', 'media'),
(1, 2, 3, DATE_SUB(NOW(), INTERVAL 5 DAY), 'Problema no sistema de refrigeração', 'Sistema de refrigeração do torno não está funcionando adequadamente', 'resolvido', 'alta');

-- Índices para melhorar performance
CREATE INDEX idx_relatorios_usuario ON relatorios(usuario_id);
CREATE INDEX idx_relatorios_local ON relatorios(local_id);
CREATE INDEX idx_relatorios_equipamento ON relatorios(equipamento_id);
CREATE INDEX idx_relatorios_status ON relatorios(status);
CREATE INDEX idx_relatorios_data ON relatorios(data_ocorrencia);
CREATE INDEX idx_equipamentos_local ON equipamentos(local_id);
CREATE INDEX idx_historico_relatorio ON relatorio_historico(relatorio_id);
CREATE INDEX idx_imagens_relatorio ON relatorio_imagens(relatorio_id);
CREATE INDEX idx_atribuicoes_relatorio ON relatorio_atribuicoes(relatorio_id);

-- Confirmação da criação
SELECT 'Database criado com sucesso!' as status;
SELECT COUNT(*) as total_usuarios FROM usuarios;
SELECT COUNT(*) as total_locais FROM locais;
SELECT COUNT(*) as total_equipamentos FROM equipamentos;
SELECT COUNT(*) as total_motores FROM motores;
SELECT COUNT(*) as total_relatorios FROM relatorios; 