import { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function Dashboard() {
  // Estados principais
  const [allLogs, setAllLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de estatísticas
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAccessesLast7Days: 0,
    grantedLast7Days: 0,
    deniedLast7Days: 0
  });
  
  // Estados de tempo real
  const [lastLogId, setLastLogId] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState('offline');
  const [isPolling, setIsPolling] = useState(true);
  const [newLogsCount, setNewLogsCount] = useState(0);

  const logsPerPage = 10;

  // ==================== FUNÇÕES DE FORMATAÇÃO ====================
  
  // Mover funções de formatação para useCallback para evitar warnings
  const getImageSrc = useCallback((base64String) => {
    if (!base64String) return null;
    if (base64String.startsWith('data:image')) return base64String;

    let mimeType = 'image/jpeg';
    try {
      const binaryString = atob(base64String.substring(0, 20));
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        mimeType = 'image/jpeg';
      } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E) {
        mimeType = 'image/png';
      }
    } catch (e) {}

    return `data:${mimeType};base64,${base64String}`;
  }, []);

  const formatLog = useCallback((log) => {
    const user = log.user || {};
    
    let eventDisplay = log.event;
    if (log.event === 'access_granted' || log.event === 'Acesso Concedido') {
      eventDisplay = 'Acesso Concedido';
    } else if (log.event === 'access_denied' || log.event === 'Acesso Negado' || log.event === 'unknown' || log.event === 'Desconhecido') {
      eventDisplay = 'Acesso Negado';
    }
    
    let userImage = null;
    if (user.image) {
      userImage = getImageSrc(user.image);
    }
    
    return {
      id: log.id,
      idFaceLogId: log.idFaceLogId,
      userName: log.userName || user.name || 'Desconhecido',
      userId: log.userId,
      userImage: userImage,
      event: eventDisplay,
      timestamp: log.timestamp,
      reason: log.reason,
      cardValue: log.cardValue
    };
  }, [getImageSrc]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';

    const date = new Date(timestamp);

    // Ajuste de fuso: UTC-3
    date.setHours(date.getHours() + 3);

    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };


  const getStatusBadge = (event) => {
    if (event === 'Acesso Concedido' || event === 'access_granted') {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle size={16} /> Concedido
        </span>
      );
    } else if (event === 'Acesso Negado' || event === 'access_denied' || event === 'unknown' || event === 'Desconhecido') {
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

  // ==================== BUSCAR LOGS HISTÓRICOS ====================
  
  const fetchAllLogs = useCallback(async () => {
    try {
      console.log('📖 Carregando todos os logs do banco...');
      
      // Buscar TODOS os logs (sem paginação no backend, fazemos aqui)
      const response = await api.get('/audit/', {
        params: {
          skip: 0,
          limit: 1000 // Buscar bastante para ter histórico
        }
      });

      console.log('✅ Logs carregados:', {
        total: response.data.total,
        count: response.data.logs?.length
      });

      if (response.data.logs && response.data.logs.length > 0) {
        const formatted = response.data.logs.map(formatLog);
        setAllLogs(formatted);
        setTotalLogs(response.data.total);
        
        // Atualizar lastLogId com o mais recente
        if (formatted.length > 0) {
          setLastLogId(formatted[0].id);
        }
      } else {
        setAllLogs([]);
        setTotalLogs(0);
      }

      setError(null);
    } catch (err) {
      console.error('❌ Erro ao carregar logs:', err);
      setError('Erro ao carregar logs de acesso');
      setAllLogs([]);
    }
  }, [formatLog]);

  // ==================== BUSCAR ESTATÍSTICAS ====================
  
  const fetchStats = useCallback(async () => {
    try {
      console.log('📊 Buscando estatísticas...');
      
      // 1. Total de usuários
      const usersResponse = await api.get('/users/');
      const totalUsers = usersResponse.data?.users?.length || 0;

      // 2. Estatísticas de acesso dos últimos 7 dias
      const statsResponse = await api.get('/audit/stats/summary', {
        params: {
          groupByDate: true
        }
      });

      let totalAccessesLast7Days = 0;
      let grantedLast7Days = 0;
      let deniedLast7Days = 0;

      // Processar estatísticas por evento
      if (statsResponse.data.byEvent) {
        statsResponse.data.byEvent.forEach(eventGroup => {
          const count = eventGroup.count || 0;
          if (eventGroup.event === 'Acesso Concedido' || eventGroup.event === 'access_granted') {
            grantedLast7Days += count;
          } else if (eventGroup.event === 'Acesso Negado' || eventGroup.event === 'access_denied' || eventGroup.event === 'unknown' || eventGroup.event === 'Desconhecido') {
            deniedLast7Days += count;
          }
        });
      }

      totalAccessesLast7Days = grantedLast7Days + deniedLast7Days;

      console.log('✅ Estatísticas:', {
        totalUsers,
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
    }
  }, []);

  // ==================== POLLING TEMPO REAL ====================
  
  const fetchNewLogs = useCallback(async () => {
    if (!lastLogId) return; // Precisa ter carregado os logs históricos primeiro

    try {
      console.log('📡 Polling: verificando novos logs...');
      
      const response = await api.get('/realtime/monitor', {
        params: { since_id: lastLogId }
      });

      if (response.data.success) {
        setDeviceStatus(response.data.deviceStatus || 'offline');

        // Se houver novos logs
        if (response.data.logs?.newCount > 0 && response.data.logs?.newlyFound?.length > 0) {
          console.log(`🔔 ${response.data.logs.newCount} novo(s) log(s)!`);
          
          const newLogs = response.data.logs.newlyFound.map(formatLog);
          
          setAllLogs(prev => {
            // Adicionar novos logs no início
            const updated = [...newLogs, ...prev];
            return updated;
          });

          // Atualizar lastLogId
          if (response.data.logs.lastId) {
            setLastLogId(response.data.logs.lastId);
          }

          // Mostrar notificação visual
          setNewLogsCount(prev => prev + newLogs.length);
          setTimeout(() => setNewLogsCount(0), 3000);

          // Atualizar estatísticas
          fetchStats();
        }
      } else {
        setDeviceStatus('offline');
      }

    } catch (err) {
      console.error('❌ Erro no polling:', err);
      setDeviceStatus('offline');
    }
  }, [lastLogId, fetchStats, formatLog]);

  // ==================== EFFECTS ====================
  
  // Carregar dados iniciais
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      
      try {
        await Promise.all([
          fetchAllLogs(),
          fetchStats()
        ]);
      } catch (err) {
        console.error('❌ Erro na inicialização:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [fetchAllLogs, fetchStats]);

  // Polling em tempo real
  useEffect(() => {
    if (!isPolling || loading) return;

    const interval = setInterval(() => {
      fetchNewLogs();
    }, 2000); // A cada 2 segundos

    return () => clearInterval(interval);
  }, [isPolling, loading, fetchNewLogs]);

  // ==================== PAGINAÇÃO ====================
  
  const totalPages = Math.ceil(totalLogs / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const endIndex = startIndex + logsPerPage;
  const currentLogs = allLogs.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  // ==================== RENDER ====================
  
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
      {/* Header */}
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
          
          {/* Notificação de novos logs */}
          {newLogsCount > 0 && (
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium animate-pulse">
              +{newLogsCount} novo(s) acesso(s)
            </div>
          )}
          
          {/* Toggle de polling */}
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              isPolling 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <RefreshCw size={20} className={isPolling ? 'animate-spin' : ''} />
            {isPolling ? 'Tempo Real ON' : 'Tempo Real OFF'}
          </button>
          
          {/* Botão de atualizar */}
          <button
            onClick={() => {
              fetchAllLogs();
              fetchStats();
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw size={20} />
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
            <p className="text-gray-600 text-sm">Total de Acessos</p>
            <p className="text-3xl font-bold text-gray-800">{totalLogs}</p>
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

      {/* Lista de Acessos */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Histórico de Acessos
          </h2>
          <span className="text-sm text-gray-500">
            Total: {totalLogs} registro(s) | Página {currentPage} de {totalPages}
          </span>
        </div>

        {currentLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum acesso registrado</p>
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
                        {log.userName}
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
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} />
                  Anterior
                </button>
                
                <div className="flex items-center gap-2">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
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
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}