const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { checkPageAccess, checkPermission } = require('../middleware/permissions');
const { extractTenant, requireTenant } = require('../middleware/tenant');

const router = express.Router();

// Middleware para todas as rotas
router.use(verifyToken, checkPageAccess('equipamentos'));
router.use(extractTenant, requireTenant);

// Validações
const equipamentoValidation = [
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('local_id').custom(value => {
        if (value === null || value === undefined || value === '') {
            throw new Error('Local é obrigatório');
        }
        if (isNaN(parseInt(value))) {
            throw new Error('Local deve ser um número válido');
        }
        return true;
    }),
    body('codigo').optional(),
    body('descricao').optional(),
    body('tipo').optional(),
    body('fabricante').optional(),
    body('modelo').optional(),
    body('numero_serie').optional(),
    body('data_instalacao').optional().custom(value => {
        if (value === null || value === undefined || value === '') return true;
        if (!isNaN(Date.parse(value))) return true;
        throw new Error('Data de instalação inválida');
    }),
    body('status_operacional').optional().isIn(['operando', 'manutencao', 'inativo']).withMessage('Status operacional inválido')
];

// GET /api/equipamentos - Listar todos os equipamentos
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', local_id, status_operacional, ativo, tipo } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        // Filtro de busca
        if (search) {
            whereClause += ' WHERE (e.nome LIKE ? OR e.codigo LIKE ? OR e.descricao LIKE ? OR e.fabricante LIKE ? OR e.modelo LIKE ?) AND e.tenant_id = ?';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, req.tenant_id);
        } else {
            whereClause += ' WHERE e.tenant_id = ?';
            params.push(req.tenant_id);
        }

        // Filtro por local
        if (local_id) {
            whereClause += ' AND e.local_id = ?';
            params.push(local_id);
        }

        // Filtro por status operacional
        if (status_operacional) {
            whereClause += ' AND e.status_operacional = ?';
            params.push(status_operacional);
        }

        // Filtro por tipo
        if (tipo) {
            whereClause += ' AND e.tipo LIKE ?';
            params.push(`%${tipo}%`);
        }

        // Filtro de status ativo
        if (ativo !== undefined) {
            whereClause += ' AND e.ativo = ?';
            params.push(ativo === 'true');
        }

        // Contar total de registros
        const [totalResult] = await query(
            `SELECT COUNT(*) as total 
             FROM equipamentos e 
             LEFT JOIN locais l ON e.local_id = l.id
             ${whereClause}`,
            params
        );
        const total = totalResult.total;

        // Buscar equipamentos
        const equipamentos = await query(
            `SELECT e.*, l.nome as local_nome,
                    COUNT(r.id) as total_relatorios
             FROM equipamentos e 
             LEFT JOIN locais l ON e.local_id = l.id
             LEFT JOIN relatorios r ON e.id = r.equipamento_id
             ${whereClause}
             GROUP BY e.id
             ORDER BY e.nome 
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            success: true,
            data: {
                equipamentos,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar equipamentos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/equipamentos/por-local/:localId - Listar equipamentos por local
router.get('/por-local/:localId', async (req, res) => {
    try {
        const { localId } = req.params;

        const equipamentos = await query(
            `SELECT id, nome, codigo, status_operacional 
             FROM equipamentos 
             WHERE local_id = ? AND ativo = true 
             ORDER BY nome`,
            [localId]
        );

        res.json({
            success: true,
            data: { equipamentos }
        });

    } catch (error) {
        console.error('Erro ao buscar equipamentos por local:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/equipamentos/por-local/:id - Buscar equipamentos por local
router.get('/por-local/:id', async (req, res) => {
    try {
        const { id: localId } = req.params;

        const equipamentos = await query(
            `SELECT id, nome, codigo 
             FROM equipamentos 
             WHERE local_id = ? AND ativo = true 
             ORDER BY nome`,
            [localId]
        );

        res.json({
            success: true,
            data: { equipamentos }
        });

    } catch (error) {
        console.error('Erro ao buscar equipamentos por local:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/equipamentos/:id - Buscar equipamento por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const equipamentos = await query(
            `SELECT e.*, l.nome as local_nome,
                    COUNT(r.id) as total_relatorios
             FROM equipamentos e 
             LEFT JOIN locais l ON e.local_id = l.id
             LEFT JOIN relatorios r ON e.id = r.equipamento_id
             WHERE e.id = ?
             GROUP BY e.id`,
            [id]
        );

        if (equipamentos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Equipamento não encontrado'
            });
        }

        res.json({
            success: true,
            data: { equipamento: equipamentos[0] }
        });

    } catch (error) {
        console.error('Erro ao buscar equipamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/equipamentos - Criar novo equipamento
router.post('/', checkPermission('equipamentos', 'criar'), equipamentoValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { 
            nome, 
            local_id, 
            codigo, 
            descricao, 
            tipo, 
            fabricante, 
            modelo, 
            numero_serie, 
            data_instalacao, 
            status_operacional 
        } = req.body;

        // Verificar se local existe
        const local = await query('SELECT id FROM locais WHERE id = ? AND ativo = true', [local_id]);
        if (local.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Local não encontrado ou inativo'
            });
        }

        // Verificar se código já existe (se fornecido)
        if (codigo) {
            const existingEquipamento = await query(
                'SELECT id FROM equipamentos WHERE codigo = ? AND ativo = true',
                [codigo]
            );

            if (existingEquipamento.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe um equipamento com este código'
                });
            }
        }

        // Inserir equipamento
        const result = await query(
            `INSERT INTO equipamentos 
             (nome, local_id, codigo, descricao, tipo, fabricante, modelo, numero_serie, data_instalacao, status_operacional) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome, 
                local_id, 
                codigo || null, 
                descricao || null, 
                tipo || null, 
                fabricante || null, 
                modelo || null, 
                numero_serie || null, 
                data_instalacao || null, 
                status_operacional || 'operando'
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Equipamento criado com sucesso',
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error('Erro ao criar equipamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// PUT /api/equipamentos/:id - Atualizar equipamento
router.put('/:id', checkPermission('equipamentos', 'editar'), equipamentoValidation, async (req, res) => {
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
        const { 
            nome, 
            local_id, 
            codigo, 
            descricao, 
            tipo, 
            fabricante, 
            modelo, 
            numero_serie, 
            data_instalacao, 
            status_operacional,
            ativo 
        } = req.body;

        // Verificar se equipamento existe
        const existingEquipamento = await query('SELECT id FROM equipamentos WHERE id = ?', [id]);
        if (existingEquipamento.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Equipamento não encontrado'
            });
        }

        // Verificar se local existe
        const local = await query('SELECT id FROM locais WHERE id = ? AND ativo = true', [local_id]);
        if (local.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Local não encontrado ou inativo'
            });
        }

        // Verificar se código já existe em outros equipamentos (se fornecido)
        if (codigo) {
            const duplicateEquipamento = await query(
                'SELECT id FROM equipamentos WHERE codigo = ? AND id != ? AND ativo = true',
                [codigo, id]
            );

            if (duplicateEquipamento.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe outro equipamento com este código'
                });
            }
        }

        // Atualizar equipamento
        await query(
            `UPDATE equipamentos SET 
             nome = ?, local_id = ?, codigo = ?, descricao = ?, tipo = ?, 
             fabricante = ?, modelo = ?, numero_serie = ?, data_instalacao = ?, 
             status_operacional = ?, ativo = ? 
             WHERE id = ?`,
            [
                nome, 
                local_id, 
                codigo || null, 
                descricao || null, 
                tipo || null, 
                fabricante || null, 
                modelo || null, 
                numero_serie || null, 
                data_instalacao || null, 
                status_operacional || 'operando',
                ativo !== undefined ? ativo : true,
                id
            ]
        );

        res.json({
            success: true,
            message: 'Equipamento atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar equipamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// DELETE /api/equipamentos/:id - Desativar equipamento
router.delete('/:id', checkPermission('equipamentos', 'excluir'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se equipamento existe
        const existingEquipamento = await query('SELECT id FROM equipamentos WHERE id = ?', [id]);
        if (existingEquipamento.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Equipamento não encontrado'
            });
        }

        // Verificar se há relatórios vinculados
        const relatorios = await query(
            'SELECT COUNT(*) as total FROM relatorios WHERE equipamento_id = ?',
            [id]
        );

        if (relatorios[0].total > 0) {
            return res.status(400).json({
                success: false,
                message: `Não é possível excluir este equipamento pois há ${relatorios[0].total} relatório(s) vinculado(s)`
            });
        }

        // Desativar equipamento (soft delete)
        await query('UPDATE equipamentos SET ativo = false WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Equipamento desativado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao desativar equipamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router; 