import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft, Download, FileText, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Billing() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/billing/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data);
    } catch (error) {
      toast.error("Erro ao carregar faturas");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Carregando faturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-7 h-7 bg-black rounded flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight">VoiceAI Hub</span>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate("/marketplace")}
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Marketplace
            </Button>
          </div>
          
          {/* Menu de navegação */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <Download className="w-4 h-4 mr-2" />
              Minhas Assinaturas
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-black"
            >
              <FileText className="w-4 h-4 mr-2" />
              Faturas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/api-docs")}
            >
              <Download className="w-4 h-4 mr-2" />
              Documentação API
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Faturamento</h1>
          <p className="text-gray-600">Histórico de pagamentos e faturas</p>
        </div>

        {invoices.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="py-16 text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma fatura ainda</h3>
              <p className="text-gray-600">Suas faturas aparecerão aqui após as compras</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Fatura #{invoice.id.substring(0, 8)}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          <span>Data: {formatDate(invoice.invoice_date)}</span>
                          <span>•</span>
                          <span>Valor: ${invoice.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-50 text-green-700 border border-green-200">
                        Pago
                      </Badge>
                      <Button variant="outline" size="sm" className="border-gray-300">
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
