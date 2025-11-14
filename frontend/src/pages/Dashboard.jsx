import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Mic, ArrowLeft, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [editingWebhook, setEditingWebhook] = useState({});
  const token = localStorage.getItem("token");

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

      // Fetch agent details
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
    toast.success("Copiado!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUpdateWebhook = async (subscriptionId) => {
    const webhookUrl = editingWebhook[subscriptionId];
    if (!webhookUrl) {
      toast.error("Digite uma URL válida");
      return;
    }

    try {
      await axios.put(
        `${API}/subscriptions/${subscriptionId}/webhook`,
        { webhook_url: webhookUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Webhook atualizado!");
      fetchSubscriptions();
      setEditingWebhook({ ...editingWebhook, [subscriptionId]: "" });
    } catch (error) {
      toast.error("Erro ao atualizar webhook");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              data-testid="back-to-marketplace"
              variant="ghost" 
              onClick={() => navigate("/marketplace")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Marketplace
            </Button>
            <h1 className="text-4xl font-bold text-gray-900">Meu Dashboard</h1>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-gray-600 mb-4">Você ainda não tem nenhuma assinatura ativa.</p>
              <Button 
                data-testid="go-to-marketplace"
                onClick={() => navigate("/marketplace")} 
                className="bg-indigo-600 hover:bg-indigo-700"
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
                <Card key={subscription.id} data-testid={`subscription-card-${subscription.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                          <Mic className="w-8 h-8 text-indigo-600" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">{agent.name}</CardTitle>
                          <p className="text-gray-600">{agent.segment}</p>
                        </div>
                      </div>
                      <Badge 
                        className={subscription.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}
                      >
                        {subscription.status === "active" ? "Ativo" : "Pendente"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* API Key */}
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">API Key</Label>
                      <div className="flex space-x-2">
                        <Input 
                          data-testid={`api-key-${subscription.id}`}
                          value={subscription.api_key} 
                          readOnly 
                          className="font-mono text-sm"
                        />
                        <Button
                          data-testid={`copy-api-key-${subscription.id}`}
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(subscription.api_key, `api-${subscription.id}`)}
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
                      <Label className="text-sm font-semibold mb-2 block">Webhook URL</Label>
                      <div className="flex space-x-2">
                        <Input
                          data-testid={`webhook-input-${subscription.id}`}
                          placeholder="https://seu-servidor.com/webhook"
                          value={editingWebhook[subscription.id] || subscription.webhook_url || ""}
                          onChange={(e) => setEditingWebhook({ ...editingWebhook, [subscription.id]: e.target.value })}
                        />
                        <Button
                          data-testid={`update-webhook-${subscription.id}`}
                          onClick={() => handleUpdateWebhook(subscription.id)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          Atualizar
                        </Button>
                      </div>
                      {subscription.webhook_url && (
                        <p className="text-sm text-gray-500 mt-2">Atual: {subscription.webhook_url}</p>
                      )}
                    </div>

                    {/* Documentation Link */}
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Como Integrar
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Use a API Key acima para autenticar suas requisições. Configure o webhook para receber eventos em tempo real.
                      </p>
                      <code className="text-xs bg-white px-3 py-2 rounded block">
                        Authorization: Bearer {subscription.api_key}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
