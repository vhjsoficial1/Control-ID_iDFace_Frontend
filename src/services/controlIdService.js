import api from './api';

export const controlIdService = {
  // ========== USUÁRIOS ==========
  getUsers: async () => {
    const response = await api.get('/users/');
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/users/', userData);
    return response.data;
  },

  deleteUser: async (userId) => {
    await api.delete(`/users/${userId}`);
  },

  // ========== HORÁRIOS (TIME ZONES) ==========
  getTimeZones: async () => {
    const response = await api.get('/time-zones/');
    return response.data;
  },

  createTimeZone: async (timeZoneData) => {
    const response = await api.post('/time-zones/', timeZoneData);
    return response.data;
  },

  deleteTimeZone: async (timeZoneId) => {
    await api.delete(`/time-zones/${timeZoneId}`);
  },

  // ========== REGRAS DE ACESSO ==========
  getAccessRules: async () => {
    const response = await api.get('/access-rules/');
    return response.data;
  },

  createAccessRule: async (ruleData) => {
    const response = await api.post('/access-rules/', ruleData);
    return response.data;
  },

  deleteAccessRule: async (ruleId) => {
    await api.delete(`/access-rules/${ruleId}`);
  },

  // ========== GRUPOS ==========
  getGroups: async () => {
    const response = await api.get('/access-rules/groups/');
    return response.data;
  },

  createGroup: async (groupData) => {
    const response = await api.post('/access-rules/groups/', groupData);
    return response.data;
  },

  // ========== BACKUP ==========
  createBackup: async () => {
    const response = await api.post('/backup/create', {
      include_images: false,
      include_logs: true,
      compress: true
    });
    return response.data;
  },

  downloadBackup: async () => {
    const response = await api.get('/backup/download', {
      responseType: 'blob'
    });
    return response.data;
  },

  // ========== RELATÓRIOS ==========
  downloadReport: async (startDate, endDate) => {
    const response = await api.get(
      `/report/access/by-period?start_date=${startDate}&end_date=${endDate}&format=csv`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  // ========== SISTEMA ==========
  openDoor: async () => {
    const response = await api.post('/system/actions/open-door');
    return response.data;
  },

  getSystemInfo: async () => {
    const response = await api.get('/system/info');
    return response.data;
  }
};