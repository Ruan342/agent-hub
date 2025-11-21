import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, ArrowLeft, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AgentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [audio, setAudio] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchAgent();
  }, [id]);

  const fetchAgent = async () => {
    try {
      const response = await axios.get(`${API}/agents/${id}`);
      setAgent(response.data);
    } catch (error) {
      toast.error("Erro ao carregar agente");
      navigate("/marketplace");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!token) {
      toast.error("Faça login para comprar");
      navigate("/login");
      return;
    }

    setPurchasing(true);
    try {
      const originUrl = window.location.origin;
      const response = await axios.post(
        `${API}/subscriptions/checkout`,
        {
          agent_id: id,
          origin_url: originUrl,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      window.location.href = response.data.url;
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Erro ao processar pagamento"
      );
      setPurchasing(false);
    }
  };

  const handlePlaySample = () => {
    if (!agent?.voice_sample_url) {
      toast.error("Nenhum áudio de exemplo disponível para este agente.");
      return;
    }

    try {
      const audioElement = new Audio(agent.voice_sample_url);
      setAudio(audioElement);
      setTestingVoice(true);
      audioElement.play();
      audioElement.onended = () => {
        setTestingVoice(false);
        setAudio(null);
      };
    } catch (error) {
      setTestingVoice(false);
      toast.error("Erro ao reproduzir o áudio de exemplo.");
    }
  };

  const getTargetDescription = () => {
    const segment = (agent?.segment || "").toLowerCase();

    if (segment.includes("educ")) {
      return (
        <> 
          O <span className="font-semibold">{agent.name}</span> foi criado para escolas, cursinhos, professores e
          criadores de curso que querem oferecer suporte aos alunos de forma contínua. Ideal para tirar dúvidas de
          aulas gravadas, reforçar conteúdos e preparar estudantes para provas como ENEM, vestibulares e concursos.
        </>
      );
    }

    if (segment.includes("venda")) {
      return (
        <>
          O <span className="font-semibold">{agent.name}</span> foi criado para times comerciais que precisam
          qualificar leads em escala, explicar rapidamente a proposta de valor e agendar reuniões para o time de vendas.
          Ideal para empresas B2B e B2C que querem automatizar o primeiro contato sem perder personalização.
        </>
      );
    }

    if (segment.includes("finan") || segment.includes("cobran")) {
      return (
        <>
          O <span className="font-semibold">{agent.name}</span> é ideal para empresas que trabalham com assinaturas ou
          cobranças recorrentes e precisam lembrar clientes de faturas em atraso ou a vencer, com uma abordagem humana
          e respeitosa. Perfeito para reduzir inadimplência sem sobrecarregar o time financeiro.
        </>
      );
    }

    if (segment.includes("sade") || segment.includes("saúde") || segment.includes("clin")) {
      return (
        <>
          O <span className="font-semibold">{agent.name}</span> foi pensado para clínicas, consultórios e centros de
          saúde que querem automatizar confirmação de consultas, lembretes e comunicação simples com pacientes,
          mantendo um atendimento acolhedor e profissional.
        </>
      );
    }

    if (segment.includes("imobili")) {
      return (
        <>
          O <span className="font-semibold">{agent.name}</span> foi criado para imobiliárias e corretores que recebem
          muitos leads de portais e formulários online. Ideal para qualificar interesse em imóveis, entender
          necessidades e agendar visitas ou chamadas com corretores humanos.
        </>
      );
    }

    if (segment.includes("suporte") || segment.includes("help")) {
      return (
        <>
          O <span className="font-semibold">{agent.name}</span> é ideal para empresas SaaS e times de suporte
          que precisam atender grandes volumes de solicitações de primeiro nível. Ele responde dúvidas simples,
          abre tickets e direciona casos complexos para o time humano.
        </>
      );
    }

    if (segment.includes("logst") || segment.includes("entrega")) {
      return (
        <>
          O <span className="font-semibold">{agent.name}</span> atende empresas de logd3stica, transportadoras e
          e-commerces que desejam confirmar entregas, coletar feedback rápido sobre o pedido e identificar problemas
          antes que virem reclamações mais graves.
        </>
      );
    }

    if (segment.includes("market") || segment.includes("nps")) {
      return (
        <>
          O <span className="font-semibold">{agent.name}</span> foi projetado para equipes de marketing e CS que querem
          rodar pesquisas de satisfação, NPS e pós-venda de forma automatizada, coletando notas e comentários
          que alimentam diretamente seu CRM ou ferramentas de BI.
        </>
      );
    }

    if (segment.includes("hospita") || segment.includes("restaur") || segment.includes("hotel")) {
      return (
        <>
          O <span className="font-semibold">{agent.name}</span> é ideal para restaurantes, hotéis e espaços de
          eventos que precisam confirmar reservas, ajustar horários e reduzir faltas, mantendo uma comunicae7e3o
          cordial com seus clientes.
        </>
      );
    }

    // fallback gene9rico
    return (
      <>
        O <span className="font-semibold">{agent.name}</span> foi criado para negócios que precisam de solue7f5es de
        <span className="font-semibold"> {agent.segment}</span> orientadas por IA, sem precisar construir tudo do zero.
        Ideal para empresas que querem automatizar operae7f5es, manter uma experieancia consistente e ainda ter
        controle total via API e webhooks.
      </>
    );
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 flex items-center justify-center">
          <p className="text-gray-600">Carregando...</p>
        </div>
      </SidebarLayout>
    );
  }

  if (!agent) return null;

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-white">
        {/* Back Button */}
        <div className="container mx-auto px-6 py-4">
          <Button
            data-testid="back-button"
            variant="ghost"
            onClick={() => navigate("/marketplace")}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Marketplace
          </Button>
        </div>

        {/* Hero Section - Full Width Image */}
        <div className="relative w-full h-[709px] overflow-hidden bg-gradient-to-br from-purple-100 to-purple-50">
          <img
            src={agent.mascot_image_hero_url || agent.mascot_image_url}
            alt={agent.name}
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = agent.mascot_image_url || "https://via.placeholder.com/1920x709?text=AI+Agent";
            }}
          />
          {/* Gradient Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          
          {/* Agent Name Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <div className="container mx-auto">
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-0 mb-3">
                {agent.segment}
              </Badge>
              <h1 className="text-5xl font-bold mb-3 drop-shadow-lg">
                {agent.name}
              </h1>
            </div>
          </div>
        </div>

        {/* Agent Info Section - Below Hero with generous spacing */}
        <div className="container mx-auto px-6 py-20">
          <div className="max-w-5xl mx-auto mt-32">
            {/* Description with more breathing room */}
            <p className="text-3xl text-gray-800 mb-16 leading-relaxed font-light text-center">
              {agent.description}
            </p>

            {/* Price and CTA Card */}
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-3xl p-10 border-2 border-purple-200 shadow-lg mb-20">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <div className="flex items-baseline mb-3">
                    <span className="text-7xl font-bold text-purple-700">
                      ${agent.price}
                    </span>
                    <span className="text-3xl ml-3 text-gray-600">/mês</span>
                  </div>
                  <p className="text-gray-600 text-xl">Plano mensal, cancele quando quiser</p>
                  <p className="text-gray-500 text-sm mt-2">✓ Sem compromisso • ✓ Cancele quando quiser</p>
                </div>
                <Button
                  data-testid="purchase-button"
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xl py-8 px-16 font-bold whitespace-nowrap shadow-xl hover:shadow-2xl transition-all"
                  size="lg"
                >
                  {purchasing ? "Processando..." : "Começar Agora →"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections with generous spacing */}
        <div className="bg-gray-50 py-20">
          <div className="container mx-auto px-6">
            {/* Voice Test Section */}
            <div className="max-w-5xl mx-auto mb-24">
              <div className="bg-white rounded-3xl p-12 border-2 border-purple-100 shadow-lg">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-purple-100 rounded-3xl mb-6">
                    <span className="text-5xl">🎙️</span>
                  </div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">
                    Como o agente fala
                  </h2>
                  <p className="text-gray-600 text-xl max-w-2xl mx-auto mb-8">
                    Ouça um áudio de exemplo da voz usada por este agente
                  </p>
                  <Button
                    onClick={handlePlaySample}
                    disabled={testingVoice}
                    className="bg-purple-600 hover:bg-purple-700 text-lg py-6 px-10"
                  >
                    {testingVoice ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Reproduzindo...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Ouvir áudio de exemplo
                      </>
                    )}
                  </Button>
                  {!agent.voice_sample_url && (
                    <p className="text-sm text-gray-500 mt-4">
                      Este agente ainda não possui um áudio de exemplo configurado.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section with Agent Image - White background */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto mb-20">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-bold text-gray-900 mb-4">
                  Recursos principais
                </h2>
                <p className="text-gray-600 text-xl">
                  Tudo que você precisa para automatizar suas conversas
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-16 items-center">
                <div>
                  <ul className="space-y-5">
                    {(agent.features || []).map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4 mt-1">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-gray-800 text-xl leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center justify-center">
                  <div className="bg-gradient-to-br from-purple-50 to-white rounded-3xl overflow-hidden border-2 border-purple-100 w-80 h-80 shadow-xl">
                    <img
                      src={agent.mascot_image_feature_url || agent.mascot_image_url}
                      alt={agent.name}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = agent.mascot_image_url || "https://via.placeholder.com/320?text=AI+Agent";
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Para quem é este agente - Gray background */}
        <div className="bg-gray-50 py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-3xl p-12 border-2 border-gray-200 shadow-lg">
                <h2 className="text-4xl font-bold text-gray-900 mb-6 text-center">
                  Para quem é este agente
                </h2>
                <p className="text-gray-700 text-xl leading-relaxed text-center">
                  {getTargetDescription()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Como funciona na prática - White background */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto mb-20">
              <div className="text-center mb-16">
                <h2 className="text-5xl font-bold text-gray-900 mb-4">
                  Como funciona na prática
                </h2>
                <p className="text-gray-600 text-xl">
                  Comece a usar em 4 passos simples
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  number: "1",
                  title: "Configure",
                  description: "Assine o agente e configure os dados da sua empresa no dashboard"
                },
                {
                  number: "2",
                  title: "Integre",
                  description: "Conecte via API Key e Webhook com seu CRM, WhatsApp ou ERP"
                },
                {
                  number: "3",
                  title: "Ative",
                  description: "Seu sistema envia eventos e o agente responde automaticamente"
                },
                {
                  number: "4",
                  title: "Monitore",
                  description: "Acompanhe uso e ajuste configurações pelo dashboard"
                }
                ].map((step, index) => (
                  <div key={index} className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 hover:border-purple-300 hover:shadow-lg transition-all">
                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-3xl font-bold mb-6">
                      {step.number}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-xl">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-base leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* What's Included - Gray background */}
        <div className="bg-gray-50 py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-3xl p-12 border-2 border-purple-200 shadow-lg">
                <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">
                  O que está incluído
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    "API Key exclusiva para integração",
                    "Webhook para conectar com seu CRM ou sistema interno",
                    "Dashboard de monitoramento de uso",
                    "Suporte técnico dedicado",
                    "Atualizações automáticas",
                    "Cancelamento a qualquer momento"
                  ].map((item, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-gray-800 text-lg">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA with Agent Image - Purple background */}
        <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-purple-700 py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl overflow-hidden border-2 border-white/20">
                <div className="grid md:grid-cols-2 gap-12 items-center p-16">
                  <div>
                    <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                      Pronto para começar?
                    </h2>
                    <p className="text-purple-100 text-2xl mb-8 leading-relaxed">
                      Comece a automatizar suas conversas hoje mesmo com {agent.name}
                    </p>
                    <Button
                      onClick={handlePurchase}
                      disabled={purchasing}
                      className="bg-white text-purple-600 hover:bg-gray-100 text-xl py-8 px-12 font-bold shadow-2xl hover:shadow-3xl transition-all"
                      size="lg"
                    >
                      {purchasing ? "Processando..." : `Começar Agora - $${agent.price}/mês →`}
                    </Button>
                    <p className="text-purple-200 text-sm mt-4">
                      ✓ Sem compromisso • ✓ Cancele quando quiser
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-80 h-80 rounded-3xl overflow-hidden bg-white/20 backdrop-blur-sm shadow-2xl">
                      <img
                        src={agent.mascot_image_cta_url || agent.mascot_image_url}
                        alt={agent.name}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = agent.mascot_image_url || "https://via.placeholder.com/320?text=AI+Agent";
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
