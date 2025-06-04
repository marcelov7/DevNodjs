import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock,
  Settings,
  Trash2,
  BellOff
} from 'lucide-react';

const NotificationPanel: React.FC = () => {
  const {
    notificacoes,
    totalNaoLidas,
    isConnected,
    marcarComoLida,
    marcarTodasComoLidas,
    buscarNotificacoes
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'nao_lidas'>('todas');
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fechar painel ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getIconePorTipo = (tipo: string) => {
    switch (tipo) {
      case 'nova_atribuicao':
        return <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'atualizacao_historico':
        return <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      case 'status_alterado':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'comentario':
        return <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'vencimento':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getCorFundoPorTipo = (tipo: string, lida: boolean) => {
    if (lida) return 'bg-gray-50 dark:bg-gray-800/50';
    
    switch (tipo) {
      case 'nova_atribuicao':
        return 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500';
      case 'atualizacao_historico':
        return 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 dark:border-orange-500';
      case 'status_alterado':
        return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-500';
      case 'comentario':
        return 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 dark:border-purple-500';
      case 'vencimento':
        return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50';
    }
  };

  const formatarTempo = (data: string) => {
    const agora = new Date();
    const dataNotificacao = new Date(data);
    const diffMs = agora.getTime() - dataNotificacao.getTime();
    const diffMinutos = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutos < 1) return 'Agora';
    if (diffMinutos < 60) return `${diffMinutos}m`;
    if (diffHoras < 24) return `${diffHoras}h`;
    if (diffDias < 7) return `${diffDias}d`;
    
    return dataNotificacao.toLocaleDateString('pt-BR');
  };

  const handleNotificacaoClick = (notificacao: any) => {
    // Marcar como lida se não estiver
    if (!notificacao.lida) {
      marcarComoLida(notificacao.id);
    }

    // Navegar para o relatório se houver
    if (notificacao.relatorio_id) {
      navigate('/relatorios');
      setIsOpen(false);
    }
  };

  const notificacoesFiltradas = notificacoes.filter(n => 
    filtro === 'todas' || (filtro === 'nao_lidas' && !n.lida)
  );

  return (
    <div className="relative" ref={panelRef}>
      {/* Botão de Notificações */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-colors duration-200
          ${isConnected 
            ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700' 
            : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }
        `}
        disabled={!isConnected}
        title={isConnected ? 'Notificações' : 'Desconectado'}
      >
        {isConnected ? (
          <Bell className="h-6 w-6" />
        ) : (
          <BellOff className="h-6 w-6" />
        )}
        
        {/* Badge de contagem */}
        {totalNaoLidas > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center animate-pulse">
            {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
          </span>
        )}
      </button>

      {/* Painel de Notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notificações</h3>
              {!isConnected && (
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded">
                  Offline
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filtros e Ações */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <button
                onClick={() => setFiltro('todas')}
                className={`text-xs px-3 py-1 rounded transition-colors duration-200 ${
                  filtro === 'todas' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                Todas ({notificacoes.length})
              </button>
              <button
                onClick={() => setFiltro('nao_lidas')}
                className={`text-xs px-3 py-1 rounded transition-colors duration-200 ${
                  filtro === 'nao_lidas' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                Não lidas ({totalNaoLidas})
              </button>
            </div>

            {totalNaoLidas > 0 && (
              <button
                onClick={marcarTodasComoLidas}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                title="Marcar todas como lidas"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-80 overflow-y-auto">
            {notificacoesFiltradas.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">
                  {filtro === 'nao_lidas' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notificacoesFiltradas.map((notificacao) => (
                  <div
                    key={notificacao.id}
                    onClick={() => handleNotificacaoClick(notificacao)}
                    className={`
                      p-4 cursor-pointer transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50
                      ${getCorFundoPorTipo(notificacao.tipo, notificacao.lida)}
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIconePorTipo(notificacao.tipo)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium truncate ${
                            notificacao.lida ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {notificacao.titulo}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {formatarTempo(notificacao.data_criacao)}
                          </span>
                        </div>
                        
                        <p className={`text-sm mt-1 line-clamp-2 ${
                          notificacao.lida ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notificacao.mensagem}
                        </p>

                        {notificacao.relatorio_titulo && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              📋 {notificacao.relatorio_titulo}
                            </span>
                          </div>
                        )}
                      </div>

                      {!notificacao.lida && (
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé */}
          {notificacoes.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-center">
              <button
                onClick={() => {
                  navigate('/notificacoes');
                  setIsOpen(false);
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel; 