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
import Integrations from "@/pages/Integrations";
import Analytics from "@/pages/Analytics";
import RequestAgent from "@/pages/RequestAgent";
import AdminDashboard from "@/pages/AdminDashboard";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Billing from "@/pages/Billing";
import ApiDocs from "@/pages/ApiDocs";

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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agent-chat/:subscriptionId" element={<AgentChat />} />
          <Route path="/integrations/:subscriptionId" element={<Integrations />} />
          <Route path="/request-agent" element={<RequestAgent />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/api-docs" element={<ApiDocs />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
