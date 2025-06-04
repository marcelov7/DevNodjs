# 🚀 Deploy do Backend - Render

## Variáveis de Ambiente Necessárias

Configure estas variáveis no painel do Render:

```env
# Configuração do Banco de Dados MySQL (Hostinger)
DB_HOST=srv1196.hstgr.io
DB_USER=u845362736_sistemasmc
DB_PASSWORD=^rt2T;88K
DB_DATABASE=u845362736_sistemasmc
DB_PORT=3306

# Configuração da API
NODE_ENV=production
PORT=10000

# JWT Secret (ALTERE ESTE VALOR!)
JWT_SECRET=seu_jwt_secret_super_seguro_aqui_change_this

# CORS Origin (URL do frontend)
CORS_ORIGIN=https://seu-frontend.vercel.app
```

## Passos para Deploy no Render

1. **Criar conta no Render**: https://render.com
2. **Conectar repositório**: Conecte seu repo GitHub
3. **Configurar serviço**:
   - Service Type: Web Service
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
4. **Definir variáveis de ambiente** (usar as variáveis acima)
5. **Deploy automático** será executado

## URLs importantes após deploy:
- API: `https://seu-app.onrender.com/api`
- Health Check: `https://seu-app.onrender.com/api/health`

## Teste de funcionamento:
```bash
curl https://seu-app.onrender.com/api/health
``` 