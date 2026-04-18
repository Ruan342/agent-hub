import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, X, Minimize2, Bot, RefreshCcw, Users, Clock, Loader2 } from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * FloatingChat
 * -------------
 * Caixa flutuante que aparece SOMENTE para usuários com o agente SDR (Bruno)
 * habilitado. Funciona como um chat: mensagens mais antigas no topo, mais
 * recentes embaixo. Quando o webhook do SDR é acionado, o retorno chega aqui
 * e o número de mensagens não-lidas aparece como badge vermelho.
 */
export default function FloatingChat() {
  const [hasSdr, setHasSdr] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [notifications, setNotifications] = useState([]); // ordered oldest -> newest
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);      // POSTing trigger
  const [processing, setProcessing] = useState(false); // waiting for webhook response

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const processingTimeoutRef = useRef(null);
  const processingSinceRef = useRef(null); // timestamp when trigger was fired

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authHeaders = useCallback(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    });
  }, []);

  // 1) Discover if the logged-in user has an active SDR subscription
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!token) {
        setChecking(false);
        setHasSdr(false);
        return;
      }
      try {
        const res = await axios.get(`${API}/sdr/has-subscription`, authHeaders());
        if (!cancelled) setHasSdr(!!res.data?.has_sdr);
      } catch (e) {
        if (!cancelled) setHasSdr(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [token, authHeaders]);

  // 2) Fetch notifications (oldest -> newest) and, if we were processing a
  //    trigger, check whether a new one arrived to remove the loading bubble.
  const fetchNotifications = useCallback(async () => {
    if (!hasSdr || !token) return;
    try {
      const res = await axios.get(`${API}/sdr/notifications?limit=50`, authHeaders());
      const items = res.data?.items || [];
      // Backend returns newest-first; reverse so newest ends up at the bottom.
      const ordered = [...items].reverse();
      setNotifications(ordered);
      setUnread(res.data?.unread ?? 0);

      // If we are waiting for the webhook, clear the spinner as soon as any
      // notification arrives dated AFTER the trigger moment.
      if (processingSinceRef.current) {
        const since = processingSinceRef.current;
        const freshest = ordered[ordered.length - 1];
        if (freshest && new Date(freshest.created_at) >= since) {
          setProcessing(false);
          processingSinceRef.current = null;
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
          }
        }
      }
    } catch (e) {
      // Silent fail: keep the UI stable even if polling hiccups
    }
  }, [hasSdr, token, authHeaders]);

  // 3) Polling cadence — faster while we wait for the webhook response
  useEffect(() => {
    if (!hasSdr) return;
    fetchNotifications();
    const interval = processing ? 2000 : 30000;
    pollRef.current = setInterval(fetchNotifications, interval);
    return () => clearInterval(pollRef.current);
  }, [hasSdr, processing, fetchNotifications]);

  // 4) Auto-scroll to bottom when notifications change, panel opens, or state flips
  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom(true);
    }
  }, [notifications, processing, isOpen, isMinimized, scrollToBottom]);

  // 5) Mark as read on open
  useEffect(() => {
    if (isOpen && !isMinimized && unread > 0) {
      axios
        .post(`${API}/sdr/notifications/mark-read`, {}, authHeaders())
        .then(() => setUnread(0))
        .catch(() => {});
    }
  }, [isOpen, isMinimized, unread, authHeaders]);

  const triggerNow = async () => {
    if (loading || processing) return;
    setLoading(true);
    processingSinceRef.current = new Date();
    setProcessing(true);
    try {
      await axios.post(`${API}/sdr/trigger-now`, {}, authHeaders());
      // Safety net: if the webhook stays silent for too long, clear the spinner
      processingTimeoutRef.current = setTimeout(() => {
        setProcessing(false);
        processingSinceRef.current = null;
      }, 90000);
      // First opportunistic refresh a bit after firing
      setTimeout(fetchNotifications, 1500);
    } catch (e) {
      setProcessing(false);
      processingSinceRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  // Hide the whole component while we're still resolving or if there is no SDR
  if (checking || !hasSdr) return null;

  // --- Floating button (closed state) ---
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110"
        aria-label="Abrir notificações do SDR"
      >
        <MessageSquare className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center animate-pulse font-bold">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    );
  }

  // --- Minimized pill ---
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg px-4 py-3 shadow-2xl flex items-center gap-3 hover:from-purple-700 hover:to-purple-800 transition-all"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium">SDR · Notificações</span>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unread}
            </span>
          )}
        </button>
      </div>
    );
  }

  // --- Open panel ---
  const formatTs = (iso) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const showEmptyState = notifications.length === 0 && !processing;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-purple-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">SDR · Bruno</h3>
            <p className="text-xs text-purple-100">Extração agendada de Leads</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            aria-label="Atualizar"
            title="Atualizar"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            aria-label="Minimizar"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feed — chat-like: oldest on top, newest at the bottom */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col">
        {showEmptyState && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
            <Clock className="w-8 h-8 mb-2 text-purple-400" />
            <p className="text-sm font-medium">Nenhuma notificação ainda.</p>
            <p className="text-xs mt-1">
              Quando o agendamento do SDR for executado, o retorno aparecerá aqui.
            </p>
          </div>
        )}

        {!showEmptyState && (
          <>
            {/* Push content to the bottom when it fits above the viewport */}
            <div className="flex-1" />
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-2xl px-4 py-3 border shadow-sm ${
                    n.read
                      ? "bg-white text-gray-700 border-gray-100"
                      : "bg-purple-50 text-gray-900 border-purple-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-purple-700 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {n.requested_quantity
                        ? `${n.requested_quantity} lead(s) solicitados`
                        : "Lead Extraction"}
                    </span>
                    <span className="text-[11px] text-gray-500">{formatTs(n.created_at)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{n.content}</p>
                  {n.webhook_status && n.webhook_status !== 200 && (
                    <p className="text-[11px] text-red-500 mt-1">
                      Status webhook: {n.webhook_status}
                    </p>
                  )}
                </div>
              ))}

              {/* Processing bubble (aparece enquanto aguardamos o retorno do webhook) */}
              {processing && (
                <div className="rounded-2xl px-4 py-3 border bg-white text-gray-700 border-purple-100 shadow-sm flex items-center gap-3 animate-in fade-in duration-200">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-purple-700">
                      Processando solicitação
                    </p>
                    <p className="text-sm">
                      Estamos processando sua solicitação, aguarde um momento…
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer: manual trigger (útil para testes) */}
      <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-500 font-medium">
          Agendamento configurado em <b>Minhas Assinaturas → SDR → Regras (Base)</b>.
        </p>
        <button
          onClick={triggerNow}
          disabled={loading || processing}
          className="text-xs font-bold bg-coreblue text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
          title="Disparar agora (teste)"
        >
          {(loading || processing) && <Loader2 className="w-3 h-3 animate-spin" />}
          {loading ? "Disparando..." : processing ? "Processando..." : "Testar agora"}
        </button>
      </div>
    </div>
  );
}
