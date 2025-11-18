import { useState, useEffect } from "react";
import { Clock, Plus, Search, Edit2, Trash2, X, AlertCircle, CheckCircle } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const DIAS_SEMANA = [
  { key: 'sun', label: 'Dom', labelFull: 'Domingo' },
  { key: 'mon', label: 'Seg', labelFull: 'Segunda' },
  { key: 'tue', label: 'Ter', labelFull: 'Terça' },
  { key: 'wed', label: 'Qua', labelFull: 'Quarta' },
  { key: 'thu', label: 'Qui', labelFull: 'Quinta' },
  { key: 'fri', label: 'Sex', labelFull: 'Sexta' },
  { key: 'sat', label: 'Sáb', labelFull: 'Sábado' }
];

// Helper para converter segundos em HH:MM
const secondsToTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Helper para converter HH:MM em segundos
const timeToSeconds = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60;
};

export default function Horarios() {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    timeSpans: [{
      start: "08:00",
      end: "18:00",
      sun: false,
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: false,
      hol1: false,
      hol2: false,
      hol3: false
    }]
  });

  const [errors, setErrors] = useState({});

  const loadHorarios = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/time-zones/`);
      const data = await response.json();
      console.log("📊 Horários carregados:", data);
      setHorarios(data || []);
    } catch (error) {
      console.error("❌ Erro ao carregar horários:", error);
      alert("Erro ao carregar horários. Verifique a conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHorarios();
  }, []);

  const filteredHorarios = horarios.filter(horario =>
    horario.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (horario = null) => {
    if (horario) {
      setIsEditing(true);
      
      // Converter timeSpans do formato do backend para o formato do formulário
      const formattedTimeSpans = horario.timeSpans && horario.timeSpans.length > 0
        ? horario.timeSpans.map(span => ({
            start: secondsToTime(span.start),
            end: secondsToTime(span.end),
            sun: span.sun,
            mon: span.mon,
            tue: span.tue,
            wed: span.wed,
            thu: span.thu,
            fri: span.fri,
            sat: span.sat,
            hol1: span.hol1 || false,
            hol2: span.hol2 || false,
            hol3: span.hol3 || false
          }))
        : [{
            start: "08:00",
            end: "18:00",
            sun: false,
            mon: true,
            tue: true,
            wed: true,
            thu: true,
            fri: true,
            sat: false,
            hol1: false,
            hol2: false,
            hol3: false
          }];

      setFormData({
        id: horario.id,
        name: horario.name,
        timeSpans: formattedTimeSpans
      });
    } else {
      setIsEditing(false);
      setFormData({
        id: null,
        name: "",
        timeSpans: [{
          start: "08:00",
          end: "18:00",
          sun: false,
          mon: true,
          tue: true,
          wed: true,
          thu: true,
          fri: true,
          sat: false,
          hol1: false,
          hol2: false,
          hol3: false
        }]
      });
    }
    setErrors({});
    setSaveStatus(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      id: null,
      name: "",
      timeSpans: [{
        start: "08:00",
        end: "18:00",
        sun: false,
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: false,
        hol1: false,
        hol2: false,
        hol3: false
      }]
    });
    setErrors({});
    setSaveStatus(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    // Validar cada timeSpan
    formData.timeSpans.forEach((span, index) => {
      const startSeconds = timeToSeconds(span.start);
      const endSeconds = timeToSeconds(span.end);

      if (startSeconds >= endSeconds) {
        newErrors[`timeSpan_${index}`] = "Horário de início deve ser anterior ao horário de fim";
      }

      // Verificar se pelo menos um dia foi selecionado
      const diasSelecionados = DIAS_SEMANA.some(dia => span[dia.key]);
      if (!diasSelecionados) {
        newErrors[`timeSpan_${index}_dias`] = "Selecione pelo menos um dia";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setSaveStatus({ type: 'info', message: 'Salvando horário...' });

    try {
      // Converter timeSpans para o formato do backend
      const timeSpansForBackend = formData.timeSpans.map(span => ({
        start: timeToSeconds(span.start),
        end: timeToSeconds(span.end),
        sun: span.sun,
        mon: span.mon,
        tue: span.tue,
        wed: span.wed,
        thu: span.thu,
        fri: span.fri,
        sat: span.sat,
        hol1: span.hol1,
        hol2: span.hol2,
        hol3: span.hol3
      }));

      const payload = {
        name: formData.name.trim()
      };

      let response;
      console.log("🔍 isEditing:", isEditing);
      console.log("🔍 formData.id:", formData.id);
      
      if (isEditing && formData.id) {
        // 1️⃣ Atualizar apenas o nome via PATCH
        const patchUrl = `${API_URL}/time-zones/${formData.id}`;
        console.log("🔧 PATCH URL:", patchUrl);
        console.log("🔧 Payload:", payload);
        
        response = await fetch(patchUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ Erro da API:", errorData);
          throw new Error(errorData.detail || "Erro ao atualizar horário");
        }

        console.log("✅ Nome do horário atualizado com sucesso");

        // 2️⃣ Buscar dados ATUALIZADOS do backend para ver quais timeSpans existem
        setSaveStatus({ type: 'info', message: 'Atualizando períodos...' });
        const getResponse = await fetch(`${API_URL}/time-zones/${formData.id}`);
        if (getResponse.ok) {
          const currentHorario = await getResponse.json();
          console.log("📝 TimeZone atual do backend:", currentHorario);
          
          // Deletar TODOS os timeSpans atuais
          if (currentHorario?.timeSpans && currentHorario.timeSpans.length > 0) {
            for (const span of currentHorario.timeSpans) {
              try {
                const deleteRes = await fetch(`${API_URL}/time-zones/spans/${span.id}`, {
                  method: "DELETE"
                });
                if (deleteRes.ok) {
                  console.log(`✅ TimeSpan ${span.id} deletado`);
                }
              } catch (err) {
                console.error(`❌ Erro ao deletar timeSpan ${span.id}:`, err);
              }
            }
          }
        }

        // 3️⃣ Criar novos timeSpans
        for (const span of timeSpansForBackend) {
          try {
            const spanRes = await fetch(`${API_URL}/time-zones/${formData.id}/spans`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(span)
            });
            
            if (!spanRes.ok) {
              const error = await spanRes.json();
              console.error("❌ Erro ao criar timeSpan:", error);
              throw new Error("Erro ao criar timeSpan");
            }
            const createdSpan = await spanRes.json();
            console.log(`✅ TimeSpan criado:`, createdSpan);
          } catch (err) {
            console.error(`❌ Erro ao criar timeSpan:`, err);
            throw err;
          }
        }

        // ⚠️ NOTA: sync-to-idface está criando duplicata no backend
        // Remover esta chamada até que o backend seja corrigido
        console.log("✅ Horário atualizado com sucesso (sincronização do backend pendente)");
      } else {
        // Criar novo horário com timeSpans
        console.log("📝 Criando novo horário...");
        const createPayload = {
          name: payload.name,
          timeSpans: timeSpansForBackend
        };

        response = await fetch(`${API_URL}/time-zones/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Erro ao criar horário");
        }

        console.log("✅ Horário criado com sucesso");
      }

      setSaveStatus({
        type: 'success',
        message: isEditing ? 'Horário atualizado com sucesso!' : 'Horário criado com sucesso!'
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      closeModal();
      loadHorarios();
    } catch (error) {
      console.error("❌ Erro ao salvar:", error);
      setSaveStatus({
        type: 'error',
        message: `Erro ao salvar horário: ${error.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este horário?\n\nIsso removerá o horário e seus vínculos com funcionários.")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/time-zones/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Erro ao deletar horário");
      }

      alert("✅ Horário excluído com sucesso!");
      loadHorarios();
    } catch (error) {
      console.error("❌ Erro ao deletar:", error);
      alert(`Erro ao deletar horário: ${error.message}`);
    }
  };

  const toggleDia = (spanIndex, diaKey) => {
    setFormData(prev => {
      const newTimeSpans = [...prev.timeSpans];
      newTimeSpans[spanIndex] = {
        ...newTimeSpans[spanIndex],
        [diaKey]: !newTimeSpans[spanIndex][diaKey]
      };
      return { ...prev, timeSpans: newTimeSpans };
    });
  };

  const addTimeSpan = () => {
    setFormData(prev => ({
      ...prev,
      timeSpans: [
        ...prev.timeSpans,
        {
          start: "08:00",
          end: "18:00",
          sun: false,
          mon: true,
          tue: true,
          wed: true,
          thu: true,
          fri: true,
          sat: false,
          hol1: false,
          hol2: false,
          hol3: false
        }
      ]
    }));
  };

  const removeTimeSpan = (index) => {
    if (formData.timeSpans.length === 1) {
      alert("É necessário pelo menos um período de horário");
      return;
    }

    setFormData(prev => ({
      ...prev,
      timeSpans: prev.timeSpans.filter((_, i) => i !== index)
    }));
  };

  const updateTimeSpan = (index, field, value) => {
    setFormData(prev => {
      const newTimeSpans = [...prev.timeSpans];
      newTimeSpans[index] = {
        ...newTimeSpans[index],
        [field]: value
      };
      return { ...prev, timeSpans: newTimeSpans };
    });
  };

  // Função para formatar os dias da semana ativos
  const formatDiasAtivos = (timeSpan) => {
    const diasAtivos = DIAS_SEMANA.filter(dia => timeSpan[dia.key]);
    if (diasAtivos.length === 0) return "Nenhum dia";
    if (diasAtivos.length === 7) return "Todos os dias";
    return diasAtivos.map(dia => dia.label).join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: "#174E9A" }}></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Clock className="mr-3" style={{ color: "#174E9A" }} size={32} />
          <h1 className="text-3xl font-bold text-gray-800">Horários</h1>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition"
          style={{ backgroundColor: "#174E9A" }}
        >
          <Plus size={20} className="mr-2" />
          Novo Horário
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Pesquisar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: "#174E9A" }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Períodos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Dias Ativos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  ID Leitor
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHorarios.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    Nenhum horário encontrado
                  </td>
                </tr>
              ) : (
                filteredHorarios.map((horario) => (
                  <tr key={horario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{horario.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      {horario.timeSpans && horario.timeSpans.length > 0 ? (
                        <div className="space-y-1">
                          {horario.timeSpans.map((span, idx) => (
                            <div key={idx} className="text-sm text-gray-700">
                              {secondsToTime(span.start)} - {secondsToTime(span.end)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Sem períodos</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {horario.timeSpans && horario.timeSpans.length > 0 ? (
                        <div className="space-y-1">
                          {horario.timeSpans.map((span, idx) => (
                            <div key={idx} className="text-xs text-gray-600">
                              {formatDiasAtivos(span)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {horario.idFaceId ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                          #{horario.idFaceId}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(horario)}
                          className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(horario.id)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditing ? "Editar Horário" : "Novo Horário"}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700" disabled={saving}>
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {saveStatus && (
                <div className={`p-4 rounded-lg flex items-start gap-3 ${
                  saveStatus.type === 'success' ? 'bg-green-50 border border-green-200' :
                  saveStatus.type === 'error' ? 'bg-red-50 border border-red-200' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  {saveStatus.type === 'success' && <CheckCircle className="text-green-600 flex-shrink-0" size={20} />}
                  {saveStatus.type === 'error' && <AlertCircle className="text-red-600 flex-shrink-0" size={20} />}
                  {saveStatus.type === 'info' && <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />}
                  <span className={`text-sm ${
                    saveStatus.type === 'success' ? 'text-green-800' :
                    saveStatus.type === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    {saveStatus.message}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Horário *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={saving}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  } ${saving ? "bg-gray-100" : ""}`}
                  placeholder="Ex: Horário Comercial"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Períodos de Horário *
                  </label>
                  <button
                    onClick={addTimeSpan}
                    disabled={saving}
                    className="text-sm flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-gray-100 transition"
                    style={{ color: "#174E9A" }}
                  >
                    <Plus size={16} />
                    Adicionar Período
                  </button>
                </div>

                {formData.timeSpans.map((span, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-700">Período {index + 1}</h4>
                      {formData.timeSpans.length > 1 && (
                        <button
                          onClick={() => removeTimeSpan(index)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Início
                        </label>
                        <input
                          type="time"
                          value={span.start}
                          onChange={(e) => updateTimeSpan(index, 'start', e.target.value)}
                          disabled={saving}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fim
                        </label>
                        <input
                          type="time"
                          value={span.end}
                          onChange={(e) => updateTimeSpan(index, 'end', e.target.value)}
                          disabled={saving}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                        />
                      </div>
                    </div>

                    {errors[`timeSpan_${index}`] && (
                      <p className="text-red-500 text-sm mb-2">{errors[`timeSpan_${index}`]}</p>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dias da Semana *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DIAS_SEMANA.map(dia => (
                          <button
                            key={dia.key}
                            type="button"
                            onClick={() => toggleDia(index, dia.key)}
                            disabled={saving}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              span[dia.key]
                                ? "text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                            style={span[dia.key] ? { backgroundColor: "#174E9A" } : {}}
                          >
                            {dia.labelFull}
                          </button>
                        ))}
                      </div>
                      {errors[`timeSpan_${index}_dias`] && (
                        <p className="text-red-500 text-sm mt-2">{errors[`timeSpan_${index}_dias`]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: "#174E9A" }}
              >
                {saving ? "Salvando..." : (isEditing ? "Salvar Alterações" : "Criar Horário")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}