import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Plus, Edit2, Trash2, Users, AlertCircle, CheckCircle, Search, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { API_BASE_URL } from '../config/api';

interface Setor {
  id: number;
  nome_setor: string;
  descricao: string;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

interface Usuario {
  id: number;
  nome: string;
  username: string;
  email: string;
  nivel_acesso: string;
  ativo: boolean;
  data_criacao: string;
}

// Componente Tooltip simples
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
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

const Setores: React.FC = () => {
  const { usuario, hasPermission } = useAuth();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para modal de criação/edição
  const [showModal, setShowModal] = useState(false);
  const [editandoSetor, setEditandoSetor] = useState<Setor | null>(null);
  const [formulario, setFormulario] = useState({
    nome_setor: '',
    descricao: '',
    ativo: true
  });

  // Estados para modal de usuários
  const [showUsuariosModal, setShowUsuariosModal] = useState(false);
  const [usuariosSetor, setUsuariosSetor] = useState<Usuario[]>([]);
  const [setorSelecionado, setSetorSelecionado] = useState<Setor | null>(null);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    ativo: 'todos'
  });

  useEffect(() => {
    // Só carrega setores se tiver permissão
    if (hasPermission(['admin_master'])) {
      carregarSetores();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);

  // Verificar permissão após hooks
  if (!hasPermission(['admin_master'])) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Acesso Negado
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Apenas administradores master podem gerenciar setores.
          </p>
        </div>
      </div>
    );
  }

  const carregarSetores = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/setores`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSetores(data.data);
      } else {
        throw new Error('Erro ao carregar setores');
      }
    } catch (error) {
      setError('Erro ao carregar setores');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editandoSetor 
        ? `${API_BASE_URL}/setores/${editandoSetor.id}`
        : `${API_BASE_URL}/setores`;
      
      const method = editandoSetor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formulario)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setShowModal(false);
        resetFormulario();
        carregarSetores();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Erro ao salvar setor');
      console.error('Erro:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExcluir = async (setor: Setor) => {
    if (!window.confirm(`Tem certeza que deseja excluir o setor "${setor.nome_setor}"?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/setores/${setor.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        carregarSetores();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Erro ao excluir setor');
      console.error('Erro:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const abrirModalEdicao = (setor: Setor) => {
    setEditandoSetor(setor);
    setFormulario({
      nome_setor: setor.nome_setor,
      descricao: setor.descricao || '',
      ativo: setor.ativo
    });
    setShowModal(true);
  };

  const resetFormulario = () => {
    setEditandoSetor(null);
    setFormulario({
      nome_setor: '',
      descricao: '',
      ativo: true
    });
  };

  const visualizarUsuarios = async (setor: Setor) => {
    setSetorSelecionado(setor);
    setLoadingUsuarios(true);
    setShowUsuariosModal(true);

    try {
      const response = await fetch(`${API_BASE_URL}/setores/${setor.id}/usuarios`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsuariosSetor(data.data.usuarios);
      } else {
        throw new Error('Erro ao carregar usuários');
      }
    } catch (error) {
      setError('Erro ao carregar usuários do setor');
      console.error('Erro:', error);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Filtrar setores
  const setoresFiltrados = setores.filter(setor => {
    const matchBusca = setor.nome_setor.toLowerCase().includes(filtros.busca.toLowerCase()) ||
                     (setor.descricao && setor.descricao.toLowerCase().includes(filtros.busca.toLowerCase()));
    
    const matchAtivo = filtros.ativo === 'todos' || 
                      (filtros.ativo === 'ativo' && setor.ativo) ||
                      (filtros.ativo === 'inativo' && !setor.ativo);

    return matchBusca && matchAtivo;
  });

  if (loading) {
    return <LoadingSpinner size="xl" text="Carregando setores..." fullScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Gerenciamento de Setores
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gerencie os setores da organização
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetFormulario();
              setShowModal(true);
            }}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Setor
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar Setor
            </label>
            <div className="relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nome ou descrição do setor..."
                value={filtros.busca}
                onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
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
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Setores */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Setores ({setoresFiltrados.length})
          </h3>
        </div>

        {setoresFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {filtros.busca || filtros.ativo !== 'todos' 
                ? 'Nenhum setor encontrado com os filtros aplicados'
                : 'Nenhum setor cadastrado'
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
                        Setor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Descrição
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
                    {setoresFiltrados.map((setor) => (
                      <tr key={setor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {setor.nome_setor}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {setor.descricao || 'Sem descrição'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            setor.ativo
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}>
                            {setor.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(setor.data_criacao).toLocaleDateString('pt-BR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <Tooltip content="Visualizar Usuários">
                              <button
                                onClick={() => visualizarUsuarios(setor)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              >
                                <Users className="h-4 w-4" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Editar Setor">
                              <button
                                onClick={() => abrirModalEdicao(setor)}
                                className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </Tooltip>
                            <Tooltip content="Excluir Setor">
                              <button
                                onClick={() => handleExcluir(setor)}
                                disabled={actionLoading}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
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
            <div className="lg:hidden space-y-4 p-4">
              {setoresFiltrados.map((setor) => (
                <div key={setor.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {setor.nome_setor}
                      </h3>
                      {setor.descricao && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {setor.descricao}
                        </p>
                      )}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-3 ${
                      setor.ativo 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                      {setor.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-300">INFORMAÇÕES</span>
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <div>Criado em: {new Date(setor.data_criacao).toLocaleDateString('pt-BR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</div>
                        <div className="text-xs mt-1">
                          ID: {setor.id}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Tooltip content="Visualizar Usuários">
                      <button
                        onClick={() => visualizarUsuarios(setor)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Users className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Editar Setor">
                      <button
                        onClick={() => abrirModalEdicao(setor)}
                        className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Excluir Setor">
                      <button
                        onClick={() => handleExcluir(setor)}
                        disabled={actionLoading}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {editandoSetor ? 'Editar Setor' : 'Novo Setor'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome do Setor *
                      </label>
                      <input
                        type="text"
                        required
                        value={formulario.nome_setor}
                        onChange={(e) => setFormulario({...formulario, nome_setor: e.target.value})}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Ex: Recursos Humanos"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Descrição
                      </label>
                      <textarea
                        rows={3}
                        value={formulario.descricao}
                        onChange={(e) => setFormulario({...formulario, descricao: e.target.value})}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        placeholder="Descrição opcional do setor..."
                      />
                    </div>

                    {editandoSetor && (
                      <div className="flex items-center">
                        <input
                          id="ativo"
                          type="checkbox"
                          checked={formulario.ativo}
                          onChange={(e) => setFormulario({...formulario, ativo: e.target.checked})}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                          Setor ativo
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {actionLoading ? 'Salvando...' : (editandoSetor ? 'Atualizar' : 'Criar')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Usuários do Setor */}
      {showUsuariosModal && setorSelecionado && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowUsuariosModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Usuários do Setor: {setorSelecionado.nome_setor}
                  </h3>
                  <button
                    onClick={() => setShowUsuariosModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {loadingUsuarios ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="md" text="Carregando usuários..." />
                  </div>
                ) : usuariosSetor.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhum usuário encontrado neste setor
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                    {usuariosSetor.map((user) => (
                      <div key={user.id} className="py-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {user.nome}
                            </h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.ativo 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {user.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {user.email} • {user.username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Nível: {user.nivel_acesso.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Setores; 