import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, ArrowRight, UserCircle2, Mail, X } from "lucide-react";

const SEGMENT_LABELS = {
  ecommerce: "E-Commerce",
  sdr: "SDR",
  suporte: "Suporte",
  pos_vendas: "Pós-Vendas",
  lidia_prospec: "Prospecção",
};
const formatSegment = (seg) => SEGMENT_LABELS[seg] || (seg ? seg.toUpperCase() : 'Atendimento');

export default function ClientChatAuth() {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);
  const [errorObj, setErrorObj] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    checkLink();
  }, [linkId]);

  const checkLink = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/chat-links/${linkId}`);
      if (res.data.already_used && res.data.session_id) {
        navigate(`/client-chat/${res.data.session_id}`);
        return;
      }
      setAgentInfo(res.data);
    } catch (error) {
      if (error.response && error.response.data) {
        setErrorObj(error.response.data.detail || "Erro inesperado.");
      } else {
        setErrorObj("Não foi possível carregar este link.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Por favor, insira um e-mail válido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/client-chat/start`, {
        link_id: linkId,
        client_name: name,
        client_email: email
      });
      // Route directly to chat using the new sessionId mapping
      const sessionId = res.data.session_id;
      // We don't store token locally since it's anonymous, we just route to it.
      navigate(`/client-chat/${sessionId}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao iniciar chat.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-coreblue" />
      </div>
    );
  }

  if (errorObj) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-red-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-navy mb-2">Link Inválido</h2>
          <p className="text-gray-500 font-medium">{errorObj}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row border border-line">
        
        {/* Left Side: Agent Presentation */}
        <div className="w-full md:w-5/12 bg-navy relative p-12 text-center flex flex-col items-center justify-center flex-shrink-0">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(59,130,246,0.6) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          {/* Glow accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />
          
          <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mb-6 shadow-2xl border-2 border-white/20 overflow-hidden relative z-10">
            {agentInfo?.agent_avatar ? (
              <img 
                src={agentInfo.agent_avatar} 
                alt={agentInfo.agent_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserCircle2 className="w-16 h-16 text-blue-400" />
            )}
          </div>
          
          <h2 className="text-3xl font-extrabold text-white mb-3 z-10 relative">{agentInfo?.agent_name}</h2>
          <span className="bg-white/10 border border-white/20 text-blue-300 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase z-10 relative">
            {formatSegment(agentInfo?.agent_segment)}
          </span>
          
          <p className="text-white/40 mt-6 text-sm z-10 relative leading-relaxed">
            Você foi convidado para uma sessão de atendimento exclusiva e segura.
          </p>

          {/* Bottom decoration */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-coreblue to-transparent opacity-40" />
        </div>

        {/* Right Side: Form Auth */}
        <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-8">
            <h3 className="text-2xl font-extrabold text-navy mb-2">Bem-vindo(a) 👋</h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              Para iniciarmos seu atendimento, preencha os dados abaixo. Eles serão usados apenas para manter o histórico da sua conversa.
            </p>
          </div>

          <form onSubmit={handleStart} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-navy mb-2">Seu Nome</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserCircle2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-paper border-2 border-line rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-coreblue transition-all outline-none text-navy font-medium"
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-navy mb-2">Seu E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-paper border-2 border-line rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-coreblue transition-all outline-none text-navy font-medium"
                  placeholder="Ex: joao@email.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-6 bg-coreblue hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Iniciando Ambiente...
                </>
              ) : (
                <>
                  Entrar no Chat
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-6">
              Esta é uma plataforma desenvolvida utilizando tecnologia Agent Hub.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
