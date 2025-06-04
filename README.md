# Sistema de Relatórios

Sistema completo para gestão de relatórios de ocorrências com funcionalidades de autenticação, gestão de usuários, locais, equipamentos e motores.

## 🚀 Tecnologias

### Backend
- **Node.js** com Express
- **MySQL** como banco de dados
- **JWT** para autenticação
- **Bcrypt** para criptografia de senhas
- **Multer** para upload de arquivos
- **Helmet** para segurança

### Frontend
- **React.js** com TypeScript
- **Tailwind CSS** para estilização
- **Axios** para requisições HTTP
- **React Router** para roteamento
- **Lucide React** para ícones

## 📦 Instalação

### Pré-requisitos
- Node.js 16+ 
- MySQL 8.0+
- npm ou yarn

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd sistema-relatorios
```

### 2. Instale as dependências
```bash
# Instalar dependências do projeto raiz
npm install

# Instalar dependências do servidor e cliente
npm run install-all
```

### 3. Configure o banco de dados

#### No MySQL, execute o arquivo SQL:
```bash
# Opção 1: Via linha de comando do MySQL
mysql -u root -p < server/config/database.sql

# Opção 2: No MySQL Workbench ou phpMyAdmin
# Abra e execute o arquivo server/config/database.sql
```

**Importante:** O script pode ser executado múltiplas vezes sem erro. Ele recria todo o banco com dados de exemplo.

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na pasta `server/` com o seguinte conteúdo:

```env
# Configurações do Servidor
PORT=5000
NODE_ENV=development

# Configurações do Banco de Dados - AJUSTE CONFORME SEU MYSQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=SUA_SENHA_AQUI
DB_NAME=sistema_relatorios

# JWT Secret - ALTERE PARA UMA CHAVE SEGURA EM PRODUÇÃO
JWT_SECRET=sua_chave_secreta_muito_segura_aqui_123456789
JWT_EXPIRES_IN=24h

# Upload de Arquivos
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=5242880

# CORS
CORS_ORIGIN=http://localhost:3000
```

**⚠️ Importante:** Substitua `SUA_SENHA_AQUI` pela senha do seu MySQL.

### 5. Execute o projeto

```bash
# Executar servidor e cliente simultaneamente
npm run dev

# OU executar separadamente:

# Terminal 1 - Servidor (backend)
npm run server

# Terminal 2 - Cliente (frontend)
npm run client
```

## 🔐 Credenciais Padrão

- **Username:** `admin`
- **Senha:** `password`

## 📊 Dados de Exemplo Incluídos

O banco é criado automaticamente com:
- ✅ **1 Usuário Admin Master**: admin/password
- ✅ **3 Locais**: Fábrica Principal, Oficina, Depósito
- ✅ **3 Equipamentos**: Compressor, Esteira, Torno CNC
- ✅ **2 Motores**: Motor 10CV e 2CV com specs técnicas
- ✅ **3 Relatórios de exemplo** com diferentes status

## 📊 Funcionalidades

### Níveis de Acesso
- **Admin Master**: Acesso total ao sistema
- **Admin**: Gestão de locais, equipamentos, motores e relatórios
- **Usuário**: Criação e gestão dos próprios relatórios
- **Visitante**: Apenas visualização

### Funcionalidades Principais

#### 🏠 Dashboard
- Resumo estatístico do sistema em tempo real
- Cartões com totais de relatórios, usuários, equipamentos, locais e motores
- Lista de relatórios recentes com status e prioridade
- Interface responsiva e moderna

#### 👥 Gestão de Usuários (Admin Master)
- Criar, editar e desativar usuários
- Definir níveis de acesso
- Alterar senhas
- Busca e paginação

#### 📍 Gestão de Locais (Admin Master/Admin)
- Cadastro de locais onde estão os equipamentos
- Vinculação com equipamentos
- Controle de status ativo/inativo

#### 🔧 Gestão de Equipamentos (Admin Master/Admin)
- Cadastro completo de equipamentos
- Vinculação obrigatória com locais
- Controle de status operacional
- Histórico de relatórios por equipamento

#### ⚙️ Gestão de Motores (Admin Master/Admin)
- Cadastro de motores independentes
- Informações técnicas (potência, voltagem, RPM, etc.)
- Controle de status operacional

#### 📝 Sistema de Relatórios
- **Criação de Relatórios:**
  - Data automática (editável)
  - Usuário e setor automáticos
  - Seleção de local → equipamento (cascata)
  - Status: Pendente, Em andamento, Resolvido
  - Upload de imagens

- **Gestão de Status:**
  - Apenas criador e usuários atribuídos podem editar
  - Histórico completo de atualizações
  - Upload de fotos nas atualizações
  - Admin Master pode reabrir relatórios resolvidos

- **Sistema de Atribuições:**
  - Criador pode atribuir relatórios a outros usuários
  - Usuários atribuídos podem atualizar status
  - Notificações de atribuições

## 🗂️ Estrutura do Projeto

```
sistema-relatorios/
├── server/                 # Backend Node.js
│   ├── config/            # Configurações (database.js, database.sql)
│   ├── middleware/        # Middlewares (auth.js)
│   ├── routes/           # Rotas da API
│   ├── uploads/          # Arquivos uploadados
│   ├── .env              # Variáveis de ambiente (criar manualmente)
│   └── index.js          # Servidor principal
├── client/               # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── contexts/     # Contextos (AuthContext)
│   │   ├── pages/        # Páginas da aplicação
│   │   └── App.tsx       # Componente principal
└── package.json          # Scripts principais
```

## 🔄 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Executar servidor + cliente
npm run server          # Apenas servidor (backend)
npm run client          # Apenas cliente (frontend)

# Instalação
npm run install-all     # Instalar todas as dependências

# Produção
npm run build           # Build do cliente para produção
```

## 🔒 Segurança

- Autenticação JWT com expiração configurável
- Middlewares de validação em todas as rotas
- Criptografia bcrypt para senhas
- Sanitização de inputs
- Helmet.js para headers de segurança
- CORS configurado

## 📋 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/verify` - Verificar token
- `GET /api/auth/me` - Dados do usuário logado

### Usuários (Admin Master)
- `GET /api/usuarios` - Listar usuários
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Desativar usuário

### Locais
- `GET /api/locais` - Listar locais
- `GET /api/locais/simples` - Locais para select
- `POST /api/locais` - Criar local
- `PUT /api/locais/:id` - Atualizar local

### Equipamentos
- `GET /api/equipamentos` - Listar equipamentos
- `GET /api/equipamentos/por-local/:localId` - Por local
- `POST /api/equipamentos` - Criar equipamento
- `PUT /api/equipamentos/:id` - Atualizar equipamento

### Dashboard
- `GET /api/dashboard/estatisticas` - Estatísticas gerais
- `GET /api/dashboard/relatorios-recentes` - Relatórios recentes

## 🚨 Solução de Problemas

### Erro de conexão com o banco
1. Verifique se o MySQL está rodando
2. Confirme as credenciais no arquivo `.env`
3. Execute o arquivo `database.sql` novamente

### Erro de dependências
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
cd server && rm -rf node_modules package-lock.json && npm install
cd ../client && rm -rf node_modules package-lock.json && npm install
```

### Porta já em uso
- Altere a `PORT` no arquivo `.env` do servidor
- Ou mate o processo que está usando a porta 5000

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo `LICENSE` para mais detalhes.

## ✨ Próximas Funcionalidades

- [ ] Sistema completo de relatórios com modal
- [ ] Exportação PDF dos relatórios
- [ ] Sistema de notificações em tempo real
- [ ] Dashboard com gráficos estatísticos
- [ ] Sistema de comentários nos relatórios
- [ ] Histórico completo de alterações
- [ ] Backup automático do banco de dados
- [ ] API para integração com outros sistemas

---

**Desenvolvido com ❤️ para gestão eficiente de relatórios de ocorrências** 