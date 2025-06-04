const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { checkPageAccess, checkPermission } = require('../middleware/permissions');
const { extractTenant, requireTenant } = require('../middleware/tenant');

const router = express.Router();

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'motores-' + uniqueSuffix + '.csv');
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
            return cb(new Error('Apenas arquivos CSV são permitidos!'), false);
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limite
    }
});

// GET /api/motores/csv-template - Baixar template CSV (ANTES dos middlewares globais)
router.get('/csv-template', verifyToken, checkPageAccess('motores'), (req, res) => {
    console.log('Rota csv-template chamada');
    
    const csvTemplate = `tag,equipment,frame_manufacturer,power_kw,power_cv,rotation,rated_current,configured_current,equipment_type,manufacturer,stock_reserve,location,storage
MOT-001,Motor Principal Bomba,WEG,15.0,20.4,1750,22.5,20.0,Bomba,WEG,Estoque A,Sala de Máquinas,Prateleira 1
MOT-002,Motor Ventilador,Siemens,5.5,7.5,3500,11.2,10.8,Ventilador,Siemens,Estoque B,Cobertura,Prateleira 2
MOT-003,Motor Compressor,ABB,30.0,40.8,1200,55.0,52.0,Compressor,ABB,Estoque A,Casa de Máquinas,Prateleira 3`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="template-motores.csv"');
    
    console.log('Enviando template CSV');
    res.send(csvTemplate);
});

// Middleware para todas as rotas - ORDEM IMPORTANTE!
router.use(verifyToken, checkPageAccess('motores'));
router.use(extractTenant, requireTenant);

// Validações baseadas na estrutura da tabela
const motorValidation = [
    body('tag').notEmpty().withMessage('Tag é obrigatória'),
    body('equipment').notEmpty().withMessage('Equipment é obrigatório'),
    body('frame_manufacturer').optional(),
    body('power_kw').optional().custom(value => {
        if (value === null || value === undefined || value === '') return true;
        if (isNaN(parseFloat(value))) throw new Error('Potência (kW) deve ser um número');
        return true;
    }),
    body('power_cv').optional().custom(value => {
        if (value === null || value === undefined || value === '') return true;
        if (isNaN(parseFloat(value))) throw new Error('Potência (CV) deve ser um número');
        return true;
    }),
    body('rotation').optional().custom(value => {
        if (value === null || value === undefined || value === '') return true;
        if (isNaN(parseInt(value))) throw new Error('Rotação deve ser um número inteiro');
        return true;
    }),
    body('rated_current').optional().custom(value => {
        if (value === null || value === undefined || value === '') return true;
        if (isNaN(parseFloat(value))) throw new Error('Corrente nominal deve ser um número');
        return true;
    }),
    body('configured_current').optional().custom(value => {
        if (value === null || value === undefined || value === '') return true;
        if (isNaN(parseFloat(value))) throw new Error('Corrente configurada deve ser um número');
        return true;
    }),
    body('equipment_type').optional(),
    body('manufacturer').optional(),
    body('stock_reserve').optional(),
    body('location').optional(),
    body('storage').optional()
];

// GET /api/motores - Listar todos os motores
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            equipment_type, 
            manufacturer, 
            location, 
            ativo,
            power_kw_min,
            power_kw_max,
            power_cv_min,
            power_cv_max,
            rated_current_min,
            rated_current_max
        } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        // Filtro de busca com tenant_id
        if (search) {
            whereClause += ' WHERE (tag LIKE ? OR equipment LIKE ? OR manufacturer LIKE ? OR equipment_type LIKE ? OR location LIKE ?) AND tenant_id = ?';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, req.tenant_id);
        } else {
            whereClause += ' WHERE tenant_id = ?';
            params.push(req.tenant_id);
        }

        // Filtro por tipo de equipamento
        if (equipment_type) {
            whereClause += ' AND equipment_type = ?';
            params.push(equipment_type);
        }

        // Filtro por fabricante
        if (manufacturer) {
            whereClause += ' AND manufacturer LIKE ?';
            params.push(`%${manufacturer}%`);
        }

        // Filtro por localização
        if (location) {
            whereClause += ' AND location LIKE ?';
            params.push(`%${location}%`);
        }

        // Filtro de status ativo
        if (ativo !== undefined) {
            whereClause += ' AND ativo = ?';
            params.push(ativo === 'true');
        }

        // Filtros de potência kW
        if (power_kw_min) {
            whereClause += ' AND power_kw >= ?';
            params.push(parseFloat(power_kw_min));
        }
        if (power_kw_max) {
            whereClause += ' AND power_kw <= ?';
            params.push(parseFloat(power_kw_max));
        }

        // Filtros de potência CV
        if (power_cv_min) {
            whereClause += ' AND power_cv >= ?';
            params.push(parseFloat(power_cv_min));
        }
        if (power_cv_max) {
            whereClause += ' AND power_cv <= ?';
            params.push(parseFloat(power_cv_max));
        }

        // Filtros de corrente nominal
        if (rated_current_min) {
            whereClause += ' AND rated_current >= ?';
            params.push(parseFloat(rated_current_min));
        }
        if (rated_current_max) {
            whereClause += ' AND rated_current <= ?';
            params.push(parseFloat(rated_current_max));
        }

        // Contar total de registros
        const [totalResult] = await query(
            `SELECT COUNT(*) as total FROM motores${whereClause}`,
            params
        );
        const total = totalResult.total;

        // Buscar motores filtrados por tenant_id
        const motores = await query(
            `SELECT 
                id, tag, equipment, frame_manufacturer, power_kw, power_cv, 
                rotation, rated_current, configured_current, equipment_type, 
                manufacturer, stock_reserve, location, photo, storage, 
                ativo, data_criacao as created_at, data_atualizacao as updated_at
             FROM motores
             ${whereClause}
             ORDER BY tag 
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            success: true,
            data: {
                motores,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar motores:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/motores/simples - Listar motores para select (apenas ativos)
router.get('/simples', async (req, res) => {
    try {
        const motores = await query(
            'SELECT id, tag, equipment FROM motores WHERE ativo = true AND tenant_id = ? ORDER BY tag',
            [req.tenant_id]
        );

        res.json({
            success: true,
            data: { motores }
        });

    } catch (error) {
        console.error('Erro ao buscar motores:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/motores/:id - Buscar motor por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const motores = await query(
            `SELECT 
                id, tag, equipment, frame_manufacturer, power_kw, power_cv, 
                rotation, rated_current, configured_current, equipment_type, 
                manufacturer, stock_reserve, location, photo, storage, 
                ativo, data_criacao as created_at, data_atualizacao as updated_at
             FROM motores 
             WHERE id = ? AND tenant_id = ?`,
            [id, req.tenant_id]
        );

        if (motores.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Motor não encontrado'
            });
        }

        res.json({
            success: true,
            data: { motor: motores[0] }
        });

    } catch (error) {
        console.error('Erro ao buscar motor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/motores - Criar novo motor
router.post('/', checkPermission('motores', 'criar'), motorValidation, async (req, res) => {
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
            tag, 
            equipment, 
            frame_manufacturer, 
            power_kw, 
            power_cv, 
            rotation, 
            rated_current, 
            configured_current, 
            equipment_type, 
            manufacturer, 
            stock_reserve, 
            location, 
            storage 
        } = req.body;

        // Verificar se tag já existe na mesma organização (se fornecida)
        if (tag) {
            const existingMotor = await query(
                'SELECT id FROM motores WHERE tag = ? AND ativo = true AND tenant_id = ?',
                [tag, req.tenant_id]
            );

            if (existingMotor.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe um motor com esta tag nesta organização'
                });
            }
        }

        // Inserir motor com tenant_id
        const result = await query(
            `INSERT INTO motores 
             (tag, equipment, frame_manufacturer, power_kw, power_cv, rotation, 
              rated_current, configured_current, equipment_type, manufacturer, 
              stock_reserve, location, storage, tenant_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tag, 
                equipment, 
                frame_manufacturer || null, 
                power_kw || null, 
                power_cv || null, 
                rotation || null, 
                rated_current || null, 
                configured_current || null, 
                equipment_type || null, 
                manufacturer || null, 
                stock_reserve || null, 
                location || null, 
                storage || null,
                req.tenant_id
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Motor criado com sucesso',
            data: { id: result.insertId }
        });

    } catch (error) {
        console.error('Erro ao criar motor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// PUT /api/motores/:id - Atualizar motor
router.put('/:id', checkPermission('motores', 'editar'), motorValidation, async (req, res) => {
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
        const { 
            tag, 
            equipment, 
            frame_manufacturer, 
            power_kw, 
            power_cv, 
            rotation, 
            rated_current, 
            configured_current, 
            equipment_type, 
            manufacturer, 
            stock_reserve, 
            location, 
            storage,
            ativo 
        } = req.body;

        // Verificar se motor existe na mesma organização
        const existingMotor = await query('SELECT id FROM motores WHERE id = ? AND tenant_id = ?', [id, req.tenant_id]);
        if (existingMotor.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Motor não encontrado'
            });
        }

        // Verificar se tag já existe em outros motores da mesma organização (se fornecida)
        if (tag) {
            const duplicateMotor = await query(
                'SELECT id FROM motores WHERE tag = ? AND id != ? AND ativo = true AND tenant_id = ?',
                [tag, id, req.tenant_id]
            );

            if (duplicateMotor.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Já existe outro motor com esta tag nesta organização'
                });
            }
        }

        // Atualizar motor
        await query(
            `UPDATE motores SET 
             tag = ?, equipment = ?, frame_manufacturer = ?, power_kw = ?, power_cv = ?, 
             rotation = ?, rated_current = ?, configured_current = ?, equipment_type = ?, 
             manufacturer = ?, stock_reserve = ?, location = ?, storage = ?, ativo = ?
             WHERE id = ? AND tenant_id = ?`,
            [
                tag, 
                equipment, 
                frame_manufacturer || null, 
                power_kw || null, 
                power_cv || null, 
                rotation || null, 
                rated_current || null, 
                configured_current || null, 
                equipment_type || null, 
                manufacturer || null, 
                stock_reserve || null, 
                location || null, 
                storage || null,
                ativo !== undefined ? ativo : true,
                id,
                req.tenant_id
            ]
        );

        res.json({
            success: true,
            message: 'Motor atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar motor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// DELETE /api/motores/:id - Desativar motor
router.delete('/:id', checkPermission('motores', 'excluir'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se motor existe na mesma organização
        const existingMotor = await query('SELECT id FROM motores WHERE id = ? AND tenant_id = ?', [id, req.tenant_id]);
        if (existingMotor.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Motor não encontrado'
            });
        }

        // Desativar motor (soft delete)
        await query('UPDATE motores SET ativo = false WHERE id = ? AND tenant_id = ?', [id, req.tenant_id]);

        res.json({
            success: true,
            message: 'Motor desativado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao desativar motor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/motores/tipos/unicos - Buscar tipos únicos para filtros
router.get('/tipos/unicos', async (req, res) => {
    try {
        const tipos = await query(
            `SELECT DISTINCT equipment_type 
             FROM motores 
             WHERE equipment_type IS NOT NULL AND equipment_type != '' AND tenant_id = ?
             ORDER BY equipment_type`,
            [req.tenant_id]
        );

        const fabricantes = await query(
            `SELECT DISTINCT manufacturer 
             FROM motores 
             WHERE manufacturer IS NOT NULL AND manufacturer != '' AND tenant_id = ?
             ORDER BY manufacturer`,
            [req.tenant_id]
        );

        const localizacoes = await query(
            `SELECT DISTINCT location 
             FROM motores 
             WHERE location IS NOT NULL AND location != '' AND tenant_id = ?
             ORDER BY location`,
            [req.tenant_id]
        );

        res.json({
            success: true,
            data: {
                tipos: tipos.map(t => t.equipment_type),
                fabricantes: fabricantes.map(f => f.manufacturer),
                localizacoes: localizacoes.map(l => l.location)
            }
        });

    } catch (error) {
        console.error('Erro ao buscar tipos únicos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/motores/import-csv - Importar motores via CSV
router.post('/import-csv', extractTenant, requireTenant, checkPermission('motores', 'importar'), upload.single('csvFile'), async (req, res) => {
    let csvFilePath = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo CSV foi enviado'
            });
        }

        csvFilePath = req.file.path;
        const results = [];
        const errors = [];
        let lineNumber = 1; // Começar do 1 para contar o cabeçalho

        // Ler e processar o arquivo CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (data) => {
                    lineNumber++;
                    
                    // Validar dados obrigatórios
                    if (!data.tag || !data.equipment) {
                        errors.push({
                            linha: lineNumber,
                            erro: 'Tag e Equipment são obrigatórios',
                            dados: data
                        });
                        return;
                    }

                    // Normalizar dados
                    const motorData = {
                        tag: data.tag?.trim(),
                        equipment: data.equipment?.trim(),
                        frame_manufacturer: data.frame_manufacturer?.trim() || null,
                        power_kw: data.power_kw ? parseFloat(data.power_kw) : null,
                        power_cv: data.power_cv ? parseFloat(data.power_cv) : null,
                        rotation: data.rotation ? parseInt(data.rotation) : null,
                        rated_current: data.rated_current ? parseFloat(data.rated_current) : null,
                        configured_current: data.configured_current ? parseFloat(data.configured_current) : null,
                        equipment_type: data.equipment_type?.trim() || null,
                        manufacturer: data.manufacturer?.trim() || null,
                        stock_reserve: data.stock_reserve?.trim() || null,
                        location: data.location?.trim() || null,
                        storage: data.storage?.trim() || null,
                        tenant_id: req.tenant_id
                    };

                    // Validações adicionais
                    if (motorData.power_kw && isNaN(motorData.power_kw)) {
                        errors.push({
                            linha: lineNumber,
                            erro: 'power_kw deve ser um número válido',
                            dados: data
                        });
                        return;
                    }

                    if (motorData.power_cv && isNaN(motorData.power_cv)) {
                        errors.push({
                            linha: lineNumber,
                            erro: 'power_cv deve ser um número válido',
                            dados: data
                        });
                        return;
                    }

                    if (motorData.rotation && isNaN(motorData.rotation)) {
                        errors.push({
                            linha: lineNumber,
                            erro: 'rotation deve ser um número inteiro válido',
                            dados: data
                        });
                        return;
                    }

                    results.push(motorData);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Se houver erros de validação, retornar sem importar
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Encontrados ${errors.length} erro(s) no arquivo CSV`,
                errors: errors.slice(0, 10), // Limitar a 10 erros para não sobrecarregar
                totalErrors: errors.length
            });
        }

        // Verificar duplicatas de tags dentro do CSV
        const tags = results.map(r => r.tag);
        const duplicateTags = tags.filter((tag, index) => tags.indexOf(tag) !== index);
        
        if (duplicateTags.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Tags duplicadas encontradas no CSV',
                duplicates: [...new Set(duplicateTags)]
            });
        }

        // Verificar se alguma tag já existe no banco para este tenant
        if (tags.length > 0) {
            const existingTags = await query(
                `SELECT tag FROM motores WHERE tag IN (${tags.map(() => '?').join(',')}) AND tenant_id = ? AND ativo = true`,
                [...tags, req.tenant_id]
            );

            if (existingTags.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tags já existem no sistema',
                    existingTags: existingTags.map(t => t.tag)
                });
            }
        }

        // Importar dados em lote
        let imported = 0;
        let failed = 0;
        const failedRecords = [];

        for (const motorData of results) {
            try {
                await query(
                    `INSERT INTO motores 
                     (tag, equipment, frame_manufacturer, power_kw, power_cv, rotation, 
                      rated_current, configured_current, equipment_type, manufacturer, 
                      stock_reserve, location, storage, tenant_id) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        motorData.tag,
                        motorData.equipment,
                        motorData.frame_manufacturer,
                        motorData.power_kw,
                        motorData.power_cv,
                        motorData.rotation,
                        motorData.rated_current,
                        motorData.configured_current,
                        motorData.equipment_type,
                        motorData.manufacturer,
                        motorData.stock_reserve,
                        motorData.location,
                        motorData.storage,
                        motorData.tenant_id
                    ]
                );
                imported++;
            } catch (error) {
                failed++;
                failedRecords.push({
                    tag: motorData.tag,
                    erro: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `Importação concluída! ${imported} motores importados com sucesso`,
            statistics: {
                total: results.length,
                imported,
                failed,
                failedRecords: failedRecords.slice(0, 5) // Mostrar apenas os primeiros 5 falhas
            }
        });

    } catch (error) {
        console.error('Erro na importação CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno durante a importação: ' + error.message
        });
    } finally {
        // Limpar arquivo temporário
        if (csvFilePath && fs.existsSync(csvFilePath)) {
            try {
                fs.unlinkSync(csvFilePath);
            } catch (err) {
                console.error('Erro ao deletar arquivo temporário:', err);
            }
        }
    }
});

module.exports = router; 