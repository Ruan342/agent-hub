import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Marketplace from "@/pages/Marketplace";
import AgentDetails from "@/pages/AgentDetails";
import Dashboard from "@/pages/Dashboard";
import AgentChat from "@/pages/AgentChat";
import Checkout from "@/pages/Checkout";
import Integrations from "@/pages/Integrations";
import Analytics from "@/pages/Analytics";
import RequestAgent from "@/pages/RequestAgent";
import AdminDashboard from "@/pages/AdminDashboard";
import MinhasAssinaturas from "@/pages/MinhasAssinaturas";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Billing from "@/pages/Billing";
import ApiDocs from "@/pages/ApiDocs";
import ClientChatAuth from "@/pages/ClientChatAuth";
import ClientChat from "@/pages/ClientChat";
import ClientHistoryList from "@/pages/ClientHistoryList";
import ClientHistoryView from "@/pages/ClientHistoryView";


function AdminRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg border border-red-100 max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-500 mb-6">Você não tem permissão para acessar o painel administrativo.</p>
          <a href="/dashboard" className="inline-block px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }
  return children;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/agent/:id" element={<AgentDetails />} />
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/minhas-assinaturas" element={<MinhasAssinaturas />} />
          <Route path="/agent-chat/:subscriptionId" element={<AgentChat />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/request-agent" element={<RequestAgent />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/link/:linkId" element={<ClientChatAuth />} />
          <Route path="/client-chat/:sessionId" element={<ClientChat />} />
          <Route path="/subscriptions/:subscriptionId/history" element={<ClientHistoryList />} />
          <Route path="/client-chat-history/:sessionId" element={<ClientHistoryView />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
