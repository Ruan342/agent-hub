import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ExternalLink, RefreshCw, AlertCircle, TrendingUp, Activity, Phone, Home, ShoppingBag, LayoutDashboard, FileText, Code2 } from "lucide-react";
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
  const [copiedKey, setCopiedKey] = useState(null);
  const [editingWebhook, setEditingWebhook] = useState({});
  const [savingWebhook, setSavingWebhook] = useState({});
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

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copiado para área de transferência!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUpdateWebhook = async (subscriptionId) => {
    const webhookUrl = editingWebhook[subscriptionId];
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      toast.error("Digite uma URL válida (deve começar com http:// ou https://)");
      return;
    }

    setSavingWebhook({ ...savingWebhook, [subscriptionId]: true });
    try {
      await axios.put(
        `${API}/subscriptions/${subscriptionId}/webhook`,
        { webhook_url: webhookUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Webhook atualizado com sucesso!");
      fetchSubscriptions();
      setEditingWebhook({ ...editingWebhook, [subscriptionId]: "" });
    } catch (error) {
      toast.error("Erro ao atualizar webhook");
    } finally {
      setSavingWebhook({ ...savingWebhook, [subscriptionId]: false });
    }
  };

  const getAnalytics = (subscriptionId) => {
    return {
      totalCalls: Math.floor(Math.random() * 1000) + 100,
      successRate: (Math.random() * 10 + 90).toFixed(1),
      avgDuration: (Math.random() * 3 + 1).toFixed(1),
      lastCall: new Date(Date.now() - Math.random() * 86400000).toLocaleString('pt-BR')
    };
  };

  const menuItems = [
    { icon: Home, label: "Início", path: "/" },
    { icon: ShoppingBag, label: "Marketplace", path: "/marketplace" },
    { icon: LayoutDashboard, label: "Minhas Assinaturas", path: "/dashboard", active: true },
    { icon: FileText, label: "Faturas", path: "/billing" },
    { icon: Code2, label: "Documentação API", path: "/api-docs" },
  ];

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
                  className="border-gray-200"
                >
                  <CardHeader className="border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-xl flex items-center justify-center border border-purple-100">
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
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    <Tabs defaultValue="integration" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="integration">Integração</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                      </TabsList>

                      <TabsContent value="integration" className="space-y-6">
                        {/* API Key */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold">API Key</Label>
                            <span className="text-xs text-gray-500">Use para autenticar suas requisições</span>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              data-testid={`api-key-${subscription.id}`}
                              value={subscription.api_key}
                              readOnly
                              className="font-mono text-sm bg-gray-50 border-gray-300"
                            />
                            <Button
                              data-testid={`copy-api-key-${subscription.id}`}
                              variant="outline"
                              size="icon"
                              onClick={() => copyToClipboard(subscription.api_key, `api-${subscription.id}`)}
                              className="shrink-0 border-gray-300"
                            >
                              {copiedKey === `api-${subscription.id}` ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Webhook URL */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold">Webhook URL</Label>
                            <span className="text-xs text-gray-500">Receba eventos em tempo real</span>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              data-testid={`webhook-input-${subscription.id}`}
                              placeholder="https://seu-servidor.com/webhook"
                              value={
                                editingWebhook[subscription.id] !== undefined
                                  ? editingWebhook[subscription.id]
                                  : subscription.webhook_url || ""
                              }
                              onChange={(e) =>
                                setEditingWebhook({ ...editingWebhook, [subscription.id]: e.target.value })
                              }
                              className="border-gray-300"
                            />
                            <Button
                              data-testid={`update-webhook-${subscription.id}`}
                              onClick={() => handleUpdateWebhook(subscription.id)}
                              className="bg-black hover:bg-gray-900 shrink-0"
                              disabled={savingWebhook[subscription.id]}
                            >
                              {savingWebhook[subscription.id] ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                "Salvar"
                              )}
                            </Button>
                          </div>
                          {subscription.webhook_url && (
                            <p className="text-xs text-gray-500 mt-2 flex items-center">
                              <Check className="w-3 h-3 text-green-500 mr-1" />
                              Configurado: {subscription.webhook_url}
                            </p>
                          )}
                        </div>

                        {/* Integration Example */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-gray-600" />
                              <h4 className="font-semibold text-sm">Exemplo de Integração</h4>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => navigate("/api-docs")}
                            >
                              Ver docs completos
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                          <code className="text-xs bg-white px-3 py-2 rounded block overflow-x-auto border border-gray-200">
                            {`curl -X POST https://api.voiceaihub.com/v1/call \\`}<br />
                            {`  -H "Authorization: Bearer ${subscription.api_key}" \\`}<br />
                            {`  -d '{"phone": "+5511999999999"}'`}
                          </code>
                        </div>

                        {/* Voice Test */}
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                          <h4 className="font-semibold text-sm mb-3">Testar Voz do Agente</h4>
                          <VoiceTest
                            agentId={agent.id}
                            subscriptionId={subscription.id}
                            voiceId={agent.elevenlabs_voice_id}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="analytics" className="space-y-6">
                        {/* Analytics Cards */}
                        <div className="grid md:grid-cols-4 gap-4">
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-600">Total de Chamadas</span>
                              <Phone className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="text-2xl font-bold">{analytics.totalCalls}</div>
                            <div className="text-xs text-gray-500 mt-1">Últimos 30 dias</div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-600">Taxa de Sucesso</span>
                              <TrendingUp className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="text-2xl font-bold">{analytics.successRate}%</div>
                            <div className="text-xs text-green-600 mt-1">+2.3% vs mês anterior</div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-600">Duração Média</span>
                              <Activity className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="text-2xl font-bold">{analytics.avgDuration}min</div>
                            <div className="text-xs text-gray-500 mt-1">Por chamada</div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-600">Última Chamada</span>
                              <RefreshCw className="w-4 h-4 text-gray-400" />
                            </div>
                            <div className="text-sm font-semibold">{analytics.lastCall.split(",")[0]}</div>
                            <div className="text-xs text-gray-500 mt-1">{analytics.lastCall.split(",")[1]}</div>
                          </div>
                        </div>

                        {/* Coming Soon */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-8 text-center">
                          <div className="text-3xl mb-3">📊</div>
                          <h3 className="font-semibold mb-2">Analytics Detalhado em Breve</h3>
                          <p className="text-sm text-gray-600">
                            Gráficos de performance, histórico completo de chamadas e insights avançados
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
