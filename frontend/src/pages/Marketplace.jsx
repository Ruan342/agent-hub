import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, LogOut, User, LayoutDashboard, Filter } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Marketplace() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState("all");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchAgents();
  }, [selectedSegment]);

  const fetchAgents = async () => {
    try {
      const url = selectedSegment === "all" ? `${API}/agents` : `${API}/agents?segment=${selectedSegment}`;
      const response = await axios.get(url);
      setAgents(response.data);
    } catch (error) {
      toast.error("Erro ao carregar agentes");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const segments = [
    { id: "all", label: "Todos" },
    { id: "vendas", label: "Vendas" },
    { id: "suporte", label: "Suporte" },
    { id: "marketing", label: "Marketing" },
    { id: "financeiro", label: "Financeiro" },
    { id: "rh", label: "RH" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">VoiceAI Hub</span>
          </div>
          <div className="flex items-center space-x-4">
            {user.name ? (
              <>
                <Button 
                  data-testid="dashboard-button"
                  variant="ghost" 
                  onClick={() => navigate("/dashboard")}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                {user.role === "admin" && (
                  <Button 
                    data-testid="admin-button"
                    variant="outline" 
                    onClick={() => navigate("/admin")}
                    className="border-gray-300"
                  >
                    Admin
                  </Button>
                )}
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{user.name}</span>
                </div>
                <Button 
                  data-testid="logout-button"
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/login")} className="bg-black hover:bg-gray-800">
                Entrar
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Marketplace</h1>
          <p className="text-lg text-gray-600">Escolha o agente ideal para seu negócio</p>
        </div>

        {/* Segment Filter */}
        <div className="mb-8 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filtrar por segmento</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {segments.map((segment) => (
              <Button
                key={segment.id}
                data-testid={`segment-${segment.id}`}
                onClick={() => setSelectedSegment(segment.id)}
                variant={selectedSegment === segment.id ? "default" : "outline"}
                size="sm"
                className={selectedSegment === segment.id ? "bg-black hover:bg-gray-800" : "border-gray-300 hover:border-black"}
              >
                {segment.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Request Custom Agent */}
        <div className="mb-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Não encontrou o que procura?</h3>
              <p className="text-sm text-gray-300">Solicite um agente personalizado para suas necessidades específicas</p>
            </div>
            <Button 
              data-testid="request-agent-button"
              onClick={() => navigate("/request-agent")} 
              className="bg-white text-black hover:bg-gray-100"
            >
              Solicitar Agente
            </Button>
          </div>
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
            <p className="text-gray-600 mt-4">Carregando agentes...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-xl" data-testid="no-agents-message">
            <p className="text-gray-600">Nenhum agente disponível neste segmento.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div 
                key={agent.id} 
                data-testid={`agent-card-${agent.id}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-black transition-all cursor-pointer group"
                onClick={() => navigate(`/agent/${agent.id}`)}
              >
                <div className="h-40 bg-gray-100 flex items-center justify-center border-b border-gray-200">
                  <img 
                    src={agent.mascot_image_url} 
                    alt={agent.name} 
                    className="w-24 h-24 object-contain"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/96/f3f4f6/6b7280?text=AI";
                    }}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-black">{agent.name}</h3>
                    <Badge className="bg-gray-100 text-gray-700 border-0 text-xs">{agent.segment}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{agent.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">${agent.price}</span>
                      <span className="text-gray-500 text-sm">/mês</span>
                    </div>
                    <Button 
                      data-testid={`view-agent-${agent.id}`}
                      size="sm" 
                      className="bg-black hover:bg-gray-800"
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
