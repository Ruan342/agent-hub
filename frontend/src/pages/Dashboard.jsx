import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import VoiceTest from "@/components/VoiceTest";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptions(response.data);

      const agentIds = [...new Set(response.data.map(sub => sub.agent_id))];
      const agentData = {};
      for (const agentId of agentIds) {
        try {
          const agentResponse = await axios.get(`${API}/agents/${agentId}`);
          agentData[agentId] = agentResponse.data;
        } catch (error) {
          console.error(`Error fetching agent ${agentId}`);
        }
      }
      setAgents(agentData);
    } catch (error) {
      toast.error("Erro ao carregar assinaturas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Carregando dashboard...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      {/* Top Bar */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-xs font-medium text-purple-700 mb-2">
              Minhas assinaturas de agentes
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Minhas Assinaturas</h1>
            <p className="text-sm text-gray-600 mt-1">Gerencie suas assinaturas e integrações</p>
          </div>
          {user.role === "admin" && (
            <Button
              variant="outline"
              onClick={() => navigate("/admin")}
              size="sm"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              Painel Admin
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {subscriptions.length === 0 ? (
          <Card className="border-gray-200 bg-gradient-to-br from-purple-50/40 via-white to-purple-50/40">
            <CardContent className="py-16 text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma assinatura ativa</h3>
              <p className="text-gray-600 mb-6">Explore o marketplace e escolha seu primeiro agente de IA</p>
              <Button
                data-testid="go-to-marketplace"
                onClick={() => navigate("/marketplace")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Explorar Agentes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {subscriptions.map((subscription) => {
              const agent = agents[subscription.agent_id];
              if (!agent) return null;

              const analytics = getAnalytics(subscription.id);

              return (
                <Card
                  key={subscription.id}
                  data-testid={`subscription-card-${subscription.id}`}
                  className="border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md"
                >
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                    onClick={() => navigate(`/agent-chat/${subscription.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-xl flex items-center justify-center border border-purple-100 shrink-0">
                          <img
                            src={agent.mascot_image_url}
                            alt={agent.name}
                            className="w-10 h-10 object-contain"
                            onError={(e) => (e.target.src = "https://via.placeholder.com/40/f9fafb/9ca3af?text=AI")}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-xl mb-1">{agent.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-50 text-purple-700 border-0 text-xs">
                              {agent.segment}
                            </Badge>
                            <Badge
                              className={
                                subscription.status === "active"
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                              }
                            >
                              {subscription.status === "active" ? "Ativo" : "Pendente"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-700">${agent.price}</div>
                        <div className="text-sm text-gray-500">por mês</div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/agent-chat/${subscription.id}`);
                          }}
                        >
                          Abrir
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
