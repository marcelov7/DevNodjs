import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bell, 
  Settings, 
  Users, 
  BarChart3,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  X
} from 'lucide-react';

interface Usuario {
  id: number;
  nome: string;
  username: string;
  email: string;
  nivel_acesso: string;
  ativo: boolean;
  preferencias: Record<string, boolean>;
}

interface TipoNotificacao {
  tipo: string;
  nome: string;
  descricao: string;
}

interface Estatisticas {
  total_notificacoes: number;
  nao_lidas: number;
  atribuicoes: number;
  atualizacoes: number;
  status_alterados: number;
  comentarios: number;
  inspecoes_gerador: number;
  novos_analisadores: number;
}

interface NotificacaoRecente {
  tipo: string;
  total: number;
  ultima_criacao: string;
  nao_lidas: number;
}

const GerenciamentoNotificacoes: React.FC = () => {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados dos dados
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [notificacoesRecentes, setNotificacoesRecentes] = useState<NotificacaoRecente[]>([]);
  const [tiposDisponiveis, setTiposDisponiveis] = useState<TipoNotificacao[]>([]);
  
  // Estados de filtros e pesquisa
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);
  const [preferenciasEditando, setPreferenciasEditando] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);

  // Verificar se é admin master
  if (usuario?.nivel_acesso !== 'admin_master') {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
        <p className="text-gray-600">Apenas administradores master podem acessar esta página.</p>
      </div>
    );
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/notificacoes/gerenciamento');
      
      if (response.data.success) {
        const { estatisticas, usuarios, notificacoes_recentes, tipos_disponiveis } = response.data.data;
        setEstatisticas(estatisticas);
        setUsuarios(usuarios);
        setNotificacoesRecentes(notificacoes_recentes);
        setTiposDisponiveis(tipos_disponiveis);
      }
    } catch (error: any) {
      setError('Erro ao carregar dados de gerenciamento');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const editarPreferencias = (usuario: Usuario) => {
    setUsuarioSelecionado(usuario);
    setPreferenciasEditando({ ...usuario.preferencias });
  };

  const salvarPreferencias = async () => {
    if (!usuarioSelecionado) return;

    try {
      setSalvando(true);
      await axios.put(`/api/notificacoes/gerenciamento/usuario/${usuarioSelecionado.id}/preferencias`, {
        preferencias: preferenciasEditando
      });

      setSuccess('Preferências atualizadas com sucesso!');
      setUsuarioSelecionado(null);
      carregarDados();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError('Erro ao salvar preferências');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSalvando(false);
    }
  };

  const alternarPreferencia = (tipo: string) => {
    setPreferenciasEditando(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  };

  const usuariosFiltrados = usuarios.filter(user => 
    user.nome.toLowerCase().includes(filtroUsuario.toLowerCase()) ||
    user.username.toLowerCase().includes(filtroUsuario.toLowerCase()) ||
    user.email.toLowerCase().includes(filtroUsuario.toLowerCase())
  );

  const getCorTipo = (tipo: string) => {
    const cores = {
      'nova_atribuicao': 'bg-blue-100 text-blue-800',
      'atualizacao_historico': 'bg-orange-100 text-orange-800',
      'status_alterado': 'bg-green-100 text-green-800',
      'comentario': 'bg-purple-100 text-purple-800',
      'vencimento': 'bg-red-100 text-red-800',
      'nova_inspecao_gerador': 'bg-yellow-100 text-yellow-800',
      'novo_analisador': 'bg-indigo-100 text-indigo-800'
    };
    return cores[tipo as keyof typeof cores] || 'bg-gray-100 text-gray-800';
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando dados de gerenciamento...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Bell className="h-8 w-8 mr-3 text-primary-600" />
              Gerenciamento de Notificações
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gerencie preferências de notificação para todos os usuários da organização
            </p>
          </div>
          <button
            onClick={carregarDados}
            className="btn-secondary flex items-center"
            disabled={loading}
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Notificações</div>
                <div className="text-2xl font-bold text-gray-900">{estatisticas.total_notificacoes}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Não Lidas</div>
                <div className="text-2xl font-bold text-gray-900">{estatisticas.nao_lidas}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Settings className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Inspeções Gerador</div>
                <div className="text-2xl font-bold text-gray-900">{estatisticas.inspecoes_gerador}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Novos Analisadores</div>
                <div className="text-2xl font-bold text-gray-900">{estatisticas.novos_analisadores}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notificações Recentes por Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Notificações por Tipo (Últimos 7 dias)
            </h3>
          </div>
          <div className="p-4">
            {notificacoesRecentes.length > 0 ? (
              <div className="space-y-3">
                {notificacoesRecentes.map((notif, index) => {
                  const tipoInfo = tiposDisponiveis.find(t => t.tipo === notif.tipo);
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCorTipo(notif.tipo)}`}>
                          {tipoInfo?.nome || notif.tipo}
                        </span>
                        <span className="ml-3 text-sm text-gray-600">
                          {formatarData(notif.ultima_criacao)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{notif.total} total</div>
                        <div className="text-xs text-red-600">{notif.nao_lidas} não lidas</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhuma notificação nos últimos 7 dias</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Tipos de Notificação Disponíveis
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {tiposDisponiveis.map((tipo, index) => (
                <div key={index} className="border-l-4 border-primary-400 pl-4">
                  <div className="text-sm font-medium text-gray-900">{tipo.nome}</div>
                  <div className="text-xs text-gray-600 mt-1">{tipo.descricao}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gerenciamento de Usuários */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Usuários e Preferências ({usuariosFiltrados.length})
            </h3>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar usuário..."
                  className="form-input pl-10 w-64"
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nível Acesso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notificações Ativas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuariosFiltrados.map((user) => {
                const notificacoesAtivas = Object.values(user.preferencias || {}).filter(ativo => ativo).length;
                const totalTipos = tiposDisponiveis.length;
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.nome}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.nivel_acesso === 'admin_master' ? 'bg-red-100 text-red-800' :
                        user.nivel_acesso === 'admin' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.nivel_acesso}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">
                          {notificacoesAtivas} de {totalTipos}
                        </div>
                        <div className="ml-3 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${(notificacoesAtivas / totalTipos) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => editarPreferencias(user)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição de Preferências */}
      {usuarioSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Gerenciar Preferências de Notificação
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {usuarioSelecionado.nome} (@{usuarioSelecionado.username})
                </p>
              </div>
              <button
                onClick={() => setUsuarioSelecionado(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {tiposDisponiveis.map((tipo) => (
                <div key={tipo.tipo} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={preferenciasEditando[tipo.tipo] || false}
                      onChange={() => alternarPreferencia(tipo.tipo)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{tipo.nome}</div>
                    <div className="text-sm text-gray-600 mt-1">{tipo.descricao}</div>
                  </div>
                  <div className="flex-shrink-0">
                    {preferenciasEditando[tipo.tipo] ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3 pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={() => setUsuarioSelecionado(null)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={salvarPreferencias}
                disabled={salvando}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {salvando ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Preferências
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciamentoNotificacoes; 