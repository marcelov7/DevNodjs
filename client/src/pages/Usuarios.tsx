import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Eye, 
  EyeOff,
  UserPlus,
  Filter,
  Shield,
  User,
  Mail,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

// Componente Tooltip simples
const TooltipInline: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap z-50">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  );
};

interface Usuario {
  id: number;
  nome: string;
  username: string;
  email: string;
  setor: string;
  nivel_acesso: 'admin_master' | 'admin' | 'usuario' | 'visitante';
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

interface Setor {
  id: number;
  nome_setor: string;
}

interface FiltrosUsuario {
  nome: string;
  nivel_acesso: string;
  ativo: string;
  setor: string;
}

const Usuarios: React.FC = () => {
  const { usuario, hasPageAccess } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSetores, setLoadingSetores] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados do modal
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [visualizando, setVisualizando] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  // Estados do formulário
  const [formulario, setFormulario] = useState({
    nome: '',
    username: '',
    email: '',
    senha: '',
    setor: '',
    nivel_acesso: 'usuario' as 'admin_master' | 'admin' | 'usuario' | 'visitante',
    ativo: true
  });

  // Estados de filtros e paginação
  const [filtros, setFiltros] = useState<FiltrosUsuario>({
    nome: '',
    nivel_acesso: '',
    ativo: '',
    setor: ''
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalUsuarios, setTotalUsuarios] = useState(0);

  const niveisAcesso = [
    { value: 'admin_master', label: 'Admin Master' },
    { value: 'admin', label: 'Admin' },
    { value: 'usuario', label: 'Usuário' },
    { value: 'visitante', label: 'Visitante' }
  ];

  useEffect(() => {
    carregarUsuarios();
    carregarSetores();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: paginaAtual.toString(),
        limit: '10',
        ...Object.fromEntries(Object.entries(filtros).filter(([_, v]) => v !== ''))
      });

      const response = await axios.get(`/api/usuarios?${params}`);
      
      if (response.data.success) {
        setUsuarios(response.data.data.usuarios);
        setTotalPaginas(response.data.data.totalPaginas);
        setTotalUsuarios(response.data.data.totalUsuarios);
      }
    } catch (error) {
      setError('Erro ao carregar usuários');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const carregarSetores = async () => {
    try {
      setLoadingSetores(true);
      const response = await fetch(`${API_BASE_URL}/setores/dropdown/ativos`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSetores(data.data);
      } else {
        console.error('Erro ao carregar setores');
      }
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    } finally {
      setLoadingSetores(false);
    }
  };

  const abrirModal = (usuarioParaEditar?: Usuario, somenteVisualizacao = false) => {
    if (usuarioParaEditar) {
      setUsuarioEditando(usuarioParaEditar);
      setFormulario({
        nome: usuarioParaEditar.nome,
        username: usuarioParaEditar.username,
        email: usuarioParaEditar.email,
        senha: '',
        setor: usuarioParaEditar.setor,
        nivel_acesso: usuarioParaEditar.nivel_acesso,
        ativo: usuarioParaEditar.ativo
      });
    } else {
      setUsuarioEditando(null);
      setFormulario({
        nome: '',
        username: '',
        email: '',
        senha: '',
        setor: '',
        nivel_acesso: 'usuario',
        ativo: true
      });
    }
    setVisualizando(somenteVisualizacao);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setUsuarioEditando(null);
    setVisualizando(false);
    setSenhaVisivel(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (usuarioEditando) {
        // Editar usuário
        const dados = { ...formulario };
        if (!dados.senha) {
          delete (dados as any).senha; // Remove senha vazia
        }
        
        await axios.put(`/api/usuarios/${usuarioEditando.id}`, dados);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        // Criar usuário
        await axios.post('/usuarios', formulario);
        setSuccess('Usuário criado com sucesso!');
      }
      
      fecharModal();
      carregarUsuarios();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const excluirUsuario = async (id: number, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja desativar o usuário "${nome}"?`)) {
      return;
    }

    try {
      await axios.delete(`/api/usuarios/${id}`);
      setSuccess('Usuário desativado com sucesso!');
      carregarUsuarios();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao desativar usuário');
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getLabelNivelAcesso = (nivel: string) => {
    const item = niveisAcesso.find(n => n.value === nivel);
    return item?.label || nivel;
  };

  const getCorNivelAcesso = (nivel: string) => {
    switch (nivel) {
      case 'admin_master': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800';
      case 'admin': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'usuario': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800';
      case 'visitante': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  // Verificar se tem acesso à página de usuários
  if (!hasPageAccess('usuarios')) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p className="text-red-700 dark:text-red-400">Acesso negado. Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Gestão de Usuários
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gerencie usuários do sistema e seus níveis de acesso
              </p>
            </div>
          </div>
          <button
            onClick={() => abrirModal()}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <div className="text-sm text-green-700 dark:text-green-400">{success}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome/Username
            </label>
            <div className="relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome ou username..."
                value={filtros.nome}
                onChange={(e) => setFiltros({...filtros, nome: e.target.value})}
                className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nível de Acesso
            </label>
            <select
              value={filtros.nivel_acesso}
              onChange={(e) => setFiltros({...filtros, nivel_acesso: e.target.value})}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Todos os níveis</option>
              {niveisAcesso.map(nivel => (
                <option key={nivel.value} value={nivel.value}>
                  {nivel.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filtros.ativo}
              onChange={(e) => setFiltros({...filtros, ativo: e.target.value})}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Todos</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Setor
            </label>
            <select
              value={filtros.setor}
              onChange={(e) => setFiltros({...filtros, setor: e.target.value})}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Todos os setores</option>
              {setores.map(setor => (
                <option key={setor.id} value={setor.nome_setor}>
                  {setor.nome_setor}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Usuários ({totalUsuarios})
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando usuários...</p>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {filtros.nome || filtros.nivel_acesso || filtros.ativo || filtros.setor
                ? 'Nenhum usuário encontrado com os filtros aplicados'
                : 'Nenhum usuário cadastrado'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Setor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nível de Acesso
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
                    {usuarios.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {user.nome}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              @{user.username}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{user.setor}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCorNivelAcesso(user.nivel_acesso)}`}>
                            {getLabelNivelAcesso(user.nivel_acesso)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.ativo 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}>
                            {user.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatarData(user.data_criacao)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <TooltipInline content="Visualizar Detalhes">
                              <button
                                onClick={() => abrirModal(user, true)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </TooltipInline>
                            <TooltipInline content="Editar Usuário">
                              <button
                                onClick={() => abrirModal(user)}
                                className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </TooltipInline>
                            {user.ativo && (
                              <TooltipInline content="Desativar Usuário">
                                <button
                                  onClick={() => excluirUsuario(user.id, user.nome)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </TooltipInline>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards Mobile/Tablet - Design Moderno */}
            <div className="lg:hidden space-y-4 p-4">
              {usuarios.map((user) => (
                <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {user.nome}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        @{user.username}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.ativo 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                          : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCorNivelAcesso(user.nivel_acesso)}`}>
                        {getLabelNivelAcesso(user.nivel_acesso)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">CONTATO</span>
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <div className="break-all">{user.email}</div>
                        <div className="flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {user.setor}
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-300">SISTEMA</span>
                      </div>
                      <div className="text-sm text-green-800 dark:text-green-300">
                        <div>Criado em: {formatarData(user.data_criacao)}</div>
                        <div className="text-xs mt-1">
                          ID: {user.id}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => abrirModal(user, true)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Visualizar detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => abrirModal(user)}
                      className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                      title="Editar usuário"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {user.ativo && (
                      <button
                        onClick={() => excluirUsuario(user.id, user.nome)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Desativar usuário"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando {(paginaAtual - 1) * 10 + 1} a {Math.min(paginaAtual * 10, totalUsuarios)} de {totalUsuarios} usuários
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPaginaAtual(paginaAtual - 1)}
                      disabled={paginaAtual === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPaginaAtual(paginaAtual + 1)}
                      disabled={paginaAtual === totalPaginas}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
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
                          Detalhes do Usuário
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          Informações completas do usuário selecionado
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
                    {/* Informações Pessoais */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <User className="h-5 w-5 mr-2 text-blue-600" />
                        Informações Pessoais
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Nome Completo</dt>
                          <dd className="mt-1 text-lg font-semibold text-blue-900">{usuarioEditando?.nome}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Username</dt>
                          <dd className="mt-1 text-lg font-semibold text-blue-900">{usuarioEditando?.username}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Email</dt>
                          <dd className="mt-1 text-base text-blue-900 flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            {usuarioEditando?.email}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Setor</dt>
                          <dd className="mt-1 text-base text-blue-900 flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {usuarioEditando?.setor}
                          </dd>
                        </div>
                      </div>
                    </div>

                    {/* Acesso e Permissões */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-green-600" />
                        Acesso e Permissões
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Nível de Acesso</dt>
                          <dd className="mt-1">
                            <span className={`inline-flex items-center px-3 py-2 text-base font-semibold rounded-full ${usuarioEditando && getCorNivelAcesso(usuarioEditando.nivel_acesso)}`}>
                              <Shield className="h-4 w-4 mr-2" />
                              {usuarioEditando && getLabelNivelAcesso(usuarioEditando.nivel_acesso)}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Status</dt>
                          <dd className="mt-1">
                            <span className={`inline-flex items-center px-3 py-2 text-base font-semibold rounded-full ${
                              usuarioEditando?.ativo 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {usuarioEditando?.ativo ? 'Ativo' : 'Inativo'}
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
                            {usuarioEditando && formatarData(usuarioEditando.data_criacao)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-700 uppercase tracking-wide">Última Atualização</dt>
                          <dd className="mt-1 text-sm text-gray-600 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {usuarioEditando && formatarData(usuarioEditando.data_atualizacao)}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé com Ações */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setVisualizando(false)}
                        className="btn btn-secondary"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar Usuário
                      </button>
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
                      {usuarioEditando ? 'Editar Usuário' : 'Novo Usuário'}
                    </h3>
                    <button
                      onClick={fecharModal}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="form-label">Nome Completo</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        value={formulario.nome}
                        onChange={(e) => setFormulario({...formulario, nome: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="form-label">Username</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        value={formulario.username}
                        onChange={(e) => setFormulario({...formulario, username: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        required
                        className="form-input"
                        value={formulario.email}
                        onChange={(e) => setFormulario({...formulario, email: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="form-label">
                        {usuarioEditando ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
                      </label>
                      <div className="relative">
                        <input
                          type={senhaVisivel ? "text" : "password"}
                          required={!usuarioEditando}
                          className="form-input pr-10"
                          value={formulario.senha}
                          onChange={(e) => setFormulario({...formulario, senha: e.target.value})}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setSenhaVisivel(!senhaVisivel)}
                        >
                          {senhaVisivel ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Setor</label>
                      {loadingSetores ? (
                        <div className="form-input flex items-center">
                          <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                          Carregando setores...
                        </div>
                      ) : (
                        <select
                          required
                          className="form-input"
                          value={formulario.setor}
                          onChange={(e) => setFormulario({...formulario, setor: e.target.value})}
                        >
                          <option value="">Selecione um setor</option>
                          {setores.map(setor => (
                            <option key={setor.id} value={setor.nome_setor}>
                              {setor.nome_setor}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Nível de Acesso</label>
                      <select
                        required
                        className="form-input"
                        value={formulario.nivel_acesso}
                        onChange={(e) => setFormulario({...formulario, nivel_acesso: e.target.value as any})}
                      >
                        {niveisAcesso.map(nivel => (
                          <option key={nivel.value} value={nivel.value}>
                            {nivel.label}
                          </option>
                        ))}
                      </select>
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
                        Usuário ativo
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
                        {loading ? 'Salvando...' : (usuarioEditando ? 'Atualizar' : 'Criar')}
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

export default Usuarios; 