import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Phone, PhoneOff, Volume2, Loader2, Minimize2 } from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [callState, setCallState] = useState('idle'); // idle, connecting, listening, speaking
  const [sessionId] = useState(`lidia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const voiceCallAudioRef = useRef(null);

  useEffect(() => {
    // Initialize Speech Recognition for voice call
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice input:', transcript);
        
        if (isVoiceCallActive) {
          await handleVoiceMessage(transcript);
        }
        
        setCallState('idle');
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setCallState('idle');
      };

      recognitionRef.current.onend = () => {
        // Restart listening if in voice call mode
        if (isVoiceCallActive && callState !== 'speaking') {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              setCallState('listening');
            } catch (error) {
              console.error('Error restarting recognition:', error);
            }
          }, 500);
        }
      };
    }

    // Initialize audio elements
    audioRef.current = new Audio();
    voiceCallAudioRef.current = new Audio();
    
    voiceCallAudioRef.current.onended = () => {
      setCallState('listening');
      // Restart listening after speaking
      if (isVoiceCallActive) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (error) {
            console.error('Error restarting after audio:', error);
          }
        }, 500);
      }
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

      // Call agent API - Lídia customized system prompt for sales
      const response = await axios.post(
        `${API}/agent/execute`,
        {
          input_text: text,
          session_id: sessionId,
          custom_prompt: "Você é Lídia, uma assistente de vendas especializada da VoiceAI Hub. Sua missão é apresentar a plataforma de forma envolvente, explicar os benefícios dos agentes de IA, ajudar o cliente a escolher o agente ideal para suas necessidades e incentivá-lo a fazer uma assinatura. Seja calorosa, profissional e consultiva. Destaque casos de uso, ROI e como a IA pode transformar o negócio do cliente."
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
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // NO audio playback in text mode

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

  const handleVoiceMessage = async (transcript) => {
    if (!transcript.trim()) return;

    setCallState('speaking');

    try {
      const token = localStorage.getItem('token');
      const subsRes = await axios.get(`${API}/subscriptions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const activeSubscription = subsRes.data.find(sub => sub.status === 'active');
      
      if (!activeSubscription) {
        throw new Error('Você precisa ter uma assinatura ativa');
      }

      const response = await axios.post(
        `${API}/agent/execute`,
        {
          input_text: transcript,
          session_id: `${sessionId}_voice`,
          custom_prompt: "Você é Lídia, uma assistente de vendas especializada da VoiceAI Hub. Seja calorosa, consultiva e ajude o cliente a entender como nossa plataforma pode transformar seu negócio com IA."
        },
        {
          headers: {
            'Authorization': `Bearer ${activeSubscription.api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Play audio response
      if (response.data.output_audio_base64 && voiceCallAudioRef.current) {
        voiceCallAudioRef.current.src = `data:audio/mpeg;base64,${response.data.output_audio_base64}`;
        voiceCallAudioRef.current.play();
      } else {
        setCallState('listening');
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (error) {
            console.error('Error restarting:', error);
          }
        }, 500);
      }

    } catch (error) {
      console.error('Error in voice call:', error);
      setCallState('idle');
    }
  };

  const startVoiceCall = () => {
    setIsVoiceCallActive(true);
    setCallState('connecting');
    
    setTimeout(() => {
      setCallState('listening');
      try {
        recognitionRef.current?.start();
      } catch (error) {
        console.error('Error starting voice recognition:', error);
        setCallState('idle');
      }
    }, 1000);
  };

  const endVoiceCall = () => {
    setIsVoiceCallActive(false);
    setCallState('idle');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    
    if (voiceCallAudioRef.current) {
      voiceCallAudioRef.current.pause();
      voiceCallAudioRef.current.currentTime = 0;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Voice Call Fullscreen UI
  if (isVoiceCallActive) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 flex items-center justify-center">
        {/* Background decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-pink-500 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Informações */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-2">Lídia</h2>
            <p className="text-xl text-purple-200">Assistente de Vendas VoiceAI Hub</p>
            <div className="mt-4">
              <span className={`inline-block text-sm px-4 py-1.5 rounded-full ${
                callState === 'connecting' ? 'bg-yellow-500' : 
                callState === 'listening' ? 'bg-green-500' : 
                callState === 'speaking' ? 'bg-blue-500' : 
                'bg-gray-500'
              }`}>
                {callState === 'connecting' && '🔄 Conectando...'}
                {callState === 'listening' && '🎤 Escutando você...'}
                {callState === 'speaking' && '🔊 Lídia falando...'}
              </span>
            </div>
          </div>

          {/* Círculo central com animação */}
          <div className="relative mb-12">
            {callState === 'speaking' && (
              <>
                <div className="absolute inset-0 animate-ping">
                  <div className="w-80 h-80 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-30"></div>
                </div>
                <div className="absolute inset-0 animate-pulse" style={{animationDelay: '0.3s'}}>
                  <div className="w-80 h-80 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-20"></div>
                </div>
              </>
            )}

            <div className={`absolute inset-0 rounded-full ${
              callState === 'speaking' 
                ? 'animate-pulse bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500' 
                : callState === 'listening'
                ? 'animate-pulse bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-purple-400 to-pink-400'
            }`} style={{padding: '8px'}}>
              <div className="w-full h-full rounded-full bg-purple-900"></div>
            </div>

            {/* Avatar de Lídia */}
            <div className="relative w-80 h-80 rounded-full overflow-hidden shadow-2xl flex items-center justify-center" style={{margin: '8px'}}>
              <div className="text-9xl">👩‍💼</div>
            </div>
          </div>

          {/* Botão de encerrar */}
          <button
            onClick={endVoiceCall}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-2xl transition-all flex items-center gap-3"
          >
            <PhoneOff className="w-6 h-6" />
            Encerrar Chamada
          </button>
        </div>
      </div>
    );
  }

  // Normal chat UI
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 group"
        aria-label="Abrir chat com Lídia"
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
          <span className="font-medium">Chat com Lídia</span>
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
            <h3 className="font-bold text-lg">Lídia</h3>
            <p className="text-xs text-purple-100">Assistente de Vendas</p>
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
              onClick={startVoiceCall}
              className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
              aria-label="Iniciar chamada de voz"
              title="Conversar por voz com Lídia"
            >
              <Phone className="w-4 h-4" />
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
      </div>

      <audio ref={voiceCallAudioRef} className="hidden" />
    </div>
  );
}
