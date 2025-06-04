const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { checkPageAccess, checkPermission } = require('../middleware/permissions');
const { extractTenant, requireTenant } = require('../middleware/tenant');

const router = express.Router();

// Middleware para todas as rotas - ORDEM IMPORTANTE!
// Verificar acesso à página de usuários primeiro
router.use(verifyToken, checkPageAccess('usuarios'));
router.use(extractTenant, requireTenant);

// Validações
const usuarioValidation = [
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('username').isLength({ min: 3 }).withMessage('Username deve ter pelo menos 3 caracteres'),
    body('email').isEmail().withMessage('Email inválido'),
    body('setor').notEmpty().withMessage('Setor é obrigatório'),
    body('nivel_acesso').isIn(['admin_master', 'admin', 'usuario', 'visitante']).withMessage('Nível de acesso inválido')
];

// GET /api/usuarios - Listar todos os usuários
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', ativo } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        // Filtro de busca com tenant_id
        if (search) {
            whereClause += ' WHERE (nome LIKE ? OR username LIKE ? OR email LIKE ?) AND tenant_id = ?';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, req.tenant_id);
        } else {
            whereClause += ' WHERE tenant_id = ?';
            params.push(req.tenant_id);
        }

        // Filtro de status ativo
        if (ativo !== undefined) {
            whereClause += ' AND ativo = ?';
            params.push(ativo === 'true');
        }

        // Contar total de registros
        const [totalResult] = await query(
            `SELECT COUNT(*) as total FROM usuarios${whereClause}`,
            params
        );
        const total = totalResult.total;

        // Buscar usuários filtrados por tenant_id
        const usuarios = await query(
            `SELECT id, nome, username, email, setor, nivel_acesso, ativo, data_criacao, data_atualizacao 
             FROM usuarios${whereClause} 
             ORDER BY nome 
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            success: true,
            data: {
                usuarios,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
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

// GET /api/usuarios/:id - Buscar usuário por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const usuarios = await query(
            'SELECT id, nome, username, email, setor, nivel_acesso, ativo, data_criacao, data_atualizacao FROM usuarios WHERE id = ? AND tenant_id = ?',
            [id, req.tenant_id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        res.json({
            success: true,
            data: { usuario: usuarios[0] }
        });

    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/usuarios - Criar novo usuário
router.post('/', checkPermission('usuarios', 'criar'), usuarioValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { nome, username, email, senha, setor, nivel_acesso } = req.body;

        // Verificar se username ou email já existem na mesma organização
        const existingUser = await query(
            'SELECT id FROM usuarios WHERE (username = ? OR email = ?) AND tenant_id = ?',
            [username, email, req.tenant_id]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username ou email já estão em uso nesta organização'
            });
        }

        // Verificar permissões: apenas admin_master pode criar outros admin_master
        if (nivel_acesso === 'admin_master' && req.user.nivel_acesso !== 'admin_master') {
            return res.status(403).json({
                success: false,
                message: 'Apenas Admin Master pode criar outros Admin Master'
            });
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash(senha || 'password', 10);

        // Inserir usuário com tenant_id
        const result = await query(
            'INSERT INTO usuarios (nome, username, email, senha, setor, nivel_acesso, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome, username, email, senhaHash, setor, nivel_acesso, req.tenant_id]
        );

        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// PUT /api/usuarios/:id - Atualizar usuário
router.put('/:id', checkPermission('usuarios', 'editar'), usuarioValidation, async (req, res) => {
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
        const { nome, username, email, setor, nivel_acesso, ativo } = req.body;

        // Verificar se usuário existe na mesma organização
        const existingUser = await query('SELECT id, nivel_acesso FROM usuarios WHERE id = ? AND tenant_id = ?', [id, req.tenant_id]);
        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Verificar permissões: apenas admin_master pode alterar admin_master
        if (existingUser[0].nivel_acesso === 'admin_master' && req.user.nivel_acesso !== 'admin_master') {
            return res.status(403).json({
                success: false,
                message: 'Apenas Admin Master pode alterar outros Admin Master'
            });
        }

        // Verificar permissões: apenas admin_master pode criar admin_master
        if (nivel_acesso === 'admin_master' && req.user.nivel_acesso !== 'admin_master') {
            return res.status(403).json({
                success: false,
                message: 'Apenas Admin Master pode promover usuários para Admin Master'
            });
        }

        // Verificar se username ou email já existem em outros usuários da mesma organização
        const duplicateUser = await query(
            'SELECT id FROM usuarios WHERE (username = ? OR email = ?) AND id != ? AND tenant_id = ?',
            [username, email, id, req.tenant_id]
        );

        if (duplicateUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username ou email já estão em uso por outro usuário desta organização'
            });
        }

        // Atualizar usuário
        await query(
            'UPDATE usuarios SET nome = ?, username = ?, email = ?, setor = ?, nivel_acesso = ?, ativo = ? WHERE id = ? AND tenant_id = ?',
            [nome, username, email, setor, nivel_acesso, ativo, id, req.tenant_id]
        );

        res.json({
            success: true,
            message: 'Usuário atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// PUT /api/usuarios/:id/senha - Alterar senha do usuário
router.put('/:id/senha', checkPermission('usuarios', 'editar'), [
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
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

        const { id } = req.params;
        const { senha } = req.body;

        // Verificar se usuário existe na mesma organização
        const existingUser = await query('SELECT id, nivel_acesso FROM usuarios WHERE id = ? AND tenant_id = ?', [id, req.tenant_id]);
        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Verificar permissões: apenas admin_master pode alterar senha de admin_master
        if (existingUser[0].nivel_acesso === 'admin_master' && req.user.nivel_acesso !== 'admin_master') {
            return res.status(403).json({
                success: false,
                message: 'Apenas Admin Master pode alterar senha de outros Admin Master'
            });
        }

        // Hash da nova senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Atualizar senha
        await query('UPDATE usuarios SET senha = ? WHERE id = ? AND tenant_id = ?', [senhaHash, id, req.tenant_id]);

        res.json({
            success: true,
            message: 'Senha atualizada com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar senha:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// DELETE /api/usuarios/:id - Desativar usuário (soft delete)
router.delete('/:id', checkPermission('usuarios', 'excluir'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se usuário existe na mesma organização
        const existingUser = await query('SELECT id, nivel_acesso FROM usuarios WHERE id = ? AND tenant_id = ?', [id, req.tenant_id]);
        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Não permitir desativar o próprio usuário
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível desativar o próprio usuário'
            });
        }

        // Verificar permissões: apenas admin_master pode desativar admin_master
        if (existingUser[0].nivel_acesso === 'admin_master' && req.user.nivel_acesso !== 'admin_master') {
            return res.status(403).json({
                success: false,
                message: 'Apenas Admin Master pode desativar outros Admin Master'
            });
        }

        // Desativar usuário (soft delete)
        await query('UPDATE usuarios SET ativo = false WHERE id = ? AND tenant_id = ?', [id, req.tenant_id]);

        res.json({
            success: true,
            message: 'Usuário desativado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao desativar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router; 