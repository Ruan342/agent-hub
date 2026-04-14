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

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, {
        name,
        email,
        password
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      toast.success("Cadastro realizado com sucesso!");
      navigate("/marketplace");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao cadastrar");
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

        <div className="bg-white border border-line rounded-xl p-8 shadow-sm" data-testid="register-form">
          <h1 className="text-2xl font-extrabold text-navy mb-2 tracking-tight">Criar conta</h1>
          <p className="text-gray-500 mb-8 font-medium">Comece a usar agentes de IA hoje</p>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-sm font-bold text-navy">Nome</Label>
              <Input
                data-testid="name-input"
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 bg-paper border-line text-navy focus:ring-2 focus:ring-coreblue outline-none"
                placeholder="Seu nome completo"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-bold text-navy">Email</Label>
              <Input
                data-testid="email-input"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 bg-paper border-line text-navy focus:ring-2 focus:ring-coreblue outline-none"
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
                className="mt-1 bg-paper border-line text-navy focus:ring-2 focus:ring-coreblue outline-none"
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <Button 
              data-testid="register-submit-button"
              type="submit" 
              className="w-full bg-coreblue hover:bg-blue-700 text-white font-bold tracking-wide" 
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Criar Conta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Já tem uma conta?{" "}
              <button
                data-testid="login-link"
                onClick={() => navigate("/login")}
                className="text-coreblue font-bold hover:underline"
              >
                Faça login
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
