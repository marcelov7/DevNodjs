const { query } = require('../config/database');

/**
 * Cache de permissões em memória para melhor performance
 * Estrutura: { nivel_acesso: { 'recurso.acao': boolean } }
 */
let permissionsCache = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Carrega todas as permissões do banco e monta o cache
 */
const loadPermissionsCache = async () => {
    try {
        const permissions = await query(`
            SELECT 
                p.nivel_acesso,
                r.slug as recurso,
                a.slug as acao,
                p.permitido
            FROM permissoes p
            JOIN recursos r ON r.id = p.recurso_id
            JOIN acoes a ON a.id = p.acao_id
            WHERE r.ativo = TRUE AND a.ativo = TRUE
        `);

        const cache = {};
        
        permissions.forEach(perm => {
            if (!cache[perm.nivel_acesso]) {
                cache[perm.nivel_acesso] = {};
            }
            cache[perm.nivel_acesso][`${perm.recurso}.${perm.acao}`] = Boolean(perm.permitido);
        });

        permissionsCache = cache;
        cacheTimestamp = Date.now();
        
        console.log('Cache de permissões carregado:', Object.keys(cache));
        return cache;
    } catch (error) {
        console.error('Erro ao carregar cache de permissões:', error);
        throw error;
    }
};

/**
 * Verifica se o cache precisa ser atualizado
 */
const shouldRefreshCache = () => {
    return Date.now() - cacheTimestamp > CACHE_DURATION;
};

/**
 * Obtém permissões do cache ou carrega se necessário
 */
const getPermissionsCache = async () => {
    if (Object.keys(permissionsCache).length === 0 || shouldRefreshCache()) {
        await loadPermissionsCache();
    }
    return permissionsCache;
};

/**
 * Garante que o cache está carregado
 */
const ensureCacheLoaded = async () => {
    if (Object.keys(permissionsCache).length === 0 || shouldRefreshCache()) {
        await loadPermissionsCache();
    }
};

/**
 * Middleware para verificar permissão específica (recurso + ação)
 * @param {string} recurso - Slug do recurso (ex: 'motores')
 * @param {string} acao - Slug da ação (ex: 'criar')
 */
const checkPermission = (recurso, acao) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado'
                });
            }

            const { nivel_acesso } = req.user;

            // Admin Master sempre tem todas as permissões
            if (nivel_acesso === 'admin_master') {
                return next();
            }

            // Verificar permissão no cache
            const cache = await getPermissionsCache();
            const userPermissions = cache[nivel_acesso] || {};
            const permissionKey = `${recurso}.${acao}`;
            const hasPermission = userPermissions[permissionKey] === true;

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Permissão insuficiente para ${acao} em ${recurso}`
                });
            }

            next();
        } catch (error) {
            console.error('Erro ao verificar permissão:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    };
};

/**
 * Middleware para verificar se usuário pode acessar página
 * @param {string} recurso - Slug do recurso (ex: 'motores')
 */
const checkPageAccess = (recurso) => {
    return async (req, res, next) => {
        try {
            const { nivel_acesso } = req.user;

            // Admin Master sempre tem acesso
            if (nivel_acesso === 'admin_master') {
                return next();
            }

            // Verificar permissão específica
            const hasPermission = await verifyPermission(nivel_acesso, recurso, 'visualizar');

            if (hasPermission) {
                next();
            } else {
                res.status(403).json({
                    success: false,
                    message: 'Acesso negado: Você não tem permissão para acessar este recurso'
                });
            }
        } catch (error) {
            console.error('Erro no middleware checkPageAccess:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    };
};

/**
 * Verifica se usuário tem permissão específica (para uso em controllers)
 * @param {object} user - Objeto do usuário
 * @param {string} recurso - Slug do recurso
 * @param {string} acao - Slug da ação
 */
const hasUserPermission = async (user, recurso, acao) => {
    try {
        if (!user || !user.nivel_acesso) {
            return false;
        }

        // Admin Master sempre tem todas as permissões
        if (user.nivel_acesso === 'admin_master') {
            return true;
        }

        const cache = await getPermissionsCache();
        const userPermissions = cache[user.nivel_acesso] || {};
        const permissionKey = `${recurso}.${acao}`;
        
        return userPermissions[permissionKey] === true;
    } catch (error) {
        console.error('Erro ao verificar permissão do usuário:', error);
        return false;
    }
};

/**
 * Obtém todas as permissões de um usuário
 * @param {object} user - Objeto do usuário
 */
const getUserPermissions = async (user) => {
    try {
        if (!user || !user.nivel_acesso) {
            return {};
        }

        const cache = await getPermissionsCache();
        return cache[user.nivel_acesso] || {};
    } catch (error) {
        console.error('Erro ao obter permissões do usuário:', error);
        return {};
    }
};

/**
 * Atualiza uma permissão específica
 * @param {string} nivelAcesso - Nível de acesso
 * @param {string} recurso - Slug do recurso
 * @param {string} acao - Slug da ação
 * @param {boolean} permitido - Se a permissão é permitida
 * @param {object} user - Usuário que está fazendo a alteração (para auditoria)
 * @param {string} ipAddress - IP do usuário
 * @param {string} userAgent - User agent do navegador
 */
const updatePermission = async (nivelAcesso, recurso, acao, permitido, user, ipAddress, userAgent) => {
    try {
        // Buscar IDs do recurso e ação
        const [recursoData] = await query('SELECT id FROM recursos WHERE slug = ?', [recurso]);
        const [acaoData] = await query('SELECT id FROM acoes WHERE slug = ?', [acao]);

        if (!recursoData || !acaoData) {
            throw new Error('Recurso ou ação não encontrados');
        }

        // Buscar valor anterior para auditoria
        const [permissaoAtual] = await query(
            'SELECT permitido FROM permissoes WHERE nivel_acesso = ? AND recurso_id = ? AND acao_id = ?',
            [nivelAcesso, recursoData.id, acaoData.id]
        );

        const valorAnterior = permissaoAtual ? permissaoAtual.permitido : null;

        // Atualizar ou inserir permissão
        await query(`
            INSERT INTO permissoes (nivel_acesso, recurso_id, acao_id, permitido)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                permitido = VALUES(permitido),
                data_atualizacao = CURRENT_TIMESTAMP
        `, [nivelAcesso, recursoData.id, acaoData.id, permitido]);

        // Registrar na auditoria
        await query(`
            INSERT INTO auditoria_permissoes 
            (usuario_id, nivel_acesso, recurso_id, acao_id, valor_anterior, valor_novo, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [user.id, nivelAcesso, recursoData.id, acaoData.id, valorAnterior, permitido, ipAddress, userAgent]);

        // Limpar cache para forçar recarga
        permissionsCache = {};
        cacheTimestamp = 0;

        return true;
    } catch (error) {
        console.error('Erro ao atualizar permissão:', error);
        throw error;
    }
};

/**
 * Middleware específico para acesso às configurações (apenas admin_master)
 */
const adminMasterOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Usuário não autenticado'
        });
    }

    if (req.user.nivel_acesso !== 'admin_master') {
        return res.status(403).json({
            success: false,
            message: 'Acesso restrito a Admin Master'
        });
    }

    next();
};

/**
 * Força a atualização do cache de permissões
 */
const refreshPermissionsCache = async () => {
    try {
        await loadPermissionsCache();
        return true;
    } catch (error) {
        console.error('Erro ao atualizar cache de permissões:', error);
        return false;
    }
};

/**
 * Verificar uma permissão específica
 */
const verifyPermission = async (nivelAcesso, recurso, acao) => {
    try {
        // Admin Master sempre tem todas as permissões
        if (nivelAcesso === 'admin_master') {
            return true;
        }

        // Garantir que o cache está carregado
        await ensureCacheLoaded();

        const userPermissions = permissionsCache[nivelAcesso];
        if (!userPermissions) {
            return false;
        }

        const permissionKey = `${recurso}.${acao}`;
        return userPermissions[permissionKey] === true;
    } catch (error) {
        console.error('Erro ao verificar permissão:', error);
        return false;
    }
};

module.exports = {
    checkPermission,
    checkPageAccess,
    hasUserPermission,
    getUserPermissions,
    updatePermission,
    adminMasterOnly,
    refreshPermissionsCache,
    getPermissionsCache
}; 