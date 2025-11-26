import { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../services/api';
import dashboardService from '../services/dashboardService';
import { getRecentAccessLogs } from '../services/accessLogService';

export default function Dashboard() {
  // Estados para dados em tempo real
  const [recentLogs, setRecentLogs] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAccessesLast7Days: 0,
    grantedLast7Days: 0,
    deniedLast7Days: 0
  });
  const [lastLogId, setLastLogId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState('offline');
  const [isPolling, setIsPolling] = useState(true);
  
  // Estado para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  // Buscar estatísticas gerais (colaboradores e acessos dos últimos 7 dias)
  const fetchStats = useCallback(async () => {
    try {
      // Buscar contagem de usuários
      console.log('📊 Buscando contagem de usuários...');
      const usersResponse = await api.get('/users/');
      const totalUsers = usersResponse.data?.users?.length || 0;
      console.log(`👥 Total de usuários: ${totalUsers}`);

      // Buscar estatísticas via novo método do dashboardService
      console.log('📈 Buscando estatísticas de acesso...');
      const statsResponse = await dashboardService.getAccessStatistics({
        groupByDate: true,
        limit: 10000
      });

      console.log('📊 Estatísticas recebidas:', statsResponse);
      
      // Calcular totais a partir das estatísticas
      let totalAccessesLast7Days = 0;
      let grantedLast7Days = 0;
      let deniedLast7Days = 0;
      const chartDataMap = {};

      // Processar estatísticas por data
      if (statsResponse.byDate && Array.isArray(statsResponse.byDate)) {
        statsResponse.byDate.forEach(dateGroup => {
          const date = new Date(dateGroup.date);
          const dayKey = date.toLocaleDateString('pt-BR', { weekday: 'short' });
          
          if (!chartDataMap[dayKey]) {
            chartDataMap[dayKey] = { dia: dayKey, validados: 0, negados: 0 };
          }
          
          if (dateGroup.byEvent) {
            dateGroup.byEvent.forEach(eventGroup => {
              const count = eventGroup.count || 0;
              if (eventGroup.event === 'Acesso Concedido' || eventGroup.event === 'access_granted') {
                chartDataMap[dayKey].validados += count;
                grantedLast7Days += count;
              } else if (eventGroup.event === 'Acesso Negado' || eventGroup.event === 'access_denied') {
                chartDataMap[dayKey].negados += count;
                deniedLast7Days += count;
              }
            });
          }
        });
      }

      // Se não houver dados agrupados por data, tentar dados globais
      if (Object.keys(chartDataMap).length === 0 && statsResponse.byEvent) {
        statsResponse.byEvent.forEach(eventGroup => {
          const count = eventGroup.count || 0;
          if (eventGroup.event === 'Acesso Concedido' || eventGroup.event === 'access_granted') {
            grantedLast7Days += count;
          } else if (eventGroup.event === 'Acesso Negado' || eventGroup.event === 'access_denied') {
            deniedLast7Days += count;
          }
        });
        totalAccessesLast7Days = grantedLast7Days + deniedLast7Days;
      } else {
        totalAccessesLast7Days = grantedLast7Days + deniedLast7Days;
      }

      console.log('✅ Estatísticas processadas:', {
        totalAccessesLast7Days,
        grantedLast7Days,
        deniedLast7Days
      });

      setStats({
        totalUsers,
        totalAccessesLast7Days,
        grantedLast7Days,
        deniedLast7Days
      });

      
    } catch (err) {
      console.error('❌ Erro ao buscar estatísticas:', err);
      // Fallback silencioso - não interromper dashboard se endpoint falhar
    }
  }, []);

  // Buscar novos logs em tempo real (polling)
  const fetchNewLogs = useCallback(async () => {
    try {
      console.log('📡 Fetching realtime monitor data...');
      const data = await dashboardService.monitorFullStatus(lastLogId);

      console.log('📊 Monitor response:', data);

      if (data.success) {
        // Atualizar status do dispositivo
        const deviceOnline = data.deviceStatus === 'online';
        setDeviceStatus(deviceOnline ? 'online' : 'offline');
        console.log(`🔌 Device status: ${deviceOnline ? '🟢 online' : '🔴 offline'}`);

        // Se houver novos logs
        if (data.logs?.newCount > 0 && data.logs?.newlyFound?.length > 0) {
          console.log(`🔔 ${data.logs.newCount} novo(s) log(s) detectado(s)!`);
          
          // Formatar e adicionar novos logs ao início da lista
          const formattedNewLogs = dashboardService.processLogsResponse({
            success: true,
            newLogs: data.logs.newlyFound
          });

          setRecentLogs(prev => {
            console.log('📝 Novos logs formatados:', formattedNewLogs);
            const combined = [...formattedNewLogs, ...prev];
            // Manter apenas os 100 logs mais recentes na memória
            return combined.slice(0, 100);
          });

          // Atualizar lastLogId
          if (data.logs.lastId) {
            console.log(`✅ Atualizado lastLogId para: ${data.logs.lastId}`);
            setLastLogId(data.logs.lastId);
          }

          // Atualizar estatísticas quando houver novos logs
          fetchStats();
        } else {
          console.log('⏳ Nenhum novo log');
        }

        setError(null);
      } else {
        console.error('❌ Response success é false:', data);
        setError('Erro ao conectar com o dispositivo');
        setDeviceStatus('offline');
      }
    } catch (err) {
      console.error('❌ Erro ao buscar novos logs:', err);
      setError('Erro ao conectar com o dispositivo');
      setDeviceStatus('offline');
    }
  }, [lastLogId, fetchStats]);

  // Carrega dados históricos (logs anteriores não em tempo real)
  const loadHistoricalData = useCallback(async () => {
    try {
      console.log('📖 Carregando dados históricos do AccessLog...');
      
      // Buscar logs históricos em quantidade maior
      const historicalData = await dashboardService.getHistoricalLogs(0, 500, {});
      
      console.log('✅ Histórico carregado:', {
        total: historicalData.total,
        logs: historicalData.logs?.length,
        firstLog: historicalData.logs?.[0],
        lastLog: historicalData.logs?.[historicalData.logs.length - 1]
      });
      
      // Se houver logs históricos, adicionar à lista
      if (historicalData.logs && historicalData.logs.length > 0) {
        console.log(`📋 ${historicalData.logs.length} log(s) bruto(s) recebido(s)`);
        
        const formattedHistorical = historicalData.logs.map(log => {
          const formatted = dashboardService.formatLog(log);
          return formatted;
        });
        
        console.log(`✅ ${formattedHistorical.length} log(s) histórico(s) formatado(s)`);
        console.log('📝 Primeiros logs formatados:', formattedHistorical.slice(0, 2));
        
        // Definir logs históricos (substituir completamente com dados do AccessLog)
        setRecentLogs(prev => {
          console.log(`🔍 Estado anterior: ${prev.length} log(s)`);
          
          // Se houver logs em tempo real, manter no topo
          const existingIds = new Set(prev.map(l => l.id));
          const realtimeLogs = prev.filter(log => log.id);
          
          // Adicionar logs históricos evitando duplicatas
          const toAdd = formattedHistorical.filter(log => !existingIds.has(log.id));
          
          console.log(`📊 Logs em tempo real: ${realtimeLogs.length}, novos históricos: ${toAdd.length}`);
          
          if (toAdd.length > 0) {
            console.log(`✅ Adicionados ${toAdd.length} log(s) histórico(s) do AccessLog`);
            const combined = [...realtimeLogs, ...toAdd].slice(0, 500);
            console.log(`📈 Total após merge: ${combined.length} log(s)`);
            return combined;
          }
          
          // Se não há realtime logs, usar apenas históricos
          if (realtimeLogs.length === 0) {
            console.log(`✅ Preenchido com ${formattedHistorical.length} log(s) histórico(s)`);
            const result = formattedHistorical.slice(0, 500);
            console.log(`📈 Total históricos definido: ${result.length} log(s)`);
            return result;
          }
          
          console.log('⏳ Nenhuma mudança necessária');
          return prev;
        });
      } else {
        console.warn('⚠️  Nenhum log histórico encontrado no AccessLog');
        console.warn('Response completo:', historicalData);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar histórico:', err);
      console.error('Stack:', err.stack);
    }
  }, []);

  // Inicialização: carregar dados iniciais
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      
      try {
        // Buscar logs iniciais usando o novo serviço
        console.log('🚀 Inicializando Dashboard...');
        const logsData = await dashboardService.getNewLogs();
        
        console.log('📋 Initial logs response:', logsData);
        
        if (logsData.success) {
          const formattedLogs = dashboardService.processLogsResponse(logsData);
          console.log(`📊 ${formattedLogs.length} log(s) inicial(ns) carregado(s)`);
          setRecentLogs(formattedLogs);
          
          if (logsData.lastId) {
            console.log(`✅ lastLogId inicializado para: ${logsData.lastId}`);
            setLastLogId(logsData.lastId);
          }
        } else {
          console.warn('⚠️  Response não contém success=true');
        }

        // Buscar estatísticas e dados históricos em paralelo
        console.log('📊 Carregando estatísticas e histórico...');
        await Promise.all([
          fetchStats(),
          loadHistoricalData()
        ]);
        
        setError(null);
      } catch (err) {
        console.error('❌ Erro na inicialização:', err);
        setError('Erro ao carregar dados iniciais');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [fetchStats, loadHistoricalData]);

  // Polling em tempo real (a cada 3 segundos)
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      fetchNewLogs();
    }, 3000);

    return () => clearInterval(interval);
  }, [isPolling, fetchNewLogs]);

  // Funções auxiliares
  const getStatusBadge = (event) => {
    if (event === 'Acesso Concedido' || event === 'access_granted') {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle size={16} /> Concedido
        </span>
      );
    } else if (event === 'Acesso Negado' || event === 'access_denied') {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle size={16} /> Negado
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
        Desconhecido
      </span>
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Paginação
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = recentLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(recentLogs.length / logsPerPage);

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header com status */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard de Acessos</h1>
        <div className="flex items-center gap-4">
          {/* Status do dispositivo */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border">
            <div className={`w-3 h-3 rounded-full ${deviceStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-gray-700">
              {deviceStatus === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {/* Toggle de polling */}
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isPolling 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <RefreshCw size={20} className={isPolling ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Colaboradores</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Users className="text-blue-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Acessos (7 dias)</p>
            <p className="text-3xl font-bold text-gray-800">{stats.totalAccessesLast7Days}</p>
          </div>
          <div className="p-3 bg-gray-100 rounded-full">
            <Clock className="text-gray-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Concedidos (7 dias)</p>
            <p className="text-3xl font-bold text-green-600">{stats.grantedLast7Days}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Negados (7 dias)</p>
            <p className="text-3xl font-bold text-red-600">{stats.deniedLast7Days}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-full">
            <XCircle className="text-red-600" size={24} />
          </div>
        </div>
      </div>

      {/* Lista de Acessos Recentes */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Acessos Recentes em Tempo Real
          </h2>
          <span className="text-sm text-gray-500">
            {recentLogs.length} log(s) disponíveis
          </span>
        </div>

        {currentLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum acesso registrado ainda</p>
            <p className="text-sm mt-2">Os acessos aparecerão aqui em tempo real</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {currentLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative">
                      {log.userImage ? (
                        <img 
                          src={log.userImage} 
                          alt={log.userName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-xl">
                          👤
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1">
                        {log.event === 'Acesso Concedido' ? '✅' : '❌'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        {log.userName || 'Desconhecido'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>🕐 {formatTimestamp(log.timestamp)}</span>
                        {log.reason && (
                          <span className="text-orange-600">⚠️ {log.reason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(log.event)}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}