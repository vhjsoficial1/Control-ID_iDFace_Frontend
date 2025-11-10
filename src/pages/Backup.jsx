import { Users } from "lucide-react";

export default function Backup() {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Users className="mr-3" style={{ color: "#174E9A" }} size={32} />
        <h1 className="text-3xl font-bold text-gray-800">Backup</h1>
      </div>
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
        <p className="text-gray-600 text-lg">Conteúdo de Backup</p>
        <p className="text-gray-500 mt-2">Integre aqui com sua API Control ID</p>
      </div>
    </div>
  );
}
