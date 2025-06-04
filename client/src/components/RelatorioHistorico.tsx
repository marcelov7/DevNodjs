import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  Clock, 
  User, 
  FileText, 
  Download, 
  Eye,
  Plus,
  AlertTriangle,
  CheckCircle,
  Users
} from 'lucide-react';

interface Historico {
  id: number;
  usuario_id: number;
  status_anterior: string;
  status_novo: string;
  descricao: string;
  progresso: number;
  data_atualizacao: string;
  usuario_nome: string;
  anexos: Array<{
    id: number;
    nome_arquivo: string;
    caminho_arquivo: string;
    tamanho_arquivo: number;
    tipo_mime: string;
  }>;
}

interface Atribuicao {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  usuario_email: string;
  data_atribuicao: string;
  atribuido_por_nome: string;
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
  setor: string;
  nivel_acesso: string;
  ja_atribuido: boolean;
}

interface Relatorio {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  progresso_calculado: number;
  usuario_nome: string;
  local_nome: string;
  equipamento_nome: string;
  data_ocorrencia: string;
  data_criacao: string;
  editavel: boolean;
  pode_editar: boolean;
  pode_gerenciar_atribuicoes: boolean;
}

interface RelatorioHistoricoProps {
  relatorioId: number;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
}

const RelatorioHistorico: React.FC<RelatorioHistoricoProps> = ({
  relatorioId,
  isOpen,
  onClose,
  canEdit
}) => {
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para nova entrada no histórico
  const [modalHistorico, setModalHistorico] = useState(false);
  const [novoHistorico, setNovoHistorico] = useState({
    descricao: '',
    progresso: 0
  });
  const [arquivos, setArquivos] = useState<File[]>([]);

  // Estados para atribuições
  const [modalAtribuicoes, setModalAtribuicoes] = useState(false);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<number[]>([]);

  // Estados para visualização de imagens
  const [modalImagemAberto, setModalImagemAberto] = useState(false);
  const [imagemSelecionada, setImagemSelecionada] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      carregarDados();
    }
  }, [isOpen, relatorioId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar dados do relatório com histórico
      const response = await axios.get(`/api/relatorios/${relatorioId}`);
      if (response.data.success) {
        setRelatorio(response.data.data.relatorio);
        setHistorico(response.data.data.historico || []);
        setAtribuicoes(response.data.data.atribuicoes || []);
        
        // Pré-selecionar usuários já atribuídos
        const usuariosJaAtribuidos = response.data.data.atribuicoes?.map((a: any) => a.usuario_id) || [];
        setUsuariosSelecionados(usuariosJaAtribuidos);
      }

      // Carregar usuários disponíveis apenas se pode gerenciar atribuições
      if (response.data.data.relatorio?.pode_gerenciar_atribuicoes) {
        console.log('🔄 Carregando usuários disponíveis para relatório:', relatorioId);
        try {
          const usuariosResponse = await axios.get(`/api/relatorios/${relatorioId}/usuarios-disponiveis`);
          console.log('📊 Resposta dos usuários:', usuariosResponse.data);
          
          if (usuariosResponse.data.success) {
            const { usuarios: usuariosDisponiveis, debug } = usuariosResponse.data.data;
            console.log('👥 Usuários disponíveis carregados:', usuariosDisponiveis.length);
            console.log('🐛 Debug info:', debug);
            
            setUsuarios(usuariosDisponiveis);
          } else {
            console.error('❌ Erro na resposta:', usuariosResponse.data.message);
            setError(`Erro ao carregar usuários: ${usuariosResponse.data.message}`);
          }
        } catch (usuariosError: any) {
          console.error('❌ Erro ao carregar usuários disponíveis:', usuariosError);
          console.error('📄 Detalhes:', usuariosError.response?.data);
          
          const errorMessage = usuariosError.response?.data?.message || usuariosError.message;
          setError(`Erro ao carregar lista de usuários: ${errorMessage}`);
          
          // Não bloquear o carregamento do resto dos dados se os usuários falharem
        }
      } else {
        console.log('⚠️ Usuário não tem permissão para gerenciar atribuições');
      }

    } catch (error: any) {
      console.error('❌ Erro geral ao carregar dados:', error);
      setError('Erro ao carregar dados do histórico');
    } finally {
      setLoading(false);
    }
  };

  const adicionarHistorico = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('descricao', novoHistorico.descricao);
      formData.append('progresso', novoHistorico.progresso.toString());
      
      // Adicionar arquivos
      arquivos.forEach(arquivo => {
        formData.append('anexos', arquivo);
      });

      await axios.post(`/api/relatorios/${relatorioId}/historico`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Histórico adicionado com sucesso!');
      setModalHistorico(false);
      setNovoHistorico({ descricao: '', progresso: 0 });
      setArquivos([]);
      carregarDados();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao adicionar histórico');
    } finally {
      setLoading(false);
    }
  };

  const salvarAtribuicoes = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post(`/api/relatorios/${relatorioId}/atribuicoes`, {
        usuario_ids: usuariosSelecionados
      });

      if (response.data.success) {
        setSuccess('Atribuições atualizadas com sucesso!');
        setModalAtribuicoes(false);
        setUsuariosSelecionados([]);
        carregarDados();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao atualizar atribuições');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const formatarTamanho = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Função para construir URL da imagem
  const construirUrlImagem = (anexo: any) => {
    // Usar o nome_arquivo que contém o nome gerado pelo multer
    const filename = anexo.nome_arquivo;
    const url = `/api/relatorios/uploads/${filename}`;
    return url;
  };

  // Função para obter nome de exibição (nome original ou nome do arquivo)
  const obterNomeExibicao = (anexo: any) => {
    return anexo.nome_original || anexo.nome_arquivo;
  };

  // Função para visualizar imagem
  const visualizarImagem = (anexo: any) => {
    setImagemSelecionada(anexo);
    setModalImagemAberto(true);
  };

  // Função para fazer download de arquivo
  const downloadArquivo = (anexo: any) => {
    const link = document.createElement('a');
    link.href = construirUrlImagem(anexo);
    link.download = anexo.nome_arquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          badge: 'bg-yellow-100 text-yellow-800',
          icon: 'text-yellow-600'
        };
      case 'em_andamento':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200', 
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800',
          icon: 'text-blue-600'
        };
      case 'resolvido':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800', 
          badge: 'bg-green-100 text-green-800',
          icon: 'text-green-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          badge: 'bg-gray-100 text-gray-800',
          icon: 'text-gray-600'
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return Clock;
      case 'em_andamento':
        return AlertTriangle;
      case 'resolvido':
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'em_andamento':
        return 'Em Andamento';
      case 'resolvido':
        return 'Resolvido';
      default:
        return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mr-2 sm:mr-4 truncate">
              Histórico e Atribuições
            </h2>
            {relatorio && (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  relatorio.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                  relatorio.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {relatorio.status === 'pendente' ? 'Pendente' :
                   relatorio.status === 'em_andamento' ? 'Em Andamento' : 'Resolvido'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  relatorio.prioridade === 'baixa' ? 'bg-gray-100 text-gray-800' :
                  relatorio.prioridade === 'media' ? 'bg-yellow-100 text-yellow-800' :
                  relatorio.prioridade === 'alta' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {relatorio.prioridade === 'baixa' ? 'Baixa' :
                   relatorio.prioridade === 'media' ? 'Média' :
                   relatorio.prioridade === 'alta' ? 'Alta' : 'Crítica'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Informações do Relatório */}
        {relatorio && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{relatorio.titulo}</h3>
                <p className="text-sm text-gray-600 mt-1 truncate">{relatorio.equipamento_nome} - {relatorio.local_nome}</p>
              </div>
              <div className="flex items-center lg:justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Progresso</p>
                  <div className="flex items-center">
                    <div className="w-20 sm:w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${relatorio.progresso_calculado}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {relatorio.progresso_calculado}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alertas de Permissão */}
        {relatorio && !relatorio.pode_editar && relatorio.editavel && (
          <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-200">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Você não tem permissão para editar este relatório. Apenas o criador e usuários atribuídos podem fazer alterações.
              </p>
            </div>
          </div>
        )}

        {relatorio && !relatorio.editavel && (
          <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">
                Este relatório foi resolvido e não pode mais ser editado.
              </p>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            {relatorio?.pode_editar && relatorio.editavel && (
              <button
                onClick={() => setModalHistorico(true)}
                className="btn-primary flex items-center justify-center order-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Atualização
              </button>
            )}
            
            {relatorio?.pode_gerenciar_atribuicoes && relatorio.status !== 'resolvido' && (
              <button
                onClick={() => {
                  setUsuariosSelecionados(atribuicoes.map(a => a.usuario_id));
                  setModalAtribuicoes(true);
                }}
                className="btn-secondary flex items-center justify-center order-2"
              >
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Atribuições
              </button>
            )}

            {(!relatorio?.pode_editar || !relatorio?.editavel) && (
              <div className="text-sm text-gray-500 flex items-center justify-center order-3">
                <Eye className="h-4 w-4 mr-2" />
                Modo visualização
              </div>
            )}

            {relatorio?.status === 'resolvido' && (
              <div className="text-sm text-green-600 flex items-center justify-center order-3 bg-green-50 px-4 py-2 rounded-lg">
                <CheckCircle className="h-4 w-4 mr-2" />
                Relatório Concluído - Atribuições Bloqueadas
              </div>
            )}
          </div>
        </div>

        {/* Mensagens */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mx-4 sm:mx-6 mt-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 200px)' }}>
          {/* Usuários Atribuídos */}
          {atribuicoes.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Colaboradores Atribuídos ({atribuicoes.length})
                </h4>
                {relatorio?.pode_gerenciar_atribuicoes && relatorio.status !== 'resolvido' && (
                  <button
                    onClick={() => {
                      setUsuariosSelecionados(atribuicoes.map(a => a.usuario_id));
                      setModalAtribuicoes(true);
                    }}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Gerenciar
                  </button>
                )}
              </div>

              {relatorio?.status === 'resolvido' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Relatório Concluído</p>
                      <p className="text-sm text-green-700 mt-1">
                        Este relatório foi resolvido. As atribuições estão bloqueadas e não podem mais ser alteradas.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Permissões dos Colaboradores</p>
                      <p className="text-sm text-green-700 mt-1">
                        Os usuários listados abaixo podem adicionar atualizações, alterar progresso e anexar arquivos neste relatório.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {atribuicoes.map((atribuicao) => (
                  <div key={atribuicao.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{atribuicao.usuario_nome}</p>
                            <p className="text-sm text-gray-600">{atribuicao.usuario_email}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center text-xs text-gray-500">
                            <span>Atribuído por <strong>{atribuicao.atribuido_por_nome}</strong></span>
                            <span className="mx-2">•</span>
                            <span>{formatarData(atribuicao.data_atribuicao)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Colaborador
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aviso se não há atribuições */}
          {atribuicoes.length === 0 && (
            <div className="mb-6">
              {relatorio?.status === 'resolvido' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-green-900">Relatório Concluído</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Este relatório foi resolvido sem colaboradores atribuídos. O sistema não permite mais modificações.
                      </p>
                    </div>
                  </div>
                </div>
              ) : relatorio?.pode_gerenciar_atribuicoes ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-900">Nenhum colaborador atribuído</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Este relatório não possui colaboradores atribuídos. Apenas você (criador) pode editá-lo. 
                        <button 
                          onClick={() => setModalAtribuicoes(true)}
                          className="font-medium underline hover:no-underline ml-1"
                        >
                          Clique aqui para adicionar colaboradores
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Eye className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Sem colaboradores atribuídos</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Este relatório não possui colaboradores atribuídos e você não tem permissão para gerenciar atribuições.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Histórico */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Histórico de Atualizações ({historico.length})
            </h4>
            
            {historico.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                {relatorio?.status === 'resolvido' ? (
                  <div>
                    <p className="text-gray-600">Este relatório foi resolvido sem atualizações registradas</p>
                    <p className="text-sm text-gray-500 mt-2">
                      O relatório foi marcado como concluído diretamente
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600">Nenhuma atualização registrada ainda</p>
                    {relatorio?.pode_editar && relatorio.editavel && (
                      <p className="text-sm text-gray-500 mt-2">
                        Clique em "Adicionar Atualização" para registrar o primeiro progresso
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {historico.map((item) => {
                  const statusColors = getStatusColor(item.status_novo);
                  const StatusIcon = getStatusIcon(item.status_novo);
                  const statusAnteriorColors = getStatusColor(item.status_anterior);
                  const StatusAnteriorIcon = getStatusIcon(item.status_anterior);
                  
                  return (
                    <div key={item.id} className={`border rounded-lg p-4 ${statusColors.border} ${statusColors.bg}`}>
                      {/* Header com informações do usuário e mudança de status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{item.usuario_nome}</span>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-sm text-gray-500">{formatarData(item.data_atualizacao)}</span>
                          </div>
                        </div>
                        <div className="flex items-center ml-4">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${item.progresso}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">{item.progresso}%</span>
                        </div>
                      </div>

                      {/* Mudança de Status */}
                      {item.status_anterior !== item.status_novo && (
                        <div className="mb-3 p-3 bg-white rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-medium text-gray-500 mb-2">MUDANÇA DE STATUS</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusAnteriorColors.badge}`}>
                                <StatusAnteriorIcon className={`h-3 w-3 mr-1 ${statusAnteriorColors.icon}`} />
                                {getStatusLabel(item.status_anterior)}
                              </span>
                            </div>
                            <div className="flex items-center mx-4">
                              <div className="h-px bg-gray-300 flex-1 w-8"></div>
                              <span className="text-gray-400 mx-2">→</span>
                              <div className="h-px bg-gray-300 flex-1 w-8"></div>
                            </div>
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.badge}`}>
                                <StatusIcon className={`h-3 w-3 mr-1 ${statusColors.icon}`} />
                                {getStatusLabel(item.status_novo)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Descrição da atualização */}
                      <div className="mb-3">
                        <p className={`whitespace-pre-wrap ${statusColors.text} font-medium`}>{item.descricao}</p>
                      </div>
                      
                      {/* Anexos */}
                      {item.anexos && item.anexos.length > 0 && (
                        <div className="border-t border-gray-100 pt-3 mt-3">
                          <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            Anexos ({item.anexos.length})
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {item.anexos.map((anexo) => (
                              <div key={anexo.id} className="bg-white rounded-lg border hover:border-blue-300 transition-colors">
                                {anexo.tipo_mime.startsWith('image/') ? (
                                  // Card para imagens
                                  <div className="cursor-pointer" onClick={() => visualizarImagem(anexo)}>
                                    <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                                      <img
                                        src={construirUrlImagem(anexo)}
                                        alt={obterNomeExibicao(anexo)}
                                        className="w-full h-full object-cover hover:scale-105 transition-transform"
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
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate" title={obterNomeExibicao(anexo)}>
                                            {obterNomeExibicao(anexo)}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {formatarTamanho(anexo.tamanho_arquivo)}
                                          </p>
                                        </div>
                                        <div className="flex items-center space-x-1 ml-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              visualizarImagem(anexo);
                                            }}
                                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                            title="Visualizar imagem"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              downloadArquivo(anexo);
                                            }}
                                            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                            title="Download"
                                          >
                                            <Download className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // Card para outros arquivos
                                  <div className="p-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center flex-1 min-w-0">
                                        <FileText className="h-8 w-8 text-gray-600 mr-3 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate" title={obterNomeExibicao(anexo)}>
                                            {obterNomeExibicao(anexo)}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {formatarTamanho(anexo.tamanho_arquivo)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-1 ml-2">
                                        <button
                                          onClick={() => window.open(construirUrlImagem(anexo), '_blank')}
                                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                          title="Abrir arquivo"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => downloadArquivo(anexo)}
                                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                          title="Download"
                                        >
                                          <Download className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Adicionar Histórico */}
        {modalHistorico && relatorio?.pode_editar && relatorio.editavel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Adicionar Atualização</h3>
                  <button
                    onClick={() => {
                      setModalHistorico(false);
                      setNovoHistorico({ descricao: '', progresso: 0 });
                      setArquivos([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={adicionarHistorico} className="space-y-4">
                  <div>
                    <label className="form-label">Descrição da Atualização</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      value={novoHistorico.descricao}
                      onChange={(e) => setNovoHistorico({...novoHistorico, descricao: e.target.value})}
                      required
                      placeholder="Descreva o progresso ou atualização realizada..."
                    />
                  </div>

                  <div>
                    <label className="form-label">Progresso (%)</label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          className="flex-1"
                          value={novoHistorico.progresso}
                          onChange={(e) => setNovoHistorico({...novoHistorico, progresso: parseInt(e.target.value)})}
                        />
                        <div className="w-16 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full text-center text-sm border border-gray-300 rounded px-2 py-1"
                            value={novoHistorico.progresso}
                            onChange={(e) => setNovoHistorico({...novoHistorico, progresso: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))})}
                          />
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${novoHistorico.progresso}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Anexos (opcional)</label>
                    <input
                      type="file"
                      className="form-input"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => setArquivos(Array.from(e.target.files || []))}
                    />
                    {arquivos.length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">
                          <strong>{arquivos.length}</strong> arquivo(s) selecionado(s)
                        </p>
                        <div className="mt-1 space-y-1">
                          {arquivos.map((arquivo, index) => (
                            <div key={index} className="text-xs text-gray-500 truncate">
                              • {arquivo.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setModalHistorico(false);
                        setNovoHistorico({ descricao: '', progresso: 0 });
                        setArquivos([]);
                      }}
                      className="btn-secondary flex-1 order-2 sm:order-1"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary flex-1 order-1 sm:order-2">
                      Adicionar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Atribuições */}
        {modalAtribuicoes && relatorio?.pode_gerenciar_atribuicoes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
                <h3 className="text-lg md:text-xl font-medium text-gray-900">Gerenciar Atribuições</h3>
                <button
                  onClick={() => {
                    setModalAtribuicoes(false);
                    setUsuariosSelecionados([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-6">
                <div className="mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <Users className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">Atribuições de Responsabilidade</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Selecione quais usuários poderão <strong>editar</strong> este relatório e <strong>adicionar atualizações</strong> no histórico. 
                          Usuários não atribuídos poderão apenas <strong>visualizar</strong> o conteúdo.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <label className="form-label mb-0">Colaboradores do Sistema</label>
                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {usuariosSelecionados.length} de {usuarios.length} selecionados
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden border border-gray-200 rounded-lg">
                  {usuarios.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum usuário disponível para atribuição</p>
                    </div>
                  ) : (
                    <div className="h-full overflow-y-auto">
                      {/* Lista para mobile */}
                      <div className="sm:hidden divide-y divide-gray-100">
                        {usuarios.map(usuario => (
                          <label 
                            key={usuario.id} 
                            className={`flex items-start p-4 active:bg-gray-100 ${
                              usuariosSelecionados.includes(usuario.id) ? 'bg-blue-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1 mr-3 flex-shrink-0"
                              checked={usuariosSelecionados.includes(usuario.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setUsuariosSelecionados([...usuariosSelecionados, usuario.id]);
                                } else {
                                  setUsuariosSelecionados(usuariosSelecionados.filter(id => id !== usuario.id));
                                }
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center flex-wrap gap-2">
                                    <span className="text-sm font-medium text-gray-900">{usuario.nome}</span>
                                    {usuario.ja_atribuido && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Já atribuído
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500 truncate">{usuario.email}</div>
                                  <div className="flex items-center text-xs text-gray-400 mt-1 gap-2">
                                    <span>{usuario.setor}</span>
                                    <span className={`px-1.5 py-0.5 rounded ${
                                      usuario.nivel_acesso === 'admin_master' ? 'bg-red-100 text-red-700' :
                                      usuario.nivel_acesso === 'admin' ? 'bg-purple-100 text-purple-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {usuario.nivel_acesso === 'admin_master' ? 'Admin Master' :
                                       usuario.nivel_acesso === 'admin' ? 'Admin' : 'Usuário'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Lista para desktop */}
                      <div className="hidden sm:block divide-y divide-gray-100">
                        {usuarios.map(usuario => (
                          <label 
                            key={usuario.id} 
                            className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                              usuariosSelecionados.includes(usuario.id) ? 'bg-blue-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              checked={usuariosSelecionados.includes(usuario.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setUsuariosSelecionados([...usuariosSelecionados, usuario.id]);
                                } else {
                                  setUsuariosSelecionados(usuariosSelecionados.filter(id => id !== usuario.id));
                                }
                              }}
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-900">{usuario.nome}</span>
                                    {usuario.ja_atribuido && (
                                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Já atribuído
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">{usuario.email}</div>
                                  <div className="flex items-center text-xs text-gray-400 mt-1">
                                    <span>{usuario.setor}</span>
                                    <span className="mx-1">•</span>
                                    <span className={`px-1.5 py-0.5 rounded ${
                                      usuario.nivel_acesso === 'admin_master' ? 'bg-red-100 text-red-700' :
                                      usuario.nivel_acesso === 'admin' ? 'bg-purple-100 text-purple-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {usuario.nivel_acesso === 'admin_master' ? 'Admin Master' :
                                       usuario.nivel_acesso === 'admin' ? 'Admin' : 'Usuário'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Permissões dos Usuários Atribuídos:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      Adicionar atualizações no histórico
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      Alterar progresso do relatório
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      Anexar arquivos nas atualizações
                    </li>
                    <li className="flex items-center">
                      <X className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                      Editar informações básicas do relatório
                    </li>
                    <li className="flex items-center">
                      <X className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                      Gerenciar outras atribuições
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setModalAtribuicoes(false);
                      setUsuariosSelecionados([]);
                    }}
                    className="btn-secondary flex-1 order-2 sm:order-1"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarAtribuicoes}
                    className="btn-primary flex-1 order-1 sm:order-2"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar Atribuições'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Visualização de Imagem */}
        {modalImagemAberto && imagemSelecionada && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {obterNomeExibicao(imagemSelecionada)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatarTamanho(imagemSelecionada.tamanho_arquivo)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => downloadArquivo(imagemSelecionada)}
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
                    src={construirUrlImagem(imagemSelecionada)}
                    alt={obterNomeExibicao(imagemSelecionada)}
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
                            <p class="text-xs mt-2 text-gray-400">Arquivo: ${obterNomeExibicao(imagemSelecionada)}</p>
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
    </div>
  );
};

export default RelatorioHistorico; 