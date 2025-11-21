import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Settings, Key, Link2, TrendingUp, Send, Loader2, Copy, Check, ArrowLeft, Mic, MicOff, Volume2, Keyboard } from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AgentChat() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [customConfig, setCustomConfig] = useState({
    company_name: "",
    brand_name: "",
    product: "",
    audience: "",
    tone: "",
    extra: ""
  });
  const messagesEndRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [subscriptionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchData = async () => {
    try {
      // Get all subscriptions and find the one we need
      const subsResponse = await axios.get(`${API}/subscriptions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const sub = subsResponse.data.find(s => s.id === subscriptionId);
      if (!sub) {
        toast.error("Assinatura não encontrada");
        navigate("/dashboard");
        return;
      }
      
      setSubscription(sub);
      
      // Initialize config
      setCustomConfig({
        company_name: sub.config?.company_name || "",
        brand_name: sub.config?.brand_name || "",
        product: sub.config?.product || "",
        audience: sub.config?.audience || "",
        tone: sub.config?.tone || "",
        extra: sub.config?.extra || ""
      });

      // Get agent details
      const agentResponse = await axios.get(`${API}/agents/${sub.agent_id}`);
      setAgent(agentResponse.data);
      
      // Add welcome message
      setMessages([{
        role: "assistant",
        content: `Olá! Eu sou o ${agentResponse.data.name}. Como posso ajudar você hoje?`,
        timestamp: new Date()
      }]);
      
    } catch (error) {
      toast.error("Erro ao carregar dados");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setSending(true);

    try {
      const response = await axios.post(
        `${API}/agent/execute`,
        {
          input_text: inputMessage,
          session_id: `web_${subscriptionId}_${Date.now()}`
        },
        {
          headers: {
            Authorization: `Bearer ${subscription.api_key}`
          }
        }
      );

      const assistantMessage = {
        role: "assistant",
        content: response.data.output_text,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao enviar mensagem");
      // Remove user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await axios.put(
        `${API}/subscriptions/${subscriptionId}/config`,
        {
          custom_prompt: null,
          config: customConfig
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success("Copiado!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">Carregando agente...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar de Navegação */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center">
                <img
                  src={agent?.mascot_image_url}
                  alt={agent?.name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => e.target.src = "https://via.placeholder.com/32"}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm truncate">{agent?.name}</h2>
                <Badge className="bg-green-50 text-green-700 border-0 text-xs">
                  {subscription?.status === "active" ? "Ativo" : "Pendente"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex-1 p-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                activeTab === "chat"
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            
            <button
              onClick={() => setActiveTab("config")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                activeTab === "config"
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Settings className="w-4 h-4" />
              Configurações
            </button>
            
            <button
              onClick={() => setActiveTab("api")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                activeTab === "api"
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Key className="w-4 h-4" />
              API
            </button>
            
            <button
              onClick={() => setActiveTab("integrations")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                activeTab === "integrations"
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Link2 className="w-4 h-4" />
              Integrações
            </button>
            
            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "analytics"
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Analytics
            </button>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              ${agent?.price}/mês
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Tab */}
          {activeTab === "chat" && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-purple-600 text-white"
                          : "bg-white border border-gray-200 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className={`text-xs mt-1 block ${
                        msg.role === "user" ? "text-purple-200" : "text-gray-500"
                      }`}>
                        {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 bg-white p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={sending || !inputMessage.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}

          {/* Config Tab */}
          {activeTab === "config" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Configurações do Agente</h2>
                
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nome da empresa</Label>
                        <Input
                          value={customConfig.company_name}
                          onChange={(e) => setCustomConfig({...customConfig, company_name: e.target.value})}
                          placeholder="Ex: Clínica Vida Plena"
                        />
                      </div>
                      <div>
                        <Label>Nome da marca</Label>
                        <Input
                          value={customConfig.brand_name}
                          onChange={(e) => setCustomConfig({...customConfig, brand_name: e.target.value})}
                          placeholder="Ex: Vida Plena"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Produto/serviço principal</Label>
                      <Input
                        value={customConfig.product}
                        onChange={(e) => setCustomConfig({...customConfig, product: e.target.value})}
                        placeholder="Ex: Consultas nutricionais online"
                      />
                    </div>

                    <div>
                      <Label>Público-alvo</Label>
                      <Input
                        value={customConfig.audience}
                        onChange={(e) => setCustomConfig({...customConfig, audience: e.target.value})}
                        placeholder="Ex: Pessoas buscando emagrecimento saudável"
                      />
                    </div>

                    <div>
                      <Label>Tom de voz</Label>
                      <Input
                        value={customConfig.tone}
                        onChange={(e) => setCustomConfig({...customConfig, tone: e.target.value})}
                        placeholder="Ex: Profissional e acolhedor"
                      />
                    </div>

                    <div>
                      <Label>Informações adicionais</Label>
                      <Textarea
                        value={customConfig.extra}
                        onChange={(e) => setCustomConfig({...customConfig, extra: e.target.value})}
                        placeholder="Informações extras sobre seu negócio..."
                        rows={4}
                      />
                    </div>

                    <Button
                      onClick={handleSaveConfig}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Salvar Configurações
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* API Tab */}
          {activeTab === "api" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">API & Documentação</h2>
                
                <Card className="mb-6">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          value={subscription?.api_key}
                          readOnly
                          className="font-mono text-sm bg-gray-50"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(subscription?.api_key)}
                        >
                          {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold mb-2">Endpoint</p>
                      <code className="text-xs bg-white px-2 py-1 rounded border">
                        POST {BACKEND_URL}/api/agent/execute
                      </code>
                    </div>

                    <div>
                      <p className="text-sm font-semibold mb-2">Exemplo de requisição:</p>
                      <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto">
{`curl -X POST ${BACKEND_URL}/api/agent/execute \\
  -H "Authorization: Bearer ${subscription?.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_text": "Olá, preciso de ajuda",
    "session_id": "usuario_123"
  }'`}
                      </pre>
                    </div>

                    <Button
                      onClick={() => navigate("/api-docs")}
                      variant="outline"
                      className="w-full"
                    >
                      Ver Documentação Completa
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === "integrations" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Integrações</h2>
                
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">💬</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">WhatsApp Business</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            Integre seu agente ao WhatsApp para atendimento automatizado
                          </p>
                          <Button variant="outline" size="sm">
                            Configurar WhatsApp
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">📊</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">CRM</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            Conecte com Salesforce, HubSpot, Pipedrive e outros
                          </p>
                          <Button variant="outline" size="sm">
                            Configurar CRM
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">🔗</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">Webhook</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            Receba eventos e interações em tempo real
                          </p>
                          <Input
                            placeholder="https://seu-servidor.com/webhook"
                            className="mb-2"
                          />
                          <Button variant="outline" size="sm">
                            Salvar Webhook
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Analytics</h2>
                
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-3xl font-bold text-purple-600">1.2k</div>
                      <div className="text-sm text-gray-600 mt-1">Total de conversas</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-3xl font-bold text-green-600">94%</div>
                      <div className="text-sm text-gray-600 mt-1">Taxa de sucesso</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-3xl font-bold text-blue-600">2.5min</div>
                      <div className="text-sm text-gray-600 mt-1">Duração média</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <p className="text-gray-600 text-center py-8">
                      Analytics detalhado em breve...
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
