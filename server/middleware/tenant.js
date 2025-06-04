const { query } = require('../config/database');

// Middleware para extrair e validar tenant
const extractTenant = async (req, res, next) => {
    try {
        // 1. Extrair tenant do usuário autenticado
        if (req.user && req.user.tenant_id) {
            req.tenant_id = req.user.tenant_id;
        }
        // 2. Alternativamente, extrair do subdomain ou header
        else if (req.get('X-Tenant-ID')) {
            req.tenant_id = parseInt(req.get('X-Tenant-ID'));
        }
        // 3. Ou do subdomain
        else if (req.hostname !== 'localhost' && !req.hostname.includes('127.0.0.1')) {
            const subdomain = req.hostname.split('.')[0];
            const [org] = await query('SELECT id FROM organizacoes WHERE slug = ? AND ativo = true', [subdomain]);
            if (org) {
                req.tenant_id = org.id;
            }
        }

        // Validar se tenant existe e está ativo
        if (req.tenant_id) {
            const [organizacao] = await query(`
                SELECT id, nome, slug, ativo, suspenso, plano, 
                       max_usuarios, max_relatorios_mes, max_equipamentos
                FROM organizacoes 
                WHERE id = ?
            `, [req.tenant_id]);

            if (!organizacao) {
                return res.status(404).json({
                    success: false,
                    message: 'Organização não encontrada'
                });
            }

            if (!organizacao.ativo || organizacao.suspenso) {
                return res.status(403).json({
                    success: false,
                    message: 'Organização inativa ou suspensa'
                });
            }

            req.organizacao = organizacao;
        }

        next();
    } catch (error) {
        console.error('Erro no middleware de tenant:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Middleware para garantir que tenant seja obrigatório
const requireTenant = (req, res, next) => {
    if (!req.tenant_id) {
        return res.status(400).json({
            success: false,
            message: 'Tenant não especificado'
        });
    }
    next();
};

// Middleware para verificar limites do plano
const checkPlanLimits = (resource) => {
    return async (req, res, next) => {
        try {
            if (!req.organizacao) {
                return next();
            }

            const { plano, max_usuarios, max_relatorios_mes, max_equipamentos } = req.organizacao;

            let currentCount = 0;
            let limit = 0;

            switch (resource) {
                case 'usuarios':
                    [{ count: currentCount }] = await query(
                        'SELECT COUNT(*) as count FROM usuarios WHERE tenant_id = ? AND ativo = true',
                        [req.tenant_id]
                    );
                    limit = max_usuarios;
                    break;

                case 'equipamentos':
                    [{ count: currentCount }] = await query(
                        'SELECT COUNT(*) as count FROM equipamentos WHERE tenant_id = ? AND ativo = true',
                        [req.tenant_id]
                    );
                    limit = max_equipamentos;
                    break;

                case 'relatorios':
                    [{ count: currentCount }] = await query(
                        'SELECT COUNT(*) as count FROM relatorios WHERE tenant_id = ? AND MONTH(data_criacao) = MONTH(CURRENT_DATE())',
                        [req.tenant_id]
                    );
                    limit = max_relatorios_mes;
                    break;
            }

            if (currentCount >= limit) {
                return res.status(403).json({
                    success: false,
                    message: `Limite do plano ${plano} atingido para ${resource}`,
                    data: {
                        current: currentCount,
                        limit: limit,
                        resource: resource
                    }
                });
            }

            next();
        } catch (error) {
            console.error('Erro ao verificar limites do plano:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    };
};

// Função helper para adicionar tenant_id em queries
const addTenantToQuery = (baseQuery, tenantId, alias = '') => {
    const tableAlias = alias ? `${alias}.` : '';
    
    if (baseQuery.toLowerCase().includes('where')) {
        return `${baseQuery} AND ${tableAlias}tenant_id = ${tenantId}`;
    } else {
        return `${baseQuery} WHERE ${tableAlias}tenant_id = ${tenantId}`;
    }
};

// Função para query com tenant automático
const tenantQuery = async (sql, params = [], tenantId) => {
    // Adicionar tenant_id automaticamente se a query não incluir
    if (!sql.toLowerCase().includes('tenant_id') && tenantId) {
        sql = addTenantToQuery(sql, tenantId);
    }
    
    return query(sql, params);
};

// Middleware para auditoria de ações
const auditAction = (action, entity) => {
    return async (req, res, next) => {
        const originalSend = res.json;
        
        res.json = function(data) {
            // Log da ação se foi bem-sucedida
            if (data.success !== false && req.tenant_id) {
                const auditData = {
                    tenant_id: req.tenant_id,
                    usuario_id: req.user?.id || null,
                    acao: action,
                    entidade: entity,
                    entidade_id: data.data?.id || req.params?.id || null,
                    dados_novos: req.method === 'POST' || req.method === 'PUT' ? req.body : null,
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.get('User-Agent')
                };

                // Inserir auditoria de forma assíncrona
                query(`
                    INSERT INTO auditoria_tenant 
                    (tenant_id, usuario_id, acao, entidade, entidade_id, dados_novos, ip_address, user_agent)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    auditData.tenant_id,
                    auditData.usuario_id,
                    auditData.acao,
                    auditData.entidade,
                    auditData.entidade_id,
                    auditData.dados_novos ? JSON.stringify(auditData.dados_novos) : null,
                    auditData.ip_address,
                    auditData.user_agent
                ]).catch(error => {
                    console.error('Erro ao salvar auditoria:', error);
                });
            }

            originalSend.call(this, data);
        };

        next();
    };
};

// Middleware para verificar se recurso está habilitado
const checkResourceEnabled = (resource) => {
    return (req, res, next) => {
        if (!req.organizacao) {
            return next();
        }

        const recursos = req.organizacao.recursos_habilitados || [];
        
        if (!recursos.includes(resource)) {
            return res.status(403).json({
                success: false,
                message: `Recurso '${resource}' não habilitado para sua organização`
            });
        }

        next();
    };
};

module.exports = {
    extractTenant,
    requireTenant,
    checkPlanLimits,
    addTenantToQuery,
    tenantQuery,
    auditAction,
    checkResourceEnabled
}; 