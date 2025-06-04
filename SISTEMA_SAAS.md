# 🏢 Sistema SaaS Multi-Tenant - Gestão de Equipamentos

## 🚀 Visão Geral

Sistema transformado em **SaaS (Software as a Service)** com arquitetura **multi-tenant** que permite múltiplas organizações utilizarem a mesma infraestrutura com **isolamento completo de dados**.

## 🏗️ Arquitetura Multi-Tenant

### **Abordagem Híbrida Escalonável**

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE DATABASE                          │
├─────────────────────────────────────────────────────────────┤
│  Tenant 1        │  Tenant 2        │  Tenant 3            │
│  (Empresa A)     │  (Empresa B)     │  (Empresa C)         │
│                  │                  │                      │
│  usuarios        │  usuarios        │  usuarios            │
│  tenant_id: 1    │  tenant_id: 2    │  tenant_id: 3        │
│                  │                  │                      │
│  relatorios      │  relatorios      │  relatorios          │
│  tenant_id: 1    │  tenant_id: 2    │  tenant_id: 3        │
│                  │                  │                      │
│  equipamentos    │  equipamentos    │  equipamentos        │
│  tenant_id: 1    │  tenant_id: 2    │  tenant_id: 3        │
└─────────────────────────────────────────────────────────────┘
```

### **Vantagens da Abordagem**

✅ **Shared Database, Shared Schema com tenant_id**
- ✅ Implementação simples e rápida
- ✅ Menor custo de infraestrutura
- ✅ Facilidade de manutenção
- ✅ Backup e restore simplificados
- ✅ Escalabilidade horizontal

✅ **Isolamento Garantido**
- 🔐 Middleware obrigatório em todas as rotas
- 🔐 Queries automáticas com tenant_id
- 🔐 Validação de organização ativa
- 🔐 Auditoria completa de ações

## 📊 Estrutura do Banco de Dados

### **Tabela Principal: `organizacoes`**

```sql
CREATE TABLE organizacoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    email_contato VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    endereco TEXT,
    
    -- Configurações do plano
    plano ENUM('basico', 'profissional', 'empresarial', 'enterprise') DEFAULT 'basico',
    max_usuarios INT DEFAULT 10,
    max_relatorios_mes INT DEFAULT 100,
    max_equipamentos INT DEFAULT 50,
    
    -- Recursos disponíveis
    recursos_habilitados JSON DEFAULT ('["relatorios", "equipamentos", "usuarios"]'),
    
    -- Status e controle
    ativo BOOLEAN DEFAULT TRUE,
    suspenso BOOLEAN DEFAULT FALSE,
    motivo_suspensao TEXT DEFAULT NULL,
    data_vencimento DATE DEFAULT NULL,
    
    -- Metadados
    configuracoes JSON DEFAULT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **tenant_id em Todas as Tabelas**

```sql
-- Exemplos de tabelas com tenant_id
ALTER TABLE usuarios ADD COLUMN tenant_id INT DEFAULT 1;
ALTER TABLE relatorios ADD COLUMN tenant_id INT DEFAULT 1;
ALTER TABLE equipamentos ADD COLUMN tenant_id INT DEFAULT 1;
ALTER TABLE locais ADD COLUMN tenant_id INT DEFAULT 1;
ALTER TABLE notificacoes ADD COLUMN tenant_id INT DEFAULT 1;
```

### **Tabelas de Suporte**

#### **Convites de Usuários**
```sql
CREATE TABLE usuario_convites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(100) UNIQUE NOT NULL,
    nivel_acesso ENUM('admin', 'usuario', 'visitante') DEFAULT 'usuario',
    convidado_por INT NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    data_expiracao TIMESTAMP NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Auditoria Completa**
```sql
CREATE TABLE auditoria_tenant (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    usuario_id INT DEFAULT NULL,
    acao VARCHAR(100) NOT NULL,
    entidade VARCHAR(50) NOT NULL,
    entidade_id INT DEFAULT NULL,
    dados_anteriores JSON DEFAULT NULL,
    dados_novos JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Planos e Limites

### **Planos Disponíveis**

| Plano | Usuários | Relatórios/Mês | Equipamentos | Preço Sugerido |
|-------|----------|-----------------|---------------|----------------|
| **Básico** | 5 | 50 | 25 | R$ 99/mês |
| **Profissional** | 15 | 200 | 100 | R$ 299/mês |
| **Empresarial** | 50 | 1.000 | 500 | R$ 999/mês |
| **Enterprise** | 999 | 9.999 | 999 | R$ 2.999/mês |

### **Recursos por Plano**

```json
{
    "basico": ["relatorios", "equipamentos", "usuarios"],
    "profissional": ["relatorios", "equipamentos", "usuarios", "notificacoes"],
    "empresarial": ["relatorios", "equipamentos", "usuarios", "notificacoes", "api"],
    "enterprise": ["relatorios", "equipamentos", "usuarios", "notificacoes", "api", "webhook", "auditoria"]
}
```

## 🛡️ Segurança e Isolamento

### **Middleware de Tenant**

```javascript
// Extração automática de tenant
const extractTenant = async (req, res, next) => {
    // 1. Do usuário autenticado
    if (req.user && req.user.tenant_id) {
        req.tenant_id = req.user.tenant_id;
    }
    // 2. Do header X-Tenant-ID
    else if (req.get('X-Tenant-ID')) {
        req.tenant_id = parseInt(req.get('X-Tenant-ID'));
    }
    // 3. Do subdomain
    else if (req.hostname !== 'localhost') {
        const subdomain = req.hostname.split('.')[0];
        const [org] = await query('SELECT id FROM organizacoes WHERE slug = ?', [subdomain]);
        if (org) req.tenant_id = org.id;
    }
    
    // Validar organização ativa
    // ...
};
```

### **Verificação de Limites**

```javascript
const checkPlanLimits = (resource) => {
    return async (req, res, next) => {
        const { max_usuarios, max_relatorios_mes, max_equipamentos } = req.organizacao;
        
        // Verificar limite baseado no recurso
        let currentCount = await getCurrentResourceCount(req.tenant_id, resource);
        let limit = getResourceLimit(req.organizacao.plano, resource);
        
        if (currentCount >= limit) {
            return res.status(403).json({
                success: false,
                message: `Limite do plano atingido para ${resource}`,
                data: { current: currentCount, limit: limit }
            });
        }
        
        next();
    };
};
```

### **Queries Automáticas com Tenant**

```javascript
// Função helper para adicionar tenant_id automaticamente
const tenantQuery = async (sql, params = [], tenantId) => {
    if (!sql.includes('tenant_id') && tenantId) {
        sql = addTenantToQuery(sql, tenantId);
    }
    return query(sql, params);
};

// Exemplo de uso
const relatorios = await tenantQuery(
    'SELECT * FROM relatorios WHERE status = ?',
    ['pendente'],
    req.tenant_id
);
// Resultado: SELECT * FROM relatorios WHERE status = ? AND tenant_id = 1
```

## 🔌 APIs SaaS

### **Organizações**

```bash
# Listar organizações (admin_master)
GET /api/organizacoes

# Criar organização (admin_master)
POST /api/organizacoes
{
    "nome": "Empresa ABC",
    "slug": "empresa-abc",
    "cnpj": "12.345.678/0001-90",
    "email_contato": "admin@empresa-abc.com",
    "plano": "profissional"
}

# Organização atual
GET /api/organizacoes/current

# Estatísticas da organização
GET /api/organizacoes/:id/stats

# Suspender organização (admin_master)
POST /api/organizacoes/:id/suspend
{
    "motivo": "Inadimplência"
}
```

### **Convites de Usuários**

```bash
# Convidar usuário
POST /api/organizacoes/invite-user
{
    "email": "usuario@empresa.com",
    "nivel_acesso": "usuario"
}

# Aceitar convite
POST /api/auth/accept-invite
{
    "token": "abc123...",
    "nome": "Nome do Usuário",
    "senha": "senha123"
}
```

## 🚀 Migração para SaaS

### **Script de Migração**

```bash
# Executar migração completa
node server/scripts/migrate-to-saas.js

# Ou apenas criar schema
node server/scripts/create-saas-schema.js
```

### **Passos da Migração**

1. ✅ **Backup do banco de dados**
2. ✅ **Criar tabela de organizações**
3. ✅ **Adicionar tenant_id em todas as tabelas**
4. ✅ **Criar organização padrão (ID: 1)**
5. ✅ **Migrar dados existentes para tenant_id = 1**
6. ✅ **Criar tabelas de suporte (convites, auditoria)**
7. ✅ **Criar views otimizadas**
8. ✅ **Implementar triggers de auditoria**

### **Compatibilidade com Sistema Existente**

✅ **Migração Zero-Downtime**
- Todos os dados existentes preservados
- Usuários continuam funcionando normalmente
- tenant_id padrão (1) para dados existentes
- Backward compatibility completa

## 🎯 Recursos Avançados

### **1. Subdomain Routing**

```bash
# Acesso por subdomain
https://empresa-abc.seudominio.com
https://empresa-xyz.seudominio.com

# DNS Wildcard necessário
*.seudominio.com -> seu_servidor_ip
```

### **2. API Keys por Organização**

```javascript
// Gerar API key única por organização
const apiKey = crypto.randomBytes(32).toString('hex');
await query('UPDATE organizacoes SET api_key = ? WHERE id = ?', [apiKey, tenantId]);
```

### **3. Webhooks Configuráveis**

```javascript
// Notificar via webhook quando relatório for criado
if (organizacao.webhook_url) {
    await fetch(organizacao.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            event: 'relatorio.criado',
            data: relatorio,
            tenant_id: req.tenant_id
        })
    });
}
```

### **4. Auditoria Completa**

```javascript
// Auditoria automática via middleware
app.use('/api/relatorios', auditAction('RELATORIO', 'relatorios'));

// Log de toda ação importante
{
    "tenant_id": 1,
    "usuario_id": 5,
    "acao": "CRIAR_RELATORIO",
    "entidade": "relatorios",
    "entidade_id": 123,
    "dados_novos": { "titulo": "Problema no motor X" },
    "ip_address": "192.168.1.100",
    "data_criacao": "2024-01-15T10:30:00Z"
}
```

## 📈 Escalabilidade e Performance

### **Índices Otimizados**

```sql
-- Índices para performance em consultas multi-tenant
CREATE INDEX idx_tenant_usuario ON usuarios(tenant_id, id);
CREATE INDEX idx_tenant_relatorio ON relatorios(tenant_id, data_criacao);
CREATE INDEX idx_tenant_equipamento ON equipamentos(tenant_id, ativo);
CREATE INDEX idx_auditoria_tenant_data ON auditoria_tenant(tenant_id, data_criacao);
```

### **Views para Consultas Complexas**

```sql
CREATE VIEW vw_relatorios_completos AS
SELECT 
    r.*,
    u.nome as usuario_nome,
    l.nome as local_nome,
    e.nome as equipamento_nome,
    o.nome as organizacao_nome,
    o.slug as organizacao_slug
FROM relatorios r
JOIN usuarios u ON r.usuario_id = u.id AND r.tenant_id = u.tenant_id
JOIN locais l ON r.local_id = l.id AND r.tenant_id = l.tenant_id
JOIN equipamentos e ON r.equipamento_id = e.id AND r.tenant_id = e.tenant_id
JOIN organizacoes o ON r.tenant_id = o.id
WHERE o.ativo = TRUE AND NOT o.suspenso;
```

### **Monitoramento e Métricas**

```javascript
// Métricas por organização
app.get('/api/admin/metrics', adminMaster, async (req, res) => {
    const metrics = await query(`
        SELECT 
            o.nome,
            o.plano,
            COUNT(DISTINCT u.id) as usuarios_ativos,
            COUNT(DISTINCT r.id) as total_relatorios,
            COUNT(DISTINCT e.id) as total_equipamentos
        FROM organizacoes o
        LEFT JOIN usuarios u ON o.id = u.tenant_id AND u.ativo = true
        LEFT JOIN relatorios r ON o.id = r.tenant_id
        LEFT JOIN equipamentos e ON o.id = e.tenant_id AND e.ativo = true
        WHERE o.ativo = true
        GROUP BY o.id
        ORDER BY usuarios_ativos DESC
    `);
    
    res.json({ success: true, data: metrics });
});
```

## 🔄 Evolução Futura

### **Fase 2: Database per Tenant (Grandes Clientes)**

Para clientes enterprise com grandes volumes:

```javascript
// Configuração dinâmica de conexão por tenant
const getDatabaseConfig = (tenantId) => {
    if (tenantId === 999) { // Cliente enterprise
        return {
            host: 'enterprise-db.com',
            database: `tenant_${tenantId}`,
            user: 'dedicated_user'
        };
    }
    return defaultConfig; // Shared database
};
```

### **Fase 3: Microserviços**

- Separar por domínios (usuarios, relatorios, equipamentos)
- API Gateway com tenant routing
- Event-driven architecture

## 🎉 Benefícios do SaaS

### **Para o Provedor**

✅ **Receita Recorrente**: Modelo de assinatura mensal
✅ **Escalabilidade**: Uma infraestrutura para N clientes  
✅ **Manutenção Centralizada**: Deploy único para todos
✅ **Recursos Otimizados**: Sharing de infraestrutura
✅ **Analytics Centralizados**: Dados de todos os clientes

### **Para os Clientes**

✅ **Menor Custo**: Sem infraestrutura própria
✅ **Atualizações Automáticas**: Sempre na versão mais recente
✅ **Escalabilidade Elástica**: Crescer conforme necessário
✅ **Suporte Especializado**: Equipe dedicada
✅ **Segurança Empresarial**: Backups, monitoramento, etc.

---

## ✅ Status: **SISTEMA SAAS PRONTO PARA PRODUÇÃO** 🚀

**Implementação Completa:**
- 🏢 Multi-tenancy com isolamento total
- 🔐 Segurança robusta por organização  
- 📊 Planos e limites configuráveis
- 👥 Sistema de convites de usuários
- 📈 Auditoria completa de ações
- 🔧 APIs para gerenciamento SaaS
- 📱 Notificações push por tenant
- 🚀 Migração zero-downtime implementada 