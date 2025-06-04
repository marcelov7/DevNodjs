const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken, adminMaster } = require('../middleware/auth');
const { extractTenant, checkPlanLimits, auditAction } = require('../middleware/tenant');
const crypto = require('crypto');

const router = express.Router();

// Aplicar middlewares globais
router.use(verifyToken);
router.use(extractTenant);

// Validações
const organizacaoValidation = [
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('slug').isSlug().withMessage('Slug deve conter apenas letras, números e hífens'),
    body('email_contato').isEmail().withMessage('Email inválido'),
    body('plano').isIn(['basico', 'profissional', 'empresarial', 'enterprise']).withMessage('Plano inválido')
];

// GET /api/organizacoes - Listar organizações (apenas admin_master)
router.get('/', adminMaster, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', plano, ativo } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        if (search) {
            whereClause += ' WHERE (nome LIKE ? OR slug LIKE ? OR email_contato LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (plano) {
            const connector = whereClause ? ' AND' : ' WHERE';
            whereClause += `${connector} plano = ?`;
            params.push(plano);
        }

        if (ativo !== undefined) {
            const connector = whereClause ? ' AND' : ' WHERE';
            whereClause += `${connector} ativo = ?`;
            params.push(ativo === 'true');
        }

        // Contar total
        const [totalResult] = await query(
            `SELECT COUNT(*) as total FROM organizacoes${whereClause}`,
            params
        );

        // Buscar organizações com estatísticas
        const organizacoes = await query(`
            SELECT 
                o.*,
                (SELECT COUNT(*) FROM usuarios WHERE tenant_id = o.id AND ativo = true) as total_usuarios,
                (SELECT COUNT(*) FROM equipamentos WHERE tenant_id = o.id AND ativo = true) as total_equipamentos,
                (SELECT COUNT(*) FROM relatorios WHERE tenant_id = o.id 
                 AND MONTH(data_criacao) = MONTH(CURRENT_DATE())) as relatorios_mes
            FROM organizacoes o
            ${whereClause}
            ORDER BY o.data_criacao DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        res.json({
            success: true,
            data: {
                organizacoes,
                totalPaginas: Math.ceil(totalResult.total / limit),
                paginaAtual: parseInt(page),
                totalOrganizacoes: totalResult.total
            }
        });

    } catch (error) {
        console.error('Erro ao buscar organizações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/organizacoes/current - Buscar organização atual
router.get('/current', async (req, res) => {
    try {
        if (!req.tenant_id) {
            return res.status(400).json({
                success: false,
                message: 'Tenant não especificado'
            });
        }

        const [organizacao] = await query(`
            SELECT 
                o.*,
                (SELECT COUNT(*) FROM usuarios WHERE tenant_id = o.id AND ativo = true) as total_usuarios,
                (SELECT COUNT(*) FROM equipamentos WHERE tenant_id = o.id AND ativo = true) as total_equipamentos,
                (SELECT COUNT(*) FROM relatorios WHERE tenant_id = o.id 
                 AND MONTH(data_criacao) = MONTH(CURRENT_DATE())) as relatorios_mes,
                (SELECT COUNT(*) FROM locais WHERE tenant_id = o.id AND ativo = true) as total_locais
            FROM organizacoes o
            WHERE o.id = ?
        `, [req.tenant_id]);

        if (!organizacao) {
            return res.status(404).json({
                success: false,
                message: 'Organização não encontrada'
            });
        }

        res.json({
            success: true,
            data: { organizacao }
        });

    } catch (error) {
        console.error('Erro ao buscar organização atual:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/organizacoes - Criar nova organização (apenas admin_master)
router.post('/', 
    adminMaster, 
    organizacaoValidation,
    auditAction('CRIAR_ORGANIZACAO', 'organizacoes'),
    async (req, res) => {
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
                nome, slug, cnpj, email_contato, telefone, endereco, 
                plano = 'basico', recursos_habilitados 
            } = req.body;

            // Verificar se slug já existe
            const [existingOrg] = await query(
                'SELECT id FROM organizacoes WHERE slug = ?',
                [slug]
            );

            if (existingOrg) {
                return res.status(400).json({
                    success: false,
                    message: 'Slug já está em uso'
                });
            }

            // Definir limites baseado no plano
            const limites = {
                basico: { usuarios: 5, relatorios: 50, equipamentos: 25 },
                profissional: { usuarios: 15, relatorios: 200, equipamentos: 100 },
                empresarial: { usuarios: 50, relatorios: 1000, equipamentos: 500 },
                enterprise: { usuarios: 999, relatorios: 9999, equipamentos: 999 }
            };

            const limite = limites[plano];

            // Criar organização
            const result = await query(`
                INSERT INTO organizacoes 
                (nome, slug, cnpj, email_contato, telefone, endereco, plano, 
                 max_usuarios, max_relatorios_mes, max_equipamentos, recursos_habilitados)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                nome, slug, cnpj, email_contato, telefone, endereco, plano,
                limite.usuarios, limite.relatorios, limite.equipamentos,
                JSON.stringify(recursos_habilitados || ['relatorios', 'equipamentos', 'usuarios'])
            ]);

            const tenantId = result.insertId;

            // Criar local padrão
            await query(`
                INSERT INTO locais (tenant_id, nome, descricao)
                VALUES (?, 'Sede Principal', 'Local padrão da organização')
            `, [tenantId]);

            res.status(201).json({
                success: true,
                message: 'Organização criada com sucesso',
                data: { id: tenantId, slug }
            });

        } catch (error) {
            console.error('Erro ao criar organização:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
);

// PUT /api/organizacoes/:id - Atualizar organização
router.put('/:id', 
    auditAction('ATUALIZAR_ORGANIZACAO', 'organizacoes'),
    async (req, res) => {
        try {
            const { id } = req.params;
            
            // Verificar permissões
            const isAdminMaster = req.user.nivel_acesso === 'admin_master';
            const isOwnOrg = parseInt(id) === req.tenant_id && req.user.nivel_acesso === 'admin';

            if (!isAdminMaster && !isOwnOrg) {
                return res.status(403).json({
                    success: false,
                    message: 'Sem permissão para atualizar esta organização'
                });
            }

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: errors.array()
                });
            }

            // Buscar organização existente
            const [orgExistente] = await query(
                'SELECT * FROM organizacoes WHERE id = ?',
                [id]
            );

            if (!orgExistente) {
                return res.status(404).json({
                    success: false,
                    message: 'Organização não encontrada'
                });
            }

            const updateFields = [];
            const updateValues = [];

            // Campos que admin pode alterar da própria organização
            const camposAdmin = ['nome', 'telefone', 'endereco', 'configuracoes'];
            // Campos que apenas admin_master pode alterar
            const camposAdminMaster = ['slug', 'cnpj', 'email_contato', 'plano', 'max_usuarios', 'max_relatorios_mes', 'max_equipamentos', 'recursos_habilitados', 'ativo', 'suspenso'];

            Object.keys(req.body).forEach(key => {
                if (camposAdmin.includes(key) || (isAdminMaster && camposAdminMaster.includes(key))) {
                    updateFields.push(`${key} = ?`);
                    if (key === 'configuracoes' || key === 'recursos_habilitados') {
                        updateValues.push(JSON.stringify(req.body[key]));
                    } else {
                        updateValues.push(req.body[key]);
                    }
                }
            });

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nenhum campo válido para atualização'
                });
            }

            updateValues.push(id);

            await query(`
                UPDATE organizacoes 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            res.json({
                success: true,
                message: 'Organização atualizada com sucesso'
            });

        } catch (error) {
            console.error('Erro ao atualizar organização:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
);

// POST /api/organizacoes/:id/suspend - Suspender organização (apenas admin_master)
router.post('/:id/suspend', 
    adminMaster,
    auditAction('SUSPENDER_ORGANIZACAO', 'organizacoes'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { motivo } = req.body;

            await query(`
                UPDATE organizacoes 
                SET suspenso = true, motivo_suspensao = ?
                WHERE id = ?
            `, [motivo, id]);

            res.json({
                success: true,
                message: 'Organização suspensa com sucesso'
            });

        } catch (error) {
            console.error('Erro ao suspender organização:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
);

// POST /api/organizacoes/:id/reactivate - Reativar organização (apenas admin_master)
router.post('/:id/reactivate', 
    adminMaster,
    auditAction('REATIVAR_ORGANIZACAO', 'organizacoes'),
    async (req, res) => {
        try {
            const { id } = req.params;

            await query(`
                UPDATE organizacoes 
                SET suspenso = false, motivo_suspensao = NULL
                WHERE id = ?
            `, [id]);

            res.json({
                success: true,
                message: 'Organização reativada com sucesso'
            });

        } catch (error) {
            console.error('Erro ao reativar organização:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
);

// GET /api/organizacoes/:id/stats - Estatísticas da organização
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar permissões
        const isAdminMaster = req.user.nivel_acesso === 'admin_master';
        const isOwnOrg = parseInt(id) === req.tenant_id;

        if (!isAdminMaster && !isOwnOrg) {
            return res.status(403).json({
                success: false,
                message: 'Sem permissão para ver estatísticas desta organização'
            });
        }

        const stats = await query(`
            SELECT 
                'usuarios' as categoria,
                COUNT(*) as total,
                COUNT(CASE WHEN ativo = true THEN 1 END) as ativos,
                COUNT(CASE WHEN data_criacao >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as novos_mes
            FROM usuarios WHERE tenant_id = ?
            
            UNION ALL
            
            SELECT 
                'equipamentos' as categoria,
                COUNT(*) as total,
                COUNT(CASE WHEN ativo = true THEN 1 END) as ativos,
                COUNT(CASE WHEN data_criacao >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as novos_mes
            FROM equipamentos WHERE tenant_id = ?
            
            UNION ALL
            
            SELECT 
                'relatorios' as categoria,
                COUNT(*) as total,
                COUNT(CASE WHEN status != 'resolvido' THEN 1 END) as ativos,
                COUNT(CASE WHEN data_criacao >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as novos_mes
            FROM relatorios WHERE tenant_id = ?
        `, [id, id, id]);

        res.json({
            success: true,
            data: { stats }
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/organizacoes/invite-user - Convidar usuário para organização
router.post('/invite-user',
    checkPlanLimits('usuarios'),
    auditAction('CONVIDAR_USUARIO', 'usuario_convites'),
    async (req, res) => {
        try {
            const { email, nivel_acesso = 'usuario' } = req.body;

            if (!req.tenant_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenant não especificado'
                });
            }

            // Verificar se usuário já existe na organização
            const [usuarioExistente] = await query(
                'SELECT id FROM usuarios WHERE email = ? AND tenant_id = ?',
                [email, req.tenant_id]
            );

            if (usuarioExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuário já faz parte desta organização'
                });
            }

            // Verificar convites pendentes
            const [convitePendente] = await query(
                'SELECT id FROM usuario_convites WHERE email = ? AND tenant_id = ? AND usado = false AND data_expiracao > NOW()',
                [email, req.tenant_id]
            );

            if (convitePendente) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe um convite pendente para este email'
                });
            }

            // Gerar token único
            const token = crypto.randomBytes(32).toString('hex');
            const dataExpiracao = new Date();
            dataExpiracao.setDate(dataExpiracao.getDate() + 7); // 7 dias

            // Criar convite
            const result = await query(`
                INSERT INTO usuario_convites 
                (tenant_id, email, token, nivel_acesso, convidado_por, data_expiracao)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [req.tenant_id, email, token, nivel_acesso, req.user.id, dataExpiracao]);

            // Aqui você pode integrar com serviço de email
            console.log(`📧 Convite criado para ${email} - Token: ${token}`);

            res.status(201).json({
                success: true,
                message: 'Convite enviado com sucesso',
                data: { 
                    convite_id: result.insertId,
                    token // Em produção, remover este campo e enviar apenas por email
                }
            });

        } catch (error) {
            console.error('Erro ao convidar usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }
);

module.exports = router; 