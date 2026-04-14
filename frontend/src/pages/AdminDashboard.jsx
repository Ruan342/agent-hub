import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";
import { Users, CreditCard, Lock, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/login");
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== "admin") {
      toast.error("Acesso negado.");
      navigate("/dashboard");
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, subsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/subscriptions`, { headers })
      ]);

      setUsers(usersRes.data);
      setSubscriptions(subsRes.data);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados do admin.");
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = (user) => {
    setResetTargetUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setResetModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      return toast.error("A senha não pode ser vazia");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("As senhas não coincidem!");
    }

    setIsResetting(true);
    try {
        const token = localStorage.getItem("token");
        await axios.post(
            `${API}/admin/users/${resetTargetUser.id}/reset-password`, 
            { new_password: newPassword },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Senha redefinida com sucesso. O usuário será forçado a trocá-la no próximo login.");
        setResetModalOpen(false);
    } catch (err) {
        console.error(err);
        toast.error("Erro ao redefinir a senha.");
    } finally {
        setIsResetting(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
            Painel do Administrador
          </h1>
          <p className="text-gray-500 mt-2">
            Visão gerencial de usuários e assinaturas.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 pb-px">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-violet-50 text-violet-700 border-b-2 border-violet-600"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4" />
            Usuários
          </button>
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === "subscriptions"
                ? "bg-violet-50 text-violet-700 border-b-2 border-violet-600"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Assinaturas
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {activeTab === "users" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b text-gray-500 font-medium tracking-wide">
                    <tr>
                      <th className="px-6 py-4">Nome</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-gray-700">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">{u.name}</td>
                        <td className="px-6 py-4 font-medium">{u.email}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={u.role === 'admin' ? 'bg-violet-50 text-violet-700' : ''}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openResetModal(u)}
                            className="gap-2"
                          >
                            <Lock className="w-4 h-4" />
                            Redefinir Senha
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b text-gray-500 font-medium tracking-wide">
                    <tr>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Titular (E-mail)</th>
                      <th className="px-6 py-4">Agente</th>
                      <th className="px-6 py-4">Cadastro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-gray-700">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Badge className={sub.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100/80' : 'bg-gray-100 text-gray-700'}>
                             {sub.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-medium">{sub.user_email}</td>
                        <td className="px-6 py-4">{sub.agent_name}</td>
                        <td className="px-6 py-4 text-gray-500">
                            {new Date(sub.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {subscriptions.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                          Nenhuma assinatura encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Redefinição de Senha Administrador */}
      {resetModalOpen && resetTargetUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setResetModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-6 flex items-center gap-3 text-violet-600">
                <Lock className="w-6 h-6" />
                <h3 className="text-xl font-semibold text-gray-900">
                Redefinir Senha
                </h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Você está definindo uma nova senha para <strong>{resetTargetUser.email}</strong>. 
              Ao fazer login com ela, o usuário será forçado a escolher uma senha definitiva.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nova Senha</label>
                <Input
                  type="password"
                  required
                  placeholder="Digite a nova senha provisória"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                <Input
                  type="password"
                  required
                  placeholder="Confirme a senha provisória"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setResetModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="w-full bg-violet-600 hover:bg-violet-700"
                  disabled={isResetting}
                >
                  {isResetting ? "Salvando..." : "Redefinir Senha"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
