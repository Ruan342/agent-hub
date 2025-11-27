import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Phone, PhoneOff, Volume2, Loader2, Minimize2 } from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false); // NEW: Voice call mode
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceCallState, setVoiceCallState] = useState('idle'); // NEW: idle, connecting, listening, speaking
  const [sessionId] = useState(`lidia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize audio element
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setIsSpeaking(false);
    };

    // Add Lídia welcome message
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Olá! Meu nome é Lídia, assistente de vendas da VoiceAI Hub. Estou aqui para apresentar nossa plataforma e ajudá-lo a encontrar o agente de IA perfeito para o seu negócio. Como posso ajudar você hoje?',
        timestamp: new Date()
      }]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const sendMessage = async (text = inputText) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Get token
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Você precisa estar logado para usar o chat');
      }
      
      // Get user's first active subscription to use as API key
      const subsRes = await axios.get(`${API}/subscriptions/my`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });

      const activeSubscription = subsRes.data.find(sub => sub.status === 'active');
      
      if (!activeSubscription) {
        throw new Error('Você precisa ter uma assinatura ativa para usar o chat. Visite o Marketplace para adquirir um agente.');
      }

      // Call agent API
      const response = await axios.post(
        `${API}/agent/execute`,
        {
          input_text: text,
          session_id: sessionId
        },
        {
          headers: {
            'Authorization': `Bearer ${activeSubscription.api_key}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const assistantMessage = {
        role: 'assistant',
        content: response.data.output_text,
        timestamp: new Date(),
        audio: response.data.output_audio_base64
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Play audio if available
      if (response.data.output_audio_base64) {
        playAudio(response.data.output_audio_base64);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorText = 'Desculpe, ocorreu um erro ao processar sua mensagem.';
      
      if (error.message) {
        errorText = error.message;
      } else if (error.response?.data?.detail) {
        errorText = error.response.data.detail;
      } else if (error.code === 'ECONNABORTED') {
        errorText = 'Timeout: A resposta está demorando muito. Por favor, tente novamente.';
      }
      
      const errorMessage = {
        role: 'assistant',
        content: errorText,
        timestamp: new Date(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (base64Audio) => {
    if (audioRef.current) {
      audioRef.current.src = `data:audio/mpeg;base64,${base64Audio}`;
      audioRef.current.play();
      setIsSpeaking(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 group"
        aria-label="Abrir chat"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
          !
        </span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg px-4 py-3 shadow-2xl flex items-center gap-3 hover:from-purple-700 hover:to-purple-800 transition-all"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium">Chat com IA</span>
          {messages.length > 1 && (
            <span className="bg-white text-purple-600 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {messages.length - 1}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-purple-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Assistente VoiceAI</h3>
            <p className="text-xs text-purple-100">Sempre online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            aria-label="Minimizar"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                  : message.isError
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              {message.audio && (
                <button
                  onClick={() => playAudio(message.audio)}
                  className="mt-2 flex items-center gap-2 text-xs opacity-70 hover:opacity-100 transition-opacity"
                >
                  <Volume2 className="w-4 h-4" />
                  Ouvir resposta
                </button>
              )}
              <p className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm"
              rows={1}
              style={{ maxHeight: '80px' }}
            />
            <button
              onClick={toggleListening}
              className={`p-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              aria-label={isListening ? 'Parar de ouvir' : 'Começar a ouvir'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Enviar mensagem"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {isSpeaking && (
          <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span>Reproduzindo áudio...</span>
          </div>
        )}
      </div>
    </div>
  );
}
