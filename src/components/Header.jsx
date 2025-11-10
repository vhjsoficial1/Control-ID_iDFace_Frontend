import { Menu } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getInitials } from "../utils/helpers";

export default function Header({ toggleSidebar }) {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu size={24} style={{ color: "#174E9A" }} />
        </button>
        <h2 className="text-xl font-semibold text-gray-800">Sistema de Controle de Acesso</h2>
        <div className="flex items-center">
          <span className="text-sm text-gray-600 mr-2">{user?.username}</span>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: "#174E9A" }}
          >
            {getInitials(user?.username)}
          </div>
        </div>
      </div>
    </header>
  );
}