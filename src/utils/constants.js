export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export const COLORS = {
  primary: '#174E9A',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6'
};

export const ACCESS_EVENTS = {
  ACCESS_GRANTED: 'access_granted',
  ACCESS_DENIED: 'access_denied',
  UNKNOWN_USER: 'unknown_user'
};

export const EVENT_LABELS = {
  access_granted: 'Acesso Liberado',
  access_denied: 'Acesso Negado',
  unknown_user: 'Usuário Desconhecido'
};

export const DAYS_OF_WEEK = [
  { key: 'sun', label: 'Domingo' },
  { key: 'mon', label: 'Segunda' },
  { key: 'tue', label: 'Terça' },
  { key: 'wed', label: 'Quarta' },
  { key: 'thu', label: 'Quinta' },
  { key: 'fri', label: 'Sexta' },
  { key: 'sat', label: 'Sábado' }
];