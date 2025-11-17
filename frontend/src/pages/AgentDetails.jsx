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
  const [testText, setTestText] = useState(
    "Olá! Sou seu assistente virtual. Como posso ajudá-lo hoje?"
  );
  const [audio, setAudio] = useState(null);
  const [remainingTests, setRemainingTests] = useState(3);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchAgent();
  }, [id]);

  useEffect(() => {
    if (agent?.elevenlabs_voice_id) {
      checkRemainingTests();
    }
  }, [agent]);

  const checkRemainingTests = async () => {
    try {
      const response = await axios.get(
        `${API}/tts/test/remaining/${agent.elevenlabs_voice_id}`
      );
      setRemainingTests(response.data.remaining);
    } catch (error) {
      console.error("Error checking remaining tests:", error);
    }
  };

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

  const handleTestVoice = async () => {
    if (!testText.trim()) {
      toast.error("Digite um texto para testar");
      return;
    }

    if (testText.length > 100) {
      toast.error("Texto muito longo para teste. Máximo 100 caracteres.");
      return;
    }

    setTestingVoice(true);
    try {
      const response = await axios.post(`${API}/tts/test`, {
        text: testText,
        voice_id: agent.elevenlabs_voice_id,
        stability: 0.5,
        similarity_boost: 0.75,
      });

      const audioElement = new Audio(response.data.audio_url);
      setAudio(audioElement);
      audioElement.play();

      audioElement.onended = () => {
        setAudio(null);
      };

      // Update remaining tests
      await checkRemainingTests();

      toast.success("Reproduzindo amostra de voz!");
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error(
          "Limite de testes atingido! Faça login e compre para uso ilimitado."
        );
      } else {
        toast.error(error.response?.data?.detail || "Erro ao gerar áudio");
      }
    } finally {
      setTestingVoice(false);
    }
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100">
        <div className="container mx-auto px-6 py-10">
          <Button
            data-testid="back-button"
            variant="ghost"
            onClick={() => navigate("/marketplace")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Marketplace
          </Button>

          <div className="grid md:grid-cols-2 gap-10 bg-white rounded-2xl shadow-2xl p-8">
            {/* Left: Image & Info */}
            <div>
              <div className="bg-gradient-to-br from-purple-50 via-white to-purple-100 rounded-2xl p-10 flex items-center justify-center mb-6">
                <img
                  src={agent.mascot_image_url}
                  alt={agent.name}
                  className="w-64 h-64 object-contain"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/256?text=AI+Agent";
                  }}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Segmento</h3>
                  <Badge className="bg-purple-50 text-purple-700 text-sm">
                    {agent.segment}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Recursos</h3>
                  <ul className="space-y-2">
                    {agent.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right: Details & Purchase */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {agent.name}
              </h1>
              <p className="text-gray-600 text-lg mb-8">{agent.description}</p>

              <div className="bg-gradient-to-br from-purple-50 via-white to-purple-100 rounded-xl p-6 mb-8">
                <div className="flex items-baseline mb-2">
                  <span className="text-5xl font-bold text-purple-700">
                    ${agent.price}
                  </span>
                  <span className="text-gray-600 text-xl ml-2">/mês</span>
                </div>
                <p className="text-gray-600">Plano mensal, cancele quando quiser</p>
              </div>

              <Button
                data-testid="purchase-button"
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-6"
              >
                {purchasing ? "Processando..." : "Comprar Agora"}
              </Button>

              {/* Voice Test Section */}
              <div className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      🎙️ Testar Voz do Agente
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Ouça como o agente fala antes de comprar
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${
                        remainingTests > 0 ? "text-indigo-600" : "text-red-600"
                      }`}
                    >
                      {remainingTests}/3
                    </div>
                    <div className="text-xs text-gray-500">testes restantes</div>
                  </div>
                </div>

                {remainingTests > 0 ? (
                  <>
                    <Textarea
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      placeholder="Digite uma frase para o agente falar..."
                      rows={3}
                      className="mb-3 border-indigo-200"
                      maxLength={100}
                    />
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">
                        {testText.length}/100 caracteres
                      </span>
                    </div>
                    <Button
                      onClick={handleTestVoice}
                      disabled={testingVoice || !testText.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {testingVoice ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gerando áudio...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Testar Voz Gratuitamente ({remainingTests} restantes)
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-700 font-semibold mb-2">
                      Limite de testes atingido!
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Faça login e compre o agente para uso ilimitado
                    </p>
                    <Button
                      onClick={() => navigate("/login")}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Fazer Login e Comprar
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="font-semibold text-gray-900">
                  O que está incluído:
                </h3>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    API Key exclusiva para integração
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    Webhook para conectar com seu CRM
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    Dashboard de monitoramento
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    Suporte técnico
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
