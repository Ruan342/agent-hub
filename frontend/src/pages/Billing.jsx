import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

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
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-paper flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-line border-t-coreblue rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Carregando faturas...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-coreblue/10 border border-coreblue/20 rounded-full text-xs font-bold text-coreblue mb-3 uppercase tracking-wide">
            Faturas e cobranças
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-navy">Faturamento</h1>
          <p className="text-gray-500 font-medium tracking-wide">Histórico de pagamentos e faturas</p>
        </div>

        {invoices.length === 0 ? (
          <Card className="border-line bg-white shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-xl font-bold text-navy mb-2">Nenhuma fatura ainda</h3>
              <p className="text-gray-500 font-medium">Suas faturas aparecerão aqui após as compras</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="border-line bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-paper border border-line rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-navy" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-navy text-lg">Fatura #{invoice.id.substring(0, 8)}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 font-medium mt-1">
                          <span>Data: {formatDate(invoice.invoice_date)}</span>
                          <span>•</span>
                          <span>Valor: ${invoice.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-coregreen/10 text-coregreen border border-coregreen/30 tracking-wide uppercase">
                        Pago
                      </Badge>
                      <Button variant="outline" size="sm" className="border-line text-navy hover:bg-paper font-bold">
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
    </SidebarLayout>
  );
}
