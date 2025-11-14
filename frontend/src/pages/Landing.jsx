import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Code, Check } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">VoiceAI Hub</span>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              data-testid="login-button"
              variant="ghost" 
              onClick={() => navigate("/login")}
              className="text-gray-600 hover:text-gray-900"
            >
              Entrar
            </Button>
            <Button 
              data-testid="register-button"
              onClick={() => navigate("/register")}
              className="bg-black hover:bg-gray-800 text-white"
            >
              Começar
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6">
            <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              🤖 Powered by ElevenLabs AI
            </span>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Agentes de IA por Voz
            <br />
            <span className="text-gray-500">para seu Negócio</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Integre assistentes de voz inteligentes no seu CRM, WhatsApp e email.
            Escolha entre agentes especializados ou solicite um personalizado.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              data-testid="explore-agents-button"
              onClick={() => navigate("/marketplace")} 
              size="lg"
              className="bg-black hover:bg-gray-800 text-white px-8 py-6 text-base"
            >
              Ver Agentes
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              data-testid="request-custom-button"
              onClick={() => navigate("/request-agent")} 
              variant="outline" 
              size="lg"
              className="px-8 py-6 text-base border-gray-300 hover:border-black"
            >
              Solicitar Customizado
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">5+</div>
              <div className="text-gray-600">Agentes Disponíveis</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-gray-600">Disponibilidade</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">API</div>
              <div className="text-gray-600">Integração Simples</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Por que VoiceAI Hub?</h2>
          <p className="text-xl text-gray-600">Tecnologia de ponta para automatizar seu atendimento</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div data-testid="feature-card-integration" className="p-8 bg-white border border-gray-200 rounded-xl hover:border-black transition-colors">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Integração Rápida</h3>
            <p className="text-gray-600 leading-relaxed">API RESTful simples. Conecte com CRM, WhatsApp e email em minutos.</p>
          </div>
          <div data-testid="feature-card-voices" className="p-8 bg-white border border-gray-200 rounded-xl hover:border-black transition-colors">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">ElevenLabs AI</h3>
            <p className="text-gray-600 leading-relaxed">Vozes naturais e realistas com a melhor tecnologia de síntese de voz.</p>
          </div>
          <div data-testid="feature-card-security" className="p-8 bg-white border border-gray-200 rounded-xl hover:border-black transition-colors">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-gray-900" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Seguro e Confiável</h3>
            <p className="text-gray-600 leading-relaxed">API keys exclusivas, webhooks seguros e infraestrutura enterprise.</p>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Casos de Uso</h2>
            <p className="text-xl text-gray-600">Agentes especializados para cada área do seu negócio</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { title: "Vendas", desc: "Qualificação de leads e agendamento automático" },
              { title: "Suporte", desc: "Atendimento 24/7 e resolução de tickets" },
              { title: "Marketing", desc: "Campanhas outbound e coleta de feedback" },
              { title: "Financeiro", desc: "Cobranças e lembretes de pagamento" },
              { title: "RH", desc: "Triagem de candidatos e agendamento" },
              { title: "Personalizado", desc: "Crie seu próprio agente customizado" }
            ].map((useCase, i) => (
              <div key={i} className="flex items-start p-6 bg-white border border-gray-200 rounded-lg">
                <Check className="w-5 h-5 text-gray-900 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{useCase.title}</h4>
                  <p className="text-sm text-gray-600">{useCase.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto text-center bg-black rounded-2xl p-12">
          <h2 className="text-4xl font-bold text-white mb-4">Pronto para começar?</h2>
          <p className="text-xl text-gray-300 mb-8">Escolha seu agente e comece a usar em minutos</p>
          <Button 
            data-testid="cta-marketplace-button"
            onClick={() => navigate("/marketplace")} 
            size="lg"
            className="bg-white text-black hover:bg-gray-100 px-8 py-6 text-base"
          >
            Ver Marketplace
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-gray-600 text-sm">
            © 2025 VoiceAI Hub. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
