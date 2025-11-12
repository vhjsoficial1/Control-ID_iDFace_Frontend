import { useState, useEffect } from "react";
import { Users, Plus, Search, Edit2, Trash2, Camera, Upload, X, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Helper para garantir que a imagem base64 tenha o prefixo correto
const getImageSrc = (base64String) => {
  if (!base64String) return null;
  
  // Se já tem o prefixo data:image, retorna como está
  if (base64String.startsWith('data:image')) {
    return base64String;
  }
  
  // Caso contrário, adiciona o prefixo (assume JPEG por padrão)
  return `data:image/jpeg;base64,${base64String}`;
};

export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capturingImage, setCapturingImage] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);
  
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    registration: "",
    password: "",
    departamentos: [],
    horarios: [],
    image: null
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
    syncFromDevice();
  }, []);

  const syncFromDevice = async () => {
    try {
      console.log("🔄 Sincronizando usuários do leitor para o banco local...");
      
      const response = await fetch(`${API_URL}/sync/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: ["users"],
          direction: "from_idface",
          overwrite: true,
          syncImages: false,
          syncAccessLogs: false
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Sincronização do leitor concluída:", result);
        
        // Verificar resultados
        if (result.results && result.results.length > 0) {
          const userResult = result.results.find(r => r.entityType === "users");
          if (userResult) {
            console.log(`   - ${userResult.successCount} usuários sincronizados`);
            console.log(`   - ${userResult.skippedCount} usuários já existentes`);
            console.log(`   - ${userResult.failedCount} erros`);
          }
        }
        
        setInitialSyncComplete(true);
        // Recarregar dados após sincronização
        await loadData();
      } else {
        console.error("❌ Erro na sincronização do leitor");
        setInitialSyncComplete(true);
      }
    } catch (error) {
      console.error("❌ Erro ao sincronizar do leitor:", error);
      setInitialSyncComplete(true);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptRes, horariosRes] = await Promise.all([
        fetch(`${API_URL}/users/`),
        fetch(`${API_URL}/access-rules/groups/`),
        fetch(`${API_URL}/time-zones/`)
      ]);

      const usersData = await usersRes.json();
      const deptData = await deptRes.json();
      const horariosData = await horariosRes.json();

      console.log("📊 Dados carregados:");
      console.log("- Usuários:", usersData.users?.length || 0);
      console.log("- Departamentos:", deptData?.length || 0);
      console.log("- Horários:", horariosData?.length || 0);
      
      const usersWithImage = usersData.users?.filter(u => u.image) || [];
      console.log("- Usuários com imagem:", usersWithImage.length);

      setFuncionarios(usersData.users || []);
      setDepartamentos(deptData || []);
      setHorarios(horariosData || []);
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
      alert("Erro ao carregar dados. Verifique a conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const filteredFuncionarios = funcionarios.filter(func => 
    func.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    func.registration?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = async (funcionario = null) => {
    if (funcionario) {
      setIsEditing(true);
      
      // Carregar vínculos existentes
      let vinculatedDepts = [];
      let vinculatedHorarios = [];
      
      try {
        // Buscar detalhes completos do usuário
        const userDetailResponse = await fetch(`${API_URL}/users/${funcionario.id}`);
        if (userDetailResponse.ok) {
          const userDetail = await userDetailResponse.json();
          console.log("Detalhes do usuário:", userDetail);
          
          // Extrair grupos (departamentos) vinculados
          if (userDetail.userGroups && userDetail.userGroups.length > 0) {
            vinculatedDepts = userDetail.userGroups.map(ug => ug.groupId);
          }
          
          // Extrair horários vinculados através das regras de acesso
          if (userDetail.userAccessRules && userDetail.userAccessRules.length > 0) {
            const timeZoneIds = new Set();
            for (const uar of userDetail.userAccessRules) {
              if (uar.accessRule && uar.accessRule.timeZones) {
                uar.accessRule.timeZones.forEach(tz => {
                  if (tz.timeZone) {
                    timeZoneIds.add(tz.timeZone.id);
                  }
                });
              }
            }
            vinculatedHorarios = Array.from(timeZoneIds);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar vínculos:", err);
      }
      
      setFormData({
        id: funcionario.id,
        name: funcionario.name,
        registration: funcionario.registration || "",
        password: "",
        departamentos: vinculatedDepts,
        horarios: vinculatedHorarios,
        image: funcionario.image || null
      });
    } else {
      setIsEditing(false);
      setFormData({
        id: null,
        name: "",
        registration: "",
        password: "",
        departamentos: [],
        horarios: [],
        image: null
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
      registration: "",
      password: "",
      departamentos: [],
      horarios: [],
      image: null
    });
    setErrors({});
    setSyncStatus(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (formData.password && formData.password.length < 4) {
      newErrors.password = "Senha deve ter no mínimo 4 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSyncing(true);
    setSyncStatus({ type: 'info', message: 'Salvando funcionário...' });

    try {
      // 1️⃣ Criar/Atualizar usuário básico
      const payload = {
        name: formData.name.trim(),
        registration: formData.registration.trim(),
        password: formData.password || undefined,
        image: formData.image || undefined
      };

      let response;
      if (isEditing) {
        response = await fetch(`${API_URL}/users/${formData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_URL}/users/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erro ao salvar funcionário");
      }

      const savedUser = await response.json();
      console.log("✅ Usuário salvo:", savedUser);
      const userId = savedUser.id;

      // 2️⃣ Atualizar imagem se necessário
      if (formData.image && formData.image !== savedUser.image) {
        setSyncStatus({ type: 'info', message: 'Salvando imagem...' });
        const imgRes = await fetch(`${API_URL}/users/${userId}/image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: formData.image })
        });

        if (!imgRes.ok) {
          console.error("❌ Falha ao salvar imagem");
        }
      }

      // 3️⃣ Gerenciar departamentos (grupos)
      if (isEditing) {
        // Buscar vínculos atuais
        const currentUserDetail = await fetch(`${API_URL}/users/${userId}`);
        const currentUser = await currentUserDetail.json();
        const currentDepts = currentUser.userGroups?.map(ug => ug.groupId) || [];

        // Remover departamentos desmarcados
        const deptsToRemove = currentDepts.filter(d => !formData.departamentos.includes(d));
        for (const deptId of deptsToRemove) {
          try {
            await fetch(`${API_URL}/access-rules/groups/${deptId}/users/${userId}`, {
              method: "DELETE"
            });
            console.log(`✅ Departamento ${deptId} removido`);
          } catch (err) {
            console.error(`❌ Erro ao remover departamento ${deptId}:`, err);
          }
        }

        // Adicionar novos departamentos
        const deptsToAdd = formData.departamentos.filter(d => !currentDepts.includes(d));
        for (const deptId of deptsToAdd) {
          try {
            await fetch(`${API_URL}/access-rules/groups/${deptId}/users/${userId}`, {
              method: "POST"
            });
            console.log(`✅ Departamento ${deptId} adicionado`);
          } catch (err) {
            console.error(`❌ Erro ao adicionar departamento ${deptId}:`, err);
          }
        }
      } else {
        // Adicionar departamentos para novo usuário
        for (const deptId of formData.departamentos) {
          try {
            await fetch(`${API_URL}/access-rules/groups/${deptId}/users/${userId}`, {
              method: "POST"
            });
            console.log(`✅ Departamento ${deptId} vinculado`);
          } catch (err) {
            console.error(`❌ Erro ao vincular departamento ${deptId}:`, err);
          }
        }
      }

      // 4️⃣ Gerenciar horários (time zones)
      setSyncStatus({ type: 'info', message: 'Configurando horários de acesso...' });
      
      if (isEditing) {
        // Buscar regras atuais do usuário
        const currentUserDetail = await fetch(`${API_URL}/users/${userId}`);
        const currentUser = await currentUserDetail.json();
        const currentTimeZoneIds = new Set();
        
        if (currentUser.userAccessRules) {
          for (const uar of currentUser.userAccessRules) {
            if (uar.accessRule?.timeZones) {
              uar.accessRule.timeZones.forEach(tz => {
                if (tz.timeZone) currentTimeZoneIds.add(tz.timeZone.id);
              });
            }
          }
        }

        // Remover time zones desmarcados
        const tzsToRemove = Array.from(currentTimeZoneIds).filter(tz => !formData.horarios.includes(tz));
        for (const tzId of tzsToRemove) {
          try {
            await fetch(`${API_URL}/access-rules/users/${userId}/time-zones/${tzId}`, {
              method: "DELETE"
            });
            console.log(`✅ Horário ${tzId} removido`);
          } catch (err) {
            console.error(`❌ Erro ao remover horário ${tzId}:`, err);
          }
        }

        // Adicionar novos time zones
        const tzsToAdd = formData.horarios.filter(tz => !currentTimeZoneIds.has(tz));
        for (const tzId of tzsToAdd) {
          try {
            await fetch(`${API_URL}/access-rules/users/${userId}/time-zones/${tzId}`, {
              method: "POST"
            });
            console.log(`✅ Horário ${tzId} adicionado`);
          } catch (err) {
            console.error(`❌ Erro ao adicionar horário ${tzId}:`, err);
          }
        }
      } else {
        // Adicionar horários para novo usuário
        for (const tzId of formData.horarios) {
          try {
            await fetch(`${API_URL}/access-rules/users/${userId}/time-zones/${tzId}`, {
              method: "POST"
            });
            console.log(`✅ Horário ${tzId} vinculado`);
          } catch (err) {
            console.error(`❌ Erro ao vincular horário ${tzId}:`, err);
          }
        }
      }

      // 5️⃣ Sincronizar com o leitor iDFace
      setSyncStatus({ type: 'info', message: 'Sincronizando com o leitor facial...' });
      
      const syncRes = await fetch(`${API_URL}/users/${userId}/sync-to-idface`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syncImage: true,
          syncCards: true,
          syncAccessRules: true
        })
      });

      if (syncRes.ok) {
        const syncResult = await syncRes.json();
        console.log("✅ Resultado da sincronização:", syncResult);
        setSyncStatus({ 
          type: 'success', 
          message: 'Funcionário sincronizado com sucesso!' 
        });
      } else {
        const err = await syncRes.json();
        console.error("❌ Erro na sincronização:", err);
        setSyncStatus({ 
          type: 'warning', 
          message: 'Funcionário salvo, mas houve erro na sincronização com o leitor.' 
        });
      }

      // Aguardar um pouco para mostrar o status
      await new Promise(resolve => setTimeout(resolve, 1500));

      closeModal();
      loadData();
    } catch (error) {
      console.error("❌ Erro no handleSubmit:", error);
      setSyncStatus({ 
        type: 'error', 
        message: `Erro ao salvar funcionário: ${error.message}` 
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este funcionário?\n\nIsso removerá:\n- Dados do funcionário\n- Vínculos com departamentos\n- Vínculos com horários\n- Dados do leitor facial")) {
      return;
    }

    try {
      // O backend já gerencia a deleção em cascata e sincronização
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erro ao deletar funcionário");
      }

      alert("✅ Funcionário excluído com sucesso!\nDados removidos do sistema e do leitor facial.");
      loadData();
    } catch (error) {
      console.error("❌ Erro ao deletar:", error);
      alert(`Erro ao deletar funcionário: ${error.message}`);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Imagem muito grande. Máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      console.log("Imagem carregada, tamanho base64:", base64String.length);
      setFormData(prev => ({ ...prev, image: base64String }));
    };
    reader.onerror = () => {
      console.error("Erro ao ler arquivo");
      alert("Erro ao carregar imagem");
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async () => {
    if (!formData.id) {
      alert("⚠️ Salve o funcionário primeiro antes de capturar a imagem com o leitor.");
      return;
    }

    setCapturingImage(true);

    try {
      console.log("📸 Iniciando captura facial para o usuário:", formData.id);

      const captureResponse = await fetch(`${API_URL}/capture/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: formData.id,
          quality: 70,
          timeout: 30
        })
      });

      if (!captureResponse.ok) {
        const error = await captureResponse.json();
        throw new Error(error.detail || "Falha ao iniciar captura facial");
      }

      const result = await captureResponse.json();
      console.log("📤 Retorno do leitor:", result);

      if (result.success) {
        console.log("✅ Captura facial concluída com sucesso!");

        // Buscar imagem atualizada
        const imageResponse = await fetch(`${API_URL}/users/${formData.id}/image`);
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          setFormData(prev => ({ ...prev, image: imageData.image }));
          console.log("🖼️ Imagem capturada e vinculada ao formulário.");
        }

        alert("✅ Imagem capturada e sincronizada com sucesso!");
        await loadData();
      } else {
        alert("❌ Erro durante a captura: " + (result.message || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("❌ Erro na captura facial:", error);
      alert("Erro ao capturar imagem do leitor: " + error.message);
    } finally {
      setCapturingImage(false);
    }
  };

  const toggleDepartamento = (deptId) => {
    setFormData(prev => ({
      ...prev,
      departamentos: prev.departamentos.includes(deptId)
        ? prev.departamentos.filter(id => id !== deptId)
        : [...prev.departamentos, deptId]
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

  const manualSync = async (userId) => {
    if (!window.confirm("Deseja forçar a sincronização deste funcionário com o leitor facial?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/${userId}/sync-to-idface`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syncImage: true,
          syncCards: true,
          syncAccessRules: true
        })
      });

      if (!response.ok) {
        throw new Error("Erro ao sincronizar");
      }

      const result = await response.json();
      console.log("Resultado da sincronização:", result);
      
      alert("✅ Sincronização concluída com sucesso!");
      loadData();
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      alert("Erro ao sincronizar funcionário");
    }
  };

  const viewDetails = async (funcionario) => {
    try {
      // Buscar detalhes completos do funcionário
      const response = await fetch(`${API_URL}/users/${funcionario.id}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar detalhes");
      }
      
      const detailedFunc = await response.json();
      setSelectedFuncionario(detailedFunc);
      setShowDetailsModal(true);
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
      alert("Erro ao carregar detalhes do funcionário");
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedFuncionario(null);
  };

  if (loading || !initialSyncComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: "#174E9A" }}></div>
        <p className="text-gray-600">
          {!initialSyncComplete ? "Sincronizando com o leitor facial..." : "Carregando dados..."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Users className="mr-3" style={{ color: "#174E9A" }} size={32} />
          <h1 className="text-3xl font-bold text-gray-800">Funcionários</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={syncFromDevice}
            className="flex items-center px-4 py-2 border-2 rounded-lg hover:bg-gray-50 transition"
            style={{ borderColor: "#174E9A", color: "#174E9A" }}
            title="Sincronizar do leitor facial"
          >
            <RefreshCw size={20} className="mr-2" />
            Sincronizar do Leitor
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition"
            style={{ backgroundColor: "#174E9A" }}
          >
            <Plus size={20} className="mr-2" />
            Novo Funcionário
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Pesquisar por nome ou matrícula..."
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
                  ID Leitor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Foto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Matrícula
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Senha
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Facial
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFuncionarios.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Nenhum funcionário encontrado
                  </td>
                </tr>
              ) : (
                filteredFuncionarios.map((func) => (
                  <tr key={func.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">
                        {func.idFaceId ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            #{func.idFaceId}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-12 w-12 rounded-lg flex items-center justify-center overflow-hidden border-2" 
                           style={{ 
                             backgroundColor: func.image ? 'transparent' : '#f3f4f6',
                             borderColor: func.image ? '#d1d5db' : '#e5e7eb'
                           }}>
                        {func.image ? (
                          <img 
                            src={getImageSrc(func.image)} 
                            alt={func.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              console.error("❌ Erro ao carregar imagem do usuário ID:", func.id);
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23f3f4f6"/><text x="24" y="28" text-anchor="middle" fill="%239ca3af" font-size="20">👤</text></svg>';
                            }}
                          />
                        ) : (
                          <div className="text-gray-400 text-2xl">👤</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{func.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {func.registration || <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-2xl" title={func.password ? "Senha cadastrada" : "Sem senha"}>
                        {func.password ? "✅" : "❌"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-2xl" title={func.image ? "Foto cadastrada" : "Sem foto"}>
                        {func.image ? "✅" : "❌"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewDetails(func)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition"
                          title="Visualizar"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => openModal(func)}
                          className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(func.id)}
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
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditing ? "Editar Funcionário" : "Novo Funcionário"}
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
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={syncing}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  } ${syncing ? "bg-gray-100" : ""}`}
                  placeholder="Digite o nome completo"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matrícula
                </label>
                <input
                  type="text"
                  value={formData.registration}
                  onChange={(e) => setFormData(prev => ({ ...prev, registration: e.target.value }))}
                  disabled={syncing}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 border-gray-300 ${syncing ? "bg-gray-100" : ""}`}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    disabled={syncing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    } ${syncing ? "bg-gray-100" : ""}`}
                    placeholder={isEditing ? "Deixe em branco para não alterar" : "Mínimo 4 dígitos"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coluna da Imagem */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Foto do Funcionário
                  </label>
                  <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {formData.image ? (
                      <img src={getImageSrc(formData.image)} alt="Funcionário" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <Users size={40} className="mx-auto" />
                        <p>Sem imagem</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition" disabled={syncing}>
                      <Upload size={16} />
                      <span>Enviar</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={syncing} />
                    </label>
                    <button
                      onClick={handleCameraCapture}
                      disabled={!isEditing || capturingImage || syncing}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                    >
                      {capturingImage ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Camera size={16} />
                      )}
                      <span>{capturingImage ? "Capturando..." : "Leitor Facial"}</span>
                    </button>
                  </div>
                  {!isEditing && (
                    <p className="text-xs text-gray-500 text-center">
                      <AlertCircle size={14} className="inline mr-1" />
                      Salve o funcionário antes de usar o leitor facial.
                    </p>
                  )}
                </div>

                {/* Coluna de Departamentos e Horários */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departamentos
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                      {departamentos.length > 0 ? (
                        departamentos.map(dept => (
                          <label key={dept.id} className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.departamentos.includes(dept.id)}
                              onChange={() => toggleDepartamento(dept.id)}
                              disabled={syncing}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-800">{dept.name}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 p-2">Nenhum departamento encontrado.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horários de Acesso
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                      {horarios.length > 0 ? (
                        horarios.map(horario => (
                          <label key={horario.id} className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 cursor-pointer">
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
                        <p className="text-sm text-gray-500 p-2">Nenhum horário encontrado.</p>
                      )}
                    </div>
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
                {syncing ? "Salvando..." : (isEditing ? "Salvar Alterações" : "Criar Funcionário")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedFuncionario && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Detalhes do Funcionário</h2>
              <button onClick={closeDetailsModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Coluna da Foto */}
                <div className="md:col-span-1 flex flex-col items-center">
                  <div className="w-48 h-48 rounded-lg border-2 border-gray-200 flex items-center justify-center overflow-hidden mb-4">
                    {selectedFuncionario.image ? (
                      <img src={getImageSrc(selectedFuncionario.image)} alt={selectedFuncionario.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <Users size={60} />
                        <p>Sem imagem</p>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center">{selectedFuncionario.name}</h3>
                  <p className="text-sm text-gray-500">ID Leitor: {selectedFuncionario.idFaceId || "N/A"}</p>
                </div>

                {/* Coluna de Informações */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Informações Gerais</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 border border-gray-200">
                      <p><strong>Matrícula:</strong> {selectedFuncionario.registration || "Não definida"}</p>
                      <p><strong>Senha:</strong> {selectedFuncionario.password ? "Definida" : "Não definida"}</p>
                      <p><strong>ID Interno:</strong> <span className="font-mono">{selectedFuncionario.id}</span></p>
                      <p><strong>Criado em:</strong> {new Date(selectedFuncionario.createdAt).toLocaleString()}</p>
                      <p><strong>Atualizado em:</strong> {new Date(selectedFuncionario.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Departamentos Vinculados</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm border border-gray-200">
                      {selectedFuncionario.userGroups?.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {selectedFuncionario.userGroups.map(ug => (
                            <li key={ug.groupId}>{ug.group?.name || `ID: ${ug.groupId}`}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>Nenhum departamento vinculado.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Horários de Acesso</h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm border border-gray-200">
                      {selectedFuncionario.userAccessRules?.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {/* Extrai e exibe os time zones de todas as regras */}
                          {Array.from(new Set(selectedFuncionario.userAccessRules.flatMap(uar => 
                            uar.accessRule?.timeZones?.map(tz => tz.timeZone?.name).filter(Boolean) || []
                          ))).map(name => <li key={name}>{name}</li>)}
                        </ul>
                      ) : (
                        <p>Nenhum horário de acesso vinculado.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeDetailsModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  closeDetailsModal();
                  openModal(selectedFuncionario);
                }}
                className="flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition"
                style={{ backgroundColor: "#174E9A" }}
              >
                <Edit2 size={18} className="mr-2" />
                Editar Funcionário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
