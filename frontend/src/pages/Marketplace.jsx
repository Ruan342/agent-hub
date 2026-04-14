import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Search, SlidersHorizontal, X, Clock } from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SEGMENT_LABELS = {
  ecommerce: "E-Commerce",
  sdr: "SDR",
  suporte: "Suporte",
  pos_vendas: "Pós-Vendas",
  lidia_prospec: "Prospecção",
};

const formatSegment = (seg) => SEGMENT_LABELS[seg] || (seg ? seg.toUpperCase() : 'AGENTE');

export default function Marketplace() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState("all");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const segments = [
    { id: "all", label: "Todos", icon: "🎯" },
    { id: "vendas", label: "Vendas", icon: "💼" },
    { id: "suporte", label: "Suporte", icon: "💬" },
    { id: "marketing", label: "Marketing", icon: "📊" },
    { id: "financeiro", label: "Financeiro", icon: "💰" },
    { id: "rh", label: "RH", icon: "👥" },
    { id: "saude", label: "Saúde", icon: "🏥" }
  ];

  const priceRanges = [
    { id: "all", label: "Todos os preços" },
    { id: "0-250", label: "Até R$250" },
    { id: "250-300", label: "R$250 - R$300" },
    { id: "300+", label: "Acima de R$300" }
  ];

  const comingSoonAgents = [
    {
      name: "Secretaria 24/7",
      subtitle: "Atende WhatsApp, site e Insta 24h, responde dúvidas e coloca o cliente direto na sua agenda"
    },
    {
      name: "Assistente Executivo",
      subtitle: "Organiza e-mail, agenda, tarefas e follow-ups como um braço direito digital para empreendedores e diretores"
    },
    {
      name: "Inteligência de Marca",
      subtitle: "Monitora redes, reviews e concorrentes e te entrega insights prontos para decisão e marketing"
    },
    {
      name: "Assistente Financeiro",
      subtitle: "Lembra vencimentos, envia links de pagamento, faz cobranças suaves e atualiza o status financeiro"
    }
  ];

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    filterAgents();
  }, [agents, selectedSegment, searchQuery, priceRange]);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API}/agents`);
      setAgents(response.data);
    } catch (error) {
      toast.error("Erro ao carregar agentes");
    } finally {
      setLoading(false);
    }
  };

  const filterAgents = () => {
    let filtered = [...agents];

    // Filter by segment
    if (selectedSegment !== "all") {
      filtered = filtered.filter((agent) => agent.segment === selectedSegment);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((agent) => {
        const name = (agent.name || "").toLowerCase();
        const description = (agent.description || "").toLowerCase();
        return name.includes(query) || description.includes(query);
      });
    }

    // Filter by price range
    if (priceRange !== "all") {
      if (priceRange === "0-250") {
        filtered = filtered.filter((agent) => agent.price <= 250);
      } else if (priceRange === "250-300") {
        filtered = filtered.filter((agent) => agent.price > 250 && agent.price <= 300);
      } else if (priceRange === "300+") {
        filtered = filtered.filter((agent) => agent.price > 300);
      }
    }

    setFilteredAgents(filtered);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const clearFilters = () => {
    setSelectedSegment("all");
    setSearchQuery("");
    setPriceRange("all");
  };

  const hasActiveFilters = selectedSegment !== "all" || searchQuery || priceRange !== "all";

  return (
    <SidebarLayout>
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-coreblue/10 border border-coreblue/20 rounded-full text-xs font-bold text-coreblue mb-3 uppercase tracking-wide">
            <Sparkles className="w-3 h-3" />
            Catálogo de agentes de voz
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-navy">Marketplace</h1>
          <p className="text-gray-500 font-medium tracking-wide">Encontre o agente perfeito para seu negócio</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              data-testid="search-input"
              placeholder="Buscar agentes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 border-gray-300"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <SlidersHorizontal className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
              
              {/* Segment Filter */}
              <div className="flex flex-wrap gap-2">
                {segments.map((segment) => (
                  <Button
                    key={segment.id}
                    data-testid={`segment-${segment.id}`}
                    onClick={() => setSelectedSegment(segment.id)}
                    variant={selectedSegment === segment.id ? "default" : "outline"}
                    size="sm"
                    className={selectedSegment === segment.id ? "bg-coreblue hover:bg-blue-700 font-bold" : "border-line bg-white hover:bg-paper font-semibold text-navy"}
                  >
                    <span className="mr-1">{segment.icon}</span>
                    {segment.label}
                  </Button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                data-testid="clear-filters"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-600"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Price Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Preço:</span>
            {priceRanges.map((range) => (
              <Button
                key={range.id}
                onClick={() => setPriceRange(range.id)}
                variant={priceRange === range.id ? "default" : "outline"}
                size="sm"
                className={priceRange === range.id ? "bg-coreblue hover:bg-blue-700 font-bold" : "border-line bg-white text-navy font-semibold hover:bg-paper"}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {filteredAgents.length} {filteredAgents.length === 1 ? 'agente encontrado' : 'agentes encontrados'}
          </p>
          <Button 
            data-testid="request-agent-button"
            onClick={() => navigate("/request-agent")} 
            variant="outline"
            size="sm"
            className="border-line font-bold text-navy hover:bg-paper"
          >
            Solicitar Agente Personalizado
          </Button>
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-1/2 h-5 bg-gray-200 rounded"></div>
                    <div className="w-16 h-5 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="w-3/4 h-4 bg-gray-200 rounded mb-6"></div>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                    <div className="w-20 h-6 bg-gray-200 rounded-full"></div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                    <div className="space-y-1">
                      <div className="w-12 h-3 bg-gray-200 rounded"></div>
                      <div className="w-16 h-5 bg-gray-200 rounded"></div>
                    </div>
                    <div className="w-24 h-8 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-xl" data-testid="no-agents-message">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Nenhum agente encontrado</h3>
            <p className="text-gray-600 mb-4">Tente ajustar seus filtros ou solicite um agente personalizado</p>
            <Button onClick={clearFilters} variant="outline" size="sm">
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <div 
                key={agent.id} 
                data-testid={`agent-card-${agent.id}`}
                className="bg-white border border-line rounded-2xl overflow-hidden hover:border-coreblue hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/agent/${agent.id}`)}
              >
                <div className="h-48 bg-paper border-b border-line overflow-hidden p-6 flex items-center justify-center">
                  <img 
                    src={agent.mascot_image_url} 
                    alt={agent.name}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/400x192?text=AI";
                    }}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-extrabold text-navy group-hover:text-coreblue transition-colors">{agent.name}</h3>
                    <Badge className="bg-navy/5 text-navy border-line text-xs shrink-0 tracking-wide uppercase">
                      {formatSegment(agent.segment)}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">{agent.description}</p>
                  
                  {/* Features Preview */}
                  <div className="mb-4 space-y-1">
                    {(agent.features || []).slice(0, 2).map((feature, idx) => (
                      <div key={idx} className="flex items-start text-xs text-gray-500">
                        <span className="mr-1">✓</span>
                        <span className="line-clamp-1">{feature}</span>
                      </div>
                    ))}
                    {(agent.features || []).length > 2 && (
                      <div className="text-xs text-gray-400">+{(agent.features || []).length - 2} recursos</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-line">
                    <div>
                      <span className="text-2xl font-extrabold text-navy">R$ {Number(agent.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-gray-500 text-sm font-medium">/mês</span>
                    </div>
                    <Button 
                      data-testid={`view-agent-${agent.id}`}
                      size="sm" 
                      className="bg-coreblue hover:bg-blue-700 text-white font-bold"
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Coming Soon Agents */}
            {(selectedSegment === "all") && !searchQuery && comingSoonAgents.map((agent, idx) => (
              <div
                key={`coming-${idx}`}
                className="relative bg-white border border-line rounded-2xl overflow-hidden group select-none"
              >
                {/* Blurred placeholder content */}
                <div className="blur-md pointer-events-none saturate-50">
                  <div className="h-48 bg-paper border-b border-line flex items-center justify-center">
                    <div className="w-20 h-20 bg-slate-200/80 rounded-full" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-5 bg-slate-300 rounded w-32" />
                      <div className="h-5 bg-slate-200 rounded w-16" />
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-3 bg-slate-200 rounded w-full" />
                      <div className="h-3 bg-slate-200 rounded w-4/5" />
                      <div className="h-3 bg-slate-200 rounded w-3/5" />
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-line">
                      <div className="h-7 bg-slate-300 rounded w-20" />
                      <div className="h-8 bg-slate-200 rounded w-24" />
                    </div>
                  </div>
                </div>

                {/* Em Breve Badge Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-4 text-center shadow-xl border border-line mx-4">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.15em]">Em Breve</span>
                    </div>
                    <p className="text-[15px] font-bold text-gray-900 mb-1">{agent.name}</p>
                    <p className="text-[11px] text-gray-500 leading-snug max-w-[200px]">{agent.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
