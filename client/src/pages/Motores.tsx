import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Settings, 
  Eye, 
  AlertTriangle, 
  Upload, 
  Download, 
  FileText,
  Filter,
  Calendar,
  Zap,
  Gauge,
  MapPin,
  Building,
  Cog,
  ChevronLeft,
  ChevronRight,
  Activity,
  Wrench,
  Power,
  X,
  Package,
  Clock
} from 'lucide-react';
import Tooltip from '../components/Tooltip';

interface Motor {
  id: number;
  tag: string;
  equipment: string;
  frame_manufacturer?: string;
  power_kw?: number;
  power_cv?: number;
  rotation?: number;
  rated_current?: number;
  configured_current?: number;
  equipment_type?: string;
  manufacturer?: string;
  stock_reserve?: string;
  location?: string;
  photo?: string;
  storage?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface FiltrosMotor {
  search: string;
  equipment_type: string;
  manufacturer: string;
  location: string;
  ativo: string;
  power_kw_min: string;
  power_kw_max: string;
  power_cv_min: string;
  power_cv_max: string;
  rated_current_min: string;
  rated_current_max: string;
}

interface TiposUnicos {
  tipos: string[];
  fabricantes: string[];
  localizacoes: string[];
}

const Motores: React.FC = () => {
  const { usuario, hasPageAccess, hasResourcePermission } = useAuth();
  const [motores, setMotores] = useState<Motor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados do modal
  const [modalAberto, setModalAberto] = useState(false);
  const [motorEditando, setMotorEditando] = useState<Motor | null>(null);
  const [modalVisualizacao, setModalVisualizacao] = useState(false);
  const [motorVisualizando, setMotorVisualizando] = useState<Motor | null>(null);

  // Estados da importação CSV
  const [modalImportacao, setModalImportacao] = useState(false);
  const [arquivoCSV, setArquivoCSV] = useState<File | null>(null);
  const [importandoCSV, setImportandoCSV] = useState(false);
  const [resultadoImportacao, setResultadoImportacao] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do formulário
  const [formulario, setFormulario] = useState({
    tag: '',
    equipment: '',
    frame_manufacturer: '',
    power_kw: '',
    power_cv: '',
    rotation: '',
    rated_current: '',
    configured_current: '',
    equipment_type: '',
    manufacturer: '',
    stock_reserve: '',
    location: '',
    storage: '',
    ativo: true
  });

  // Estados de filtros e paginação
  const [filtros, setFiltros] = useState<FiltrosMotor>({
    search: '',
    equipment_type: '',
    manufacturer: '',
    location: '',
    ativo: '',
    power_kw_min: '',
    power_kw_max: '',
    power_cv_min: '',
    power_cv_max: '',
    rated_current_min: '',
    rated_current_max: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalMotores, setTotalMotores] = useState(0);
  const [tiposUnicos, setTiposUnicos] = useState<TiposUnicos>({
    tipos: [],
    fabricantes: [],
    localizacoes: []
  });
  const itemsPerPage = 10;

  // Memoizar filtros para evitar loops
  const filtrosMemoized = useMemo(() => filtros, [
    filtros.search,
    filtros.equipment_type,
    filtros.manufacturer,
    filtros.location,
    filtros.ativo,
    filtros.power_kw_min,
    filtros.power_kw_max,
    filtros.power_cv_min,
    filtros.power_cv_max,
    filtros.rated_current_min,
    filtros.rated_current_max
  ]);

  useEffect(() => {
    if (hasPageAccess('motores')) {
      carregarDados();
      carregarTiposUnicos();
    }
  }, [paginaAtual, filtrosMemoized]); // Usar apenas hasPageAccess

  const carregarDados = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: paginaAtual.toString(),
        limit: itemsPerPage.toString()
      });

      // Adicionar filtros apenas se tiverem valor
      if (filtros.search) params.append('search', filtros.search);
      if (filtros.equipment_type) params.append('equipment_type', filtros.equipment_type);
      if (filtros.manufacturer) params.append('manufacturer', filtros.manufacturer);
      if (filtros.location) params.append('location', filtros.location);
      if (filtros.ativo) params.append('ativo', filtros.ativo);
      if (filtros.power_kw_min) params.append('power_kw_min', filtros.power_kw_min);
      if (filtros.power_kw_max) params.append('power_kw_max', filtros.power_kw_max);
      if (filtros.power_cv_min) params.append('power_cv_min', filtros.power_cv_min);
      if (filtros.power_cv_max) params.append('power_cv_max', filtros.power_cv_max);
      if (filtros.rated_current_min) params.append('rated_current_min', filtros.rated_current_min);
      if (filtros.rated_current_max) params.append('rated_current_max', filtros.rated_current_max);

      const response = await axios.get(`/motores?${params}`);
      
      if (response.data.success) {
        setMotores(response.data.data.motores);
        setTotalPaginas(response.data.data.pagination.pages);
        setTotalMotores(response.data.data.pagination.total);
      }
    } catch (error) {
      setError('Erro ao carregar motores');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const carregarTiposUnicos = async () => {
    try {
      const response = await axios.get('/motores/tipos/unicos');
      if (response.data.success) {
        setTiposUnicos(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar tipos únicos:', error);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
    setPaginaAtual(1); // Reset para primeira página ao filtrar
  };

  const clearFilters = () => {
    setFiltros({
      search: '',
      equipment_type: '',
      manufacturer: '',
      location: '',
      ativo: '',
      power_kw_min: '',
      power_kw_max: '',
      power_cv_min: '',
      power_cv_max: '',
      rated_current_min: '',
      rated_current_max: ''
    });
    setPaginaAtual(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para obter informações de potência formatadas
  const getPowerInfo = (motor: Motor) => {
    const power = [];
    if (motor.power_kw) power.push(`${motor.power_kw} kW`);
    if (motor.power_cv) power.push(`${motor.power_cv} CV`);
    if (motor.rotation) power.push(`${motor.rotation} RPM`);
    return power;
  };

  // Função para obter informações de corrente formatadas
  const getCurrentInfo = (motor: Motor) => {
    const current = [];
    if (motor.rated_current) current.push(`Nominal: ${motor.rated_current}A`);
    if (motor.configured_current) current.push(`Config: ${motor.configured_current}A`);
    return current;
  };

  const abrirModal = (motor?: Motor) => {
    if (motor) {
      setMotorEditando(motor);
      setFormulario({
        tag: motor.tag || '',
        equipment: motor.equipment || '',
        frame_manufacturer: motor.frame_manufacturer || '',
        power_kw: motor.power_kw?.toString() || '',
        power_cv: motor.power_cv?.toString() || '',
        rotation: motor.rotation?.toString() || '',
        rated_current: motor.rated_current?.toString() || '',
        configured_current: motor.configured_current?.toString() || '',
        equipment_type: motor.equipment_type || '',
        manufacturer: motor.manufacturer || '',
        stock_reserve: motor.stock_reserve || '',
        location: motor.location || '',
        storage: motor.storage || '',
        ativo: motor.ativo
      });
    } else {
      setMotorEditando(null);
      setFormulario({
        tag: '',
        equipment: '',
        frame_manufacturer: '',
        power_kw: '',
        power_cv: '',
        rotation: '',
        rated_current: '',
        configured_current: '',
        equipment_type: '',
        manufacturer: '',
        stock_reserve: '',
        location: '',
        storage: '',
        ativo: true
      });
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setMotorEditando(null);
    setError('');
  };

  const abrirVisualizacao = (motor: Motor) => {
    setMotorVisualizando(motor);
    setModalVisualizacao(true);
  };

  const fecharVisualizacao = () => {
    setModalVisualizacao(false);
    setMotorVisualizando(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const dadosFormulario = {
        ...formulario,
        power_kw: formulario.power_kw && formulario.power_kw.trim() !== '' ? parseFloat(formulario.power_kw) : null,
        power_cv: formulario.power_cv && formulario.power_cv.trim() !== '' ? parseFloat(formulario.power_cv) : null,
        rotation: formulario.rotation && formulario.rotation.trim() !== '' ? parseInt(formulario.rotation) : null,
        rated_current: formulario.rated_current && formulario.rated_current.trim() !== '' ? parseFloat(formulario.rated_current) : null,
        configured_current: formulario.configured_current && formulario.configured_current.trim() !== '' ? parseFloat(formulario.configured_current) : null,
      };

      if (motorEditando) {
        await axios.put(`/motores/${motorEditando.id}`, dadosFormulario);
        setSuccess('Motor atualizado com sucesso!');
      } else {
        await axios.post('/motores', dadosFormulario);
        setSuccess('Motor criado com sucesso!');
      }

      fecharModal();
      carregarDados();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao salvar motor');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja desativar este motor?')) return;
    
    try {
      await axios.delete(`/motores/${id}`);
      setSuccess('Motor desativado com sucesso!');
      carregarDados();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao desativar motor');
      setTimeout(() => setError(''), 3000);
    }
  };

  const aplicarFiltros = () => {
    setPaginaAtual(1);
    carregarDados();
  };

  const limparFiltros = () => {
    clearFilters();
    carregarDados();
  };

  const downloadTemplate = async () => {
    try {
      const response = await axios.get('/motores/csv-template', {
        responseType: 'blob', // Para receber o arquivo como blob
      });

      // Criar URL do blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Criar elemento de link temporário para download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template-motores.csv');
      
      // Adicionar ao DOM, clicar e remover
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Limpar URL do blob
      window.URL.revokeObjectURL(url);
      
      setSuccess('Template CSV baixado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Erro ao baixar template:', error);
      setError('Erro ao baixar template CSV');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setArquivoCSV(file);
    } else {
      setError('Por favor, selecione um arquivo CSV válido');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleImportarCSV = async () => {
    if (!arquivoCSV) {
      setError('Selecione um arquivo CSV');
      return;
    }

    try {
      setImportandoCSV(true);
      const formData = new FormData();
      formData.append('csv', arquivoCSV);

      const response = await axios.post('/motores/importar-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setResultadoImportacao(response.data.data);
        setSuccess(`Importação concluída! ${response.data.data.sucessos} motores importados.`);
        carregarDados();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao importar CSV');
    } finally {
      setImportandoCSV(false);
      setTimeout(() => setSuccess(''), 5000);
    }
  };

  if (!hasPageAccess('motores')) {
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
                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Gestão de Motores
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gerencie informações técnicas dos motores elétricos
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Tooltip content="Filtrar motores">
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
              <Tooltip content="Importar CSV">
                <button
                  onClick={() => setModalImportacao(true)}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar CSV
                </button>
              </Tooltip>
              {hasResourcePermission('motores', 'criar') && (
                <button
                  onClick={() => abrirModal()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  Novo Motor
                </button>
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
                    placeholder="Tag, equipamento, fabricante..."
                    value={filtros.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Equipamento
                </label>
                <div className="relative">
                  <Cog className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={filtros.equipment_type}
                    onChange={(e) => handleFilterChange('equipment_type', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Todos os tipos</option>
                    {tiposUnicos.tipos.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fabricante
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={filtros.manufacturer}
                    onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Todos os fabricantes</option>
                    {tiposUnicos.fabricantes.map(fabricante => (
                      <option key={fabricante} value={fabricante}>{fabricante}</option>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Todos</option>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Filtros de Potência kW */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Potência (kW)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Mín"
                    value={filtros.power_kw_min}
                    onChange={(e) => handleFilterChange('power_kw_min', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Máx"
                    value={filtros.power_kw_max}
                    onChange={(e) => handleFilterChange('power_kw_max', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Filtros de Potência CV */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Potência (CV)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Mín"
                    value={filtros.power_cv_min}
                    onChange={(e) => handleFilterChange('power_cv_min', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Máx"
                    value={filtros.power_cv_max}
                    onChange={(e) => handleFilterChange('power_cv_max', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Filtros de Corrente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Corrente Nominal (A)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Mín"
                    value={filtros.rated_current_min}
                    onChange={(e) => handleFilterChange('rated_current_min', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Máx"
                    value={filtros.rated_current_max}
                    onChange={(e) => handleFilterChange('rated_current_max', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={aplicarFiltros}
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
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors text-sm font-medium"
                  title="Baixar template CSV"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Template CSV
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
                Total de motores: <span className="font-semibold text-gray-900 dark:text-gray-100">{totalMotores}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Página {paginaAtual} de {totalPaginas}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {motores.length} motores nesta página
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 transition-colors duration-200">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Carregando motores...</p>
            </div>
          </div>
        ) : motores.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 transition-colors duration-200">
            <div className="text-center">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Nenhum motor encontrado</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Não há motores cadastrados ou que correspondam aos filtros aplicados.
              </p>
              {hasResourcePermission('motores', 'criar') && (
                <button
                  onClick={() => abrirModal()}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Motor
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
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Motor / Equipamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Especificações de Potência
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Corrente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Localização
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {motores.map((motor) => {
                      const powerInfo = getPowerInfo(motor);
                      const currentInfo = getCurrentInfo(motor);
                      
                      return (
                        <tr key={motor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {motor.tag || '-'}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {motor.equipment || '-'}
                              </div>
                              {motor.manufacturer && (
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  {motor.manufacturer}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              {powerInfo.length > 0 ? (
                                powerInfo.map((info, idx) => (
                                  <div key={idx} className="text-gray-900 dark:text-gray-100">{info}</div>
                                ))
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              {currentInfo.length > 0 ? (
                                currentInfo.map((info, idx) => (
                                  <div key={idx} className="text-gray-900 dark:text-gray-100">{info}</div>
                                ))
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="text-gray-900 dark:text-gray-100">
                                {motor.location || 'N/A'}
                              </div>
                              {motor.equipment_type && (
                                <div className="text-gray-600 dark:text-gray-400">
                                  {motor.equipment_type}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              motor.ativo
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                            }`}>
                              {motor.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <Tooltip content="Visualizar">
                                <button
                                  onClick={() => abrirVisualizacao(motor)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </Tooltip>
                              {hasResourcePermission('motores', 'editar') && (
                                <Tooltip content="Editar">
                                  <button
                                    onClick={() => abrirModal(motor)}
                                    className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                </Tooltip>
                              )}
                              {hasResourcePermission('motores', 'excluir') && (
                                <Tooltip content="Desativar">
                                  <button
                                    onClick={() => handleDelete(motor.id)}
                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    disabled={!motor.ativo}
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
              {motores.map((motor) => (
                <div key={motor.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {motor.tag}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{motor.equipment}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      motor.ativo 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                      {motor.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">POTÊNCIA</span>
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        {motor.power_kw ? `${motor.power_kw} kW` : 'N/A'}
                        {motor.power_cv && (
                          <div className="text-xs">{motor.power_cv} CV</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-900 dark:text-yellow-300">CORRENTE</span>
                      </div>
                      <div className="text-sm text-yellow-800 dark:text-yellow-300">
                        {motor.rated_current ? `${motor.rated_current}A` : 'N/A'}
                        {motor.configured_current && (
                          <div className="text-xs">Config: {motor.configured_current}A</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Gauge className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-300">ROTAÇÃO</span>
                      </div>
                      <div className="text-sm text-green-800 dark:text-green-300">
                        {motor.rotation ? `${motor.rotation} RPM` : 'N/A'}
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-purple-900 dark:text-purple-300">LOCAL</span>
                      </div>
                      <div className="text-sm text-purple-800 dark:text-purple-300">
                        {motor.location || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {(motor.manufacturer || motor.equipment_type) && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <Building className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">ESPECIFICAÇÕES</span>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {motor.manufacturer && <div>Fabricante: {motor.manufacturer}</div>}
                        {motor.equipment_type && <div>Tipo: {motor.equipment_type}</div>}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Tooltip content="Visualizar">
                      <button
                        onClick={() => abrirVisualizacao(motor)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    {hasResourcePermission('motores', 'editar') && (
                      <Tooltip content="Editar">
                        <button
                          onClick={() => abrirModal(motor)}
                          className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    )}
                    {hasResourcePermission('motores', 'excluir') && (
                      <Tooltip content="Desativar">
                        <button
                          onClick={() => handleDelete(motor.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          disabled={!motor.ativo}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {((paginaAtual - 1) * itemsPerPage) + 1} a {Math.min(paginaAtual * itemsPerPage, totalMotores)} de {totalMotores} resultados
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

        {/* Modal de Formulário */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-200">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {motorEditando ? 'Editar Motor' : 'Novo Motor'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tag */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tag *
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.tag}
                        onChange={(e) => setFormulario({...formulario, tag: e.target.value})}
                        required
                      />
                    </div>

                    {/* Equipamento */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Equipamento *
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.equipment}
                        onChange={(e) => setFormulario({...formulario, equipment: e.target.value})}
                        required
                      />
                    </div>

                    {/* Fabricante da Estrutura */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fabricante da Estrutura
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.frame_manufacturer}
                        onChange={(e) => setFormulario({...formulario, frame_manufacturer: e.target.value})}
                      />
                    </div>

                    {/* Fabricante */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fabricante
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.manufacturer}
                        onChange={(e) => setFormulario({...formulario, manufacturer: e.target.value})}
                      />
                    </div>

                    {/* Potência kW */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Potência (kW)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.power_kw}
                        onChange={(e) => setFormulario({...formulario, power_kw: e.target.value})}
                      />
                    </div>

                    {/* Potência CV */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Potência (CV)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.power_cv}
                        onChange={(e) => setFormulario({...formulario, power_cv: e.target.value})}
                      />
                    </div>

                    {/* Rotação */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Rotação (RPM)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.rotation}
                        onChange={(e) => setFormulario({...formulario, rotation: e.target.value})}
                      />
                    </div>

                    {/* Corrente Nominal */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Corrente Nominal (A)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.rated_current}
                        onChange={(e) => setFormulario({...formulario, rated_current: e.target.value})}
                      />
                    </div>

                    {/* Corrente Configurada */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Corrente Configurada (A)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.configured_current}
                        onChange={(e) => setFormulario({...formulario, configured_current: e.target.value})}
                      />
                    </div>

                    {/* Tipo de Equipamento */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tipo de Equipamento
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.equipment_type}
                        onChange={(e) => setFormulario({...formulario, equipment_type: e.target.value})}
                      />
                    </div>

                    {/* Localização */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Localização
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.location}
                        onChange={(e) => setFormulario({...formulario, location: e.target.value})}
                      />
                    </div>

                    {/* Reserva de Estoque */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Reserva de Estoque
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.stock_reserve}
                        onChange={(e) => setFormulario({...formulario, stock_reserve: e.target.value})}
                      />
                    </div>

                    {/* Armazenamento */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Armazenamento
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        value={formulario.storage}
                        onChange={(e) => setFormulario({...formulario, storage: e.target.value})}
                      />
                    </div>

                    {/* Status Ativo */}
                    <div className="md:col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-800"
                          checked={formulario.ativo}
                          onChange={(e) => setFormulario({...formulario, ativo: e.target.checked})}
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Motor ativo</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={fecharModal}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : (motorEditando ? 'Atualizar' : 'Criar')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Visualização */}
        {modalVisualizacao && motorVisualizando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-200">
              <div className="p-6">
                {/* Cabeçalho */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Detalhes do Motor
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Informações completas do motor selecionado
                      </p>
                    </div>
                    <button
                      onClick={fecharVisualizacao}
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
                      <Settings className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                      Identificação
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Tag do Motor</dt>
                        <dd className="mt-1 text-lg font-semibold text-blue-900 dark:text-blue-300">{motorVisualizando.tag}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Equipamento</dt>
                        <dd className="mt-1 text-lg font-semibold text-blue-900 dark:text-blue-300">
                          {motorVisualizando.equipment || 'Não informado'}
                        </dd>
                      </div>
                      <div className="md:col-span-2">
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Status</dt>
                        <dd className="mt-1">
                          <span className={`inline-flex items-center px-3 py-2 text-base font-semibold rounded-full ${
                            motorVisualizando.ativo 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}>
                            {motorVisualizando.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Especificações Técnicas */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <Wrench className="h-5 w-5 mr-2 text-yellow-600 dark:text-yellow-400" />
                      Especificações Técnicas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Potência (kW)</dt>
                        <dd className="mt-1 text-base text-yellow-900 dark:text-yellow-300">
                          {motorVisualizando.power_kw ? `${motorVisualizando.power_kw} kW` : 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Potência (CV)</dt>
                        <dd className="mt-1 text-base text-yellow-900 dark:text-yellow-300">
                          {motorVisualizando.power_cv ? `${motorVisualizando.power_cv} CV` : 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Rotação</dt>
                        <dd className="mt-1 text-base text-yellow-900 dark:text-yellow-300">
                          {motorVisualizando.rotation ? `${motorVisualizando.rotation} RPM` : 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Corrente Nominal</dt>
                        <dd className="mt-1 text-base text-yellow-900 dark:text-yellow-300">
                          {motorVisualizando.rated_current ? `${motorVisualizando.rated_current}A` : 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Corrente Configurada</dt>
                        <dd className="mt-1 text-base text-yellow-900 dark:text-yellow-300">
                          {motorVisualizando.configured_current ? `${motorVisualizando.configured_current}A` : 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Fabricante da Estrutura</dt>
                        <dd className="mt-1 text-base text-yellow-900 dark:text-yellow-300">
                          {motorVisualizando.frame_manufacturer || 'Não informado'}
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Localização e Tipo */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                      Localização e Classificação
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Localização</dt>
                        <dd className="mt-1 text-base text-green-900 dark:text-green-300">
                          {motorVisualizando.location || 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Armazenamento</dt>
                        <dd className="mt-1 text-base text-green-900 dark:text-green-300">
                          {motorVisualizando.storage || 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Tipo de Equipamento</dt>
                        <dd className="mt-1 text-base text-green-900 dark:text-green-300">
                          {motorVisualizando.equipment_type || 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Fabricante</dt>
                        <dd className="mt-1 text-base text-green-900 dark:text-green-300">
                          {motorVisualizando.manufacturer || 'Não informado'}
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Estoque e Reserva */}
                  {motorVisualizando.stock_reserve && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                        <Package className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                        Estoque e Reserva
                      </h3>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Reserva de Estoque</dt>
                        <dd className="mt-2 text-base text-purple-900 dark:text-purple-300 leading-relaxed bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                          {motorVisualizando.stock_reserve}
                        </dd>
                      </div>
                    </div>
                  )}

                  {/* Informações do Sistema */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
                      Informações do Sistema
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Data de Criação</dt>
                        <dd className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatDate(motorVisualizando.created_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Última Atualização</dt>
                        <dd className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatDate(motorVisualizando.updated_at)}
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé com Ações */}
                <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <div className="flex space-x-2">
                    {hasResourcePermission('motores', 'editar') && (
                      <button
                        onClick={() => {
                          fecharVisualizacao();
                          abrirModal(motorVisualizando);
                        }}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar Motor
                      </button>
                    )}
                  </div>
                  <button
                    onClick={fecharVisualizacao}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Importação CSV */}
        {modalImportacao && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Importar Motores via CSV
                  </h2>
                  <button
                    onClick={() => setModalImportacao(false)}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {!resultadoImportacao ? (
                  <>
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                        <FileText className="h-4 w-4 inline mr-1" />
                        Instruções de Importação
                      </h3>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        <li>• Baixe o template CSV clicando no botão "Baixar Template"</li>
                        <li>• Preencha os dados seguindo o formato do template</li>
                        <li>• Campos obrigatórios: <strong>tag</strong> e <strong>equipment</strong></li>
                        <li>• Tags devem ser únicas dentro da sua organização</li>
                        <li>• Valores numéricos devem usar ponto (.) como separador decimal</li>
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <button
                          onClick={downloadTemplate}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mb-4"
                        >
                          <Download className="h-4 w-4 mr-2 inline" />
                          Baixar Template CSV
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Selecionar Arquivo CSV
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleFileSelect}
                          className="block w-full text-sm text-gray-500 dark:text-gray-400
                                   file:mr-4 file:py-2 file:px-4
                                   file:rounded-md file:border-0
                                   file:text-sm file:font-medium
                                   file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-300
                                   hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                        />
                      </div>

                      {arquivoCSV && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Arquivo selecionado: <strong>{arquivoCSV.name}</strong>
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Tamanho: {(arquivoCSV.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-6">
                      <button
                        type="button"
                        onClick={() => setModalImportacao(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        disabled={importandoCSV}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleImportarCSV}
                        disabled={!arquivoCSV || importandoCSV}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {importandoCSV ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                            Importando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2 inline" />
                            Importar CSV
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Resultados da Importação */}
                    <div className="space-y-4">
                      {resultadoImportacao.success ? (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                          <h3 className="text-lg font-medium text-green-800 dark:text-green-300 mb-2">
                            ✅ Importação Concluída!
                          </h3>
                          <div className="text-sm text-green-700 dark:text-green-300">
                            <p><strong>Total de registros:</strong> {resultadoImportacao.statistics?.total || 0}</p>
                            <p><strong>Importados com sucesso:</strong> {resultadoImportacao.statistics?.imported || 0}</p>
                            {resultadoImportacao.statistics?.failed > 0 && (
                              <p><strong>Falhas:</strong> {resultadoImportacao.statistics.failed}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                          <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">
                            ❌ Erro na Importação
                          </h3>
                          <p className="text-sm text-red-700 dark:text-red-300 mb-3">{resultadoImportacao.message}</p>
                          
                          {resultadoImportacao.errors && (
                            <div>
                              <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Erros encontrados:</h4>
                              <div className="max-h-40 overflow-y-auto">
                                {resultadoImportacao.errors.map((erro: any, index: number) => (
                                  <div key={index} className="text-xs text-red-600 dark:text-red-400 mb-1 p-2 bg-red-100 dark:bg-red-900/30 rounded">
                                    <strong>Linha {erro.linha}:</strong> {erro.erro}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => {
                          setModalImportacao(false);
                          setResultadoImportacao(null);
                          setArquivoCSV(null);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Motores; 