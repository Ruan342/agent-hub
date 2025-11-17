import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Zap, FileText, Sparkles, ArrowLeft, LayoutDashboard } from "lucide-react";
import SidebarLayout from "@/components/SidebarLayout";

export default function ApiDocs() {
  const navigate = useNavigate();

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-xs font-medium text-purple-700 mb-3">
            <Code2 className="w-3 h-3" />
            API para integrar seus agentes
          </span>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Documentação da API</h1>
          <p className="text-gray-600">Guia completo para integrar agentes de voz</p>
        </div>

        <Tabs defaultValue="quick" className="space-y-6">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="quick">Início Rápido</TabsTrigger>
            <TabsTrigger value="auth">Autenticação</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="quick">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>Início Rápido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    1. Obtenha sua API Key
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Após comprar um agente, você receberá uma API key no seu dashboard.
                  </p>
                  <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm">
                    Authorization: Bearer vapi_abc123xyz...
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">2. Fazer uma chamada</h3>
                  <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    {`curl -X POST https://api.voiceaihub.com/v1/call \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "+5511999999999",
    "message": "Olá, esta é uma mensagem de teste"
  }'`}
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">3. Receber eventos via Webhook</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure seu webhook URL no dashboard para receber eventos em tempo real.
                  </p>
                  <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm">
                    {`{
  "event": "call.completed",
  "call_id": "call_123",
  "status": "success",
  "duration": 120
}`}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>Autenticação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Todas as requisições à API devem incluir sua API key no header:
                </p>
                <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm">
                  Authorization: Bearer YOUR_API_KEY
                </code>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Importante:</strong> Mantenha sua API key segura. Não compartilhe em repositórios
                    públicos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>Endpoints Principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">POST /v1/call</h3>
                  <p className="text-sm text-gray-600 mb-3">Iniciar uma chamada de voz</p>
                  <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm">
                    {`{
  "phone": "+5511999999999",
  "message": "Mensagem a ser falada",
  "voice_speed": 1.0
}`}
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">GET /v1/call/:id</h3>
                  <p className="text-sm text-gray-600 mb-3">Obter status de uma chamada</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">GET /v1/analytics</h3>
                  <p className="text-sm text-gray-600 mb-3">Obter estatísticas de uso</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">Configure um webhook para receber eventos em tempo real:</p>

                <div>
                  <h3 className="font-semibold mb-2">Eventos Disponíveis</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <div>
                        <strong>call.started</strong> - Chamada iniciada
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <div>
                        <strong>call.completed</strong> - Chamada concluída
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <div>
                        <strong>call.failed</strong> - Chamada falhou
                      </div>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Exemplo de Payload</h3>
                  <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg text-sm">
                    {`{
  "event": "call.completed",
  "timestamp": "2025-01-14T10:30:00Z",
  "data": {
    "call_id": "call_123",
    "status": "success",
    "duration": 120,
    "cost": 0.05
  }
}`}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
}
