USE sistema_relatorios;

-- Inserir algumas entradas no histórico para testar os indicadores
INSERT INTO relatorio_historico (relatorio_id, usuario_id, status_anterior, status_novo, descricao, progresso, data_atualizacao) VALUES 
(1, 1, 'pendente', 'em_andamento', 'Iniciada análise do problema de vazamento', 25, NOW() - INTERVAL 2 HOUR),
(1, 1, 'em_andamento', 'em_andamento', 'Identificada origem do vazamento na válvula principal', 50, NOW() - INTERVAL 1 HOUR),
(2, 1, 'pendente', 'em_andamento', 'Realizada inspeção visual da esteira', 30, NOW() - INTERVAL 6 HOUR),
(2, 1, 'em_andamento', 'em_andamento', 'Lubrificação dos rolamentos realizada', 75, NOW() - INTERVAL 30 MINUTE),
(3, 1, 'em_andamento', 'resolvido', 'Sistema de refrigeração totalmente reparado e testado', 100, NOW() - INTERVAL 2 DAY);

-- Atualizar o progresso dos relatórios conforme o último histórico
UPDATE relatorios SET progresso = 50, status = 'em_andamento' WHERE id = 1;
UPDATE relatorios SET progresso = 75, status = 'em_andamento' WHERE id = 2;
UPDATE relatorios SET progresso = 100, status = 'resolvido' WHERE id = 3;

SELECT 'Dados de teste do histórico inseridos com sucesso!' as status; 