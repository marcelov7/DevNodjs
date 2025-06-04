const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { verifyToken: authenticateToken } = require('../middleware/auth');

// Aplicar middleware de autenticação a todas as rotas
router.use(authenticateToken);

// GET /api/gerador-inspecoes - Listar inspeções do gerador com filtros
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            colaborador = '', 
            data = '', 
            ativo = ''
        } = req.query;
        
        const offset = (page - 1) * limit;
        const tenantId = req.user.tenant_id;
        
        // Construir query com filtros
        let whereConditions = ['gi.tenant_id = ?'];
        let queryParams = [tenantId];
        
        if (colaborador) {
            whereConditions.push('gi.colaborador LIKE ?');
            queryParams.push(`%${colaborador}%`);
        }
        
        if (data) {
            whereConditions.push('gi.data = ?');
            queryParams.push(data);
        }
        
        if (ativo !== '') {
            whereConditions.push('gi.ativo = ?');
            queryParams.push(ativo === 'true');
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        // Query principal com paginação
        const sqlQuery = `
            SELECT 
                gi.*,
                u.nome as usuario_nome
            FROM gerador_inspecoes gi
            LEFT JOIN usuarios u ON gi.user_id = u.id
            WHERE ${whereClause}
            ORDER BY gi.data DESC, gi.criado_em DESC
            LIMIT ? OFFSET ?
        `;
        
        // Query para contar total
        const countSqlQuery = `
            SELECT COUNT(*) as total
            FROM gerador_inspecoes gi
            WHERE ${whereClause}
        `;
        
        // Executar ambas as queries
        const [inspecoes] = await pool.execute(sqlQuery, [...queryParams, parseInt(limit), parseInt(offset)]);
        const [countResult] = await pool.execute(countSqlQuery, queryParams);
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            inspecoes,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Erro ao buscar inspeções do gerador:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message 
        });
    }
});

// GET /api/gerador-inspecoes/:id - Buscar inspeção específica
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        
        const sqlQuery = `
            SELECT 
                gi.*,
                u.nome as usuario_nome
            FROM gerador_inspecoes gi
            LEFT JOIN usuarios u ON gi.user_id = u.id
            WHERE gi.id = ? AND gi.tenant_id = ?
        `;
        
        const [results] = await pool.execute(sqlQuery, [id, tenantId]);
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Inspeção não encontrada' });
        }
        
        res.json(results[0]);
        
    } catch (error) {
        console.error('Erro ao buscar inspeção do gerador:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message 
        });
    }
});

// POST /api/gerador-inspecoes - Criar nova inspeção
router.post('/', async (req, res) => {
    try {
        const {
            data,
            colaborador,
            nivel_oleo,
            nivel_agua,
            tensao_sync_gerador,
            tensao_sync_rede,
            temp_agua,
            pressao_oleo,
            frequencia,
            tensao_a,
            tensao_b,
            tensao_c,
            rpm,
            tensao_bateria,
            tensao_alternador,
            combustivel_50,
            iluminacao_sala,
            observacao
        } = req.body;
        
        // Validações obrigatórias
        if (!data || !colaborador) {
            return res.status(400).json({ 
                error: 'Data e colaborador são obrigatórios' 
            });
        }
        
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;
        
        const sqlQuery = `
            INSERT INTO gerador_inspecoes (
                tenant_id, user_id, data, colaborador, nivel_oleo, nivel_agua,
                tensao_sync_gerador, tensao_sync_rede, temp_agua, pressao_oleo,
                frequencia, tensao_a, tensao_b, tensao_c, rpm, tensao_bateria,
                tensao_alternador, combustivel_50, iluminacao_sala, observacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await pool.execute(sqlQuery, [
            tenantId, userId, data, colaborador, nivel_oleo, nivel_agua,
            tensao_sync_gerador, tensao_sync_rede, temp_agua, pressao_oleo,
            frequencia, tensao_a, tensao_b, tensao_c, rpm, tensao_bateria,
            tensao_alternador, combustivel_50, iluminacao_sala, observacao
        ]);
        
        // Buscar a inspeção criada
        const [novaInspecao] = await pool.execute(
            'SELECT * FROM gerador_inspecoes WHERE id = ?',
            [result.insertId]
        );
        
        // 📱 NOTIFICAÇÕES: Notificar administradores sobre nova inspeção
        if (req.notificationService) {
            try {
                await req.notificationService.notificarNovaInspecaoGerador({
                    id: result.insertId,
                    colaborador,
                    data,
                    tenant_id: tenantId,
                    user_id: userId
                });
                console.log('📱 Notificações de nova inspeção de gerador enviadas');
            } catch (notificationError) {
                console.error('❌ Erro ao enviar notificações para nova inspeção:', notificationError);
                // Não falhar a criação por erro de notificação
            }
        }
        
        res.status(201).json({
            message: 'Inspeção do gerador criada com sucesso',
            inspecao: novaInspecao[0]
        });
        
    } catch (error) {
        console.error('Erro ao criar inspeção do gerador:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message 
        });
    }
});

// PUT /api/gerador-inspecoes/:id - Atualizar inspeção
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            data,
            colaborador,
            nivel_oleo,
            nivel_agua,
            tensao_sync_gerador,
            tensao_sync_rede,
            temp_agua,
            pressao_oleo,
            frequencia,
            tensao_a,
            tensao_b,
            tensao_c,
            rpm,
            tensao_bateria,
            tensao_alternador,
            combustivel_50,
            iluminacao_sala,
            observacao,
            ativo
        } = req.body;
        
        const tenantId = req.user.tenant_id;
        
        // Verificar se a inspeção existe e pertence ao tenant
        const [existing] = await pool.execute(
            'SELECT id FROM gerador_inspecoes WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Inspeção não encontrada' });
        }
        
        // Validações obrigatórias
        if (!data || !colaborador) {
            return res.status(400).json({ 
                error: 'Data e colaborador são obrigatórios' 
            });
        }
        
        const updateSqlQuery = `
            UPDATE gerador_inspecoes SET
                data = ?, colaborador = ?, nivel_oleo = ?, nivel_agua = ?,
                tensao_sync_gerador = ?, tensao_sync_rede = ?, temp_agua = ?, pressao_oleo = ?,
                frequencia = ?, tensao_a = ?, tensao_b = ?, tensao_c = ?, rpm = ?,
                tensao_bateria = ?, tensao_alternador = ?, combustivel_50 = ?,
                iluminacao_sala = ?, observacao = ?, ativo = ?
            WHERE id = ? AND tenant_id = ?
        `;
        
        await pool.execute(updateSqlQuery, [
            data, colaborador, nivel_oleo, nivel_agua,
            tensao_sync_gerador, tensao_sync_rede, temp_agua, pressao_oleo,
            frequencia, tensao_a, tensao_b, tensao_c, rpm,
            tensao_bateria, tensao_alternador, combustivel_50,
            iluminacao_sala, observacao, ativo !== undefined ? ativo : true,
            id, tenantId
        ]);
        
        // Buscar a inspeção atualizada
        const [inspecaoAtualizada] = await pool.execute(
            'SELECT * FROM gerador_inspecoes WHERE id = ?',
            [id]
        );
        
        res.json({
            message: 'Inspeção do gerador atualizada com sucesso',
            inspecao: inspecaoAtualizada[0]
        });
        
    } catch (error) {
        console.error('Erro ao atualizar inspeção do gerador:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message 
        });
    }
});

// DELETE /api/gerador-inspecoes/:id - Desativar inspeção (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;
        
        // Verificar se a inspeção existe e pertence ao tenant
        const [existing] = await pool.execute(
            'SELECT id FROM gerador_inspecoes WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Inspeção não encontrada' });
        }
        
        // Soft delete - apenas desativar
        const deleteSqlQuery = 'UPDATE gerador_inspecoes SET ativo = FALSE WHERE id = ? AND tenant_id = ?';
        await pool.execute(deleteSqlQuery, [id, tenantId]);
        
        res.json({ 
            message: 'Inspeção do gerador desativada com sucesso' 
        });
        
    } catch (error) {
        console.error('Erro ao desativar inspeção do gerador:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message 
        });
    }
});

module.exports = router; 