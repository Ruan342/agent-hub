import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Zap, Globe } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-black rounded flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">VoiceAI Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              data-testid="login-button"
              variant="ghost" 
              onClick={() => navigate("/login")}
              className="text-sm"
            >
              Entrar
            </Button>
            <Button 
              data-testid="register-button"
              onClick={() => navigate("/register")}
              className="bg-black hover:bg-gray-900 text-sm"
            >
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6">
            <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              🤖 Powered by ElevenLabs AI
            </span>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Transforme seu atendimento
            <br />
            <span className="text-gray-500">com Agentes de IA por Voz</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Automatize vendas, suporte e marketing com assistentes de voz que nunca dormem.
            Integração simples via API com CRM, WhatsApp e Email.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              data-testid="explore-agents-button"
              onClick={() => navigate("/marketplace")} 
              size="lg"
              className="bg-black hover:bg-gray-800 text-white px-8 py-6 text-base"
            >
              Ver Agentes Disponíveis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              data-testid="watch-demo-button"
              variant="outline" 
              size="lg"
              className="px-8 py-6 text-base border-gray-300 hover:border-black group"
              onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
              Ver Demonstração
            </Button>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-center gap-12">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-gray-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">1000+</div>
                <div className="text-sm text-gray-600">Empresas usando</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-gray-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">50K+</div>
                <div className="text-sm text-gray-600">Chamadas processadas</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Rocket className="w-6 h-6 text-gray-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">24/7</div>
                <div className="text-sm text-gray-600">Disponibilidade</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Demo Section */}
      <div id="demo-section" className="container mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Veja como funciona</h2>
          <p className="text-xl text-gray-600">Implemente agentes de IA por voz em minutos</p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="aspect-video bg-gray-100 rounded-2xl border-2 border-gray-200 overflow-hidden relative group cursor-pointer hover:border-black transition-colors">
            {/* Placeholder para vídeo - você pode substituir pelo embed real */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
              <p className="text-gray-600 font-medium">Clique para assistir a demonstração</p>
              <p className="text-sm text-gray-500 mt-2">Duração: 2 minutos</p>
            </div>
            {/* Para adicionar vídeo real, substitua por: */}
            {/* <iframe 
              className="w-full h-full"
              src="https://www.youtube.com/embed/SEU_VIDEO_ID"
              title="Demo VoiceAI Hub"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            /> */}
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-900">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Escolha seu Agente</h3>
              <p className="text-sm text-gray-600">Selecione entre agentes especializados por segmento</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-900">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Integre via API</h3>
              <p className="text-sm text-gray-600">Use sua API key para conectar com seus sistemas</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-gray-900">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Comece a Usar</h3>
              <p className="text-sm text-gray-600">Seu agente está pronto para atender 24/7</p>
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

      {/* How It Works - Detailed */}
      <div className="bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Como funciona a plataforma</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Uma solução completa para automatizar seu atendimento com inteligência artificial
            </p>
          </div>

          <div className="max-w-6xl mx-auto space-y-16">
            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-block px-3 py-1 bg-black text-white rounded-full text-sm font-medium mb-4">
                  Passo 1
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Escolha o agente perfeito para sua necessidade
                </h3>
                <p className="text-lg text-gray-600 mb-6">
                  Navegue pelo nosso marketplace com agentes especializados em vendas, suporte, 
                  marketing, financeiro e RH. Cada agente vem com vozes naturais da ElevenLabs 
                  e recursos específicos para sua área.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Agentes pré-treinados para seu segmento</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Vozes naturais e profissionais</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Solicite agentes personalizados</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-8 h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-12 h-12 text-gray-900" />
                  </div>
                  <p className="text-gray-600 font-medium">Preview do Marketplace</p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 bg-white border border-gray-200 rounded-2xl p-8 h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Code className="w-12 h-12 text-gray-900" />
                  </div>
                  <p className="text-gray-600 font-medium">Integração API</p>
                  <code className="text-xs bg-gray-100 px-3 py-1 rounded mt-2 inline-block">
                    Authorization: Bearer vapi_xxx
                  </code>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-block px-3 py-1 bg-black text-white rounded-full text-sm font-medium mb-4">
                  Passo 2
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Integre em minutos com sua API Key
                </h3>
                <p className="text-lg text-gray-600 mb-6">
                  Após a compra, você recebe instantaneamente uma API key exclusiva e um webhook URL. 
                  Configure em seu CRM, WhatsApp Business ou sistema de email em poucos cliques.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">API RESTful simples e documentada</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Webhooks para eventos em tempo real</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">SDKs para principais linguagens</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-block px-3 py-1 bg-black text-white rounded-full text-sm font-medium mb-4">
                  Passo 3
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Monitore e otimize o desempenho
                </h3>
                <p className="text-lg text-gray-600 mb-6">
                  Acompanhe todas as interações em tempo real através do seu dashboard. 
                  Veja métricas, ajuste configurações e escale conforme necessário.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Dashboard com analytics em tempo real</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Histórico completo de conversas</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Relatórios de performance detalhados</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-8 h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-12 h-12 text-gray-900" />
                  </div>
                  <p className="text-gray-600 font-medium">Dashboard Analytics</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compelling Benefits */}
      <div className="container mx-auto px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Implantação Rápida</h3>
              <p className="text-gray-600">
                Do cadastro à primeira chamada em menos de 10 minutos. 
                Sem complexidade técnica.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Segurança Enterprise</h3>
              <p className="text-gray-600">
                Criptografia de ponta a ponta, compliance com LGPD e 
                infraestrutura redundante.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Performance Real</h3>
              <p className="text-gray-600">
                Latência ultra-baixa, 99.9% de uptime e escalabilidade 
                automática ilimitada.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial / Use Case Highlight */}
      <div className="bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Casos de uso reais
              </h2>
              <p className="text-xl text-gray-600">
                Veja como empresas estão transformando seu atendimento
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-black transition-colors">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="font-bold text-gray-900 mb-2">Vendas</h3>
                <p className="text-sm text-gray-600 mb-4">
                  "Aumentamos em 40% a qualificação de leads com agentes que trabalham 24/7"
                </p>
                <div className="text-xs text-gray-500">— Tech Startup</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-black transition-colors">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="font-bold text-gray-900 mb-2">Suporte</h3>
                <p className="text-sm text-gray-600 mb-4">
                  "Reduzimos 60% dos tickets de suporte com atendimento automático inteligente"
                </p>
                <div className="text-xs text-gray-500">— E-commerce</div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-black transition-colors">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="font-bold text-gray-900 mb-2">Marketing</h3>
                <p className="text-sm text-gray-600 mb-4">
                  "Alcançamos 3x mais prospects com campanhas de voz personalizadas"
                </p>
                <div className="text-xs text-gray-500">— Agência Digital</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black rounded-2xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-black opacity-50"></div>
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4">
                Comece gratuitamente hoje
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Sem cartão de crédito. Configure em minutos. 
                Cancele quando quiser.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button 
                  data-testid="cta-marketplace-button"
                  onClick={() => navigate("/marketplace")} 
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100 px-8 py-6 text-base"
                >
                  Explorar Marketplace
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  data-testid="cta-demo-button"
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-black px-8 py-6 text-base"
                  onClick={() => navigate("/request-agent")}
                >
                  Solicitar Demo
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
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
