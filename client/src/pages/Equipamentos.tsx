import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Wrench,
  Filter,
  MapPin,
  Calendar,
  Hash,
  Eye,
  User,
  Clock,
  Building,
  Gauge,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Activity,
  Zap,
  Cog
} from 'lucide-react';
import Tooltip from '../components/Tooltip';

interface Equipamento {
  id: number;
  nome: string;
  codigo?: string;
  descricao?: string;
  local_id: number;
  local_nome?: string;
  tipo?: string;
  fabricante?: string;
  modelo?: string;
  numero_serie?: string;
  data_instalacao?: string;
  status_operacional: 'operando' | 'manutencao' | 'inativo';
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
  total_relatorios?: number;
}

interface Local {
  id: number;
  nome: string;
}

interface FiltrosEquipamento {
  nome: string;
  local_id: string;
  status_operacional: string;
  ativo: string;
  tipo: string;
}

const Equipamentos: React.FC = () => {
  const { usuario, hasPageAccess, hasResourcePermission } = useAuth();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados do modal
  const [modalAberto, setModalAberto] = useState(false);
  const [equipamentoEditando, setEquipamentoEditando] = useState<Equipamento | null>(null);
  const [visualizando, setVisualizando] = useState(false);

  // Estados do formulário
  const [formulario, setFormulario] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    local_id: '',
    tipo: '',
    fabricante: '',
    modelo: '',
    numero_serie: '',
    data_instalacao: '',
    status_operacional: 'operando' as 'operando' | 'manutencao' | 'inativo',
    ativo: true
  });

  // Estados de filtros e paginação modernizados
  const [filtros, setFiltros] = useState<FiltrosEquipamento>({
    nome: '',
    local_id: '',
    status_operacional: '',
    ativo: '',
    tipo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalEquipamentos, setTotalEquipamentos] = useState(0);
  const itemsPerPage = 10;

  const statusOperacional = [
    { value: 'operando', label: 'Operando', cor: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' },
    { value: 'manutencao', label: 'Manutenção', cor: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' },
    { value: 'inativo', label: 'Inativo', cor: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800' }
  ];

  // Memoizar filtros para evitar loops
  const filtrosMemoized = useMemo(() => filtros, [
    filtros.nome,
    filtros.local_id,
    filtros.status_operacional,
    filtros.ativo,
    filtros.tipo
  ]);

  useEffect(() => {
    if (hasPageAccess('equipamentos')) {
      carregarDados();
    }
  }, [paginaAtual, filtrosMemoized]);

  useEffect(() => {
    if (hasPageAccess('equipamentos')) {
      carregarLocais();
    }
  }, []); // Carregar locais apenas uma vez

  const carregarDados = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: paginaAtual.toString(),
        limit: itemsPerPage.toString()
      });

      // Adicionar filtros apenas se tiverem valor
      if (filtros.nome) params.append('search', filtros.nome);
      if (filtros.local_id) params.append('local_id', filtros.local_id);
      if (filtros.status_operacional) params.append('status_operacional', filtros.status_operacional);
      if (filtros.ativo) params.append('ativo', filtros.ativo);
      if (filtros.tipo) params.append('tipo', filtros.tipo);

      const response = await axios.get(`/equipamentos?${params}`);
      
      if (response.data.success) {
        setEquipamentos(response.data.data.equipamentos);
        setTotalPaginas(response.data.data.pagination.pages);
        setTotalEquipamentos(response.data.data.pagination.total);
      }
    } catch (error) {
      setError('Erro ao carregar equipamentos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const carregarLocais = async () => {
    try {
      const response = await axios.get('/locais/simples');
      
      if (response.data.success) {
        setLocais(response.data.data.locais);
      } else {
        setError('Erro ao carregar lista de locais');
      }
    } catch (error: any) {
      console.error('Erro ao carregar locais:', error);
      if (error.response?.status === 401) {
        setError('Sessão expirada. Por favor, faça login novamente.');
      } else {
        setError('Erro ao carregar lista de locais');
      }
    }
  };

  // Funções helper para organização de dados
  const handleFilterChange = (field: string, value: string) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
    setPaginaAtual(1); // Reset para primeira página ao filtrar
  };

  const clearFilters = () => {
    setFiltros({
      nome: '',
      local_id: '',
      status_operacional: '',
      ativo: '',
      tipo: ''
    });
    setPaginaAtual(1);
  };

  const getStatusInfo = (equipamento: Equipamento) => {
    const status = statusOperacional.find(s => s.value === equipamento.status_operacional);
    return status || { value: 'inativo', label: 'Inativo', cor: 'bg-gray-100 text-gray-800' };
  };

  const getEquipmentInfo = (equipamento: Equipamento) => {
    const info = [];
    if (equipamento.tipo) info.push(equipamento.tipo);
    if (equipamento.fabricante) info.push(equipamento.fabricante);
    if (equipamento.modelo) info.push(`Modelo: ${equipamento.modelo}`);
    return info;
  };

  const abrirModal = (equipamentoParaEditar?: Equipamento, somenteVisualizacao = false) => {
    if (equipamentoParaEditar) {
      setEquipamentoEditando(equipamentoParaEditar);
      setFormulario({
        nome: equipamentoParaEditar.nome,
        codigo: equipamentoParaEditar.codigo || '',
        descricao: equipamentoParaEditar.descricao || '',
        local_id: equipamentoParaEditar.local_id.toString(),
        tipo: equipamentoParaEditar.tipo || '',
        fabricante: equipamentoParaEditar.fabricante || '',
        modelo: equipamentoParaEditar.modelo || '',
        numero_serie: equipamentoParaEditar.numero_serie || '',
        data_instalacao: equipamentoParaEditar.data_instalacao || '',
        status_operacional: equipamentoParaEditar.status_operacional,
        ativo: equipamentoParaEditar.ativo
      });
    } else {
      setEquipamentoEditando(null);
      setFormulario({
        nome: '',
        codigo: '',
        descricao: '',
        local_id: '',
        tipo: '',
        fabricante: '',
        modelo: '',
        numero_serie: '',
        data_instalacao: '',
        status_operacional: 'operando',
        ativo: true
      });
    }
    setVisualizando(somenteVisualizacao);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEquipamentoEditando(null);
    setVisualizando(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const dadosFormulario = {
        ...formulario,
        local_id: parseInt(formulario.local_id),
        // Tratar campos opcionais que podem estar vazios
        codigo: formulario.codigo && formulario.codigo.trim() !== '' ? formulario.codigo.trim() : null,
        descricao: formulario.descricao && formulario.descricao.trim() !== '' ? formulario.descricao.trim() : null,
        tipo: formulario.tipo && formulario.tipo.trim() !== '' ? formulario.tipo.trim() : null,
        fabricante: formulario.fabricante && formulario.fabricante.trim() !== '' ? formulario.fabricante.trim() : null,
        modelo: formulario.modelo && formulario.modelo.trim() !== '' ? formulario.modelo.trim() : null,
        numero_serie: formulario.numero_serie && formulario.numero_serie.trim() !== '' ? formulario.numero_serie.trim() : null,
        data_instalacao: formulario.data_instalacao && formulario.data_instalacao.trim() !== '' ? formulario.data_instalacao.trim() : null
      };
      
      if (equipamentoEditando) {
        await axios.put(`/equipamentos/${equipamentoEditando.id}`, dadosFormulario);
        setSuccess('Equipamento atualizado com sucesso!');
      } else {
        await axios.post('/equipamentos', dadosFormulario);
        setSuccess('Equipamento criado com sucesso!');
      }
      
      fecharModal();
      carregarDados();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao salvar equipamento');
    } finally {
      setLoading(false);
    }
  };

  const excluirEquipamento = async (id: number, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja desativar o equipamento "${nome}"?`)) {
      return;
    }

    try {
      await axios.delete(`/equipamentos/${id}`);
      setSuccess('Equipamento desativado com sucesso!');
      carregarDados();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao desativar equipamento');
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getCorStatus = (status: string) => {
    const item = statusOperacional.find(s => s.value === status);
    return item?.cor || 'bg-gray-100 text-gray-800';
  };

  const getLabelStatus = (status: string) => {
    const item = statusOperacional.find(s => s.value === status);
    return item?.label || status;
  };

  if (!hasPageAccess('equipamentos')) {
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
                <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Gestão de Equipamentos
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gerencie equipamentos e suas informações técnicas
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Tooltip content="Filtrar equipamentos">
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
              {hasResourcePermission('equipamentos', 'criar') && (
                <Tooltip content="Novo equipamento">
                  <button
                    onClick={() => abrirModal()}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Equipamento
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Nome, código, tipo..."
                    value={filtros.nome}
                    onChange={(e) => handleFilterChange('nome', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Local
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={filtros.local_id}
                    onChange={(e) => handleFilterChange('local_id', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  >
                    <option value="">Todos os locais</option>
                    {locais.map(local => (
                      <option key={local.id} value={local.id}>
                        {local.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status Operacional
                </label>
                <div className="relative">
                  <Activity className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={filtros.status_operacional}
                    onChange={(e) => handleFilterChange('status_operacional', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  >
                    <option value="">Todos os status</option>
                    {statusOperacional.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filtros.ativo}
                  onChange={(e) => handleFilterChange('ativo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
                Total de equipamentos: <span className="font-semibold text-gray-900 dark:text-gray-100">{totalEquipamentos}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Página {paginaAtual} de {totalPaginas}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {equipamentos.length} equipamentos nesta página
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 transition-colors duration-200">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Carregando equipamentos...</p>
            </div>
          </div>
        ) : equipamentos.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 transition-colors duration-200">
            <div className="text-center">
              <Wrench className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Nenhum equipamento encontrado</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Não há equipamentos cadastrados ou que correspondam aos filtros aplicados.
              </p>
              {hasResourcePermission('equipamentos', 'criar') && (
                <button
                  onClick={() => abrirModal()}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Equipamento
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
                        Equipamento / Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Especificações Técnicas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status / Relatórios
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Localização
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Data Instalação
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {equipamentos.map((equipamento) => {
                      const statusInfo = getStatusInfo(equipamento);
                      const equipmentInfo = getEquipmentInfo(equipamento);
                      
                      return (
                        <tr key={equipamento.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {equipamento.nome}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {equipamento.codigo || 'Sem código'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              {equipmentInfo.length > 0 ? (
                                equipmentInfo.map((info, idx) => (
                                  <div key={idx} className="text-gray-900 dark:text-gray-100">{info}</div>
                                ))
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.cor}`}>
                                {statusInfo.label}
                              </span>
                              <div className="text-xs text-purple-600 dark:text-purple-400">
                                {equipamento.total_relatorios || 0} relatórios
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {equipamento.local_nome}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {equipamento.data_instalacao ? formatarData(equipamento.data_instalacao) : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <Tooltip content="Visualizar">
                                <button
                                  onClick={() => abrirModal(equipamento, true)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </Tooltip>
                              {hasResourcePermission('equipamentos', 'editar') && (
                                <Tooltip content="Editar">
                                  <button
                                    onClick={() => abrirModal(equipamento)}
                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </Tooltip>
                              )}
                              {hasResourcePermission('equipamentos', 'excluir') && (
                                <Tooltip content="Desativar">
                                  <button
                                    onClick={() => excluirEquipamento(equipamento.id, equipamento.nome)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    disabled={!equipamento.ativo}
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
              {equipamentos.map((equipamento) => {
                const statusInfo = getStatusInfo(equipamento);
                const equipmentInfo = getEquipmentInfo(equipamento);
                
                return (
                  <div key={equipamento.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {equipamento.nome}
                        </h3>
                        <p className="text-sm text-gray-600">{equipamento.codigo || 'Sem código'}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.cor}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Cog className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">ESPECIFICAÇÕES</span>
                        </div>
                        <div className="text-sm text-blue-800">
                          {equipmentInfo.length > 0 ? (
                            equipmentInfo.map((info, idx) => (
                              <div key={idx}>{info}</div>
                            ))
                          ) : (
                            <span className="text-blue-600">N/A</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <Activity className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-900">ATIVIDADE</span>
                        </div>
                        <div className="text-sm text-yellow-800">
                          <div>{equipamento.total_relatorios || 0} relatórios</div>
                          {equipamento.data_instalacao && (
                            <div className="text-xs text-yellow-600 mt-1">
                              Inst: {formatarData(equipamento.data_instalacao)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <MapPin className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">LOCALIZAÇÃO</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        {equipamento.local_nome}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                      <Tooltip content="Visualizar">
                        <button
                          onClick={() => abrirModal(equipamento, true)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      {hasResourcePermission('equipamentos', 'editar') && (
                        <Tooltip content="Editar">
                          <button
                            onClick={() => abrirModal(equipamento)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      )}
                      {hasResourcePermission('equipamentos', 'excluir') && (
                        <Tooltip content="Desativar">
                          <button
                            onClick={() => excluirEquipamento(equipamento.id, equipamento.nome)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            disabled={!equipamento.ativo}
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {((paginaAtual - 1) * itemsPerPage) + 1} a {Math.min(paginaAtual * itemsPerPage, totalEquipamentos)} de {totalEquipamentos} resultados
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
                      disabled={paginaAtual === 1}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
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
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Modais existentes mantidos */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {visualizando ? (
                  // Modo visualização com design melhorado
                  <div>
                    {/* Cabeçalho */}
                    <div className="border-b border-gray-200 pb-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Detalhes do Equipamento
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Informações completas do equipamento selecionado
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
                          <Settings className="h-5 w-5 mr-2 text-blue-600" />
                          Identificação
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Nome do Equipamento</dt>
                            <dd className="mt-1 text-lg font-semibold text-blue-900">{equipamentoEditando?.nome}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Código</dt>
                            <dd className="mt-1 text-lg font-semibold text-blue-900">
                              {equipamentoEditando?.codigo || 'Não informado'}
                            </dd>
                          </div>
                          <div className="md:col-span-2">
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Descrição</dt>
                            <dd className="mt-2 text-base text-blue-900 leading-relaxed bg-white p-3 rounded border">
                              {equipamentoEditando?.descricao || 'Nenhuma descrição disponível'}
                            </dd>
                          </div>
                        </div>
                      </div>

                      {/* Localização */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <MapPin className="h-5 w-5 mr-2 text-green-600" />
                          Localização
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Local</dt>
                            <dd className="mt-1 text-lg font-bold text-green-900">
                              {equipamentoEditando?.local_nome}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Tipo</dt>
                            <dd className="mt-1 text-base text-green-900">
                              {equipamentoEditando?.tipo || 'Não informado'}
                            </dd>
                          </div>
                        </div>
                      </div>

                      {/* Especificações Técnicas */}
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Wrench className="h-5 w-5 mr-2 text-yellow-600" />
                          Especificações Técnicas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Fabricante</dt>
                            <dd className="mt-1 text-base text-yellow-900">
                              {equipamentoEditando?.fabricante || 'Não informado'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Modelo</dt>
                            <dd className="mt-1 text-base text-yellow-900">
                              {equipamentoEditando?.modelo || 'Não informado'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Número de Série</dt>
                            <dd className="mt-1 text-base text-yellow-900">
                              {equipamentoEditando?.numero_serie || 'Não informado'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Data de Instalação</dt>
                            <dd className="mt-1 text-base text-yellow-900">
                              {equipamentoEditando?.data_instalacao 
                                ? formatarData(equipamentoEditando.data_instalacao)
                                : 'Não informado'
                              }
                            </dd>
                          </div>
                        </div>
                      </div>

                      {/* Status e Atividade */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Gauge className="h-5 w-5 mr-2 text-purple-600" />
                          Status e Atividade
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Status Operacional</dt>
                            <dd className="mt-1">
                              <span className={`inline-flex items-center px-3 py-2 text-base font-semibold rounded-full ${equipamentoEditando && getCorStatus(equipamentoEditando.status_operacional)}`}>
                                {equipamentoEditando && getLabelStatus(equipamentoEditando.status_operacional)}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Status Geral</dt>
                            <dd className="mt-1">
                              <span className={`inline-flex items-center px-3 py-2 text-base font-semibold rounded-full ${
                                equipamentoEditando?.ativo 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {equipamentoEditando?.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Total de Relatórios</dt>
                            <dd className="mt-1">
                              <span className="inline-flex items-center px-3 py-2 text-base font-semibold rounded-full bg-blue-100 text-blue-800">
                                {equipamentoEditando?.total_relatorios || 0} relatórios
                              </span>
                            </dd>
                          </div>
                        </div>
                      </div>

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
                              {equipamentoEditando && formatarData(equipamentoEditando.data_criacao)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Última Atualização</dt>
                            <dd className="mt-1 text-sm text-gray-600 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {equipamentoEditando && formatarData(equipamentoEditando.data_atualizacao)}
                            </dd>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rodapé com Ações */}
                    <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
                      <div className="flex space-x-2">
                        {hasResourcePermission('equipamentos', 'editar') && (
                          <button
                            onClick={() => setVisualizando(false)}
                            className="btn btn-secondary"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar Equipamento
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
                  // Modo edição/criação (mantém o design original melhorado)
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {equipamentoEditando ? 'Editar Equipamento' : 'Novo Equipamento'}
                      </h3>
                      <button
                        onClick={fecharModal}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Nome do Equipamento *</label>
                          <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="Ex: Compressor de Ar 01"
                            value={formulario.nome}
                            onChange={(e) => setFormulario({...formulario, nome: e.target.value})}
                          />
                        </div>

                        <div>
                          <label className="form-label">Código</label>
                          <div className="relative">
                            <Hash className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                            <input
                              type="text"
                              className="form-input pl-10"
                              placeholder="Ex: COMP-001"
                              value={formulario.codigo}
                              onChange={(e) => setFormulario({...formulario, codigo: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Local *</label>
                        <select
                          required
                          className="form-input"
                          value={formulario.local_id}
                          onChange={(e) => setFormulario({...formulario, local_id: e.target.value})}
                        >
                          <option value="">Selecione um local</option>
                          {locais.map(local => (
                            <option key={local.id} value={local.id}>
                              {local.nome}
                            </option>
                          ))}
                        </select>
                        {locais.length === 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            Carregando locais...
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="form-label">Descrição</label>
                        <textarea
                          rows={3}
                          className="form-input"
                          placeholder="Descrição detalhada do equipamento..."
                          value={formulario.descricao}
                          onChange={(e) => setFormulario({...formulario, descricao: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Tipo</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ex: Compressor, Bomba, Motor"
                            value={formulario.tipo}
                            onChange={(e) => setFormulario({...formulario, tipo: e.target.value})}
                          />
                        </div>

                        <div>
                          <label className="form-label">Status Operacional</label>
                          <select
                            className="form-input"
                            value={formulario.status_operacional}
                            onChange={(e) => setFormulario({...formulario, status_operacional: e.target.value as any})}
                          >
                            {statusOperacional.map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Fabricante</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ex: Atlas Copco"
                            value={formulario.fabricante}
                            onChange={(e) => setFormulario({...formulario, fabricante: e.target.value})}
                          />
                        </div>

                        <div>
                          <label className="form-label">Modelo</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ex: GA 15"
                            value={formulario.modelo}
                            onChange={(e) => setFormulario({...formulario, modelo: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Número de Série</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ex: 123456789"
                            value={formulario.numero_serie}
                            onChange={(e) => setFormulario({...formulario, numero_serie: e.target.value})}
                          />
                        </div>

                        <div>
                          <label className="form-label">Data de Instalação</label>
                          <input
                            type="date"
                            className="form-input"
                            value={formulario.data_instalacao}
                            onChange={(e) => setFormulario({...formulario, data_instalacao: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="ativo"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          checked={formulario.ativo}
                          onChange={(e) => setFormulario({...formulario, ativo: e.target.checked})}
                        />
                        <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
                          Equipamento ativo
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
                          {loading ? 'Salvando...' : (equipamentoEditando ? 'Atualizar' : 'Criar')}
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

export default Equipamentos; 