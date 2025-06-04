import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Configurar base URL do axios dinamicamente
axios.defaults.baseURL = API_BASE_URL;

interface Usuario {
  id: number;
  nome: string;
  username: string;
  email: string;
  setor: string;
  nivel_acesso: 'admin_master' | 'admin' | 'usuario' | 'visitante';
  ativo: boolean;
}

interface PermissoesUsuario {
  [recursoAcao: string]: boolean;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  loading: boolean;
  loginLoading: boolean;
  logoutLoading: boolean;
  permissoes: PermissoesUsuario;
  login: (identifier: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  hasPermission: (niveisPermitidos: string[]) => boolean;
  hasPageAccess: (recurso: string) => boolean;
  hasResourcePermission: (recurso: string, acao: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [permissoes, setPermissoes] = useState<PermissoesUsuario>({});

  // Configurar axios com token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Carregar permissões do usuário - memoizada para evitar loops
  const carregarPermissoes = useCallback(async () => {
    if (!usuario) {
      setPermissoes({});
      return;
    }

    try {
      // Admin Master tem todas as permissões
      if (usuario.nivel_acesso === 'admin_master') {
        // Buscar todos os recursos e ações para dar permissão total
        const response = await axios.get('/configuracoes/permissoes');
        if (response.data.success) {
          const { recursos, acoes } = response.data.data;
          const todasPermissoes: PermissoesUsuario = {};
          
          recursos.forEach((recurso: any) => {
            acoes.forEach((acao: any) => {
              todasPermissoes[`${recurso.slug}.${acao.slug}`] = true;
            });
          });
          
          setPermissoes(todasPermissoes);
        }
        return;
      }

      // Para outros usuários, buscar permissões específicas
      const response = await axios.get('/auth/permissions');
      
      if (response.data.success) {
        const permissoesCarregadas = response.data.data.permissoes || {};
        setPermissoes(permissoesCarregadas);
      } else {
        setPermissoes({});
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setPermissoes({});
    }
  }, [usuario?.id, usuario?.nivel_acesso]); // Dependências específicas

  // Verificar token ao carregar a aplicação
  useEffect(() => {
    const verificarToken = async () => {
      if (token) {
        try {
          const response = await axios.post('/auth/verify');
          if (response.data.success) {
            setUsuario(response.data.data.usuario);
          } else {
            await logout();
          }
        } catch (error) {
          console.error('Erro ao verificar token:', error);
          await logout();
        }
      }
      setLoading(false);
    };

    verificarToken();
  }, [token]);

  // Carregar permissões quando usuário mudar
  useEffect(() => {
    if (usuario) {
      carregarPermissoes();
    }
  }, [usuario?.id, usuario?.nivel_acesso, carregarPermissoes]);

  const login = async (identifier: string, senha: string): Promise<boolean> => {
    try {
      setLoginLoading(true);
      
      const response = await axios.post('/auth/login', {
        identifier,
        senha
      });

      if (response.data.success) {
        const { usuario, token } = response.data.data;
        
        // Simular carregamento de 3 segundos após login bem-sucedido
        await new Promise(resolve => setTimeout(resolve, 3000));
        
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

  const logout = async (): Promise<void> => {
    try {
      setLogoutLoading(true);
      
      // Simular carregamento durante logout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUsuario(null);
      setToken(null);
      setPermissoes({});
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLogoutLoading(false);
    }
  };

  const isAuthenticated = useCallback((): boolean => {
    return !!usuario && !!token;
  }, [usuario, token]);

  // Verificação por níveis (compatibilidade com código antigo) - memoizada
  const hasPermission = useCallback((niveisPermitidos: string[]): boolean => {
    if (!usuario) return false;
    return niveisPermitidos.includes(usuario.nivel_acesso);
  }, [usuario?.nivel_acesso]);

  // Verificação de acesso à página (recurso + visualizar) - memoizada
  const hasPageAccess = useCallback((recurso: string): boolean => {
    if (!usuario) return false;
    
    // Admin Master sempre tem acesso
    if (usuario.nivel_acesso === 'admin_master') return true;
    
    // Verificar permissão específica
    const permissionKey = `${recurso}.visualizar`;
    const permissionValue = permissoes[permissionKey];
    // MySQL retorna 1/0 para TRUE/FALSE, converter para boolean
    return Boolean(permissionValue);
  }, [usuario?.nivel_acesso, permissoes]);

  // Verificação de permissão específica (recurso + ação) - memoizada
  const hasResourcePermission = useCallback((recurso: string, acao: string): boolean => {
    if (!usuario) return false;
    
    // Admin Master sempre tem permissão
    if (usuario.nivel_acesso === 'admin_master') return true;
    
    // Verificar permissão específica
    const permissionKey = `${recurso}.${acao}`;
    const permissionValue = permissoes[permissionKey];
    // MySQL retorna 1/0 para TRUE/FALSE, converter para boolean
    return Boolean(permissionValue);
  }, [usuario?.nivel_acesso, permissoes]);

  const value: AuthContextType = {
    usuario,
    token,
    loading,
    loginLoading,
    logoutLoading,
    permissoes,
    login,
    logout,
    isAuthenticated,
    hasPermission,
    hasPageAccess,
    hasResourcePermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}; 