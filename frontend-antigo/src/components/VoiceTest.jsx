import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Play, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function VoiceTest({ agentId, subscriptionId, voiceId }) {
  const [text, setText] = useState("Olá! Eu sou seu assistente de voz. Como posso ajudá-lo hoje?");
  const [loading, setLoading] = useState(false);
  const [audio, setAudio] = useState(null);
  const [playing, setPlaying] = useState(false);
  const token = localStorage.getItem("token");

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Digite um texto para gerar o áudio");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/tts/generate`,
        {
          text: text,
          voice_id: voiceId,
          stability: 0.5,
          similarity_boost: 0.75
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Create audio element from base64
      const audioElement = new Audio(response.data.audio_url);
      setAudio(audioElement);
      
      // Auto play
      audioElement.play();
      setPlaying(true);
      
      audioElement.onended = () => {
        setPlaying(false);
      };

      toast.success("Áudio gerado com sucesso!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao gerar áudio");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
      audio.onended = () => setPlaying(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Digite o texto que o agente deve falar..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="border-purple-200"
      />
      
      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={loading || !text.trim()}
          className="flex-1 bg-purple-600 hover:bg-purple-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Gerar e Ouvir
            </>
          )}
        </Button>
        
        {audio && (
          <Button
            variant="outline"
            onClick={handlePlayPause}
            className="border-purple-200"
          >
            {playing ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Reproduzir
              </>
            )}
          </Button>
        )}
      </div>
      
      <p className="text-xs text-gray-500">
        Teste a voz do agente antes de fazer chamadas reais
      </p>
    </div>
  );
}
