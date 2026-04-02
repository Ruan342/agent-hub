import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Users, Calendar, Clock, Eye, MessageSquare, Search, X, Filter } from "lucide-react";
import SidebarLayout from "@/components/SidebarLayout";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeBR } from "@/utils/dateUtils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ClientHistoryList() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [filterName, setFilterName] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchSessions();
  }, [subscriptionId]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/subscriptions/${subscriptionId}/client-sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data);
    } catch (e) {
      toast.error("Erro ao carregar histórico de clientes");
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((sess) => {
    if (filterName && !sess.client_name?.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterEmail && !sess.client_email?.toLowerCase().includes(filterEmail.toLowerCase())) return false;
    if (filterStatus === "active" && sess.status !== "active") return false;
    if (filterStatus === "closed" && sess.status !== "closed") return false;
    if (filterDateFrom) {
      const from = new Date(filterDateFrom + "T00:00:00");
      if (new Date(sess.created_at) < from) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo + "T23:59:59");
      if (new Date(sess.created_at) > to) return false;
    }
    return true;
  });

  const hasFilters = filterName || filterEmail || filterStatus !== "all" || filterDateFrom || filterDateTo;
  const clearFilters = () => {
    setFilterName("");
    setFilterEmail("");
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/minhas-assinaturas")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Histórico de Clientes</h1>
            <p className="text-gray-500 mt-1">Conferência e auditoria de conversas via Link Único</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-gray-700">Filtros</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Name */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Nome do cliente"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
              />
            </div>
            {/* Email */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="E-mail"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
              />
            </div>
            {/* Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50 text-gray-700"
            >
              <option value="all">Todos os status</option>
              <option value="active">Em andamento</option>
              <option value="closed">Finalizado</option>
            </select>
            {/* Date From */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50 text-gray-700"
                title="Data inicial"
              />
            </div>
            {/* Date To */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50 text-gray-700"
                title="Data final"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Mostrando {filteredSessions.length} de {sessions.length} atendimentos
            {filterDateFrom || filterDateTo ? " · Horário de Brasília (UTC-3)" : ""}
          </p>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-purple-300" />
            </div>
            {hasFilters ? (
              <>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum resultado encontrado</h3>
                <p className="text-gray-500 max-w-md">Nenhum atendimento corresponde aos filtros aplicados.</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
                >
                  Limpar filtros
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum cliente ativado ainda</h3>
                <p className="text-gray-500 max-w-md">
                  Gere um <b>Link Único</b> na página anterior e envie para seus clientes. Assim que eles acessarem, a conversa aparecerá aqui.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredSessions.map((sess) => (
              <div key={sess.session_id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-start md:items-center">

                {/* User Info col */}
                <div className="flex-1 w-full min-w-[250px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-inner">
                      {(sess.client_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">{sess.client_name}</h3>
                      <p className="text-sm text-gray-500">{sess.client_email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 ml-1">
                    <Badge variant="outline" className="flex items-center gap-1.5 text-xs font-medium bg-gray-50 border-gray-200 text-gray-600">
                      <Calendar className="w-3 h-3" /> {formatDateTimeBR(sess.created_at)}
                    </Badge>
                    <Badge variant="outline" className={`flex items-center gap-1.5 text-xs font-semibold ${
                      sess.status === 'active'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-300 text-red-600'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {sess.status === 'active' ? 'Em andamento' : 'Finalizado'}
                    </Badge>
                  </div>
                </div>

                {/* Preview Messages col */}
                <div className="flex-[2] w-full bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  {sess.preview_messages && sess.preview_messages.length > 0 ? (
                    <div className="space-y-3">
                      {sess.preview_messages.map((m, i) => (
                        <div key={i} className={`flex items-start gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {m.role === 'agent' && <MessageSquare className="w-4 h-4 text-purple-400 mt-1 shrink-0" />}
                          <div className={`text-sm px-3 py-1.5 rounded-2xl max-w-[80%] line-clamp-2 ${m.role === 'user' ? 'bg-blue-100 text-blue-800 rounded-br-none' : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'}`}>
                            {m.content || (m.has_audio ? "🎙️ [Áudio]" : "...")}
                          </div>
                          {m.role === 'user' && <div className="w-4 h-4 rounded-full bg-blue-500 mt-1 shrink-0"></div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-2">Sem mensagens</p>
                  )}
                </div>

                {/* Action col */}
                <div className="flex-shrink-0 w-full md:w-auto flex justify-end">
                  <button
                    onClick={() => navigate(`/client-chat-history/${sess.session_id}`)}
                    className="w-full md:w-auto px-6 py-3 bg-white border-2 border-purple-100 hover:border-purple-300 text-purple-700 hover:bg-purple-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Eye className="w-5 h-5" />
                    Expandir Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
