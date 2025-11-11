import { useState, useEffect } from "react";
import { Users, Plus, Search, Edit2, Trash2, Camera, Upload, X, Eye, EyeOff } from "lucide-react";

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
  }, []);

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
      
      // Debug: verificar se algum usuário tem imagem
      const usersWithImage = usersData.users?.filter(u => u.image) || [];
      console.log("- Usuários com imagem:", usersWithImage.length);
      if (usersWithImage.length > 0) {
        console.log("  Exemplo de imagem (primeiros 100 chars):", usersWithImage[0].image?.substring(0, 100));
      }

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
      
      // Carregar departamentos e horários vinculados
      let vinculatedDepts = [];
      let vinculatedHorarios = [];
      
      try {
        // Buscar detalhes completos do usuário incluindo vínculos
        const userDetailResponse = await fetch(`${API_URL}/users/${funcionario.id}`);
        if (userDetailResponse.ok) {
          const userDetail = await userDetailResponse.json();
          console.log("Detalhes do usuário:", userDetail);
          
          // Aqui você pode extrair departamentos e horários se a API retornar
          // Por enquanto, deixamos vazio para o usuário reselecionar
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
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (!formData.registration.trim()) {
      newErrors.registration = "Matrícula é obrigatória";
    }

    if (!isEditing && !formData.password) {
      newErrors.password = "Senha é obrigatória para novos funcionários";
    }

    if (formData.password && formData.password.length < 4) {
      newErrors.password = "Senha deve ter no mínimo 4 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSubmit = async () => {
  if (!validateForm()) return;

  try {
    // 1️⃣ Monta os dados básicos do funcionário
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

    // 2️⃣ Se houver imagem, envia para o backend
    if (formData.image) {
      console.log("📸 Enviando imagem para usuário...");
      const imgRes = await fetch(`${API_URL}/users/${userId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: formData.image })
      });

      if (imgRes.ok) {
        console.log("✅ Imagem salva no backend.");
      } else {
        console.error("❌ Falha ao salvar imagem no backend.");
      }
    }

    // 3️⃣ Vincular departamentos (grupos)
    if (formData.departamentos.length > 0) {
      console.log("🏢 Vinculando departamentos:", formData.departamentos);
      for (const deptId of formData.departamentos) {
        try {
          const groupResponse = await fetch(`${API_URL}/access-rules/groups/${deptId}/users/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
          if (groupResponse.ok) {
            console.log(`✅ Departamento ${deptId} vinculado com sucesso`);
          } else {
            const err = await groupResponse.json();
            console.error(`❌ Erro ao vincular departamento ${deptId}:`, err);
          }
        } catch (err) {
          console.error(`❌ Falha ao vincular departamento ${deptId}:`, err);
        }
      }
    }

    // 4️⃣ Criar regra de acesso com horários
    if (formData.horarios.length > 0) {
      console.log("🕒 Criando regras de acesso com horários...");
      for (const timeZoneId of formData.horarios) {
        try {
          const rulePayload = {
            name: `Regra ${savedUser.name} - TZ ${timeZoneId}`,
            type: 1,
            priority: 0,
            timeZones: [timeZoneId],
            users: [userId]
          };

          const ruleRes = await fetch(`${API_URL}/access-rules/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rulePayload)
          });

          if (!ruleRes.ok) {
            const err = await ruleRes.json();
            console.error("❌ Erro ao criar regra:", err);
            continue;
          }

          const createdRule = await ruleRes.json();
          console.log("✅ Regra criada:", createdRule);

          // Sincronizar regra com o leitor
          await fetch(`${API_URL}/access-rules/${createdRule.id}/sync-to-idface`, { method: "POST" });
          console.log("🔄 Regra sincronizada com leitor iDFace");
        } catch (err) {
          console.error("❌ Erro ao processar horário:", err);
        }
      }
    }

    // 5️⃣ Sincronizar usuário e imagem com o leitor
    console.log("🔄 Sincronizando usuário com o leitor iDFace...");
    const syncRes = await fetch(`${API_URL}/users/${userId}/sync-to-idface`, { method: "POST" });
    if (syncRes.ok) {
      console.log("✅ Usuário sincronizado com o leitor");
    } else {
      const err = await syncRes.json();
      console.error("❌ Erro ao sincronizar usuário:", err);
    }

    alert(`✅ Funcionário ${isEditing ? "atualizado" : "criado"} com sucesso!\n
Departamentos: ${formData.departamentos.length}
Horários: ${formData.horarios.length}
Imagem: ${formData.image ? "Sim" : "Não"}`);

    closeModal();
    loadData();
  } catch (error) {
    console.error("❌ Erro no handleSubmit:", error);
    alert("Erro ao salvar funcionário: " + error.message);
  }
};


  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este funcionário?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Erro ao deletar funcionário");
      }

      alert("Funcionário excluído com sucesso!");
      loadData();
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao deletar funcionário");
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
      // Remove o prefixo data:image/...;base64, se existir
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

    // 1️⃣ Inicia a captura no leitor
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

    // 2️⃣ Se a captura foi bem-sucedida, tenta obter a imagem novamente do backend
    if (result.success) {
      console.log("✅ Captura facial concluída com sucesso no leitor!");

      // Busca a imagem atualizada do backend
      const imageResponse = await fetch(`${API_URL}/users/${formData.id}/image`);
      if (imageResponse.ok) {
        const imageBlob = await imageResponse.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result.split(",")[1];
          setFormData((prev) => ({ ...prev, image: base64Data }));
          console.log("🖼️ Imagem capturada e vinculada ao formulário.");
        };
        reader.readAsDataURL(imageBlob);
      } else {
        console.warn("⚠️ Não foi possível obter a imagem após a captura.");
      }

      // 3️⃣ Sincroniza o usuário (e a nova imagem) com o leitor
      const syncRes = await fetch(`${API_URL}/users/${formData.id}/sync-to-idface`, {
        method: "POST"
      });

      if (syncRes.ok) {
        console.log("🔄 Usuário sincronizado com o leitor após captura facial.");
        alert("✅ Imagem capturada e sincronizada com sucesso!");
      } else {
        const err = await syncRes.json();
        console.error("❌ Falha ao sincronizar usuário com o leitor:", err);
        alert("⚠️ Imagem capturada, mas falhou ao sincronizar com o leitor.");
      }

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
          <Users className="mr-3" style={{ color: "#174E9A" }} size={32} />
          <h1 className="text-3xl font-bold text-gray-800">Funcionários</h1>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition"
          style={{ backgroundColor: "#174E9A" }}
        >
          <Plus size={20} className="mr-2" />
          Novo Funcionário
        </button>
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
                  Foto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Matrícula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Sincronizado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFuncionarios.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    Nenhum funcionário encontrado
                  </td>
                </tr>
              ) : (
                filteredFuncionarios.map((func) => (
                  <tr key={func.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center overflow-hidden" 
                           style={{ 
                             backgroundColor: func.image ? 'transparent' : '#e5e7eb',
                             border: func.image ? '2px solid #d1d5db' : 'none'
                           }}>
                        {func.image ? (
                          <img 
                            src={getImageSrc(func.image)} 
                            alt={func.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              console.error("❌ Erro ao carregar imagem do usuário ID:", func.id);
                              console.log("   Tamanho da string base64:", func.image?.length);
                              e.target.onerror = null; // Previne loop infinito
                              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text x="20" y="20" text-anchor="middle" fill="gray" font-size="24">👤</text></svg>';
                            }}
                          />
                        ) : (
                          <div className="text-gray-600">
                            <Users size={20} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{func.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{func.registration || "—"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          func.idFaceId
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {func.idFaceId ? "Sim" : "Pendente"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openModal(func)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(func.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
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
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Digite o nome completo"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matrícula *
                </label>
                <input
                  type="text"
                  value={formData.registration}
                  onChange={(e) => setFormData(prev => ({ ...prev, registration: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.registration ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Digite a matrícula"
                />
                {errors.registration && <p className="text-red-500 text-sm mt-1">{errors.registration}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha {!isEditing && "*"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 pr-10 ${
                      errors.password ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder={isEditing ? "Deixe em branco para manter" : "Digite a senha"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamentos
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {departamentos.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum departamento disponível</p>
                  ) : (
                    departamentos.map(dept => (
                      <label key={dept.id} className="flex items-center mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.departamentos.includes(dept.id)}
                          onChange={() => toggleDepartamento(dept.id)}
                          className="mr-2"
                        />
                        <span className="text-sm">{dept.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horários de Acesso
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {horarios.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhum horário disponível</p>
                  ) : (
                    horarios.map(horario => (
                      <label key={horario.id} className="flex items-center mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.horarios.includes(horario.id)}
                          onChange={() => toggleHorario(horario.id)}
                          className="mr-2"
                        />
                        <span className="text-sm">{horario.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto
                </label>
                
                {formData.image && (
                  <div className="mb-3">
                    <div className="flex justify-center mb-2">
                      <div className="relative">
                        <img 
                          src={getImageSrc(formData.image)}
                          alt="Preview"
                          className="h-32 w-32 object-cover rounded-lg border-2 border-gray-300"
                          onError={(e) => {
                            console.error("❌ Erro ao carregar preview da imagem");
                            console.log("   Base64 length:", formData.image?.length);
                            console.log("   Base64 starts with:", formData.image?.substring(0, 50));
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><text x="64" y="64" text-anchor="middle" fill="red" font-size="16">Erro</text></svg>';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          title="Remover imagem"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      Tamanho: {Math.round((formData.image?.length || 0) * 0.75 / 1024)} KB
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <Upload size={18} className="mr-2" />
                    <span className="text-sm">Carregar Imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleCameraCapture}
                    disabled={!isEditing || capturingImage}
                    className="flex-1 flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: "#174E9A", color: "#174E9A" }}
                  >
                    <Camera size={18} className="mr-2" />
                    <span className="text-sm">
                      {capturingImage ? "Capturando..." : "Capturar com Leitor"}
                    </span>
                  </button>
                </div>
                {!isEditing && (
                  <p className="text-xs text-gray-500 mt-2">
                    * Salve o funcionário primeiro para usar a captura com o leitor
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 transition"
                  style={{ backgroundColor: "#174E9A" }}
                >
                  {isEditing ? "Atualizar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}