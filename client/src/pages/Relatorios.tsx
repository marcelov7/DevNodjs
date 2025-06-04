import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import RelatorioHistorico from '../components/RelatorioHistorico';
import ProgressBar from '../components/ProgressBar';
import NotificationBadge from '../components/NotificationBadge';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit2, 
  Eye, 
  X, 
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Wrench,
  User,
  History,
  Upload,
  Image,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import Tooltip from '../components/Tooltip';

interface Relatorio {
  id: number;
  usuario_id: number;
  local_id: number;
  equipamento_id: number;
  data_ocorrencia: string;
  titulo: string;
  descricao: string;
  status: 'pendente' | 'em_andamento' | 'resolvido';
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  editavel: boolean;
  data_criacao: string;
  data_atualizacao: string;
  progresso_calculado: number;
  total_historico: number;
  historico_recente: number;
  recem_criado: number;
  usuario_nome?: string;
  local_nome?: string;
  equipamento_nome?: string;
  horas_desde_criacao?: number;
  pode_editar_completo?: boolean;
  imagens?: Array<{
    id: number;
    nome_arquivo: string;
    nome_original?: string;
    caminho_arquivo: string;
    tamanho_arquivo: number;
    tipo_mime: string;
  }>;
}

interface Local {
  id: number;
  nome: string;
}

interface Equipamento {
  id: number;
  nome: string;
  codigo?: string;
}

interface FiltrosRelatorio {
  titulo: string;
  local_id: string;
  equipamento_id: string;
  status: string;
  prioridade: string;
  data_inicio: string;
  data_fim: string;
  atividade_recente: boolean;
}

const Relatorios: React.FC = () => {
  const { usuario, hasResourcePermission } = useAuth();
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [equipamentosPorLocal, setEquipamentosPorLocal] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados do modal
  const [modalAberto, setModalAberto] = useState(false);
  const [relatorioEditando, setRelatorioEditando] = useState<Relatorio | null>(null);
  const [visualizando, setVisualizando] = useState(false);

  // Estados para imagens
  const [imagensParaUpload, setImagensParaUpload] = useState<File[]>([]);
  const [imagensExistentes, setImagensExistentes] = useState<any[]>([]);
  const [imagensParaRemover, setImagensParaRemover] = useState<number[]>([]);
  const [modalImagemAberto, setModalImagemAberto] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState<any>(null);

  // Estados de filtros e paginação modernizados
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({
    titulo: '',
    local_id: '',
    equipamento_id: '',
    status: '',
    prioridade: '',
    data_inicio: '',
    data_fim: '',
    atividade_recente: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRelatorios, setTotalRelatorios] = useState(0);
  const itemsPerPage = 10;

  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [relatorioHistoricoId, setRelatorioHistoricoId] = useState<number | null>(null);

  // Estados do formulário
  const [formulario, setFormulario] = useState({
    local_id: '',
    equipamento_id: '',
    data_ocorrencia: '',
    titulo: '',
    descricao: '',
    status: 'pendente' as 'pendente' | 'em_andamento' | 'resolvido',
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'critica'
  });

  const statusOptions = [
    { value: 'pendente', label: 'Pendente', cor: 'bg-yellow-100 text-yellow-800', icon: Clock },
    { value: 'em_andamento', label: 'Em Andamento', cor: 'bg-blue-100 text-blue-800', icon: AlertTriangle },
    { value: 'resolvido', label: 'Resolvido', cor: 'bg-green-100 text-green-800', icon: CheckCircle }
  ];

  const prioridadeOptions = [
    { value: 'baixa', label: 'Baixa', cor: 'bg-gray-100 text-gray-800' },
    { value: 'media', label: 'Média', cor: 'bg-blue-100 text-blue-800' },
    { value: 'alta', label: 'Alta', cor: 'bg-orange-100 text-orange-800' },
    { value: 'critica', label: 'Crítica', cor: 'bg-red-100 text-red-800' }
  ];

  // Memoizar filtros para evitar loops
  const filtrosMemoized = useMemo(() => filtros, [
    filtros.titulo,
    filtros.local_id,
    filtros.equipamento_id,
    filtros.status,
    filtros.prioridade,
    filtros.data_inicio,
    filtros.data_fim,
    filtros.atividade_recente
  ]);

  useEffect(() => {
    if (usuario) {
      carregarDados();
      carregarLocais();
    }
  }, [paginaAtual, filtrosMemoized, usuario?.id]); // Usar usuario?.id em vez do objeto completo

  const carregarDados = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: paginaAtual.toString(),
        limit: itemsPerPage.toString()
      });

      // Adicionar filtros apenas se tiverem valor
      if (filtros.titulo) params.append('search', filtros.titulo);
      if (filtros.local_id) params.append('local_id', filtros.local_id);
      if (filtros.equipamento_id) params.append('equipamento_id', filtros.equipamento_id);
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.prioridade) params.append('prioridade', filtros.prioridade);
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.atividade_recente) params.append('atividade_recente', 'true');

      const response = await axios.get(`/relatorios?${params}`);
      
      if (response.data.success) {
        setRelatorios(response.data.data.relatorios);
        setTotalPaginas(response.data.data.pagination.pages);
        setTotalRelatorios(response.data.data.pagination.total);
      }
    } catch (error) {
      setError('Erro ao carregar relatórios');
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
      }
    } catch (error) {
      console.error('Erro ao carregar locais:', error);
    }
  };

  // Funções helper para filtros
  const handleFilterChange = (field: string, value: string | boolean) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
    setPaginaAtual(1); // Reset para primeira página ao filtrar
  };

  const clearFilters = () => {
    setFiltros({
      titulo: '',
      local_id: '',
      equipamento_id: '',
      status: '',
      prioridade: '',
      data_inicio: '',
      data_fim: '',
      atividade_recente: false
    });
    setPaginaAtual(1);
  };

  const carregarEquipamentosPorLocal = async (localId: string) => {
    if (!localId) {
      setEquipamentosPorLocal([]);
      return;
    }

    try {
      const response = await axios.get(`/equipamentos/por-local/${localId}`);
      if (response.data.success) {
        setEquipamentosPorLocal(response.data.data.equipamentos);
      }
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
      setEquipamentosPorLocal([]);
    }
  };

  const abrirModal = async (relatorioParaEditar?: Relatorio, somenteVisualizacao = false) => {
    if (relatorioParaEditar) {
      if (somenteVisualizacao) {
        // Para visualização, buscar dados completos do relatório incluindo imagens
        try {
          setLoading(true);
          const response = await axios.get(`/relatorios/${relatorioParaEditar.id}`);
          
          if (response.data.success) {
            const relatorioCompleto = response.data.data.relatorio;
            setRelatorioEditando(relatorioCompleto);
            
            // Não precisamos carregar equipamentos para visualização
          } else {
            setError('Erro ao carregar dados completos do relatório');
            return;
          }
        } catch (error: any) {
          setError('Erro ao carregar dados do relatório');
          console.error('Erro ao buscar relatório:', error);
          return;
        } finally {
          setLoading(false);
        }
      } else {
        // Para edição, usar dados da listagem e carregar imagens existentes
        setRelatorioEditando(relatorioParaEditar);
        setFormulario({
          local_id: relatorioParaEditar.local_id.toString(),
          equipamento_id: relatorioParaEditar.equipamento_id.toString(),
          data_ocorrencia: relatorioParaEditar.data_ocorrencia.split('T')[0],
          titulo: relatorioParaEditar.titulo,
          descricao: relatorioParaEditar.descricao,
          status: relatorioParaEditar.status,
          prioridade: relatorioParaEditar.prioridade
        });
        
        // Carregar imagens existentes se houver
        setImagensExistentes(relatorioParaEditar.imagens || []);
        
        // Carregar equipamentos do local selecionado
        carregarEquipamentosPorLocal(relatorioParaEditar.local_id.toString());
      }
    } else {
      // Novo relatório
      setRelatorioEditando(null);
      setFormulario({
        local_id: '',
        equipamento_id: '',
        data_ocorrencia: '',
        titulo: '',
        descricao: '',
        status: 'pendente',
        prioridade: 'media'
      });
      limparDadosImagens();
    }

    setVisualizando(somenteVisualizacao);
    setModalAberto(true);
    marcarComoVisualizado(relatorioParaEditar?.id || 0);
  };

  const marcarComoVisualizado = async (relatorioId: number) => {
    try {
      await axios.post(`/relatorios/${relatorioId}/marcar-visualizado`);
      console.log('📖 Relatório marcado como visualizado');
      // Não precisa recarregar toda a lista, apenas remover o indicador localmente
      setRelatorios(prevRelatorios => 
        prevRelatorios.map(rel => 
          rel.id === relatorioId 
            ? { ...rel, recem_criado: 0 } 
            : rel
        )
      );
    } catch (error) {
      console.error('Erro ao marcar como visualizado:', error);
      // Não mostrar erro para o usuário, é uma ação silenciosa
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setRelatorioEditando(null);
    setVisualizando(false);
    limparDadosImagens();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Criar FormData para incluir imagens
      const formData = new FormData();
      
      // Tratar campos obrigatórios e opcionais
      const dadosFormulario = {
        ...formulario,
        local_id: parseInt(formulario.local_id),
        equipamento_id: parseInt(formulario.equipamento_id)
      };
      
      // Adicionar dados do formulário
      Object.entries(dadosFormulario).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      // Adicionar imagens para upload
      imagensParaUpload.forEach(imagem => {
        formData.append('imagens', imagem);
      });

      // Adicionar IDs das imagens para remover (apenas na edição)
      if (relatorioEditando && imagensParaRemover.length > 0) {
        formData.append('imagensParaRemover', JSON.stringify(imagensParaRemover));
      }

      const url = relatorioEditando 
        ? `/api/relatorios/${relatorioEditando.id}`
        : '/api/relatorios';
      
      const method = relatorioEditando ? 'PUT' : 'POST';

      const response = await axios({
        method,
        url,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSuccess(relatorioEditando ? 'Relatório atualizado com sucesso!' : 'Relatório criado com sucesso!');
        fecharModal();
        carregarDados();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao salvar relatório');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarDataCompleta = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const getCorStatus = (status: string) => {
    const item = statusOptions.find(s => s.value === status);
    return item?.cor || 'bg-gray-100 text-gray-800';
  };

  const getLabelStatus = (status: string) => {
    const item = statusOptions.find(s => s.value === status);
    return item?.label || status;
  };

  const getIconStatus = (status: string) => {
    const item = statusOptions.find(s => s.value === status);
    return item?.icon || Clock;
  };

  const getCorPrioridade = (prioridade: string) => {
    const item = prioridadeOptions.find(p => p.value === prioridade);
    return item?.cor || 'bg-gray-100 text-gray-800';
  };

  const getLabelPrioridade = (prioridade: string) => {
    const item = prioridadeOptions.find(p => p.value === prioridade);
    return item?.label || prioridade;
  };

  const abrirHistorico = (relatorioId: number) => {
    setRelatorioHistoricoId(relatorioId);
    setHistoricoAberto(true);
  };

  const fecharHistorico = () => {
    setHistoricoAberto(false);
    setRelatorioHistoricoId(null);
    carregarDados(); // Recarregar dados após mudanças no histórico
  };

  const reabrirRelatorio = async (relatorioId: number) => {
    if (!window.confirm('Tem certeza que deseja reabrir este relatório?')) return;
    
    try {
      setLoading(true);
      await axios.post(`/relatorios/${relatorioId}/historico`, {
        descricao: 'Relatório reaberto para revisão',
        progresso: 0
      });
      
      setSuccess('Relatório reaberto com sucesso!');
      carregarDados();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao reabrir relatório');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Funções para gerenciar imagens
  const adicionarImagens = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imagensValidas = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB
    );
    
    if (imagensValidas.length !== files.length) {
      setError('Alguns arquivos foram ignorados. Apenas imagens até 5MB são aceitas.');
      setTimeout(() => setError(''), 3000);
    }
    
    setImagensParaUpload(prev => [...prev, ...imagensValidas]);
  };

  const removerImagemUpload = (index: number) => {
    setImagensParaUpload(prev => prev.filter((_, i) => i !== index));
  };

  const marcarImagemParaRemover = (imagemId: number) => {
    setImagensParaRemover(prev => [...prev, imagemId]);
    setImagensExistentes(prev => prev.filter(img => img.id !== imagemId));
  };

  const visualizarImagem = (imagem: any) => {
    setImagemSelecionada(imagem);
    setModalImagemAberto(true);
  };

  const formatarTamanhoArquivo = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Função para construir URL completa da imagem
  const construirUrlCompletaImagem = (nomeArquivo: string) => {
    // Usar sempre URL relativa que será redirecionada pelo proxy
    return `/api/relatorios/uploads/${nomeArquivo}`;
  };

  const limparDadosImagens = () => {
    setImagensParaUpload([]);
    setImagensExistentes([]);
    setImagensParaRemover([]);
  };

  // Função para exportar relatório em PDF
  const exportarPDF = async (relatorioId: number, titulo: string) => {
    try {
      setLoading(true);
      
      const response = await axios.get(`/relatorios/${relatorioId}/pdf`, {
        responseType: 'blob'
      });

      // Criar URL para download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Nome do arquivo
      const nomeArquivo = `relatorio-${relatorioId}-${titulo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      link.setAttribute('download', nomeArquivo);
      
      // Fazer download
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess('PDF exportado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Erro ao exportar PDF:', error);
      setError(error.response?.data?.message || 'Erro ao exportar PDF');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar se pode editar completamente o relatório
  const podeEditarCompleto = (relatorio: Relatorio): boolean => {
    // Admin master sempre pode editar
    if (usuario?.nivel_acesso === 'admin_master') {
      return true;
    }
    
    // Se não tem horas desde criação, assumir que pode editar (compatibilidade)
    if (!relatorio.horas_desde_criacao) {
      return relatorio.editavel && relatorio.status !== 'resolvido';
    }
    
    // Lógica de 24h para outros usuários
    return relatorio.editavel && 
           relatorio.status !== 'resolvido' && 
           relatorio.horas_desde_criacao <= 24;
  };

  // Função para verificar se pode apenas atualizar histórico
  const podeAtualizarHistorico = (relatorio: Relatorio): boolean => {
    if (usuario?.nivel_acesso === 'admin_master') {
      return true;
    }
    
    return relatorio.editavel && 
           relatorio.status !== 'resolvido' && 
           (relatorio.horas_desde_criacao || 0) > 24;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Principal */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-3 mb-4 lg:mb-0">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Relatórios de Ocorrências
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gerencie relatórios de ocorrências e manutenções dos equipamentos
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Tooltip content="Filtrar relatórios">
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
              <Tooltip content="Novo relatório">
                {hasResourcePermission('relatorios', 'criar') && (
                  <button
                    onClick={() => abrirModal()}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Relatório
                  </button>
                )}
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar relatório..."
                    value={filtros.titulo}
                    onChange={(e) => handleFilterChange('titulo', e.target.value)}
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
                    onChange={(e) => {
                      handleFilterChange('local_id', e.target.value);
                      handleFilterChange('equipamento_id', '');
                    }}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                  Status
                </label>
                <div className="relative">
                  <Activity className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={filtros.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Todos os status</option>
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prioridade
                </label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <select
                    value={filtros.prioridade}
                    onChange={(e) => handleFilterChange('prioridade', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Todas as prioridades</option>
                    {prioridadeOptions.map(prioridade => (
                      <option key={prioridade.value} value={prioridade.value}>
                        {prioridade.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Início
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="date"
                    value={filtros.data_inicio}
                    onChange={(e) => handleFilterChange('data_inicio', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data Fim
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="date"
                    value={filtros.data_fim}
                    onChange={(e) => handleFilterChange('data_fim', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    checked={filtros.atividade_recente}
                    onChange={(e) => handleFilterChange('atividade_recente', e.target.checked)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Atividade recente (24h)
                  </span>
                </label>
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

        {/* Conteúdo Principal */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Carregando relatórios...</span>
            </div>
          ) : relatorios.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum relatório encontrado</h3>
              <p className="text-gray-600 mb-6">
                {filtros.titulo || filtros.local_id || filtros.status || filtros.prioridade 
                  ? 'Tente ajustar os filtros para encontrar relatórios'
                  : 'Comece criando seu primeiro relatório de ocorrência'
                }
              </p>
              {hasResourcePermission('relatorios', 'criar') && (
                <button
                  onClick={() => abrirModal()}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Relatório
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Lista de Relatórios */}
              <div className="divide-y divide-gray-200">
                {relatorios.map((relatorio) => (
                  <div
                    key={relatorio.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer relative"
                    onClick={() => abrirModal(relatorio, true)}
                  >
                    {/* Indicadores de Status */}
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      {relatorio.recem_criado > 0 && (
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" title="Novo relatório"></div>
                      )}
                      {relatorio.historico_recente > 0 && (
                        <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" title="Atividade recente"></div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* Informações Principais */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                {relatorio.titulo}
                              </h3>
                              {relatorio.imagens && relatorio.imagens.length > 0 && (
                                <div className="flex items-center text-purple-600">
                                  <Image className="h-4 w-4 mr-1" />
                                  <span className="text-xs font-medium">{relatorio.imagens.length}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                              {relatorio.descricao}
                            </p>
                          </div>
                        </div>

                        {/* Local e Equipamento */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                            <span className="font-medium">{relatorio.local_nome}</span>
                          </div>
                          <div className="flex items-center">
                            <Wrench className="h-4 w-4 mr-1 text-gray-500" />
                            <span>{relatorio.equipamento_nome}</span>
                          </div>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-gray-500" />
                            <span>{relatorio.usuario_nome}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status e Progresso */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Status:</span>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getCorStatus(relatorio.status)}`}>
                            {getLabelStatus(relatorio.status)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Prioridade:</span>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getCorPrioridade(relatorio.prioridade)}`}>
                            {getLabelPrioridade(relatorio.prioridade)}
                          </span>
                        </div>
                        {relatorio.progresso_calculado !== undefined && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">Progresso:</span>
                              <span className="text-sm text-gray-600">{relatorio.progresso_calculado}%</span>
                            </div>
                            <ProgressBar 
                              progress={relatorio.progresso_calculado} 
                              size="sm"
                              showLabel={false}
                            />
                          </div>
                        )}
                      </div>

                      {/* Data e Ações */}
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center mb-1">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{formatarData(relatorio.data_ocorrencia)}</span>
                          </div>
                        </div>

                        {/* Botões de ação - Layout Responsivo Organizado */}
                        <div className="flex flex-col space-y-3 pt-3 border-t border-gray-200">
                          {/* Linha 1: Botões de Visualização (sempre disponíveis) */}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await abrirModal(relatorio, true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors min-w-[70px] justify-center"
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              <span className="hidden sm:inline">Ver</span>
                            </button>
                            
                            {hasResourcePermission('relatorios', 'exportar') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportarPDF(relatorio.id, relatorio.titulo);
                                }}
                                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors min-w-[70px] justify-center"
                                title="Exportar em PDF"
                              >
                                <Download className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">PDF</span>
                              </button>
                            )}
                            
                            <div className="relative">
                              <NotificationBadge 
                                count={relatorio.total_historico || 0}
                                color={relatorio.historico_recente > 0 ? 'red' : 'purple'}
                                size="sm"
                                className="absolute -top-2 -right-2"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    abrirHistorico(relatorio.id);
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors min-w-[70px] justify-center"
                                >
                                  <History className="h-4 w-4 mr-1.5" />
                                  <span className="hidden sm:inline">Histórico</span>
                                </button>
                              </NotificationBadge>
                            </div>
                          </div>
                          
                          {/* Linha 2: Botões de Ação (condicionais) */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Botão Editar Completo - apenas para relatórios dentro das 24h */}
                            {podeEditarCompleto(relatorio) && hasResourcePermission('relatorios', 'editar') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Configurar dados do formulário para edição
                                  setFormulario({
                                    local_id: relatorio.local_id.toString(),
                                    equipamento_id: relatorio.equipamento_id.toString(),
                                    data_ocorrencia: relatorio.data_ocorrencia.split('T')[0],
                                    titulo: relatorio.titulo,
                                    descricao: relatorio.descricao,
                                    status: relatorio.status,
                                    prioridade: relatorio.prioridade
                                  });
                                  
                                  // Carregar imagens existentes e equipamentos
                                  setImagensExistentes(relatorio.imagens || []);
                                  carregarEquipamentosPorLocal(relatorio.local_id.toString());
                                  
                                  // Abrir modal de edição
                                  setRelatorioEditando(relatorio);
                                  setVisualizando(false);
                                  setModalAberto(true);
                                }}
                                className="inline-flex items-center px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors min-w-[80px] justify-center"
                              >
                                <Edit2 className="h-4 w-4 mr-1.5" />
                                <span>Editar</span>
                              </button>
                            )}
                            
                            {/* Botão Atualizar Histórico - apenas após 24h e se não concluído */}
                            {podeAtualizarHistorico(relatorio) && !podeEditarCompleto(relatorio) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirHistorico(relatorio.id);
                                }}
                                className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors min-w-[80px] justify-center"
                                title="Apenas atualizações de histórico são permitidas após 24h"
                              >
                                <History className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">Atualizar</span>
                                <span className="sm:hidden">Hist.</span>
                              </button>
                            )}
                            
                            {/* Botão Reabrir - apenas para admin master em relatórios concluídos */}
                            {relatorio.status === 'resolvido' && usuario?.nivel_acesso === 'admin_master' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  reabrirRelatorio(relatorio.id);
                                }}
                                className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors min-w-[80px] justify-center"
                              >
                                <AlertTriangle className="h-4 w-4 mr-1.5" />
                                <span>Reabrir</span>
                              </button>
                            )}
                            
                            {/* Indicador quando não há ações disponíveis */}
                            {!podeEditarCompleto(relatorio) && 
                             !podeAtualizarHistorico(relatorio) && 
                             !(relatorio.status === 'resolvido' && usuario?.nivel_acesso === 'admin_master') && (
                              <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg min-w-[80px] justify-center">
                                <Clock className="h-4 w-4 mr-1.5" />
                                <span className="text-xs">Somente leitura</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700 font-medium">
                      Mostrando {(paginaAtual - 1) * 10 + 1} a {Math.min(paginaAtual * 10, totalRelatorios)} de {totalRelatorios} relatórios
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPaginaAtual(paginaAtual - 1)}
                        disabled={paginaAtual === 1}
                        className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </button>
                      
                      {/* Indicador de página atual */}
                      <span className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                        {paginaAtual} de {totalPaginas}
                      </span>
                      
                      <button
                        onClick={() => setPaginaAtual(paginaAtual + 1)}
                        disabled={paginaAtual === totalPaginas}
                        className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {visualizando ? (
              // Modo visualização com design melhorado
              <div>
                {/* Cabeçalho */}
                <div className="border-b border-gray-200 pb-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Visualizar Relatório
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Detalhes completos do relatório selecionado
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
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-primary-600" />
                      Informações Principais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Título</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">{relatorioEditando?.titulo}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Data da Ocorrência</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">
                          {relatorioEditando && formatarData(relatorioEditando.data_ocorrencia)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Criado por</dt>
                        <dd className="mt-1 text-base text-gray-900">{relatorioEditando?.usuario_nome}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Status</dt>
                        <dd className="mt-1">
                          <span className={`inline-flex items-center px-3 py-2 text-base font-semibold rounded-full ${relatorioEditando && getCorStatus(relatorioEditando.status)}`}>
                            {relatorioEditando && getLabelStatus(relatorioEditando.status)}
                          </span>
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Localização e Equipamento */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                      Localização e Equipamento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Local</dt>
                        <dd className="mt-1 text-lg font-bold text-blue-900">{relatorioEditando?.local_nome}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Equipamento</dt>
                        <dd className="mt-1 text-lg font-bold text-blue-900">{relatorioEditando?.equipamento_nome}</dd>
                      </div>
                    </div>
                  </div>

                  {/* Descrição e Detalhes */}
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Wrench className="h-5 w-5 mr-2 text-yellow-600" />
                      Descrição da Ocorrência
                    </h3>
                    <div>
                      <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Detalhes</dt>
                      <dd className="mt-2 text-base text-gray-900 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded border">
                        {relatorioEditando?.descricao}
                      </dd>
                    </div>
                  </div>

                  {/* Status e Prioridade */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-green-600" />
                      Classificação
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Status Atual</dt>
                        <dd className="mt-1">
                          <span className={`inline-flex items-center px-3 py-2 text-base font-semibold rounded-full ${relatorioEditando && getCorStatus(relatorioEditando.status)}`}>
                            {relatorioEditando && getLabelStatus(relatorioEditando.status)}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Prioridade</dt>
                        <dd className="mt-1">
                          <span className={`inline-flex items-center px-3 py-2 text-base font-semibold rounded-full ${relatorioEditando && getCorPrioridade(relatorioEditando.prioridade)}`}>
                            {relatorioEditando && getLabelPrioridade(relatorioEditando.prioridade)}
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
                        <dd className="mt-1 text-sm text-gray-600">
                          {relatorioEditando && formatarDataCompleta(relatorioEditando.data_criacao)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Última Atualização</dt>
                        <dd className="mt-1 text-sm text-gray-600">
                          {relatorioEditando && formatarDataCompleta(relatorioEditando.data_atualizacao)}
                        </dd>
                      </div>
                    </div>
                  </div>

                  {/* Imagens do Relatório */}
                  {relatorioEditando?.imagens && relatorioEditando.imagens.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                        <Image className="h-5 w-5 mr-2" />
                        Imagens do Relatório
                        <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                          {relatorioEditando.imagens.length} imagem(ns)
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {relatorioEditando.imagens.map((imagem) => (
                          <div key={imagem.id} className="bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="aspect-square bg-gray-100 relative overflow-hidden">
                              <img
                                src={construirUrlCompletaImagem(imagem.nome_arquivo)}
                                alt={imagem.nome_original || imagem.nome_arquivo}
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => visualizarImagem(imagem)}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                                        <svg class="h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        <span class="text-xs">Imagem não encontrada</span>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            </div>
                            <div className="p-3">
                              <p className="text-sm font-medium text-gray-900 truncate mb-1" title={imagem.nome_original || imagem.nome_arquivo}>
                                {imagem.nome_original || imagem.nome_arquivo}
                              </p>
                              <p className="text-xs text-gray-500 mb-2">
                                {formatarTamanhoArquivo(imagem.tamanho_arquivo)}
                              </p>
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => visualizarImagem(imagem)}
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Visualizar
                                </button>
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = construirUrlCompletaImagem(imagem.nome_arquivo);
                                    link.download = imagem.nome_original || imagem.nome_arquivo;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="text-xs text-green-600 hover:text-green-800 flex items-center"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rodapé com Ações - Layout Organizado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 border-t border-gray-200 mt-6">
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {relatorioEditando?.editavel && hasResourcePermission('relatorios', 'editar') && (
                      <button
                        onClick={() => {
                          // Configurar dados do formulário para edição
                          setFormulario({
                            local_id: relatorioEditando.local_id.toString(),
                            equipamento_id: relatorioEditando.equipamento_id.toString(),
                            data_ocorrencia: relatorioEditando.data_ocorrencia.split('T')[0],
                            titulo: relatorioEditando.titulo,
                            descricao: relatorioEditando.descricao,
                            status: relatorioEditando.status,
                            prioridade: relatorioEditando.prioridade
                          });
                          
                          // Carregar imagens existentes e equipamentos
                          setImagensExistentes(relatorioEditando.imagens || []);
                          carregarEquipamentosPorLocal(relatorioEditando.local_id.toString());
                          
                          // Mudar para modo de edição
                          setVisualizando(false);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar Relatório
                      </button>
                    )}
                    <button
                      onClick={() => abrirHistorico(relatorioEditando?.id || 0)}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      <History className="h-4 w-4 mr-2" />
                      Ver Histórico
                    </button>
                  </div>
                  <button
                    onClick={fecharModal}
                    className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-full sm:w-auto justify-center"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              // Modo edição/criação (mantém o design original)
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {relatorioEditando ? 'Editar Relatório' : 'Novo Relatório'}
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
                      <label className="form-label">Local *</label>
                      <select
                        required
                        className="form-input"
                        value={formulario.local_id}
                        onChange={(e) => {
                          setFormulario({...formulario, local_id: e.target.value, equipamento_id: ''});
                          carregarEquipamentosPorLocal(e.target.value);
                        }}
                      >
                        <option value="">Selecione um local</option>
                        {locais.map(local => (
                          <option key={local.id} value={local.id}>
                            {local.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Equipamento *</label>
                      <select
                        required
                        className="form-input"
                        value={formulario.equipamento_id}
                        onChange={(e) => setFormulario({...formulario, equipamento_id: e.target.value})}
                        disabled={!formulario.local_id}
                      >
                        <option value="">Selecione um equipamento</option>
                        {equipamentosPorLocal.map(equipamento => (
                          <option key={equipamento.id} value={equipamento.id}>
                            {equipamento.nome} {equipamento.codigo && `(${equipamento.codigo})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Data da Ocorrência *</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={formulario.data_ocorrencia}
                      onChange={(e) => setFormulario({...formulario, data_ocorrencia: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="form-label">Título *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="Ex: Vazamento de óleo no compressor"
                      value={formulario.titulo}
                      onChange={(e) => setFormulario({...formulario, titulo: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="form-label">Descrição *</label>
                    <textarea
                      rows={4}
                      required
                      className="form-input"
                      placeholder="Descreva detalhadamente a ocorrência..."
                      value={formulario.descricao}
                      onChange={(e) => setFormulario({...formulario, descricao: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Status</label>
                      <select
                        className="form-input"
                        value={formulario.status}
                        onChange={(e) => setFormulario({...formulario, status: e.target.value as any})}
                      >
                        {statusOptions.map(status => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Prioridade</label>
                      <select
                        className="form-input"
                        value={formulario.prioridade}
                        onChange={(e) => setFormulario({...formulario, prioridade: e.target.value as any})}
                      >
                        {prioridadeOptions.map(prioridade => (
                          <option key={prioridade.value} value={prioridade.value}>
                            {prioridade.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Seção de Imagens */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 flex items-center">
                      <Image className="h-5 w-5 mr-2 text-purple-600" />
                      Imagens do Relatório
                    </h4>

                    {/* Upload de novas imagens */}
                    <div>
                      <label className="form-label">Adicionar imagens</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors">
                        <input
                          type="file"
                          id="upload-imagens"
                          multiple
                          accept="image/*"
                          onChange={adicionarImagens}
                          className="hidden"
                        />
                        <label htmlFor="upload-imagens" className="cursor-pointer">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            Clique para selecionar imagens ou arraste aqui
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, GIF até 5MB cada
                          </p>
                        </label>
                      </div>
                    </div>

                    {/* Imagens para upload */}
                    {imagensParaUpload.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Novas imagens ({imagensParaUpload.length})
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {imagensParaUpload.map((imagem, index) => (
                            <div key={index} className="relative bg-gray-100 rounded-lg overflow-hidden">
                              <div className="aspect-square flex items-center justify-center">
                                <img
                                  src={URL.createObjectURL(imagem)}
                                  alt={imagem.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removerImagemUpload(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <div className="p-2 bg-white">
                                <p className="text-xs font-medium truncate" title={imagem.name}>
                                  {imagem.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatarTamanhoArquivo(imagem.size)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Imagens existentes (apenas no modo edição) */}
                    {relatorioEditando && imagensExistentes.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Imagens existentes ({imagensExistentes.length})
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {imagensExistentes.map((imagem) => (
                            <div key={imagem.id} className="relative bg-gray-100 rounded-lg overflow-hidden">
                              <div className="aspect-square flex items-center justify-center">
                                <img
                                  src={construirUrlCompletaImagem(imagem.nome_arquivo)}
                                  alt={imagem.nome_original || imagem.nome_arquivo}
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() => visualizarImagem(imagem)}
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `
                                        <div class="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                                          <svg class="h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                          </svg>
                                          <span class="text-xs">Imagem não encontrada</span>
                                        </div>
                                      `;
                                    }
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => marcarImagemParaRemover(imagem.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                title="Remover imagem"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                              <div className="p-2 bg-white">
                                <p className="text-xs font-medium truncate" title={imagem.nome_original || imagem.nome_arquivo}>
                                  {imagem.nome_original || imagem.nome_arquivo}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatarTamanhoArquivo(imagem.tamanho_arquivo)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botões de Ação - Layout Responsivo */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={fecharModal}
                      className="inline-flex items-center justify-center px-6 py-2.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium order-2 sm:order-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium order-1 sm:order-2 flex-1 sm:flex-none"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          {relatorioEditando ? (
                            <>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Atualizar Relatório
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Criar Relatório
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {historicoAberto && relatorioHistoricoId && (
        <RelatorioHistorico
          relatorioId={relatorioHistoricoId}
          isOpen={historicoAberto}
          onClose={fecharHistorico}
          canEdit={true} // Ajustar conforme permissões
        />
      )}

      {/* Modal de Visualização de Imagem */}
      {modalImagemAberto && imagemSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {imagemSelecionada.nome_original || imagemSelecionada.nome_arquivo}
                </h3>
                <p className="text-sm text-gray-600">
                  {formatarTamanhoArquivo(imagemSelecionada.tamanho_arquivo)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = construirUrlCompletaImagem(imagemSelecionada.nome_arquivo);
                    link.download = imagemSelecionada.nome_original || imagemSelecionada.nome_arquivo;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setModalImagemAberto(false)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Imagem */}
            <div className="p-4">
              <div className="max-h-[70vh] overflow-auto">
                <img
                  src={construirUrlCompletaImagem(imagemSelecionada.nome_arquivo)}
                  alt={imagemSelecionada.nome_original || imagemSelecionada.nome_arquivo}
                  className="w-full h-auto mx-auto rounded-lg shadow-lg"
                  style={{ maxHeight: '70vh', objectFit: 'contain' }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-96 flex flex-col items-center justify-center bg-gray-100 text-gray-500 rounded-lg">
                          <svg class="h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <p class="text-lg font-medium">Imagem não encontrada</p>
                          <p class="text-sm mt-1">Não foi possível carregar a imagem</p>
                          <p class="text-xs mt-2 text-gray-400">Arquivo: ${imagemSelecionada.nome_original || imagemSelecionada.nome_arquivo}</p>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Clique e arraste para mover • Use o scroll para ampliar
              </div>
              <button
                onClick={() => setModalImagemAberto(false)}
                className="btn btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Relatorios; 