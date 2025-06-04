import React, { useState, useEffect, useMemo } from 'react';
import { 
    Filter, 
    Plus, 
    Eye, 
    Edit2, 
    UserX,
    ChevronLeft,
    ChevronRight,
    Activity,
    Calendar,
    User,
    Settings,
    Gauge,
    Thermometer,
    Zap,
    AlertTriangle,
    Search,
    FileText,
    Trash2
} from 'lucide-react';
import Modal from '../components/Modal';
import Tooltip from '../components/Tooltip';
import { useAuth } from '../contexts/AuthContext';
import api, { API_BASE_URL } from '../config/api';

interface GeradorInspecao {
    id: number;
    data: string;
    colaborador: string;
    nivel_oleo: string;
    nivel_agua: string;
    tensao_sync_gerador: number;
    tensao_sync_rede: number;
    temp_agua: number;
    pressao_oleo: number;
    frequencia: number;
    tensao_a: number;
    tensao_b: number;
    tensao_c: number;
    rpm: number;
    tensao_bateria: number;
    tensao_alternador: number;
    combustivel_50: 'Sim' | 'Não';
    iluminacao_sala: 'Sim' | 'Não';
    observacao: string;
    ativo: boolean;
    criado_em: string;
    atualizado_em: string;
    usuario_nome?: string;
}

interface Filters {
    search: string;
    data_inspecao: string;
    ativo: string;
}

const GeradorInspecoes: React.FC = () => {
    const { usuario, hasPageAccess, hasResourcePermission } = useAuth();
    const [inspecoes, setInspecoes] = useState<GeradorInspecao[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
    const [selectedInspecao, setSelectedInspecao] = useState<GeradorInspecao | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    
    // Estados de filtros
    const [filters, setFilters] = useState<Filters>({
        search: '',
        data_inspecao: '',
        ativo: ''
    });
    
    // Estados de paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 10;

    // Formulário
    const [formData, setFormData] = useState<Partial<GeradorInspecao>>({
        data: '',
        colaborador: '',
        nivel_oleo: '',
        nivel_agua: '',
        tensao_sync_gerador: 0,
        tensao_sync_rede: 0,
        temp_agua: 0,
        pressao_oleo: 0,
        frequencia: 0,
        tensao_a: 0,
        tensao_b: 0,
        tensao_c: 0,
        rpm: 0,
        tensao_bateria: 0,
        tensao_alternador: 0,
        combustivel_50: 'Não',
        iluminacao_sala: 'Não',
        observacao: '',
        ativo: true
    });

    // Memoizar filtros para evitar loops
    const filtrosMemoized = useMemo(() => filters, [filters.search, filters.data_inspecao, filters.ativo]);

    useEffect(() => {
        if (hasPageAccess('gerador-inspecoes')) {
            fetchInspecoes();
        }
    }, [currentPage, filtrosMemoized, hasPageAccess]);

    const fetchInspecoes = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                ...(filters.search && { search: filters.search }),
                ...(filters.data_inspecao && { data_inspecao: filters.data_inspecao }),
                ...(filters.ativo && { ativo: filters.ativo })
            });

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/gerador-inspecoes?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Erro ao buscar inspeções');

            const data = await response.json();
            setInspecoes(data.inspecoes || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotalItems(data.pagination?.totalItems || 0);
        } catch (err) {
            setError('Erro ao carregar inspeções do gerador');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = modalMode === 'create' 
                ? `${API_BASE_URL}/gerador-inspecoes`
                : `${API_BASE_URL}/gerador-inspecoes/${selectedInspecao?.id}`;
            
            const method = modalMode === 'create' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Erro ao salvar inspeção');

            await fetchInspecoes();
            setModalOpen(false);
            resetForm();
        } catch (err) {
            setError('Erro ao salvar inspeção do gerador');
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Tem certeza que deseja desativar esta inspeção?')) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/gerador-inspecoes/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Erro ao desativar inspeção');

            await fetchInspecoes();
        } catch (err) {
            setError('Erro ao desativar inspeção do gerador');
            console.error(err);
        }
    };

    const openModal = (mode: 'view' | 'edit' | 'create', inspecao?: GeradorInspecao) => {
        setModalMode(mode);
        setSelectedInspecao(inspecao || null);
        
        if (mode === 'create') {
            resetForm();
        } else if (inspecao) {
            const formDataToSet = {
                data: inspecao.data?.split('T')[0] || '',
                colaborador: inspecao.colaborador || '',
                nivel_oleo: inspecao.nivel_oleo || '',
                nivel_agua: inspecao.nivel_agua || '',
                tensao_sync_gerador: inspecao.tensao_sync_gerador || 0,
                tensao_sync_rede: inspecao.tensao_sync_rede || 0,
                temp_agua: inspecao.temp_agua || 0,
                pressao_oleo: inspecao.pressao_oleo || 0,
                frequencia: inspecao.frequencia || 0,
                tensao_a: inspecao.tensao_a || 0,
                tensao_b: inspecao.tensao_b || 0,
                tensao_c: inspecao.tensao_c || 0,
                rpm: inspecao.rpm || 0,
                tensao_bateria: inspecao.tensao_bateria || 0,
                tensao_alternador: inspecao.tensao_alternador || 0,
                combustivel_50: inspecao.combustivel_50 || 'Não',
                iluminacao_sala: inspecao.iluminacao_sala || 'Não',
                observacao: inspecao.observacao || '',
                ativo: inspecao.ativo
            };
            setFormData(formDataToSet);
        }
        
        setModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            data: '',
            colaborador: usuario?.nome || '',
            nivel_oleo: '',
            nivel_agua: '',
            tensao_sync_gerador: 0,
            tensao_sync_rede: 0,
            temp_agua: 0,
            pressao_oleo: 0,
            frequencia: 0,
            tensao_a: 0,
            tensao_b: 0,
            tensao_c: 0,
            rpm: 0,
            tensao_bateria: 0,
            tensao_alternador: 0,
            combustivel_50: 'Não',
            iluminacao_sala: 'Não',
            observacao: '',
            ativo: true
        });
    };

    const handleFilterChange = (key: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({ search: '', data_inspecao: '', ativo: '' });
        setCurrentPage(1);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    // Verificar permissões usando sistema granular
    if (!hasPageAccess('gerador-inspecoes')) {
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                                    Inspeções de Gerador
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Gerencie inspeções e manutenções dos geradores
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                            <Tooltip content="Filtrar inspeções">
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
                            {hasResourcePermission('gerador-inspecoes', 'criar') && (
                                <Tooltip content="Nova inspeção">
                                    <button
                                        onClick={() => openModal('create')}
                                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Nova Inspeção
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                {showFilters && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Buscar
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por gerador, data, observações..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Data da Inspeção
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="date"
                                        value={filters.data_inspecao}
                                        onChange={(e) => handleFilterChange('data_inspecao', e.target.value)}
                                        className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Status
                                </label>
                                <select
                                    value={filters.ativo}
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
                                    onClick={fetchInspecoes}
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

                {/* Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Total de inspeções: <span className="font-semibold text-gray-900 dark:text-gray-100">{totalItems}</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Página {currentPage} de {totalPages}
                            </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {inspecoes.length} inspeções nesta página
                        </div>
                    </div>
                </div>

                {/* Tabela Desktop */}
                <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Data / Colaborador
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Níveis
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Tensões
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Outros
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
                                {inspecoes.map((inspecao) => (
                                    <tr key={inspecao.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {formatDate(inspecao.data)}
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    {inspecao.colaborador}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="text-gray-900 dark:text-gray-100">Óleo: {inspecao.nivel_oleo}</div>
                                                <div className="text-gray-600 dark:text-gray-400">Água: {inspecao.nivel_agua}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="text-gray-900 dark:text-gray-100">Ger: {inspecao.tensao_sync_gerador}V</div>
                                                <div className="text-gray-600 dark:text-gray-400">Rede: {inspecao.tensao_sync_rede}V</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <div className="text-gray-900 dark:text-gray-100">RPM: {inspecao.rpm}</div>
                                                <div className="text-gray-600 dark:text-gray-400">Freq: {inspecao.frequencia}Hz</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                inspecao.ativo
                                                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                                                    : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                                            }`}>
                                                {inspecao.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Tooltip content="Visualizar">
                                                    <button
                                                        onClick={() => openModal('view', inspecao)}
                                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </Tooltip>
                                                {hasResourcePermission('gerador-inspecoes', 'editar') && (
                                                    <Tooltip content="Editar">
                                                        <button
                                                            onClick={() => openModal('edit', inspecao)}
                                                            className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {hasResourcePermission('gerador-inspecoes', 'excluir') && (
                                                    <Tooltip content="Desativar">
                                                        <button
                                                            onClick={() => handleDelete(inspecao.id)}
                                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            disabled={!inspecao.ativo}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </Tooltip>
                                                )}
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
                    {inspecoes.map((inspecao) => (
                        <div key={inspecao.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {formatDate(inspecao.data)}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{inspecao.colaborador}</p>
                                </div>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    inspecao.ativo
                                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                                        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                                }`}>
                                    {inspecao.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Níveis</span>
                                    </div>
                                    <div className="text-sm text-blue-800 dark:text-blue-300">
                                        <div>Óleo: {inspecao.nivel_oleo}</div>
                                        <div>Água: {inspecao.nivel_agua}</div>
                                    </div>
                                </div>
                                
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                        <span className="text-sm font-medium text-yellow-900 dark:text-yellow-300">Tensões</span>
                                    </div>
                                    <div className="text-sm text-yellow-800 dark:text-yellow-300">
                                        <div>Gerador: {inspecao.tensao_sync_gerador}V</div>
                                        <div>Rede: {inspecao.tensao_sync_rede}V</div>
                                    </div>
                                </div>
                                
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Gauge className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span className="text-sm font-medium text-green-900 dark:text-green-300">Medições</span>
                                    </div>
                                    <div className="text-sm text-green-800 dark:text-green-300">
                                        <div>RPM: {inspecao.rpm}</div>
                                        <div>Freq: {inspecao.frequencia}Hz</div>
                                    </div>
                                </div>
                                
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Thermometer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                        <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Condições</span>
                                    </div>
                                    <div className="text-sm text-purple-800 dark:text-purple-300">
                                        <div>Temp: {inspecao.temp_agua}°C</div>
                                        <div>Pressão: {inspecao.pressao_oleo} bar</div>
                                    </div>
                                </div>
                            </div>
                            
                            {inspecao.observacao && (
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações:</div>
                                    <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{inspecao.observacao}</div>
                                </div>
                            )}
                            
                            <div className="flex justify-end space-x-2">
                                <Tooltip content="Visualizar">
                                    <button
                                        onClick={() => openModal('view', inspecao)}
                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </Tooltip>
                                {hasResourcePermission('gerador-inspecoes', 'editar') && (
                                    <Tooltip content="Editar">
                                        <button
                                            onClick={() => openModal('edit', inspecao)}
                                            className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                    </Tooltip>
                                )}
                                {hasResourcePermission('gerador-inspecoes', 'excluir') && (
                                    <Tooltip content="Desativar">
                                        <button
                                            onClick={() => handleDelete(inspecao.id)}
                                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            disabled={!inspecao.ativo}
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
                {totalPages > 1 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} resultados
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Anterior
                                </button>
                                
                                <div className="flex items-center space-x-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                    currentPage === pageNum
                                                        ? 'bg-blue-600 text-white'
                                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Próxima
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={
                        modalMode === 'create' 
                            ? 'Nova Inspeção do Gerador'
                            : modalMode === 'edit'
                            ? 'Editar Inspeção do Gerador'
                            : 'Detalhes da Inspeção do Gerador'
                    }
                >
                    {modalMode === 'view' ? (
                        // Modo Visualização
                        <div className="space-y-6">
                            {/* Resumo da Inspeção */}
                            {selectedInspecao && (
                                <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-6 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold mb-2">Resumo da Inspeção</h2>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <div className="font-medium opacity-90">Data</div>
                                                    <div className="text-lg font-bold">{formatDate(selectedInspecao.data)}</div>
                                                </div>
                                                <div>
                                                    <div className="font-medium opacity-90">Colaborador</div>
                                                    <div className="text-lg font-bold">{selectedInspecao.colaborador}</div>
                                                </div>
                                                <div>
                                                    <div className="font-medium opacity-90">Status</div>
                                                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
                                                        selectedInspecao.ativo ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                                                    }`}>
                                                        {selectedInspecao.ativo ? 'Ativo' : 'Inativo'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-medium opacity-90">Criado em</div>
                                                    <div className="text-sm">{formatDate(selectedInspecao.criado_em)}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Zap className="h-12 w-12 opacity-50" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Informações Básicas */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                                    <Calendar className="h-5 w-5 mr-2" />
                                    Informações Básicas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Data da Inspeção
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.data ? formatDate(formData.data) : 'Não informado'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Colaborador
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.colaborador || 'Não informado'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Níveis */}
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                                    <Settings className="h-5 w-5 mr-2" />
                                    Níveis
                                    <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                                        Verificação de Fluidos
                                    </span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nível do Óleo
                                            {formData.nivel_oleo && (
                                                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                                    formData.nivel_oleo === 'Normal' ? 'bg-green-100 text-green-800' :
                                                    formData.nivel_oleo === 'Máximo' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {formData.nivel_oleo}
                                                </span>
                                            )}
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.nivel_oleo || 'Não informado'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nível da Água
                                            {formData.nivel_agua && (
                                                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                                    formData.nivel_agua === 'Normal' ? 'bg-green-100 text-green-800' :
                                                    formData.nivel_agua === 'Máximo' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {formData.nivel_agua}
                                                </span>
                                            )}
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.nivel_agua || 'Não informado'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tensões e Medições */}
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
                                    <Zap className="h-5 w-5 mr-2" />
                                    Tensões e Medições
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão Sync Gerador (V)
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.tensao_sync_gerador || '0.00'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão Sync Rede (V)
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.tensao_sync_rede || '0.00'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão A (V)
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.tensao_a || '0.00'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão B (V)
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.tensao_b || '0.00'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão C (V)
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.tensao_c || '0.00'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão Bateria (V)
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.tensao_bateria || '0.00'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão Alternador (V)
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.tensao_alternador || '0.00'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Frequência (Hz)
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.frequencia || '0.00'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Medições Físicas */}
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                                    <Gauge className="h-5 w-5 mr-2" />
                                    Medições Físicas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Temperatura da Água (°C)
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.temp_agua || '0.00'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pressão do Óleo (bar)
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.pressao_oleo || '0.00'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            RPM
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.rpm || '0'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Verificações de Segurança */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <Activity className="h-5 w-5 mr-2" />
                                    Verificações de Segurança
                                    <span className="ml-2 text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">
                                        Checklist de Segurança
                                    </span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Combustível 50%
                                            {formData.combustivel_50 && (
                                                <span className={`ml-2 text-xs px-2 py-1 rounded-full font-bold ${
                                                    formData.combustivel_50 === 'Sim' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {formData.combustivel_50}
                                                </span>
                                            )}
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.combustivel_50 || 'Não informado'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Iluminação da Sala
                                            {formData.iluminacao_sala && (
                                                <span className={`ml-2 text-xs px-2 py-1 rounded-full font-bold ${
                                                    formData.iluminacao_sala === 'Sim' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {formData.iluminacao_sala}
                                                </span>
                                            )}
                                        </label>
                                        <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                                            {formData.iluminacao_sala || 'Não informado'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Observações */}
                            <div className="bg-orange-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
                                    <Settings className="h-5 w-5 mr-2" />
                                    Observações
                                    {formData.observacao && (
                                        <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                                            Notas da Inspeção
                                        </span>
                                    )}
                                    {!formData.observacao && (
                                        <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                            Sem observações
                                        </span>
                                    )}
                                </h3>
                                {formData.observacao ? (
                                    <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
                                        <div className="text-sm text-gray-600 mb-1 font-medium">Observações registradas:</div>
                                        <div className="text-gray-900 whitespace-pre-wrap">{formData.observacao}</div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-500">
                                        <div className="text-sm">Nenhuma observação foi registrada para esta inspeção.</div>
                                    </div>
                                )}
                            </div>

                            {/* Botões */}
                            <div className="flex justify-end space-x-3 pt-6 border-t">
                                {hasResourcePermission('gerador-inspecoes', 'editar') && (
                                    <button
                                        type="button"
                                        onClick={() => setModalMode('edit')}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Editar
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Informações Básicas */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                                    <Calendar className="h-5 w-5 mr-2" />
                                    Informações Básicas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Data da Inspeção *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.data || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Colaborador *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.colaborador || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, colaborador: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Nome do colaborador"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Níveis */}
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                                    <Settings className="h-5 w-5 mr-2" />
                                    Níveis
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nível do Óleo
                                        </label>
                                        <select
                                            value={formData.nivel_oleo || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, nivel_oleo: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        >
                                            <option value="">Selecione</option>
                                            <option value="Mínimo">Mínimo</option>
                                            <option value="Normal">Normal</option>
                                            <option value="Máximo">Máximo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nível da Água
                                        </label>
                                        <select
                                            value={formData.nivel_agua || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, nivel_agua: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        >
                                            <option value="">Selecione</option>
                                            <option value="Mínimo">Mínimo</option>
                                            <option value="Normal">Normal</option>
                                            <option value="Máximo">Máximo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Medições Principais */}
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center">
                                    <Zap className="h-5 w-5 mr-2" />
                                    Tensões e Medições
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão Sync Gerador (V)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.tensao_sync_gerador !== undefined ? formData.tensao_sync_gerador : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tensao_sync_gerador: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão Sync Rede (V)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.tensao_sync_rede !== undefined ? formData.tensao_sync_rede : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tensao_sync_rede: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão A (V)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.tensao_a !== undefined ? formData.tensao_a : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tensao_a: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão B (V)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.tensao_b !== undefined ? formData.tensao_b : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tensao_b: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão C (V)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.tensao_c !== undefined ? formData.tensao_c : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tensao_c: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão Bateria (V)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.tensao_bateria !== undefined ? formData.tensao_bateria : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tensao_bateria: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tensão Alternador (V)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.tensao_alternador !== undefined ? formData.tensao_alternador : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tensao_alternador: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Frequência (Hz)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.frequencia !== undefined ? formData.frequencia : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, frequencia: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Medições Físicas */}
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                                    <Gauge className="h-5 w-5 mr-2" />
                                    Medições Físicas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Temperatura da Água (°C)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.temp_agua !== undefined ? formData.temp_agua : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, temp_agua: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pressão do Óleo (bar)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.pressao_oleo !== undefined ? formData.pressao_oleo : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, pressao_oleo: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            RPM
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.rpm !== undefined ? formData.rpm : ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, rpm: parseInt(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Verificações */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <Activity className="h-5 w-5 mr-2" />
                                    Verificações de Segurança
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Combustível 50%
                                        </label>
                                        <select
                                            value={formData.combustivel_50 || 'Não'}
                                            onChange={(e) => setFormData(prev => ({ ...prev, combustivel_50: e.target.value as 'Sim' | 'Não' }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                                        >
                                            <option value="Não">Não</option>
                                            <option value="Sim">Sim</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Iluminação da Sala
                                        </label>
                                        <select
                                            value={formData.iluminacao_sala || 'Não'}
                                            onChange={(e) => setFormData(prev => ({ ...prev, iluminacao_sala: e.target.value as 'Sim' | 'Não' }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                                        >
                                            <option value="Não">Não</option>
                                            <option value="Sim">Sim</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Observações */}
                            <div className="bg-orange-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
                                    <Settings className="h-5 w-5 mr-2" />
                                    Observações
                                </h3>
                                <textarea
                                    value={formData.observacao || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                                    placeholder="Observações sobre a inspeção..."
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="ativo"
                                    checked={formData.ativo || false}
                                    onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                                    Inspeção ativa
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-6 border-t">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    {modalMode === 'create' ? 'Criar Inspeção' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    )}
                </Modal>
            </div>
        </div>
    );
};

export default GeradorInspecoes; 