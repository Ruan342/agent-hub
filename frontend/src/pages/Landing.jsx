import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Zap, Globe, Code2, CheckCircle2 } from "lucide-react";
import SidebarLayout from "@/components/SidebarLayout";

export default function Landing() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isLoggedIn = !!user && !!user.name;

  const mainContent = (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-sm mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-medium">Tecnologia de IA Avançada</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Agentes de voz IA
            <br />
            <span className="text-gray-400">que trabalham 24/7</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Automatize vendas, suporte e marketing com assistentes inteligentes.
            Integração simples via API.
          </p>
          
          <div className="flex items-center justify-center gap-3">
            <Button 
              data-testid="explore-agents-button"
              onClick={() => navigate("/marketplace")} 
              size="lg"
              className="bg-black hover:bg-gray-900 h-12 px-6"
            >
              Ver Agentes
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button 
              data-testid="watch-demo-button"
              variant="outline" 
              size="lg"
              className="h-12 px-6 border-gray-300"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Play className="mr-2 w-4 h-4" />
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-1">1000+</div>
              <div className="text-sm text-gray-600">Empresas ativas</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">50K+</div>
              <div className="text-sm text-gray-600">Chamadas/dia</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">99.9%</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo */}
      <section id="demo" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-3">Veja como funciona</h2>
          <p className="text-lg text-gray-600">Configure seu agente em menos de 5 minutos</p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="aspect-video bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden relative group cursor-pointer hover:border-gray-400 transition-all">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                <Play className="w-7 h-7 text-white ml-1" />
              </div>
              <p className="text-sm text-gray-600 mt-4">Assistir demonstração (2 min)</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-3">Como funciona</h2>
            <p className="text-lg text-gray-600">Três passos simples para começar</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mb-6">
                <span className="text-white font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Escolha seu agente</h3>
              <p className="text-gray-600 leading-relaxed">
                Navegue pelo marketplace e selecione o agente ideal para vendas, suporte ou marketing.
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mb-6">
                <span className="text-white font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Integre via API</h3>
              <p className="text-gray-600 leading-relaxed">
                Use sua API key exclusiva para conectar com CRM, WhatsApp ou email em minutos.
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mb-6">
                <span className="text-white font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Monitore resultados</h3>
              <p className="text-gray-600 leading-relaxed">
                Acompanhe performance, ajuste configurações e escale conforme necessário.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-6">
              Tecnologia de ponta para seu negócio
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Vozes ultra-realistas, infraestrutura enterprise e API simples.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">Vozes ultra-realistas</div>
                  <div className="text-sm text-gray-600">IA de última geração para conversas naturais</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">Integração instantânea</div>
                  <div className="text-sm text-gray-600">API RESTful com documentação completa</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">Segurança enterprise</div>
                  <div className="text-sm text-gray-600">Criptografia E2E e compliance LGPD</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">Escala automatizada</div>
                  <div className="text-sm text-gray-600">Suporta milhares de chamadas simultâneas</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 flex items-center justify-center h-96">
            <div className="text-center">
              <Globe className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Preview da Interface</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-3">Casos de uso</h2>
            <p className="text-lg text-gray-600">Soluções para cada área do seu negócio</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-black transition-colors">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-semibold text-lg mb-2">Vendas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Qualificação de leads, agendamento e follow-up automático 24/7
              </p>
              <div className="text-xs text-gray-500">"+40% em conversão"</div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-black transition-colors">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="font-semibold text-lg mb-2">Suporte</h3>
              <p className="text-sm text-gray-600 mb-4">
                Atendimento instantâneo, resolução de dúvidas e escalação inteligente
              </p>
              <div className="text-xs text-gray-500">"-60% tickets"</div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-black transition-colors">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="font-semibold text-lg mb-2">Marketing</h3>
              <p className="text-sm text-gray-600 mb-4">
                Campanhas personalizadas, pesquisas e coleta de feedback
              </p>
              <div className="text-xs text-gray-500">"3x mais alcance"</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="bg-black rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Começe gratuitamente</h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Sem cartão de crédito. Configure em minutos. Cancele quando quiser.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button 
              data-testid="cta-marketplace-button"
              onClick={() => navigate("/marketplace")} 
              size="lg"
              className="bg-white text-black hover:bg-gray-100 h-12 px-6"
            >
              Ver Marketplace
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button 
              data-testid="cta-demo-button"
              variant="outline"
              size="lg"
              className="h-12 px-6 border-white/20 text-white hover:bg-white/10"
              onClick={() => navigate("/request-agent")}
            >
              Solicitar Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-sm text-gray-500">
            © 2025 VoiceAI Hub. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </>
  );

  return (
    <SidebarLayout>
      {mainContent}
    </SidebarLayout>
  );
}
