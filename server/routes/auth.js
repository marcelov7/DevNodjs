const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');

// Middleware de verificação simples para debug
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token não fornecido' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
    }
};

const router = express.Router();

// Validações
const loginValidation = [
    body('identifier').notEmpty().withMessage('Username ou email é obrigatório'),
    body('senha').isLength({ min: 1 }).withMessage('Senha é obrigatória')
];

// POST /api/auth/login - Login do usuário
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { identifier, senha } = req.body;

        // Buscar usuário por username ou email
        const usuarios = await query(
            'SELECT * FROM usuarios WHERE (username = ? OR email = ?) AND ativo = true',
            [identifier, identifier]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
        }

        const usuario = usuarios[0];

        // Verificar senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { 
                id: usuario.id,
                username: usuario.username,
                nivel_acesso: usuario.nivel_acesso
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Remover senha da resposta
        const { senha: _, ...usuarioSemSenha } = usuario;

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                usuario: usuarioSemSenha,
                token
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/auth/verify - Verificar token
router.post('/verify', verifyToken, async (req, res) => {
    try {
        // Buscar dados completos do usuário no banco
        const usuarios = await query(
            'SELECT id, nome, username, email, setor, nivel_acesso, ativo, data_criacao FROM usuarios WHERE id = ? AND ativo = true',
            [req.user.id]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        const usuario = usuarios[0];

        res.json({
            success: true,
            message: 'Token válido',
            data: {
                usuario
            }
        });
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/auth/logout - Logout (apenas frontend)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logout realizado com sucesso'
    });
});

// GET /api/auth/me - Dados do usuário logado
router.get('/me', verifyToken, async (req, res) => {
    try {
        // Buscar dados completos do usuário no banco
        const usuarios = await query(
            'SELECT id, nome, username, email, setor, nivel_acesso, ativo, data_criacao FROM usuarios WHERE id = ? AND ativo = true',
            [req.user.id]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        const usuario = usuarios[0];

        res.json({
            success: true,
            data: {
                usuario
            }
        });
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para buscar permissões do usuário autenticado
router.get('/permissions', verifyToken, async (req, res) => {
    try {
        const { nivel_acesso } = req.user;

        // Admin Master tem todas as permissões - será tratado no frontend
        if (nivel_acesso === 'admin_master') {
            return res.json({
                success: true,
                data: { permissoes: {} } // Vazio porque será preenchido no frontend
            });
        }

        // Buscar permissões específicas do nível do usuário
        const permissoesRaw = await query(`
            SELECT 
                CONCAT(r.slug, '.', a.slug) as chave,
                p.permitido
            FROM permissoes p
            JOIN recursos r ON r.id = p.recurso_id
            JOIN acoes a ON a.id = p.acao_id
            WHERE p.nivel_acesso = ?
        `, [nivel_acesso]);

        // Converter para objeto com boolean
        const permissoes = {};
        permissoesRaw.forEach(perm => {
            permissoes[perm.chave] = Boolean(perm.permitido);
        });

        console.log(`📋 Permissões enviadas para ${nivel_acesso}:`, Object.keys(permissoes).filter(k => permissoes[k]));

        res.json({
            success: true,
            data: { permissoes }
        });

    } catch (error) {
        console.error('Erro ao buscar permissões do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router; 