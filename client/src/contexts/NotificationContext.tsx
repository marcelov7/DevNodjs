import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

// Configuração da URL do servidor
const getServerUrl = (): string => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
  } else {
    // Em produção, usar variável de ambiente ou URL do Render
    return process.env.REACT_APP_SERVER_URL || 'https://seu-backend.onrender.com';
  }
};

const SERVER_URL = getServerUrl();

interface Notificacao {
  id: number;
  tipo: 'relatorio' | 'sistema' | 'permissao';
  titulo: string;
  mensagem: string;
  lida: boolean;
  data_criacao: string;
  relatorio_titulo?: string;
  dados_extras?: {
    relatorio_id?: number;
    usuario_id?: number;
    acao?: string;
  };
}

interface NotificationContextType {
  socket: Socket | null;
  notificacoes: Notificacao[];
  totalNaoLidas: number;
  isConnected: boolean;
  marcarComoLida: (notificacaoId: number) => void;
  marcarTodasComoLidas: () => void;
  buscarNotificacoes: (opcoes?: { limit?: number; offset?: number; apenasNaoLidas?: boolean }) => void;
  limparNotificacoes: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { usuario, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (usuario && token) {
      // Conectar ao socket
      const newSocket = io(SERVER_URL, {
        auth: {
          token: token
        }
      });

      // Eventos de conexão
      newSocket.on('connect', () => {
        console.log('🔌 Conectado ao servidor de notificações');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Desconectado do servidor de notificações');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Erro na conexão:', error);
        setIsConnected(false);
      });

      // Eventos de notificações
      newSocket.on('nova_notificacao', (notificacao: Notificacao) => {
        console.log('🔔 Nova notificação recebida:', notificacao);
        
        // Adicionar notificação ao início da lista
        setNotificacoes(prev => [notificacao, ...prev]);
        
        // Atualizar contador
        setTotalNaoLidas(prev => prev + 1);
        
        // Mostrar notificação do navegador se permitido
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notificacao.titulo, {
            body: notificacao.mensagem,
            icon: '/favicon.ico',
            tag: `notificacao-${notificacao.id}`
          });
        }
      });

      newSocket.on('contagem_nao_lidas', (data: { total: number }) => {
        console.log('📊 Contagem não lidas:', data.total);
        setTotalNaoLidas(data.total);
      });

      newSocket.on('notificacao_lida', (data: { id: number }) => {
        setNotificacoes(prev =>
          prev.map(n => n.id === data.id ? { ...n, lida: true } : n)
        );
        setTotalNaoLidas(prev => Math.max(0, prev - 1));
      });

      newSocket.on('todas_notificacoes_lidas', () => {
        setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
        setTotalNaoLidas(0);
      });

      newSocket.on('notificacoes_carregadas', (data: { notificacoes: Notificacao[]; total_nao_lidas: number }) => {
        console.log('📋 Notificações carregadas:', data);
        setNotificacoes(data.notificacoes);
        setTotalNaoLidas(data.total_nao_lidas);
      });

      newSocket.on('erro', (data: { message: string }) => {
        console.error('❌ Erro do servidor:', data.message);
      });

      setSocket(newSocket);

      // Carregar notificações iniciais
      setTimeout(() => {
        newSocket.emit('buscar_notificacoes', { limit: 50 });
      }, 1000);

      return () => {
        newSocket.close();
      };
    } else {
      // Desconectar se não há usuário/token
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
        setNotificacoes([]);
        setTotalNaoLidas(0);
      }
    }
  }, [usuario?.id, token]);

  // Solicitar permissão para notificações do navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('📢 Permissão de notificação:', permission);
      });
    }
  }, []);

  const marcarComoLida = (notificacaoId: number) => {
    if (socket) {
      socket.emit('marcar_lida', { notificacaoId });
    }
  };

  const marcarTodasComoLidas = () => {
    if (socket) {
      socket.emit('marcar_todas_lidas');
    }
  };

  const buscarNotificacoes = (opcoes?: { limit?: number; offset?: number; apenasNaoLidas?: boolean }) => {
    if (socket) {
      socket.emit('buscar_notificacoes', opcoes || {});
    }
  };

  const limparNotificacoes = () => {
    setNotificacoes([]);
    setTotalNaoLidas(0);
  };

  const value: NotificationContextType = {
    socket,
    notificacoes,
    totalNaoLidas,
    isConnected,
    marcarComoLida,
    marcarTodasComoLidas,
    buscarNotificacoes,
    limparNotificacoes
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
  }
  return context;
}; 