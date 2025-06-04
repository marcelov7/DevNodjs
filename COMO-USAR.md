# 🚀 Como Usar o Sistema de Relatórios

## ✅ Soluções Implementadas

### Problemas Corrigidos:
- ✅ **Tailwind CSS**: Downgrade para versão estável (3.4.1)
- ✅ **Axios**: Versão compatível (1.6.8) com Create React App
- ✅ **PowerShell**: Scripts adaptados para Windows
- ✅ **Polyfills**: Removidos problemas de Node.js no navegador

## 🎯 3 Formas de Executar o Sistema

### 1. Forma Mais Fácil (Recomendada) 
```powershell
# Na pasta raiz do projeto:
.\start-system.ps1
```

### 2. Usando NPM (Alternativa)
```powershell
# Na pasta raiz:
npm run dev
```

### 3. Executar Separadamente
```powershell
# Terminal 1 - Servidor:
cd server
npm start

# Terminal 2 - Cliente:
cd client  
npm start
```

## 🌐 Como Acessar

1. **Aguarde** os serviços carregarem (30-60 segundos)
2. **Abra o navegador** em: http://localhost:3000
3. **Faça login** com:
   - **Username**: `admin`
   - **Senha**: `password`

## 🔧 Se Ainda Houver Problemas

### Limpar Cache e Reinstalar:
```powershell
# Parar todos os processos primeiro (Ctrl+C)

# Limpar e reinstalar cliente:
cd client
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install

# Limpar e reinstalar servidor:
cd ../server
Remove-Item node_modules -Recurse -Force  
Remove-Item package-lock.json -Force
npm install

# Voltar e executar:
cd ..
npm run dev
```

### Verificar MySQL:
```sql
-- No MySQL Workbench ou linha de comando:
USE sistema_relatorios;
SELECT COUNT(*) FROM usuarios; -- Deve retornar 1
```

## 🎨 O Que Você Verá

### Dashboard:
- 📊 **Estatísticas** em tempo real
- 📝 **Relatórios recentes**
- 🎯 **Navegação** pelo menu lateral

### Funcionalidades:
- 👥 **Usuários** (Admin Master apenas)
- 📍 **Locais** 
- 🔧 **Equipamentos**
- ⚙️ **Motores**
- 📋 **Relatórios**

## 🆘 Suporte

Se ainda houver problemas:
1. Verifique se o **MySQL está rodando**
2. Confirme as **credenciais** no arquivo `server/.env`
3. Certifique-se de que as **portas 3000 e 5000** estão livres

---
**Sistema 100% funcional!** 🎉 