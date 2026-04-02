import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Plus, Minus, CreditCard, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("card"); // 'card', 'pix'
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchAgent();
  }, [id, token, navigate]);

  const fetchAgent = async () => {
    try {
      const response = await axios.get(`${API}/agents/${id}`);
      setAgent(response.data);
      // Validar se o usuário já possui, pra bloquear (mas se houver quantity a gente poderia permitir upgrade futuramente, por agora apenas checamos a existencia basica pra seguir o padrao)
      const subRes = await axios.get(`${API}/subscriptions/me`, { headers: { Authorization: `Bearer ${token}` } });
      const alreadyHas = subRes.data.some(sub => sub.agent_id === id);
      if (alreadyHas) {
        toast.info("Você já possui este agente ativo.");
        navigate("/minhas-assinaturas");
      }
    } catch (error) {
      toast.error("Erro ao carregar o agente para checkout");
      navigate("/marketplace");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseMock = async () => {
    setPurchasing(true);
    try {
      await axios.post(
        `${API}/subscriptions`,
        { agent_id: id, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Assinatura finalizada com sucesso!");
      navigate("/minhas-assinaturas");
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Erro ao processar o pagamento"
      );
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        </div>
      </SidebarLayout>
    );
  }

  const priceNum = Number(agent.price) || 0;
  const total = priceNum * quantity;

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#F7F9FC]">
        {/* Header simple */}
        <header className="bg-white border-b border-gray-100 flex items-center px-6 py-4 shadow-sm sticky top-0 z-10">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 mr-4 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-bold text-gray-800 text-lg flex items-center gap-2">
            Finalizar Contratação
            <ShieldCheck className="w-5 h-5 text-green-500" />
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            
            {/* Esquerda: Informações e Pagamento */}
            <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Informações da Conta */}
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Conta Auth</h2>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xl uppercase tracking-wider">
                     {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name || "Usuário Logado"}</p>
                    <p className="text-sm text-gray-500">{user.email || "email@desconhecido.com"}</p>
                  </div>
                  <div className="ml-auto">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                </div>
              </section>

              {/* Quantidade de Licenças */}
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Quantas licenças você precisa?</h2>
                <p className="text-sm text-gray-500 mb-6">Cada licença permite a atuação do agente em mais de um fluxo dedicado.</p>
                
                <div className="flex items-center gap-6 p-4 rounded-xl border-2 border-gray-100 bg-gray-50/50">
                  <div className="font-semibold text-gray-700 w-32">Licenças</div>
                  <div className="flex items-center gap-4 ml-auto">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-xl font-bold text-gray-900">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </section>

              {/* Formas de Pagamento MOCK */}
              <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Forma de Pagamento</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div 
                    onClick={() => setPaymentMethod('card')}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${paymentMethod === 'card' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-200 bg-white'}`}
                  >
                    <CreditCard className={`w-8 h-8 ${paymentMethod === 'card' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className={`font-semibold ${paymentMethod === 'card' ? 'text-purple-700' : 'text-gray-600'}`}>Cartão</span>
                  </div>
                  <div 
                    onClick={() => setPaymentMethod('pix')}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${paymentMethod === 'pix' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-200 bg-white'}`}
                  >
                    {/* SVG basico de um pix */}
                    <div className={`w-8 h-8 flex items-center justify-center rounded-xl font-bold text-center ${paymentMethod === 'pix' ? 'text-green-600' : 'text-gray-400 border-gray-300'} border-2`}>
                      P
                    </div>
                    <span className={`font-semibold ${paymentMethod === 'pix' ? 'text-green-700' : 'text-gray-600'}`}>Pix</span>
                  </div>
                </div>

                {paymentMethod === 'card' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="relative">
                      <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Número do Cartão</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="0000 0000 0000 0000" className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow bg-gray-50 focus:bg-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Validade</label>
                        <input type="text" placeholder="MM/AA" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow bg-gray-50 focus:bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">CVC</label>
                        <input type="text" placeholder="123" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow bg-gray-50 focus:bg-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Nome no Cartão</label>
                      <input type="text" placeholder="Nome como está no cartão" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow bg-gray-50 focus:bg-white" />
                    </div>
                    <p className="text-xs text-gray-400 flex items-center justify-center mt-4">
                      <ShieldCheck className="w-4 h-4 mr-1 text-gray-300" /> Transação segura (Demonstração pre-Stripe)
                    </p>
                  </div>
                )}
                
                {paymentMethod === 'pix' && (
                  <div className="p-6 text-center border-2 border-green-100 bg-green-50/30 rounded-xl animate-in fade-in duration-300">
                    <p className="text-gray-700 text-sm font-medium">Ao confirmar, mostraremos um QrCode na próxima tela com validade de 30 minutos.</p>
                  </div>
                )}
              </section>

            </div>

            {/* Direita: Resumo do Pedido (Sidebar) */}
            <div className="w-full lg:w-[420px] animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Resumo do Pedido</h3>
                
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-purple-50 shrink-0 border border-purple-100">
                    <img 
                      src={agent.mascot_image_url} 
                      alt={agent.name} 
                      className="w-full h-full object-cover" 
                      crossOrigin="anonymous"
                      onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 line-clamp-1">{agent.name}</h4>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md uppercase tracking-wide">
                      {agent.segment || 'AGENTE'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Preço / licença</span>
                    <span className="font-semibold text-gray-900">R$ {priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /mês</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Quantidade</span>
                    <span className="font-semibold text-gray-900">x {quantity}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Impostos e taxas</span>
                    <span className="font-semibold text-green-600">Inclusos</span>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-8">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 font-medium pb-1">Total Hoje</span>
                    <span className="text-3xl font-extrabold text-purple-700 leading-none">
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handlePurchaseMock}
                  disabled={purchasing}
                  className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition-all text-white font-bold rounded-2xl shadow-xl hover:shadow-purple-700/20 flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:active:scale-100 disabled:cursor-wait"
                >
                  {purchasing ? (
                    <><Loader2 className="w-6 h-6 animate-spin" /> Concluindo...</>
                  ) : (
                    <>
                      {paymentMethod === 'card' ? 'Assinar Agora' : 'Gerar código Pix'}
                    </>
                  )}
                </button>
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">Protegido com codificação SSL 256 bits.</p>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </SidebarLayout>
  );
}
