import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AgentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
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
          origin_url: originUrl
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao processar pagamento");
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-10 flex items-center justify-center mb-6">
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
                <Badge className="bg-indigo-100 text-indigo-700 text-sm">{agent.segment}</Badge>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{agent.name}</h1>
            <p className="text-gray-600 text-lg mb-8">{agent.description}</p>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-8">
              <div className="flex items-baseline mb-2">
                <span className="text-5xl font-bold text-indigo-600">${agent.price}</span>
                <span className="text-gray-600 text-xl ml-2">/mês</span>
              </div>
              <p className="text-gray-600">Plano mensal, cancele quando quiser</p>
            </div>

            <Button 
              data-testid="purchase-button"
              onClick={handlePurchase} 
              disabled={purchasing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg py-6"
            >
              {purchasing ? "Processando..." : "Comprar Agora"}
            </Button>

            <div className="mt-8 space-y-4">
              <h3 className="font-semibold text-gray-900">O que está incluído:</h3>
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
  );
}
