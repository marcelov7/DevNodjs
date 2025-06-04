const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { adminMasterOnly, updatePermission, refreshPermissionsCache } = require('../middleware/permissions');

const router = express.Router();

// Middleware para todas as rotas - apenas admin_master
router.use(verifyToken, adminMasterOnly);

// GET /api/configuracoes/permissoes - Listar todas as permissões organizadas
router.get('/permissoes', async (req, res) => {
    try {
        // Buscar recursos ativos
        const recursos = await query(`
            SELECT id, nome, descricao, slug, ordem
            FROM recursos 
            WHERE ativo = TRUE 
            ORDER BY ordem, nome
        `);

        // Buscar ações ativas
        const acoes = await query(`
            SELECT id, nome, descricao, slug, ordem
            FROM acoes 
            WHERE ativo = TRUE 
            ORDER BY ordem, nome
        `);

        // Buscar todas as permissões
        const permissoes = await query(`
            SELECT 
                p.nivel_acesso,
                r.slug as recurso_slug,
                a.slug as acao_slug,
                p.permitido
            FROM permissoes p
            JOIN recursos r ON r.id = p.recurso_id
            JOIN acoes a ON a.id = p.acao_id
            WHERE r.ativo = TRUE AND a.ativo = TRUE
        `);

        // Organizar permissões por nível de acesso
        const permissoesPorNivel = {};
        const niveisAcesso = ['admin_master', 'admin', 'usuario', 'visitante'];

        niveisAcesso.forEach(nivel => {
            permissoesPorNivel[nivel] = {};
            recursos.forEach(recurso => {
                permissoesPorNivel[nivel][recurso.slug] = {};
                acoes.forEach(acao => {
                    permissoesPorNivel[nivel][recurso.slug][acao.slug] = false;
                });
            });
        });

        // Preencher com as permissões existentes
        permissoes.forEach(perm => {
            if (permissoesPorNivel[perm.nivel_acesso] && 
                permissoesPorNivel[perm.nivel_acesso][perm.recurso_slug]) {
                permissoesPorNivel[perm.nivel_acesso][perm.recurso_slug][perm.acao_slug] = perm.permitido;
            }
        });

        res.json({
            success: true,
            data: {
                recursos,
                acoes,
                permissoes: permissoesPorNivel
            }
        });

    } catch (error) {
        console.error('Erro ao buscar permissões:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// PUT /api/configuracoes/permissoes - Atualizar permissão específica
router.put('/permissoes', [
    body('nivel_acesso').isIn(['admin_master', 'admin', 'usuario', 'visitante']).withMessage('Nível de acesso inválido'),
    body('recurso').notEmpty().withMessage('Recurso é obrigatório'),
    body('acao').notEmpty().withMessage('Ação é obrigatória'),
    body('permitido').isBoolean().withMessage('Permitido deve ser boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { nivel_acesso, recurso, acao, permitido } = req.body;

        // Não permitir alterar permissões do admin_master
        if (nivel_acesso === 'admin_master') {
            return res.status(400).json({
                success: false,
                message: 'Não é possível alterar permissões do Admin Master'
            });
        }

        // Obter IP e User Agent para auditoria
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';

        await updatePermission(nivel_acesso, recurso, acao, permitido, req.user, ipAddress, userAgent);

        res.json({
            success: true,
            message: 'Permissão atualizada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar permissão:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

// POST /api/configuracoes/permissoes/lote - Atualizar múltiplas permissões
router.post('/permissoes/lote', [
    body('alteracoes').isArray().withMessage('Alterações deve ser um array'),
    body('alteracoes.*.nivel_acesso').isIn(['admin', 'usuario', 'visitante']).withMessage('Nível de acesso inválido'),
    body('alteracoes.*.recurso').notEmpty().withMessage('Recurso é obrigatório'),
    body('alteracoes.*.acao').notEmpty().withMessage('Ação é obrigatória'),
    body('alteracoes.*.permitido').isBoolean().withMessage('Permitido deve ser boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { alteracoes } = req.body;

        if (alteracoes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhuma alteração fornecida'
            });
        }

        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';

        // Processar todas as alterações
        for (const alteracao of alteracoes) {
            const { nivel_acesso, recurso, acao, permitido } = alteracao;
            await updatePermission(nivel_acesso, recurso, acao, permitido, req.user, ipAddress, userAgent);
        }

        res.json({
            success: true,
            message: `${alteracoes.length} permissões atualizadas com sucesso`
        });

    } catch (error) {
        console.error('Erro ao atualizar permissões em lote:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

// GET /api/configuracoes/usuarios - Listar usuários por nível de acesso
router.get('/usuarios', async (req, res) => {
    try {
        const usuarios = await query(`
            SELECT 
                nivel_acesso,
                COUNT(*) as total,
                GROUP_CONCAT(nome ORDER BY nome SEPARATOR ', ') as nomes
            FROM usuarios 
            WHERE ativo = TRUE
            GROUP BY nivel_acesso
            ORDER BY 
                CASE nivel_acesso 
                    WHEN 'admin_master' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'usuario' THEN 3
                    WHEN 'visitante' THEN 4
                END
        `);

        // Buscar estatísticas gerais
        const [stats] = await query(`
            SELECT 
                COUNT(*) as total_usuarios,
                COUNT(CASE WHEN ativo = TRUE THEN 1 END) as usuarios_ativos,
                COUNT(CASE WHEN ativo = FALSE THEN 1 END) as usuarios_inativos
            FROM usuarios
        `);

        res.json({
            success: true,
            data: {
                usuarios_por_nivel: usuarios,
                estatisticas: stats
            }
        });

    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/configuracoes/auditoria - Consultar log de auditoria
router.get('/auditoria', async (req, res) => {
    try {
        const { page = 1, limit = 20, nivel_acesso, recurso, acao, usuario_id } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (nivel_acesso) {
            whereClause += ' AND a.nivel_acesso = ?';
            params.push(nivel_acesso);
        }

        if (recurso) {
            whereClause += ' AND r.slug = ?';
            params.push(recurso);
        }

        if (acao) {
            whereClause += ' AND ac.slug = ?';
            params.push(acao);
        }

        if (usuario_id) {
            whereClause += ' AND a.usuario_id = ?';
            params.push(parseInt(usuario_id));
        }

        // Contar total de registros
        const [totalResult] = await query(`
            SELECT COUNT(*) as total 
            FROM auditoria_permissoes a
            JOIN recursos r ON r.id = a.recurso_id
            JOIN acoes ac ON ac.id = a.acao_id
            ${whereClause}
        `, params);

        // Buscar registros de auditoria
        const auditoria = await query(`
            SELECT 
                a.id,
                u.nome as usuario_nome,
                a.nivel_acesso,
                r.nome as recurso_nome,
                r.slug as recurso_slug,
                ac.nome as acao_nome,
                ac.slug as acao_slug,
                a.valor_anterior,
                a.valor_novo,
                a.ip_address,
                a.data_alteracao
            FROM auditoria_permissoes a
            JOIN usuarios u ON u.id = a.usuario_id
            JOIN recursos r ON r.id = a.recurso_id
            JOIN acoes ac ON ac.id = a.acao_id
            ${whereClause}
            ORDER BY a.data_alteracao DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        res.json({
            success: true,
            data: {
                auditoria,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalResult.total,
                    pages: Math.ceil(totalResult.total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar auditoria:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/configuracoes/cache/refresh - Forçar atualização do cache
router.post('/cache/refresh', async (req, res) => {
    try {
        const success = await refreshPermissionsCache();
        
        if (success) {
            res.json({
                success: true,
                message: 'Cache de permissões atualizado com sucesso'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar cache de permissões'
            });
        }
    } catch (error) {
        console.error('Erro ao forçar atualização do cache:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/configuracoes/recursos - Gerenciar recursos do sistema
router.get('/recursos', async (req, res) => {
    try {
        const recursos = await query(`
            SELECT 
                r.id,
                r.nome,
                r.descricao,
                r.slug,
                r.ativo,
                r.ordem,
                COUNT(p.id) as total_permissoes
            FROM recursos r
            LEFT JOIN permissoes p ON p.recurso_id = r.id
            GROUP BY r.id
            ORDER BY r.ordem, r.nome
        `);

        res.json({
            success: true,
            data: { recursos }
        });

    } catch (error) {
        console.error('Erro ao buscar recursos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/configuracoes/acoes - Gerenciar ações do sistema
router.get('/acoes', async (req, res) => {
    try {
        const acoes = await query(`
            SELECT 
                a.id,
                a.nome,
                a.descricao,
                a.slug,
                a.ativo,
                a.ordem,
                COUNT(p.id) as total_permissoes
            FROM acoes a
            LEFT JOIN permissoes p ON p.acao_id = a.id
            GROUP BY a.id
            ORDER BY a.ordem, a.nome
        `);

        res.json({
            success: true,
            data: { acoes }
        });

    } catch (error) {
        console.error('Erro ao buscar ações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router; 