import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RequestAgent() {
  const navigate = useNavigate();
  const [segment, setSegment] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Faça login para solicitar um agente");
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/agent-requests`,
        { segment, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Solicitação enviada! Entraremos em contato em breve.");
      navigate("/marketplace");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao enviar solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-6 py-10">
        <Button 
          data-testid="back-button"
          variant="ghost" 
          onClick={() => navigate("/marketplace")} 
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Marketplace
        </Button>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Solicitar Agente Personalizado</CardTitle>
              <p className="text-gray-600 mt-2">
                Não encontrou o agente ideal? Descreva suas necessidades e criaremos um agente customizado para você.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="segment">Segmento / Área</Label>
                  <Input
                    data-testid="segment-input"
                    id="segment"
                    placeholder="Ex: Vendas de imóveis, Atendimento médico, etc."
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição Detalhada</Label>
                  <Textarea
                    data-testid="description-input"
                    id="description"
                    placeholder="Descreva as funcionalidades que você precisa, o tipo de interações, integrações necessárias, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={8}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Quanto mais detalhes, melhor poderemos criar o agente perfeito para você.
                  </p>
                </div>

                <div className="bg-indigo-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">O que acontece após enviar?</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Nossa equipe analisa sua solicitação em até 48 horas</li>
                    <li>• Entraremos em contato com um orçamento e prazo</li>
                    <li>• Após aprovação, criamos e configuramos o agente</li>
                    <li>• O agente aparecerá no marketplace para sua compra</li>
                  </ul>
                </div>

                <Button 
                  data-testid="submit-request-button"
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? "Enviando..." : (
                    <>
                      Enviar Solicitação
                      <Send className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
