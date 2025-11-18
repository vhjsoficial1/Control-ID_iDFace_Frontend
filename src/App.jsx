import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import LoginPage from "./components/LoginPage";
import { useAuth } from "./hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import Funcionarios from "./pages/Funcionarios";
import Horarios from "./pages/Horarios";
import Regras from "./pages/Regras";
import Backup from "./pages/Backup";
import Relatorio from "./pages/Relatorio";
import { controlIdService } from "./services/controlIdService";

export default function App() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

const handleAbrirPorta = async () => {
    try {
      const result = await controlIdService.openSecBox();
      if (result.success) {
        alert(`✅ ${result.message}\n\nAção: ${result.action}\nExecutado em: ${new Date(result.executedAt).toLocaleString('pt-BR')}`);
      } else {
        alert(`❌ Erro ao abrir porta\n\n${result.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error("Erro ao abrir porta:", error);
      alert("❌ Erro ao comunicar com o dispositivo\n\nVerifique se o servidor está rodando e se o leitor facial está acessível.");
    }
  };

  if (!user) return <LoginPage />;

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onAbrirPorta={handleAbrirPorta}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {currentPage === "dashboard" && <Dashboard />}
          {currentPage === "funcionarios" && <Funcionarios />}
          {currentPage === "horarios" && <Horarios />}
          {currentPage === "regras" && <Regras />}
          {currentPage === "backup" && <Backup />}
          {currentPage === "relatorio" && <Relatorio />}
        </main>
      </div>
    </div>
  );
}