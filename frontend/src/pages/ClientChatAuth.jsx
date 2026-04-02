import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, ArrowRight, UserCircle2, Mail, X } from "lucide-react";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  if (errorObj) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-red-100 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Link Inválido</h2>
          <p className="text-gray-500">{errorObj}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row shadow-purple-900/5 border border-purple-100/50">
        
        {/* Left Side: Agent Presentation */}
        <div className="w-full md:w-5/12 bg-gradient-to-b from-purple-600 to-purple-800 relative p-12 text-center flex flex-col items-center justify-center flex-shrink-0">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-white/20 overflow-hidden relative z-10">
            {agentInfo?.agent_avatar ? (
              <img 
                src={agentInfo.agent_avatar} 
                alt={agentInfo.agent_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserCircle2 className="w-16 h-16 text-purple-600" />
            )}
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2 z-10">{agentInfo?.agent_name}</h2>
          <span className="bg-white/20 text-white px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase z-10">
            {agentInfo?.agent_segment || 'Atendimento'}
          </span>
          
          <p className="text-purple-100 mt-6 text-sm z-10">
            Você foi convidado para uma sessão de atendimento exclusiva e segura.
          </p>
        </div>

        {/* Right Side: Form Auth */}
        <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo(a) 👋</h3>
            <p className="text-gray-500">
              Para iniciarmos seu atendimento, preencha os dados abaixo. Eles serão usados apenas para manter o histórico da sua conversa com a loja.
            </p>
          </div>

          <form onSubmit={handleStart} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Seu Nome</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserCircle2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors outline-none text-gray-800"
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Seu E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors outline-none text-gray-800"
                  placeholder="Ex: joao@email.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-600/40 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
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
