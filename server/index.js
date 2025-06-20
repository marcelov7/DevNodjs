const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const { testConnection, initializeDatabase, query } = require('./config/database');
const NotificationService = require('./services/notificationService');
const { getAllowedOrigins } = require('./utils/networkUtils');
const { refreshPermissionsCache } = require('./middleware/permissions');

const app = express();
const server = createServer(app);

// Configuração de origens permitidas para CORS
const isProduction = process.env.NODE_ENV === 'production';
let allowedOrigins;

if (isProduction) {
    // Em produção, usar CORS_ORIGIN do ambiente ou padrão
    allowedOrigins = [
        'https://dev-nodjs.vercel.app',    // Domínio atual do Vercel (PRIORITÁRIO)
        'https://sistemasmc.vercel.app',   // Adicionar seu domínio aqui
        'https://systemsmc.vercel.app',    // Caso tenha outro nome
        process.env.CORS_ORIGIN || 'https://seu-frontend.vercel.app' // Fallback
    ].filter(Boolean); // Remove valores undefined/null
} else {
    // Em desenvolvimento, usar detecção automática
    allowedOrigins = getAllowedOrigins();
}

console.log('🌐 Ambiente:', process.env.NODE_ENV);
console.log('🌐 CORS_ORIGIN env:', process.env.CORS_ORIGIN);
console.log('🌐 Origens permitidas para CORS:', allowedOrigins);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Inicializar serviço de notificações
const notificationService = new NotificationService(io);

// Middleware global para disponibilizar o serviço de notificações
app.use((req, res, next) => {
    req.notificationService = notificationService;
    next();
});

// Middlewares
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
}));

app.use(cors({
    origin: function (origin, callback) {
        console.log(`🔍 CORS verificando origem: ${origin}`);
        
        // Permitir requisições sem origin (mobile apps, etc.)
        if (!origin) {
            console.log('✅ CORS permitiu requisição sem origin');
            return callback(null, true);
        }
        
        // Verificar se a origem está na lista permitida
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return allowedOrigin === origin;
            } else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });
        
        if (isAllowed) {
            console.log(`✅ CORS permitiu origem: ${origin}`);
            callback(null, true);
        } else {
            console.log(`❌ CORS bloqueou origem: ${origin}`);
            console.log(`📋 Origens permitidas:`, allowedOrigins);
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200 // Para suporte a browsers antigos
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para logs das requisições (apenas em desenvolvimento)
if (!isProduction) {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Configuração do Socket.io
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Token não fornecido'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userInfo = decoded;
        next();
    } catch (error) {
        console.error('❌ Erro na autenticação do socket:', error);
        next(new Error('Token inválido'));
    }
});

io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`🔌 Cliente conectado: ${socket.id} (Usuário: ${userId})`);

    // Registrar usuário no serviço de notificações
    notificationService.registerUser(socket.id, userId);

    // Enviar contagem inicial de notificações não lidas
    notificationService.enviarContagemNaoLidas(userId);

    // Evento para marcar notificação como lida
    socket.on('marcar_lida', async (data) => {
        try {
            await notificationService.marcarComoLida(data.notificacaoId, userId);
        } catch (error) {
            console.error('❌ Erro ao marcar notificação como lida:', error);
            socket.emit('erro', { message: 'Erro ao marcar notificação como lida' });
        }
    });

    // Evento para marcar todas como lidas
    socket.on('marcar_todas_lidas', async () => {
        try {
            await notificationService.marcarTodasComoLidas(userId);
        } catch (error) {
            console.error('❌ Erro ao marcar todas as notificações como lidas:', error);
            socket.emit('erro', { message: 'Erro ao marcar notificações como lidas' });
        }
    });

    // Evento para buscar notificações
    socket.on('buscar_notificacoes', async (data = {}) => {
        try {
            const resultado = await notificationService.buscarNotificacoes(userId, data);
            socket.emit('notificacoes_carregadas', resultado);
        } catch (error) {
            console.error('❌ Erro ao buscar notificações:', error);
            socket.emit('erro', { message: 'Erro ao carregar notificações' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id} (Usuário: ${userId})`);
        notificationService.unregisterUser(userId);
    });
});

// Rota principal
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API do Sistema SMC funcionando!',
        status: 'online',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Rota de teste de banco
app.get('/test-db', async (req, res) => {
    try {
        const [result] = await query('SELECT 1 as test');
        res.json({
            success: true,
            message: 'Conexão com banco de dados funcionando!',
            test_result: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro na conexão com banco de dados',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Rota para verificar e criar usuário padrão
app.get('/setup-admin', async (req, res) => {
    try {
        // Verificar se já existe algum usuário
        const usuarios = await query('SELECT COUNT(*) as total FROM usuarios');
        const totalUsuarios = usuarios[0]?.total || 0;

        if (totalUsuarios > 0) {
            return res.json({
                success: true,
                message: `Sistema já tem ${totalUsuarios} usuário(s) cadastrado(s)`
            });
        }

        // Criar usuário padrão
        const bcrypt = require('bcryptjs');
        const senhaHash = await bcrypt.hash('admin123', 10);
        
        await query(`
            INSERT INTO usuarios (
                nome, username, email, senha, nivel_acesso, ativo, tenant_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            'Administrador',
            'admin',
            'admin@sistema.com',
            senhaHash,
            'admin_master',
            true,
            1
        ]);

        res.json({
            success: true,
            message: 'Usuário padrão criado com sucesso!',
            credentials: {
                username: 'admin',
                password: 'admin123'
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao criar usuário padrão',
            error: error.message
        });
    }
});

// Rota de teste simples para auth
app.post('/test-auth-simple', async (req, res) => {
    res.json({
        success: true,
        message: 'Rota de teste auth funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Rotas da API
console.log('🔄 Carregando rotas da API...');

console.log('📂 Verificando se arquivo auth.js existe...');
const fs = require('fs');
const authPath = path.join(__dirname, 'routes', 'auth.js');
console.log('📍 Caminho do arquivo:', authPath);
console.log('📁 Arquivo existe:', fs.existsSync(authPath));

try {
    console.log('🔄 Tentando importar ./routes/auth...');
    const authRouter = require('./routes/auth');
    console.log('✅ Importação bem-sucedida:', typeof authRouter);
    
    app.use('/api/auth', authRouter);
    console.log('✅ Rota /api/auth carregada');
} catch (error) {
    console.error('❌ Erro ao carregar rota /api/auth:', error);
    console.error('Stack trace:', error.stack);
}

try {
    app.use('/api/usuarios', require('./routes/usuarios'));
    console.log('✅ Rota /api/usuarios carregada');
} catch (error) {
    console.error('❌ Erro ao carregar rota /api/usuarios:', error);
}

app.use('/api/organizacoes', require('./routes/organizacoes'));
app.use('/api/setores', require('./routes/setores'));
app.use('/api/locais', require('./routes/locais'));
app.use('/api/equipamentos', require('./routes/equipamentos'));
app.use('/api/motores', require('./routes/motores'));
app.use('/api/relatorios', require('./routes/relatorios'));
app.use('/api/analisadores', require('./routes/analisadores'));
app.use('/api/gerador-inspecoes', require('./routes/gerador-inspecoes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/configuracoes', require('./routes/configuracoes'));
app.use('/api/notificacoes', require('./routes/notificacoes'));

console.log('✅ Todas as rotas carregadas');

// Rota para servir arquivos de upload
app.use('/api/uploads', express.static('uploads'));

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Middleware para tratar rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
    });
});

// Middleware global para tratamento de erros
app.use((error, req, res, next) => {
    console.error('❌ Erro interno:', error);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

// Função para inicializar o servidor
async function startServer() {
    try {
        console.log('🚀 Iniciando Sistema de Relatórios...');
        
        // Testar conexão com banco de dados
        console.log('✅ Conexão com MySQL estabelecida com sucesso!');
        await testConnection();
        
        // Inicializar estrutura do banco
        console.log('🔄 Verificando estrutura do banco de dados...');
        await initializeDatabase();
        console.log('✅ Estrutura do banco de dados verificada!');

        // Inicializar cache de permissões
        console.log('🔄 Carregando cache de permissões...');
        const cacheSuccess = await refreshPermissionsCache();
        if (cacheSuccess) {
            console.log('✅ Cache de permissões carregado com sucesso!');
        } else {
            console.log('⚠️ Falha ao carregar cache de permissões - continuando sem cache');
        }

        const PORT = process.env.PORT || 5000;
        
        server.listen(PORT, () => {
            console.log(`🌐 Servidor rodando na porta ${PORT}`);
            console.log(`🔗 API disponível em http://localhost:${PORT}/api`);
            console.log(`🔌 WebSocket disponível em ws://localhost:${PORT}`);
            console.log('📱 Sistema de notificações push ativo!');
            console.log('🔐 Sistema de permissões granulares ativo!');
            
            // Limpar notificações antigas a cada 24 horas
            setInterval(() => {
                notificationService.limparNotificacoesAntigas();
            }, 24 * 60 * 60 * 1000);
        });

    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Tratamento de sinais do sistema
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado com sucesso!');
        process.exit(0);
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Exceção não capturada:', error);
    process.exit(1);
});

// Iniciar servidor
startServer(); 