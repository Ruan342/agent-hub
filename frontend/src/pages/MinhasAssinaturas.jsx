import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";
import { X, Link2, MessageSquare, History, CheckCircle2, Plus, Trash2, Clock, Users } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Mapa de segmentos para labels de exibição amigáveis
const SEGMENT_LABELS = {
  ecommerce: "E-Commerce",
  sdr: "SDR",
  suporte: "Suporte",
  pos_vendas: "Pós-Vendas",
  lidia_prospec: "Prospecção",
};

export default function MinhasAssinaturas() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [currentSub, setCurrentSub] = useState(null);
  const [formData, setFormData] = useState({});
  const [copiedLink, setCopiedLink] = useState(null);
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [schedulingLinks, setSchedulingLinks] = useState([]);
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
        { id: 'orientacoes_pos_vendas', type: 'textarea', label: 'Orientações Pós vendas', placeholder: 'Descreva aqui as orientações pós vendas do agente' }
      ];
    }
    if (name.includes("Max") || name.includes("Suporte") || name.toLowerCase().includes("suporte")) {
      return [
        { id: 'base_conhecimento_suporte', type: 'textarea', label: 'Base de conhecimento do suporte', placeholder: 'Descreva aqui as orientações que o suporte deve passar para seus clientes' }
      ];
    }
    if (name.includes("Bruno") || name.includes("SDR") || name.toLowerCase().includes("sdr")) {
      return [
        { id: 'apify_platform', type: 'multiselect', label: 'Plataformas para Buscar Novos Leads', options: ['Instagram', 'TikTok', 'Google Maps', 'LinkedIn'] },
        { id: 'apify_search_query', type: 'input', label: 'Parâmetros / Keywords de Busca', placeholder: 'Ex: "Clínicas de estética em São Paulo"' }
      ];
    }
    if (name.includes("Lidia") || name.includes("Lídia") || name.toLowerCase().includes("lidia prospec")) {
      return [
        { id: 'orientacoes_prospeccao', type: 'textarea', label: 'Orientações de Prospecção', placeholder: 'Descreva como a Lidia deve abordar e prospectar clientes. Tom, estratégia, objeções comuns, etc.' },
        { id: 'produtos', type: 'textarea', label: 'Produtos / Serviços', placeholder: 'Descreva os produtos ou serviços que a Lidia deve apresentar e vender. Inclua preços, diferenciais e benefícios.' },
      ];
    }
    
    // Default (e.g. Lucy E-commerce)
    return [
      { id: 'duvidas_frequentes', type: 'textarea', label: 'Dúvidas Frequentes', placeholder: 'Ex: Cadastre as dúvidas comuns sobre seus produtos, prazos de envio, trocas...' },
      { id: 'recomendacoes', type: 'textarea', label: 'Recomendações', placeholder: 'Ex: Produtos recomendados com base no perfil do cliente...' },
      { id: 'combos_de_produtos', type: 'textarea', label: 'Combos de Produtos', placeholder: 'Ex: Descreva os combos disponíveis, descontos em quantidade...' },
      { id: 'controle_de_estoque', type: 'textarea', label: 'Controle de Estoque', placeholder: 'Ex: Produtos e suas quantidades disponíveis no momento...' },
    ];
  };

  const openConfig = async (sub) => {
    setCurrentSub(sub);
    setConfigModalOpen(true);
    setFormData({});
    setPaymentLinks([]);
    setSchedulingLinks([]);
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
      // Load scheduling links for Lidia
      if (Array.isArray(data.links_agendamento) && data.links_agendamento.length > 0) {
        setSchedulingLinks(data.links_agendamento);
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
      const isLidia = agentName.includes("Lidia") || agentName.includes("Lídia") || agentName.toLowerCase().includes("lidia prospec");

      // Normalize SDR scheduler fields so the backend can register the APScheduler job
      let sdrSchedulerFields = {};
      if (isBrunoSdr) {
        const enabled = !!formData.scheduler_enabled;
        sdrSchedulerFields = {
          scheduler_enabled: enabled,
          scheduler_time: enabled ? (formData.scheduler_time || "09:00") : null,
          scheduler_leads_qty: enabled ? Number(formData.scheduler_leads_qty || 0) : 0,
        };
      }

      const payload = {
        agent: agentName,
        ...formData,
        ...(isBrunoSdr ? {
          links_pagamento: paymentLinks.filter(l => l.plano || l.link),
          ...sdrSchedulerFields,
        } : {}),
        ...(isLidia ? {
          links_agendamento: schedulingLinks.filter(l => l.usuario || l.link),
          links_pagamento: paymentLinks.filter(l => l.plano || l.link)
        } : {})
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
        <h1 className="text-3xl font-extrabold text-navy mb-8">Minhas Assinaturas</h1>
        
        {loading ? (
          <p className="text-gray-500 font-medium">Carregando...</p>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-20 bg-white shadow-sm rounded-2xl border border-line">
            <h2 className="text-2xl font-bold text-navy">Nenhum agente assinado</h2>
            <Button className="mt-4 bg-coreblue hover:bg-blue-700 text-white font-bold" onClick={() => navigate("/marketplace")}>Ir para o Marketplace</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="bg-white rounded-2xl p-6 border border-line shadow-sm hover:shadow-md hover:border-coreblue transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <Badge className="bg-navy/5 text-navy border-line uppercase tracking-wide">
                    {SEGMENT_LABELS[sub.agent?.segment] || sub.agent?.segment?.toUpperCase() || 'AGENTE'}
                  </Badge>
                  <span className="text-xs text-gray-400">Ativo</span>
                </div>
                
                <h3 className="text-xl font-bold text-navy mb-2">{sub.agent?.name || "Agente Desconhecido"}</h3>
                <p className="text-gray-500 font-medium text-sm mb-6 line-clamp-2">
                  {sub.agent?.description || "Inicie a conversa para testar."}
                </p>
                
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-coreblue hover:bg-blue-700 text-white font-bold"
                      onClick={() => navigate(`/agent-chat/${sub.id}`)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Testar
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 border-line text-navy hover:bg-paper font-semibold"
                      onClick={() => openConfig(sub)}
                    >
                      ⚙️ Regras (Base)
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 mt-1 pt-3 border-t border-line">
                    <Button 
                      variant="secondary"
                      className="flex-1 bg-coregreen/10 text-coregreen hover:bg-coregreen/20 border border-coregreen/30 font-semibold tracking-wide"
                      onClick={() => handleGenerateLink(sub.id)}
                    >
                      {copiedLink === sub.id ? <CheckCircle2 className="w-4 h-4 mr-2"/> : <Link2 className="w-4 h-4 mr-2" />}
                      {copiedLink === sub.id ? "Copiado!" : "Link Único"}
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 border-line text-navy hover:bg-paper font-semibold"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-line animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-6 border-b border-line bg-paper">
                <div>
                  <h2 className="text-2xl font-extrabold text-navy">Configuração Base</h2>
                  <p className="text-gray-500 font-medium text-sm mt-1">
                    Preencha os dados de inteligência para o <b className="text-navy">{currentSub.agent?.name}</b>.
                  </p>
                </div>
                <button onClick={() => setConfigModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-gray-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="overflow-y-auto p-6 flex-1 bg-white">
                <div className="space-y-6">
                  {getKbFields(currentSub.agent?.name).map(field => (
                    <div key={field.id} className="bg-white p-5 rounded-2xl border border-line shadow-sm border-l-4 border-l-coreblue transition-all hover:shadow-md">
                      <label className="block text-[15px] font-bold text-navy mb-2">
                        {field.label}
                      </label>
                      {(!field.type || field.type === 'textarea') && (
                        <textarea
                          className="w-full h-32 p-4 text-sm border-2 border-line rounded-xl resize-none focus:outline-none focus:border-coreblue focus:ring-4 focus:ring-blue-100 transition-all font-medium text-navy bg-paper focus:bg-white"
                          value={formData[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}
                      {field.type === 'input' && (
                        <input
                          type="text"
                          className="w-full p-4 text-sm border-2 border-line rounded-xl focus:outline-none focus:border-coreblue focus:ring-4 focus:ring-blue-100 transition-all font-medium text-navy bg-paper focus:bg-white"
                          value={formData[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}
                      {field.type === 'select' && (
                        <select
                          className="w-full p-4 text-sm border-2 border-line rounded-xl focus:outline-none focus:border-coreblue focus:ring-4 focus:ring-blue-100 transition-all font-medium text-navy bg-paper focus:bg-white cursor-pointer"
                          value={formData[field.id] || "Nenhuma"}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        >
                          {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {field.type === 'multiselect' && (
                        <div className="flex flex-wrap gap-3 mt-1">
                          {field.options.map(opt => {
                            const selected = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                            const isChecked = selected.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  const current = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                                  const updated = isChecked
                                    ? current.filter(v => v !== opt)
                                    : [...current, opt];
                                  handleFieldChange(field.id, updated);
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                                  isChecked
                                    ? 'bg-coreblue text-white border-coreblue shadow-sm'
                                    : 'bg-paper text-navy border-line hover:border-coreblue hover:text-coreblue'
                                }`}
                              >
                                {isChecked && <span className="mr-1">✓</span>}{opt}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Bruno SDR — Agendamento de Extração de Leads */}
                  {(currentSub.agent?.name?.includes("Bruno") || currentSub.agent?.name?.includes("SDR") || currentSub.agent?.name?.toLowerCase().includes("sdr")) && (
                    <div className="bg-white p-5 rounded-2xl border border-line shadow-sm border-l-4 border-l-coregreen">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[15px] font-bold text-navy flex items-center gap-2">
                            <Clock className="w-4 h-4 text-coregreen" />
                            Agendamento de Extração de Leads
                          </p>
                          <p className="text-xs text-gray-500 font-medium mt-1">
                            Quando ligado, o SDR é acionado automaticamente no horário definido e o retorno aparece na caixa de chat flutuante.
                          </p>
                        </div>
                        {/* Toggle on/off */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!!formData.scheduler_enabled}
                          onClick={() => handleFieldChange('scheduler_enabled', !formData.scheduler_enabled)}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                            formData.scheduler_enabled ? 'bg-coregreen' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                              formData.scheduler_enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {formData.scheduler_enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          <div>
                            <label className="block text-xs font-bold text-navy mb-1 uppercase tracking-wide">
                              Horário de execução
                            </label>
                            <input
                              type="time"
                              value={formData.scheduler_time || "09:00"}
                              onChange={(e) => handleFieldChange('scheduler_time', e.target.value)}
                              className="w-full px-3 py-2.5 text-sm border-2 border-line text-navy font-medium rounded-xl focus:outline-none focus:border-coreblue focus:ring-2 focus:ring-blue-100 bg-paper focus:bg-white transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-navy mb-1 uppercase tracking-wide flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Quantidade de Leads
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="500"
                              placeholder="Ex: 25"
                              value={formData.scheduler_leads_qty || ""}
                              onChange={(e) => handleFieldChange('scheduler_leads_qty', e.target.value)}
                              className="w-full px-3 py-2.5 text-sm border-2 border-line text-navy font-medium rounded-xl focus:outline-none focus:border-coreblue focus:ring-2 focus:ring-blue-100 bg-paper focus:bg-white transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}


                  {/* Lidia Prospecção — Links de Agendamento + Pagamento */}
                  {(currentSub.agent?.name?.includes("Lidia") || currentSub.agent?.name?.includes("Lídia") || currentSub.agent?.name?.toLowerCase().includes("lidia prospec")) && (
                    <>
                      {/* Links de Agendamento */}
                      <div className="bg-white p-5 rounded-2xl border border-line shadow-sm border-l-4 border-l-coreblue">
                        <p className="text-[15px] font-bold text-navy mb-3">Links de Agendamento</p>
                        {schedulingLinks.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {schedulingLinks.map((lnk, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="Usuário/Vendedor"
                                  value={lnk.usuario || ""}
                                  onChange={(e) => {
                                    const updated = [...schedulingLinks];
                                    updated[idx] = { ...updated[idx], usuario: e.target.value };
                                    setSchedulingLinks(updated);
                                  }}
                                  className="flex-1 px-3 py-2.5 text-sm border-2 border-line text-navy font-medium rounded-xl focus:outline-none focus:border-coreblue focus:ring-2 focus:ring-blue-100 bg-paper focus:bg-white transition-all"
                                />
                                <input
                                  type="text"
                                  placeholder="Link da agenda"
                                  value={lnk.link || ""}
                                  onChange={(e) => {
                                    const updated = [...schedulingLinks];
                                    updated[idx] = { ...updated[idx], link: e.target.value };
                                    setSchedulingLinks(updated);
                                  }}
                                  className="flex-1 px-3 py-2.5 text-sm border-2 border-line text-navy font-medium rounded-xl focus:outline-none focus:border-coreblue focus:ring-2 focus:ring-blue-100 bg-paper focus:bg-white transition-all"
                                />
                                <button
                                  onClick={() => setSchedulingLinks(prev => prev.filter((_, i) => i !== idx))}
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
                          onClick={() => setSchedulingLinks(prev => [...prev, { usuario: "", link: "" }])}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-coreblue bg-coreblue/5 hover:bg-coreblue/10 border-2 border-dashed border-coreblue/20 rounded-xl transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Inserir Link de Agendamento
                        </button>
                      </div>

                      {/* Links de Pagamento */}
                      <div className="bg-white p-5 rounded-2xl border border-line shadow-sm border-l-4 border-l-coregreen">
                        <p className="text-[15px] font-bold text-navy mb-3">Links de Pagamento</p>
                        {paymentLinks.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {paymentLinks.map((lnk, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="Plano/Produto"
                                  value={lnk.plano || ""}
                                  onChange={(e) => {
                                    const updated = [...paymentLinks];
                                    updated[idx] = { ...updated[idx], plano: e.target.value };
                                    setPaymentLinks(updated);
                                  }}
                                  className="flex-1 px-3 py-2.5 text-sm border-2 border-line text-navy font-medium rounded-xl focus:outline-none focus:border-coreblue focus:ring-2 focus:ring-blue-100 bg-paper focus:bg-white transition-all"
                                />
                                <input
                                  type="text"
                                  placeholder="Link"
                                  value={lnk.link || ""}
                                  onChange={(e) => {
                                    const updated = [...paymentLinks];
                                    updated[idx] = { ...updated[idx], link: e.target.value };
                                    setPaymentLinks(updated);
                                  }}
                                  className="flex-1 px-3 py-2.5 text-sm border-2 border-line text-navy font-medium rounded-xl focus:outline-none focus:border-coreblue focus:ring-2 focus:ring-blue-100 bg-paper focus:bg-white transition-all"
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
                          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-coreblue bg-coreblue/5 hover:bg-coreblue/10 border-2 border-dashed border-coreblue/20 rounded-xl transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Inserir Link de Pagamento
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="p-6 border-t border-line flex justify-end gap-3 bg-paper">
                <Button variant="ghost" onClick={() => setConfigModalOpen(false)} className="rounded-xl px-6 hover:bg-red-50 hover:text-red-600 font-bold border border-line bg-white">Cancelar</Button>
                <Button onClick={saveConfig} className="bg-coreblue hover:bg-blue-700 text-white rounded-xl px-8 shadow-sm transition-transform active:scale-95 font-bold">Salvar Alterações</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
