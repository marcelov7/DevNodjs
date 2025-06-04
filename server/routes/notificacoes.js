const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { query } = require('../config/database');

// Rota para admin_master gerenciar notificações do tenant
router.get('/gerenciamento', verifyToken, async (req, res) => {
    try {
        // Verificar se é admin_master
        if (req.user.nivel_acesso !== 'admin_master') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas admin master pode gerenciar notificações.'
            });
        }

        const tenantId = req.user.tenant_id;

        // Buscar estatísticas gerais
        const stats = await req.notificationService.buscarEstatisticasNotificacoes(tenantId);

        // Buscar usuários do tenant e suas preferências
        const usuarios = await query(`
            SELECT 
                u.id,
                u.nome,
                u.username,
                u.email,
                u.nivel_acesso,
                u.ativo,
                GROUP_CONCAT(
                    CONCAT(np.tipo_notificacao, ':', IF(np.ativo, 'S', 'N'))
                    ORDER BY np.tipo_notificacao
                    SEPARATOR '|'
                ) as preferencias
            FROM usuarios u
            LEFT JOIN notificacao_preferencias np ON u.id = np.usuario_id
            WHERE u.tenant_id = ? AND u.ativo = true
            GROUP BY u.id, u.nome, u.username, u.email, u.nivel_acesso, u.ativo
            ORDER BY u.nome
        `, [tenantId]);

        // Buscar notificações recentes por tipo
        const notificacoesRecentes = await query(`
            SELECT 
                n.tipo,
                COUNT(*) as total,
                MAX(n.data_criacao) as ultima_criacao,
                SUM(CASE WHEN n.lida = false THEN 1 ELSE 0 END) as nao_lidas
            FROM notificacoes n
            JOIN usuarios u ON n.usuario_id = u.id
            WHERE u.tenant_id = ? 
            AND n.data_criacao >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY n.tipo
            ORDER BY COUNT(*) DESC
        `, [tenantId]);

        // Buscar tipos de notificação disponíveis
        const tiposDisponiveis = [
            { tipo: 'nova_atribuicao', nome: 'Novas Atribuições', descricao: 'Quando usuário é atribuído a um relatório' },
            { tipo: 'atualizacao_historico', nome: 'Atualizações de Histórico', descricao: 'Quando progresso do relatório é atualizado' },
            { tipo: 'status_alterado', nome: 'Status Alterado', descricao: 'Quando status do relatório muda' },
            { tipo: 'comentario', nome: 'Novos Relatórios', descricao: 'Quando um novo relatório é criado' },
            { tipo: 'vencimento', nome: 'Vencimentos', descricao: 'Relatórios próximos do vencimento' },
            { tipo: 'nova_inspecao_gerador', nome: 'Inspeções de Gerador', descricao: 'Quando nova inspeção de gerador é realizada' },
            { tipo: 'novo_analisador', nome: 'Novos Analisadores', descricao: 'Quando novo analisador é registrado' }
        ];

        res.json({
            success: true,
            data: {
                estatisticas: stats,
                usuarios: usuarios.map(user => {
                    const prefs = {};
                    if (user.preferencias) {
                        user.preferencias.split('|').forEach(pref => {
                            const [tipo, ativo] = pref.split(':');
                            prefs[tipo] = ativo === 'S';
                        });
                    }
                    return {
                        ...user,
                        preferencias: prefs
                    };
                }),
                notificacoes_recentes: notificacoesRecentes,
                tipos_disponiveis: tiposDisponiveis
            }
        });

    } catch (error) {
        console.error('Erro ao buscar dados de gerenciamento de notificações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para admin_master atualizar preferências de um usuário
router.put('/gerenciamento/usuario/:userId/preferencias', verifyToken, async (req, res) => {
    try {
        // Verificar se é admin_master
        if (req.user.nivel_acesso !== 'admin_master') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas admin master pode gerenciar preferências.'
            });
        }

        const { userId } = req.params;
        const { preferencias } = req.body;
        const tenantId = req.user.tenant_id;

        // Verificar se o usuário pertence ao mesmo tenant
        const [usuario] = await query(`
            SELECT id FROM usuarios 
            WHERE id = ? AND tenant_id = ?
        `, [userId, tenantId]);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Atualizar preferências
        for (const [tipo, ativo] of Object.entries(preferencias)) {
            await query(`
                INSERT INTO notificacao_preferencias 
                (usuario_id, tipo_notificacao, ativo, notificar_email, notificar_push)
                VALUES (?, ?, ?, true, true)
                ON DUPLICATE KEY UPDATE 
                ativo = ?, 
                notificar_email = true, 
                notificar_push = true
            `, [userId, tipo, ativo, ativo]);
        }

        res.json({
            success: true,
            message: 'Preferências atualizadas com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar preferências:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para admin_master buscar notificações de todos os usuários do tenant
router.get('/gerenciamento/todas', verifyToken, async (req, res) => {
    try {
        // Verificar se é admin_master
        if (req.user.nivel_acesso !== 'admin_master') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas admin master pode ver todas as notificações.'
            });
        }

        const tenantId = req.user.tenant_id;
        const { page = 1, limit = 50, tipo, lida } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE u.tenant_id = ?';
        let params = [tenantId];

        if (tipo) {
            whereClause += ' AND n.tipo = ?';
            params.push(tipo);
        }

        if (lida !== undefined) {
            whereClause += ' AND n.lida = ?';
            params.push(lida === 'true');
        }

        const notificacoes = await query(`
            SELECT 
                n.*,
                u.nome as usuario_nome,
                u.username as usuario_username,
                r.titulo as relatorio_titulo
            FROM notificacoes n
            JOIN usuarios u ON n.usuario_id = u.id
            LEFT JOIN relatorios r ON n.relatorio_id = r.id
            ${whereClause}
            ORDER BY n.data_criacao DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Contar total
        const [total] = await query(`
            SELECT COUNT(*) as total
            FROM notificacoes n
            JOIN usuarios u ON n.usuario_id = u.id
            ${whereClause}
        `, params);

        res.json({
            success: true,
            data: {
                notificacoes: notificacoes.map(n => ({
                    ...n,
                    dados_extras: n.dados_extras ? JSON.parse(n.dados_extras) : null
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total.total,
                    pages: Math.ceil(total.total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar todas as notificações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router; 