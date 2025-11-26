import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Users, Webhook, Globe, Plus, Settings, Trash2, Check, X, Loader2, BookOpen, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Integrations() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [subscription, setSubscription] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalData, setModalData] = useState({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [subscriptionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get subscription details
      const subRes = await axios.get(`${API}/subscriptions/${subscriptionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(subRes.data);

      // Get integrations
      const intRes = await axios.get(`${API}/integrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter by subscription
      const filtered = intRes.data.integrations.filter(
        i => i.subscription_id === subscriptionId
      );
      setIntegrations(filtered);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, data = {}) => {
    setModalType(type);
    setModalData(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType("");
    setModalData({});
  };

  const createIntegration = async (integrationData) => {
    try {
      await axios.post(
        `${API}/integrations`,
        {
          subscription_id: subscriptionId,
          type: modalType,
          name: integrationData.name,
          config: integrationData.config
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Integração criada com sucesso!");
      closeModal();
      fetchData();
    } catch (error) {
      console.error("Error creating integration:", error);
      toast.error(error.response?.data?.detail || "Erro ao criar integração");
    }
  };

  const deleteIntegration = async (id) => {
    if (!window.confirm("Tem certeza que deseja deletar esta integração?")) return;
    
    try {
      await axios.delete(`${API}/integrations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Integração deletada");
      fetchData();
    } catch (error) {
      console.error("Error deleting integration:", error);
      toast.error("Erro ao deletar integração");
    }
  };

  const testIntegration = async (integration) => {
    setTesting(true);
    try {
      if (integration.type === "email") {
        const testEmail = prompt("Digite o email para enviar o teste:");
        if (!testEmail) return;
        
        await axios.post(
          `${API}/integrations/email/test`,
          null,
          {
            params: { integration_id: integration.id, test_email: testEmail },
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        toast.success("Email de teste enviado! Verifique sua caixa de entrada.");
      } else if (integration.type === "whatsapp") {
        const testPhone = prompt("Digite o número WhatsApp (com código do país, ex: 5511999999999):");
        if (!testPhone) return;
        
        await axios.post(
          `${API}/integrations/whatsapp/test`,
          null,
          {
            params: { integration_id: integration.id, test_phone: testPhone },
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        toast.success("Mensagem de teste enviada! Verifique seu WhatsApp.");
      } else if (integration.type === "widget") {
        // Show widget snippet
        showWidgetSnippet(integration);
      } else if (integration.type === "crm") {
        // Test CRM integration
        await axios.post(
          `${API}/integrations/crm/test`,
          null,
          {
            params: { integration_id: integration.id },
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        toast.success("Contato de teste criado no CRM com sucesso!");
      } else if (integration.type === "webhook") {
        // Test webhook integration
        await axios.post(
          `${API}/integrations/webhook/test`,
          null,
          {
            params: { integration_id: integration.id },
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        toast.success("Webhook de teste enviado com sucesso!");
      } else {
        toast.info("Teste não disponível para este tipo de integração ainda.");
      }
    } catch (error) {
      console.error("Test error:", error);
      toast.error(error.response?.data?.detail || "Erro ao testar integração");
    } finally {
      setTesting(false);
    }
  };

  const showWidgetSnippet = async (integration) => {
    try {
      const res = await axios.get(
        `${API}/integrations/widget/snippet`,
        {
          params: { integration_id: integration.id },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Show snippet in modal
      const snippet = res.data.snippet;
      const modal = window.confirm(
        `Copie e cole este código no seu site:\n\n${snippet}\n\nClique OK para copiar para a área de transferência.`
      );
      
      if (modal) {
        navigator.clipboard.writeText(snippet);
        toast.success("Snippet copiado para a área de transferência!");
      }
    } catch (error) {
      console.error("Error getting snippet:", error);
      toast.error("Erro ao obter snippet");
    }
  };

  const integrationTypes = [
    {
      type: "email",
      name: "Email",
      icon: Mail,
      description: "Enviar emails transacionais via SendGrid",
      color: "bg-blue-500"
    },
    {
      type: "whatsapp",
      name: "WhatsApp",
      icon: MessageSquare,
      description: "Enviar e receber mensagens via WhatsApp Business",
      color: "bg-green-500"
    },
    {
      type: "crm",
      name: "CRM",
      icon: Users,
      description: "Sincronizar contatos com Salesforce, HubSpot, Pipedrive",
      color: "bg-purple-500"
    },
    {
      type: "webhook",
      name: "Webhook",
      icon: Webhook,
      description: "Notificar sistemas externos via webhooks",
      color: "bg-orange-500"
    },
    {
      type: "widget",
      name: "Widget de Chat",
      icon: Globe,
      description: "Widget embarcável para seu site com voz",
      color: "bg-pink-500"
    }
  ];

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrações</h1>
          <p className="text-gray-600">
            Conecte seu agente <span className="font-semibold text-purple-600">{subscription?.agent_id}</span> com diferentes canais
          </p>
        </div>

        {/* Help Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-500 p-3 rounded-lg flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                📚 Guia Completo de Configuração
              </h3>
              <p className="text-gray-700 mb-3">
                Precisa de ajuda para configurar suas integrações? Criamos um guia detalhado com instruções passo a passo para cada canal.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/GUIA_INTEGRAÇÕES.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Guia Completo
                </a>
                <button
                  onClick={() => window.open('https://developers.facebook.com/docs/whatsapp', '_blank')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 rounded-lg font-medium transition-colors"
                >
                  Docs WhatsApp
                </button>
                <button
                  onClick={() => window.open('https://docs.sendgrid.com/', '_blank')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 rounded-lg font-medium transition-colors"
                >
                  Docs SendGrid
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {integrationTypes.map((type) => {
            const Icon = type.icon;
            const existing = integrations.find(i => i.type === type.type);
            
            return (
              <div
                key={type.type}
                className="bg-white rounded-xl shadow-sm border-2 border-gray-100 hover:border-purple-200 transition-all p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${type.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {existing && (
                    <Badge className="bg-green-100 text-green-800">
                      <Check className="w-3 h-3 mr-1" />
                      Ativo
                    </Badge>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{type.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{type.description}</p>
                
                {existing ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openModal(type.type, existing)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Configurar
                    </Button>
                    <Button
                      onClick={() => testIntegration(existing)}
                      variant="outline"
                      size="sm"
                      disabled={testing}
                    >
                      {type.type === "widget" ? "Código" : "Testar"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => openModal(type.type)}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Active Integrations List */}
        {integrations.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Integrações Ativas</h2>
            <div className="space-y-3">
              {integrations.map((integration) => {
                const type = integrationTypes.find(t => t.type === integration.type);
                const Icon = type?.icon || Settings;
                
                return (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${type?.color || 'bg-gray-500'} p-2 rounded-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                        <p className="text-sm text-gray-500">{type?.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={integration.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {integration.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button
                        onClick={() => openModal(integration.type, integration)}
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deleteIntegration(integration.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal for Configuration */}
      {showModal && (
        <IntegrationModal
          type={modalType}
          data={modalData}
          onClose={closeModal}
          onSave={createIntegration}
        />
      )}
    </SidebarLayout>
  );
}

// Integration Configuration Modal Component
function IntegrationModal({ type, data, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: data.name || "",
    config: data.config || {}
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateConfig = (key, value) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Configurar {type === "email" ? "Email" : type === "whatsapp" ? "WhatsApp" : type === "crm" ? "CRM" : type === "webhook" ? "Webhook" : "Widget"}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome da Integração */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Integração
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ex: Email de Boas-vindas"
              required
            />
          </div>

          {/* Email Configuration */}
          {type === "email" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SendGrid API Key
                </label>
                <input
                  type="password"
                  value={formData.config.sendgrid_api_key || ""}
                  onChange={(e) => updateConfig("sendgrid_api_key", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="SG.xxxxx"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Obtenha em: <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">SendGrid API Keys</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Remetente
                </label>
                <input
                  type="email"
                  value={formData.config.from_email || ""}
                  onChange={(e) => updateConfig("from_email", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="noreply@seudominio.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Remetente
                </label>
                <input
                  type="text"
                  value={formData.config.from_name || ""}
                  onChange={(e) => updateConfig("from_name", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="VoiceAI Hub"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reply-To (opcional)
                </label>
                <input
                  type="email"
                  value={formData.config.reply_to || ""}
                  onChange={(e) => updateConfig("reply_to", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="suporte@seudominio.com"
                />
              </div>
            </>
          )}

          {/* WhatsApp Configuration */}
          {type === "whatsapp" && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 mb-2">
                  📱 Para configurar WhatsApp Business API:
                </p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Acesse <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Meta Business Suite</a></li>
                  <li>Configure WhatsApp Business API</li>
                  <li>Obtenha as credenciais abaixo</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Account ID
                </label>
                <input
                  type="text"
                  value={formData.config.business_account_id || ""}
                  onChange={(e) => updateConfig("business_account_id", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="123456789012345"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={formData.config.phone_number_id || ""}
                  onChange={(e) => updateConfig("phone_number_id", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="109876543210987"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token
                </label>
                <input
                  type="password"
                  value={formData.config.access_token || ""}
                  onChange={(e) => updateConfig("access_token", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="EAAxxxxxxxx"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook Verify Token
                </label>
                <input
                  type="text"
                  value={formData.config.webhook_verify_token || ""}
                  onChange={(e) => updateConfig("webhook_verify_token", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="seu_token_secreto_123"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Crie um token secreto único para validar webhooks
                </p>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.config.process_images !== false}
                    onChange={(e) => updateConfig("process_images", e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Processar Imagens</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.config.process_audio !== false}
                    onChange={(e) => updateConfig("process_audio", e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Processar Áudios</span>
                </label>
              </div>
            </>
          )}

          {/* Widget Configuration */}
          {type === "widget" && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 mb-2">
                  🌐 Widget de Chat Embarcável
                </p>
                <p className="text-xs text-blue-700">
                  Adicione um chat com IA (voz + texto) em qualquer site!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domínios Permitidos (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.config.domain_whitelist?.join(', ') || ""}
                  onChange={(e) => updateConfig("domain_whitelist", e.target.value.split(',').map(d => d.trim()))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="seusite.com, www.seusite.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deixe vazio para permitir qualquer domínio
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cor do Tema
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.config.theme_color || "#7C3AED"}
                    onChange={(e) => updateConfig("theme_color", e.target.value)}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.config.theme_color || "#7C3AED"}
                    onChange={(e) => updateConfig("theme_color", e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="#7C3AED"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posição na Tela
                </label>
                <select
                  value={formData.config.position || "bottom-right"}
                  onChange={(e) => updateConfig("position", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="bottom-right">Inferior Direita</option>
                  <option value="bottom-left">Inferior Esquerda</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Saudação
                </label>
                <textarea
                  value={formData.config.greeting_message || ""}
                  onChange={(e) => updateConfig("greeting_message", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Olá! Como posso ajudar?"
                  rows={2}
                  required
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.config.voice_enabled !== false}
                    onChange={(e) => updateConfig("voice_enabled", e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Habilitar Voz</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.config.text_enabled !== false}
                    onChange={(e) => updateConfig("text_enabled", e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Habilitar Texto</span>
                </label>
              </div>
            </>
          )}

          {/* CRM Configuration */}
          {type === "crm" && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 mb-2">
                  📊 Integração Universal de CRM
                </p>
                <p className="text-xs text-blue-700">
                  Sincronize contatos automaticamente com Salesforce, HubSpot, Pipedrive ou qualquer CRM customizado!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de CRM
                </label>
                <select
                  value={formData.config.crm_type || "custom"}
                  onChange={(e) => updateConfig("crm_type", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="salesforce">Salesforce</option>
                  <option value="hubspot">HubSpot</option>
                  <option value="pipedrive">Pipedrive</option>
                  <option value="custom">CRM Customizado (Webhook/API)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key / Access Token
                </label>
                <input
                  type="password"
                  value={formData.config.api_key || ""}
                  onChange={(e) => updateConfig("api_key", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Bearer token ou API key"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API URL {formData.config.crm_type === "custom" && "(obrigatório)"}
                </label>
                <input
                  type="url"
                  value={formData.config.api_url || ""}
                  onChange={(e) => updateConfig("api_url", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder={
                    formData.config.crm_type === "salesforce" ? "https://yourinstance.salesforce.com" :
                    formData.config.crm_type === "hubspot" ? "https://api.hubapi.com (opcional)" :
                    formData.config.crm_type === "pipedrive" ? "https://api.pipedrive.com/v1 (opcional)" :
                    "https://seu-crm.com/api/contacts"
                  }
                  required={formData.config.crm_type === "custom"}
                />
              </div>

              {formData.config.crm_type === "custom" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Headers Customizados (JSON)
                    </label>
                    <textarea
                      value={formData.config.custom_headers ? JSON.stringify(formData.config.custom_headers, null, 2) : ""}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          updateConfig("custom_headers", parsed);
                        } catch (err) {
                          // Ignore invalid JSON while typing
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                      placeholder='{"X-Custom-Header": "value"}'
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mapeamento de Campos (JSON)
                    </label>
                    <textarea
                      value={formData.config.custom_fields_mapping ? JSON.stringify(formData.config.custom_fields_mapping, null, 2) : ""}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          updateConfig("custom_fields_mapping", parsed);
                        } catch (err) {
                          // Ignore invalid JSON while typing
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                      placeholder='{"name": "full_name", "email": "email_address"}'
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Mapeia campos padrão para campos do seu CRM
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.config.auto_sync !== false}
                    onChange={(e) => updateConfig("auto_sync", e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Sincronizar automaticamente durante conversas</span>
                </label>
              </div>
            </>
          )}

          {/* Webhook Configuration */}
          {type === "webhook" && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 mb-2">
                  🔗 Webhooks Customizados
                </p>
                <p className="text-xs text-blue-700">
                  Receba notificações em tempo real de eventos da plataforma no seu sistema!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Webhook
                </label>
                <input
                  type="url"
                  value={formData.config.webhook_url || ""}
                  onChange={(e) => updateConfig("webhook_url", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="https://seu-sistema.com/webhooks/voiceai"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret (para validação HMAC)
                </label>
                <input
                  type="password"
                  value={formData.config.secret || ""}
                  onChange={(e) => updateConfig("secret", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="seu_secret_token_123"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token secreto para gerar assinatura HMAC-SHA256
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eventos para Notificar
                </label>
                <div className="space-y-2">
                  {["message_received", "message_sent", "conversation_started", "conversation_ended"].map(event => (
                    <label key={event} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.config.events?.includes(event) || false}
                        onChange={(e) => {
                          const currentEvents = formData.config.events || [];
                          if (e.target.checked) {
                            updateConfig("events", [...currentEvents, event]);
                          } else {
                            updateConfig("events", currentEvents.filter(ev => ev !== event));
                          }
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Headers Customizados (JSON)
                </label>
                <textarea
                  value={formData.config.headers ? JSON.stringify(formData.config.headers, null, 2) : ""}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      updateConfig("headers", parsed);
                    } catch (err) {
                      // Ignore invalid JSON while typing
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                  placeholder='{"Authorization": "Bearer token", "X-Custom": "value"}'
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Placeholder for other integration types */}
          {type !== "email" && type !== "whatsapp" && type !== "widget" && type !== "crm" && type !== "webhook" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Configuração de <strong>{type}</strong> será implementada em breve.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Salvar Integração
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
