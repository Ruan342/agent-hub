import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    segment: "",
    price: "",
    features: "",
    mascot_image_url: "",
    elevenlabs_voice_id: ""
  });
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!token || user.role !== "admin") {
      toast.error("Acesso não autorizado");
      navigate("/marketplace");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, requestsRes] = await Promise.all([
        axios.get(`${API}/agents`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/agent-requests`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAgents(agentsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const features = newAgent.features.split("\n").filter(f => f.trim());
      await axios.post(
        `${API}/admin/agents`,
        {
          ...newAgent,
          price: parseFloat(newAgent.price),
          features
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Agente criado com sucesso!");
      setShowCreateDialog(false);
      setNewAgent({
        name: "",
        description: "",
        segment: "",
        price: "",
        features: "",
        mascot_image_url: "",
        elevenlabs_voice_id: ""
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar agente");
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm("Tem certeza que deseja deletar este agente?")) return;

    try {
      await axios.delete(`${API}/admin/agents/${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Agente deletado");
      fetchData();
    } catch (error) {
      toast.error("Erro ao deletar agente");
    }
  };

  const handleUpdateRequestStatus = async (requestId, status) => {
    try {
      await axios.put(
        `${API}/admin/agent-requests/${requestId}?status=${status}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Status atualizado");
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              data-testid="back-to-marketplace"
              variant="ghost" 
              onClick={() => navigate("/marketplace")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Marketplace
            </Button>
            <h1 className="text-4xl font-bold text-gray-900">Painel Admin</h1>
          </div>
        </div>

        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="agents" data-testid="agents-tab">Agentes</TabsTrigger>
            <TabsTrigger value="requests" data-testid="requests-tab">Solicitações</TabsTrigger>
          </TabsList>

          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Gerenciar Agentes</CardTitle>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid="create-agent-button" className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Agente
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Criar Novo Agente</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateAgent} className="space-y-4">
                        <div>
                          <Label>Nome</Label>
                          <Input
                            data-testid="agent-name-input"
                            value={newAgent.name}
                            onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Textarea
                            data-testid="agent-description-input"
                            value={newAgent.description}
                            onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Segmento</Label>
                          <Input
                            data-testid="agent-segment-input"
                            value={newAgent.segment}
                            onChange={(e) => setNewAgent({ ...newAgent, segment: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Preço Mensal (USD)</Label>
                          <Input
                            data-testid="agent-price-input"
                            type="number"
                            step="0.01"
                            value={newAgent.price}
                            onChange={(e) => setNewAgent({ ...newAgent, price: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Recursos (um por linha)</Label>
                          <Textarea
                            data-testid="agent-features-input"
                            value={newAgent.features}
                            onChange={(e) => setNewAgent({ ...newAgent, features: e.target.value })}
                            placeholder="Recurso 1&#10;Recurso 2&#10;Recurso 3"
                            required
                          />
                        </div>
                        <div>
                          <Label>URL da Imagem do Mascote</Label>
                          <Input
                            data-testid="agent-image-input"
                            value={newAgent.mascot_image_url}
                            onChange={(e) => setNewAgent({ ...newAgent, mascot_image_url: e.target.value })}
                            placeholder="https://exemplo.com/mascote.png"
                            required
                          />
                        </div>
                        <div>
                          <Label>ElevenLabs Voice ID</Label>
                          <Input
                            data-testid="agent-voice-input"
                            value={newAgent.elevenlabs_voice_id}
                            onChange={(e) => setNewAgent({ ...newAgent, elevenlabs_voice_id: e.target.value })}
                            required
                          />
                        </div>
                        <Button data-testid="submit-agent-button" type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                          Criar Agente
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agents.filter(a => a.status === "active").map((agent) => (
                    <div key={agent.id} data-testid={`agent-item-${agent.id}`} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <img src={agent.mascot_image_url} alt={agent.name} className="w-12 h-12 rounded" onError={(e) => e.target.src = "https://via.placeholder.com/48"} />
                        <div>
                          <h3 className="font-semibold">{agent.name}</h3>
                          <p className="text-sm text-gray-600">{agent.segment} - ${agent.price}/mês</p>
                        </div>
                      </div>
                      <Button
                        data-testid={`delete-agent-${agent.id}`}
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAgent(agent.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações de Agentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">Nenhuma solicitação ainda.</p>
                  ) : (
                    requests.map((request) => (
                      <div key={request.id} data-testid={`request-item-${request.id}`} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{request.segment}</h3>
                            <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                          </div>
                          <Badge className={request.status === "pending" ? "bg-yellow-100 text-yellow-700" : request.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}>
                            {request.status === "pending" ? "Pendente" : request.status === "in_progress" ? "Em Progresso" : "Concluído"}
                          </Badge>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          {request.status === "pending" && (
                            <Button
                              data-testid={`start-progress-${request.id}`}
                              size="sm"
                              onClick={() => handleUpdateRequestStatus(request.id, "in_progress")}
                            >
                              Iniciar
                            </Button>
                          )}
                          {request.status === "in_progress" && (
                            <Button
                              data-testid={`complete-request-${request.id}`}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleUpdateRequestStatus(request.id, "completed")}
                            >
                              Concluir
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
