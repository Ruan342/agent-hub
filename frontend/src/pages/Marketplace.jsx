import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, LogOut, User, LayoutDashboard } from "lucide-react";
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

  const segments = ["all", "vendas", "suporte", "marketing", "financeiro", "rh"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate("/")}>
            <Mic className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">VoiceAI Hub</span>
          </div>
          <div className="flex items-center space-x-4">
            {user.name && (
              <>
                <Button 
                  data-testid="dashboard-button"
                  variant="ghost" 
                  onClick={() => navigate("/dashboard")}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Meu Dashboard
                </Button>
                {user.role === "admin" && (
                  <Button 
                    data-testid="admin-button"
                    variant="outline" 
                    onClick={() => navigate("/admin")}
                  >
                    Admin
                  </Button>
                )}
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{user.name}</span>
                </div>
                <Button 
                  data-testid="logout-button"
                  variant="ghost" 
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-6 py-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Marketplace de Agentes</h1>
          <p className="text-lg text-gray-600">Escolha o agente perfeito para seu negócio</p>
        </div>

        {/* Segment Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {segments.map((segment) => (
            <Button
              key={segment}
              data-testid={`segment-${segment}`}
              onClick={() => setSelectedSegment(segment)}
              variant={selectedSegment === segment ? "default" : "outline"}
              className={selectedSegment === segment ? "bg-indigo-600" : ""}
            >
              {segment === "all" ? "Todos" : segment.charAt(0).toUpperCase() + segment.slice(1)}
            </Button>
          ))}
        </div>

        {/* Request Custom Agent */}
        <div className="text-center mb-10">
          <p className="text-gray-600 mb-4">Não encontrou o que procura?</p>
          <Button 
            data-testid="request-agent-button"
            onClick={() => navigate("/request-agent")} 
            variant="outline" 
            className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
          >
            Solicitar Agente Personalizado
          </Button>
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-600">Carregando agentes...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20" data-testid="no-agents-message">
            <p className="text-gray-600">Nenhum agente disponível neste segmento.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {agents.map((agent) => (
              <div 
                key={agent.id} 
                data-testid={`agent-card-${agent.id}`}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow cursor-pointer"
                onClick={() => navigate(`/agent/${agent.id}`)}
              >
                <div className="h-48 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <img 
                    src={agent.mascot_image_url} 
                    alt={agent.name} 
                    className="w-32 h-32 object-contain"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/128?text=AI+Agent";
                    }}
                  />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-900">{agent.name}</h3>
                    <Badge className="bg-indigo-100 text-indigo-700">{agent.segment}</Badge>
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-indigo-600">${agent.price}/mês</span>
                    <Button 
                      data-testid={`view-agent-${agent.id}`}
                      size="sm" 
                      className="bg-indigo-600 hover:bg-indigo-700"
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
