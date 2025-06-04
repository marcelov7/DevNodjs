# 📱 Sistema de Notificações Push em Tempo Real

## 🚀 Visão Geral

Sistema completo de notificações push implementado com **WebSockets (Socket.io)** que fornece notificações instantâneas para usuários sobre atualizações nos relatórios de ocorrências.

## 🏗️ Arquitetura

### Backend
- **Socket.io Server**: Gerencia conexões WebSocket
- **Serviço de Notificações**: Classe centralizada para gerenciar todas as notificações
- **Sistema de Preferências**: Usuários podem configurar tipos de notificações desejadas
- **Banco de Dados**: Armazenamento persistente de notificações

### Frontend
- **Context API**: Gerenciamento global do estado de notificações
- **Socket.io Client**: Comunicação em tempo real com o servidor
- **Componente NotificationPanel**: Interface de usuário para visualizar notificações
- **Notificações do Navegador**: Integração com API de notificações do browser

## 📊 Estrutura do Banco de Dados

### Tabela `notificacoes`
```sql
CREATE TABLE notificacoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    relatorio_id INT DEFAULT NULL,
    tipo ENUM('nova_atribuicao', 'atualizacao_historico', 'status_alterado', 'comentario', 'vencimento'),
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    dados_extras JSON DEFAULT NULL,
    lida BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_leitura TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (relatorio_id) REFERENCES relatorios(id)
);
```

### Tabela `notificacao_preferencias`
```sql
CREATE TABLE notificacao_preferencias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    tipo_notificacao ENUM('nova_atribuicao', 'atualizacao_historico', 'status_alterado', 'comentario', 'vencimento'),
    ativo BOOLEAN DEFAULT TRUE,
    notificar_email BOOLEAN DEFAULT TRUE,
    notificar_push BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    UNIQUE KEY unique_user_tipo (usuario_id, tipo_notificacao)
);
```

## 🔔 Tipos de Notificações

### 1. **Nova Atribuição** (`nova_atribuicao`)
- **Quando**: Usuário é atribuído a um relatório
- **Dados extras**: Nome do responsável pela atribuição, total de usuários atribuídos
- **Cor**: Azul

### 2. **Atualização no Histórico** (`atualizacao_historico`)
- **Quando**: Progresso do relatório é atualizado
- **Dados extras**: Progresso anterior/novo, anexos inclusos
- **Cor**: Laranja

### 3. **Status Alterado** (`status_alterado`)
- **Quando**: Status do relatório muda (pendente → em_andamento → resolvido)
- **Dados extras**: Status anterior/novo
- **Cor**: Verde

### 4. **Comentário** (`comentario`)
- **Quando**: Novo comentário é adicionado ao relatório
- **Dados extras**: Autor do comentário
- **Cor**: Roxo

### 5. **Vencimento** (`vencimento`)
- **Quando**: Relatório próximo do vencimento ou vencido
- **Dados extras**: Data de vencimento, dias em atraso
- **Cor**: Vermelho

## 🔧 Implementação Técnica

### Backend - Serviço de Notificações

```javascript
class NotificationService {
    constructor(io) {
        this.io = io;
        this.userSockets = new Map(); // Rastrear conexões
    }

    // Criar e enviar notificação
    async criarNotificacao({ usuarioId, relatorioId, tipo, titulo, mensagem, dadosExtras })

    // Notificar múltiplos usuários
    async notificarUsuarios(usuarioIds, notificacaoData)

    // Notificar usuários atribuídos a um relatório
    async notificarAtribuidos(relatorioId, notificacaoData)

    // Marcar como lida
    async marcarComoLida(notificacaoId, usuarioId)

    // Buscar notificações
    async buscarNotificacoes(usuarioId, opcoes)
}
```

### Frontend - Context de Notificações

```typescript
interface NotificationContextType {
    socket: Socket | null;
    notificacoes: Notificacao[];
    totalNaoLidas: number;
    isConnected: boolean;
    marcarComoLida: (notificacaoId: number) => void;
    marcarTodasComoLidas: () => void;
    buscarNotificacoes: (opcoes?) => void;
    limparNotificacoes: () => void;
}
```

## 🎨 Interface do Usuário

### Painel de Notificações
- **Badge Vermelho**: Contador de notificações não lidas
- **Filtros**: "Todas" / "Não lidas"
- **Cores por Tipo**: Cada tipo tem cor específica na borda
- **Tempo Relativo**: "Agora", "5m", "2h", "3d"
- **Status Visual**: Dot azul para não lidas

### Indicadores Visuais
- **Badge Pulsante**: Vermelho para notificações não lidas
- **Ícone de Status**: BellOff quando desconectado
- **Cores de Fundo**: Diferentes para cada tipo de notificação
- **Linha Destacada**: Borda colorida para notificações novas

## 🔌 Eventos WebSocket

### Servidor → Cliente
- `nova_notificacao`: Nova notificação recebida
- `contagem_nao_lidas`: Total de notificações não lidas
- `notificacao_lida`: Notificação marcada como lida
- `todas_notificacoes_lidas`: Todas marcadas como lidas
- `notificacoes_carregadas`: Lista de notificações carregada

### Cliente → Servidor
- `marcar_lida`: Marcar notificação específica como lida
- `marcar_todas_lidas`: Marcar todas como lidas
- `buscar_notificacoes`: Solicitar lista de notificações

## 🔐 Autenticação e Segurança

### Autenticação WebSocket
```javascript
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
});
```

### Validações
- Token JWT obrigatório para conexão WebSocket
- Usuário só pode ver suas próprias notificações
- Preferências respeitadas antes de enviar notificações

## 📱 Notificações do Navegador

### Permissão Automática
```javascript
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
```

### Notificação Rica
```javascript
new Notification(titulo, {
    body: mensagem,
    icon: '/favicon.ico',
    tag: `notificacao-${id}`
});
```

## 🚀 Integração com Relatórios

### Eventos que Disparam Notificações

1. **Adição de Histórico**
   ```javascript
   // Em routes/relatorios.js
   await req.notificationService.notificarAtribuidos(relatorio_id, {
       tipo: 'atualizacao_historico',
       titulo: `Atualização no relatório: ${tituloRelatorio}`,
       mensagem: `${req.user.nome} atualizou o progresso para ${progresso}%`
   });
   ```

2. **Nova Atribuição**
   ```javascript
   await req.notificationService.notificarUsuarios(novosUsuarios, {
       tipo: 'nova_atribuicao',
       titulo: `Você foi atribuído ao relatório: ${tituloRelatorio}`,
       mensagem: `${req.user.nome} atribuiu você para trabalhar neste relatório`
   });
   ```

## 🔄 Limpeza Automática

### Notificações Antigas
- **Executado**: A cada 24 horas
- **Remove**: Notificações com mais de 30 dias
- **Método**: `limparNotificacoesAntigas()`

## 🎯 Funcionalidades Avançadas

### 1. **Contadores em Tempo Real**
- Badge atualizado instantaneamente
- Sincronização automática entre abas

### 2. **Estado Offline/Online**
- Reconexão automática
- Notificações salvas quando offline
- Indicador visual de conexão

### 3. **Performance**
- Paginação de notificações
- Índices otimizados no banco
- Cleanup automático

### 4. **Experiência do Usuário**
- Click para navegar ao relatório
- Marcar como lida automaticamente
- Filtros intuitivos

## 🧪 Testes

### Dados de Teste
```bash
node scripts/test-notifications.js
```

### Verificação de Funcionamento
1. Login no sistema
2. Verificar ícone de notificações no header
3. Badge deve mostrar notificações não lidas
4. Click no ícone abre painel
5. Notificações aparecem com cores e ícones apropriados

## 📈 Métricas e Monitoramento

### Logs Automáticos
- Conexões/desconexões de usuários
- Notificações enviadas/falhadas
- Limpeza de dados antigos

### Console Messages
```
🔌 Usuário 1 conectado via socket abc123
🔔 Notificação enviada para usuário 1: Você foi atribuído...
💤 Usuário 2 offline, notificação salva para visualização posterior
```

## 🎨 Customização Visual

### Cores por Tipo
- **Nova Atribuição**: `bg-blue-50 border-blue-400`
- **Atualização**: `bg-orange-50 border-orange-400`
- **Status**: `bg-green-50 border-green-400`
- **Comentário**: `bg-purple-50 border-purple-400`
- **Vencimento**: `bg-red-50 border-red-400`

### Ícones
- **Nova Atribuição**: `AlertTriangle` (azul)
- **Atualização**: `Clock` (laranja)
- **Status**: `CheckCircle` (verde)
- **Comentário**: `Info` (roxo)
- **Vencimento**: `AlertTriangle` (vermelho)

---

## ✅ Sistema Completamente Funcional

O sistema de notificações push está **100% operacional** com:

🔔 **Notificações em tempo real via WebSocket**
📱 **Interface rica e intuitiva**
🔐 **Autenticação segura**
🎨 **Design responsivo e acessível**
📊 **Dados persistentes**
⚡ **Performance otimizada**
🧹 **Limpeza automática**
🔄 **Reconexão automática**

**Pronto para uso em produção!** 🚀 