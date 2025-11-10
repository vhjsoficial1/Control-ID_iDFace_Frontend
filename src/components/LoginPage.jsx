import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const result = await login(username, password);
      if (!result.success) {
        setErro(result.error || "Erro ao fazer login");
      }
    } catch (error) {
      setErro("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md border-2 border-gray-100">
        <div className="text-center mb-8">
          <img src="/assets/logo-maxplast.png" alt="Max Plast Logo" className="mx-auto h-20 object-contain mb-6" />
          <h1 className="text-3xl font-bold text-gray-800">Controle de Acesso</h1>
          <p className="text-gray-600 mt-2">Sistema de Gestão iDFace</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174E9A]"
              placeholder="Digite seu usuário"
              disabled={loading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#174E9A]"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {erro && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{erro}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition duration-200 disabled:opacity-50"
            style={{ backgroundColor: "#174E9A" }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Sistema iDFace Control v1.0.0</p>
        </div>
      </div>
    </div>
  );
}