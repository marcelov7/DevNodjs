# Deploy no Render - Sistema SMC API

## Configuração Passo a Passo

### 1. Preparação dos Arquivos

Certifique-se de que todos os arquivos estão no lugar correto:

```
server/
├── config/
│   └── database.js          ✅ Configuração do banco
├── middleware/
│   ├── auth.js             ✅ Autenticação
│   ├── permissions.js      ✅ Permissões
│   └── tenant.js           ✅ Multi-tenant
├── routes/                 ✅ Todas as rotas
├── services/               ✅ Serviços
├── utils/                  ✅ Utilitários
├── uploads/                ✅ Diretório de uploads
├── package.json            ✅ Dependências
├── index.js                ✅ Servidor principal
├── render.yaml             ✅ Configuração do Render
└── .nvmrc                  ✅ Versão do Node.js
```

### 2. Variáveis de Ambiente Necessárias

Configure as seguintes variáveis no Render:

```
NODE_ENV=production
PORT=10000
DB_HOST=srv1196.hstgr.io
DB_PORT=3306
DB_USER=u845362736_sistemasmc
DB_PASSWORD=^rt2T;88K
DB_DATABASE=u845362736_sistemasmc
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_change_this
CORS_ORIGIN=https://seu-frontend.vercel.app
```

### 3. Comandos de Deploy

O Render executará automaticamente:

```bash
# Build
npm install

# Start
npm start
```

### 4. Troubleshooting

#### Erro: "Cannot find module './config/database'"

**Possíveis causas:**
1. Estrutura de arquivos incorreta
2. Case-sensitivity em sistemas Linux
3. Permissões de arquivo

**Soluções:**
1. Executar verificação: `npm run verify`
2. Executar teste simples: `npm run simple-test`
3. Verificar logs completos no Render

#### Erro de Conexão com MySQL

**Verificar:**
1. Credenciais do banco corretas
2. Servidor MySQL acessível externamente
3. Firewall liberado para conexões externas

#### Timeout de Deploy

**Soluções:**
1. Aumentar timeout no render.yaml
2. Verificar se todas as dependências são necessárias
3. Otimizar processo de inicialização

### 5. Scripts de Diagnóstico

Execute localmente para testar:

```bash
# Verificar estrutura de arquivos
npm run verify

# Teste simples de inicialização
npm run simple-test

# Verificar conectividade de rede
npm run check-network
```

### 6. Logs Importantes

Monitore os logs do Render para:

- ✅ Conexão com MySQL estabelecida
- ✅ Estrutura do banco verificada
- ✅ Cache de permissões carregado
- 🌐 Servidor rodando na porta X

### 7. Após o Deploy

1. Testar rota de health: `https://seu-app.onrender.com/api/health`
2. Verificar CORS para o frontend
3. Testar autenticação básica
4. Verificar logs de erro

### 8. URLs de Referência

- **API Health:** `https://seu-app.onrender.com/api/health`
- **Documentação Render:** https://render.com/docs
- **MySQL Hostinger:** Painel de controle do Hostinger 