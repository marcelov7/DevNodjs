const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { checkPageAccess, checkPermission } = require('../middleware/permissions');
const { extractTenant, requireTenant } = require('../middleware/tenant');

const router = express.Router();

// Middleware para acesso à página de locais
router.use(verifyToken, checkPageAccess('locais'));
router.use(extractTenant, requireTenant);

// Validações
const localValidation = [
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('descricao').optional().custom(value => {
        if (value === null || value === undefined || value === '') return true;
        return true;
    }),
    body('endereco').optional().custom(value => {
        if (value === null || value === undefined || value === '') return true;
        return true;
    })
];

// GET /api/locais - Listar todos os locais
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', ativo } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        // Filtro de busca
        if (search) {
            whereClause += ' WHERE (l.nome LIKE ? OR l.descricao LIKE ? OR l.endereco LIKE ?) AND l.tenant_id = ?';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, req.tenant_id);
        } else {
            whereClause += ' WHERE l.tenant_id = ?';
            params.push(req.tenant_id);
        }

        // Filtro de status ativo
        if (ativo !== undefined) {
            whereClause += ' AND l.ativo = ?';
            params.push(ativo === 'true');
        }

        // Contar total de registros
        const [totalResult] = await query(
            `SELECT COUNT(*) as total FROM locais l${whereClause}`,
            params
        );
        const total = totalResult.total;

        // Buscar locais
        const locais = await query(
            `SELECT l.*, 
                    COUNT(e.id) as total_equipamentos
             FROM locais l 
             LEFT JOIN equipamentos e ON l.id = e.local_id AND e.ativo = true AND e.tenant_id = l.tenant_id
             ${whereClause}
             GROUP BY l.id
             ORDER BY l.nome 
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            success: true,
            data: {
                locais,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar locais:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/locais/simples - Listar locais para select (apenas ativos)
router.get('/simples', async (req, res) => {
    try {
        const locais = await query(
            'SELECT id, nome FROM locais WHERE ativo = true AND tenant_id = ? ORDER BY nome',
            [req.tenant_id]
        );

        res.json({
            success: true,
            data: { locais }
        });

    } catch (error) {
        console.error('Erro ao buscar locais:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/locais/:id - Buscar local por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const locais = await query(
            `SELECT l.*, 
                    COUNT(e.id) as total_equipamentos
             FROM locais l 
             LEFT JOIN equipamentos e ON l.id = e.local_id AND e.ativo = true
             WHERE l.id = ?
             GROUP BY l.id`,
            [id]
        );

        if (locais.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Local não encontrado'
            });
        }

        res.json({
            success: true,
            data: { local: locais[0] }
        });

    } catch (error) {
        console.error('Erro ao buscar local:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/locais - Criar novo local
router.post('/', checkPermission('locais', 'criar'), localValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { nome, descricao, endereco } = req.body;

        // Verificar se nome já existe
        const existingLocal = await query(
            'SELECT id FROM locais WHERE nome = ? AND ativo = true',
            [nome]
        );

        if (existingLocal.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Já existe um local com este nome'
            });
        }

        // Inserir local
        const result = await query(
            'INSERT INTO locais (nome, descricao, endereco) VALUES (?, ?, ?)',
            [nome, descricao || null, endereco || null]
        );

        res.status(201).json({
            success: true,
            message: 'Local criado com sucesso',
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error('Erro ao criar local:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// PUT /api/locais/:id - Atualizar local
router.put('/:id', checkPermission('locais', 'editar'), localValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { nome, descricao, endereco, ativo } = req.body;

        // Verificar se local existe
        const existingLocal = await query('SELECT id FROM locais WHERE id = ?', [id]);
        if (existingLocal.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Local não encontrado'
            });
        }

        // Verificar se nome já existe em outros locais
        const duplicateLocal = await query(
            'SELECT id FROM locais WHERE nome = ? AND id != ? AND ativo = true',
            [nome, id]
        );

        if (duplicateLocal.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Já existe outro local com este nome'
            });
        }

        // Atualizar local
        await query(
            'UPDATE locais SET nome = ?, descricao = ?, endereco = ?, ativo = ? WHERE id = ?',
            [nome, descricao || null, endereco || null, ativo !== undefined ? ativo : true, id]
        );

        res.json({
            success: true,
            message: 'Local atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar local:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// DELETE /api/locais/:id - Desativar local
router.delete('/:id', checkPermission('locais', 'excluir'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se local existe
        const existingLocal = await query('SELECT id FROM locais WHERE id = ?', [id]);
        if (existingLocal.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Local não encontrado'
            });
        }

        // Verificar se há equipamentos vinculados
        const equipamentos = await query(
            'SELECT COUNT(*) as total FROM equipamentos WHERE local_id = ? AND ativo = true',
            [id]
        );

        if (equipamentos[0].total > 0) {
            return res.status(400).json({
                success: false,
                message: `Não é possível excluir este local pois há ${equipamentos[0].total} equipamento(s) vinculado(s)`
            });
        }

        // Desativar local (soft delete)
        await query('UPDATE locais SET ativo = false WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Local desativado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao desativar local:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router; 