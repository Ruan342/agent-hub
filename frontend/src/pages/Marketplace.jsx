import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
    { id: "0-40", label: "Até $40" },
    { id: "40-60", label: "$40 - $60" },
    { id: "60+", label: "Acima de $60" }
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
      filtered = filtered.filter(agent => agent.segment === selectedSegment);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by price range
    if (priceRange !== "all") {
      if (priceRange === "0-40") {
        filtered = filtered.filter(agent => agent.price <= 40);
      } else if (priceRange === "40-60") {
        filtered = filtered.filter(agent => agent.price > 40 && agent.price <= 60);
      } else if (priceRange === "60+") {
        filtered = filtered.filter(agent => agent.price > 60);
      }
    }

    setFilteredAgents(filtered);
  };

  const clearFilters = () => {
    setSelectedSegment("all");
    setSearchQuery("");
    setPriceRange("all");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const hasActiveFilters = selectedSegment !== "all" || searchQuery || priceRange !== "all";

  return (
    <SidebarLayout>
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Marketplace</h1>
          <p className="text-gray-600">Encontre o agente perfeito para seu negócio</p>
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
                    className={selectedSegment === segment.id ? "bg-black hover:bg-gray-900" : "border-gray-300 hover:border-black"}
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
                className={priceRange === range.id ? "bg-black hover:bg-gray-900" : "border-gray-300 text-gray-600"}
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
            className="border-gray-300"
          >
            Solicitar Agente Personalizado
          </Button>
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
            <p className="text-gray-600 mt-4">Carregando agentes...</p>
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
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-black transition-all cursor-pointer group"
                onClick={() => navigate(`/agent/${agent.id}`)}
              >
                <div className="h-48 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                  <img 
                    src={agent.mascot_image_url} 
                    alt={agent.name} 
                    className="w-28 h-28 object-contain"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/112/f9fafb/9ca3af?text=AI";
                    }}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold group-hover:text-black transition-colors">{agent.name}</h3>
                    <Badge className="bg-gray-100 text-gray-700 border-0 text-xs shrink-0">
                      {agent.segment}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">{agent.description}</p>
                  
                  {/* Features Preview */}
                  <div className="mb-4 space-y-1">
                    {agent.features.slice(0, 2).map((feature, idx) => (
                      <div key={idx} className="flex items-start text-xs text-gray-500">
                        <span className="mr-1">✓</span>
                        <span className="line-clamp-1">{feature}</span>
                      </div>
                    ))}
                    {agent.features.length > 2 && (
                      <div className="text-xs text-gray-400">+{agent.features.length - 2} recursos</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-2xl font-bold">${agent.price}</span>
                      <span className="text-gray-500 text-sm">/mês</span>
                    </div>
                    <Button 
                      data-testid={`view-agent-${agent.id}`}
                      size="sm" 
                      className="bg-black hover:bg-gray-900"
                    >
                      Ver Detalhes
                    </Button>
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
