# 🚀 Deploy do Frontend - Vercel

## Variáveis de Ambiente Necessárias

Configure estas variáveis no painel do Vercel:

```env
# URL da API (Backend no Render)
REACT_APP_API_URL=https://seu-backend.onrender.com/api

# Ambiente
NODE_ENV=production
```

## Passos para Deploy no Vercel

1. **Instalar Vercel CLI** (opcional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via GitHub** (recomendado):
   - Criar conta no Vercel: https://vercel.com
   - Conectar repositório GitHub
   - Importar projeto
   - Configurar variáveis de ambiente
   - Deploy automático

3. **Deploy via CLI** (alternativo):
   ```bash
   cd client
   vercel --prod
   ```

## Configuração no Vercel

### Build Settings:
- **Framework Preset**: Create React App
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

### Environment Variables:
```
REACT_APP_API_URL = https://seu-backend.onrender.com/api
NODE_ENV = production
```

## Após o Deploy

1. **Atualizar CORS no Backend**: 
   - Adicionar URL do Vercel nas origens permitidas
   - Exemplo: `https://seu-app.vercel.app`

2. **Testar funcionalidades**:
   - Login/logout
   - Criação de relatórios
   - Upload de imagens
   - Notificações em tempo real

## URLs importantes:
- App: `https://seu-app.vercel.app`
- Preview: URLs de preview para cada commit

## Comandos úteis:
```bash
# Build local para testar
npm run build

# Servir build localmente
npx serve -s build
``` 