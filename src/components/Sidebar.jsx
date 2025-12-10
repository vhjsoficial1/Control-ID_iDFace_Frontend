import { useState } from "react";
import {
  Users, DoorOpen, Database, FileText, LogOut, X,
  ChevronDown, ChevronRight
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Sidebar({ isOpen, onClose, currentPage, setCurrentPage, onAbrirPorta }) {
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />}
      <div
        className={`fixed lg:static inset-y-0 left-0 transform ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 ease-in-out text-white w-64 p-6 z-50 flex flex-col`}
        style={{ backgroundColor: "#174E9A" }}
      >
        <div className="flex items-center justify-between mb-8">
          <img src="/assets/logo-maxplast-fundo-branco.png" alt="Max Plast Logo" className="h-12 object-contain mx-auto" />
          <button onClick={onClose} className="lg:hidden"><X size={24} /></button>
        </div>

        <nav className="flex-1">
          <button
            onClick={() => setCurrentPage("dashboard")}
            className={`flex items-center w-full p-3 rounded-lg transition ${currentPage === "dashboard" ? "bg-white bg-opacity-20" : "hover:bg-white hover:bg-opacity-10"}`}
          >
            <FileText className="mr-3" size={20} /> Dashboard
          </button>

          <div className="mt-4">
            <button
              onClick={() => setCadastroOpen(!cadastroOpen)}
              className="flex items-center justify-between w-full p-3 rounded-lg transition hover:bg-white hover:bg-opacity-10"
            >
              <div className="flex items-center"><Users className="mr-3" size={20} />Cadastros</div>
              {cadastroOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {cadastroOpen && (
              <div className="ml-4 mt-2 space-y-1">
                {[
                  { path: "funcionarios", label: "Funcionários" },
                  { path: "horarios", label: "Horários" },
                  { path: "regras", label: "Departamentos" },
                ].map((page) => (
                  <button
                    key={page.path}
                    onClick={() => setCurrentPage(page.path)}
                    className={`flex items-center w-full p-2 pl-4 rounded-lg transition text-sm ${currentPage === page.path ? "bg-white bg-opacity-20" : "hover:bg-white hover:bg-opacity-10"}`}
                  >
                    {page.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onAbrirPorta}
            className="flex items-center w-full p-3 rounded-lg transition hover:bg-green-600 bg-green-700 mt-6 mb-6"
          >
            <DoorOpen className="mr-3" size={20} /> Abrir Porta
          </button>

          <button
            onClick={() => setCurrentPage("backup")}
            className={`flex items-center w-full p-3 rounded-lg transition mb-2 ${currentPage === "backup" ? "bg-white bg-opacity-20" : "hover:bg-white hover:bg-opacity-10"}`}
          >
            <Database className="mr-3" size={20} /> Backup
          </button>
        </nav>

        <button
          onClick={logout}
          className="flex items-center w-full p-3 rounded-lg transition hover:bg-red-600 mt-auto"
        >
          <LogOut className="mr-3" size={20} /> Logout
        </button>
      </div>
    </>
  );
}
