import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
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
  
  console.log("DASHBOARD SCOPE EXECUTING...");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = () => {
    console.log("DASHBOARD V2: Fetch started");
    axios.get(`${API}/subscriptions/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async (response) => {
      console.log("DASHBOARD V2: Got subs", response.data);
      setSubscriptions(response.data || []);
      
      const agentIds = [...new Set((response.data || []).map(sub => sub.agent_id).filter(id => id))];
      const agentData = {};
      
      for (const agentId of agentIds) {
        try {
          const agentRes = await axios.get(`${API}/agents/${agentId}`);
          agentData[agentId] = agentRes.data;
        } catch(e) {
          console.error("DASHBOARD V2: Error fetching agent " + agentId);
        }
      }
      setAgents(agentData);
    })
    .catch((err) => {
      console.error("DASHBOARD V2: Error", err);
      toast.error("Erro ao carregar assinaturas");
    })
    .finally(() => {
      console.log("DASHBOARD V2: Setting loading false");
      setTimeout(() => setLoading(false), 300);
    });
  };

  if (loading) {
    return (
      <SidebarLayout>
        {/* Top Bar Skeleton */}
        <div className="bg-paper/80 backdrop-blur border-b border-line px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="w-48 h-6 bg-gray-200 rounded-full animate-pulse mb-2"></div>
              <div className="w-64 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="p-6 flex flex-col space-y-6">
          {[1, 2].map((idx) => (
            <div key={idx} className="bg-white border border-line rounded-xl overflow-hidden shadow-sm animate-pulse">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-200 rounded-xl shrink-0"></div>
                    <div>
                      <div className="w-32 h-6 bg-gray-200 rounded mb-2"></div>
                      <div className="flex gap-2">
                        <div className="w-16 h-5 bg-gray-200 rounded-full"></div>
                        <div className="w-16 h-5 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="w-20 h-8 bg-gray-200 rounded"></div>
                    <div className="w-16 h-4 bg-gray-200 rounded mt-2"></div>
                    <div className="flex gap-2 mt-2">
                      <div className="w-20 h-8 bg-gray-200 rounded-md"></div>
                      <div className="w-20 h-8 bg-gray-200 rounded-md"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      {/* Top Bar */}
      <div className="bg-paper/80 backdrop-blur border-b border-line px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-coreblue/10 border border-coreblue/20 rounded-full text-xs font-bold text-coreblue mb-2 tracking-wide uppercase">
              Minhas assinaturas de agentes
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-navy">Minhas Assinaturas</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Gerencie suas assinaturas e integrações</p>
          </div>
          {user.role === "admin" && (
            <Button
              variant="outline"
              onClick={() => navigate("/admin")}
              size="sm"
              className="border-line text-navy hover:bg-slate-100 font-bold"
            >
              Painel Admin
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {subscriptions.length === 0 ? (
          <Card className="border-line bg-white shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-navy mb-2">Nenhuma assinatura ativa</h3>
              <p className="text-gray-500 mb-6 font-medium">Explore o marketplace e escolha seu primeiro agente de IA</p>
              <Button
                data-testid="go-to-marketplace"
                onClick={() => navigate("/marketplace")}
                className="bg-coreblue hover:bg-blue-700 text-white font-bold"
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

              return (
                <Card
                  key={subscription.id}
                  data-testid={`subscription-card-${subscription.id}`}
                  className="border-line bg-white overflow-hidden transition-all duration-200 hover:shadow-md"
                >
                  <CardHeader 
                    className="border-b border-line"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-paper rounded-xl flex items-center justify-center border border-line shrink-0">
                          <img
                            src={agent.mascot_image_url}
                            alt={agent.name}
                            className="w-10 h-10 object-contain"
                            onError={(e) => { e.target.onerror = null; e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><rect width='40' height='40' fill='%23f9fafb'/><text x='20' y='25' font-family='sans-serif' font-size='12' text-anchor='middle' fill='%239ca3af'>AI</text></svg>"; }}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-navy mb-1">{agent.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-navy/5 text-navy border-line text-xs uppercase tracking-wide">
                              {agent.segment}
                            </Badge>
                            <Badge
                              className={
                                subscription.status === "active"
                                  ? "bg-coregreen/10 text-coregreen border border-coregreen/30 tracking-wide uppercase"
                                  : "bg-amber-100 text-amber-700 border border-amber-200 tracking-wide uppercase"
                              }
                            >
                              {subscription.status === "active" ? "Ativo" : "Pendente"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-navy">${agent.price}</div>
                        <div className="text-sm font-medium text-gray-500">por mês</div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-line text-navy hover:bg-paper font-semibold"
                            onClick={() => navigate(`/minhas-assinaturas`)}
                          >
                            Abrir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-line text-navy hover:bg-paper font-semibold"
                            onClick={() => navigate(`/integrations/${subscription.id}`)}
                          >
                            Integrações
                          </Button>
                        </div>
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
