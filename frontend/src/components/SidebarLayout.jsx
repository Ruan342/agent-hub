import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Menu, X, LayoutDashboard, FileText, Code2, Home, ShoppingBag, LogOut, LogIn, BarChart3, Plug, ShieldCheck, Lock } from "lucide-react";
import FloatingChat from "./FloatingChat";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const baseMenuItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: ShoppingBag, label: "Marketplace", path: "/marketplace" },
  { icon: LayoutDashboard, label: "Minhas Assinaturas", path: "/dashboard" },
  { icon: FileText, label: "Faturas", path: "/billing" },
  { icon: Code2, label: "Documentação API", path: "/api-docs" }
];

export default function SidebarLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
  const token = localStorage.getItem("token");

  // Force Password Reset state
  const [forcePasswordReset, setForcePasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (user.email && token) {
      fetchSubscriptions();
      if (user.must_change_password) {
        setForcePasswordReset(true);
      }
    }
  }, [user.email, token, user.must_change_password]);

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const activeSubs = response.data.filter(sub => sub.status === 'active');
      
      // Fetch agent details for each subscription
      const subsWithAgents = await Promise.all(
        activeSubs.map(async (sub) => {
          try {
            const agentRes = await axios.get(`${API}/agents/${sub.agent_id}`);
            return { ...sub, agentName: agentRes.data.name };
          } catch (error) {
            return { ...sub, agentName: sub.agent_id };
          }
        })
      );
      
      setSubscriptions(subsWithAgents);
      
      // Get selected agent from localStorage or use first subscription
      const saved = localStorage.getItem('selectedAgentId');
      if (saved && subsWithAgents.find(s => s.agent_id === saved)) {
        setSelectedAgentId(saved);
      } else if (subsWithAgents.length > 0) {
        setSelectedAgentId(subsWithAgents[0].agent_id);
        localStorage.setItem('selectedAgentId', subsWithAgents[0].agent_id);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const handleAgentSelect = (agentId) => {
    setSelectedAgentId(agentId);
    localStorage.setItem('selectedAgentId', agentId);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedAgentId");
    navigate("/");
  };

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const menuItems = [...baseMenuItems];
  
  if (subscriptions.length > 0 && selectedAgentId) {
    menuItems.push(
      { icon: Plug, label: "Integrações", path: `/integrations`, requiresAgent: true }
    );
  }

  if (user.role === "admin") {
    menuItems.push(
      { icon: ShieldCheck, label: "Admin Panel", path: "/admin" }
    );
  }

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("As senhas não coincidem!");
    }
    if (newPassword.length < 6) {
      return toast.error("A senha deve ter no mínimo 6 caracteres.");
    }
    setIsResetting(true);
    try {
      await axios.post(`${API}/auth/change-password`, { new_password: newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Senha atualizada com sucesso!");
      
      // Update local storage user object
      const updatedUser = { ...user, must_change_password: false };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setForcePasswordReset(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao alterar senha.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex font-sans">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-line transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-line">
          {sidebarOpen && (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center space-x-2"
            >
              <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 52 52" fill="none">
                <rect width="52" height="52" rx="12" fill="#0A0A0F"/>
                <path d="M13 16L26 37L39 16" stroke="#3B82F6" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="26" cy="37" r="3.5" fill="#3B82F6"/>
                <circle cx="13" cy="16" r="2.5" fill="rgba(59, 130, 246, 0.5)"/>
                <circle cx="39" cy="16" r="2.5" fill="rgba(59, 130, 246, 0.5)"/>
              </svg>
              <span className="text-lg font-extrabold tracking-tight text-navy" style={{fontFamily: "'Inter', sans-serif"}}>Core Agents IA</span>
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`${sidebarOpen ? "" : "mx-auto mt-2"}`}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        {/* Agent Selector */}
        {sidebarOpen && subscriptions.length > 0 && (
          <div className="p-3 border-b border-line">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Agente Ativo
            </label>
            <select
              value={selectedAgentId || ''}
              onChange={(e) => handleAgentSelect(e.target.value)}
              className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm text-navy font-medium focus:outline-none focus:ring-2 focus:ring-coreblue"
            >
              {subscriptions.map((sub) => (
                <option key={sub.id} value={sub.agent_id}>
                  {sub.agentName || sub.agent_id}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Menu Items */}
        <nav className="p-2 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(item.path)
                  ? "bg-navy text-white shadow-sm font-semibold"
                  : "text-gray-600 font-medium hover:bg-slate-100"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Info */}
        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-line bg-white">
            {user.name ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-paper border border-line rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-navy">
                      {user.name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-navy truncate">{user.name}</p>
                    {user.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-red-600 font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  Sair
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full bg-coreblue hover:bg-blue-700 text-white font-bold"
                  size="sm"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
                <Button
                  onClick={() => navigate("/register")}
                  variant="outline"
                  className="w-full border-line text-navy hover:bg-paper font-bold"
                  size="sm"
                >
                  Criar conta
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-16"
        }`}
      >
        {children}
      </div>

      {/* Floating Chat - Only show if user is logged in */}
      {user.email && <FloatingChat />}

      {/* Force Password Reset Modal (Blocks everything) */}
      {forcePasswordReset && (
        <div className="fixed inset-0 z-[9999] bg-navy/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border border-line">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mb-4 text-coreblue">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-navy font-['Inter']">
                Redefinir Senha
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                O administrador redefiniu a sua senha. Por motivos de segurança, 
                você precisa escolher uma nova senha agora para continuar logado.
              </p>
            </div>
            
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-sm font-bold text-navy">Nova Senha</label>
                <input
                  type="password"
                  required
                  placeholder="**********"
                  className="w-full px-4 py-2 bg-paper border border-line rounded-xl text-navy focus:ring-2 focus:ring-coreblue outline-none"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-sm font-bold text-navy">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  placeholder="**********"
                  className="w-full px-4 py-2 bg-paper border border-line rounded-xl text-navy focus:ring-2 focus:ring-coreblue outline-none"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full bg-coreblue hover:bg-blue-700 text-white font-bold"
                  disabled={isResetting}
                >
                  {isResetting ? "Salvando Nova Senha..." : "Salvar Nova Senha"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
