import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX, Plus, Sparkles, Trash2 } from "lucide-react";
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
  const messagesEndRef = useRef(null);
  const audioPlayerRef = useRef(null);
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
    if (finalTranscript && voiceMode && subscription && currentSessionId) {
      handleSendMessage(finalTranscript);
      setFinalTranscript("");
    }
  }, [finalTranscript]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (voiceMode && !isSpeaking && !isListening) {
      const timer = setTimeout(() => {
        if (voiceMode && !isSpeaking) startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, voiceMode]);

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
        axios.get(`${API}/subscriptions/my`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/agents`)
      ]);
      const sub = subRes.data.find(s => s.id === subscriptionId);
      if (!sub) {
        toast.error("Assinatura não encontrada");
        navigate("/dashboard");
        return;
      }
      const ag = agentRes.data.find(a => a.id === sub.agent_id);
      setSubscription(sub);
      setAgent(ag);
      await loadSessions(sub.id);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async (subId) => {
    try {
      const res = await axios.get(`${API}/chat-sessions/subscription/${subId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data);
      if (res.data.length === 0) {
        await createNewSession();
      } else {
        const latest = res.data[0];
        setCurrentSessionId(latest.id);
        setMessages(latest.messages || []);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await axios.post(
        `${API}/chat-sessions?subscription_id=${subscriptionId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentSessionId(res.data.id);
      setMessages([]);
      await loadSessions(subscriptionId);
      toast.success("Nova conversa criada!");
    } catch (error) {
      toast.error("Erro ao criar conversa");
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const res = await axios.get(`${API}/chat-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentSessionId(sessionId);
      setMessages(res.data.messages || []);
    } catch (error) {
      toast.error("Erro ao carregar conversa");
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm("Deletar esta conversa?")) return;
    try {
      await axios.delete(`${API}/chat-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sessionId === currentSessionId) await createNewSession();
      await loadSessions(subscriptionId);
      toast.success("Conversa deletada");
    } catch (error) {
      toast.error("Erro ao deletar");
    }
  };

  const handleSendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim() || sending || !currentSessionId) return;
    const userMsg = { role: "user", content: messageText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage("");
    setSending(true);
    try {
      const res = await axios.post(
        `${API}/agent/execute`,
        { input_text: messageText, session_id: `chat_${currentSessionId}` },
        { headers: { Authorization: `Bearer ${subscription.api_key}` } }
      );
      const assistantMsg = {
        role: "assistant",
        content: res.data.output_text,
        timestamp: new Date().toISOString(),
        audioBase64: res.data.output_audio_base64
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (res.data.output_audio_base64) playAudio(res.data.output_audio_base64);
      await loadSessions(subscriptionId);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao enviar");
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

  const toggleVoiceMode = () => {
    const newMode = !voiceMode;
    setVoiceMode(newMode);
    if (newMode) startListening();
    else stopListening();
  };

  const startListening = () => {
    if (!recognition) {
      toast.error("Reconhecimento de voz não suportado");
      return;
    }
    if (isSpeaking) return;
    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      if (error.name !== 'InvalidStateError') toast.error("Erro ao iniciar voz");
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
      setInterimTranscript('');
    }
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

  const groups = groupSessionsByDate();

  return (
    <SidebarLayout>
      <div className="h-screen flex bg-white">
        <div className="w-72 bg-gradient-to-b from-purple-600 to-purple-700 flex flex-col text-white">
          <div className="p-6 border-b border-purple-500">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-3 shadow-lg">
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-lg font-bold">{agent?.name}</h2>
              <p className="text-xs text-purple-200">{agent?.segment}</p>
              <Badge className="mt-2 bg-green-500 text-white border-0">
                <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>
                Ativo
              </Badge>
            </div>
            <Button onClick={createNewSession} className="w-full bg-white text-purple-700 hover:bg-purple-50 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {groups.today.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-purple-200 mb-2">Hoje</h3>
                {groups.today.map(s => (
                  <div key={s.id} onClick={() => loadSession(s.id)} className={`group p-3 rounded-lg mb-2 cursor-pointer transition-all ${s.id === currentSessionId ? 'bg-purple-500' : 'hover:bg-purple-500/50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.title || "Nova Conversa"}</p>
                      </div>
                      <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {groups.yesterday.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-purple-200 mb-2">Ontem</h3>
                {groups.yesterday.map(s => (
                  <div key={s.id} onClick={() => loadSession(s.id)} className={`group p-3 rounded-lg mb-2 cursor-pointer transition-all ${s.id === currentSessionId ? 'bg-purple-500' : 'hover:bg-purple-500/50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.title || "Nova Conversa"}</p>
                      </div>
                      <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {groups.last7days.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-purple-200 mb-2">Últimos 7 dias</h3>
                {groups.last7days.map(s => (
                  <div key={s.id} onClick={() => loadSession(s.id)} className={`group p-3 rounded-lg mb-2 cursor-pointer transition-all ${s.id === currentSessionId ? 'bg-purple-500' : 'hover:bg-purple-500/50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.title || "Nova Conversa"}</p>
                      </div>
                      <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Olá! Sou o {agent?.name}</h3>
                  <p className="text-gray-500">Como posso ajudar você hoje?</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-900 shadow-sm'}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {msg.audioBase64 && msg.role === 'assistant' && (
                      <button onClick={() => playAudio(msg.audioBase64)} className="mt-2 text-xs flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">
                        <Volume2 className="w-3 h-3" />
                        🔊 Ouvir
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span className="text-sm text-gray-500">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          {/* Botão flutuante discreto de voz no canto inferior direito */}
          {!voiceMode && (
            <button
              onClick={toggleVoiceMode}
              className="fixed bottom-28 right-8 z-50 w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
              title="Ativar modo voz"
            >
              <Mic className="w-6 h-6" />
              <span className="absolute right-16 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Modo Voz
              </span>
            </button>
          )}

          {/* Status do modo voz - discreto no canto */}
          {voiceMode && (
            <div className="fixed bottom-28 right-8 z-50">
              <div className={`rounded-2xl p-4 shadow-2xl transition-all backdrop-blur-sm ${isSpeaking ? 'bg-blue-500/95' : isListening ? 'bg-purple-500/95' : 'bg-gray-800/95'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {isSpeaking ? (
                    <>
                      <Volume2 className="w-5 h-5 text-white animate-pulse" />
                      <span className="text-sm font-semibold text-white">Agente falando...</span>
                    </>
                  ) : isListening ? (
                    <>
                      <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-white">Escutando...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 text-white" />
                      <span className="text-sm font-medium text-white">Voz ativa</span>
                    </>
                  )}
                </div>
                
                {isSpeaking && (
                  <div className="flex items-center justify-center gap-1 mb-3">
                    {[0, 150, 300, 450, 600, 150, 300].map((delay, i) => (
                      <div key={i} className={`w-1 ${[8, 12, 6, 10, 8, 12, 6][i] === 6 ? 'h-4' : [8, 12, 6, 10, 8, 12, 6][i] === 8 ? 'h-6' : [8, 12, 6, 10, 8, 12, 6][i] === 10 ? 'h-8' : 'h-10'} bg-white rounded-full animate-pulse`} style={{animationDelay: `${delay}ms`}}></div>
                    ))}
                  </div>
                )}
                
                {(interimTranscript || finalTranscript) && (
                  <div className="text-xs text-white/90 italic mb-3 p-2 bg-black/20 rounded-lg max-w-[200px]">
                    "{interimTranscript || finalTranscript}"
                  </div>
                )}

                <div className="flex gap-2">
                  {isSpeaking && (
                    <button onClick={stopSpeaking} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1">
                      <VolumeX className="w-3.5 h-3.5" />
                      Parar
                    </button>
                  )}
                  <button onClick={toggleVoiceMode} className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs py-2 px-3 rounded-lg transition-all">
                    Desativar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border-t border-gray-200 p-6">
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <textarea ref={textareaRef} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder="Digite sua mensagem..." disabled={sending || voiceMode} className="w-full px-4 py-4 pr-16 text-base border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed" rows={1} style={{ minHeight: '56px', maxHeight: '200px' }} />
                <div className="absolute right-2 bottom-2">
                  <Button onClick={() => handleSendMessage()} disabled={!inputMessage.trim() || sending || voiceMode} className="h-10 w-10 p-0 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {voiceMode ? "Modo voz ativo - fale naturalmente" : "Enter para enviar, Shift+Enter para nova linha"}
              </p>
            </div>
          </div>
        </div>
        <audio ref={audioPlayerRef} className="hidden" />
      </div>
    </SidebarLayout>
  );
}
