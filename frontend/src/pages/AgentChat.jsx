import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX, Plus, Sparkles, Trash2, Phone, PhoneOff, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AgentChat() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [audioPreview, setAudioPreview] = useState(null);
  
  const messagesEndRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const textareaRef = useRef(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [subscriptionId]);

  useEffect(() => {
    setupSpeechRecognition();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

// Auto-restart useEffect removed to prevent startListening ReferenceError crash

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'pt-BR';
    rec.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (interim) setInterimTranscript(interim);
      if (final && final.trim()) {
        setInterimTranscript('');
        setFinalTranscript(final.trim());
      }
    };
    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        toast.error(`Erro: ${e.error}`);
        setIsListening(false);
      }
    };
    rec.onend = () => {
      if (isListening && voiceMode) {
        try { rec.start(); } catch (e) { setIsListening(false); }
      }
    };
    setRecognition(rec);
  };

  const fetchData = async () => {
    try {
      const [subRes, agentRes] = await Promise.all([
        axios.get(`${API}/subscriptions/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/agents`)
      ]);
      const sub = subRes.data.find(s => s.id === subscriptionId);
      if (!sub) {
        toast.error("Assinatura não encontrada");
        navigate("/minhas-assinaturas");
        return;
      }
      const ag = agentRes.data.find(a => a.id === sub.agent_id);
      setSubscription(sub);
      setAgent(ag);
      await loadSession(sub.id);
      await fetchChatHistory(sub.id);
    } catch (error) {
      toast.error("Erro ao carregar dados");
      navigate("/minhas-assinaturas");
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (subId) => {
    try {
      const res = await axios.get(`${API}/subscriptions/${subId}/session`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.session) {
        setCurrentSessionId(res.data.session.id);
        setMessages(res.data.messages || []);
      } else {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const fetchChatHistory = async (subId) => {
    try {
      const res = await axios.get(`${API}/chat-sessions/subscription/${subId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const valid = (res.data || []).filter(s => {
        const ref = s.closed_at || s.last_interaction || s.updated_at || s.created_at;
        if (!ref) return false;
        return now - new Date(ref).getTime() < THIRTY_DAYS_MS;
      });
      setChatHistory(valid);
    } catch (e) {
      console.error('Error fetching chat history', e);
    }
  };

  const getExpiresInfo = (session) => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const ref = session.closed_at || session.last_interaction || session.updated_at || session.created_at;
    if (!ref) return null;
    const msLeft = new Date(ref).getTime() + THIRTY_DAYS_MS - Date.now();
    if (msLeft <= 0) return null;
    const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    let label = '';
    if (days > 0) label = `${days}d`;
    else if (hours > 0) label = `${hours}h`;
    else label = `${mins}min`;
    let tooltip = '';
    if (days > 0) tooltip = `${days} dias, ${hours}h e ${mins}min`;
    else if (hours > 0) tooltip = `${hours}h e ${mins}min`;
    else tooltip = `${mins} minutos`;
    return { label, tooltip };
  };

  const loadSessionById = async (sessionId) => {
    try {
      const res = await axios.get(`${API}/chat-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentSessionId(sessionId);
      // Load messages for this session
      const msgsRes = await axios.get(`${API}/chat/session/${sessionId}/history`, {
        headers: { 'x-api-key': 'd7403fdca51be19fd2bf84c541d881856d307ae6f7cc8b67df928cebbfa30318' }
      });
      if (msgsRes.data && msgsRes.data.messages) {
        setMessages(msgsRes.data.messages.map(m => ({
          role: m.role === 'agent' ? 'assistant' : m.role,
          content: m.content,
          timestamp: m.timestamp
        })));
      } else {
        setMessages([]);
      }
    } catch (e) {
      toast.error('Erro ao carregar conversa');
    }
  };

  const terminateSession = async () => {
    if (!currentSessionId) return;
    if (!window.confirm("Deseja encerrar e apagar o histórico desta conversa?")) return;
    
    try {
      await axios.post(`${API}/chat/session/${currentSessionId}/close`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Sessão finalizada!");
      setCurrentSessionId(null);
      setMessages([]);
      if (subscription?.id) await fetchChatHistory(subscription.id);
    } catch (error) {
      toast.error("Erro ao finalizar sessão");
    }
  };

  const handleSendMessage = async (messageText = inputMessage, userAudioBase64 = null) => {
    if ((!messageText.trim() && !userAudioBase64) || sending) return;
    
    const userMsg = { role: "user", content: messageText, audioBase64: userAudioBase64, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setSending(true);
    
    try {
      const res = await axios.post(
        `${API}/chat`,
        { 
          subscription_id: subscriptionId,
          agent_id: agent.id,
          session_id: currentSessionId,
          input_text: messageText,
          input_audio_base64: userAudioBase64,
          audio: voiceMode || !!userAudioBase64
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update session tracking if it's the first message
      if (!currentSessionId && res.data.session_id) {
        setCurrentSessionId(res.data.session_id);
      }
      
      if (res.data.session_status === "expired") {
        toast.error(res.data.error || "Sessão expirada.");
        setCurrentSessionId(null);
        setMessages([]);
        return;
      }
      
      const assistantMsg = {
        role: "assistant",
        content: res.data.response_text,
        timestamp: new Date().toISOString(),
        audioBase64: res.data.audio_base64
      };
      setMessages(prev => [...prev, assistantMsg]);
      
      if (voiceMode && res.data.audio_base64) {
        playAudio(res.data.audio_base64);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao enviar mensagem");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const playAudio = (audioBase64) => {
    if (audioPlayerRef.current && audioBase64) {
      if (isListening && recognition) {
        recognition.stop();
        setIsListening(false);
      }
      setIsSpeaking(true);
      audioPlayerRef.current.src = `data:audio/mpeg;base64,${audioBase64}`;
      audioPlayerRef.current.play().catch(() => setIsSpeaking(false));
      audioPlayerRef.current.onended = () => setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsSpeaking(false);
      toast.success("Agente interrompido");
    }
  };

  const toggleVoiceMode = async () => {
    if (!voiceMode) {
      setVoiceMode(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.start();
        setIsListening(true);
        if (recognition) recognition.start();
        toast.info("Gravando áudio...");
      } catch (err) {
        toast.error("Erro ao acessar microfone");
        setVoiceMode(false);
      }
    } else {
      setVoiceMode(false);
      if (mediaRecorderRef.current && isListening) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
          audioChunksRef.current = [];
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result.split(',')[1];
            const textToSend = finalTranscript || interimTranscript || "[Áudio Enviado]";
            setAudioPreview({
              base64: base64Audio,
              blobUrl: URL.createObjectURL(audioBlob),
              text: textToSend
            });
            setFinalTranscript('');
            setInterimTranscript('');
          };
          // Stop media tracks to turn off camera/mic light
          mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        };
        setIsListening(false);
        if (recognition) recognition.stop();
        toast.success("Áudio gravado e enviando...");
      }
    }
  };

  // Funções para chamada de voz em tempo real - VERSÃO MELHORADA
  const startVoiceCall = async () => {
    if (!subscription) return;
    
    // Criar nova sessão para a chamada
    try {
      const res = await axios.post(
        `${API}/chat-sessions?subscription_id=${subscriptionId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentSessionId(res.data.id);
      setMessages([]);
    } catch (error) {
      console.error("Error creating session:", error);
    }

    setIsVoiceCallActive(true);
    setCallState("connecting");
    
    // Setup speech recognition para chamada
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Reconhecimento de voz não suportado neste navegador");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'pt-BR';
    rec.maxAlternatives = 1;
    
    let isProcessing = false;
    let restartTimeout = null;
    
    rec.onresult = (event) => {
      // Se agente está falando, permitir interrupção
      if (callState === 'speaking' && voiceCallAudioRef.current && !voiceCallAudioRef.current.paused) {
        // Detectar se usuário está tentando falar (interromper)
        let hasNewFinal = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            hasNewFinal = true;
            break;
          }
        }
        
        if (hasNewFinal) {
          // Usuário está interrompendo - parar áudio
          try {
            voiceCallAudioRef.current.pause();
            voiceCallAudioRef.current.currentTime = 0;
            console.log("🛑 Usuário interrompeu o agente");
          } catch (e) {}
        }
      }
      
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      if (interim) {
        setVoiceCallTranscript(interim);
      }
      
      if (final && final.trim() && !isProcessing) {
        console.log("🎤 Mensagem final detectada:", final);
        setVoiceCallTranscript('');
        isProcessing = true;
        handleVoiceCallMessage(final.trim()).finally(() => {
          isProcessing = false;
        });
      }
    };
    
    rec.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      if (e.error === 'no-speech') {
        // Silêncio detectado - continuar escutando
        return;
      }
      if (e.error !== 'aborted') {
        // Tentar reiniciar após erro
        if (restartTimeout) clearTimeout(restartTimeout);
        restartTimeout = setTimeout(() => {
          if (isVoiceCallActive) {
            console.log("🔄 Tentando reiniciar após erro...");
            startRecognition();
          }
        }, 1000);
      }
    };
    
    rec.onend = () => {
      console.log("👂 Reconhecimento terminou, verificando se deve reiniciar...");
      if (isVoiceCallActive) {
        // Sempre tentar reiniciar se a chamada ainda está ativa
        if (restartTimeout) clearTimeout(restartTimeout);
        restartTimeout = setTimeout(() => {
          if (isVoiceCallActive) {
            console.log("🔄 Reiniciando reconhecimento...");
            startRecognition();
          }
        }, 100);
      }
    };
    
    const startRecognition = () => {
      try {
        if (rec && isVoiceCallActive) {
          rec.start();
          console.log("✅ Reconhecimento iniciado");
        }
      } catch (error) {
        if (error.name !== 'InvalidStateError') {
          console.error("Erro ao iniciar reconhecimento:", error);
        }
      }
    };
    
    voiceCallRecognitionRef.current = rec;
    
    setTimeout(() => {
      setCallState("listening");
      startRecognition();
      toast.success("Chamada iniciada! Pode falar...");
    }, 1000);
  };

  const handleVoiceCallMessage = async (messageText) => {
    if (!subscription || !currentSessionId) return;
    
    console.log("📨 Processando mensagem:", messageText);
    setCallState("speaking");
    
    try {
      // Modify Voice Call to use same /chat endpoint logic but force voiceMode
      const res = await axios.post(
        `${API}/chat`,
        { 
          subscription_id: subscriptionId,
          agent_id: agent?.id,
          session_id: currentSessionId,
          input_text: messageText, 
          audio: true 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log("✅ Resposta recebida do agente");
      
      if (!currentSessionId && res.data.session_id) {
        setCurrentSessionId(res.data.session_id);
      }
      
      if (res.data.audio_base64 && voiceCallAudioRef.current) {
        voiceCallAudioRef.current.src = `data:audio/mpeg;base64,${res.data.audio_base64}`;
        
        voiceCallAudioRef.current.onended = () => {
          console.log("🔊 Áudio terminou de tocar");
          setCallState("listening");
          setVoiceCallTranscript('');
          // Não precisa reiniciar manualmente, o onend do recognition faz isso
        };
        
        voiceCallAudioRef.current.onerror = () => {
          console.error("❌ Erro ao reproduzir áudio");
          setCallState("listening");
        };
        
        await voiceCallAudioRef.current.play();
        console.log("🔊 Reproduzindo resposta do agente...");
      } else {
        console.log("⚠️ Sem áudio na resposta, voltando para escuta");
        setCallState("listening");
      }
    } catch (error) {
      console.error("❌ Erro ao processar mensagem:", error);
      toast.error("Erro ao processar mensagem");
      setCallState("listening");
    }
  };

  const endVoiceCall = () => {
    setIsVoiceCallActive(false);
    setCallState("idle");
    setVoiceCallTranscript("");
    
    // Parar reconhecimento
    if (voiceCallRecognitionRef.current) {
      try {
        voiceCallRecognitionRef.current.stop();
      } catch (e) {}
      voiceCallRecognitionRef.current = null;
    }
    
    // Parar áudio
    if (voiceCallAudioRef.current) {
      try {
        voiceCallAudioRef.current.pause();
        voiceCallAudioRef.current.currentTime = 0;
      } catch (e) {}
    }
    
    toast.success("Chamada encerrada");
  };

  const groupSessionsByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const last7 = new Date(today); last7.setDate(last7.getDate() - 7);
    const groups = { today: [], yesterday: [], last7days: [], older: [] };
    sessions.forEach(s => {
      const d = new Date(s.updated_at || s.created_at);
      if (d >= today) groups.today.push(s);
      else if (d >= yesterday) groups.yesterday.push(s);
      else if (d >= last7) groups.last7days.push(s);
      else groups.older.push(s);
    });
    return groups;
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="h-screen flex bg-white">
        {/* Simplified Left Profile Sidebar */}
        <div className="w-80 bg-gradient-to-b from-purple-600 to-purple-800 flex flex-col text-white shadow-xl z-10">
          <div className="p-8 flex flex-col items-center text-center mt-8">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-xl border-4 border-purple-300/30 overflow-hidden relative">
              {agent?.mascot_image_url ? (
                <img 
                  src={agent?.mascot_image_url} 
                  alt={agent?.name || 'Agent'}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                />
              ) : null}
              <Sparkles className={`w-12 h-12 text-purple-600 ${agent?.mascot_image_url ? 'hidden' : ''}`} />
            </div>
            <h2 className="text-2xl font-bold mb-1">{agent?.name}</h2>
            <p className="text-sm font-medium text-purple-200 uppercase tracking-widest">{agent?.segment}</p>
            <Badge className="mt-4 bg-green-500 hover:bg-green-600 text-white border-0 px-4 py-1 flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              Sessão Ativa
            </Badge>
          </div>

          {/* Chat History */}
          {chatHistory.length > 0 && (
            <div className="px-4 pb-4">
              <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-2 px-2">Conversas recentes</p>
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                {chatHistory.map((sess) => {
                  const expiresInfo = getExpiresInfo(sess);
                  if (!expiresInfo) return null;
                  const isClosed = sess.status === 'closed';
                  const isActive = sess.status === 'active' || sess.status === 'open';
                  const isCurrentSession = sess.id === currentSessionId;
                  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit', month: '2-digit'
                  }).format(new Date(sess.created_at || sess.updated_at));
                  return (
                    <div
                      key={sess.id}
                      onClick={() => !isClosed && !isCurrentSession ? loadSessionById(sess.id) : undefined}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                        isCurrentSession
                          ? 'bg-white/20 border border-white/30'
                          : isClosed
                            ? 'opacity-60 cursor-default'
                            : 'cursor-pointer hover:bg-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="w-3 h-3 text-purple-300 shrink-0" />
                        <span className="truncate text-white/90 text-xs">{dateLabel} {isClosed ? '· Finalizado' : isCurrentSession ? '· Atual' : ''}</span>
                      </div>
                      <div
                        title={`Expira em: ${expiresInfo.tooltip}`}
                        className={`shrink-0 flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          parseInt(expiresInfo.label) <= 3
                            ? 'bg-red-500/30 text-red-300'
                            : 'bg-purple-400/30 text-purple-200'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {expiresInfo.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1" />

          <div className="p-6 flex flex-col justify-end mb-8">
            <button 
              onClick={terminateSession} 
              className="w-full py-4 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
            >
              <Trash2 className="w-5 h-5" />
              Finalizar Conversa
            </button>
            <p className="text-xs text-purple-300 text-center mt-4">
              Isto apagará o histórico atual e fechará a sessão, permitindo um recomeço.
            </p>
          </div>
        </div>

        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col bg-[#F9FAFB] relative">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
              {messages.length === 0 && !currentSessionId && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="w-10 h-10 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Seja bem-vindo</h3>
                  <p className="text-gray-500 max-w-md">Envie a primeira mensagem para iniciar uma nova conversa e registrar a sessão.</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-3xl px-6 py-4 shadow-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'}`}>
                    {msg.content && !(msg.role === 'user' && msg.audioBase64) && (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.audioBase64 && (
                      <audio 
                        controls 
                        src={`data:audio/mpeg;base64,${msg.audioBase64}`} 
                        className={`h-12 mt-2 max-w-[250px] md:max-w-full rounded-full ${msg.role === 'user' ? 'filter invert brightness-0 contrast-200' : ''}`} 
                      />
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-3xl rounded-bl-none px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                      <span className="text-[15px] font-medium text-gray-500">Agente processando...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input Area */}
          <div className="bg-white border-t border-gray-200 p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-20">
            {audioPreview ? (
              <div className="max-w-4xl mx-auto flex items-center gap-4 bg-gray-50/80 p-3 rounded-3xl border-2 border-purple-100 shadow-sm">
                <button 
                  onClick={() => setAudioPreview(null)} 
                  className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-red-100/80 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                  title="Cancelar áudio"
                >
                  <Trash2 className="w-5 h-5"/>
                </button>
                
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex items-center px-2 py-1">
                  <audio controls src={audioPreview.blobUrl} className="w-full h-10 bg-transparent" />
                </div>
                
                <button 
                  onClick={() => {
                    handleSendMessage(audioPreview.text, audioPreview.base64);
                    setAudioPreview(null);
                  }} 
                  disabled={sending}
                  className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                  title="Enviar áudio"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                </button>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto flex items-center gap-4">
                <button
                  onClick={toggleVoiceMode}
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    voiceMode 
                      ? 'bg-red-100 text-red-600 border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={voiceMode ? "Parar gravação" : "Gravar áudio"}
                >
                  {voiceMode ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                
                <div className="flex-1 relative">
                  <textarea 
                    ref={textareaRef} 
                    value={inputMessage} 
                    onChange={(e) => setInputMessage(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} 
                    placeholder={voiceMode ? "Modo de voz ativo. Gravando..." : "Digite sua mensagem para o agente..."} 
                    disabled={sending || voiceMode} 
                    className="w-full px-6 py-4 pr-16 text-base bg-gray-50 border-2 border-transparent focus:bg-white rounded-2xl resize-none focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all shadow-inner disabled:opacity-60 disabled:cursor-not-allowed font-medium leading-relaxed" 
                    rows={1} 
                    style={{ minHeight: '60px', maxHeight: '150px' }} 
                  />
                  <button 
                    onClick={() => handleSendMessage()} 
                    disabled={!inputMessage.trim() || sending || voiceMode} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-transform active:scale-95"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                  </button>
                </div>
              </div>
            )}
            {interimTranscript && !audioPreview && (
              <p className="text-sm text-center mt-3 text-purple-600 animate-pulse font-medium">"{interimTranscript}"</p>
            )}
          </div>
        </div>
        
        <audio ref={audioPlayerRef} className="hidden" />
      </div>
    </SidebarLayout>
  );
}
