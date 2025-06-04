import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Building,
  Filter,
  Eye,
  Calendar,
  Home,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Activity
} from 'lucide-react';
import Tooltip from '../components/Tooltip';

interface Local {
  id: number;
  nome: string;
  descricao?: string;
  endereco?: string;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
  total_equipamentos?: number;
}

interface FiltrosLocal {
  nome: string;
  ativo: string;
}

const Locais: React.FC = () => {
  const { usuario, hasPageAccess, hasResourcePermission } = useAuth();
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados do modal
  const [modalAberto, setModalAberto] = useState(false);
  const [localEditando, setLocalEditando] = useState<Local | null>(null);
  const [visualizando, setVisualizando] = useState(false);

  // Estados do formulário
  const [formulario, setFormulario] = useState({
    nome: '',
    descricao: '',
    endereco: '',
    ativo: true
  });

  // Estados de filtros e paginação modernizados
  const [filtros, setFiltros] = useState<FiltrosLocal>({
    nome: '',
    ativo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalLocais, setTotalLocais] = useState(0);
  const itemsPerPage = 10;

  // Memoizar filtros para evitar loops
  const filtrosMemoized = useMemo(() => filtros, [filtros.nome, filtros.ativo]);

  useEffect(() => {
    if (hasPageAccess('locais')) {
      carregarLocais();
    }
  }, [paginaAtual, filtrosMemoized, hasPageAccess]);

  const carregarLocais = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: paginaAtual.toString(),
        limit: itemsPerPage.toString()
      });

      // Adicionar filtros apenas se tiverem valor
      if (filtros.nome) params.append('search', filtros.nome);
      if (filtros.ativo) params.append('ativo', filtros.ativo);

      const response = await axios.get(`/api/locais?${params}`);
      
      if (response.data.success) {
        setLocais(response.data.data.locais);
        setTotalPaginas(response.data.data.pagination.pages);
        setTotalLocais(response.data.data.pagination.total);
      }
    } catch (error) {
      setError('Erro ao carregar locais');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Funções helper para filtros
  const handleFilterChange = (field: string, value: string) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
    setPaginaAtual(1); // Reset para primeira página ao filtrar
  };

  const clearFilters = () => {
    setFiltros({
      nome: '',
      ativo: ''
    });
    setPaginaAtual(1);
  };

  const abrirModal = (localParaEditar?: Local, somenteVisualizacao = false) => {
    if (localParaEditar) {
      setLocalEditando(localParaEditar);
      setFormulario({
        nome: localParaEditar.nome,
        descricao: localParaEditar.descricao || '',
        endereco: localParaEditar.endereco || '',
        ativo: localParaEditar.ativo
      });
    } else {
      setLocalEditando(null);
      setFormulario({
        nome: '',
        descricao: '',
        endereco: '',
        ativo: true
      });
    }
    setVisualizando(somenteVisualizacao);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setLocalEditando(null);
    setVisualizando(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const dadosFormulario = {
        ...formulario,
        // Tratar campos opcionais que podem estar vazios
        descricao: formulario.descricao && formulario.descricao.trim() !== '' ? formulario.descricao.trim() : null,
        endereco: formulario.endereco && formulario.endereco.trim() !== '' ? formulario.endereco.trim() : null
      };
      
      if (localEditando) {
        await axios.put(`/api/locais/${localEditando.id}`, dadosFormulario);
        setSuccess('Local atualizado com sucesso!');
      } else {
        await axios.post('/locais', dadosFormulario);
        setSuccess('Local criado com sucesso!');
      }
      
      fecharModal();
      carregarLocais();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao salvar local');
    } finally {
      setLoading(false);
    }
  };

  const excluirLocal = async (id: number, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja desativar o local "${nome}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/locais/${id}`);
      setSuccess('Local desativado com sucesso!');
      carregarLocais();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao desativar local');
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Verificar permissões
  if (!hasPageAccess('locais')) {
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
                <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Gestão de Locais
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gerencie os locais onde estão instalados os equipamentos
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Tooltip content="Filtrar locais">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showFilters 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </button>
              </Tooltip>
              <Tooltip content="Novo local">
                {hasResourcePermission('locais', 'criar') && (
                  <button
                    onClick={() => abrirModal()}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Local
                  </button>
                )}
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Nome, descrição, endereço..."
                    value={filtros.nome}
                    onChange={(e) => handleFilterChange('nome', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <div className="relative">
                  <Activity className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={filtros.ativo}
                    onChange={(e) => handleFilterChange('ativo', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Todos os status</option>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={carregarLocais}
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
                Total de locais: <span className="font-semibold text-gray-900 dark:text-gray-100">{totalLocais}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Página {paginaAtual} de {totalPaginas}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {locais.length} locais nesta página
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 transition-colors duration-200">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Carregando locais...</p>
            </div>
          </div>
        ) : locais.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 transition-colors duration-200">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Nenhum local encontrado</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Não há locais cadastrados ou que correspondam aos filtros aplicados.
              </p>
              {hasResourcePermission('locais', 'criar') && (
                <button
                  onClick={() => abrirModal()}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Local
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
                        Local / Endereço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Equipamentos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Data Criação
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {locais.map((local) => (
                      <tr key={local.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {local.nome}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {local.endereco || 'Endereço não informado'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100 max-w-xs">
                            {local.descricao || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Building className="h-3 w-3 mr-1" />
                            {local.total_equipamentos || 0} equipamentos
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            local.ativo 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}>
                            {local.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {formatarData(local.data_criacao)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <Tooltip content="Visualizar">
                              <button
                                onClick={() => abrirModal(local, true)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Editar">
                              <button
                                onClick={() => abrirModal(local)}
                                className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Desativar">
                              <button
                                onClick={() => excluirLocal(local.id, local.nome)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                disabled={!local.ativo}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards Mobile/Tablet */}
            <div className="lg:hidden space-y-4">
              {locais.map((local) => (
                <div key={local.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {local.nome}
                      </h3>
                      {local.endereco && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{local.endereco}</p>
                      )}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      local.ativo 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                      {local.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">EQUIPAMENTOS</span>
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        {local.total_equipamentos || 0} equipamentos
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-900 dark:text-yellow-300">CRIAÇÃO</span>
                      </div>
                      <div className="text-sm text-yellow-800 dark:text-yellow-300">
                        {formatarData(local.data_criacao)}
                      </div>
                    </div>
                  </div>

                  {local.descricao && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Home className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">DESCRIÇÃO</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {local.descricao}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Tooltip content="Visualizar">
                      <button
                        onClick={() => abrirModal(local, true)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Editar">
                      <button
                        onClick={() => abrirModal(local)}
                        className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Desativar">
                      <button
                        onClick={() => excluirLocal(local.id, local.nome)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        disabled={!local.ativo}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {((paginaAtual - 1) * itemsPerPage) + 1} a {Math.min(paginaAtual * itemsPerPage, totalLocais)} de {totalLocais} resultados
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
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-200">
            <div className="p-6">
              {visualizando ? (
                // Modo visualização com design melhorado
                <div>
                  {/* Cabeçalho */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          Detalhes do Local
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Informações completas do local selecionado
                        </p>
                      </div>
                      <button
                        onClick={fecharModal}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Identificação Principal */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                        Identificação
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Nome do Local</dt>
                          <dd className="mt-1 text-xl font-bold text-blue-900 dark:text-blue-300">{localEditando?.nome}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Descrição</dt>
                          <dd className="mt-2 text-base text-blue-900 dark:text-blue-300 leading-relaxed bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                            {localEditando?.descricao || 'Nenhuma descrição disponível'}
                          </dd>
                        </div>
                      </div>
                    </div>

                    {/* Localização */}
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <Home className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                        Endereço
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Endereço Completo</dt>
                          <dd className="mt-2 text-base text-green-900 dark:text-green-300 leading-relaxed bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                            {localEditando?.endereco || 'Endereço não informado'}
                          </dd>
                        </div>
                      </div>
                    </div>

                    {/* Atividade e Status */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                        Status e Atividade
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Status</dt>
                          <dd className="mt-1">
                            <span className={`inline-flex items-center px-3 py-2 text-base font-semibold rounded-full ${
                              localEditando?.ativo 
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                            }`}>
                              {localEditando?.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Total de Equipamentos</dt>
                          <dd className="mt-1">
                            <span className="inline-flex items-center px-3 py-2 text-base font-semibold rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <Building className="h-4 w-4 mr-2" />
                              {localEditando?.total_equipamentos || 0} equipamentos
                            </span>
                          </dd>
                        </div>
                      </div>
                    </div>

                    {/* Informações do Sistema */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
                        Informações do Sistema
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Data de Criação</dt>
                          <dd className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {localEditando && formatarData(localEditando.data_criacao)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Última Atualização</dt>
                          <dd className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {localEditando && formatarData(localEditando.data_atualizacao)}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé com Ações */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                    <div className="flex space-x-2">
                      {hasResourcePermission('locais', 'editar') && (
                        <button
                          onClick={() => setVisualizando(false)}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar Local
                        </button>
                      )}
                    </div>
                    <button
                      onClick={fecharModal}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo edição/criação (mantém o design original melhorado)
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {localEditando ? 'Editar Local' : 'Novo Local'}
                    </h3>
                    <button
                      onClick={fecharModal}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome do Local *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Ex: Fábrica Principal"
                        value={formulario.nome}
                        onChange={(e) => setFormulario({...formulario, nome: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição</label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Descrição do local..."
                        value={formulario.descricao}
                        onChange={(e) => setFormulario({...formulario, descricao: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Endereço</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Endereço completo do local..."
                        value={formulario.endereco}
                        onChange={(e) => setFormulario({...formulario, endereco: e.target.value})}
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="ativo"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                        checked={formulario.ativo}
                        onChange={(e) => setFormulario({...formulario, ativo: e.target.checked})}
                      />
                      <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                        Local ativo
                      </label>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={fecharModal}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors duration-200"
                      >
                        {loading ? 'Salvando...' : (localEditando ? 'Atualizar' : 'Criar')}
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
  );
};

export default Locais; 