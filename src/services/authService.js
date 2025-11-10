import api from './api';

export const authService = {
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.success) {
        localStorage.setItem('admin', JSON.stringify(response.data.admin));
        return response.data;
      }
      throw new Error('Login falhou');
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Erro ao fazer login');
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('admin');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  },

  getCurrentUser: () => {
    const admin = localStorage.getItem('admin');
    return admin ? JSON.parse(admin) : null;
  }
};