import { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Settings,
  RefreshCw,
  FileText,
  Archive
} from 'lucide-react';
import api from '../services/api';

export default function Backup() {
  const [loading, setLoading] = useState(false);
  const [backupInfo, setBackupInfo] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  // Mantemos o estado básico caso precise reativar, mas removemos a UI
  const [scheduleConfig, setScheduleConfig] = useState({
    intervalHours: 24,
    includeImages: false,
    includeLogs: true,
    enabled: false,
    nextRun: null,
    lastRun: null
  });
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [restoreOptions, setRestoreOptions] = useState({
    clearBefore: false,
    skipExisting: true,
    restoreLogs: false
  });
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('create');

  useEffect(() => {
    loadDatabaseStats();
    loadBackupInfo();
    // loadSchedulerStatus(); // Desativado visualmente, mas pode ser mantido se o backend exigir
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadDatabaseStats = async () => {
    try {
      const response = await api.get('/backup/database-stats');
      setDbStats(response.data.statistics);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadBackupInfo = async () => {
    try {
      const response = await api.get('/backup/info');
      setBackupInfo(response.data);
    } catch (error) {
      // Sem backup disponível ainda
      setBackupInfo(null);
    }
  };

  const handleCreateBackup = async (includeImages = false, includeLogs = true) => {
    try {
      setLoading(true);
      showNotification('Criando backup... Por favor, aguarde.', 'info');
      
      const response = await api.post('/backup/create', {
        include_images: includeImages,
        include_logs: includeLogs,
        compress: true
      });

      if (response.data.success) {
        showNotification(
          `Backup criado com sucesso! Tamanho: ${response.data.metadata.size_mb} MB`,
          'success'
        );
        await loadBackupInfo();
      }
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      showNotification(
        error.response?.data?.detail || 'Erro ao criar backup',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setLoading(true);
      const response = await api.get('/backup/download', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.setAttribute('download', `idface_backup_${timestamp}.zip`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification('Backup baixado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao baixar backup:', error);
      showNotification(
        error.response?.data?.detail || 'Erro ao baixar backup',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const isValid = file.name.endsWith('.zip') || file.name.endsWith('.json');
      if (!isValid) {
        showNotification('Arquivo inválido. Use apenas .zip ou .json', 'error');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleValidateBackup = async () => {
    if (!uploadFile) {
      showNotification('Selecione um arquivo primeiro', 'error');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('backup_file', uploadFile);

      const response = await api.post('/backup/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.valid) {
        showNotification(
          `✅ Backup válido!\n` +
          `Usuários: ${response.data.record_counts.users}\n` +
          `Regras: ${response.data.record_counts.access_rules}\n` +
          `Horários: ${response.data.record_counts.time_zones}`,
          'success'
        );
      } else {
        showNotification(
          `❌ Backup inválido:\n${response.data.errors.join('\n')}`,
          'error'
        );
      }
    } catch (error) {
      console.error('Erro ao validar backup:', error);
      showNotification('Erro ao validar arquivo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!uploadFile) {
      showNotification('Selecione um arquivo primeiro', 'error');
      return;
    }

    const confirmMessage = restoreOptions.clearBefore
      ? '⚠️ ATENÇÃO: Isso irá APAGAR todos os dados antes de restaurar!\n\nTem certeza que deseja continuar?'
      : 'Deseja restaurar este backup?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      showNotification('Restaurando backup... Isso pode levar alguns minutos.', 'info');

      const formData = new FormData();
      formData.append('backup_file', uploadFile);
      formData.append('clear_before', restoreOptions.clearBefore);
      formData.append('skip_existing', restoreOptions.skipExisting);
      formData.append('restore_logs', restoreOptions.restoreLogs);

      const response = await api.post('/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const stats = response.data.statistics;
        showNotification(
          `✅ Backup restaurado com sucesso!\n` +
          `Duração: ${response.data.duration_seconds.toFixed(2)}s\n` +
          `Usuários: ${stats.users.imported} importados\n` +
          `Regras: ${stats.access_rules.imported} importadas`,
          'success'
        );
        
        setUploadFile(null);
        await loadDatabaseStats();
      }
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      showNotification(
        error.response?.data?.detail || 'Erro ao restaurar backup',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearBackupCache = async () => {
    if (!window.confirm('Deseja limpar o cache de backup?')) return;

    try {
      await api.delete('/backup/clear');
      showNotification('Cache de backup limpo', 'success');
      setBackupInfo(null);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      showNotification('Erro ao limpar cache', 'error');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Database className="mr-3 text-blue-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Backup e Restore</h1>
            <p className="text-gray-600">Gerenciamento de backups do sistema</p>
          </div>
        </div>
        <button
          onClick={loadDatabaseStats}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
      </div>

      {/* Notificação */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-lg border-l-4 ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-500 text-green-800'
              : notification.type === 'error'
              ? 'bg-red-50 border-red-500 text-red-800'
              : 'bg-blue-50 border-blue-500 text-blue-800'
          }`}
        >
          <div className="flex items-start">
            {notification.type === 'success' ? (
              <CheckCircle className="mr-2 flex-shrink-0" size={20} />
            ) : (
              <AlertCircle className="mr-2 flex-shrink-0" size={20} />
            )}
            <pre className="whitespace-pre-wrap font-sans">{notification.message}</pre>
          </div>
        </div>
      )}

      {/* Estatísticas do Banco */}
      {dbStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Database size={24} />}
            label="Usuários"
            value={dbStats.users}
            color="blue"
          />
          <StatCard
            icon={<Clock size={24} />}
            label="Horários"
            value={dbStats.time_zones}
            color="green"
          />
          <StatCard
            icon={<Settings size={24} />}
            label="Regras"
            value={dbStats.access_rules}
            color="purple"
          />
          <StatCard
            icon={<FileText size={24} />}
            label="Logs"
            value={dbStats.access_logs}
            color="orange"
          />
        </div>
      )}

      {dbStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 font-semibold">
                Tamanho Estimado do Backup
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {dbStats.users_with_image} usuários com foto
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">
                {dbStats.estimated_backup_size_mb} MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="flex border-b border-gray-200">
          <TabButton
            active={activeTab === 'create'}
            onClick={() => setActiveTab('create')}
            icon={<Download size={18} />}
            label="Criar Backup"
          />
          <TabButton
            active={activeTab === 'restore'}
            onClick={() => setActiveTab('restore')}
            icon={<Upload size={18} />}
            label="Restaurar"
          />
        </div>

        <div className="p-6">
          {/* Tab: Criar Backup */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Criar Novo Backup
              </h2>

              {backupInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <CheckCircle className="text-green-600 mr-3 flex-shrink-0" size={24} />
                    <div className="flex-1">
                      <p className="font-semibold text-green-800">
                        Backup Disponível
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Criado em: {new Date(backupInfo.created_at).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-green-700">
                        Formato: {backupInfo.format.toUpperCase()} • 
                        Tamanho: {backupInfo.metadata.size_mb} MB
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadBackup}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      <Download size={18} />
                      Baixar
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <BackupOption
                  title="Backup Rápido"
                  description="Apenas dados essenciais (sem imagens e logs)"
                  icon={<FileText className="text-blue-600" size={32} />}
                  estimatedSize="< 1 MB"
                  onExecute={() => handleCreateBackup(false, false)}
                  loading={loading}
                />
                
                <BackupOption
                  title="Backup Padrão"
                  description="Dados + Logs de acesso (sem imagens)"
                  icon={<Archive className="text-green-600" size={32} />}
                  estimatedSize={dbStats ? `~${(dbStats.estimated_backup_size_mb * 0.1).toFixed(1)} MB` : '< 5 MB'}
                  onExecute={() => handleCreateBackup(false, true)}
                  loading={loading}
                  recommended
                />
                
                <BackupOption
                  title="Backup Completo"
                  description="Todos os dados incluindo fotos dos usuários"
                  icon={<Database className="text-purple-600" size={32} />}
                  estimatedSize={dbStats ? `~${dbStats.estimated_backup_size_mb} MB` : '< 50 MB'}
                  onExecute={() => handleCreateBackup(true, true)}
                  loading={loading}
                />
              </div>

              {backupInfo && (
                <button
                  onClick={handleClearBackupCache}
                  className="text-sm text-red-600 hover:text-red-700 underline"
                >
                  Limpar cache de backup
                </button>
              )}
            </div>
          )}

          {/* Tab: Restaurar */}
          {activeTab === 'restore' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Restaurar Backup
              </h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                
                <input
                  type="file"
                  id="backup-upload"
                  accept=".zip,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <label
                  htmlFor="backup-upload"
                  className="cursor-pointer inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Selecionar Arquivo
                </label>
                
                {uploadFile && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-semibold text-blue-800">{uploadFile.name}</p>
                    <p className="text-sm text-blue-600">
                      Tamanho: {formatBytes(uploadFile.size)}
                    </p>
                  </div>
                )}
                
                <p className="text-sm text-gray-500 mt-4">
                  Formatos aceitos: .zip ou .json
                </p>
              </div>

              {uploadFile && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700">Opções de Restauração</h3>
                    
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={restoreOptions.skipExisting}
                        onChange={(e) =>
                          setRestoreOptions({ ...restoreOptions, skipExisting: e.target.checked })
                        }
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-gray-700">Pular existentes</p>
                        <p className="text-sm text-gray-500">
                          Não sobrescrever registros que já existem
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={restoreOptions.restoreLogs}
                        onChange={(e) =>
                          setRestoreOptions({ ...restoreOptions, restoreLogs: e.target.checked })
                        }
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-gray-700">Restaurar logs</p>
                        <p className="text-sm text-gray-500">
                          Incluir logs de acesso históricos
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={restoreOptions.clearBefore}
                        onChange={(e) =>
                          setRestoreOptions({ ...restoreOptions, clearBefore: e.target.checked })
                        }
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-red-700">⚠️ Limpar banco antes</p>
                        <p className="text-sm text-red-600">
                          CUIDADO: Apaga todos os dados antes de restaurar!
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleValidateBackup}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                    >
                      <CheckCircle size={18} />
                      Validar Arquivo
                    </button>
                    
                    <button
                      onClick={handleRestoreBackup}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      <Upload size={18} />
                      {loading ? 'Restaurando...' : 'Restaurar Backup'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componentes auxiliares
function StatCard({ icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 font-medium transition ${
        active
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-600 hover:text-gray-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function BackupOption({ title, description, icon, estimatedSize, onExecute, loading, recommended }) {
  return (
    <div className="relative bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 transition">
      {recommended && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
          Recomendado
        </div>
      )}
      
      <div className="mb-4">{icon}</div>
      
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500">Tamanho estimado:</span>
        <span className="text-sm font-semibold text-gray-700">{estimatedSize}</span>
      </div>
      
      <button
        onClick={onExecute}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        <Download size={18} />
        {loading ? 'Criando...' : 'Criar Backup'}
      </button>
    </div>
  );
}