import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import { useAccessibility } from '../contexts/AccessibilityContext';

interface Estatisticas {
  totais: {
    usuarios: number;
    locais: number;
    equipamentos: number;
    motores: number;
    relatorios: number;
  };
}

interface RelatorioRecente {
  id: number;
  titulo: string;
  status: string;
  prioridade: string;
  data_criacao: string;
  usuario_nome: string;
  local_nome: string;
  equipamento_nome: string;
}

const Dashboard: React.FC = () => {
  const { usuario, hasResourcePermission } = useAuth();
  const { getStatusColor, getPriorityColor } = useAccessibility();
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [relatoriosRecentes, setRelatoriosRecentes] = useState<RelatorioRecente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      
      // Buscar estatísticas
      const [estatisticasRes, relatoriosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/dashboard/estatisticas`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/dashboard/relatorios-recentes?limit=5`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (estatisticasRes.ok) {
        const estatisticasData = await estatisticasRes.json();
        if (estatisticasData.success) {
          setEstatisticas(estatisticasData.data);
        }
      }

      if (relatoriosRes.ok) {
        const relatoriosData = await relatoriosRes.json();
        if (relatoriosData.success) {
          setRelatoriosRecentes(relatoriosData.data.relatorios);
        }
      }

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p className="text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Bem-vindo, {usuario?.nome}! Aqui está um resumo do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card Relatórios */}
        {hasResourcePermission('relatorios', 'visualizar') && (
          <div className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-sm font-medium text-white">R</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total de Relatórios</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {estatisticas?.totais.relatorios || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Card Usuários */}
        {hasResourcePermission('usuarios', 'visualizar') && (
          <div className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-sm font-medium text-white">U</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Usuários Ativos</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {estatisticas?.totais.usuarios || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Card Equipamentos */}
        {hasResourcePermission('equipamentos', 'visualizar') && (
          <div className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-sm font-medium text-white">E</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Equipamentos</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {estatisticas?.totais.equipamentos || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Card Locais */}
        {hasResourcePermission('locais', 'visualizar') && (
          <div className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-sm font-medium text-white">L</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Locais</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {estatisticas?.totais.locais || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Card Motores */}
        {hasResourcePermission('motores', 'visualizar') && (
          <div className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                  <span className="text-sm font-medium text-white">M</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Motores</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {estatisticas?.totais.motores || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção de Relatórios Recentes */}
      {hasResourcePermission('relatorios', 'visualizar') && (
        <div className="mt-8">
          <div className="card">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
                Relatórios Recentes
              </h3>
              
              {relatoriosRecentes.length > 0 ? (
                <div className="space-y-4">
                  {relatoriosRecentes.map((relatorio) => (
                    <div key={relatorio.id} className="border-l-4 border-primary-500 pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {relatorio.titulo}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {relatorio.equipamento_nome} - {relatorio.local_nome}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Por {relatorio.usuario_nome} em {formatarData(relatorio.data_criacao)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(relatorio.status)}`}>
                            {relatorio.status === 'pendente' && 'Pendente'}
                            {relatorio.status === 'em_andamento' && 'Em Andamento'}
                            {relatorio.status === 'resolvido' && 'Resolvido'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(relatorio.prioridade)}`}>
                            {relatorio.prioridade === 'baixa' && 'Baixa'}
                            {relatorio.prioridade === 'media' && 'Média'}
                            {relatorio.prioridade === 'alta' && 'Alta'}
                            {relatorio.prioridade === 'critica' && 'Crítica'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Nenhum relatório encontrado.</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Os relatórios criados aparecerão aqui.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 