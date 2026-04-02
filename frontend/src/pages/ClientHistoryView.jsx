import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader2, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { formatDateTimeBR, formatTimeBR } from "@/utils/dateUtils";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ClientHistoryView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      // Reusing the public endpoint since the dashboard user already knows the sessionId
      const res = await axios.get(`${API}/client-chat/${sessionId}`);
      setAgent(res.data.agent);
      setMessages(res.data.messages || []);
    } catch (e) {
      navigate("/minhas-assinaturas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="h-screen flex flex-col bg-gray-50 relative">
        {/* Header Read-Only */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center overflow-hidden border border-purple-200">
                {agent?.mascot_image_url ? (
                  <img src={agent.mascot_image_url} alt="Agente" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-5 h-5 text-purple-600" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-none">Auditoria: {agent?.name}</h2>
                <p className="text-xs font-semibold text-purple-600 mt-1 uppercase tracking-wider">Modo Leitura</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-bold border border-blue-200 shadow-inner">
            <ShieldCheck className="w-5 h-5" />
            Histórico Imutável
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {messages.length === 0 ? (
              <div className="text-center py-20 text-gray-400">Esta sessão foi criada, mas nenhuma mensagem foi enviada.</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                    {msg.role === 'user' && <p className="text-[11px] font-bold opacity-70 mb-1 uppercase tracking-widest">Cliente</p>}
                    {msg.role === 'agent' && <p className="text-[11px] font-bold text-purple-600 mb-1 uppercase tracking-widest">Agente</p>}
                    
                    {msg.content && !(msg.role === 'user' && msg.audioBase64) && (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.audioBase64 && (
                      <audio
                        controls
                        src={`data:audio/mpeg;base64,${msg.audioBase64}`}
                        className={`h-10 mt-2 max-w-[200px] md:max-w-full rounded-full ${msg.role === 'user' ? 'filter invert brightness-0 contrast-200' : ''}`}
                      />
                    )}
                    {msg.timestamp && (
                      <p className={`text-[10px] mt-1 opacity-60 ${msg.role === 'user' ? 'text-right text-white' : 'text-left text-gray-400'}`}>
                        {formatTimeBR(msg.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
