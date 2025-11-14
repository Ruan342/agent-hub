import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mic } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8" data-testid="register-form">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <Mic className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Criar conta</h1>
          <p className="text-gray-600 text-center mb-8">Comece a usar agentes de IA hoje</p>

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                data-testid="name-input"
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                data-testid="email-input"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                data-testid="password-input"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
                minLength={6}
              />
            </div>
            <Button 
              data-testid="register-submit-button"
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700" 
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Já tem uma conta?{" "}
              <button
                data-testid="login-link"
                onClick={() => navigate("/login")}
                className="text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Faça login
              </button>
            </p>
          </div>

          <div className="mt-4 text-center">
            <button
              data-testid="back-to-home-link"
              onClick={() => navigate("/")}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Voltar para Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
