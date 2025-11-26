/**
 * Dashboard Service
 * Serviço para integração com o backend em tempo real
 */

import api from './api';

const dashboardService = {
  /**
   * Busca novos logs em tempo real
   * @param {number} sinceId - ID do último log processado (opcional)
   * @returns {Promise} Resposta do backend com novos logs
   */
  async getNewLogs(sinceId = null) {
    try {
      const params = sinceId ? { since_id: sinceId } : {};
      console.log('📡 [DashboardService] Buscando novos logs...', { sinceId });
      
      const response = await api.get('/realtime/new-logs', { params });
      
      console.log('📊 [DashboardService] Resposta recebida:', {
        success: response.data.success,
        count: response.data.count,
        lastId: response.data.lastId,
        logsCount: response.data.newLogs?.length
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [DashboardService] Erro ao buscar novos logs:', error);
      throw error;
    }
  },

  /**
   * Monitora status completo do sistema
   * @param {number} sinceId - ID do último log processado (opcional)
   * @returns {Promise} Status completo com alarme, logs, etc
   */
  async monitorFullStatus(sinceId = null) {
    try {
      const params = sinceId ? { since_id: sinceId } : {};
      console.log('📡 [DashboardService] Monitorando status completo...');
      
      const response = await api.get('/realtime/monitor', { params });
      
      console.log('📊 [DashboardService] Monitor response:', {
        success: response.data.success,
        deviceStatus: response.data.deviceStatus,
        newLogsCount: response.data.logs?.newCount,
        alarmActive: response.data.alarm?.active
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [DashboardService] Erro ao monitorar status:', error);
      throw error;
    }
  },

  /**
   * Busca contagem total de logs
   * @returns {Promise} Contagem de logs no dispositivo
   */
  async getLogCount() {
    try {
      console.log('📡 [DashboardService] Buscando contagem de logs...');
      const response = await api.get('/realtime/log-count');
      
      console.log('📊 [DashboardService] Total de logs:', response.data.count);
      return response.data;
    } catch (error) {
      console.error('❌ [DashboardService] Erro ao contar logs:', error);
      throw error;
    }
  },

  /**
   * Busca atividade recente
   * @param {number} minutes - Minutos retroativos (padrão: 5)
   * @returns {Promise} Atividade recente
   */
  async getRecentActivity(minutes = 5) {
    try {
      console.log(`📡 [DashboardService] Buscando atividade dos últimos ${minutes} minutos...`);
      const response = await api.get('/realtime/recent-activity', { 
        params: { minutes } 
      });
      
      console.log(`📊 [DashboardService] ${response.data.count} atividades encontradas`);
      return response.data;
    } catch (error) {
      console.error('❌ [DashboardService] Erro ao buscar atividade recente:', error);
      throw error;
    }
  },

  /**
   * Verifica status de alarme
   * @returns {Promise} Status do alarme
   */
  async getAlarmStatus() {
    try {
      console.log('📡 [DashboardService] Verificando status de alarme...');
      const response = await api.get('/realtime/alarm-status');
      
      console.log(`🚨 [DashboardService] Alarme: ${response.data.active ? 'ATIVO' : 'inativo'}`);
      return response.data;
    } catch (error) {
      console.error('❌ [DashboardService] Erro ao verificar alarme:', error);
      throw error;
    }
  },

  /**
   * Formata um log para exibição
   * @param {object} log - Log a formatar
   * @returns {object} Log formatado
   */
  formatLog(log) {
    // Extrair dados do objeto aninhado (estrutura real do AccessLog)
    const user = log.user || {};
    const portal = log.portal || {};
    
    // Mapear o evento para português
    let eventDisplay = log.event;
    if (log.event === 'access_granted') {
      eventDisplay = 'Acesso Concedido';
    } else if (log.event === 'access_denied') {
      eventDisplay = 'Acesso Negado';
    }
    
    // Processar imagem do usuário usando a mesma lógica do Funcionarios.jsx
    let userImage = null;
    if (user.image) {
      userImage = this.getImageSrc(user.image);
    }
    
    return {
      id: log.id || log.idFaceLogId,
      idFaceLogId: log.idFaceLogId,
      userName: user.name || 'Desconhecido',
      userId: log.userId,
      userImage: userImage,
      portalName: portal.name || 'Entrada',
      portalId: log.portalId,
      event: eventDisplay,
      timestamp: log.timestamp,
      reason: log.reason,
      cardValue: log.cardValue
    };
  },

  /**
   * Processa imagem base64 (duplicado do Funcionarios.jsx para consistência)
   * @param {string} base64String - String base64 da imagem
   * @returns {string} Data URL da imagem
   */
  getImageSrc(base64String) {
    if (!base64String) {
      return null;
    }

    // Se já tem o prefixo data:image, retorna como está
    if (base64String.startsWith('data:image')) {
      return base64String;
    }

    // Detectar o tipo de imagem baseado nos primeiros bytes (magic numbers)
    let mimeType = 'image/jpeg'; // padrão

    try {
      const binaryString = atob(base64String.substring(0, 20));
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Verificar magic numbers
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        mimeType = 'image/jpeg';
      } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E) {
        mimeType = 'image/png';
      } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        mimeType = 'image/gif';
      } else if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
        mimeType = 'image/bmp';
      } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        mimeType = 'image/webp';
      }
    } catch (e) {
      // Se houver erro ao decodificar, usa o padrão (JPEG)
    }

    return `data:${mimeType};base64,${base64String}`;
  },

  /**
   * Processa resposta de logs do backend
   * @param {object} response - Resposta do backend
   * @returns {array} Array de logs formatados
   */
  processLogsResponse(response) {
    if (!response.success) {
      console.warn('⚠️ [DashboardService] Resposta não bem-sucedida:', response);
      return [];
    }

    // Compatibilidade com diferentes formatos de resposta
    const logs = response.newLogs || response.logs || [];
    
    console.log(`📝 [DashboardService] Processando ${logs.length} log(s)`);
    
    return logs.map(log => this.formatLog(log));
  },

  /**
   * Busca logs históricos de auditoria
   * @param {number} skip - Quantos registros pular
   * @param {number} limit - Quantos registros retornar
   * @param {object} filters - Filtros adicionais (userId, portalId, event, etc)
   * @returns {Promise} Logs históricos
   */
  async getHistoricalLogs(skip = 0, limit = 50, filters = {}) {
    try {
      console.log('📡 [DashboardService] Buscando logs históricos...', { skip, limit, filters });
      
      const params = {
        skip,
        limit,
        ...filters
      };
      
      const response = await api.get('/audit/', { params });
      
      console.log('📊 [DashboardService] Logs históricos:', {
        total: response.data.total,
        count: response.data.logs?.length
      });
      
      // Formatar logs
      if (response.data.logs) {
        response.data.logs = response.data.logs.map(log => this.formatLog(log));
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ [DashboardService] Erro ao buscar logs históricos:', error);
      throw error;
    }
  },

  /**
   * Busca estatísticas de acesso
   * @param {object} options - Opções (startDate, endDate, groupByHour, groupByDate, etc)
   * @returns {Promise} Estatísticas de acesso
   */
  async getAccessStatistics(options = {}) {
    try {
      console.log('📡 [DashboardService] Buscando estatísticas de acesso...', options);
      
      const response = await api.get('/audit/stats/summary', { params: options });
      
      console.log('📊 [DashboardService] Estatísticas carregadas:', {
        totalLogs: response.data.totalLogs,
        byEventCount: response.data.byEvent?.length
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [DashboardService] Erro ao buscar estatísticas:', error);
      throw error;
    }
  },

  /**
   * Busca atividade recente com endpoint de auditoria
   * @param {number} minutes - Minutos retroativos
   * @param {number} limit - Limite de registros
   * @returns {Promise} Atividade recente
   */
  async getRecentActivityAudit(minutes = 60, limit = 50) {
    try {
      console.log(`📡 [DashboardService] Buscando atividade dos últimos ${minutes} minutos...`);
      
      const response = await api.get('/audit/recent/activity', {
        params: { minutes, limit }
      });
      
      console.log(`📊 [DashboardService] ${response.data.count} atividade(s) encontrada(s)`);
      
      // Formatar logs
      if (response.data.logs) {
        response.data.logs = response.data.logs.map(log => this.formatLog(log));
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ [DashboardService] Erro ao buscar atividade recente:', error);
      throw error;
    }
  },

  /**
   * Busca histórico de acesso de um usuário
   * @param {number} userId - ID do usuário
   * @param {number} skip - Quantos registros pular
   * @param {number} limit - Quantos registros retornar
   * @returns {Promise} Histórico do usuário
   */
  async getUserAccessHistory(userId, skip = 0, limit = 50) {
    try {
      console.log(`📡 [DashboardService] Buscando histórico do usuário ${userId}...`);
      
      const response = await api.get(`/audit/user/${userId}/history`, {
        params: { skip, limit }
      });
      
      // Formatar logs
      if (response.data.logs) {
        response.data.logs = response.data.logs.map(log => this.formatLog(log));
      }
      
      return response.data;
    } catch (error) {
      console.error(`❌ [DashboardService] Erro ao buscar histórico do usuário ${userId}:`, error);
      throw error;
    }
  }
};

export default dashboardService;
