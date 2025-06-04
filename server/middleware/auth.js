const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Middleware de verificação de token JWT
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token de acesso não fornecido' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar usuário no banco para verificar se ainda está ativo
        const usuario = await query(
            'SELECT id, nome, username, email, setor, nivel_acesso, ativo, tenant_id FROM usuarios WHERE id = ? AND ativo = true',
            [decoded.id]
        );

        if (usuario.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Usuário não encontrado ou inativo' 
            });
        }

        // Verificar se a organização do usuário está ativa
        if (usuario[0].tenant_id) {
            const [organizacao] = await query(
                'SELECT ativo, suspenso FROM organizacoes WHERE id = ?',
                [usuario[0].tenant_id]
            );

            if (!organizacao || !organizacao.ativo || organizacao.suspenso) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Organização inativa ou suspensa' 
                });
            }
        }

        req.user = usuario[0];
        req.tenant_id = usuario[0].tenant_id; // Adicionar tenant_id ao request
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token inválido' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expirado' 
            });
        }
        return res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
};

// Middleware para verificar níveis de acesso
const checkPermission = (niveisPermitidos) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Usuário não autenticado' 
            });
        }

        const { nivel_acesso } = req.user;

        if (!niveisPermitidos.includes(nivel_acesso)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Permissão insuficiente para esta operação' 
            });
        }

        next();
    };
};

// Middlewares específicos para cada nível
const adminMaster = checkPermission(['admin_master']);
const adminMasterOuAdmin = checkPermission(['admin_master', 'admin']);
const adminMasterAdminOuUsuario = checkPermission(['admin_master', 'admin', 'usuario']);
const todosNiveis = checkPermission(['admin_master', 'admin', 'usuario', 'visitante']);

// Função para verificar se usuário pode editar relatório
const podeEditarRelatorio = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const nivelAcesso = req.user.nivel_acesso;

        // Admin Master pode editar qualquer relatório
        if (nivelAcesso === 'admin_master') {
            return next();
        }

        // Buscar relatório com informações de tempo
        const relatorio = await query(`
            SELECT 
                usuario_id, 
                editavel, 
                status,
                data_criacao,
                TIMESTAMPDIFF(HOUR, data_criacao, NOW()) as horas_desde_criacao
            FROM relatorios 
            WHERE id = ?
        `, [id]);

        if (relatorio.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Relatório não encontrado' 
            });
        }

        const { usuario_id, editavel, status, horas_desde_criacao } = relatorio[0];

        // Verificar se relatório está editável
        if (!editavel) {
            return res.status(403).json({ 
                success: false, 
                message: 'Relatório não pode mais ser editado (status: resolvido)' 
            });
        }

        // Verificar se é o criador do relatório
        if (usuario_id === userId) {
            // NOVA LÓGICA: Criador só pode editar nas primeiras 24h
            if (horas_desde_criacao > 24) {
                // Após 24h, só pode fazer atualizações (adicionar ao histórico) se não estiver concluído
                if (status === 'resolvido') {
                    return res.status(403).json({ 
                        success: false, 
                        message: 'Relatório concluído não pode mais ser modificado' 
                    });
                }
                
                // Marcar que é apenas atualização (não edição completa)
                req.isUpdateOnly = true;
            }
            return next();
        }

        // Verificar se usuário tem atribuição para este relatório
        const atribuicao = await query(
            'SELECT id FROM relatorio_atribuicoes WHERE relatorio_id = ? AND usuario_id = ? AND ativo = true',
            [id, userId]
        );

        if (atribuicao.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Você não tem permissão para editar este relatório' 
            });
        }

        // Para usuários atribuídos, também aplicar regra de 24h para edição completa
        if (horas_desde_criacao > 24 && status === 'resolvido') {
            return res.status(403).json({ 
                success: false, 
                message: 'Relatório concluído não pode mais ser modificado' 
            });
        }

        if (horas_desde_criacao > 24) {
            req.isUpdateOnly = true;
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar permissão de edição:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
};

// Verificar se pode visualizar relatório (todos os usuários autenticados)
const podeVisualizarRelatorio = async (req, res, next) => {
    try {
        const { id: relatorioId } = req.params;

        // Verificar se relatório existe
        const [relatorio] = await query(`
            SELECT id FROM relatorios WHERE id = ?
        `, [relatorioId]);

        if (!relatorio) {
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado'
            });
        }

        next();
    } catch (error) {
        console.error('Erro ao verificar permissão de visualização:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Verificar se pode gerenciar atribuições (apenas criador ou admin)
const podeGerenciarAtribuicoes = async (req, res, next) => {
    try {
        const { id: relatorioId } = req.params;
        const usuarioId = req.user.id;

        // Admin master e admin sempre podem gerenciar
        if (['admin_master', 'admin'].includes(req.user.nivel_acesso)) {
            return next();
        }

        // Buscar criador do relatório
        const [relatorio] = await query(`
            SELECT usuario_id FROM relatorios WHERE id = ?
        `, [relatorioId]);

        if (!relatorio) {
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado'
            });
        }

        // Verificar se é o criador
        if (relatorio.usuario_id === usuarioId) {
            return next();
        }

        res.status(403).json({
            success: false,
            message: 'Apenas o criador do relatório ou administradores podem gerenciar atribuições'
        });

    } catch (error) {
        console.error('Erro ao verificar permissão de atribuição:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

module.exports = {
    verifyToken,
    authenticateToken: verifyToken, // Alias para compatibilidade
    checkPermission,
    requirePermission: checkPermission, // Alias para requirePermission
    adminMaster,
    adminMasterOuAdmin,
    adminMasterAdminOuUsuario,
    todosNiveis,
    podeEditarRelatorio,
    podeVisualizarRelatorio,
    podeGerenciarAtribuicoes
}; 