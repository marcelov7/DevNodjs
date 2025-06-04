const { query } = require('../config/database');

class NotificationService {
    constructor(io) {
        this.io = io;
        this.userSockets = new Map(); // Map para rastrear conexões de usuários
    }

    // Registrar conexão de usuário
    registerUser(socketId, userId) {
        this.userSockets.set(userId, socketId);
        console.log(`🔌 Usuário ${userId} conectado via socket ${socketId}`);
    }

    // Remover conexão de usuário
    unregisterUser(userId) {
        this.userSockets.delete(userId);
        console.log(`🔌 Usuário ${userId} desconectado`);
    }

    // Criar e enviar notificação
    async criarNotificacao({ 
        usuarioId, 
        relatorioId = null, 
        tipo, 
        titulo, 
        mensagem, 
        dadosExtras = null 
    }) {
        try {
            // Verificar preferências do usuário - se não existir configuração, permitir por padrão
            const preferencias = await query(`
                SELECT * FROM notificacao_preferencias 
                WHERE usuario_id = ? AND tipo_notificacao = ?
            `, [usuarioId, tipo]);

            // Se não há preferência configurada, permitir notificação por padrão
            // Se há preferência configurada, verificar se está ativa
            if (preferencias.length > 0 && !preferencias[0].ativo) {
                console.log(`⚠️ Usuário ${usuarioId} desabilitou notificações do tipo ${tipo}`);
                return null;
            }

            console.log(`✅ Enviando notificação para usuário ${usuarioId} do tipo ${tipo}`);

            // Inserir notificação no banco
            const result = await query(`
                INSERT INTO notificacoes 
                (usuario_id, relatorio_id, tipo, titulo, mensagem, dados_extras) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                usuarioId, 
                relatorioId, 
                tipo, 
                titulo, 
                mensagem, 
                dadosExtras ? JSON.stringify(dadosExtras) : null
            ]);

            const notificacaoId = result.insertId;

            // Buscar dados completos da notificação
            const [notificacao] = await query(`
                SELECT 
                    n.*,
                    u.nome as usuario_nome,
                    r.titulo as relatorio_titulo
                FROM notificacoes n
                JOIN usuarios u ON n.usuario_id = u.id
                LEFT JOIN relatorios r ON n.relatorio_id = r.id
                WHERE n.id = ?
            `, [notificacaoId]);

            // Enviar via WebSocket se usuário estiver online
            const socketId = this.userSockets.get(usuarioId);
            if (socketId && this.io.sockets.sockets.get(socketId)) {
                this.io.to(socketId).emit('nova_notificacao', {
                    id: notificacao.id,
                    tipo: notificacao.tipo,
                    titulo: notificacao.titulo,
                    mensagem: notificacao.mensagem,
                    relatorio_id: notificacao.relatorio_id,
                    relatorio_titulo: notificacao.relatorio_titulo,
                    dados_extras: notificacao.dados_extras ? JSON.parse(notificacao.dados_extras) : null,
                    data_criacao: notificacao.data_criacao,
                    lida: notificacao.lida
                });

                console.log(`🔔 Notificação enviada para usuário ${usuarioId}: ${titulo}`);
            } else {
                console.log(`💤 Usuário ${usuarioId} offline, notificação salva para visualização posterior`);
            }

            return notificacaoId;

        } catch (error) {
            console.error('❌ Erro ao criar notificação:', error);
            throw error;
        }
    }

    // Notificar múltiplos usuários
    async notificarUsuarios(usuarioIds, notificacaoData) {
        const promises = usuarioIds.map(usuarioId => 
            this.criarNotificacao({
                ...notificacaoData,
                usuarioId
            })
        );

        return Promise.all(promises);
    }

    // Notificar usuários atribuídos a um relatório
    async notificarAtribuidos(relatorioId, notificacaoData) {
        try {
            const atribuidos = await query(`
                SELECT DISTINCT ra.usuario_id 
                FROM relatorio_atribuicoes ra 
                WHERE ra.relatorio_id = ? AND ra.ativo = true
            `, [relatorioId]);

            const usuarioIds = atribuidos.map(a => a.usuario_id);
            
            if (usuarioIds.length > 0) {
                return this.notificarUsuarios(usuarioIds, {
                    ...notificacaoData,
                    relatorioId
                });
            }

            return [];
        } catch (error) {
            console.error('❌ Erro ao notificar usuários atribuídos:', error);
            throw error;
        }
    }

    // Marcar notificação como lida
    async marcarComoLida(notificacaoId, usuarioId) {
        try {
            await query(`
                UPDATE notificacoes 
                SET lida = true, data_leitura = CURRENT_TIMESTAMP 
                WHERE id = ? AND usuario_id = ?
            `, [notificacaoId, usuarioId]);

            // Notificar cliente sobre atualização
            const socketId = this.userSockets.get(usuarioId);
            if (socketId && this.io.sockets.sockets.get(socketId)) {
                this.io.to(socketId).emit('notificacao_lida', { id: notificacaoId });
            }

            console.log(`✅ Notificação ${notificacaoId} marcada como lida pelo usuário ${usuarioId}`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao marcar notificação como lida:', error);
            throw error;
        }
    }

    // Marcar todas as notificações como lidas
    async marcarTodasComoLidas(usuarioId) {
        try {
            await query(`
                UPDATE notificacoes 
                SET lida = true, data_leitura = CURRENT_TIMESTAMP 
                WHERE usuario_id = ? AND lida = false
            `, [usuarioId]);

            // Notificar cliente
            const socketId = this.userSockets.get(usuarioId);
            if (socketId && this.io.sockets.sockets.get(socketId)) {
                this.io.to(socketId).emit('todas_notificacoes_lidas');
            }

            console.log(`✅ Todas as notificações marcadas como lidas para usuário ${usuarioId}`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao marcar todas as notificações como lidas:', error);
            throw error;
        }
    }

    // Buscar notificações de um usuário
    async buscarNotificacoes(usuarioId, { limit = 50, offset = 0, apenasNaoLidas = false } = {}) {
        try {
            let whereClause = 'WHERE n.usuario_id = ?';
            let params = [usuarioId];

            if (apenasNaoLidas) {
                whereClause += ' AND n.lida = false';
            }

            const notificacoes = await query(`
                SELECT 
                    n.*,
                    r.titulo as relatorio_titulo
                FROM notificacoes n
                LEFT JOIN relatorios r ON n.relatorio_id = r.id
                ${whereClause}
                ORDER BY n.data_criacao DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            // Contar total não lidas
            const [{ total_nao_lidas }] = await query(`
                SELECT COUNT(*) as total_nao_lidas 
                FROM notificacoes 
                WHERE usuario_id = ? AND lida = false
            `, [usuarioId]);

            return {
                notificacoes: notificacoes.map(n => ({
                    ...n,
                    dados_extras: n.dados_extras ? JSON.parse(n.dados_extras) : null
                })),
                total_nao_lidas
            };
        } catch (error) {
            console.error('❌ Erro ao buscar notificações:', error);
            throw error;
        }
    }

    // Limpar notificações antigas (mais de 30 dias)
    async limparNotificacoesAntigas() {
        try {
            const result = await query(`
                DELETE FROM notificacoes 
                WHERE data_criacao < DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            console.log(`🧹 ${result.affectedRows} notificações antigas removidas`);
            return result.affectedRows;
        } catch (error) {
            console.error('❌ Erro ao limpar notificações antigas:', error);
            throw error;
        }
    }

    // Enviar contagem de notificações não lidas
    async enviarContagemNaoLidas(usuarioId) {
        try {
            const [{ total }] = await query(`
                SELECT COUNT(*) as total 
                FROM notificacoes 
                WHERE usuario_id = ? AND lida = false
            `, [usuarioId]);

            const socketId = this.userSockets.get(usuarioId);
            if (socketId && this.io.sockets.sockets.get(socketId)) {
                this.io.to(socketId).emit('contagem_nao_lidas', { total });
            }

            return total;
        } catch (error) {
            console.error('❌ Erro ao enviar contagem não lidas:', error);
            throw error;
        }
    }

    // Notificar sobre novo relatório criado
    async notificarNovoRelatorio(relatorioData, excludeUserId = null) {
        try {
            const { id: relatorioId, titulo, usuario_id, local_id, equipamento_id, tenant_id } = relatorioData;

            // Buscar informações do relatório
            const [relatorioInfo] = await query(`
                SELECT 
                    r.titulo,
                    r.prioridade,
                    u.nome as criador_nome,
                    l.nome as local_nome,
                    e.nome as equipamento_nome
                FROM relatorios r
                JOIN usuarios u ON r.usuario_id = u.id
                JOIN locais l ON r.local_id = l.id
                JOIN equipamentos e ON r.equipamento_id = e.id
                WHERE r.id = ?
            `, [relatorioId]);

            if (!relatorioInfo) {
                console.log('⚠️ Relatório não encontrado para notificação');
                return [];
            }

            // Definir usuários que devem ser notificados baseado no tenant
            let usuariosParaNotificar = [];

            // 1. Notificar admins da organização
            const admins = await query(`
                SELECT id FROM usuarios 
                WHERE tenant_id = ? 
                AND nivel_acesso IN ('admin_master', 'admin') 
                AND ativo = true
                AND id != ?
            `, [tenant_id, excludeUserId || 0]);

            usuariosParaNotificar = admins.map(admin => admin.id);

            // 2. Se prioridade alta/crítica, notificar todos os usuários ativos
            if (['alta', 'critica'].includes(relatorioInfo.prioridade)) {
                const todosUsuarios = await query(`
                    SELECT id FROM usuarios 
                    WHERE tenant_id = ? 
                    AND ativo = true 
                    AND id != ?
                `, [tenant_id, excludeUserId || 0]);

                usuariosParaNotificar = [...new Set([
                    ...usuariosParaNotificar,
                    ...todosUsuarios.map(u => u.id)
                ])];
            }

            if (usuariosParaNotificar.length === 0) {
                console.log('ℹ️ Nenhum usuário para notificar sobre novo relatório');
                return [];
            }

            // Criar notificação
            const notificacaoData = {
                tipo: 'comentario',
                titulo: `Novo relatório criado: ${relatorioInfo.titulo}`,
                mensagem: `${relatorioInfo.criador_nome} criou um novo relatório ${relatorioInfo.prioridade === 'critica' ? '🔴 CRÍTICO' : relatorioInfo.prioridade === 'alta' ? '🟡 ALTA PRIORIDADE' : ''} em ${relatorioInfo.local_nome}`,
                relatorioId: relatorioId,
                dadosExtras: {
                    prioridade: relatorioInfo.prioridade,
                    local: relatorioInfo.local_nome,
                    equipamento: relatorioInfo.equipamento_nome,
                    criador: relatorioInfo.criador_nome,
                    acao: 'novo_relatorio'
                }
            };

            // Enviar notificações para todos os usuários
            const promises = usuariosParaNotificar.map(usuarioId => 
                this.criarNotificacao({
                    ...notificacaoData,
                    usuarioId,
                    relatorioId
                })
            );

            const results = await Promise.all(promises);
            console.log(`🔔 ${results.filter(r => r).length} notificações de novo relatório enviadas`);
            
            return results.filter(r => r);

        } catch (error) {
            console.error('❌ Erro ao notificar novo relatório:', error);
            throw error;
        }
    }

    // Notificar sobre nova inspeção de gerador
    async notificarNovaInspecaoGerador(inspecaoData, excludeUserId = null) {
        try {
            const { id: inspecaoId, colaborador, data, tenant_id, user_id } = inspecaoData;

            // Buscar administradores do tenant
            const admins = await query(`
                SELECT id FROM usuarios 
                WHERE tenant_id = ? 
                AND nivel_acesso IN ('admin_master', 'admin') 
                AND ativo = true
                AND id != ?
            `, [tenant_id, excludeUserId || user_id]);

            const usuariosParaNotificar = admins.map(admin => admin.id);

            if (usuariosParaNotificar.length === 0) {
                console.log('ℹ️ Nenhum administrador para notificar sobre nova inspeção de gerador');
                return [];
            }

            // Criar notificação
            const notificacaoData = {
                tipo: 'comentario',
                titulo: `🔧 Nova inspeção de gerador realizada`,
                mensagem: `${colaborador} realizou uma inspeção de gerador em ${new Date(data).toLocaleDateString('pt-BR')}`,
                dadosExtras: {
                    colaborador: colaborador,
                    data_inspecao: data,
                    inspecao_id: inspecaoId,
                    tipo_equipamento: 'gerador',
                    acao: 'nova_inspecao_gerador'
                }
            };

            // Enviar notificações
            const promises = usuariosParaNotificar.map(usuarioId => 
                this.criarNotificacao({
                    ...notificacaoData,
                    usuarioId
                })
            );

            const results = await Promise.all(promises);
            console.log(`🔔 ${results.filter(r => r).length} notificações de nova inspeção de gerador enviadas`);
            
            return results.filter(r => r);

        } catch (error) {
            console.error('❌ Erro ao notificar nova inspeção de gerador:', error);
            throw error;
        }
    }

    // Notificar sobre novo analisador
    async notificarNovoAnalisador(analisadorData, excludeUserId = null) {
        try {
            const { id: analisadorId, analyzer, check_date, tenant_id, user_id } = analisadorData;

            // Buscar administradores do tenant
            const admins = await query(`
                SELECT id FROM usuarios 
                WHERE tenant_id = ? 
                AND nivel_acesso IN ('admin_master', 'admin') 
                AND ativo = true
                AND id != ?
            `, [tenant_id, excludeUserId || user_id]);

            const usuariosParaNotificar = admins.map(admin => admin.id);

            if (usuariosParaNotificar.length === 0) {
                console.log('ℹ️ Nenhum administrador para notificar sobre novo analisador');
                return [];
            }

            // Buscar nome do usuário que criou
            const [criador] = await query('SELECT nome FROM usuarios WHERE id = ?', [user_id]);
            const nomeUser = criador?.nome || 'Usuário';

            // Criar notificação
            const notificacaoData = {
                tipo: 'comentario',
                titulo: `📊 Novo analisador registrado`,
                mensagem: `${nomeUser} registrou um novo analisador: ${analyzer} (${new Date(check_date).toLocaleDateString('pt-BR')})`,
                dadosExtras: {
                    criador: nomeUser,
                    analyzer: analyzer,
                    check_date: check_date,
                    analisador_id: analisadorId,
                    tipo_equipamento: 'analisador',
                    acao: 'novo_analisador'
                }
            };

            // Enviar notificações
            const promises = usuariosParaNotificar.map(usuarioId => 
                this.criarNotificacao({
                    ...notificacaoData,
                    usuarioId
                })
            );

            const results = await Promise.all(promises);
            console.log(`🔔 ${results.filter(r => r).length} notificações de novo analisador enviadas`);
            
            return results.filter(r => r);

        } catch (error) {
            console.error('❌ Erro ao notificar novo analisador:', error);
            throw error;
        }
    }

    // Buscar estatísticas de notificações por tenant
    async buscarEstatisticasNotificacoes(tenantId) {
        try {
            const [stats] = await query(`
                SELECT 
                    COUNT(*) as total_notificacoes,
                    SUM(CASE WHEN lida = false THEN 1 ELSE 0 END) as nao_lidas,
                    SUM(CASE WHEN tipo = 'nova_atribuicao' THEN 1 ELSE 0 END) as atribuicoes,
                    SUM(CASE WHEN tipo = 'atualizacao_historico' THEN 1 ELSE 0 END) as atualizacoes,
                    SUM(CASE WHEN tipo = 'status_alterado' THEN 1 ELSE 0 END) as status_alterados,
                    SUM(CASE WHEN tipo = 'comentario' THEN 1 ELSE 0 END) as comentarios,
                    SUM(CASE WHEN tipo = 'nova_inspecao_gerador' THEN 1 ELSE 0 END) as inspecoes_gerador,
                    SUM(CASE WHEN tipo = 'novo_analisador' THEN 1 ELSE 0 END) as novos_analisadores
                FROM notificacoes n
                JOIN usuarios u ON n.usuario_id = u.id
                WHERE u.tenant_id = ?
                AND n.data_criacao >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [tenantId]);

            return stats;
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas de notificações:', error);
            throw error;
        }
    }
}

module.exports = NotificationService; 