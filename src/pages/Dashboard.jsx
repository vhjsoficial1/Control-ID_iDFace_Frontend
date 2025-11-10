import { Users, CheckCircle, XCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const mockChartData = [
  { dia: "Seg", validados: 45, negados: 8 },
  { dia: "Ter", validados: 52, negados: 5 },
  { dia: "Qua", validados: 48, negados: 12 },
  { dia: "Qui", validados: 61, negados: 7 },
  { dia: "Sex", validados: 55, negados: 9 },
  { dia: "Sáb", validados: 23, negados: 3 },
  { dia: "Dom", validados: 15, negados: 2 },
];

const mockAcessos = [
  { id: 1, nome: "João Silva", hora: "08:15:23", status: "validado", foto: "👤" },
  { id: 2, nome: "Maria Santos", hora: "08:16:45", status: "validado", foto: "👤" },
  { id: 3, nome: "Desconhecido", hora: "08:17:12", status: "negado", foto: "❌" },
  { id: 4, nome: "Pedro Costa", hora: "08:18:33", status: "validado", foto: "👤" },
  { id: 5, nome: "Ana Oliveira", hora: "08:19:01", status: "validado", foto: "👤" },
];

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard de Acessos</h1>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { title: "Acessos Hoje", value: "142", color: "#174E9A", icon: <Users style={{ color: "#174E9A" }} /> },
          { title: "Validados", value: "128", color: "#22c55e", icon: <CheckCircle className="text-green-600" /> },
          { title: "Negados", value: "14", color: "#ef4444", icon: <XCircle className="text-red-600" /> },
        ].map((card, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex justify-between items-center">
            <div>
              <p className="text-gray-600 text-sm">{card.title}</p>
              <p className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Acessos da Semana</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="validados" stroke="#174E9A" strokeWidth={2} name="Validados" />
            <Line type="monotone" dataKey="negados" stroke="#dc2626" strokeWidth={2} name="Negados" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Acessos Recentes */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Acessos Recentes</h2>
        {mockAcessos.map((acesso) => (
          <div key={acesso.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border mb-3">
            <div className="flex items-center">
              <div className="text-3xl mr-4">{acesso.foto}</div>
              <div>
                <p className="font-semibold text-gray-800">{acesso.nome}</p>
                <p className="text-sm text-gray-600">{acesso.hora}</p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                acesso.status === "validado"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {acesso.status === "validado" ? "Validado" : "Negado"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
