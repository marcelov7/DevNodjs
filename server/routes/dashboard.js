const express = require('express');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { checkPageAccess } = require('../middleware/permissions');
const { extractTenant, requireTenant } = require('../middleware/tenant');

const router = express.Router();

// Middleware para todas as rotas - ORDEM IMPORTANTE!
router.use(verifyToken, checkPageAccess('dashboard'));
router.use(extractTenant, requireTenant);

// GET /api/dashboard/estatisticas - Buscar estatísticas gerais
router.get('/estatisticas', async (req, res) => {
    try {
        // Buscar totais filtrados por tenant_id
        const [usuarios] = await query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true AND tenant_id = ?', [req.tenant_id]);
        const [locais] = await query('SELECT COUNT(*) as total FROM locais WHERE ativo = true AND tenant_id = ?', [req.tenant_id]);
        const [equipamentos] = await query('SELECT COUNT(*) as total FROM equipamentos WHERE ativo = true AND tenant_id = ?', [req.tenant_id]);
        const [motores] = await query('SELECT COUNT(*) as total FROM motores WHERE ativo = true AND tenant_id = ?', [req.tenant_id]);
        const [relatorios] = await query('SELECT COUNT(*) as total FROM relatorios WHERE tenant_id = ?', [req.tenant_id]);

        // Buscar relatórios por status
        const relatoriosPorStatus = await query(`
            SELECT 
                status,
                COUNT(*) as total
            FROM relatorios 
            WHERE tenant_id = ?
            GROUP BY status
        `, [req.tenant_id]);

        // Buscar relatórios por prioridade
        const relatoriosPorPrioridade = await query(`
            SELECT 
                prioridade,
                COUNT(*) as total
            FROM relatorios 
            WHERE tenant_id = ?
            GROUP BY prioridade
        `, [req.tenant_id]);

        // Buscar equipamentos por status operacional
        const equipamentosPorStatus = await query(`
            SELECT 
                status_operacional,
                COUNT(*) as total
            FROM equipamentos 
            WHERE ativo = true AND tenant_id = ?
            GROUP BY status_operacional
        `, [req.tenant_id]);

        // Buscar relatórios dos últimos 30 dias
        const relatoriosRecentes = await query(`
            SELECT 
                DATE(data_criacao) as data,
                COUNT(*) as total
            FROM relatorios 
            WHERE data_criacao >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND tenant_id = ?
            GROUP BY DATE(data_criacao)
            ORDER BY data DESC
            LIMIT 30
        `, [req.tenant_id]);

        res.json({
            success: true,
            data: {
                totais: {
                    usuarios: usuarios.total,
                    locais: locais.total,
                    equipamentos: equipamentos.total,
                    motores: motores.total,
                    relatorios: relatorios.total
                },
                relatoriosPorStatus: relatoriosPorStatus.reduce((acc, item) => {
                    acc[item.status] = item.total;
                    return acc;
                }, {}),
                relatoriosPorPrioridade: relatoriosPorPrioridade.reduce((acc, item) => {
                    acc[item.prioridade] = item.total;
                    return acc;
                }, {}),
                equipamentosPorStatus: equipamentosPorStatus.reduce((acc, item) => {
                    acc[item.status_operacional] = item.total;
                    return acc;
                }, {}),
                relatoriosRecentes
            }
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/dashboard/relatorios-recentes - Buscar relatórios recentes
router.get('/relatorios-recentes', async (req, res) => {
    try {
        const { limit = 5 } = req.query;

        const relatorios = await query(`
            SELECT 
                r.id,
                r.titulo,
                r.status,
                r.prioridade,
                r.data_criacao,
                u.nome as usuario_nome,
                l.nome as local_nome,
                e.nome as equipamento_nome
            FROM relatorios r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN locais l ON r.local_id = l.id
            JOIN equipamentos e ON r.equipamento_id = e.id
            WHERE r.tenant_id = ?
            ORDER BY r.data_criacao DESC
            LIMIT ?
        `, [req.tenant_id, parseInt(limit)]);

        res.json({
            success: true,
            data: { relatorios }
        });

    } catch (error) {
        console.error('Erro ao buscar relatórios recentes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/dashboard/atividades-recentes - Buscar atividades recentes
router.get('/atividades-recentes', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const atividades = await query(`
            SELECT 
                h.id,
                h.status_anterior,
                h.status_novo,
                h.descricao,
                h.data_atualizacao,
                u.nome as usuario_nome,
                r.titulo as relatorio_titulo,
                r.id as relatorio_id
            FROM relatorio_historico h
            JOIN usuarios u ON h.usuario_id = u.id
            JOIN relatorios r ON h.relatorio_id = r.id
            WHERE r.tenant_id = ?
            ORDER BY h.data_atualizacao DESC
            LIMIT ?
        `, [req.tenant_id, parseInt(limit)]);

        res.json({
            success: true,
            data: { atividades }
        });

    } catch (error) {
        console.error('Erro ao buscar atividades recentes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/dashboard/equipamentos-problemas - Equipamentos com mais relatórios
router.get('/equipamentos-problemas', async (req, res) => {
    try {
        const { limit = 5 } = req.query;

        const equipamentos = await query(`
            SELECT 
                e.id,
                e.nome,
                e.codigo,
                l.nome as local_nome,
                COUNT(r.id) as total_relatorios,
                COUNT(CASE WHEN r.status != 'resolvido' THEN 1 END) as relatorios_abertos
            FROM equipamentos e
            LEFT JOIN relatorios r ON e.id = r.equipamento_id AND r.tenant_id = ?
            LEFT JOIN locais l ON e.local_id = l.id
            WHERE e.ativo = true AND e.tenant_id = ?
            GROUP BY e.id
            HAVING total_relatorios > 0
            ORDER BY total_relatorios DESC, relatorios_abertos DESC
            LIMIT ?
        `, [req.tenant_id, req.tenant_id, parseInt(limit)]);

        res.json({
            success: true,
            data: { equipamentos }
        });

    } catch (error) {
        console.error('Erro ao buscar equipamentos com problemas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/dashboard/performance-usuarios - Performance dos usuários
router.get('/performance-usuarios', async (req, res) => {
    try {
        const usuarios = await query(`
            SELECT 
                u.id,
                u.nome,
                COUNT(r.id) as total_relatorios,
                COUNT(CASE WHEN r.status = 'resolvido' THEN 1 END) as relatorios_resolvidos,
                ROUND(
                    COUNT(CASE WHEN r.status = 'resolvido' THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(r.id), 0), 2
                ) as taxa_resolucao
            FROM usuarios u
            LEFT JOIN relatorios r ON u.id = r.usuario_id AND r.tenant_id = ?
            WHERE u.ativo = true AND u.nivel_acesso IN ('admin', 'usuario') AND u.tenant_id = ?
            GROUP BY u.id
            ORDER BY total_relatorios DESC
            LIMIT 10
        `, [req.tenant_id, req.tenant_id]);

        res.json({
            success: true,
            data: { usuarios }
        });

    } catch (error) {
        console.error('Erro ao buscar performance dos usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router; 