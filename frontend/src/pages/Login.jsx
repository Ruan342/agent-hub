import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Code, ArrowLeft } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      toast.success("Login realizado com sucesso!");
      
      if (response.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block">
            <div className="flex justify-center mb-6">
              <svg className="w-12 h-12 flex-shrink-0" viewBox="0 0 52 52" fill="none">
                <rect width="52" height="52" rx="12" fill="#0A0A0F"/>
                <path d="M13 16L26 37L39 16" stroke="#3B82F6" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="26" cy="37" r="3.5" fill="#3B82F6"/>
                <circle cx="13" cy="16" r="2.5" fill="rgba(59, 130, 246, 0.5)"/>
                <circle cx="39" cy="16" r="2.5" fill="rgba(59, 130, 246, 0.5)"/>
              </svg>
            </div>
            <span className="text-3xl font-extrabold tracking-tight text-navy" style={{fontFamily: "'Inter', sans-serif"}}>Core Agents IA</span>
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl p-8 shadow-sm" data-testid="login-form">
          <h1 className="text-2xl font-extrabold text-navy mb-2 tracking-tight">Bem-vindo de volta</h1>
          <p className="text-gray-500 mb-8 font-medium">Entre na sua conta para continuar</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-bold text-navy">Email</Label>
              <Input
                data-testid="email-input"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 bg-paper border-line text-navy focus:ring-2 focus:ring-coreblue"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-bold text-navy">Senha</Label>
              <Input
                data-testid="password-input"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 bg-paper border-line text-navy focus:ring-2 focus:ring-coreblue"
                placeholder="••••••••"
              />
            </div>
            <Button 
              data-testid="login-submit-button"
              type="submit" 
              className="w-full bg-coreblue hover:bg-blue-700 text-white font-bold tracking-wide" 
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Não tem uma conta?{" "}
              <button
                data-testid="register-link"
                onClick={() => navigate("/register")}
                className="text-coreblue font-bold hover:underline"
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            data-testid="back-to-home-link"
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar para Home
          </button>
        </div>
      </div>
    </div>
  );
}
