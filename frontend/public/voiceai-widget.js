/**
 * VoiceAI Chat Widget
 * Embed AI voice agents on any website
 * Version: 1.0.0
 */

(function() {
  'use strict';

  // Widget configuration
  const VoiceAIWidget = {
    config: {},
    isOpen: false,
    isListening: false,
    isSpeaking: false,
    recognition: null,
    audioElement: null,
    sessionId: null,

    init: function(config) {
      if (!config.apiKey) {
        console.error('VoiceAI Widget: API Key is required');
        return;
      }

      this.config = {
        apiKey: config.apiKey,
        apiUrl: config.apiUrl || 'http://localhost:8000/api',
        themeColor: config.themeColor || '#7C3AED',
        position: config.position || 'bottom-right',
        greetingMessage: config.greetingMessage || 'Olá! Como posso ajudar?',
        voiceEnabled: config.voiceEnabled !== false,
        textEnabled: config.textEnabled !== false,
        agentName: config.agentName || 'Assistente',
        agentAvatar: config.agentAvatar || null
      };

      this.createWidget();
      this.setupEventListeners();
      this.initSpeechRecognition();
      this.createSession();
    },

    createWidget: function() {
      // Create widget container
      const container = document.createElement('div');
      container.id = 'voiceai-widget-container';
      container.innerHTML = `
        <style>
          #voiceai-widget-container * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          #voiceai-widget-button {
            position: fixed;
            ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
            ${this.config.position.includes('top') ? 'top: 20px;' : 'bottom: 20px;'}
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: ${this.config.themeColor};
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s, box-shadow 0.3s;
          }
          
          #voiceai-widget-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);
          }
          
          #voiceai-widget-button svg {
            width: 28px;
            height: 28px;
          }
          
          #voiceai-widget-window {
            position: fixed;
            ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
            ${this.config.position.includes('top') ? 'top: 20px;' : 'bottom: 90px;'}
            width: 380px;
            height: 600px;
            max-height: calc(100vh - 120px);
            background: white;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            z-index: 999999;
            display: none;
            flex-direction: column;
            overflow: hidden;
          }
          
          #voiceai-widget-window.open {
            display: flex;
            animation: slideUp 0.3s ease-out;
          }
          
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .voiceai-header {
            background: ${this.config.themeColor};
            color: white;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          .voiceai-header-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .voiceai-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          }
          
          .voiceai-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
          }
          
          .voiceai-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f9fafb;
          }
          
          .voiceai-message {
            margin-bottom: 16px;
            display: flex;
            gap: 8px;
          }
          
          .voiceai-message.user {
            flex-direction: row-reverse;
          }
          
          .voiceai-message-content {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 12px;
            word-wrap: break-word;
          }
          
          .voiceai-message.assistant .voiceai-message-content {
            background: white;
            border: 1px solid #e5e7eb;
          }
          
          .voiceai-message.user .voiceai-message-content {
            background: ${this.config.themeColor};
            color: white;
          }
          
          .voiceai-input-area {
            padding: 16px;
            background: white;
            border-top: 1px solid #e5e7eb;
          }
          
          .voiceai-input-wrapper {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          
          .voiceai-input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 24px;
            outline: none;
            font-size: 14px;
          }
          
          .voiceai-input:focus {
            border-color: ${this.config.themeColor};
          }
          
          .voiceai-send-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: ${this.config.themeColor};
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .voiceai-send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .voiceai-voice-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: white;
            border: 2px solid ${this.config.themeColor};
            color: ${this.config.themeColor};
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
          }
          
          .voiceai-voice-btn.active {
            background: ${this.config.themeColor};
            color: white;
            animation: pulse 1.5s infinite;
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          
          .voiceai-typing {
            display: flex;
            gap: 4px;
            padding: 12px 16px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            width: fit-content;
          }
          
          .voiceai-typing span {
            width: 8px;
            height: 8px;
            background: #9ca3af;
            border-radius: 50%;
            animation: typing 1.4s infinite;
          }
          
          .voiceai-typing span:nth-child(2) {
            animation-delay: 0.2s;
          }
          
          .voiceai-typing span:nth-child(3) {
            animation-delay: 0.4s;
          }
          
          @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-10px); }
          }
          
          @media (max-width: 480px) {
            #voiceai-widget-window {
              width: calc(100vw - 40px);
              height: calc(100vh - 120px);
            }
          }
        </style>
        
        <button id="voiceai-widget-button">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </button>
        
        <div id="voiceai-widget-window">
          <div class="voiceai-header">
            <div class="voiceai-header-info">
              <div class="voiceai-avatar">
                ${this.config.agentAvatar ? `<img src="${this.config.agentAvatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : '🤖'}
              </div>
              <div>
                <div style="font-weight:600;">${this.config.agentName}</div>
                <div style="font-size:12px;opacity:0.9;">Online</div>
              </div>
            </div>
            <button class="voiceai-close">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="voiceai-messages" id="voiceai-messages">
            <div class="voiceai-message assistant">
              <div class="voiceai-message-content">${this.config.greetingMessage}</div>
            </div>
          </div>
          
          <div class="voiceai-input-area">
            <div class="voiceai-input-wrapper">
              ${this.config.voiceEnabled ? '<button class="voiceai-voice-btn" id="voiceai-voice-btn"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></button>' : ''}
              <input type="text" class="voiceai-input" id="voiceai-input" placeholder="Digite sua mensagem..." />
              <button class="voiceai-send-btn" id="voiceai-send-btn">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);
      
      // Create audio element
      this.audioElement = document.createElement('audio');
      this.audioElement.style.display = 'none';
      document.body.appendChild(this.audioElement);
    },

    setupEventListeners: function() {
      const button = document.getElementById('voiceai-widget-button');
      const window = document.getElementById('voiceai-widget-window');
      const closeBtn = document.querySelector('.voiceai-close');
      const input = document.getElementById('voiceai-input');
      const sendBtn = document.getElementById('voiceai-send-btn');
      const voiceBtn = document.getElementById('voiceai-voice-btn');

      button.addEventListener('click', () => this.toggleWidget());
      closeBtn.addEventListener('click', () => this.toggleWidget());
      
      sendBtn.addEventListener('click', () => this.sendMessage());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });

      if (voiceBtn) {
        voiceBtn.addEventListener('click', () => this.toggleVoice());
      }
    },

    toggleWidget: function() {
      const window = document.getElementById('voiceai-widget-window');
      this.isOpen = !this.isOpen;
      
      if (this.isOpen) {
        window.classList.add('open');
      } else {
        window.classList.remove('open');
        this.stopVoice();
      }
    },

    createSession: async function() {
      try {
        const response = await fetch(`${this.config.apiUrl}/integrations/widget/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey
          }
        });
        
        const data = await response.json();
        this.sessionId = data.session_id;
      } catch (error) {
        console.error('VoiceAI Widget: Session creation failed', error);
      }
    },

    sendMessage: async function() {
      const input = document.getElementById('voiceai-input');
      const message = input.value.trim();
      
      if (!message) return;
      
      input.value = '';
      this.addMessage(message, 'user');
      this.showTyping();
      
      try {
        const response = await fetch(`${this.config.apiUrl}/integrations/widget/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey
          },
          body: JSON.stringify({
            message: message,
            session_id: this.sessionId
          })
        });
        
        const data = await response.json();
        this.hideTyping();
        this.addMessage(data.response, 'assistant');
        
        // Play audio if available
        if (data.audio_base64 && this.config.voiceEnabled) {
          this.playAudio(data.audio_base64);
        }
      } catch (error) {
        console.error('VoiceAI Widget: Message failed', error);
        this.hideTyping();
        this.addMessage('Desculpe, ocorreu um erro. Tente novamente.', 'assistant');
      }
    },

    addMessage: function(text, sender) {
      const messagesContainer = document.getElementById('voiceai-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = `voiceai-message ${sender}`;
      messageDiv.innerHTML = `<div class="voiceai-message-content">${text}</div>`;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    showTyping: function() {
      const messagesContainer = document.getElementById('voiceai-messages');
      const typingDiv = document.createElement('div');
      typingDiv.className = 'voiceai-message assistant';
      typingDiv.id = 'voiceai-typing';
      typingDiv.innerHTML = '<div class="voiceai-typing"><span></span><span></span><span></span></div>';
      messagesContainer.appendChild(typingDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    hideTyping: function() {
      const typing = document.getElementById('voiceai-typing');
      if (typing) typing.remove();
    },

    initSpeechRecognition: function() {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('VoiceAI Widget: Speech recognition not supported');
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'pt-BR';

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('voiceai-input').value = transcript;
        this.sendMessage();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        const voiceBtn = document.getElementById('voiceai-voice-btn');
        if (voiceBtn) voiceBtn.classList.remove('active');
      };
    },

    toggleVoice: function() {
      if (!this.recognition) return;

      if (this.isListening) {
        this.stopVoice();
      } else {
        this.startVoice();
      }
    },

    startVoice: function() {
      if (!this.recognition) return;
      
      try {
        this.recognition.start();
        this.isListening = true;
        const voiceBtn = document.getElementById('voiceai-voice-btn');
        if (voiceBtn) voiceBtn.classList.add('active');
      } catch (error) {
        console.error('VoiceAI Widget: Voice start failed', error);
      }
    },

    stopVoice: function() {
      if (!this.recognition || !this.isListening) return;
      
      try {
        this.recognition.stop();
        this.isListening = false;
        const voiceBtn = document.getElementById('voiceai-voice-btn');
        if (voiceBtn) voiceBtn.classList.remove('active');
      } catch (error) {
        console.error('VoiceAI Widget: Voice stop failed', error);
      }
    },

    playAudio: function(base64Audio) {
      if (!this.audioElement) return;
      
      this.audioElement.src = `data:audio/mpeg;base64,${base64Audio}`;
      this.isSpeaking = true;
      
      this.audioElement.onended = () => {
        this.isSpeaking = false;
      };
      
      this.audioElement.play().catch(error => {
        console.error('VoiceAI Widget: Audio playback failed', error);
      });
    }
  };

  // Expose to global scope
  window.VoiceAIWidget = VoiceAIWidget;
})();
