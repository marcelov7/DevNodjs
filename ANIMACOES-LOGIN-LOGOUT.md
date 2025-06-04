# Animações de Login e Logout

## Funcionalidades Implementadas

### 1. Animação de Carregamento Após Login (3 segundos)
- **Localização**: `client/src/pages/Login.tsx` e `client/src/contexts/AuthContext.tsx`
- **Comportamento**: Após credenciais válidas, exibe loading em tela cheia por 3 segundos antes de redirecionar
- **Texto**: "Carregando sistema..."
- **UX**: Simula carregamento de dados do usuário e inicialização do sistema

### 2. Confirmação de Logout com Animação
- **Localização**: `client/src/components/LogoutConfirmation.tsx` e `client/src/components/Layout.tsx`
- **Comportamento**: Modal de confirmação seguido de animação de 2 segundos para logout
- **Texto**: "Encerrando sessão..."
- **UX**: Previne logouts acidentais e fornece feedback visual

## Componentes Criados

### LoadingSpinner (`client/src/components/LoadingSpinner.tsx`)
Componente reutilizável para animações de carregamento:
```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}
```

**Características:**
- Suporte a diferentes tamanhos
- Modo tela cheia para login
- Texto personalizável
- Baseado em Lucide React (Loader2)

### LogoutConfirmation (`client/src/components/LogoutConfirmation.tsx`)
Modal de confirmação para logout:
```typescript
interface LogoutConfirmationProps {
  isOpen: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  userName?: string;
}
```

**Características:**
- Modal responsivo com backdrop
- Estados: confirmação e loading
- Personalização com nome do usuário
- Botões de ação (Confirmar/Cancelar)
- Animação de transição

## Atualizações no AuthContext

### Novos Estados
```typescript
const [loginLoading, setLoginLoading] = useState(false);
const [logoutLoading, setLogoutLoading] = useState(false);
```

### Função Login Atualizada
```typescript
const login = async (identifier: string, senha: string): Promise<boolean> => {
  try {
    setLoginLoading(true);
    const response = await axios.post('/api/auth/login', { identifier, senha });
    
    if (response.data.success) {
      // Delay de 3 segundos após login bem-sucedido
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { usuario, token } = response.data.data;
      setUsuario(usuario);
      setToken(token);
      localStorage.setItem('token', token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erro no login:', error);
    return false;
  } finally {
    setLoginLoading(false);
  }
};
```

### Função Logout Atualizada
```typescript
const logout = async (): Promise<void> => {
  try {
    setLogoutLoading(true);
    
    // Delay de 2 segundos durante logout
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setUsuario(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  } finally {
    setLogoutLoading(false);
  }
};
```

## Fluxo de Uso

### Login
1. Usuário preenche credenciais
2. Clica em "Entrar" → botão muda para "Entrando..." com spinner
3. Se credenciais válidas → tela cheia de loading "Carregando sistema..." (3s)
4. Redirecionamento automático para dashboard

### Logout
1. Usuário clica no ícone de logout
2. Modal de confirmação aparece
3. Usuário confirma → modal muda para estado de loading "Encerrando sessão..." (2s)
4. Redirecionamento automático para login

## Benefícios

### UX/UI
- **Feedback visual**: Usuário sempre sabe o que está acontecendo
- **Prevenção de ações**: Confirmação evita logouts acidentais
- **Sensação de robustez**: Delays simulam processamento real
- **Consistência**: Padrão uniforme de loading em todo sistema

### Técnicos
- **Reutilização**: Componentes modulares e flexíveis
- **Manutenibilidade**: Estados centralizados no contexto
- **Escalabilidade**: Fácil de estender para outras funcionalidades
- **Performance**: Loading states evitam múltiplos cliques

## Customização

### Alterar Tempo de Loading
Para modificar os tempos de delay, edite em `client/src/contexts/AuthContext.tsx`:

```typescript
// Login: alterar de 3000ms (3s) para outro valor
await new Promise(resolve => setTimeout(resolve, 3000));

// Logout: alterar de 2000ms (2s) para outro valor  
await new Promise(resolve => setTimeout(resolve, 2000));
```

### Personalizar Textos
Modifique os textos nos componentes:
- Login: `LoadingSpinner` em `Login.tsx`
- Logout: `LogoutConfirmation.tsx`

### Adicionar Mais Animações
Use o `LoadingSpinner` em outros locais:
```typescript
<LoadingSpinner 
  size="lg" 
  text="Processando..." 
  fullScreen={false}
/>
```

## Estrutura de Arquivos

```
client/src/
├── components/
│   ├── LoadingSpinner.tsx       (novo)
│   ├── LogoutConfirmation.tsx   (novo)
│   └── Layout.tsx               (atualizado)
├── contexts/
│   └── AuthContext.tsx          (atualizado)
└── pages/
    └── Login.tsx                (atualizado)
```

## Próximos Passos Sugeridos

1. **Animações de Transição**: Adicionar animações suaves entre páginas
2. **Loading Específico**: Diferentes animações para diferentes ações
3. **Configuração Dinâmica**: Tempos de delay configuráveis via settings
4. **Otimização**: Cache de estados para melhor performance
5. **Testes**: Implementar testes unitários para os componentes 