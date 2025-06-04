const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Validações
const setorValidation = [
    body('nome_setor').notEmpty().withMessage('Nome do setor é obrigatório'),
    body('descricao').optional().isLength({ max: 500 }).withMessage('Descrição deve ter no máximo 500 caracteres')
];

// GET /api/setores - Listar todos os setores
router.get('/', verifyToken, async (req, res) => {
    try {
        const setores = await query(
            `SELECT id, nome_setor, descricao, ativo, data_criacao, data_atualizacao 
             FROM setores 
             WHERE tenant_id = ? 
             ORDER BY nome_setor ASC`,
            [req.tenant_id]
        );

        res.json({
            success: true,
            data: setores
        });

    } catch (error) {
        console.error('Erro ao buscar setores:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/setores/:id - Buscar setor específico
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const setores = await query(
            'SELECT id, nome_setor, descricao, ativo, data_criacao, data_atualizacao FROM setores WHERE id = ? AND tenant_id = ?',
            [id, req.tenant_id]
        );

        if (setores.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setor não encontrado'
            });
        }

        res.json({
            success: true,
            data: setores[0]
        });

    } catch (error) {
        console.error('Erro ao buscar setor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/setores - Criar novo setor (apenas admin_master)
router.post('/', verifyToken, requirePermission(['admin_master']), setorValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { nome_setor, descricao } = req.body;

        // Verificar se já existe um setor com este nome
        const setorExistente = await query(
            'SELECT id FROM setores WHERE nome_setor = ? AND tenant_id = ?',
            [nome_setor, req.tenant_id]
        );

        if (setorExistente.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Já existe um setor com este nome'
            });
        }

        const resultado = await query(
            'INSERT INTO setores (nome_setor, descricao, tenant_id) VALUES (?, ?, ?)',
            [nome_setor, descricao || null, req.tenant_id]
        );

        res.status(201).json({
            success: true,
            message: 'Setor criado com sucesso',
            data: {
                id: resultado.insertId,
                nome_setor,
                descricao
            }
        });

    } catch (error) {
        console.error('Erro ao criar setor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// PUT /api/setores/:id - Atualizar setor (apenas admin_master)
router.put('/:id', verifyToken, requirePermission(['admin_master']), setorValidation, async (req, res) => {
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
        const { nome_setor, descricao, ativo } = req.body;

        // Verificar se o setor existe
        const setorExistente = await query(
            'SELECT id FROM setores WHERE id = ? AND tenant_id = ?',
            [id, req.tenant_id]
        );

        if (setorExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setor não encontrado'
            });
        }

        // Verificar se já existe outro setor com este nome
        const nomeConflito = await query(
            'SELECT id FROM setores WHERE nome_setor = ? AND id != ? AND tenant_id = ?',
            [nome_setor, id, req.tenant_id]
        );

        if (nomeConflito.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Já existe outro setor com este nome'
            });
        }

        await query(
            'UPDATE setores SET nome_setor = ?, descricao = ?, ativo = ? WHERE id = ? AND tenant_id = ?',
            [nome_setor, descricao || null, ativo !== undefined ? ativo : true, id, req.tenant_id]
        );

        res.json({
            success: true,
            message: 'Setor atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar setor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// DELETE /api/setores/:id - Excluir setor (apenas admin_master)
router.delete('/:id', verifyToken, requirePermission(['admin_master']), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se o setor existe
        const setorExistente = await query(
            'SELECT id, nome_setor FROM setores WHERE id = ? AND tenant_id = ?',
            [id, req.tenant_id]
        );

        if (setorExistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setor não encontrado'
            });
        }

        // Verificar se existem usuários vinculados a este setor
        const usuariosVinculados = await query(
            'SELECT COUNT(*) as total FROM usuarios WHERE setor = ? AND tenant_id = ?',
            [setorExistente[0].nome_setor, req.tenant_id]
        );

        if (usuariosVinculados[0].total > 0) {
            return res.status(400).json({
                success: false,
                message: `Não é possível excluir este setor pois existem ${usuariosVinculados[0].total} usuário(s) vinculado(s) a ele`
            });
        }

        await query(
            'DELETE FROM setores WHERE id = ? AND tenant_id = ?',
            [id, req.tenant_id]
        );

        res.json({
            success: true,
            message: 'Setor excluído com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir setor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/setores/:id/usuarios - Listar usuários de um setor
router.get('/:id/usuarios', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar o setor
        const setores = await query(
            'SELECT nome_setor FROM setores WHERE id = ? AND tenant_id = ?',
            [id, req.tenant_id]
        );

        if (setores.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setor não encontrado'
            });
        }

        // Buscar usuários do setor
        const usuarios = await query(
            `SELECT id, nome, username, email, nivel_acesso, ativo, data_criacao 
             FROM usuarios 
             WHERE setor = ? AND tenant_id = ? 
             ORDER BY nome ASC`,
            [setores[0].nome_setor, req.tenant_id]
        );

        res.json({
            success: true,
            data: {
                setor: setores[0],
                usuarios
            }
        });

    } catch (error) {
        console.error('Erro ao buscar usuários do setor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/setores/dropdown/ativos - Listar setores ativos para dropdown
router.get('/dropdown/ativos', verifyToken, async (req, res) => {
    try {
        const setores = await query(
            `SELECT id, nome_setor 
             FROM setores 
             WHERE ativo = 1 AND tenant_id = ? 
             ORDER BY nome_setor ASC`,
            [req.tenant_id]
        );

        res.json({
            success: true,
            data: setores
        });

    } catch (error) {
        console.error('Erro ao buscar setores ativos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router; 