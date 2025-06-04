import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Tooltip from '../components/Tooltip';
import { 
  Activity, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Eye,
  Filter,
  Calendar,
  Clock,
  Thermometer,
  Wind,
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Analisador {
  id: number;
  analyzer: string;
  check_date: string;
  acid_filter: boolean;
  gas_dryer: boolean;
  paper_filter: boolean;
  peristaltic_pump: boolean;
  rotameter: boolean;
  disposable_filter: boolean;
  blocking_filter: boolean;
  room_temperature?: number;
  air_pressure?: number;
  observation?: string;
  image?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface FiltrosAnalisador {
  analyzer: string;
  check_date: string;
  ativo: string;
}

const Analisadores: React.FC = () => {
  const { usuario, hasPageAccess, hasResourcePermission } = useAuth();
  const [analisadores, setAnalisadores] = useState<Analisador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados do modal
  const [modalAberto, setModalAberto] = useState(false);
  const [analisadorEditando, setAnalisadorEditando] = useState<Analisador | null>(null);
  const [visualizando, setVisualizando] = useState(false);

  // Estados do formulário
  const [formulario, setFormulario] = useState({
    analyzer: '',
    check_date: '',
    acid_filter: false,
    gas_dryer: false,
    paper_filter: false,
    peristaltic_pump: false,
    rotameter: false,
    disposable_filter: false,
    blocking_filter: false,
    room_temperature: '',
    air_pressure: '',
    observation: '',
    image: '',
    ativo: true
  });

  // Estados de filtros e paginação
  const [filtros, setFiltros] = useState<FiltrosAnalisador>({
    analyzer: '',
    check_date: '',
    ativo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalAnalisadores, setTotalAnalisadores] = useState(0);
  const itemsPerPage = 10;

  const tiposAnalisador = [
    'ANALISADOR DA TORRE',
    'ANALISADOR DA CHAMINÉ',
    'ANALISADOR DA CAIXA DE FUMAÇA'
  ];

  // Memoizar filtros para evitar loops
  const filtrosMemoized = useMemo(() => filtros, [filtros.analyzer, filtros.check_date, filtros.ativo]);

  useEffect(() => {
    if (hasPageAccess('analisadores')) {
      carregarDados();
    }
  }, [paginaAtual, filtrosMemoized]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: paginaAtual.toString(),
        limit: itemsPerPage.toString()
      });

      // Adicionar filtros apenas se tiverem valor
      if (filtros.analyzer) params.append('analyzer', filtros.analyzer);
      if (filtros.check_date) params.append('check_date', filtros.check_date);
      if (filtros.ativo) params.append('ativo', filtros.ativo);

      const response = await axios.get(`/api/analisadores?${params}`);
      
      if (response.data.success) {
        setAnalisadores(response.data.data.analisadores);
        setTotalPaginas(response.data.data.pagination.pages);
        setTotalAnalisadores(response.data.data.pagination.total);
      }
    } catch (error) {
      setError('Erro ao carregar analisadores');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
    setPaginaAtual(1); // Reset para primeira página ao filtrar
  };

  const clearFilters = () => {
    setFiltros({
      analyzer: '',
      check_date: '',
      ativo: ''
    });
    setPaginaAtual(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const abrirModal = (analisadorParaEditar?: Analisador, somenteVisualizacao = false) => {
    if (analisadorParaEditar) {
      setAnalisadorEditando(analisadorParaEditar);
      setFormulario({
        analyzer: analisadorParaEditar.analyzer,
        check_date: analisadorParaEditar.check_date.split('T')[0], // Formato YYYY-MM-DD
        acid_filter: analisadorParaEditar.acid_filter,
        gas_dryer: analisadorParaEditar.gas_dryer,
        paper_filter: analisadorParaEditar.paper_filter,
        peristaltic_pump: analisadorParaEditar.peristaltic_pump,
        rotameter: analisadorParaEditar.rotameter,
        disposable_filter: analisadorParaEditar.disposable_filter,
        blocking_filter: analisadorParaEditar.blocking_filter,
        room_temperature: analisadorParaEditar.room_temperature?.toString() || '',
        air_pressure: analisadorParaEditar.air_pressure?.toString() || '',
        observation: analisadorParaEditar.observation || '',
        image: analisadorParaEditar.image || '',
        ativo: analisadorParaEditar.ativo
      });
    } else {
      setAnalisadorEditando(null);
      setFormulario({
        analyzer: '',
        check_date: new Date().toISOString().split('T')[0], // Data atual
        acid_filter: false,
        gas_dryer: false,
        paper_filter: false,
        peristaltic_pump: false,
        rotameter: false,
        disposable_filter: false,
        blocking_filter: false,
        room_temperature: '',
        air_pressure: '',
        observation: '',
        image: '',
        ativo: true
      });
    }
    setVisualizando(somenteVisualizacao);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setAnalisadorEditando(null);
    setVisualizando(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const dadosFormulario = {
        ...formulario,
        room_temperature: formulario.room_temperature ? parseFloat(formulario.room_temperature) : null,
        air_pressure: formulario.air_pressure ? parseFloat(formulario.air_pressure) : null,
      };
      
      if (analisadorEditando) {
        await axios.put(`/api/analisadores/${analisadorEditando.id}`, dadosFormulario);
        setSuccess('Analisador atualizado com sucesso!');
      } else {
        await axios.post('/api/analisadores', dadosFormulario);
        setSuccess('Analisador criado com sucesso!');
      }
      
      fecharModal();
      carregarDados();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao salvar analisador');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja desativar este analisador?')) return;
    
    try {
      await axios.delete(`/api/analisadores/${id}`);
      setSuccess('Analisador desativado com sucesso!');
      carregarDados();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao desativar analisador');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Função para obter status dos componentes
  const getComponentStatus = (analisador: Analisador) => {
    const components = [
      { name: 'Filtro Ácido', status: analisador.acid_filter },
      { name: 'Filtro Papel', status: analisador.paper_filter },
      { name: 'Bomba Perist.', status: analisador.peristaltic_pump },
      { name: 'Rotâmetro', status: analisador.rotameter },
      { name: 'Filtro Bloq.', status: analisador.blocking_filter },
      { name: 'Secador Gás', status: analisador.gas_dryer },
      { name: 'Filtro Desc.', status: analisador.disposable_filter }
    ];
    
    const okCount = components.filter(c => c.status).length;
    return { components, okCount, total: components.length };
  };

  if (!hasPageAccess('analisadores')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Acesso Restrito</h2>
            <p className="text-gray-600 dark:text-gray-400">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Principal */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-3 mb-4 lg:mb-0">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Gestão de Analisadores
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gerencie informações dos analisadores de energia
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Tooltip content="Filtrar analisadores">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showFilters 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </button>
              </Tooltip>
              {hasResourcePermission('analisadores', 'criar') && (
                <Tooltip content="Novo check">
                  <button
                    onClick={() => abrirModal()}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Check
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Analisador
                </label>
                <div className="relative">
                  <Activity className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={filtros.analyzer}
                    onChange={(e) => handleFilterChange('analyzer', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Todos os analisadores</option>
                    {tiposAnalisador.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data do Check
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="date"
                    value={filtros.check_date}
                    onChange={(e) => handleFilterChange('check_date', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filtros.ativo}
                  onChange={(e) => handleFilterChange('ativo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Todos</option>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={carregarDados}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Aplicar Filtros
                </button>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mensagens */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-green-800 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total de analisadores: <span className="font-semibold text-gray-900 dark:text-gray-100">{totalAnalisadores}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Página {paginaAtual} de {totalPaginas}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {analisadores.length} analisadores nesta página
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 transition-colors duration-200">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Carregando analisadores...</p>
            </div>
          </div>
        ) : analisadores.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 transition-colors duration-200">
            <div className="text-center">
              <Activity className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Nenhum analisador encontrado</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Não há checks de analisadores cadastrados ou que correspondam aos filtros aplicados.
              </p>
              {hasResourcePermission('analisadores', 'criar') && (
                <button
                  onClick={() => abrirModal()}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Check
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Analisador / Data Check
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Filtros/Componentes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Condições
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {analisadores.map((analisador) => {
                      const { components, okCount, total } = getComponentStatus(analisador);
                      return (
                        <tr key={analisador.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {analisador.analyzer}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(analisador.check_date)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <div className={`text-sm font-medium ${
                                okCount === total ? 'text-green-600 dark:text-green-400' : 
                                okCount >= total * 0.7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {okCount}/{total} OK
                              </div>
                              <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    okCount === total ? 'bg-green-500' : 
                                    okCount >= total * 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${(okCount / total) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="text-gray-900 dark:text-gray-100">
                                {analisador.room_temperature ? `${analisador.room_temperature}°C` : 'N/A'}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">
                                {analisador.air_pressure ? `${analisador.air_pressure} bar` : 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              analisador.ativo
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                            }`}>
                              {analisador.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <Tooltip content="Visualizar">
                                <button
                                  onClick={() => abrirModal(analisador, true)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </Tooltip>
                              {hasResourcePermission('analisadores', 'editar') && (
                                <Tooltip content="Editar">
                                  <button
                                    onClick={() => abrirModal(analisador)}
                                    className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </Tooltip>
                              )}
                              {hasResourcePermission('analisadores', 'excluir') && (
                                <Tooltip content="Desativar">
                                  <button
                                    onClick={() => handleDelete(analisador.id)}
                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    disabled={!analisador.ativo}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards Mobile/Tablet */}
            <div className="lg:hidden space-y-4">
              {analisadores.map((analisador) => {
                const { components, okCount, total } = getComponentStatus(analisador);
                return (
                  <div key={analisador.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {analisador.analyzer}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(analisador.check_date)}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        analisador.ativo
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                          : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}>
                        {analisador.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">STATUS DOS COMPONENTES</span>
                        </div>
                        <div className="text-sm text-blue-800 dark:text-blue-300">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${
                              okCount === total ? 'text-green-600 dark:text-green-400' : 
                              okCount >= total * 0.7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {okCount}/{total} OK
                            </span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  okCount === total ? 'bg-green-500' : 
                                  okCount >= total * 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${(okCount / total) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                            {components.slice(0, 4).map((comp, idx) => (
                              <div key={idx} className="flex items-center space-x-1">
                                {comp.status ? (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                                <span className="truncate text-gray-700 dark:text-gray-300">{comp.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Thermometer className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-sm font-medium text-yellow-900 dark:text-yellow-300">CONDIÇÕES</span>
                        </div>
                        <div className="text-sm text-yellow-800 dark:text-yellow-300">
                          <div className="flex items-center space-x-1">
                            <Thermometer className="h-3 w-3" />
                            <span>Temp: {analisador.room_temperature ? `${analisador.room_temperature}°C` : 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Wind className="h-3 w-3" />
                            <span>Pressão: {analisador.air_pressure ? `${analisador.air_pressure} bar` : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {analisador.observation && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Observações</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{analisador.observation}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Tooltip content="Visualizar">
                        <button
                          onClick={() => abrirModal(analisador, true)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      {hasResourcePermission('analisadores', 'editar') && (
                        <Tooltip content="Editar">
                          <button
                            onClick={() => abrirModal(analisador)}
                            className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      )}
                      {hasResourcePermission('analisadores', 'excluir') && (
                        <Tooltip content="Desativar">
                          <button
                            onClick={() => handleDelete(analisador.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            disabled={!analisador.ativo}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {((paginaAtual - 1) * itemsPerPage) + 1} a {Math.min(paginaAtual * itemsPerPage, totalAnalisadores)} de {totalAnalisadores} resultados
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                      disabled={paginaAtual === 1}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                        let pageNum: number;
                        if (totalPaginas <= 5) {
                          pageNum = i + 1;
                        } else if (paginaAtual <= 3) {
                          pageNum = i + 1;
                        } else if (paginaAtual >= totalPaginas - 2) {
                          pageNum = totalPaginas - 4 + i;
                        } else {
                          pageNum = paginaAtual - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPaginaAtual(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              paginaAtual === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))}
                      disabled={paginaAtual === totalPaginas}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {visualizando ? (
                  // Modo visualização com design melhorado
                  <div>
                    {/* Cabeçalho */}
                    <div className="border-b border-gray-200 pb-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Detalhes do Analisador
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Informações completas do check do analisador
                          </p>
                        </div>
                        <button
                          onClick={fecharModal}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Identificação Principal */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Activity className="h-5 w-5 mr-2 text-blue-600" />
                          Identificação
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Analisador</dt>
                            <dd className="mt-1 text-lg font-semibold text-blue-900">{analisadorEditando?.analyzer}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Data do Check</dt>
                            <dd className="mt-1 text-lg font-semibold text-blue-900 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {analisadorEditando && formatDate(analisadorEditando.check_date)}
                            </dd>
                          </div>
                          <div className="md:col-span-2">
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Status</dt>
                            <dd className="mt-1">
                              <span className={`inline-flex items-center px-3 py-2 text-base font-semibold rounded-full ${
                                analisadorEditando?.ativo 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {analisadorEditando?.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </dd>
                          </div>
                        </div>
                      </div>

                      {/* Filtros */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Filter className="h-5 w-5 mr-2 text-green-600" />
                          Status dos Filtros
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Filtro Ácido</dt>
                            <dd className="mt-1 flex items-center">
                              {analisadorEditando && getComponentStatus(analisadorEditando).components[0].status ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="ml-2 text-base text-green-900">
                                {analisadorEditando?.acid_filter ? 'Conforme' : 'Não Conforme'}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Filtro de Papel</dt>
                            <dd className="mt-1 flex items-center">
                              {analisadorEditando && getComponentStatus(analisadorEditando).components[1].status ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="ml-2 text-base text-green-900">
                                {analisadorEditando?.paper_filter ? 'Conforme' : 'Não Conforme'}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Filtro Descartável</dt>
                            <dd className="mt-1 flex items-center">
                              {analisadorEditando && getComponentStatus(analisadorEditando).components[3].status ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="ml-2 text-base text-green-900">
                                {analisadorEditando?.disposable_filter ? 'Conforme' : 'Não Conforme'}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Filtro de Bloqueio</dt>
                            <dd className="mt-1 flex items-center">
                              {analisadorEditando && getComponentStatus(analisadorEditando).components[4].status ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="ml-2 text-base text-green-900">
                                {analisadorEditando?.blocking_filter ? 'Conforme' : 'Não Conforme'}
                              </span>
                            </dd>
                          </div>
                        </div>
                      </div>

                      {/* Equipamentos */}
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Activity className="h-5 w-5 mr-2 text-yellow-600" />
                          Status dos Equipamentos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Secador de Gás</dt>
                            <dd className="mt-1 flex items-center">
                              {analisadorEditando && getComponentStatus(analisadorEditando).components[5].status ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="ml-2 text-base text-yellow-900">
                                {analisadorEditando?.gas_dryer ? 'Conforme' : 'Não Conforme'}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Bomba Peristáltica</dt>
                            <dd className="mt-1 flex items-center">
                              {analisadorEditando && getComponentStatus(analisadorEditando).components[2].status ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="ml-2 text-base text-yellow-900">
                                {analisadorEditando?.peristaltic_pump ? 'Conforme' : 'Não Conforme'}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Rotâmetro</dt>
                            <dd className="mt-1 flex items-center">
                              {analisadorEditando && getComponentStatus(analisadorEditando).components[6].status ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="ml-2 text-base text-yellow-900">
                                {analisadorEditando?.rotameter ? 'Conforme' : 'Não Conforme'}
                              </span>
                            </dd>
                          </div>
                        </div>
                      </div>

                      {/* Condições Ambientais */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Thermometer className="h-5 w-5 mr-2 text-purple-600" />
                          Condições Ambientais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Temperatura do Ambiente</dt>
                            <dd className="mt-1 text-lg font-bold text-purple-900 flex items-center">
                              <Thermometer className="h-4 w-4 mr-2 text-orange-500" />
                              {analisadorEditando?.room_temperature ? `${analisadorEditando.room_temperature}°C` : 'Não informado'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Pressão do Ar</dt>
                            <dd className="mt-1 text-lg font-bold text-purple-900 flex items-center">
                              <Wind className="h-4 w-4 mr-2 text-blue-500" />
                              {analisadorEditando?.air_pressure ? `${analisadorEditando.air_pressure} bar` : 'Não informado'}
                            </dd>
                          </div>
                        </div>
                      </div>

                      {/* Observações e Imagem */}
                      {(analisadorEditando?.observation || analisadorEditando?.image) && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Camera className="h-5 w-5 mr-2 text-gray-600" />
                            Observações e Anexos
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {analisadorEditando?.observation && (
                              <div>
                                <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Observações</dt>
                                <dd className="mt-2 text-base text-gray-900 leading-relaxed bg-white p-3 rounded border">
                                  {analisadorEditando.observation}
                                </dd>
                              </div>
                            )}
                            {analisadorEditando?.image && (
                              <div>
                                <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Imagem</dt>
                                <dd className="mt-2">
                                  <span className="text-sm text-gray-600 bg-white p-2 rounded border flex items-center">
                                    <Camera className="h-4 w-4 mr-2" />
                                    {analisadorEditando.image}
                                  </span>
                                </dd>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Informações do Sistema */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Clock className="h-5 w-5 mr-2 text-gray-600" />
                          Informações do Sistema
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Data de Criação</dt>
                            <dd className="mt-1 text-sm text-gray-600 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {analisadorEditando && formatDate(analisadorEditando.created_at)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Última Atualização</dt>
                            <dd className="mt-1 text-sm text-gray-600 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {analisadorEditando && formatDate(analisadorEditando.updated_at)}
                            </dd>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rodapé com Ações */}
                    <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
                      <div className="flex space-x-2">
                        {hasResourcePermission('analisadores', 'editar') && (
                          <button
                            onClick={() => setVisualizando(false)}
                            className="btn btn-secondary"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar Check
                          </button>
                        )}
                      </div>
                      <button
                        onClick={fecharModal}
                        className="btn btn-primary"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                ) : (
                  // Modo edição/criação
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {analisadorEditando ? 'Editar Check do Analisador' : 'Novo Check do Analisador'}
                      </h3>
                      <button
                        onClick={fecharModal}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Informações Básicas */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Informações Básicas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Tipo de Analisador *</label>
                            <select
                              required
                              className="form-input"
                              value={formulario.analyzer}
                              onChange={(e) => setFormulario({...formulario, analyzer: e.target.value})}
                            >
                              <option value="">Selecione o analisador</option>
                              {tiposAnalisador.map(tipo => (
                                <option key={tipo} value={tipo}>
                                  {tipo}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="form-label">Data do Check *</label>
                            <input
                              type="date"
                              required
                              className="form-input"
                              value={formulario.check_date}
                              onChange={(e) => setFormulario({...formulario, check_date: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Checks dos Filtros */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Status dos Filtros</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="acid_filter"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              checked={formulario.acid_filter}
                              onChange={(e) => setFormulario({...formulario, acid_filter: e.target.checked})}
                            />
                            <label htmlFor="acid_filter" className="ml-2 block text-sm text-gray-900">
                              Filtro Ácido - Conforme
                            </label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="paper_filter"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              checked={formulario.paper_filter}
                              onChange={(e) => setFormulario({...formulario, paper_filter: e.target.checked})}
                            />
                            <label htmlFor="paper_filter" className="ml-2 block text-sm text-gray-900">
                              Filtro de Papel - Conforme
                            </label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="disposable_filter"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              checked={formulario.disposable_filter}
                              onChange={(e) => setFormulario({...formulario, disposable_filter: e.target.checked})}
                            />
                            <label htmlFor="disposable_filter" className="ml-2 block text-sm text-gray-900">
                              Filtro Descartável - Conforme
                            </label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="blocking_filter"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              checked={formulario.blocking_filter}
                              onChange={(e) => setFormulario({...formulario, blocking_filter: e.target.checked})}
                            />
                            <label htmlFor="blocking_filter" className="ml-2 block text-sm text-gray-900">
                              Filtro de Bloqueio - Conforme
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Checks dos Equipamentos */}
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Status dos Equipamentos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="gas_dryer"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              checked={formulario.gas_dryer}
                              onChange={(e) => setFormulario({...formulario, gas_dryer: e.target.checked})}
                            />
                            <label htmlFor="gas_dryer" className="ml-2 block text-sm text-gray-900">
                              Secador de Gás - Conforme
                            </label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="peristaltic_pump"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              checked={formulario.peristaltic_pump}
                              onChange={(e) => setFormulario({...formulario, peristaltic_pump: e.target.checked})}
                            />
                            <label htmlFor="peristaltic_pump" className="ml-2 block text-sm text-gray-900">
                              Bomba Peristáltica - Conforme
                            </label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="rotameter"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              checked={formulario.rotameter}
                              onChange={(e) => setFormulario({...formulario, rotameter: e.target.checked})}
                            />
                            <label htmlFor="rotameter" className="ml-2 block text-sm text-gray-900">
                              Rotâmetro - Conforme
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Condições Ambientais */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Condições Ambientais</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Temperatura do Ambiente (°C)</label>
                            <div className="relative">
                              <Thermometer className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                              <input
                                type="number"
                                step="0.1"
                                className="form-input pl-10"
                                placeholder="Ex: 25.5"
                                value={formulario.room_temperature}
                                onChange={(e) => setFormulario({...formulario, room_temperature: e.target.value})}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="form-label">Pressão do Ar (bar)</label>
                            <div className="relative">
                              <Wind className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                              <input
                                type="number"
                                step="0.1"
                                className="form-input pl-10"
                                placeholder="Ex: 5.1"
                                value={formulario.air_pressure}
                                onChange={(e) => setFormulario({...formulario, air_pressure: e.target.value})}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Observações e Imagem */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-md font-semibold text-gray-900 mb-4">Observações e Anexos</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="form-label">Observações</label>
                            <textarea
                              rows={4}
                              className="form-input"
                              placeholder="Descreva observações sobre o check, anomalias encontradas, etc..."
                              value={formulario.observation}
                              onChange={(e) => setFormulario({...formulario, observation: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="form-label">Imagem/Anexo</label>
                            <div className="relative">
                              <Camera className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                              <input
                                type="text"
                                className="form-input pl-10"
                                placeholder="Nome ou caminho da imagem..."
                                value={formulario.image}
                                onChange={(e) => setFormulario({...formulario, image: e.target.value})}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Ativo */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="ativo"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          checked={formulario.ativo}
                          onChange={(e) => setFormulario({...formulario, ativo: e.target.checked})}
                        />
                        <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
                          Check ativo
                        </label>
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={fecharModal}
                          className="btn-secondary flex-1"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Salvando...' : (analisadorEditando ? 'Atualizar' : 'Criar')}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analisadores; 