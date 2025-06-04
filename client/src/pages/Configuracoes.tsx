import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings,
  Users,
  Shield,
  History,
  Eye,
  Edit2,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Globe
} from 'lucide-react';
import Tooltip from '../components/Tooltip';

interface Recurso {
  id: number;
  nome: string;
  descricao: string;
  slug: string;
  ativo: boolean;
  ordem: number;
}

interface Acao {
  id: number;
  nome: string;
  descricao: string;
  slug: string;
  ativo: boolean;
  ordem: number;
}

interface PermissoesPorNivel {
  [nivel: string]: {
    [recurso: string]: {
      [acao: string]: boolean;
    };
  };
}

interface AuditoriaItem {
  id: number;
  usuario_nome: string;
  nivel_acesso: string;
  recurso_nome: string;
  recurso_slug: string;
  acao_nome: string;
  acao_slug: string;
  valor_anterior: boolean;
  valor_novo: boolean;
  ip_address: string;
  data_alteracao: string;
}

interface UsuariosPorNivel {
  nivel_acesso: string;
  total: number;
  nomes: string;
}

interface Estatisticas {
  total_usuarios: number;
  usuarios_ativos: number;
  usuarios_inativos: number;
}

const Configuracoes: React.FC = () => {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabAtiva, setTabAtiva] = useState<'permissoes' | 'usuarios' | 'auditoria'>('permissoes');

  // Estados para permissões
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [permissoes, setPermissoes] = useState<PermissoesPorNivel>({});
  const [alteracoesPendentes, setAlteracoesPendentes] = useState<any[]>([]);

  // Estados para usuários
  const [usuariosPorNivel, setUsuariosPorNivel] = useState<UsuariosPorNivel[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);

  // Estados para auditoria
  const [auditoria, setAuditoria] = useState<AuditoriaItem[]>([]);
  const [filtrosAuditoria, setFiltrosAuditoria] = useState({
    nivel_acesso: '',
    recurso: '',
    acao: '',
    usuario_id: ''
  });
  const [paginaAuditoria, setPaginaAuditoria] = useState(1);
  const [totalPaginasAuditoria, setTotalPaginasAuditoria] = useState(1);

  // Estados da interface
  const [niveisExpandidos, setNiveisExpandidos] = useState<{ [key: string]: boolean }>({
    admin: true,
    usuario: true,
    visitante: true
  });
  const [salvandoPermissoes, setSalvandoPermissoes] = useState(false);

  useEffect(() => {
    if (usuario && usuario.nivel_acesso === 'admin_master') {
      carregarDados();
    }
  }, [usuario?.id, usuario?.nivel_acesso, tabAtiva]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      if (tabAtiva === 'permissoes') {
        await carregarPermissoes();
      } else if (tabAtiva === 'usuarios') {
        await carregarUsuarios();
      } else if (tabAtiva === 'auditoria') {
        await carregarAuditoria();
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados das configurações');
    } finally {
      setLoading(false);
    }
  };

  const carregarPermissoes = async () => {
    const response = await axios.get('/api/configuracoes/permissoes');
    if (response.data.success) {
      setRecursos(response.data.data.recursos);
      setAcoes(response.data.data.acoes);
      setPermissoes(response.data.data.permissoes);
    }
  };

  const carregarUsuarios = async () => {
    const response = await axios.get('/api/configuracoes/usuarios');
    if (response.data.success) {
      setUsuariosPorNivel(response.data.data.usuarios_por_nivel);
      setEstatisticas(response.data.data.estatisticas);
    }
  };

  const carregarAuditoria = async () => {
    const params = new URLSearchParams({
      page: paginaAuditoria.toString(),
      limit: '20'
    });

    Object.entries(filtrosAuditoria).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    const response = await axios.get(`/api/configuracoes/auditoria?${params}`);
    if (response.data.success) {
      setAuditoria(response.data.data.auditoria);
      setTotalPaginasAuditoria(response.data.data.pagination.pages);
    }
  };

  const togglePermissao = (nivel: string, recurso: string, acao: string) => {
    if (nivel === 'admin_master') return; // Não permitir alterar admin_master

    const valorAtual = permissoes[nivel]?.[recurso]?.[acao] || false;
    const novoValor = !valorAtual;

    // Atualizar estado local
    setPermissoes(prev => ({
      ...prev,
      [nivel]: {
        ...prev[nivel],
        [recurso]: {
          ...prev[nivel][recurso],
          [acao]: novoValor
        }
      }
    }));

    // Adicionar às alterações pendentes
    setAlteracoesPendentes(prev => {
      const alteracaoExiste = prev.findIndex(
        alt => alt.nivel_acesso === nivel && alt.recurso === recurso && alt.acao === acao
      );

      if (alteracaoExiste >= 0) {
        // Atualizar alteração existente
        const novasAlteracoes = [...prev];
        novasAlteracoes[alteracaoExiste].permitido = novoValor;
        return novasAlteracoes;
      } else {
        // Adicionar nova alteração
        return [...prev, { nivel_acesso: nivel, recurso, acao, permitido: novoValor }];
      }
    });
  };

  const salvarPermissoes = async () => {
    if (alteracoesPendentes.length === 0) {
      setError('Nenhuma alteração para salvar');
      return;
    }

    try {
      setSalvandoPermissoes(true);
      
      const response = await axios.post('/api/configuracoes/permissoes/lote', {
        alteracoes: alteracoesPendentes
      });

      if (response.data.success) {
        setSuccess(`${alteracoesPendentes.length} permissões atualizadas com sucesso`);
        setAlteracoesPendentes([]);
        
        // Atualizar cache do servidor
        await axios.post('/api/configuracoes/cache/refresh');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao salvar permissões');
    } finally {
      setSalvandoPermissoes(false);
    }
  };

  const descartarAlteracoes = () => {
    setAlteracoesPendentes([]);
    carregarPermissoes(); // Recarregar dados originais
  };

  const toggleNivel = (nivel: string) => {
    setNiveisExpandidos(prev => ({
      ...prev,
      [nivel]: !prev[nivel]
    }));
  };

  const formatarDataHora = (dataString: string) => {
    return new Date(dataString).toLocaleString('pt-BR');
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'admin_master': return 'red';
      case 'admin': return 'blue';
      case 'usuario': return 'green';
      case 'visitante': return 'gray';
      default: return 'gray';
    }
  };

  const getNivelLabel = (nivel: string) => {
    switch (nivel) {
      case 'admin_master': return 'Admin Master';
      case 'admin': return 'Administrador';
      case 'usuario': return 'Usuário';
      case 'visitante': return 'Visitante';
      default: return nivel;
    }
  };

  if (!usuario || usuario.nivel_acesso !== 'admin_master') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-24 w-24 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Acesso Restrito
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Apenas Admin Master pode acessar as configurações do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Settings className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
              Configurações do Sistema
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gerencie permissões, usuários e monitore atividades do sistema
            </p>
          </div>
          
          {tabAtiva === 'permissoes' && alteracoesPendentes.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={descartarAlteracoes}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4 mr-2 inline" />
                Descartar
              </button>
              <button
                onClick={salvarPermissoes}
                disabled={salvandoPermissoes}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {salvandoPermissoes ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar ({alteracoesPendentes.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            <span className="text-green-800 dark:text-green-200">{success}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'permissoes', label: 'Permissões', icon: Shield },
              { id: 'usuarios', label: 'Usuários', icon: Users },
              { id: 'auditoria', label: 'Auditoria', icon: History }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setTabAtiva(id as any);
                  setError('');
                  setSuccess('');
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                  tabAtiva === id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo das Tabs */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <>
              {/* Tab Permissões */}
              {tabAtiva === 'permissoes' && (
                <div className="space-y-6">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Configure as permissões para cada nível de usuário. O Admin Master possui todas as permissões automaticamente.
                  </div>

                  {['admin', 'usuario', 'visitante'].map((nivel) => (
                    <div key={nivel} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                      <button
                        onClick={() => toggleNivel(nivel)}
                        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg transition-colors"
                      >
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 bg-${getNivelColor(nivel)}-500`}></div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {getNivelLabel(nivel)}
                          </span>
                        </div>
                        {niveisExpandidos[nivel] ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </button>

                      {niveisExpandidos[nivel] && (
                        <div className="p-4">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                  <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Recurso
                                  </th>
                                  {acoes.map((acao) => (
                                    <th key={acao.id} className="text-center py-2 px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                      {acao.nome}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {recursos.map((recurso) => (
                                  <tr key={recurso.id} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {recurso.nome}
                                    </td>
                                    {acoes.map((acao) => (
                                      <td key={acao.id} className="text-center py-3 px-3">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={permissoes[nivel]?.[recurso.slug]?.[acao.slug] || false}
                                            onChange={() => togglePermissao(nivel, recurso.slug, acao.slug)}
                                          />
                                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tab Usuários */}
              {tabAtiva === 'usuarios' && estatisticas && (
                <div className="space-y-6">
                  {/* Estatísticas Gerais */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total de Usuários</p>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{estatisticas.total_usuarios}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">Usuários Ativos</p>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{estatisticas.usuarios_ativos}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
                      <div className="flex items-center">
                        <X className="h-8 w-8 text-red-600 dark:text-red-400" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">Usuários Inativos</p>
                          <p className="text-2xl font-bold text-red-900 dark:text-red-100">{estatisticas.usuarios_inativos}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Usuários por Nível */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Usuários por Nível de Acesso</h3>
                    {usuariosPorNivel.map((nivel) => (
                      <div key={nivel.nivel_acesso} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-3 bg-${getNivelColor(nivel.nivel_acesso)}-500`}></div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {getNivelLabel(nivel.nivel_acesso)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {nivel.total} usuário{nivel.total !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {nivel.nomes.length > 100 ? `${nivel.nomes.substring(0, 100)}...` : nivel.nomes}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab Auditoria */}
              {tabAtiva === 'auditoria' && (
                <div className="space-y-6">
                  {/* Filtros */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nível de Acesso
                      </label>
                      <select
                        value={filtrosAuditoria.nivel_acesso}
                        onChange={(e) => setFiltrosAuditoria(prev => ({ ...prev, nivel_acesso: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Todos</option>
                        <option value="admin">Administrador</option>
                        <option value="usuario">Usuário</option>
                        <option value="visitante">Visitante</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Recurso
                      </label>
                      <select
                        value={filtrosAuditoria.recurso}
                        onChange={(e) => setFiltrosAuditoria(prev => ({ ...prev, recurso: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Todos</option>
                        {recursos.map((recurso) => (
                          <option key={recurso.id} value={recurso.slug}>{recurso.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ação
                      </label>
                      <select
                        value={filtrosAuditoria.acao}
                        onChange={(e) => setFiltrosAuditoria(prev => ({ ...prev, acao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Todas</option>
                        {acoes.map((acao) => (
                          <option key={acao.id} value={acao.slug}>{acao.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setPaginaAuditoria(1);
                          carregarAuditoria();
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Filtrar
                      </button>
                    </div>
                  </div>

                  {/* Lista de Auditoria */}
                  <div className="space-y-3">
                    {auditoria.map((item) => (
                      <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {item.usuario_nome}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full bg-${getNivelColor(item.nivel_acesso)}-100 text-${getNivelColor(item.nivel_acesso)}-800 dark:bg-${getNivelColor(item.nivel_acesso)}-900/20 dark:text-${getNivelColor(item.nivel_acesso)}-200`}>
                                {getNivelLabel(item.nivel_acesso)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <strong>{item.acao_nome}</strong> em <strong>{item.recurso_nome}</strong>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center">
                                <span className="mr-2">Anterior:</span>
                                <span className={`px-2 py-1 rounded ${item.valor_anterior ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'}`}>
                                  {item.valor_anterior ? 'Permitido' : 'Negado'}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="mr-2">Novo:</span>
                                <span className={`px-2 py-1 rounded ${item.valor_novo ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'}`}>
                                  {item.valor_novo ? 'Permitido' : 'Negado'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center mb-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatarDataHora(item.data_alteracao)}
                            </div>
                            <div className="flex items-center">
                              <Globe className="h-3 w-3 mr-1" />
                              {item.ip_address}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginação da Auditoria */}
                  {totalPaginasAuditoria > 1 && (
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => setPaginaAuditoria(Math.max(1, paginaAuditoria - 1))}
                        disabled={paginaAuditoria === 1}
                        className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Anterior
                      </button>
                      
                      <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                        Página {paginaAuditoria} de {totalPaginasAuditoria}
                      </span>
                      
                      <button
                        onClick={() => setPaginaAuditoria(Math.min(totalPaginasAuditoria, paginaAuditoria + 1))}
                        disabled={paginaAuditoria === totalPaginasAuditoria}
                        className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes; 