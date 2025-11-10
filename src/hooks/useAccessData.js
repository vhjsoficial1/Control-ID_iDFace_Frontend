import { useState, useEffect } from 'react';
import api from '../services/api';

export const useAccessData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes] = await Promise.all([
        api.get('/audit/stats/summary'),
        api.get('/audit/recent/activity?limit=5')
      ]);
      
      setStats(statsRes.data);
      setRecentActivity(activityRes.data.logs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  return { loading, error, stats, recentActivity, refetch: fetchData };
};