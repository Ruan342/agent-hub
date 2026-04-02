import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("checking");
  const [attempts, setAttempts] = useState(0);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!sessionId || !token) {
      navigate("/marketplace");
      return;
    }
    checkPaymentStatus();
  }, [attempts]);

  const checkPaymentStatus = async () => {
    if (attempts >= 5) {
      setStatus("timeout");
      return;
    }

    try {
      const response = await axios.get(
        `${API}/subscriptions/checkout/status/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.payment_status === "paid") {
        setStatus("success");
        toast.success("Pagamento confirmado!");
      } else if (response.data.status === "expired") {
        setStatus("expired");
      } else {
        setTimeout(() => setAttempts(attempts + 1), 2000);
      }
    } catch (error) {
      console.error("Error checking payment:", error);
      setTimeout(() => setAttempts(attempts + 1), 2000);
    }
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {status === "checking" && (
          <>
            <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verificando pagamento...</h2>
            <p className="text-gray-600">Aguarde enquanto confirmamos sua transação</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento confirmado!</h2>
            <p className="text-gray-600 mb-6">Sua assinatura foi ativada com sucesso</p>
            <Button 
              data-testid="go-to-dashboard"
              onClick={() => navigate("/dashboard")} 
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Ir para Dashboard
            </Button>
          </>
        )}

        {status === "expired" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏱️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sessão expirada</h2>
            <p className="text-gray-600 mb-6">Sua sessão de pagamento expirou. Tente novamente.</p>
            <Button 
              data-testid="back-to-marketplace"
              onClick={() => navigate("/marketplace")} 
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Voltar ao Marketplace
            </Button>
          </>
        )}

        {status === "timeout" && (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tempo de verificação esgotado</h2>
            <p className="text-gray-600 mb-6">Não conseguimos confirmar o pagamento. Verifique seu email ou contate o suporte.</p>
            <Button 
              data-testid="contact-support"
              onClick={() => navigate("/dashboard")} 
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Ir para Dashboard
            </Button>
          </>
        )}
        </div>
      </div>
    </SidebarLayout>
  );
}
