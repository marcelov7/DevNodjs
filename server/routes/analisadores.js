const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/analisadores - Listar analisadores com filtros e paginação
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const {
      page = 1,
      limit = 10,
      analyzer,
      check_date,
      ativo
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereConditions = ['tenant_id = ?'];
    let params = [tenant_id];

    // Filtros
    if (analyzer) {
      whereConditions.push('analyzer LIKE ?');
      params.push(`%${analyzer}%`);
    }

    if (check_date) {
      whereConditions.push('DATE(check_date) = ?');
      params.push(check_date);
    }

    if (ativo !== undefined && ativo !== '') {
      whereConditions.push('ativo = ?');
      params.push(ativo === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.join(' AND ');

    // Query principal com paginação
    const sqlQuery = `
      SELECT 
        id,
        analyzer,
        check_date,
        acid_filter,
        gas_dryer,
        paper_filter,
        peristaltic_pump,
        rotameter,
        disposable_filter,
        blocking_filter,
        room_temperature,
        air_pressure,
        observation,
        image,
        ativo,
        created_at,
        updated_at
      FROM analisadores 
      WHERE ${whereClause}
      ORDER BY check_date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;

    // Query para contar total de registros
    const countSqlQuery = `
      SELECT COUNT(*) as total 
      FROM analisadores 
      WHERE ${whereClause}
    `;

    const analisadores = await db.query(sqlQuery, [...params, parseInt(limit), offset]);
    const countResult = await db.query(countSqlQuery, params);
    
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        analisadores: analisadores.map(analisador => ({
          ...analisador,
          acid_filter: Boolean(analisador.acid_filter),
          gas_dryer: Boolean(analisador.gas_dryer),
          paper_filter: Boolean(analisador.paper_filter),
          peristaltic_pump: Boolean(analisador.peristaltic_pump),
          rotameter: Boolean(analisador.rotameter),
          disposable_filter: Boolean(analisador.disposable_filter),
          blocking_filter: Boolean(analisador.blocking_filter),
          ativo: Boolean(analisador.ativo)
        })),
        pagination: {
          current: parseInt(page),
          pages: totalPages,
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar analisadores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/analisadores/:id - Buscar analisador por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    const sqlQuery = `
      SELECT 
        id,
        analyzer,
        check_date,
        acid_filter,
        gas_dryer,
        paper_filter,
        peristaltic_pump,
        rotameter,
        disposable_filter,
        blocking_filter,
        room_temperature,
        air_pressure,
        observation,
        image,
        ativo,
        created_at,
        updated_at
      FROM analisadores 
      WHERE id = ? AND tenant_id = ?
    `;

    const result = await db.query(sqlQuery, [id, tenant_id]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Analisador não encontrado'
      });
    }

    const analisador = {
      ...result[0],
      acid_filter: Boolean(result[0].acid_filter),
      gas_dryer: Boolean(result[0].gas_dryer),
      paper_filter: Boolean(result[0].paper_filter),
      peristaltic_pump: Boolean(result[0].peristaltic_pump),
      rotameter: Boolean(result[0].rotameter),
      disposable_filter: Boolean(result[0].disposable_filter),
      blocking_filter: Boolean(result[0].blocking_filter),
      ativo: Boolean(result[0].ativo)
    };

    res.json({
      success: true,
      data: { analisador }
    });

  } catch (error) {
    console.error('Erro ao buscar analisador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/analisadores - Criar novo analisador
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user;
    const {
      analyzer,
      check_date,
      acid_filter = false,
      gas_dryer = false,
      paper_filter = false,
      peristaltic_pump = false,
      rotameter = false,
      disposable_filter = false,
      blocking_filter = false,
      room_temperature,
      air_pressure,
      observation,
      image,
      ativo = true
    } = req.body;

    // Validações
    if (!analyzer || !check_date) {
      return res.status(400).json({
        success: false,
        message: 'Analisador e data do check são obrigatórios'
      });
    }

    const sqlQuery = `
      INSERT INTO analisadores (
        tenant_id,
        user_id,
        analyzer,
        check_date,
        acid_filter,
        gas_dryer,
        paper_filter,
        peristaltic_pump,
        rotameter,
        disposable_filter,
        blocking_filter,
        room_temperature,
        air_pressure,
        observation,
        image,
        ativo,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const result = await db.query(sqlQuery, [
      tenant_id,
      user_id,
      analyzer,
      check_date,
      acid_filter ? 1 : 0,
      gas_dryer ? 1 : 0,
      paper_filter ? 1 : 0,
      peristaltic_pump ? 1 : 0,
      rotameter ? 1 : 0,
      disposable_filter ? 1 : 0,
      blocking_filter ? 1 : 0,
      room_temperature || null,
      air_pressure || null,
      observation || null,
      image || null,
      ativo ? 1 : 0
    ]);

    // 📱 NOTIFICAÇÕES: Notificar administradores sobre novo analisador
    if (req.notificationService) {
      try {
        await req.notificationService.notificarNovoAnalisador({
          id: result.insertId,
          analyzer,
          check_date,
          tenant_id,
          user_id
        });
        console.log('📱 Notificações de novo analisador enviadas');
      } catch (notificationError) {
        console.error('❌ Erro ao enviar notificações para novo analisador:', notificationError);
        // Não falhar a criação por erro de notificação
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        message: 'Analisador criado com sucesso'
      }
    });

  } catch (error) {
    console.error('Erro ao criar analisador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/analisadores/:id - Atualizar analisador
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;
    const {
      analyzer,
      check_date,
      acid_filter,
      gas_dryer,
      paper_filter,
      peristaltic_pump,
      rotameter,
      disposable_filter,
      blocking_filter,
      room_temperature,
      air_pressure,
      observation,
      image,
      ativo
    } = req.body;

    // Verificar se o analisador existe e pertence ao tenant
    const checkQuery = 'SELECT id FROM analisadores WHERE id = ? AND tenant_id = ?';
    const checkResult = await db.query(checkQuery, [id, tenant_id]);

    if (checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Analisador não encontrado'
      });
    }

    // Validações
    if (!analyzer || !check_date) {
      return res.status(400).json({
        success: false,
        message: 'Analisador e data do check são obrigatórios'
      });
    }

    const updateSqlQuery = `
      UPDATE analisadores SET
        analyzer = ?,
        check_date = ?,
        acid_filter = ?,
        gas_dryer = ?,
        paper_filter = ?,
        peristaltic_pump = ?,
        rotameter = ?,
        disposable_filter = ?,
        blocking_filter = ?,
        room_temperature = ?,
        air_pressure = ?,
        observation = ?,
        image = ?,
        ativo = ?,
        updated_at = NOW()
      WHERE id = ? AND tenant_id = ?
    `;

    await db.query(updateSqlQuery, [
      analyzer,
      check_date,
      acid_filter ? 1 : 0,
      gas_dryer ? 1 : 0,
      paper_filter ? 1 : 0,
      peristaltic_pump ? 1 : 0,
      rotameter ? 1 : 0,
      disposable_filter ? 1 : 0,
      blocking_filter ? 1 : 0,
      room_temperature || null,
      air_pressure || null,
      observation || null,
      image || null,
      ativo ? 1 : 0,
      id,
      tenant_id
    ]);

    res.json({
      success: true,
      message: 'Analisador atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar analisador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/analisadores/:id - Desativar analisador (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { id } = req.params;

    // Verificar se o analisador existe e pertence ao tenant
    const checkQuery = 'SELECT id FROM analisadores WHERE id = ? AND tenant_id = ?';
    const checkResult = await db.query(checkQuery, [id, tenant_id]);

    if (checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Analisador não encontrado'
      });
    }

    // Soft delete - apenas desativar
    const deleteSqlQuery = `
      UPDATE analisadores 
      SET ativo = 0, updated_at = NOW() 
      WHERE id = ? AND tenant_id = ?
    `;

    await db.query(deleteSqlQuery, [id, tenant_id]);

    res.json({
      success: true,
      message: 'Analisador desativado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao desativar analisador:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router; 