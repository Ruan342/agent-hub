import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader2, Mic, MicOff, Send, Trash2, Sparkles, LogOut } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ClientChat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  
  const [recognition, setRecognition] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [audioPreview, setAudioPreview] = useState(null);
  
  const messagesEndRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const textareaRef = useRef(null);

  useEffect(() => {
    loadSession();
    setupSpeechRecognition();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSession = async () => {
    try {
      const res = await axios.get(`${API}/client-chat/${sessionId}`);
      if (res.data.status === "expired" || res.data.status === "closed") {
        toast.error("Esta sessão foi encerrada.");
        navigate("/");
        return;
      }
      setAgent(res.data.agent);
      setMessages(res.data.messages || []);
    } catch (e) {
      toast.error("Erro ao carregar sessão ou link inválido.");
      navigate("/");
    } finally {
      setLoading(false);
    }
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

  const toggleVoiceMode = async () => {
    if (voiceMode) {
      setVoiceMode(false);
      setIsListening(false);
      if (recognition) {
        try { recognition.stop(); } catch (e) { }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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
        };
        mediaRecorder.start();
        setVoiceMode(true);
        setIsListening(true);
        if (recognition) {
          try { recognition.start(); } catch (e) { }
        }
      } catch (err) {
        toast.error("Permissão de microfone negada ou não disponível.");
      }
    }
  };

  const handleSendMessage = async (forceText = null, audioBase64 = null) => {
    const textToSend = forceText || inputMessage;
    if (!textToSend.trim() && !audioBase64) return;
    
    setInputMessage("");
    setAudioPreview(null);
    setSending(true);

    const userMsg = { role: "user", content: textToSend, audioBase64: audioBase64 };
    setMessages(prev => [...prev, userMsg]);

    try {
      const payload = {
        session_id: sessionId,
        input_text: textToSend,
        audio: !!audioBase64,
        input_audio_base64: audioBase64
      };
      
      const res = await axios.post(`${API}/client-chat/message`, payload);
      
      const assistantMsg = {
        role: "assistant",
        content: res.data.response_text,
        audioBase64: res.data.audio_base64
      };
      setMessages(prev => [...prev, assistantMsg]);
      
      if (res.data.audio_base64 && audioPlayerRef.current) {
        audioPlayerRef.current.src = `data:audio/mpeg;base64,${res.data.audio_base64}`;
        audioPlayerRef.current.play().catch(e => console.log("Auto-play prevented", e));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao conectar com o agente.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
      setTimeout(() => { textareaRef.current?.focus(); }, 100);
    }
  };

  const handleLeave = async () => {
    try {
      await axios.post(`${API}/client-chat/${sessionId}/close`);
    } catch (e) {
      console.warn("Could not close session gracefully", e);
    }
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-sans relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-purple-50">
            {agent?.mascot_image_url ? (
              <img src={agent.mascot_image_url} alt="Agente" className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-6 h-6 text-purple-600" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{agent?.name}</h2>
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">{agent?.segment}</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowLeaveModal(true)}
          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          title="Sair do atendimento"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Encerrar atendimento?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Ao sair, este atendimento será <strong>finalizado</strong>. O histórico da conversa será registrado como encerrado e não será possível continuar por aqui.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Continuar
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Encerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-gray-500 max-w-sm">Mande a primeira mensagem ou áudio para iniciar seu atendimento.</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'}`}>
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
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-5 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="text-[14px] text-gray-500">Agente digitando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 md:p-6 shadow-[0_-5px_20px_-15px_rgba(0,0,0,0.1)] shrink-0 z-20">
        <div className="max-w-4xl mx-auto">
          {audioPreview ? (
            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-200">
              <button 
                onClick={() => setAudioPreview(null)} 
                className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200"
              >
                <Trash2 className="w-5 h-5"/>
              </button>
              <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center px-2 py-1">
                <audio controls src={audioPreview.blobUrl} className="w-full h-10 bg-transparent" />
              </div>
              <button 
                onClick={() => handleSendMessage(audioPreview.text, audioPreview.base64)} 
                disabled={sending}
                className="w-10 h-10 flex flex-shrink-0 items-center justify-center bg-purple-600 text-white rounded-full disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleVoiceMode}
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  voiceMode ? 'bg-red-100 text-red-600 border-2 border-red-500 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {voiceMode ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <div className="flex-1 relative">
                <textarea 
                  ref={textareaRef} 
                  value={inputMessage} 
                  onChange={(e) => setInputMessage(e.target.value)} 
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} 
                  placeholder={voiceMode ? "Modo de voz ativo. Gravando..." : "Digite sua mensagem..."} 
                  disabled={sending || voiceMode} 
                  className="w-full px-5 py-3 pr-14 text-base bg-gray-50 border border-transparent focus:bg-white rounded-xl resize-none outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-50 disabled:opacity-60" 
                  rows={1} 
                  style={{ minHeight: '52px', maxHeight: '120px' }} 
                />
                <button 
                  onClick={() => handleSendMessage()} 
                  disabled={!inputMessage.trim() || sending || voiceMode} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-purple-600 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                </button>
              </div>
            </div>
          )}
          {interimTranscript && !audioPreview && (
            <p className="text-xs text-center mt-2 text-purple-600/70 font-medium">"{interimTranscript}"</p>
          )}
        </div>
      </div>
      
      <audio ref={audioPlayerRef} className="hidden" />
    </div>
  );
}
