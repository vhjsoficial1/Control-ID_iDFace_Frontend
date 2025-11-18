import React, { useState, useEffect, useCallback } from "react";
import { Users, Plus, Search, Edit2, Trash2, X, RefreshCw, AlertCircle, CheckCircle, Building2, Eye } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDepartamento, setSelectedDepartamento] = useState(null);
  
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    funcionarios: [],
    horarios: []
  });

  const [errors, setErrors] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, usersRes, horariosRes] = await Promise.all([
        fetch(`${API_URL}/access-rules/groups/`),
        fetch(`${API_URL}/users/`),
        fetch(`${API_URL}/time-zones/`)
      ]);

      const deptData = await deptRes.json();
      const usersData = await usersRes.json();
      const horariosData = await horariosRes.json();

      console.log("📊 Dados carregados:");
      console.log("- Departamentos:", deptData?.length || 0);
      console.log("- Funcionários:", usersData.users?.length || 0);
      console.log("- Horários:", horariosData?.length || 0);

      setDepartamentos(deptData || []);
      setFuncionarios(usersData.users || []);
      setHorarios(horariosData || []);
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
      alert("Erro ao carregar dados. Verifique a conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDepartamentos = departamentos.filter(dept => 
    dept.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = async (departamento = null) => {
    if (departamento) {
      setIsEditing(true);
      
      // Carregar vínculos existentes
      let vinculatedUsers = [];
      let vinculatedHorarios = [];
      
      try {
        // Buscar usuários do departamento
        const usersResponse = await fetch(`${API_URL}/access-rules/groups/${departamento.id}/users`);
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          vinculatedUsers = usersData.users?.map(u => u.id) || [];
        }

        // Para buscar horários, precisamos buscar as regras de acesso do grupo
        const rulesResponse = await fetch(`${API_URL}/access-rules/?include_details=true`);
        if (rulesResponse.ok) {
          const rulesData = await rulesResponse.json();
          
          // Encontrar regras vinculadas a este grupo
          const groupRules = rulesData.filter(rule => 
            rule.groupAccessRules?.some(gar => gar.groupId === departamento.id)
          );
          
          // Extrair time zones dessas regras
          const timeZoneIds = new Set();
          groupRules.forEach(rule => {
            rule.timeZones?.forEach(tz => {
              if (tz.timeZone) {
                timeZoneIds.add(tz.timeZone.id);
              }
            });
          });
          
          vinculatedHorarios = Array.from(timeZoneIds);
        }
      } catch (err) {
        console.error("Erro ao carregar vínculos:", err);
      }
      
      setFormData({
        id: departamento.id,
        name: departamento.name,
        funcionarios: vinculatedUsers,
        horarios: vinculatedHorarios
      });
    } else {
      setIsEditing(false);
      setFormData({
        id: null,
        name: "",
        funcionarios: [],
        horarios: []
      });
    }
    setErrors({});
    setSyncStatus(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      id: null,
      name: "",
      funcionarios: [],
      horarios: []
    });
    setErrors({});
    setSyncStatus(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome do departamento é obrigatório";
    }

    if (formData.name.trim().length < 3) {
      newErrors.name = "Nome deve ter no mínimo 3 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSyncing(true);
    setSyncStatus({ type: 'info', message: 'Salvando departamento...' });

    try {
      // 1️⃣ Criar/Atualizar departamento
      const payload = {
        name: formData.name.trim(),
        userIds: formData.funcionarios,
        timeZoneId: formData.horarios.length > 0 ? formData.horarios[0] : null
      };

      let response;
      let deptId;

      if (isEditing) {
        // Atualizar nome do departamento
        response = await fetch(`${API_URL}/access-rules/groups/${formData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: payload.name })
        });
        
        if (!response.ok) {
          throw new Error("Erro ao atualizar departamento");
        }
        
        deptId = formData.id;
      } else {
        // Criar novo departamento
        response = await fetch(`${API_URL}/access-rules/groups/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Erro ao criar departamento");
        }

        const savedDept = await response.json();
        deptId = savedDept.id;
        console.log("✅ Departamento criado:", savedDept);
      }

      // 2️⃣ Gerenciar funcionários (usuários)
      setSyncStatus({ type: 'info', message: 'Configurando funcionários...' });
      
      if (isEditing) {
        // Buscar funcionários atuais
        const currentUsersResponse = await fetch(`${API_URL}/access-rules/groups/${deptId}/users`);
        const currentUsersData = await currentUsersResponse.json();
        const currentUserIds = currentUsersData.users?.map(u => u.id) || [];

        // Remover funcionários desmarcados
        const usersToRemove = currentUserIds.filter(uid => !formData.funcionarios.includes(uid));
        for (const userId of usersToRemove) {
          try {
            await fetch(`${API_URL}/access-rules/groups/${deptId}/users/${userId}`, {
              method: "DELETE"
            });
            console.log(`✅ Funcionário ${userId} removido do departamento`);
          } catch (err) {
            console.error(`❌ Erro ao remover funcionário ${userId}:`, err);
          }
        }

        // Adicionar novos funcionários
        const usersToAdd = formData.funcionarios.filter(uid => !currentUserIds.includes(uid));
        for (const userId of usersToAdd) {
          try {
            await fetch(`${API_URL}/access-rules/groups/${deptId}/users/${userId}`, {
              method: "POST"
            });
            console.log(`✅ Funcionário ${userId} adicionado ao departamento`);
          } catch (err) {
            console.error(`❌ Erro ao adicionar funcionário ${userId}:`, err);
          }
        }
      } else {
        // Para novos departamentos, os usuários já foram adicionados na criação
        console.log("✅ Funcionários já vinculados na criação");
      }

      // 3️⃣ Gerenciar horários (time zones)
      setSyncStatus({ type: 'info', message: 'Configurando horários de acesso...' });
      
      // Buscar horários atuais do departamento através das regras
      const rulesResponse = await fetch(`${API_URL}/access-rules/?include_details=true`);
      const rulesData = await rulesResponse.json();
      
      const currentGroupRules = rulesData.filter(rule => 
        rule.groupAccessRules?.some(gar => gar.groupId === deptId)
      );
      
      const currentTimeZoneIds = new Set();
      currentGroupRules.forEach(rule => {
        rule.timeZones?.forEach(tz => {
          if (tz.timeZone) {
            currentTimeZoneIds.add(tz.timeZone.id);
          }
        });
      });

      // Remover time zones desmarcados
      const tzsToRemove = Array.from(currentTimeZoneIds).filter(tzId => !formData.horarios.includes(tzId));
      for (const tzId of tzsToRemove) {
        try {
          await fetch(`${API_URL}/access-rules/groups/${deptId}/time-zones/${tzId}`, {
            method: "DELETE"
          });
          console.log(`✅ Horário ${tzId} removido do departamento`);
        } catch (err) {
          console.error(`❌ Erro ao remover horário ${tzId}:`, err);
        }
      }

      // Adicionar novos time zones
      const tzsToAdd = formData.horarios.filter(tzId => !currentTimeZoneIds.has(tzId));
      for (const tzId of tzsToAdd) {
        try {
          await fetch(`${API_URL}/access-rules/groups/${deptId}/time-zones/${tzId}`, {
            method: "POST"
          });
          console.log(`✅ Horário ${tzId} adicionado ao departamento`);
        } catch (err) {
          console.error(`❌ Erro ao adicionar horário ${tzId}:`, err);
        }
      }

      setSyncStatus({ 
        type: 'success', 
        message: 'Departamento salvo e sincronizado com sucesso!' 
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      closeModal();
      loadData();
    } catch (error) {
      console.error("❌ Erro no handleSubmit:", error);
      setSyncStatus({ 
        type: 'error', 
        message: `Erro ao salvar departamento: ${error.message}` 
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este departamento?\n\nIsso removerá:\n- O departamento\n- Vínculos com funcionários\n- Vínculos com horários")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/access-rules/groups/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Erro ao deletar departamento");
      }

      alert("✅ Departamento excluído com sucesso!");
      loadData();
    } catch (error) {
      console.error("❌ Erro ao deletar:", error);
      alert(`Erro ao deletar departamento: ${error.message}`);
    }
  };

  const toggleFuncionario = (userId) => {
    setFormData(prev => ({
      ...prev,
      funcionarios: prev.funcionarios.includes(userId)
        ? prev.funcionarios.filter(id => id !== userId)
        : [...prev.funcionarios, userId]
    }));
  };

  const toggleHorario = (horarioId) => {
    setFormData(prev => ({
      ...prev,
      horarios: prev.horarios.includes(horarioId)
        ? prev.horarios.filter(id => id !== horarioId)
        : [...prev.horarios, horarioId]
    }));
  };

  const getDepartmentStats = (deptId) => {
    // Contar funcionários e horários vinculados
    // Esta é uma implementação simplificada - idealmente viria da API
    return {
      funcionarios: 0,
      horarios: 0
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: "#174E9A" }}></div>
        <p className="text-gray-600">Carregando departamentos...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Building2 className="mr-3" style={{ color: "#174E9A" }} size={32} />
          <h1 className="text-3xl font-bold text-gray-800">Departamentos</h1>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition"
          style={{ backgroundColor: "#174E9A" }}
        >
          <Plus size={20} className="mr-2" />
          Novo Departamento
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Pesquisar departamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            style={{ focusRing: "#174E9A" }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: "#174E9A" }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Nome do Departamento
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  ID Leitor
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Status Sync
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDepartamentos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    Nenhum departamento encontrado
                  </td>
                </tr>
              ) : (
                filteredDepartamentos.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">
                        #{dept.id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Building2 className="mr-3 text-gray-400" size={20} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {dept.idFaceId ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                          #{dept.idFaceId}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {dept.idFaceId ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                          ✓ Sincronizado
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(dept)}
                          className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditing ? "Editar Departamento" : "Novo Departamento"}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700" disabled={syncing}>
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Status de sincronização */}
              {syncStatus && (
                <div className={`p-4 rounded-lg flex items-start gap-3 ${
                  syncStatus.type === 'success' ? 'bg-green-50 border border-green-200' :
                  syncStatus.type === 'error' ? 'bg-red-50 border border-red-200' :
                  syncStatus.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  {syncStatus.type === 'success' && <CheckCircle className="text-green-600 flex-shrink-0" size={20} />}
                  {syncStatus.type === 'error' && <AlertCircle className="text-red-600 flex-shrink-0" size={20} />}
                  {syncStatus.type === 'warning' && <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />}
                  {syncStatus.type === 'info' && <RefreshCw className="text-blue-600 flex-shrink-0 animate-spin" size={20} />}
                  <span className={`text-sm ${
                    syncStatus.type === 'success' ? 'text-green-800' :
                    syncStatus.type === 'error' ? 'text-red-800' :
                    syncStatus.type === 'warning' ? 'text-yellow-800' :
                    'text-blue-800'
                  }`}>
                    {syncStatus.message}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Departamento *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={syncing}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  } ${syncing ? "bg-gray-100" : ""}`}
                  placeholder="Ex: Produção, Administrativo, TI..."
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Funcionários */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Funcionários ({formData.funcionarios.length} selecionados)
                  </label>
                  <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                    {funcionarios.length > 0 ? (
                      funcionarios.map(func => (
                        <label key={func.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.funcionarios.includes(func.id)}
                            onChange={() => toggleFuncionario(func.id)}
                            disabled={syncing}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-800">
                            {func.name}
                            {func.registration && (
                              <span className="text-gray-500 ml-2">({func.registration})</span>
                            )}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 p-2">Nenhum funcionário cadastrado.</p>
                    )}
                  </div>
                </div>

                {/* Horários */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horários de Acesso ({formData.horarios.length} selecionados)
                  </label>
                  <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                    {horarios.length > 0 ? (
                      horarios.map(horario => (
                        <label key={horario.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.horarios.includes(horario.id)}
                            onChange={() => toggleHorario(horario.id)}
                            disabled={syncing}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-800">{horario.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 p-2">Nenhum horário cadastrado.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Dica:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Funcionários vinculados terão acesso conforme os horários selecionados</li>
                      <li>Você pode selecionar múltiplos horários para o mesmo departamento</li>
                      <li>As alterações são sincronizadas automaticamente com o leitor facial</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={syncing}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={syncing}
                className="px-6 py-2 text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: "#174E9A" }}
              >
                {syncing ? "Salvando..." : (isEditing ? "Salvar Alterações" : "Criar Departamento")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}