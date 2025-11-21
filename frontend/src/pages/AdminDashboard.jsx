import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    segment: "",
    price: "",
    features: "",
    mascot_image_url: "",
    mascot_image_hero_url: "",
    mascot_image_feature_url: "",
    mascot_image_cta_url: "",
    elevenlabs_voice_id: "",
    base_prompt: "",
    voice_sample_url: "",
    llm_provider: "openai",
    llm_model: "gpt-5"
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!token || user.role !== "admin") {
      toast.error("Acesso não autorizado");
      navigate("/marketplace");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, requestsRes] = await Promise.all([
        axios.get(`${API}/agents`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/agent-requests`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAgents(agentsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, fieldName = 'mascot_image_url') => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/admin/upload-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setNewAgent({ ...newAgent, [fieldName]: response.data.url });
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    
    if (!newAgent.name || !newAgent.segment || !newAgent.price) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const features = newAgent.features.split("\n").filter(f => f.trim());
      await axios.post(
        `${API}/admin/agents`,
        {
          ...newAgent,
          price: parseFloat(newAgent.price),
          features
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Agente criado com sucesso!");
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar agente");
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm("Tem certeza que deseja deletar este agente?")) return;

    try {
      await axios.delete(`${API}/admin/agents/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Agente deletado com sucesso");
      fetchData();
    } catch (error) {
      toast.error("Erro ao deletar agente");
    }
  };

  const handleUpdateRequestStatus = async (requestId, status) => {
    try {
      await axios.put(
        `${API}/admin/agent-requests/${requestId}?status=${status}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Status atualizado para: ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleEditAgent = (agent) => {
    setEditingAgent(agent);
    setNewAgent({
      name: agent.name,
      description: agent.description,
      segment: agent.segment,
      price: agent.price.toString(),
      features: agent.features.join("\n"),
      mascot_image_url: agent.mascot_image_url,
      mascot_image_hero_url: agent.mascot_image_hero_url || "",
      mascot_image_feature_url: agent.mascot_image_feature_url || "",
      mascot_image_cta_url: agent.mascot_image_cta_url || "",
      elevenlabs_voice_id: agent.elevenlabs_voice_id,
      base_prompt: agent.base_prompt || "",
      voice_sample_url: agent.voice_sample_url || "",
      llm_provider: agent.llm_provider || "openai",
      llm_model: agent.llm_model || "gpt-5"
    });
    setShowCreateDialog(true);
  };

  const handleUpdateAgent = async (e) => {
    e.preventDefault();
    
    if (!newAgent.name || !newAgent.segment || !newAgent.price) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const features = newAgent.features.split("\n").filter(f => f.trim());
      await axios.put(
        `${API}/admin/agents/${editingAgent.id}`,
        {
          ...newAgent,
          price: parseFloat(newAgent.price),
          features
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Agente atualizado com sucesso!");
      setShowCreateDialog(false);
      setEditingAgent(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao atualizar agente");
    }
  };

  const resetForm = () => {
    setNewAgent({
      name: "",
      description: "",
      segment: "",
      price: "",
      features: "",
      mascot_image_url: "",
      mascot_image_hero_url: "",
      mascot_image_feature_url: "",
      mascot_image_cta_url: "",
      elevenlabs_voice_id: "",
      base_prompt: "",
      voice_sample_url: "",
      llm_provider: "openai",
      llm_model: "gpt-5"
    });
    setSelectedFile(null);
    setEditingAgent(null);
  };

  const segments = [
    "vendas",
    "suporte",
    "marketing",
    "financeiro",
    "rh",
    "atendimento",
    "agendamento",
    "cobrança",
    "consulta",
    "educação",
    "saúde",
    "imobiliário",
    "jurídico",
    "tecnologia",
    "logística",
    "varejo",
    "e-commerce",
    "restaurante",
    "hotel",
    "turismo",
    "fitness",
    "beleza",
    "automotivo",
    "seguros",
    "contabilidade",
    "consultoria",
    "recrutamento",
    "treinamento"
  ];

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Carregando painel admin...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Painel Admin</h1>
          <p className="text-gray-600">Gerencie agentes e solicitações da plataforma</p>
        </div>

        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="agents" data-testid="agents-tab">Agentes ({agents.filter(a => a.status === "active").length})</TabsTrigger>
            <TabsTrigger value="requests" data-testid="requests-tab">Solicitações ({requests.filter(r => r.status === "pending").length})</TabsTrigger>
          </TabsList>

          {/* Agents Tab */}
          <TabsContent value="agents">
            <Card className="border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <CardTitle>Gerenciar Agentes</CardTitle>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid="create-agent-button" className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Agente
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingAgent ? "Editar Agente" : "Criar Novo Agente"}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={editingAgent ? handleUpdateAgent : handleCreateAgent} className="space-y-4 mt-4">
                        <div>
                          <Label className="text-sm font-medium">Nome do Agente *</Label>
                          <Input
                            data-testid="agent-name-input"
                            value={newAgent.name}
                            onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                            placeholder="Ex: Assistente de Vendas Pro"
                            required
                            className="mt-1 border-gray-300"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Descrição *</Label>
                          <Textarea
                            data-testid="agent-description-input"
                            value={newAgent.description}
                            onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                            placeholder="Descreva as funcionalidades do agente..."
                            required
                            rows={3}
                            className="mt-1 border-gray-300"
                          />
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Segmento *</Label>
                            <select
                              data-testid="agent-segment-input"
                              value={newAgent.segment}
                              onChange={(e) => setNewAgent({ ...newAgent, segment: e.target.value })}
                              required
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                            >
                              <option value="">Selecione...</option>
                              {segments.map(seg => (
                                <option key={seg} value={seg}>{seg.charAt(0).toUpperCase() + seg.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium">Preço Mensal (USD) *</Label>
                            <Input
                              data-testid="agent-price-input"
                              type="number"
                              step="0.01"
                              min="0"
                              value={newAgent.price}
                              onChange={(e) => setNewAgent({ ...newAgent, price: e.target.value })}
                              placeholder="49.99"
                              required
                              className="mt-1 border-gray-300"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Recursos (um por linha) *</Label>
                          <Textarea
                            data-testid="agent-features-input"
                            value={newAgent.features}
                            onChange={(e) => setNewAgent({ ...newAgent, features: e.target.value })}
                            placeholder="Qualificação automática de leads&#10;Agendamento inteligente&#10;Follow-up automático"
                            required
                            rows={4}
                            className="mt-1 border-gray-300"
                          />
                        </div>
                        
                        {/* Imagens do Mascote */}
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">🖼️ Imagens do Agente</h3>
                          <p className="text-xs text-gray-500 mb-4">Configure 4 imagens para diferentes seções da página do agente</p>
                          
                          <div className="space-y-4">
                            {/* Imagem Principal (Marketplace) */}
                            <div>
                              <Label className="text-sm font-medium">1. Marketplace & Cards *</Label>
                              <div className="mt-1 space-y-2">
                                <div className="flex gap-2">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'mascot_image_url')}
                                    className="flex-1 border-gray-300"
                                  />
                                </div>
                                {newAgent.mascot_image_url && (
                                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <img 
                                      src={newAgent.mascot_image_url.startsWith('http') ? newAgent.mascot_image_url : `${API}${newAgent.mascot_image_url}`}
                                      alt="Preview Marketplace"
                                      crossOrigin="anonymous"
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                    <span className="text-xs text-gray-600">Imagem carregada</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Imagem Hero */}
                            <div>
                              <Label className="text-sm font-medium">2. Hero Section (Topo Grande)</Label>
                              <div className="mt-1 space-y-2">
                                <div className="flex gap-2">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'mascot_image_hero_url')}
                                    className="flex-1 border-gray-300"
                                  />
                                </div>
                                {newAgent.mascot_image_hero_url && (
                                  <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                                    <img 
                                      src={newAgent.mascot_image_hero_url.startsWith('http') ? newAgent.mascot_image_hero_url : `${API}${newAgent.mascot_image_hero_url}`}
                                      alt="Preview Hero"
                                      crossOrigin="anonymous"
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                    <span className="text-xs text-purple-700">Imagem do topo</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Imagem Features */}
                            <div>
                              <Label className="text-sm font-medium">3. Seção de Recursos (Meio)</Label>
                              <div className="mt-1 space-y-2">
                                <div className="flex gap-2">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'mascot_image_feature_url')}
                                    className="flex-1 border-gray-300"
                                  />
                                </div>
                                {newAgent.mascot_image_feature_url && (
                                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                    <img 
                                      src={newAgent.mascot_image_feature_url.startsWith('http') ? newAgent.mascot_image_feature_url : `${API}${newAgent.mascot_image_feature_url}`}
                                      alt="Preview Features"
                                      crossOrigin="anonymous"
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                    <span className="text-xs text-blue-700">Imagem dos recursos</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Imagem CTA */}
                            <div>
                              <Label className="text-sm font-medium">4. CTA Final (Fundo Roxo)</Label>
                              <div className="mt-1 space-y-2">
                                <div className="flex gap-2">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'mascot_image_cta_url')}
                                    className="flex-1 border-gray-300"
                                  />
                                </div>
                                {newAgent.mascot_image_cta_url && (
                                  <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-200">
                                    <img 
                                      src={newAgent.mascot_image_cta_url.startsWith('http') ? newAgent.mascot_image_cta_url : `${API}${newAgent.mascot_image_cta_url}`}
                                      alt="Preview CTA"
                                      crossOrigin="anonymous"
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                    <span className="text-xs text-green-700">Imagem do CTA</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-xs text-gray-500 mt-3">
                            💡 Dica: Use imagens diferentes para cada seção ou repita a mesma. Recomendado: 512x512px
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Voice ID *</Label>
                          <Input
                            data-testid="agent-voice-input"
                            value={newAgent.elevenlabs_voice_id}
                            onChange={(e) => setNewAgent({ ...newAgent, elevenlabs_voice_id: e.target.value })}
                            placeholder="voice_abc123xyz"
                            required
                            className="mt-1 border-gray-300"
                          />
                          <p className="text-xs text-gray-500 mt-1">ID da voz do agente na ElevenLabs.</p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Prompt base do agente</Label>
                          <Textarea
                            value={newAgent.base_prompt}
                            onChange={(e) => setNewAgent({ ...newAgent, base_prompt: e.target.value })}
                            placeholder="Explique o papel, tom de voz e regras deste agente. Ex: Agente de cobrança amigável..."
                            rows={4}
                            className="mt-1 border-gray-300"
                          />
                          <p className="text-xs text-gray-500 mt-1">Esse texto orienta o comportamento geral do agente. O cliente ainda poderá adicionar detalhes da empresa dele.</p>
                        </div>

                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">🎙️ Áudio de Exemplo do Agente</h3>
                          
                          <div className="space-y-4">
                            {/* Upload de Áudio */}
                            <div>
                              <Label className="text-sm font-medium">Opção 1: Fazer Upload de Áudio</Label>
                              <div className="mt-1 flex gap-2">
                                <Input
                                  type="file"
                                  accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/webm,.mp3,.wav,.ogg,.webm"
                                  onChange={handleAudioUpload}
                                  className="flex-1 border-gray-300"
                                  disabled={uploadingAudio}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={uploadingAudio}
                                  className="border-gray-300"
                                >
                                  {uploadingAudio ? "Enviando..." : "Upload"}
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                🎵 Formatos aceitos: MP3, WAV, OGG, WebM
                              </p>
                            </div>

                            <div className="text-center text-xs text-gray-400 font-medium">
                              — OU —
                            </div>

                            {/* URL do Áudio */}
                            <div>
                              <Label className="text-sm font-medium">Opção 2: Cole a URL do Áudio</Label>
                              <Input
                                value={newAgent.voice_sample_url}
                                onChange={(e) => setNewAgent({ ...newAgent, voice_sample_url: e.target.value })}
                                placeholder="Ex: https://seusite.com/audios/exemplo.mp3"
                                className="mt-1 border-gray-300"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                🌐 Cole a URL de um áudio hospedado online
                              </p>
                            </div>

                            <p className="text-xs text-gray-400">
                              💡 Recomendação: Áudio curto (10-30 segundos) mostrando como a IA falará
                            </p>
                            
                            {newAgent.voice_sample_url && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-sm text-green-700">
                                    <span>✓</span>
                                    <span className="font-medium">Áudio configurado</span>
                                  </div>
                                  <audio controls className="h-8">
                                    <source src={newAgent.voice_sample_url} type="audio/mpeg" />
                                  </audio>
                                </div>
                                <p className="text-xs text-green-600 mt-2 truncate">{newAgent.voice_sample_url}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">🤖 Configuração de IA</h3>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Provedor de LLM *</Label>
                              <select
                                value={newAgent.llm_provider}
                                onChange={(e) => setNewAgent({ ...newAgent, llm_provider: e.target.value })}
                                required
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                              >
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic (Claude)</option>
                                <option value="gemini">Google (Gemini)</option>
                              </select>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Modelo de LLM *</Label>
                              <select
                                value={newAgent.llm_model}
                                onChange={(e) => setNewAgent({ ...newAgent, llm_model: e.target.value })}
                                required
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                              >
                                {newAgent.llm_provider === 'openai' && (
                                  <>
                                    <option value="gpt-5">GPT-5 (Mais capaz)</option>
                                    <option value="gpt-5-mini">GPT-5 Mini (Balanceado)</option>
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                                  </>
                                )}
                                {newAgent.llm_provider === 'anthropic' && (
                                  <>
                                    <option value="claude-4-sonnet-20250514">Claude 4 Sonnet (Premium)</option>
                                    <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet</option>
                                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                                    <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Rápido)</option>
                                  </>
                                )}
                                {newAgent.llm_provider === 'gemini' && (
                                  <>
                                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Mais capaz)</option>
                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                  </>
                                )}
                              </select>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            O modelo escolhido impacta a capacidade, velocidade e custo de processamento. O preço definido acima deve refletir o modelo escolhido.
                          </p>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setShowCreateDialog(false);
                              resetForm();
                            }}
                            className="border-gray-300"
                          >
                            Cancelar
                          </Button>
                          <Button data-testid="submit-agent-button" type="submit" className="bg-purple-600 hover:bg-purple-700">
                            {editingAgent ? "Atualizar Agente" : "Criar Agente"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {agents.filter(a => a.status === "active").length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-3xl mb-3">📦</div>
                    <p className="text-gray-600">Nenhum agente criado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agents.filter(a => a.status === "active").map((agent) => (
                      <div key={agent.id} data-testid={`agent-item-${agent.id}`} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">
                        <div className="flex items-center gap-4">
                          <img 
                            src={agent.mascot_image_url} 
                            alt={agent.name} 
                            className="w-12 h-12 rounded-lg object-contain bg-white border border-gray-200" 
                            onError={(e) => e.target.src = "https://via.placeholder.com/48/f9fafb/9ca3af?text=AI"}
                          />
                          <div>
                            <h3 className="font-semibold">{agent.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Badge className="bg-gray-200 text-gray-700 border-0 text-xs">{agent.segment}</Badge>
                              <span>•</span>
                              <span>${agent.price}/mês</span>
                              <span>•</span>
                              <span>{agent.features.length} recursos</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <span className="font-medium">IA:</span>
                              <Badge className="bg-purple-50 text-purple-700 border-0 text-xs">
                                {agent.llm_provider === 'openai' ? 'OpenAI' : agent.llm_provider === 'anthropic' ? 'Claude' : 'Gemini'} - {agent.llm_model}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            data-testid={`edit-agent-${agent.id}`}
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAgent(agent)}
                            className="border-gray-300 hover:bg-gray-100"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            data-testid={`delete-agent-${agent.id}`}
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <Card className="border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <CardTitle>Solicitações de Agentes</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {requests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-3xl mb-3">📋</div>
                    <p className="text-gray-600">Nenhuma solicitação recebida ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((request) => (
                      <div key={request.id} data-testid={`request-item-${request.id}`} className="p-5 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{request.segment}</h3>
                              <Badge 
                                className={
                                  request.status === "pending" 
                                    ? "bg-yellow-50 text-yellow-700 border border-yellow-200" 
                                    : request.status === "in_progress" 
                                    ? "bg-blue-50 text-blue-700 border border-blue-200" 
                                    : "bg-green-50 text-green-700 border border-green-200"
                                }
                              >
                                {request.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                                {request.status === "in_progress" && <AlertCircle className="w-3 h-3 mr-1" />}
                                {request.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {request.status === "pending" ? "Pendente" : request.status === "in_progress" ? "Em Progresso" : "Concluído"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                            <p className="text-xs text-gray-500">Solicitado em: {new Date(request.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                          {request.status === "pending" && (
                            <Button
                              data-testid={`start-progress-${request.id}`}
                              size="sm"
                              onClick={() => handleUpdateRequestStatus(request.id, "in_progress")}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Iniciar Desenvolvimento
                            </Button>
                          )}
                          {request.status === "in_progress" && (
                            <Button
                              data-testid={`complete-request-${request.id}`}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleUpdateRequestStatus(request.id, "completed")}
                            >
                              Marcar como Concluído
                            </Button>
                          )}
                          {request.status === "completed" && (
                            <Badge className="bg-green-100 text-green-700 border-0">
                              ✓ Concluído
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
}
