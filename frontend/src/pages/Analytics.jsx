import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Activity, AlertCircle, 
  CheckCircle, Clock, MessageSquare, Zap 
} from "lucide-react";
import { toast } from "sonner";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Analytics() {
  const token = localStorage.getItem("token");
  const selectedAgentId = localStorage.getItem("selectedAgentId");

  const [metrics, setMetrics] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [rateLimits, setRateLimits] = useState(null);
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7); // days
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, [selectedAgentId]);

  useEffect(() => {
    if (selectedSubscription) {
      fetchData();
      
      // Refresh realtime every 30 seconds
      const interval = setInterval(() => {
        fetchRealtime();
        fetchHealth();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [selectedSubscription, timeRange]);

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const activeSubs = response.data.filter(sub => sub.status === 'active');
      setSubscriptions(activeSubs);
      
      // Find subscription for selected agent
      const sub = activeSubs.find(s => s.agent_id === selectedAgentId);
      if (sub) {
        setSelectedSubscription(sub);
      } else if (activeSubs.length > 0) {
        setSelectedSubscription(activeSubs[0]);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [metricsRes, realtimeRes, healthRes, logsRes] = await Promise.all([
        axios.get(`${API}/analytics/dashboard`, {
          params: { subscription_id: subscriptionId, days: timeRange },
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/analytics/realtime`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/monitoring/health`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/monitoring/logs`, {
          params: { limit: 50 },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setMetrics(metricsRes.data);
      setRealtime(realtimeRes.data);
      setHealth(healthRes.data);
      setLogs(logsRes.data.logs);
      
      // Fetch rate limits if subscription is selected
      if (subscriptionId) {
        const rateLimitRes = await axios.get(`${API}/rate-limits/status`, {
          params: { subscription_id: subscriptionId },
          headers: { Authorization: `Bearer ${token}` }
        });
        setRateLimits(rateLimitRes.data);
      }
      
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Erro ao carregar analytics");
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtime = async () => {
    try {
      const res = await axios.get(`${API}/analytics/realtime`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRealtime(res.data);
    } catch (error) {
      console.error("Error fetching realtime:", error);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await axios.get(`${API}/monitoring/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHealth(res.data);
    } catch (error) {
      console.error("Error fetching health:", error);
    }
  };

  const resolveLog = async (logId) => {
    try {
      await axios.post(`${API}/monitoring/logs/${logId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Log marcado como resolvido");
      fetchData();
    } catch (error) {
      toast.error("Erro ao resolver log");
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Monitoring</h1>
          <p className="text-gray-600">Métricas em tempo real e monitoramento do sistema</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === days 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Últimos {days} dias
            </button>
          ))}
        </div>

        {/* System Health */}
        {health && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Status do Sistema</h2>
              <Badge className={
                health.status === 'healthy' ? 'bg-green-100 text-green-800' :
                health.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                {health.status === 'healthy' && <><CheckCircle className="w-4 h-4 mr-1" /> Saudável</>}
                {health.status === 'degraded' && <><AlertCircle className="w-4 h-4 mr-1" /> Degradado</>}
                {health.status === 'unhealthy' && <><AlertCircle className="w-4 h-4 mr-1" /> Instável</>}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Database</div>
                <div className="font-semibold text-gray-900">{health.components?.database || 'unknown'}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Erros (última hora)</div>
                <div className="font-semibold text-gray-900">{health.metrics?.errors_last_hour || 0}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Integrações Ativas</div>
                <div className="font-semibold text-gray-900">{health.metrics?.active_integrations || 0}</div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Metrics */}
        {realtime && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8 opacity-80" />
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-3xl font-bold mb-1">{realtime.messages_last_hour}</div>
              <div className="text-sm opacity-90">Mensagens (última hora)</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <MessageSquare className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold mb-1">{metrics?.total_messages || 0}</div>
              <div className="text-sm opacity-90">Total de Mensagens</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold mb-1">{metrics?.avg_response_time?.toFixed(1) || 0}s</div>
              <div className="text-sm opacity-90">Tempo Médio de Resposta</div>
            </div>
          </div>
        )}

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Messages by Channel */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Mensagens por Canal
            </h2>
            <div className="space-y-3">
              {metrics?.messages_by_channel && Object.entries(metrics.messages_by_channel).map(([channel, count]) => {
                const total = Object.values(metrics.messages_by_channel).reduce((a, b) => a + b, 0);
                const percentage = (count / total * 100).toFixed(1);
                
                return (
                  <div key={channel}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">{channel}</span>
                      <span className="text-sm text-gray-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {(!metrics?.messages_by_channel || Object.keys(metrics.messages_by_channel).length === 0) && (
                <p className="text-sm text-gray-500">Nenhum dado disponível</p>
              )}
            </div>
          </div>

          {/* Top Agents */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Top Agentes
            </h2>
            <div className="space-y-3">
              {metrics?.top_agents?.map((agent, index) => (
                <div key={agent.agent_id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{agent.name}</div>
                    <div className="text-xs text-gray-500">{agent.count} mensagens</div>
                  </div>
                </div>
              ))}
              {(!metrics?.top_agents || metrics.top_agents.length === 0) && (
                <p className="text-sm text-gray-500">Nenhum dado disponível</p>
              )}
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        {rateLimits && (
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Rate Limits</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['minute', 'hour', 'day'].map(period => (
                <div key={period} className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2 capitalize">Por {period === 'minute' ? 'Minuto' : period === 'hour' ? 'Hora' : 'Dia'}</div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900">{rateLimits.usage[period]}</span>
                    <span className="text-sm text-gray-500">/ {rateLimits.limits[`per_${period}`]}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        (rateLimits.usage[period] / rateLimits.limits[`per_${period}`]) > 0.8 
                          ? 'bg-red-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${(rateLimits.usage[period] / rateLimits.limits[`per_${period}`]) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {rateLimits.remaining[period]} restantes
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitoring Logs */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Logs de Monitoramento</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map(log => (
              <div 
                key={log.id} 
                className={`p-3 rounded-lg border ${
                  log.resolved ? 'bg-gray-50 border-gray-200' :
                  log.level === 'critical' ? 'bg-red-50 border-red-200' :
                  log.level === 'error' ? 'bg-orange-50 border-orange-200' :
                  log.level === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={
                        log.level === 'critical' ? 'bg-red-600 text-white' :
                        log.level === 'error' ? 'bg-orange-600 text-white' :
                        log.level === 'warning' ? 'bg-yellow-600 text-white' :
                        'bg-blue-600 text-white'
                      }>
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">{log.source}</span>
                      {log.resolved && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolvido
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-900">{log.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  {!log.resolved && (
                    <button
                      onClick={() => resolveLog(log.id)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Nenhum log encontrado</p>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
