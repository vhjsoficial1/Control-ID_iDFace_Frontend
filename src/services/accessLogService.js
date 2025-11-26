import api from "./api";

/**
 * Service para buscar logs de acesso do banco de dados
 */

export const getRecentAccessLogs = async (skip = 0, limit = 10) => {
  try {
    console.log('📡 [AccessLogService] Buscando logs recentes...', { skip, limit });
    
    const response = await api.get("/audit/", {
      params: { skip, limit }
    });
    
    console.log('✅ [AccessLogService] Logs carregados:', {
      total: response.data.total,
      count: response.data.logs?.length
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ [AccessLogService] Erro ao buscar logs:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    });
    throw error;
  }
};

export const getAllAccessLogs = async (skip = 0, limit = 500) => {
  try {
    console.log('📡 [AccessLogService] Buscando todos os logs...', { skip, limit });
    
    const response = await api.get("/audit/", {
      params: { skip, limit }
    });
    
    console.log('✅ [AccessLogService] Todos os logs carregados:', {
      total: response.data.total,
      count: response.data.logs?.length
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ [AccessLogService] Erro ao buscar todos os logs:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    });
    throw error;
  }
};

export default {
  getRecentAccessLogs,
  getAllAccessLogs
};