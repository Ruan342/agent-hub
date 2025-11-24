import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX, ArrowLeft, Sparkles, Paperclip, Settings, Key, Copy, Check, Link2, MessageCircle } from "lucide-react";
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
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [copiedKey, setCopiedKey] = useState(false);
  const [customConfig, setCustomConfig] = useState({
    company_name: "",
    product_service: "",
    target_audience: "",
    tone: "",
    extra_context: ""
  });
  
  // Voice mode states
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
    if (finalTranscript && voiceMode && subscription) {
      console.log("Sending voice message:", finalTranscript);
      handleSendMessage(finalTranscript);
      setFinalTranscript("");
    }
  }, [finalTranscript, voiceMode, subscription]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech Recognition not supported");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'pt-BR';
    recognitionInstance.maxAlternatives = 1;

    recognitionInstance.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final && final.trim()) {
        setInterimTranscript('');
        setFinalTranscript(final.trim());
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast.error(`Erro no reconhecimento: ${event.error}`);
        setIsListening(false);
      }
    };

    recognitionInstance.onend = () => {
      console.log('Recognition ended');
      if (isListening && voiceMode) {
        try {
          recognitionInstance.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
          setIsListening(false);
        }
      }
    };

    setRecognition(recognitionInstance);
  };

  const fetchData = async () => {
    try {
      const [subRes, agentRes] = await Promise.all([
        axios.get(`${API}/subscriptions/my`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
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
      
      // Initial greeting message
      setMessages([{
        role: "assistant",
        content: `Olá! Eu sou o ${ag?.name}. ${ag?.base_prompt || 'Como posso ajudar você hoje?'}`,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim() || sending) return;

    const userMessage = {
      role: "user",
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setSending(true);

    try {
      const response = await axios.post(
        `${API}/agent/execute`,
        {
          input_text: messageText,
          session_id: `web_${subscriptionId}_${Date.now()}`
        },
        {
          headers: {
            Authorization: `Bearer ${subscription.api_key}`
          }
        }
      );

      const assistantMessage = {
        role: "assistant",
        content: response.data.output_text,
        timestamp: new Date(),
        audioBase64: response.data.output_audio_base64
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-play audio response if in voice mode
      if (voiceMode && response.data.output_audio_base64) {
        playAudio(response.data.output_audio_base64);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg = error.response?.data?.detail || "Erro ao enviar mensagem";
      toast.error(errorMsg);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const playAudio = (audioBase64) => {
    try {
      if (audioPlayerRef.current) {
        setIsSpeaking(true);
        audioPlayerRef.current.src = audioBase64;
        audioPlayerRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
          setIsSpeaking(false);
        });
        audioPlayerRef.current.onended = () => {
          setIsSpeaking(false);
        };
      }
    } catch (error) {
      console.error("Error setting audio:", error);
      setIsSpeaking(false);
    }
  };

  const toggleVoiceMode = () => {
    const newVoiceMode = !voiceMode;
    setVoiceMode(newVoiceMode);
    
    if (newVoiceMode) {
      startListening();
    } else {
      stopListening();
    }
  };

  const startListening = () => {
    if (!recognition) {
      toast.error("Reconhecimento de voz não suportado neste navegador");
      return;
    }

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error starting recognition:", error);
      if (error.name !== 'InvalidStateError') {
        toast.error("Erro ao iniciar reconhecimento de voz");
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
      setInterimTranscript('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveConfig = async () => {
    try {
      await axios.put(
        `${API}/subscriptions/${subscriptionId}/config`,
        {
          custom_prompt: null,
          config: customConfig
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success("Copiado para área de transferência!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600 font-medium">Carregando agente...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="h-screen flex bg-gradient-to-b from-gray-50 to-white">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="mb-3 hover:bg-gray-100 w-full justify-start"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-gray-900 truncate">{agent?.name}</h2>
                <p className="text-xs text-gray-500 truncate">{agent?.segment}</p>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mt-1 text-xs">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                  Ativo
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex-1 p-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                activeTab === "chat"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Chat</span>
            </button>

            <button
              onClick={() => setActiveTab("config")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                activeTab === "config"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Configurações</span>
            </button>

            <button
              onClick={() => setActiveTab("api")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                activeTab === "api"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Key className="w-5 h-5" />
              <span className="text-sm font-medium">API</span>
            </button>

            <button
              onClick={() => setActiveTab("integrations")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                activeTab === "integrations"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Link2 className="w-5 h-5" />
              <span className="text-sm font-medium">Integrações</span>
            </button>
          </nav>

          {/* Footer Info */}
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Preço: <span className="font-semibold text-gray-900">R$ {agent?.price}/mês</span>
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">

        {/* Content Based on Active Tab */}
        {activeTab === "chat" && (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.audioBase64 && voiceMode && (
                    <button
                      onClick={() => playAudio(msg.audioBase64)}
                      className="mt-2 text-xs opacity-70 hover:opacity-100 flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      Ouvir resposta
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

            {/* Voice Mode Visual Feedback */}
            {voiceMode && (
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className={`rounded-xl p-4 transition-all duration-300 ${
              isListening 
                ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200' 
                : 'bg-gray-50 border-2 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isListening ? (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-900">Escutando...</span>
                    </>
                  ) : isSpeaking ? (
                    <>
                      <Volume2 className="w-4 h-4 text-purple-600 animate-pulse" />
                      <span className="text-sm font-medium text-gray-900">Falando...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Modo voz ativo</span>
                    </>
                  )}
                </div>
                
                <button
                  onClick={toggleVoiceMode}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Desativar
                </button>
              </div>
              
              {(interimTranscript || finalTranscript) && (
                <div className="text-sm text-gray-700 italic">
                  "{interimTranscript || finalTranscript}"
                </div>
              )}
            </div>
              </div>
            )}

            {/* Input Area - Sintra Style */}
            <div className="bg-white border-t border-gray-200 sticky bottom-0">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="relative">
              {/* Mode Toggle Buttons */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => !voiceMode && setVoiceMode(false)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    !voiceMode
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Send className="w-4 h-4 inline mr-2" />
                  Texto
                </button>
                <button
                  onClick={toggleVoiceMode}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    voiceMode
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {voiceMode ? (
                    <>
                      <MicOff className="w-4 h-4 inline mr-2" />
                      Voz Ativa
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 inline mr-2" />
                      Voz em Tempo Real
                    </>
                  )}
                </button>
              </div>

              {/* Text Input Area - Large Sintra Style */}
              {!voiceMode && (
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    disabled={sending}
                    className="w-full px-4 py-4 pr-32 text-base border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={1}
                    style={{ minHeight: '56px', maxHeight: '200px' }}
                  />
                  
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 hover:bg-gray-100"
                      disabled
                    >
                      <Paperclip className="w-4 h-4 text-gray-400" />
                    </Button>
                    
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || sending}
                      className="h-10 w-10 p-0 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2 text-center">
                {voiceMode 
                  ? "Fale naturalmente. Suas palavras serão transcritas e enviadas automaticamente."
                  : "Pressione Enter para enviar, Shift+Enter para nova linha"
                }
              </p>
            </div>
          </div>
        </div>

        {/* Hidden audio player */}
        <audio ref={audioPlayerRef} className="hidden" />
      </div>
    </SidebarLayout>
  );
}
