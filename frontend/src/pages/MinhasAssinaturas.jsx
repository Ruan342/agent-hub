import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";
import { X, Link2, MessageSquare, History, CheckCircle2, Plus, Trash2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MinhasAssinaturas() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [currentSub, setCurrentSub] = useState(null);
  const [formData, setFormData] = useState({});
  const [copiedLink, setCopiedLink] = useState(null);
  const [paymentLinks, setPaymentLinks] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await axios.get(`${API}/subscriptions/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptions(res.data);
    } catch (error) {
      toast.error("Erro ao carregar assinaturas");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async (subscriptionId) => {
    try {
      const res = await axios.post(`${API}/chat-links`, { subscription_id: subscriptionId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = `${window.location.origin}/link/${res.data.link_id}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(subscriptionId);
      toast.success("Link único gerado e copiado para a área de transferência!");
      setTimeout(() => setCopiedLink(null), 3000);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar link de chat.");
    }
  };

  const getKbFields = (agentName) => {
    const name = agentName || "";
    if (name.includes("Clara") || name.includes("Pós vendas") || name.includes("Pós-vendas") || name.toLowerCase().includes("vendas")) {
      return [
        { id: 'orientacoes_pos_vendas', label: 'Orientações Pós vendas', placeholder: 'Descreva aqui as orientações pós vendas do agente' }
      ];
    }
    if (name.includes("Max") || name.includes("Suporte") || name.toLowerCase().includes("suporte")) {
      return [
        { id: 'base_conhecimento_suporte', label: 'Base de conhecimento do suporte', placeholder: 'Descreva aqui as orientações que o suporte deve passar para seus clientes' }
      ];
    }
    if (name.includes("Bruno") || name.includes("SDR") || name.toLowerCase().includes("sdr")) {
      return [
        { id: 'orientacoes_prospeccao', label: 'Orientações para prospecção', placeholder: 'Informe aqui as instruções de como o agente deve seguir com a prospecção dos seus clientes.' },
        { id: 'informacoes_necessarias_prospeccao', label: 'Informações necessárias para prospecção', placeholder: 'Quais informações são necessárias para que um lead seja considerado qualificado (quente)?' }
      ];
    }
    
    // Default (e.g. Lucy E-commerce)
    return [
      { id: 'duvidas_frequentes', label: 'Dúvidas Frequentes', placeholder: 'Ex: Cadastre as dúvidas comuns sobre seus produtos, prazos de envio, trocas...' },
      { id: 'recomendacoes', label: 'Recomendações', placeholder: 'Ex: Produtos recomendados com base no perfil do cliente...' },
      { id: 'combos_de_produtos', label: 'Combos de Produtos', placeholder: 'Ex: Descreva os combos disponíveis, descontos em quantidade...' },
      { id: 'controle_de_estoque', label: 'Controle de Estoque', placeholder: 'Ex: Produtos e suas quantidades disponíveis no momento...' },
    ];
  };

  const openConfig = async (sub) => {
    setCurrentSub(sub);
    setConfigModalOpen(true);
    setFormData({});
    setPaymentLinks([]);
    try {
      const res = await axios.get(`${API}/knowledge-base?agent=${encodeURIComponent(sub.agent?.name)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data || {};
      setFormData(data);
      // Load existing payment links for Bruno SDR
      if (Array.isArray(data.links_pagamento) && data.links_pagamento.length > 0) {
        setPaymentLinks(data.links_pagamento);
      }
    } catch(e) {
      console.error("Erro ao puxar Base de Conhecimento", e);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const saveConfig = async () => {
    try {
      const agentName = currentSub.agent?.name || "";
      const isBrunoSdr = agentName.includes("Bruno") || agentName.includes("SDR") || agentName.toLowerCase().includes("sdr");
      const payload = {
        agent: agentName,
        ...formData,
        ...(isBrunoSdr ? { links_pagamento: paymentLinks.filter(l => l.plano || l.link) } : {})
      };
      await axios.post(`${API}/knowledge-base`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Base de conhecimento atualizada e em vigor!");
      setConfigModalOpen(false);
    } catch (err) {
      toast.error("Erro ao salvar base de conhecimento.");
    }
  };

  return (
    <SidebarLayout>
      <div className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Minhas Assinaturas</h1>
        
        {loading ? (
          <p>Carregando...</p>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed">
            <h2 className="text-2xl font-bold text-gray-700">Nenhum agente assinado</h2>
            <Button className="mt-4" onClick={() => navigate("/marketplace")}>Ir para o Marketplace</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0">
                    {sub.agent?.segment?.toUpperCase() || 'AGENTE'}
                  </Badge>
                  <span className="text-xs text-gray-400">Ativo</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{sub.agent?.name || "Agente Desconhecido"}</h3>
                <p className="text-gray-500 text-sm mb-6 line-clamp-2">
                  {sub.agent?.description || "Inicie a conversa para testar."}
                </p>
                
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => navigate(`/agent-chat/${sub.id}`)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Testar
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => openConfig(sub)}
                    >
                      ⚙️ Regras (Base)
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 mt-1 pt-3 border-t border-gray-100">
                    <Button 
                      variant="secondary"
                      className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                      onClick={() => handleGenerateLink(sub.id)}
                    >
                      {copiedLink === sub.id ? <CheckCircle2 className="w-4 h-4 mr-2"/> : <Link2 className="w-4 h-4 mr-2" />}
                      {copiedLink === sub.id ? "Copiado!" : "Link Único"}
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                      onClick={() => navigate(`/subscriptions/${sub.id}/history`)}
                    >
                      <History className="w-4 h-4 mr-2" />
                      Históricos
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {configModalOpen && currentSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Configuração Base</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Preencha os dados de inteligência para o <b>{currentSub.agent?.name}</b>.
                  </p>
                </div>
                <button onClick={() => setConfigModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="overflow-y-auto p-6 flex-1 bg-gray-50/30">
                <div className="space-y-6">
                  {getKbFields(currentSub.agent?.name).map(field => (
                    <div key={field.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-purple-500 transition-all hover:shadow-md">
                      <label className="block text-[15px] font-bold text-gray-800 mb-2">
                        {field.label}
                      </label>
                      <textarea
                        className="w-full h-32 p-4 text-sm border-2 border-gray-100 rounded-xl resize-none focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all text-gray-700 bg-gray-50 focus:bg-white"
                        value={formData[field.id] || ""}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}

                  {/* Payment Links — Bruno SDR only */}
                  {(currentSub.agent?.name?.includes("Bruno") || currentSub.agent?.name?.toLowerCase().includes("sdr")) && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
                      <p className="text-[15px] font-bold text-gray-800 mb-3">Links de Pagamento</p>
                      {paymentLinks.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {paymentLinks.map((lnk, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Plano/Produto"
                                value={lnk.plano}
                                onChange={(e) => {
                                  const updated = [...paymentLinks];
                                  updated[idx] = { ...updated[idx], plano: e.target.value };
                                  setPaymentLinks(updated);
                                }}
                                className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 bg-gray-50 focus:bg-white transition-all"
                              />
                              <input
                                type="text"
                                placeholder="Link"
                                value={lnk.link}
                                onChange={(e) => {
                                  const updated = [...paymentLinks];
                                  updated[idx] = { ...updated[idx], link: e.target.value };
                                  setPaymentLinks(updated);
                                }}
                                className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-100 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 bg-gray-50 focus:bg-white transition-all"
                              />
                              <button
                                onClick={() => setPaymentLinks(prev => prev.filter((_, i) => i !== idx))}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setPaymentLinks(prev => [...prev, { plano: "", link: "" }])}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border-2 border-dashed border-purple-200 rounded-xl transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Inserir Link de Pagamento
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
                <Button variant="ghost" onClick={() => setConfigModalOpen(false)} className="rounded-xl px-6 hover:bg-red-50 hover:text-red-600">Cancelar</Button>
                <Button onClick={saveConfig} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-8 shadow-lg transition-transform active:scale-95">Salvar Alterações</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
