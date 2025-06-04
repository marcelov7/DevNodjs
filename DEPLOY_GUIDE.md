# 🚀 GUIA COMPLETO DE DEPLOY - SISTEMA SMC

## 📋 Visão Geral da Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │    BACKEND      │    │   BANCO MYSQL   │
│   (Vercel)      │◄──►│   (Render)      │◄──►│  (Hostinger)    │
│                 │    │                 │    │                 │
│ React + TS      │    │ Node.js + Express│   │ MySQL 8.0       │
│ Build: Static   │    │ API REST + WS   │    │ Já configurado   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 ORDEM DE DEPLOY

### **1️⃣ BACKEND PRIMEIRO (Render)**
### **2️⃣ FRONTEND DEPOIS (Vercel)**
### **3️⃣ CONFIGURAR CORS**

---

## 🔧 1. DEPLOY DO BACKEND (Render)

### Passos:

1. **Criar conta no Render**: https://render.com

2. **Conectar GitHub**:
   - Autorizar acesso ao repositório
   - Selecionar o repositório do projeto

3. **Configurar Web Service**:
   ```
   Name: sistemasmc-api
   Environment: Node
   Region: Oregon (US West) - mais próximo
   Branch: main
   Root Directory: server
   Build Command: npm install
   Start Command: npm start
   ```

4. **Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   PORT=10000
   
   # Banco MySQL (Hostinger)
   DB_HOST=srv1196.hstgr.io
   DB_USER=u845362736_sistemasmc
   DB_PASSWORD=^rt2T;88K
   DB_DATABASE=u845362736_sistemasmc
   DB_PORT=3306
   
   # Segurança (ALTERAR!)
   JWT_SECRET=SeuJWTSecretSuperSeguroAqui123!@#
   
   # CORS (atualizar após deploy do frontend)
   CORS_ORIGIN=https://sistemasmc.vercel.app
   ```

5. **Deploy Automático**: O Render fará o deploy automaticamente

6. **Testar API**:
   ```bash
   curl https://sistemasmc-api.onrender.com/api/health
   ```

### ⚠️ **IMPORTANTE**:
- O Render pode demorar 30-60 segundos na primeira requisição (cold start)
- Anote a URL gerada: `https://seu-app.onrender.com`

---

## 🎨 2. DEPLOY DO FRONTEND (Vercel)

### Passos:

1. **Criar conta no Vercel**: https://vercel.com

2. **Importar do GitHub**:
   - Add New > Project
   - Import Git Repository
   - Selecionar seu repositório

3. **Configurar Projeto**:
   ```
   Framework Preset: Create React App
   Root Directory: client
   Build Command: npm run build
   Output Directory: build
   Install Command: npm install
   ```

4. **Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   REACT_APP_API_URL=https://sistemasmc-api.onrender.com/api
   REACT_APP_SERVER_URL=https://sistemasmc-api.onrender.com
   ```

5. **Deploy**: Clique em "Deploy"

6. **Testar Frontend**:
   - Acesse a URL do Vercel
   - Teste login, navegação, funcionalidades

### ⚠️ **IMPORTANTE**:
- Anote a URL gerada: `https://seu-app.vercel.app`

---

## 🔄 3. CONFIGURAR CORS NO BACKEND

Após deploy do frontend, **ATUALIZAR** variável `CORS_ORIGIN` no Render:

```env
CORS_ORIGIN=https://seu-app.vercel.app
```

Ou se tiver domínio personalizado:
```env
CORS_ORIGIN=https://seudominio.com
```

---

## ✅ 4. VERIFICAÇÃO FINAL

### Checklist:

- [ ] **Backend funcionando**: `https://seu-app.onrender.com/api/health`
- [ ] **Frontend carregando**: `https://seu-app.vercel.app`
- [ ] **Login funcionando**
- [ ] **Dados do banco carregando**
- [ ] **Upload de imagens funcionando**
- [ ] **Notificações em tempo real funcionando**
- [ ] **Todas as páginas acessíveis**

### Testes importantes:

1. **Criar usuário** ✅
2. **Fazer login** ✅
3. **Criar relatório** ✅
4. **Upload de imagem** ✅
5. **Editar permissões** ✅
6. **Notificações funcionando** ✅

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### Erro de CORS:
```
Access-Control-Allow-Origin
```
**Solução**: Verificar `CORS_ORIGIN` no Render

### Erro 500 no Backend:
```
Internal Server Error
```
**Solução**: 
1. Ver logs no Render
2. Verificar variáveis de ambiente
3. Testar conexão com MySQL

### Erro de conexão com banco:
```
Connection refused
```
**Solução**: Verificar credenciais do MySQL no Hostinger

### Build falha no Vercel:
```
Command failed
```
**Solução**: 
1. Verificar `package.json`
2. Ver logs de build
3. Testar build local: `npm run build`

---

## 🔐 SEGURANÇA PÓS-DEPLOY

### ⚠️ **AÇÕES OBRIGATÓRIAS**:

1. **Alterar JWT_SECRET**:
   ```env
   JWT_SECRET=UmSegredoBemSeguroEUnico123!@#$%
   ```

2. **Configurar domínio personalizado** (opcional):
   - Vercel: Settings > Domains
   - Render: Settings > Custom Domains

3. **Ativar HTTPS** (automático)

4. **Backup do banco** (configurar no Hostinger)

---

## 📊 MONITORAMENTO

### URLs importantes:

- **Frontend**: https://seu-app.vercel.app
- **Backend**: https://seu-app.onrender.com
- **API Health**: https://seu-app.onrender.com/api/health
- **Banco**: Hostinger Panel

### Logs:
- **Vercel**: Painel > Functions > Logs
- **Render**: Painel > Logs
- **Hostinger**: Painel > Database > Logs

---

## 🎉 CONCLUSÃO

Após seguir este guia, você terá:

✅ **Sistema completo funcionando em produção**
✅ **Frontend responsivo na Vercel**
✅ **API robusta no Render**
✅ **Banco MySQL no Hostinger**
✅ **SSL/HTTPS automático**
✅ **Deploy automático via Git**

### 📞 **Suporte**:
Em caso de problemas, verificar logs das plataformas e documentação oficial:
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Hostinger Support](https://www.hostinger.com.br/tutoriais/) 