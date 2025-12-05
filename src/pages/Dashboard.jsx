import { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Cpu } from 'lucide-react';
<<<<<<< HEAD

// ==================== CONFIGURAÇÃO DA API (EMBUTIDA) ====================
// Integrada diretamente para evitar erros de importação no ambiente de build
const API_BASE_URL = 'http://localhost:8000/api/v1';

/**
 * Cliente HTTP leve que simula a interface do Axios usando Fetch API.
 */
const api = {
  get: async (endpoint, config = {}) => {
    try {
      const url = new URL(`${API_BASE_URL}${endpoint}`);
      
      if (config.params) {
        Object.keys(config.params).forEach(key => 
          url.searchParams.append(key, config.params[key])
        );
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.detail || data.message || `Erro ${response.status}: ${response.statusText}`;
        const error = new Error(errorMessage);
        error.response = { data, status: response.status };
        throw error;
      }

      return { 
        data, 
        status: response.status,
        success: response.ok
      };
    } catch (error) {
      // Ignora erros de polling para não poluir o console
      if (!endpoint.includes('/monitor')) {
        console.error(`Erro na requisição GET ${endpoint}:`, error);
      }
      throw error;
    }
  }
};

// ==================== SERVIÇO DE DASHBOARD (EMBUTIDO) ====================

const dashboardService = {
  /**
   * Monitora status completo do sistema
   */
  async monitorFullStatus(sinceId = null) {
    try {
      const params = sinceId ? { since_id: sinceId } : {};
      const response = await api.get('/realtime/monitor', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca informações do dispositivo
   */
  async getDeviceInfo() {
    try {
      const response = await api.get('/realtime/device-info');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar info do dispositivo:', error);
      throw error;
    }
  },

  /**
   * Busca contagem total de usuários
   */
  async getTotalUsers() {
    try {
      const response = await api.get('/users/');
      return response.data?.users?.length || 0;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Busca logs históricos de auditoria
   */
  async getHistoricalLogs(skip = 0, limit = 50) {
    try {
      const response = await api.get('/audit/', { 
        params: { skip, limit } 
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar logs históricos:', error);
      throw error;
    }
  },

  /**
   * Busca estatísticas de acesso
   */
  async getAccessStatistics(options = {}) {
    try {
      const response = await api.get('/audit/stats/summary', { params: options });
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw error;
    }
  },

  /**
   * Formata um log para exibição
   */
  formatLog(log) {
    const user = log.user || {};
    const portal = log.portal || {};
    
    let eventDisplay = log.event;
    if (log.event === 'access_granted' || log.event === 'Acesso Concedido' || log.event === 7) {
      eventDisplay = 'Acesso Concedido';
    } else if (log.event === 'access_denied' || log.event === 'Acesso Negado' || log.event === 0 || log.event === 'Desconhecido' ) {
      eventDisplay = 'Acesso Negado';
    }
    
    let userImage = null;
    if (user.image) {
      userImage = this.getImageSrc(user.image);
    }
    
    return {
      id: log.id || log.idFaceLogId,
      idFaceLogId: log.idFaceLogId,
      userName: log.userName || user.name || 'Desconhecido',
      userId: log.userId,
      userImage: userImage,
      portalName: log.portalName || portal.name || 'Entrada',
      portalId: log.portalId,
      event: eventDisplay,
      timestamp: log.timestamp,
      reason: log.reason,
      cardValue: log.cardValue
    };
  },

  getImageSrc(base64String) {
    if (!base64String) return null;
    if (base64String.startsWith('data:image')) return base64String;

    let mimeType = 'image/jpeg';
    try {
      const binaryString = atob(base64String.substring(0, 20));
      const bytes = new Uint8Array(binaryString.length);
      
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) mimeType = 'image/jpeg';
      else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E) mimeType = 'image/png';
    } catch (e) {}

    return `data:${mimeType};base64,${base64String}`;
  }
};

// ==================== COMPONENTE PRINCIPAL ====================
=======
import api from '../services/api';
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2

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
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isPolling, setIsPolling] = useState(true);
  const [newLogsCount, setNewLogsCount] = useState(0);

  const logsPerPage = 10;

<<<<<<< HEAD
  // ==================== FUNÇÕES AUXILIARES ====================
=======
  // ==================== FUNÇÕES DE FORMATAÇÃO ====================
  
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
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    
    const date = new Date(timestamp);
<<<<<<< HEAD
    
    // Adiciona 3 horas à data criada
=======
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2
    date.setHours(date.getHours() + 3);

    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getStatusBadge = (event) => {
    if (event === 'Acesso Concedido' || event === 'access_granted') {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle size={16} /> Concedido
        </span>
      );
    } else if (event === 'Acesso Negado' || event === 'access_denied' || event === 'Desconhecido') {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle size={16} /> Negado
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
        {event || 'Desconhecido'}
      </span>
    );
  };

<<<<<<< HEAD
  // ==================== CARGA DE DADOS ====================
=======
  // ==================== BUSCAR INFO DO DISPOSITIVO ====================
  
  const fetchDeviceInfo = useCallback(async () => {
    try {
      console.log('🔌 Buscando informações do dispositivo...');
      
      const response = await api.get('/realtime/device-info');
      
      if (response.data.success && response.data.device) {
        console.log('✅ Dispositivo conectado:', response.data.device);
        setDeviceInfo(response.data.device);
        setDeviceStatus('online');
      } else {
        console.warn('⚠️ Dispositivo não disponível');
        setDeviceInfo(null);
        setDeviceStatus('offline');
      }
    } catch (err) {
      console.error('❌ Erro ao buscar info do dispositivo:', err);
      setDeviceInfo(null);
      setDeviceStatus('offline');
    }
  }, []);

  // ==================== BUSCAR LOGS HISTÓRICOS ====================
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2
  
  const fetchDeviceInfo = useCallback(async () => {
    try {
      const response = await dashboardService.getDeviceInfo();
      
      if (response.success && response.device) {
        setDeviceInfo(response.device);
        setDeviceStatus('online');
      } else {
        setDeviceInfo(null);
        setDeviceStatus('offline');
      }
    } catch (err) {
      setDeviceInfo(null);
      setDeviceStatus('offline');
    }
  }, []);

  const fetchAllLogs = useCallback(async () => {
    try {
<<<<<<< HEAD
      const data = await dashboardService.getHistoricalLogs(0, 1000);
=======
      console.log('📖 Carregando todos os logs do banco...');
      
      const response = await api.get('/audit/', {
        params: {
          skip: 0,
          limit: 1000
        }
      });
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2

      if (data.logs && data.logs.length > 0) {
        const formatted = data.logs.map(log => dashboardService.formatLog(log));
        setAllLogs(formatted);
        setTotalLogs(data.total);
        
        if (formatted.length > 0) {
          setLastLogId(formatted[0].id);
        }
      } else {
        setAllLogs([]);
        setTotalLogs(0);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar com o servidor. Verifique se o main.py está rodando.');
      setAllLogs([]);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
<<<<<<< HEAD
      const [totalUsers, statsData] = await Promise.all([
        dashboardService.getTotalUsers(),
        dashboardService.getAccessStatistics({ groupByDate: true })
      ]);

      let grantedLast7Days = 0;
      let deniedLast7Days = 0;

      if (statsData.byEvent) {
        const events = Array.isArray(statsData.byEvent) 
          ? statsData.byEvent 
          : Object.entries(statsData.byEvent).map(([k, v]) => ({ event: k, ...v }));

        events.forEach(group => {
          const count = group.count || 0;
          if (group.event === 'access_granted' || group.event === 'Acesso Concedido') {
=======
      console.log('📊 Buscando estatísticas...');
      
      const usersResponse = await api.get('/users/');
      const totalUsers = usersResponse.data?.users?.length || 0;

      const statsResponse = await api.get('/audit/stats/summary', {
        params: {
          groupByDate: true
        }
      });

      let totalAccessesLast7Days = 0;
      let grantedLast7Days = 0;
      let deniedLast7Days = 0;

      if (statsResponse.data.byEvent) {
        statsResponse.data.byEvent.forEach(eventGroup => {
          const count = eventGroup.count || 0;
          if (eventGroup.event === 'Acesso Concedido' || eventGroup.event === 'access_granted') {
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2
            grantedLast7Days += count;
          } else if (group.event === 'access_denied' || group.event === 'Acesso Negado' || group.event === 'Desconhecido') {
            deniedLast7Days += count;
          }
        });
      }

      setStats({
        totalUsers,
        totalAccessesLast7Days: grantedLast7Days + deniedLast7Days,
        grantedLast7Days,
        deniedLast7Days
      });

    } catch (err) {
      console.error('Erro ao buscar estatísticas', err);
    }
  }, []);

  // ==================== POLLING TEMPO REAL ====================

  const fetchNewLogs = useCallback(async () => {
<<<<<<< HEAD
=======
    if (!lastLogId) return;

>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2
    try {
      const currentLastId = lastLogId || 0;
      
      const data = await dashboardService.monitorFullStatus(currentLastId);

<<<<<<< HEAD
      if (data.success) {
        const status = data.deviceStatus || 'offline';
        setDeviceStatus(status);

        if (status === 'online' && !deviceInfo) {
          fetchDeviceInfo();
        }

        const newLogsList = data.logs?.newlyFound || [];
        const newCount = data.logs?.newCount || 0;

        if (newCount > 0 && newLogsList.length > 0) {
          const formattedNewLogs = newLogsList.map(log => dashboardService.formatLog(log));
          
          setAllLogs(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const unique = formattedNewLogs.filter(l => !existingIds.has(l.id));
            return [...unique, ...prev];
          });

          setTotalLogs(prev => prev + formattedNewLogs.length);

          if (data.logs.lastId) {
            setLastLogId(data.logs.lastId);
          }

          setNewLogsCount(prev => prev + formattedNewLogs.length);
          setTimeout(() => setNewLogsCount(0), 5000);
=======
      if (response.data.success) {
        const status = response.data.deviceStatus || 'offline';
        setDeviceStatus(status);

        // Atualizar info do dispositivo se estava offline
        if (status === 'online' && !deviceInfo) {
          fetchDeviceInfo();
        }

        if (response.data.logs?.newCount > 0 && response.data.logs?.newlyFound?.length > 0) {
          console.log(`🔔 ${response.data.logs.newCount} novo(s) log(s)!`);
          
          const newLogs = response.data.logs.newlyFound.map(formatLog);
          
          setAllLogs(prev => {
            const updated = [...newLogs, ...prev];
            return updated;
          });

          if (response.data.logs.lastId) {
            setLastLogId(response.data.logs.lastId);
          }

          setNewLogsCount(prev => prev + newLogs.length);
          setTimeout(() => setNewLogsCount(0), 3000);
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2

          fetchStats();
        }
      }
    } catch (err) {
      setDeviceStatus('offline');
    }
<<<<<<< HEAD
  }, [lastLogId, fetchStats, deviceInfo, fetchDeviceInfo]);
=======
  }, [lastLogId, fetchStats, formatLog, deviceInfo, fetchDeviceInfo]);
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2

  // ==================== EFFECTS ====================

  useEffect(() => {
    const init = async () => {
      try {
<<<<<<< HEAD
        await Promise.all([fetchDeviceInfo(), fetchAllLogs(), fetchStats()]);
=======
        await Promise.all([
          fetchDeviceInfo(),
          fetchAllLogs(),
          fetchStats()
        ]);
      } catch (err) {
        console.error('❌ Erro na inicialização:', err);
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchDeviceInfo, fetchAllLogs, fetchStats]);

<<<<<<< HEAD
  useEffect(() => {
    if (!isPolling || loading) return;
    const interval = setInterval(fetchNewLogs, 2000);
=======
    initializeDashboard();
  }, [fetchDeviceInfo, fetchAllLogs, fetchStats]);

  // Polling em tempo real
  useEffect(() => {
    if (!isPolling || loading) return;

    const interval = setInterval(() => {
      fetchNewLogs();
    }, 2000);

>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2
    return () => clearInterval(interval);
  }, [isPolling, loading, fetchNewLogs]);

  // ==================== PAGINAÇÃO & RENDER ====================
  
  const totalPages = Math.ceil(totalLogs / logsPerPage) || 1;
  const startIndex = (currentPage - 1) * logsPerPage;
  const currentLogs = allLogs.slice(startIndex, startIndex + logsPerPage);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando painel...</p>
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
<<<<<<< HEAD
=======
          {/* Info do Dispositivo */}
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2
          {deviceInfo && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border">
              <Cpu className="text-blue-600" size={20} />
              <div className="text-left">
                <div className="text-xs text-gray-500">Dispositivo</div>
                <div className="text-sm font-semibold text-gray-800">
<<<<<<< HEAD
                  {deviceInfo.name} ({deviceInfo.ip})
=======
                  ID: {deviceInfo.id} - {deviceInfo.name}
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2
                </div>
              </div>
            </div>
          )}
          
<<<<<<< HEAD
=======
          {/* Status do dispositivo */}
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border">
            <div className={`w-3 h-3 rounded-full ${deviceStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-gray-700">
              {deviceStatus === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {newLogsCount > 0 && (
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium animate-pulse">
              +{newLogsCount} novo(s)
            </div>
          )}
          
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              isPolling ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <RefreshCw size={20} className={isPolling ? 'animate-spin' : ''} />
<<<<<<< HEAD
            {isPolling ? 'Tempo Real ON' : 'Pausado'}
=======
            {isPolling ? 'Tempo Real ON' : 'Tempo Real OFF'}
          </button>
          
          {/* Botão de atualizar */}
          <button
            onClick={() => {
              fetchDeviceInfo();
              fetchAllLogs();
              fetchStats();
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw size={20} />
>>>>>>> 3f812ddd05f726429684d8c279e28bac59549ee2
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Colaboradores</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full"><Users className="text-blue-600" size={24} /></div>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Total Acessos</p>
            <p className="text-3xl font-bold text-gray-800">{totalLogs}</p>
          </div>
          <div className="p-3 bg-gray-100 rounded-full"><Clock className="text-gray-600" size={24} /></div>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Concedidos (7d)</p>
            <p className="text-3xl font-bold text-green-600">{stats.grantedLast7Days}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full"><CheckCircle className="text-green-600" size={24} /></div>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex justify-between items-center">
          <div>
            <p className="text-gray-600 text-sm">Negados (7d)</p>
            <p className="text-3xl font-bold text-red-600">{stats.deniedLast7Days}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-full"><XCircle className="text-red-600" size={24} /></div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Histórico de Acessos</h2>
          <span className="text-sm text-gray-500">Total: {totalLogs} | Pág {currentPage} de {totalPages}</span>
        </div>

        <div className="space-y-3">
          {currentLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  {log.userImage ? (
                    <img src={log.userImage} alt={log.userName} className="w-12 h-12 rounded-full object-cover border-2 border-gray-300" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-xl">👤</div>
                  )}
                  <div className="absolute -bottom-1 -right-1">{log.event === 'Acesso Concedido' ? '✅' : '❌'}</div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {log.userName}
                    {log.userId && <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">ID: {log.userId}</span>}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>🕐 {formatTimestamp(log.timestamp)}</span>
                    {log.reason && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.reason.includes('não cadastrado') || log.reason.includes('desconhecida') 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        ⚠️ {log.reason}
                      </span>
                    )}
                    
                  </div>
                </div>
              </div>
              <div>{getStatusBadge(log.event)}</div>
            </div>
          ))}
          {currentLogs.length === 0 && <p className="text-center text-gray-500 py-4">Nenhum registro encontrado.</p>}
        </div>

        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 flex items-center gap-2"><ChevronLeft size={16}/> Anterior</button>
            <div className="flex gap-2">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                 let page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                 if (page > totalPages) page = totalPages - (4 - i);
                 if (page < 1) page = i + 1;
                 return (
                   <button key={page} onClick={() => goToPage(page)} className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{page}</button>
                 )
              })}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50 flex items-center gap-2">Próxima <ChevronRight size={16}/></button>
          </div>
        )}
      </div>
    </div>
  );
}