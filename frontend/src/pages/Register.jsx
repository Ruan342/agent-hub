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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Code className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-semibold text-gray-900">VoiceAI Hub</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8" data-testid="register-form">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Criar conta</h1>
          <p className="text-gray-600 mb-8">Comece a usar agentes de IA hoje</p>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nome</Label>
              <Input
                data-testid="name-input"
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 border-gray-300 focus:border-purple-500"
                placeholder="Seu nome completo"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
              <Input
                data-testid="email-input"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 border-gray-300 focus:border-purple-500"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Senha</Label>
              <Input
                data-testid="password-input"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 border-gray-300 focus:border-purple-500"
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <Button 
              data-testid="register-submit-button"
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Criar Conta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{" "}
              <button
                data-testid="login-link"
                onClick={() => navigate("/login")}
                className="text-black font-semibold hover:underline"
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
