const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { checkPageAccess, checkPermission } = require('../middleware/permissions');
const { extractTenant, requireTenant } = require('../middleware/tenant');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFService = require('../services/pdfService');

const router = express.Router();
const pdfService = new PDFService();

// ⚠️ ROTA PÚBLICA DE UPLOADS - DEVE VIR ANTES DOS MIDDLEWARES DE AUTENTICAÇÃO
// GET /api/relatorios/uploads/:filename - Servir arquivos de upload (PÚBLICO)
router.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/relatorios', filename);
    
    console.log('📁 Solicitação de arquivo:', filename);
    console.log('📂 Caminho construído:', filePath);
    console.log('📋 Arquivo existe?', fs.existsSync(filePath));
    
    if (fs.existsSync(filePath)) {
        console.log('✅ Servindo arquivo:', filename);
        res.sendFile(filePath);
    } else {
        console.log('❌ Arquivo não encontrado:', filePath);
        // Listar arquivos no diretório para debug
        const uploadDir = path.join(__dirname, '../uploads/relatorios');
        if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            console.log('📁 Arquivos disponíveis no diretório:', files);
        }
        
        res.status(404).json({
            success: false,
            message: 'Arquivo não encontrado'
        });
    }
});

// Middleware para todas as rotas
router.use(verifyToken, checkPageAccess('relatorios'));
router.use(extractTenant, requireTenant);

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/relatorios');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Apenas imagens (JPEG, PNG, GIF) e documentos (PDF, DOC, DOCX) são permitidos'));
        }
    }
});

// Validações
const relatorioValidation = [
    body('local_id').custom(value => {
        if (value === null || value === undefined || value === '') {
            throw new Error('Local é obrigatório');
        }
        if (isNaN(parseInt(value))) {
            throw new Error('Local deve ser um número válido');
        }
        return true;
    }),
    body('equipamento_id').custom(value => {
        if (value === null || value === undefined || value === '') {
            throw new Error('Equipamento é obrigatório');
        }
        if (isNaN(parseInt(value))) {
            throw new Error('Equipamento deve ser um número válido');
        }
        return true;
    }),
    body('data_ocorrencia').isISO8601().withMessage('Data da ocorrência é obrigatória'),
    body('titulo').notEmpty().withMessage('Título é obrigatório'),
    body('descricao').notEmpty().withMessage('Descrição é obrigatória'),
    body('status').optional().isIn(['pendente', 'em_andamento', 'resolvido']).withMessage('Status inválido'),
    body('prioridade').optional().isIn(['baixa', 'media', 'alta', 'critica']).withMessage('Prioridade inválida'),
    body('progresso').optional().custom(value => {
        if (value === null || value === undefined || value === '') return true;
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 100) {
            throw new Error('Progresso deve ser entre 0 e 100');
        }
        return true;
    })
];

const historicoValidation = [
    body('descricao').notEmpty().withMessage('Descrição do progresso é obrigatória'),
    body('progresso').custom(value => {
        if (value === null || value === undefined || value === '') {
            throw new Error('Progresso é obrigatório');
        }
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 100) {
            throw new Error('Progresso deve ser entre 0 e 100');
        }
        return true;
    })
];

const atribuicaoValidation = [
    body('usuario_ids').isArray().withMessage('Lista de usuários é obrigatória'),
    body('usuario_ids.*').isInt().withMessage('ID de usuário inválido')
];

// GET /api/relatorios - Listar relatórios com filtros avançados
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            local_id, 
            equipamento_id, 
            status, 
            prioridade, 
            data_inicio, 
            data_fim,
            atividade_recente
        } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];

        // Filtro de busca por título ou descrição
        if (search) {
            whereClause += ' WHERE (r.titulo LIKE ? OR r.descricao LIKE ?) AND r.tenant_id = ?';
            params.push(`%${search}%`, `%${search}%`, req.tenant_id);
        } else {
            whereClause += ' WHERE r.tenant_id = ?';
            params.push(req.tenant_id);
        }

        // Filtro por local
        if (local_id) {
            whereClause += ' AND r.local_id = ?';
            params.push(local_id);
        }

        // Filtro por equipamento
        if (equipamento_id) {
            whereClause += ' AND r.equipamento_id = ?';
            params.push(equipamento_id);
        }

        // Filtro por status
        if (status) {
            whereClause += ' AND r.status = ?';
            params.push(status);
        }

        // Filtro por prioridade
        if (prioridade) {
            whereClause += ' AND r.prioridade = ?';
            params.push(prioridade);
        }

        // Filtro por data de início
        if (data_inicio) {
            whereClause += ' AND DATE(r.data_ocorrencia) >= ?';
            params.push(data_inicio);
        }

        // Filtro por data fim
        if (data_fim) {
            whereClause += ' AND DATE(r.data_ocorrencia) <= ?';
            params.push(data_fim);
        }

        // Filtro por atividade recente
        if (atividade_recente === 'true') {
            whereClause += ` AND r.id IN (
                SELECT DISTINCT rh.relatorio_id 
                FROM relatorio_historico rh 
                WHERE rh.data_atualizacao > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                AND rh.relatorio_id IN (SELECT id FROM relatorios WHERE tenant_id = ?)
            )`;
            params.push(req.tenant_id);
        }

        // Contar total de registros
        const [totalResult] = await query(`
            SELECT COUNT(*) as total 
            FROM relatorios r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN locais l ON r.local_id = l.id
            JOIN equipamentos e ON r.equipamento_id = e.id
            ${whereClause}
        `, params);
        const total = totalResult.total;

        // Buscar relatórios
        const relatorios = await query(`
            SELECT 
                r.*,
                u.nome as usuario_nome,
                l.nome as local_nome,
                e.nome as equipamento_nome,
                COALESCE(r.progresso, 
                    CASE 
                        WHEN r.status = 'pendente' THEN 0
                        WHEN r.status = 'resolvido' THEN 100
                        ELSE 0
                    END
                ) as progresso_calculado,
                (SELECT COUNT(*) FROM relatorio_historico rh WHERE rh.relatorio_id = r.id) as total_historico,
                (SELECT COUNT(*) FROM relatorio_historico rh WHERE rh.relatorio_id = r.id AND rh.data_atualizacao > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as historico_recente,
                CASE 
                    WHEN r.data_criacao > DATE_SUB(NOW(), INTERVAL 24 HOUR) 
                    AND NOT EXISTS (
                        SELECT 1 FROM relatorio_visualizacoes rv 
                        WHERE rv.relatorio_id = r.id AND rv.usuario_id = ?
                    ) THEN 1 
                    ELSE 0 
                END as recem_criado
            FROM relatorios r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN locais l ON r.local_id = l.id
            JOIN equipamentos e ON r.equipamento_id = e.id
            ${whereClause}
            ORDER BY r.data_criacao DESC
            LIMIT ? OFFSET ?
        `, [req.user.id, ...params, parseInt(limit), offset]);

        res.json({
            success: true,
            data: {
                relatorios,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar relatórios:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/relatorios/:id - Buscar relatório específico com histórico e atribuições
router.get('/:id', checkPermission('relatorios', 'visualizar'), async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.user.id;

        // Buscar relatório principal
        const relatorios = await query(`
            SELECT 
                r.*,
                u.nome as usuario_nome,
                l.nome as local_nome,
                e.nome as equipamento_nome,
                COALESCE(r.progresso, 
                    CASE 
                        WHEN r.status = 'pendente' THEN 0
                        WHEN r.status = 'resolvido' THEN 100
                        ELSE 0
                    END
                ) as progresso_calculado
            FROM relatorios r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN locais l ON r.local_id = l.id
            JOIN equipamentos e ON r.equipamento_id = e.id
            WHERE r.id = ?
        `, [id]);

        if (relatorios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado'
            });
        }

        const relatorio = relatorios[0];

        // Verificar permissões do usuário atual
        let podeEditar = false;
        
        // Admin sempre pode editar
        if (['admin_master', 'admin'].includes(req.user.nivel_acesso)) {
            podeEditar = true;
        } 
        // Criador pode editar
        else if (relatorio.usuario_id === usuarioId) {
            podeEditar = true;
        } 
        // Verificar se está atribuído
        else {
            const atribuicoes = await query(`
                SELECT id FROM relatorio_atribuicoes 
                WHERE relatorio_id = ? AND usuario_id = ? AND ativo = true
            `, [id, usuarioId]);
            podeEditar = atribuicoes.length > 0;
        }

        // Se relatório está resolvido, ninguém pode editar
        if (!relatorio.editavel) {
            podeEditar = false;
        }

        // Buscar histórico do relatório
        const historico = await query(`
            SELECT 
                h.*,
                u.nome as usuario_nome,
                (SELECT GROUP_CONCAT(
                    JSON_OBJECT(
                        'id', ri.id,
                        'nome_arquivo', ri.nome_arquivo,
                        'nome_original', ri.nome_original,
                        'caminho_arquivo', ri.caminho_arquivo,
                        'tamanho_arquivo', ri.tamanho_arquivo,
                        'tipo_mime', ri.tipo_mime
                    )
                ) FROM relatorio_imagens ri WHERE ri.historico_id = h.id) as anexos
            FROM relatorio_historico h
            JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.relatorio_id = ?
            ORDER BY h.data_atualizacao DESC
        `, [id]);

        // Buscar usuários atribuídos
        const atribuicoes = await query(`
            SELECT 
                ra.*,
                u.nome as usuario_nome,
                u.email as usuario_email,
                ua.nome as atribuido_por_nome
            FROM relatorio_atribuicoes ra
            JOIN usuarios u ON ra.usuario_id = u.id
            JOIN usuarios ua ON ra.atribuido_por = ua.id
            WHERE ra.relatorio_id = ? AND ra.ativo = true
            ORDER BY ra.data_atribuicao DESC
        `, [id]);

        // Buscar imagens do relatório
        const imagens = await query(`
            SELECT 
                id,
                nome_arquivo,
                nome_original,
                caminho_arquivo,
                tamanho_arquivo,
                tipo_mime,
                data_upload
            FROM relatorio_imagens
            WHERE relatorio_id = ?
            ORDER BY data_upload ASC
        `, [id]);

        res.json({
            success: true,
            data: {
                relatorio: {
                    ...relatorio,
                    pode_editar: podeEditar,
                    pode_gerenciar_atribuicoes: relatorio.usuario_id === usuarioId || ['admin_master', 'admin'].includes(req.user.nivel_acesso),
                    imagens: imagens
                },
                historico: historico.map(h => ({
                    ...h,
                    anexos: h.anexos ? JSON.parse(`[${h.anexos}]`) : []
                })),
                atribuicoes
            }
        });

    } catch (error) {
        console.error('Erro ao buscar relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/relatorios - Criar novo relatório
router.post('/', upload.array('imagens', 10), relatorioValidation, async (req, res) => {
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
            local_id, 
            equipamento_id, 
            data_ocorrencia, 
            titulo, 
            descricao, 
            status = 'pendente', 
            prioridade = 'media',
            progresso
        } = req.body;

        const usuario_id = req.user.id;

        // Verificar se local existe
        const local = await query('SELECT id FROM locais WHERE id = ? AND ativo = true', [local_id]);
        if (local.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Local não encontrado ou inativo'
            });
        }

        // Verificar se equipamento existe e pertence ao local
        const equipamento = await query(
            'SELECT id FROM equipamentos WHERE id = ? AND local_id = ? AND ativo = true', 
            [equipamento_id, local_id]
        );
        if (equipamento.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Equipamento não encontrado, inativo ou não pertence ao local selecionado'
            });
        }

        // Calcular progresso automaticamente baseado no status
        let progressoCalculado = progresso;
        if (progressoCalculado === undefined) {
            switch (status) {
                case 'pendente':
                    progressoCalculado = 0;
                    break;
                case 'resolvido':
                    progressoCalculado = 100;
                    break;
                default:
                    progressoCalculado = 0;
            }
        }

        // Inserir relatório
        const result = await query(`
            INSERT INTO relatorios 
            (usuario_id, local_id, equipamento_id, data_ocorrencia, titulo, descricao, status, prioridade, progresso) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [usuario_id, local_id, equipamento_id, data_ocorrencia, titulo, descricao, status, prioridade, progressoCalculado]);

        const relatorioId = result.insertId;

        // Salvar imagens anexadas diretamente ao relatório
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await query(`
                    INSERT INTO relatorio_imagens 
                    (relatorio_id, nome_arquivo, nome_original, caminho_arquivo, tamanho_arquivo, tipo_mime) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    relatorioId, 
                    file.filename,
                    file.originalname,
                    file.path, 
                    file.size, 
                    file.mimetype
                ]);
            }
        }

        // 📱 NOTIFICAÇÕES: Notificar sobre novo relatório
        if (req.notificationService) {
            try {
                // Usar o método específico para novo relatório que já implementa a lógica do tenant
                await req.notificationService.notificarNovoRelatorio({
                    id: relatorioId,
                    titulo: titulo,
                    usuario_id: usuario_id,
                    local_id: local_id,
                    equipamento_id: equipamento_id,
                    prioridade: prioridade,
                    tenant_id: req.user.tenant_id
                }, usuario_id);

                console.log(`📱 Notificações de novo relatório enviadas usando método correto`);

            } catch (notificationError) {
                console.error('❌ Erro ao enviar notificações para novo relatório:', notificationError);
                // Não falhar a criação do relatório por erro de notificação
            }
        }

        res.status(201).json({
            success: true,
            message: 'Relatório criado com sucesso',
            data: { id: relatorioId }
        });

    } catch (error) {
        console.error('Erro ao criar relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// PUT /api/relatorios/:id - Atualizar relatório
router.put('/:id', checkPermission('relatorios', 'editar'), upload.array('imagens', 10), relatorioValidation, async (req, res) => {
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
            local_id, 
            equipamento_id, 
            data_ocorrencia, 
            titulo, 
            descricao, 
            status, 
            prioridade,
            progresso,
            imagensParaRemover
        } = req.body;

        // NOVA LÓGICA: Verificar se é apenas atualização limitada (após 24h)
        if (req.isUpdateOnly) {
            // Após 24h, só permite adicionar ao histórico, não editar campos principais
            return res.status(403).json({
                success: false,
                message: 'Após 24h da criação, só é possível adicionar atualizações ao histórico do relatório. Use a função de "Adicionar Progresso" em vez de editar.',
                allowHistoryUpdate: true
            });
        }

        // Verificar se local existe
        const local = await query('SELECT id FROM locais WHERE id = ? AND ativo = true', [local_id]);
        if (local.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Local não encontrado ou inativo'
            });
        }

        // Verificar se equipamento existe e pertence ao local
        const equipamento = await query(
            'SELECT id FROM equipamentos WHERE id = ? AND local_id = ? AND ativo = true', 
            [equipamento_id, local_id]
        );
        if (equipamento.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Equipamento não encontrado, inativo ou não pertence ao local selecionado'
            });
        }

        // Calcular progresso automaticamente baseado no status
        let progressoCalculado = progresso;
        if (progressoCalculado === undefined) {
            switch (status) {
                case 'pendente':
                    progressoCalculado = 0;
                    break;
                case 'resolvido':
                    progressoCalculado = 100;
                    break;
                default:
                    progressoCalculado = progresso || 0;
            }
        }

        // Atualizar relatório
        const editavel = status !== 'resolvido';
        await query(`
            UPDATE relatorios SET 
            local_id = ?, equipamento_id = ?, data_ocorrencia = ?, titulo = ?, 
            descricao = ?, status = ?, prioridade = ?, progresso = ?, editavel = ?
            WHERE id = ?
        `, [local_id, equipamento_id, data_ocorrencia, titulo, descricao, status, prioridade, progressoCalculado, editavel, id]);

        // Remover imagens selecionadas
        if (imagensParaRemover) {
            try {
                const idsParaRemover = JSON.parse(imagensParaRemover);
                if (Array.isArray(idsParaRemover) && idsParaRemover.length > 0) {
                    // Buscar caminhos dos arquivos antes de deletar do banco
                    const imagensParaDeletar = await query(`
                        SELECT caminho_arquivo FROM relatorio_imagens 
                        WHERE id IN (${idsParaRemover.map(() => '?').join(',')}) AND relatorio_id = ?
                    `, [...idsParaRemover, id]);

                    // Deletar do banco de dados
                    await query(`
                        DELETE FROM relatorio_imagens 
                        WHERE id IN (${idsParaRemover.map(() => '?').join(',')}) AND relatorio_id = ?
                    `, [...idsParaRemover, id]);

                    // Deletar arquivos físicos
                    imagensParaDeletar.forEach(img => {
                        try {
                            if (fs.existsSync(img.caminho_arquivo)) {
                                fs.unlinkSync(img.caminho_arquivo);
                            }
                        } catch (deleteError) {
                            console.error('Erro ao deletar arquivo:', deleteError);
                        }
                    });
                }
            } catch (parseError) {
                console.error('Erro ao processar imagens para remoção:', parseError);
            }
        }

        // Salvar novas imagens anexadas
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await query(`
                    INSERT INTO relatorio_imagens 
                    (relatorio_id, nome_arquivo, nome_original, caminho_arquivo, tamanho_arquivo, tipo_mime) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    id, 
                    file.filename,
                    file.originalname,
                    file.path, 
                    file.size, 
                    file.mimetype
                ]);
            }
        }

        // 📱 NOTIFICAÇÕES: Notificar sobre edição do relatório
        if (req.notificationService) {
            try {
                // Buscar dados do relatório para a notificação
                const [relatorioInfo] = await query(`
                    SELECT 
                        r.titulo,
                        r.prioridade,
                        r.tenant_id,
                        u.nome as editor_nome
                    FROM relatorios r
                    JOIN usuarios u ON r.usuario_id = u.id
                    WHERE r.id = ?
                `, [id]);

                if (relatorioInfo) {
                    // Buscar administradores do tenant (exceto o editor)
                    const admins = await query(`
                        SELECT id FROM usuarios 
                        WHERE tenant_id = ? 
                        AND nivel_acesso IN ('admin_master', 'admin') 
                        AND ativo = true 
                        AND id != ?
                    `, [req.user.tenant_id, req.user.id]);

                    const usuariosParaNotificar = admins.map(admin => admin.id);

                    if (usuariosParaNotificar.length > 0) {
                        await req.notificationService.notificarUsuarios(usuariosParaNotificar, {
                            relatorioId: id,
                            tipo: 'atualizacao_historico',
                            titulo: `Relatório editado: ${relatorioInfo.titulo}`,
                            mensagem: `${req.user.nome} editou o relatório "${relatorioInfo.titulo}"`,
                            dadosExtras: {
                                editor: req.user.nome,
                                prioridade: relatorioInfo.prioridade,
                                acao: 'edicao_relatorio'
                            }
                        });

                        console.log(`📱 Notificações de edição de relatório enviadas para ${usuariosParaNotificar.length} administradores`);
                    }
                }

            } catch (notificationError) {
                console.error('❌ Erro ao enviar notificações para edição de relatório:', notificationError);
                // Não falhar a edição do relatório por erro de notificação
            }
        }

        res.json({
            success: true,
            message: 'Relatório atualizado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atualizar relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/relatorios/:id/historico - Adicionar entrada no histórico com upload de imagens
router.post('/:id/historico', checkPermission('relatorios', 'editar'), upload.array('anexos', 5), historicoValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { id: relatorio_id } = req.params;
        const { descricao, progresso } = req.body;
        const usuario_id = req.user.id;

        // Verificar se relatório existe e usuário pode editar
        const relatorio = await query(
            'SELECT status, progresso as progresso_atual, titulo FROM relatorios WHERE id = ?',
            [relatorio_id]
        );

        if (relatorio.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado'
            });
        }

        const statusAnterior = relatorio[0].status;
        const tituloRelatorio = relatorio[0].titulo;
        let novoStatus = statusAnterior;

        // Determinar novo status baseado no progresso
        if (progresso == 0) {
            novoStatus = 'pendente';
        } else if (progresso == 100) {
            novoStatus = 'resolvido';
        } else if (progresso > 0 && progresso < 100) {
            novoStatus = 'em_andamento';
        }

        // Inserir entrada no histórico
        const historicoResult = await query(`
            INSERT INTO relatorio_historico 
            (relatorio_id, usuario_id, status_anterior, status_novo, descricao, progresso) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [relatorio_id, usuario_id, statusAnterior, novoStatus, descricao, progresso]);

        const historicoId = historicoResult.insertId;

        // Salvar imagens anexadas
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await query(`
                    INSERT INTO relatorio_imagens 
                    (historico_id, nome_arquivo, nome_original, caminho_arquivo, tamanho_arquivo, tipo_mime) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    historicoId, 
                    file.filename,
                    file.originalname,
                    file.path, 
                    file.size, 
                    file.mimetype
                ]);
            }
        }

        // Atualizar progresso e status do relatório
        const editavel = novoStatus !== 'resolvido';
        await query(`
            UPDATE relatorios SET 
            progresso = ?, status = ?, editavel = ?
            WHERE id = ?
        `, [progresso, novoStatus, editavel, relatorio_id]);

        // 📱 NOTIFICAÇÕES: Notificar usuários atribuídos sobre atualização no histórico
        if (req.notificationService) {
            await req.notificationService.notificarAtribuidos(relatorio_id, {
                tipo: 'atualizacao_historico',
                titulo: `Atualização no relatório: ${tituloRelatorio}`,
                mensagem: `${req.user.nome} atualizou o progresso para ${progresso}%: ${descricao}`,
                dadosExtras: {
                    progresso_anterior: relatorio[0].progresso_atual,
                    progresso_novo: progresso,
                    status_anterior: statusAnterior,
                    status_novo: novoStatus,
                    tem_anexos: req.files && req.files.length > 0
                }
            });

            // Se status mudou, notificar sobre mudança de status
            if (statusAnterior !== novoStatus) {
                await req.notificationService.notificarAtribuidos(relatorio_id, {
                    tipo: 'status_alterado',
                    titulo: `Status alterado: ${tituloRelatorio}`,
                    mensagem: `Status alterado de "${statusAnterior}" para "${novoStatus}" por ${req.user.nome}`,
                    dadosExtras: {
                        status_anterior: statusAnterior,
                        status_novo: novoStatus
                    }
                });
            }
        }

        res.json({
            success: true,
            message: 'Histórico adicionado com sucesso',
            data: { historicoId }
        });

    } catch (error) {
        console.error('Erro ao adicionar histórico:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/relatorios/:id/usuarios-disponiveis - Listar usuários disponíveis para atribuição
router.get('/:id/usuarios-disponiveis', checkPermission('relatorios', 'gerenciar_atribuicoes'), async (req, res) => {
    try {
        const { id: relatorioId } = req.params;
        console.log('🔍 Buscando usuários para relatório:', relatorioId);

        // Buscar o criador do relatório para não incluí-lo na lista de seleção
        const [relatorio] = await query(`
            SELECT usuario_id FROM relatorios WHERE id = ?
        `, [relatorioId]);

        if (!relatorio) {
            console.log('❌ Relatório não encontrado:', relatorioId);
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado'
            });
        }

        console.log('📄 Relatório encontrado, criador:', relatorio.usuario_id);

        // Primeiro, vamos buscar todos os usuários ativos para debug
        const todosUsuarios = await query(`
            SELECT id, nome, email, setor, nivel_acesso, ativo 
            FROM usuarios 
            WHERE ativo = true
            ORDER BY nome
        `);

        console.log('👥 Total de usuários ativos no sistema:', todosUsuarios.length);
        console.log('📋 Usuários:', todosUsuarios.map(u => ({ id: u.id, nome: u.nome, nivel: u.nivel_acesso })));

        // Buscar todos os usuários ativos exceto o criador do relatório
        const usuarios = await query(`
            SELECT 
                u.id,
                u.nome,
                u.email,
                u.setor,
                u.nivel_acesso,
                CASE 
                    WHEN ra.usuario_id IS NOT NULL THEN true 
                    ELSE false 
                END as ja_atribuido
            FROM usuarios u
            LEFT JOIN relatorio_atribuicoes ra ON u.id = ra.usuario_id 
                AND ra.relatorio_id = ? 
                AND ra.ativo = true
            WHERE u.ativo = true 
            AND u.id != ?
            ORDER BY u.nome
        `, [relatorioId, relatorio.usuario_id]);

        console.log('✅ Usuários disponíveis para atribuição:', usuarios.length);
        console.log('📝 Lista filtrada:', usuarios.map(u => ({ 
            id: u.id, 
            nome: u.nome, 
            nivel: u.nivel_acesso,
            ja_atribuido: u.ja_atribuido 
        })));

        res.json({
            success: true,
            data: {
                usuarios,
                criador_id: relatorio.usuario_id,
                debug: {
                    total_usuarios_sistema: todosUsuarios.length,
                    usuarios_disponiveis: usuarios.length,
                    criador_id: relatorio.usuario_id
                }
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar usuários disponíveis:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/relatorios/:id/atribuicoes - Atribuir usuários ao relatório
router.post('/:id/atribuicoes', checkPermission('relatorios', 'gerenciar_atribuicoes'), atribuicaoValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: errors.array()
            });
        }

        const { id: relatorio_id } = req.params;
        const { usuario_ids } = req.body;
        const atribuido_por = req.user.id;

        // Verificar se relatório existe
        const relatorio = await query('SELECT usuario_id, titulo FROM relatorios WHERE id = ?', [relatorio_id]);
        if (relatorio.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado'
            });
        }

        // Verificar se usuário é o criador do relatório ou admin
        if (relatorio[0].usuario_id !== atribuido_por && req.user.nivel_acesso === 'usuario') {
            return res.status(403).json({
                success: false,
                message: 'Apenas o criador do relatório ou administradores podem fazer atribuições'
            });
        }

        const tituloRelatorio = relatorio[0].titulo;

        // Buscar atribuições anteriores para comparar
        const atribuicoesAnteriores = await query(`
            SELECT usuario_id FROM relatorio_atribuicoes 
            WHERE relatorio_id = ? AND ativo = true
        `, [relatorio_id]);
        
        const usuariosAnteriores = atribuicoesAnteriores.map(a => a.usuario_id);

        // Desativar atribuições anteriores
        await query(`
            UPDATE relatorio_atribuicoes 
            SET ativo = false 
            WHERE relatorio_id = ?
        `, [relatorio_id]);

        // Inserir novas atribuições
        const novosUsuarios = [];
        for (const usuario_id of usuario_ids) {
            // Verificar se usuário existe
            const usuario = await query('SELECT id FROM usuarios WHERE id = ? AND ativo = true', [usuario_id]);
            if (usuario.length > 0) {
                await query(`
                    INSERT INTO relatorio_atribuicoes 
                    (relatorio_id, usuario_id, atribuido_por) 
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    ativo = true, data_atribuicao = CURRENT_TIMESTAMP, atribuido_por = ?
                `, [relatorio_id, usuario_id, atribuido_por, atribuido_por]);

                // Se é um novo usuário atribuído, adicionar à lista de notificações
                if (!usuariosAnteriores.includes(usuario_id)) {
                    novosUsuarios.push(usuario_id);
                }
            }
        }

        // 📱 NOTIFICAÇÕES: Notificar novos usuários atribuídos
        if (req.notificationService && novosUsuarios.length > 0) {
            await req.notificationService.notificarUsuarios(novosUsuarios, {
                relatorioId: relatorio_id,
                tipo: 'nova_atribuicao',
                titulo: `Você foi atribuído ao relatório: ${tituloRelatorio}`,
                mensagem: `${req.user.nome} atribuiu você para trabalhar neste relatório. Clique para ver detalhes.`,
                dadosExtras: {
                    atribuido_por: req.user.nome,
                    total_atribuidos: usuario_ids.length
                }
            });
        }

        res.json({
            success: true,
            message: 'Atribuições atualizadas com sucesso'
        });

    } catch (error) {
        console.error('Erro ao atribuir usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// DELETE /api/relatorios/:id - Excluir relatório (apenas admin_master)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Apenas admin_master pode excluir relatórios
        if (req.user.nivel_acesso !== 'admin_master') {
            return res.status(403).json({
                success: false,
                message: 'Apenas Admin Master pode excluir relatórios'
            });
        }

        // Verificar se relatório existe
        const relatorio = await query('SELECT id FROM relatorios WHERE id = ?', [id]);
        if (relatorio.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado'
            });
        }

        // Excluir relatório (hard delete - cuidado em produção)
        await query('DELETE FROM relatorios WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Relatório excluído com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/relatorios/:id/marcar-visualizado - Marcar relatório como visualizado
router.post('/:id/marcar-visualizado', checkPermission('relatorios', 'visualizar'), async (req, res) => {
    try {
        const { id: relatorio_id } = req.params;
        const usuario_id = req.user.id;

        // Verificar se o relatório existe
        const relatorio = await query('SELECT id FROM relatorios WHERE id = ?', [relatorio_id]);
        if (relatorio.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado'
            });
        }

        // Inserir ou atualizar visualização (UPSERT)
        await query(`
            INSERT INTO relatorio_visualizacoes (relatorio_id, usuario_id) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE data_visualizacao = CURRENT_TIMESTAMP
        `, [relatorio_id, usuario_id]);

        console.log(`📖 Usuário ${req.user.nome} visualizou relatório ${relatorio_id}`);

        res.json({
            success: true,
            message: 'Relatório marcado como visualizado'
        });

    } catch (error) {
        console.error('Erro ao marcar relatório como visualizado:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Reabrir relatório concluído (apenas admin master)
router.put('/:id/reabrir', checkPermission('relatorios', 'gerenciar_atribuicoes'), async (req, res) => {
    const { id } = req.params;

    try {
        // Verificar se é admin master
        if (req.user.nivel_acesso !== 'admin_master') {
            return res.status(403).json({
                success: false,
                message: 'Apenas Admin Master pode reabrir relatórios concluídos'
            });
        }

        // Verificar se o relatório existe e está concluído
        const relatorio = await query(
            'SELECT status, titulo FROM relatorios WHERE id = ?',
            [id]
        );

        if (relatorio.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado'
            });
        }

        if (relatorio[0].status !== 'resolvido') {
            return res.status(400).json({
                success: false,
                message: 'Apenas relatórios concluídos podem ser reabertos'
            });
        }

        // Reabrir o relatório (mudar status para em_andamento e tornar editável)
        await query(
            'UPDATE relatorios SET status = ?, editavel = true, data_atualizacao = NOW() WHERE id = ?',
            ['em_andamento', id]
        );

        // Adicionar entrada no histórico
        await query(
            `INSERT INTO relatorio_historico 
             (relatorio_id, usuario_id, status_anterior, status_novo, descricao, progresso, data_atualizacao) 
             VALUES (?, ?, ?, ?, ?, 90, NOW())`,
            [
                id,
                req.user.id,
                'resolvido',
                'em_andamento',
                'Relatório reaberto pelo Admin Master - Necessária revisão adicional'
            ]
        );

        // Criar notificação
        if (global.notificationService) {
            await global.notificationService.notificarAtribuidos(id, {
                tipo: 'status_alterado',
                titulo: `Relatório Reaberto: ${relatorio[0].titulo}`,
                mensagem: 'Um relatório concluído foi reaberto pelo Admin Master',
                dadosExtras: { status_anterior: 'resolvido', status_novo: 'em_andamento' }
            });
        }

        res.json({
            success: true,
            message: 'Relatório reaberto com sucesso'
        });

    } catch (error) {
        console.error('Erro ao reabrir relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// GET /api/relatorios/:id/pdf - Exportar relatório em PDF
router.get('/:id/pdf', checkPermission('relatorios', 'visualizar'), async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar dados completos do relatório
        const [relatorio] = await query(`
            SELECT 
                r.*,
                u.nome as usuario_nome,
                l.nome as local_nome,
                e.nome as equipamento_nome
            FROM relatorios r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN locais l ON r.local_id = l.id
            JOIN equipamentos e ON r.equipamento_id = e.id
            WHERE r.id = ?
        `, [id]);

        if (!relatorio) {
            return res.status(404).json({
                success: false,
                message: 'Relatório não encontrado'
            });
        }

        // Buscar imagens do relatório principal
        const imagensRelatorio = await query(`
            SELECT 
                id,
                nome_arquivo,
                nome_original,
                caminho_arquivo,
                tamanho_arquivo,
                tipo_mime,
                data_upload
            FROM relatorio_imagens
            WHERE relatorio_id = ? AND historico_id IS NULL
            ORDER BY data_upload ASC
        `, [id]);

        // Adicionar imagens ao objeto relatório
        relatorio.imagens = imagensRelatorio;

        // Buscar histórico do relatório
        const historico = await query(`
            SELECT 
                h.*,
                u.nome as usuario_nome,
                (SELECT GROUP_CONCAT(
                    JSON_OBJECT(
                        'id', ri.id,
                        'nome_arquivo', ri.nome_arquivo,
                        'nome_original', ri.nome_original,
                        'caminho_arquivo', ri.caminho_arquivo,
                        'tamanho_arquivo', ri.tamanho_arquivo,
                        'tipo_mime', ri.tipo_mime
                    )
                ) FROM relatorio_imagens ri WHERE ri.historico_id = h.id) as anexos
            FROM relatorio_historico h
            JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.relatorio_id = ?
            ORDER BY h.data_atualizacao ASC
        `, [id]);

        // Buscar usuários atribuídos
        const atribuicoes = await query(`
            SELECT 
                ra.*,
                u.nome as usuario_nome,
                u.email as usuario_email,
                ua.nome as atribuido_por_nome
            FROM relatorio_atribuicoes ra
            JOIN usuarios u ON ra.usuario_id = u.id
            JOIN usuarios ua ON ra.atribuido_por = ua.id
            WHERE ra.relatorio_id = ? AND ra.ativo = true
            ORDER BY ra.data_atribuicao DESC
        `, [id]);

        // Processar anexos do histórico
        const historicoProcessado = historico.map(h => ({
            ...h,
            anexos: h.anexos ? JSON.parse(`[${h.anexos}]`) : []
        }));

        // Gerar PDF
        const pdfBuffer = await pdfService.gerarPDFRelatorio(
            relatorio, 
            historicoProcessado, 
            atribuicoes
        );

        // Definir nome do arquivo
        const nomeArquivo = `relatorio-${id}-${Date.now()}.pdf`;

        // Configurar headers para download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
            'Content-Length': pdfBuffer.byteLength,
            'Cache-Control': 'no-cache'
        });

        // Enviar PDF
        res.send(Buffer.from(pdfBuffer));

        console.log(`📄 PDF gerado para relatório ${id} por usuário ${req.user.nome}`);

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar PDF do relatório'
        });
    }
});

module.exports = router; 