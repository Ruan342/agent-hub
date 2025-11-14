import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Zap, Shield } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Navbar */}
        <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Mic className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">VoiceAI Hub</span>
          </div>
          <div className="flex space-x-4">
            <Button 
              data-testid="login-button"
              variant="ghost" 
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
            <Button 
              data-testid="register-button"
              onClick={() => navigate("/register")}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Começar Grátis
            </Button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
            Agentes de IA por Voz
            <br />
            <span className="text-indigo-600">para seu Negócio</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Integre agentes de voz inteligentes em seu CRM, WhatsApp e email.
            Escolha entre diversos segmentos ou solicite um personalizado.
          </p>
          <div className="flex justify-center space-x-4">
            <Button 
              data-testid="explore-agents-button"
              onClick={() => navigate("/marketplace")} 
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-6"
            >
              Explorar Agentes
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              data-testid="request-custom-button"
              onClick={() => navigate("/request-agent")} 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6"
            >
              Solicitar Personalizado
            </Button>
          </div>
        </div>

        {/* Wave SVG */}
        <div className="absolute bottom-0 w-full">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="white"></path>
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Por que escolher VoiceAI Hub?</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center" data-testid="feature-card-integration">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Integração Rápida</h3>
              <p className="text-gray-600">Conecte com CRM, WhatsApp, email em minutos com nossa API simples</p>
            </div>
            <div className="text-center" data-testid="feature-card-voices">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Vozes Naturais</h3>
              <p className="text-gray-600">Tecnologia ElevenLabs para vozes realistas e profissionais</p>
            </div>
            <div className="text-center" data-testid="feature-card-security">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Seguro e Confiável</h3>
              <p className="text-gray-600">API keys exclusivas e webhooks seguros para suas integrações</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Pronto para começar?</h2>
          <p className="text-xl text-indigo-100 mb-10">Escolha seu agente de IA e comece a usar hoje mesmo</p>
          <Button 
            data-testid="cta-marketplace-button"
            onClick={() => navigate("/marketplace")} 
            size="lg"
            className="bg-white text-indigo-600 hover:bg-gray-100 text-lg px-8 py-6"
          >
            Ver Marketplace
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2025 VoiceAI Hub. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
