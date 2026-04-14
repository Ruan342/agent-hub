import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────
const T = {
  navy: "#0A0A0F", blue: "#2563EB", blueL: "#3B82F6",
  green: "#059669", greenL: "#10B981",
  amber: "#D97706", purple: "#7C3AED",
  paper: "#F8F7F3", white: "#FFFFFF",
  mid: "#6B7280", line: "rgba(10,10,15,0.09)",
};

// ── SVG ICON ───────────────────────────────────────────────────────────────
const I = ({ d, size = 16, color = "currentColor", sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const IC = {
  check: "M20 6L9 17l-5-5",
  arrow: "M5 12h14M12 5l7 7-7 7",
  chev:  "M6 9l6 6 6-6",
  zap:   "M13 2L3 14h9l-1 10 10-12h-9l1-10Z",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  cpu:   "M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2ZM9 9h6v6H9z",
  chart: "M18 20V10M12 20V4M6 20v-6",
  layers:"M12 2L2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5",
  mic:   "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z",
  mail:  "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2ZM22 6l-10 7L2 6",
  db:    "M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2ZM2 12c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5M2 6.5c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5",
  target:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  cart:  "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0",
  play:  "M5 3l14 9-14 9V3Z",
  link:  "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
};

// ── ATOM COMPONENTS ────────────────────────────────────────────────────────
const Badge = ({ c, bg, children }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:6,
    padding:"5px 12px", borderRadius:40, fontSize:11, fontWeight:700,
    letterSpacing:"0.08em", textTransform:"uppercase",
    background: bg || `${c}18`, color: c, border:`1px solid ${c}30` }}>
    {children}
  </span>
);

const Pill = ({ children, color = T.blue }) => (
  <span style={{ fontSize:11, padding:"3px 9px", borderRadius:20,
    background:`${color}12`, color, border:`1px solid ${color}25`, fontWeight:500 }}>
    {children}
  </span>
);

const Btn = ({ children, variant = "primary", color = T.blue, onClick, full }) => {
  const styles = {
    primary: { background:color, color:"#fff", border:"none" },
    ghost:   { background:"rgba(255,255,255,0.07)", color:"#fff", border:"1px solid rgba(255,255,255,0.15)" },
    outline: { background:"transparent", color, border:`1.5px solid ${color}` },
    dark:    { background:T.navy, color:"#fff", border:"none" },
  };
  return (
    <button onClick={onClick} style={{
      ...styles[variant], padding:"13px 28px", borderRadius:50,
      fontSize:14, fontWeight:700, cursor:"pointer", display:"inline-flex",
      alignItems:"center", gap:8, width: full ? "100%" : "auto", justifyContent:"center",
      transition:"all .2s",
    }}>{children}</button>
  );
};

// ── ECOSYSTEM DATA ─────────────────────────────────────────────────────────
const ECO = [
  {
    id:"corefy", name:"CorefyIT", role:"Holding Europeia · Fundação",
    color:T.mid, status:"live", statusLabel:"20+ anos",
    tagline:"A fundação que garante tudo.",
    desc:"Holding com sede em Portugal, presença operacional em 5 continentes. Infraestrutura de data center enterprise. Compliance GDPR, LGPD, SOC2 e ISO 27001 nativo em todos os produtos. Não somos uma startup — somos a instituição por trás de cada produto deste ecossistema.",
    chips:["Portugal · Sede Europeia","América do Sul","Emirados Árabes","Estados Unidos","Ásia","Data Center Grade AA"],
  },
  {
    id:"smartleads", name:"SmartLeads", role:"Automação Total de Vendas",
    color:T.green, status:"live", statusLabel:"Rodando",
    tagline:"Três agentes. Uma força de vendas autônoma.",
    desc:"SDR prospecta leads qualificados em 7 plataformas via Apify. Agente de Voz clona sua identidade sonora e faz até 2.000 ligações por dia. Closer envia propostas, contratos e fecha negócios automaticamente. 12 filtros inteligentes. Disponível nos 5 continentes.",
    chips:["SDR Agent — 7 plataformas","Voice Agent — 2.000 calls/dia","Closer Agent — fecha sozinho","12 Filtros IA","HubSpot · Salesforce · Pipedrive","Apify Data Intelligence"],
    stats:[{v:"2.000",l:"ligações/dia"},{v:"7",l:"plataformas"},{v:"12",l:"filtros IA"}],
  },
  {
    id:"myhub", name:"My Hub IA", role:"Plataforma Multi-IA · Per Seat B2B",
    color:T.purple, status:"launch", statusLabel:"Lançando",
    tagline:"Toda a inteligência do mundo. Uma assinatura.",
    desc:"Claude, GPT-4o, Gemini, Llama e 10+ modelos em uma plataforma única. Preço por seat que faz sentido para equipes — sem conta individual por colaborador. Diferencial exclusivo: chat em grupo com IA, que nenhum concorrente oferece para B2B.",
    chips:["Claude · GPT-4o · Gemini · Llama","Chat em Grupo (exclusivo)","Preço/Seat Acessível B2B","10+ Modelos","API Unificada","White-label disponível"],
  },
  {
    id:"coreagents", name:"Core Agents IA", role:"17 Agentes Especializados · 4 Tiers",
    color:T.blue, status:"launch", statusLabel:"Lançando",
    tagline:"17 agentes. Do freelancer à multinacional.",
    desc:"Do atendimento 24/7 que responde em 5 segundos ao agente contábil integrado ao Protheus com anti-alucinação garantido. 4 tiers — Small Business, E-Commerce, Business e Enterprise. Setup em dias, não meses. A extensão invisível da sua equipe.",
    chips:["Small Business · Freelancers","E-Commerce · Lojas Online","Business · PMEs 10–200","Enterprise · ERP Integrado","LGPD · RGPD · SOC2","Protheus · SAP · Oracle · Salesforce"],
  },
];

// ── AGENT TIERS ────────────────────────────────────────────────────────────
const TIERS = [
  {
    id:"small", label:"Small Business", color:T.mid,
    target:"Freelancers, consultores, profissionais liberais, MEIs",
    tagline:"Automatize o que te distrai. Foque no que te paga.",
    modules:["Smart Inbox — triagem e respostas sugeridas por IA",
      "Lead Capture — formulários inteligentes com scoring automático",
      "Calendar AI — agendamento, follow-ups, sincronização multi-plataforma",
      "Task Automator — workflows if/then, templates pré-configurados",
      "Micro CRM — pipeline visual, histórico completo, tags automáticas",
      "Content Assistant — copies para social, emails, propostas rápidas",
      "Financial Snapshot — faturamento, alertas de cobrança, previsão",
      "Analytics Lite — métricas essenciais, relatórios semanais automáticos"],
    limits:"500 contatos · 1 usuário · 3 automações · 1.000 interações IA/mês",
    price:{br:"R$797",eu:"€297",us:"$347",ae:"$397"},
    setup:{br:"R$997",eu:"€497",us:"$597",ae:"$697"},
    result:"4h/semana devolvidas para trabalho estratégico",
  },
  {
    id:"ecom", label:"E-Commerce", color:T.blue,
    target:"Lojas online, D2C brands, marketplaces sellers, dropshippers",
    tagline:"Escale sem escalar custos. A IA que gerencia sua loja.",
    modules:["Product Intelligence — precificação dinâmica, detecção de tendências",
      "Customer Journey AI — segmentação preditiva, triggers automáticos",
      "Cart Recovery — recuperação multi-canal (email, SMS, WhatsApp) por IA",
      "Review & Reputation — respostas automáticas contextuais, sentiment analysis",
      "Inventory Predictor — previsão de estoque, alertas de ruptura",
      "Dynamic Pricing — motor de preço por competidores, demanda e margem",
      "Multi-Channel Sync — catálogo, preços e estoque em múltiplos canais",
      "Shipping Intelligence — roteirização, frete otimizado, tracking proativo",
      "Support AI — chatbot treinado no catálogo, FAQ dinâmica"],
    limits:"10.000 SKUs · 3 usuários · 15 automações · 10.000 interações/mês",
    integrations:["Shopify","WooCommerce","VTEX","Mercado Livre","Amazon Seller","Magento"],
    price:{br:"R$1.897",eu:"€697",us:"$797",ae:"$897"},
    setup:{br:"R$2.497",eu:"€997",us:"$1.197",ae:"$1.497"},
    result:"-30% abandono de carrinho · +240% respostas com personalização IA",
  },
  {
    id:"biz", label:"Business", color:T.blue, popular:true,
    target:"PMEs em crescimento, scale-ups, empresas com 10–200 colaboradores",
    tagline:"IA como braço operacional. Do pipeline ao RH.",
    salesNote:"Inclui Sales Module Light: SDR básico com 200 leads/mês, sem chamadas de voz. Para escala total → SmartLeads.",
    modules:["Sales Intelligence — pipeline preditivo, lead scoring avançado, forecasting + SDR Light (200 leads/mês)",
      "Marketing Orchestrator — campanhas multi-canal, audience builder, attribution",
      "HR & People AI — triagem CVs, onboarding, pulse surveys, analytics",
      "Finance Controller — fluxo de caixa preditivo, conciliação automática",
      "Operations Hub — gestão de processos, SLA tracking, bottleneck detection",
      "Client Success Engine — churn prediction, health score, playbooks automáticos",
      "Document Intelligence — OCR avançado, extração de contratos",
      "Meeting AI — transcrição, action items, sumários, follow-up scheduling",
      "Knowledge Base AI — busca semântica, sugestões contextuais",
      "Competitive Radar — monitoramento de concorrentes, alertas de mercado",
      "Integration Hub — API aberta, webhooks, 50+ conectores nativos",
      "Advanced Analytics — dashboards, relatórios executivos, data storytelling"],
    limits:"50.000 contatos · 25 usuários · Automações ilimitadas · 100.000 interações/mês",
    price:{br:"R$3.997",eu:"€1.497",us:"$1.747",ae:"$1.897"},
    setup:{br:"R$5.997",eu:"€2.497",us:"$2.997",ae:"$3.497"},
    result:"3× mais receita com modelos IA + humanos (McKinsey 2024)",
  },
  {
    id:"ent", label:"Enterprise", color:T.purple,
    target:"Grandes corporações, multinacionais, financeiras, infraestrutura",
    tagline:"Transformação digital governada. IA em escala com compliance total.",
    modules:["AI Governance Suite — políticas, audit trails, bias detection",
      "Multi-Tenant — ambientes isolados por divisão/país, permissões granulares",
      "Custom AI Models — fine-tuning dedicado, treinamento com dados proprietários",
      "Enterprise Security — SSO/SAML, DLP, encryption, GDPR/LGPD/SOC2/ISO27001",
      "Global Operations Center — dashboard unificado multi-unidade, KPIs real-time",
      "Supply Chain AI — demand planning, risk assessment, otimização",
      "Advanced NLP Engine — multi-idioma, sentiment em escala, entity extraction",
      "Predictive Analytics Pro — ML pipelines, anomaly detection, scenario planning",
      "White-Label — plataforma com branding do cliente, subdomain dedicado",
      "Dedicated Infrastructure — SLA 99.99%, disaster recovery, região escolhível",
      "Strategic AI Consulting — AI strategists dedicados, QBRs, roadmap co-criado",
      "API Enterprise — rate limits elevados, batch, streaming, webhooks prioritários"],
    limits:"Contatos ilimitados · Usuários ilimitados · SLA customizado · Suporte 15min",
    erp:["Protheus (TOTVS)","SAP S/4HANA","Oracle Cloud","Salesforce","ServiceNow","Microsoft Dynamics","Workday","SAP Ariba"],
    price:{br:"A partir de R$12.997",eu:"A partir de €4.997",us:"A partir de $5.997",ae:"A partir de $6.997"},
    setup:{br:"Sob consulta",eu:"Sob consulta",us:"Sob consulta",ae:"Sob consulta"},
    result:"-68% erros contábeis · R$2,3M economizados em 12 meses (case real)",
  },
];

// ── PRICING REGIONS ────────────────────────────────────────────────────────
const REGIONS = [
  { id:"br", label:"🇧🇷 Brasil", note:"Preços em BRL · Ajuste PPP -35%" },
  { id:"eu", label:"🇪🇺 Europa", note:"Preços em EUR · Base de referência" },
  { id:"us", label:"🇺🇸 Estados Unidos", note:"Preços em USD · +15% premium" },
  { id:"ae", label:"🇦🇪 Emirados", note:"Preços em USD · +25% premium" },
];

// ── WAVE DATA ──────────────────────────────────────────────────────────────
const WAVES = [
  { wave:1, color:T.green, label:"Wave 1 · Disponível agora",
    agents:[
      { name:"SDR de IA / Vendedor Outbound", promise:"Gera e qualifica leads automaticamente, agenda reuniões e alimenta seu funil sem precisar de time de pré-venda.", tier:"Business" },
      { name:"E-Commerce Manager", promise:"Atende clientes, recomenda produtos, acompanha pedidos e ajuda a escoar estoque parado.", tier:"E-Commerce" },
      { name:"Suporte Técnico + Knowledge Base", promise:"Resolve dúvidas de clientes puxando respostas da base de conhecimento e só envia o que é realmente complexo para humanos.", tier:"Business" },
      { name:"Pós-venda & Retenção", promise:"Faz follow-up, pede feedback, estimula renovação e upsell automaticamente com base no histórico do cliente.", tier:"Business" },
      { name:"Lidia Prospecção", promise:"Agente de vendas que prospecta, apresenta produtos, envia links de agendamento e fecha negócios com links de pagamento direto.", tier:"Business" },
    ]},
  { wave:2, color:T.amber, label:"Wave 2 · Em desenvolvimento",
    agents:[
      { name:"Secretária 24/7 + Agenda Cheia", promise:"Atende WhatsApp, site e Instagram 24h, responde dúvidas e coloca o cliente direto na sua agenda.", tier:"Small Business" },
      { name:"Executive Assistant / Chief of Staff", promise:"Organiza email, agenda, tarefas e follow-ups como um braço direito digital para empreendedores e diretores.", tier:"Business" },
      { name:"Assistente Financeiro + Cobrança", promise:"Organiza gastos e receitas, cria alertas de vencimento, lembra cobranças e envia links de pagamento.", tier:"Business" },
      { name:"Inteligência de Marca & Mercado", promise:"Monitora redes, reviews e concorrentes e entrega insights prontos para decisão e marketing.", tier:"Business" },
    ]},
  { wave:3, color:T.mid, label:"Wave 3 · Roadmap",
    agents:[
      { name:"Terapeuta 24h / Bem-estar Emocional", promise:"Oferece apoio emocional, exercícios de respiração, reflexão guiada. Posicionado como bem-estar, não como substituto de terapia.", tier:"Small Business" },
      { name:"Concierge Pousada / Hotel / Glamping", promise:"Atende hóspedes 24h com informações de check-in, passeios e dúvidas, reduzindo carga do staff.", tier:"Business" },
      { name:"Assistente de Advogado", promise:"Triagem de casos, orienta documentos, agenda com o advogado — sempre com disclaimers legais.", tier:"Business" },
      { name:"Agente de RH / Recrutamento Inicial", promise:"Recebe candidatos, faz perguntas filtro, organiza CVs e agenda entrevistas com o RH.", tier:"Business" },
    ]},
];

// ── ONBOARDING DATA ────────────────────────────────────────────────────────
const ONBOARDING = [
  { tier:"Small Business", sessions:5, sla:"2 horas", csm:"Shared" },
  { tier:"E-Commerce",     sessions:8, sla:"2 horas", csm:"Shared" },
  { tier:"Business",       sessions:10, sla:"1 hora",  csm:"Dedicado" },
  { tier:"Enterprise",     sessions:"Ilimitadas", sla:"15 minutos", csm:"Dedicado Sênior" },
];

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function CorefyEcosystem() {
  const navigate = useNavigate();
  const [ecoOpen, setEcoOpen] = useState("smartleads");
  const [activeTier, setActiveTier] = useState("biz");
  const [region, setRegion] = useState("br");
  const [billing, setBilling] = useState("annual");
  const [agentTab, setAgentTab] = useState(0);

  const tier = TIERS.find(t => t.id === activeTier);
  const reg  = REGIONS.find(r => r.id === region);

  // Se o usuario ja tem sessao, vai direto pro dashboard
  const goToPlatform = () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (token && user.email) {
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } else {
      navigate("/login");
    }
  };

  const s = {
    wrap: { fontFamily:"'Inter', sans-serif", background:T.paper, color:T.navy },
    cont: { maxWidth:1100, margin:"0 auto", padding:"0 24px" },
    sec:  { padding:"88px 0" },
    h1:   { fontFamily:"'Inter', sans-serif", fontSize:"clamp(36px,5.5vw,68px)", fontWeight:800, lineHeight:1.0, letterSpacing:"-1.5px" },
    h2:   { fontFamily:"'Inter', sans-serif", fontSize:"clamp(26px,4vw,48px)", fontWeight:800, lineHeight:1.05, letterSpacing:"-1px" },
    h3:   { fontFamily:"'Inter', sans-serif", fontSize:22, fontWeight:700, letterSpacing:"-0.3px" },
    sub:  { fontSize:17, color:T.mid, lineHeight:1.7, fontWeight:400 },
    card: { background:T.white, border:`1px solid ${T.line}`, borderRadius:14, padding:24 },
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={s.wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>

      {/* ── NAV ── */}
      <nav style={{ background:"rgba(248,247,243,0.92)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${T.line}`, padding:"15px 0", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ ...s.cont, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <svg style={{ flexShrink: 0 }} width="30" height="30" viewBox="0 0 52 52" fill="none">
              <rect width="52" height="52" rx="12" fill={T.navy}/>
              <path d="M13 16L26 37L39 16" stroke={T.blueL} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="26" cy="37" r="3.5" fill={T.blueL}/>
              <circle cx="13" cy="16" r="2.5" fill={`${T.blueL}50`}/>
              <circle cx="39" cy="16" r="2.5" fill={`${T.blueL}50`}/>
            </svg>
            <div>
              <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:17, letterSpacing:"-0.3px" }}>Core Agents IA</div>
              <div style={{ fontSize:10, color:T.mid, letterSpacing:"2px", textTransform:"uppercase" }}>by CorefyIT</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:24, alignItems:"center" }}>
            <span onClick={goToPlatform} style={{ fontSize:13, color:T.navy, cursor:"pointer", fontWeight:700 }}>Ecossistema</span>
            <span onClick={() => scrollToSection("agentes")} style={{ fontSize:13, color:T.mid, cursor:"pointer", fontWeight:500 }}>Agentes</span>
            <span onClick={() => scrollToSection("precos")} style={{ fontSize:13, color:T.mid, cursor:"pointer", fontWeight:500 }}>Preços</span>
            <span style={{ fontSize:13, color:T.mid, cursor:"default", fontWeight:500, opacity:0.5 }}>SmartLeads</span>
            <span style={{ fontSize:13, color:T.mid, cursor:"default", fontWeight:500, opacity:0.5 }}>My Hub IA</span>
            <Btn variant="dark" onClick={goToPlatform}>Agendar demo</Btn>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ background:T.navy, padding:"100px 0 80px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 60% 60% at 65% 50%, ${T.blue}12 0%, transparent 70%)` }}/>
        <div style={{ ...s.cont, position:"relative" }}>
          <div style={{ marginBottom:24 }}>
            <Badge c={T.green}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:T.green, display:"inline-block" }}/>
              CorefyIT · Holding Europeia · 5 Continentes
            </Badge>
          </div>
          <h1 style={{ ...s.h1, color:"#fff", maxWidth:820, marginBottom:24 }}>
            O ecossistema de IA<br/>
            <span style={{ color:T.blueL }}>mais completo do mundo.</span><br/>
            <span style={{ color:"rgba(255,255,255,0.35)" }}>Para qualquer empresa.</span>
          </h1>
          <p style={{ fontSize:19, color:"rgba(255,255,255,0.45)", maxWidth:600, lineHeight:1.7, fontWeight:300, marginBottom:40 }}>
            Controlado pela CorefyIT — holding europeia com sede em Portugal e 20+ anos de operação global — não seguimos tendências. Nós as definimos.
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <Btn color={T.blue} onClick={goToPlatform}>Explorar o ecossistema <I d={IC.arrow} size={16} color="#fff"/></Btn>
            <Btn variant="ghost"><I d={IC.play} size={15} color="#fff"/> Ver demonstração</Btn>
          </div>
          <div style={{ display:"flex", gap:48, marginTop:60, paddingTop:40, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
            {[{v:"20+",l:"anos no mercado"},{v:"5",l:"continentes"},{v:"17",l:"agentes especializados"},{v:"LGPD+",l:"compliance nativo"}].map((st,i)=>(
              <div key={i}>
                <div style={{ fontFamily:"'Inter', sans-serif", fontSize:28, fontWeight:800, color:"#fff", letterSpacing:"-1px" }}>{st.v}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{st.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ECOSSISTEMA ── */}
      <div style={{ background:T.paper, ...s.sec }}>
        <div style={s.cont}>
          <div style={{ marginBottom:16 }}><Badge c={T.navy} bg={`${T.navy}08`}>CorefyIT Ecosystem</Badge></div>
          <h2 style={{ ...s.h2, marginBottom:12 }}>Quatro produtos.<br/>Um ecossistema que não para.</h2>
          <p style={{ ...s.sub, maxWidth:600, marginBottom:16 }}>
            Cada produto gera valor para o próximo. Não vendemos software — entregamos vantagem competitiva permanente.
          </p>
          <p style={{ fontSize:14, color:T.mid, marginBottom:48, fontStyle:"italic" }}>
            SmartLeads prospecta → Core Agents IA opera → My Hub IA capacita equipes → CorefyIT garante tudo → mais cases → mais clientes
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {ECO.map(eco=>(
              <div key={eco.id} onClick={()=>setEcoOpen(ecoOpen===eco.id?null:eco.id)}
                style={{ background:ecoOpen===eco.id?T.white:"transparent",
                  border:`1.5px solid ${ecoOpen===eco.id?eco.color:T.line}`,
                  borderRadius:16, padding:"24px 24px 20px", cursor:"pointer", transition:"all .2s",
                  boxShadow:ecoOpen===eco.id?"0 4px 24px rgba(0,0,0,0.07)":"none" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ fontFamily:"'Inter', sans-serif", fontSize:19, fontWeight:800 }}>{eco.name}</span>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, letterSpacing:"0.05em", textTransform:"uppercase",
                        background:eco.status==="live"?`${T.green}15`:`${T.amber}15`,
                        color:eco.status==="live"?T.green:T.amber, border:`1px solid ${eco.status==="live"?T.green:T.amber}30` }}>
                        {eco.statusLabel}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:T.mid, letterSpacing:"1.5px", textTransform:"uppercase", fontWeight:600 }}>{eco.role}</div>
                  </div>
                  <I d={IC.chev} size={16} color={T.mid}/>
                </div>
                <p style={{ fontSize:15, fontFamily:"'Inter', sans-serif", fontWeight:700, color:eco.color, marginBottom:8, lineHeight:1.3 }}>{eco.tagline}</p>
                {ecoOpen===eco.id&&(
                  <>
                    <p style={{ fontSize:14, color:"#555", lineHeight:1.65, marginBottom:14 }}>{eco.desc}</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom: eco.stats?14:0 }}>
                      {eco.chips.map(c=><Pill key={c} color={eco.color}>{c}</Pill>)}
                    </div>
                    {eco.stats&&(
                      <div style={{ display:"flex", gap:28, paddingTop:14, borderTop:`1px solid ${T.line}` }}>
                        {eco.stats.map((st,i)=>(
                          <div key={i}>
                            <div style={{ fontFamily:"'Inter', sans-serif", fontSize:22, fontWeight:800, color:eco.color }}>{st.v}</div>
                            <div style={{ fontSize:11, color:T.mid }}>{st.l}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Institutional copy */}
          <div style={{ background:T.navy, borderRadius:20, padding:"40px 48px", marginTop:32 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:12 }}>Por trás de tudo</div>
            <p style={{ fontSize:17, color:"rgba(255,255,255,0.75)", lineHeight:1.8, fontWeight:300, maxWidth:780, margin:0 }}>
              "Controlada pela CorefyIT — holding europeia com sede em Portugal e presença operacional em cinco continentes — a nossa plataforma não segue tendências: ela as define. Com mais de duas décadas de atuação global, construímos o único ecossistema de inteligência artificial projetado para empresas que não têm tempo para experiências."
            </p>
            <div style={{ display:"flex", gap:32, marginTop:28, paddingTop:24, borderTop:"1px solid rgba(255,255,255,0.08)" }}>
              {[{v:"🇵🇹",l:"Portugal · Sede"},{v:"🇧🇷",l:"Brasil"},{v:"🇦🇪",l:"Emirados"},{v:"🇺🇸",l:"EUA"},{v:"🌏",l:"Ásia"}].map((r,i)=>(
                <div key={i} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:22 }}>{r.v}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>{r.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CORE AGENTS TIERS ── */}
      <div id="agentes" style={{ background:T.white, ...s.sec }}>
        <div style={s.cont}>
          <div style={{ marginBottom:16 }}><Badge c={T.blue}>Core Agents IA — 4 Tiers</Badge></div>
          <h2 style={{ ...s.h2, marginBottom:12 }}>Um agente para<br/>cada etapa do seu crescimento.</h2>
          <p style={{ ...s.sub, maxWidth:560, marginBottom:40 }}>Do freelancer que precisa de mais tempo ao CFO que precisa de compliance — o tier certo para cada realidade.</p>

          {/* Tier tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:32, flexWrap:"wrap" }}>
            {TIERS.map(t=>(
              <button key={t.id} onClick={()=>setActiveTier(t.id)} style={{
                padding:"9px 20px", borderRadius:50, border:`1.5px solid ${activeTier===t.id?t.color:T.line}`,
                background:activeTier===t.id?`${t.color}10`:"transparent",
                color:activeTier===t.id?t.color:T.mid, fontSize:13, fontWeight:600, cursor:"pointer",
                display:"flex", alignItems:"center", gap:6,
              }}>
                {t.label}
                {t.popular&&<span style={{ fontSize:10, background:T.blue, color:"#fff", padding:"1px 6px", borderRadius:10, letterSpacing:"0.5px" }}>popular</span>}
              </button>
            ))}
          </div>

          {tier&&(
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:24 }}>
              {/* Left: info */}
              <div>
                <div style={{ fontSize:13, color:tier.color, fontWeight:600, letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>{tier.label}</div>
                <h3 style={{ ...s.h3, marginBottom:8 }}>{tier.tagline}</h3>
                <p style={{ fontSize:14, color:"#555", marginBottom:16, lineHeight:1.6 }}>{tier.target}</p>
                {tier.salesNote&&(
                  <div style={{ background:`${T.green}08`, border:`1px solid ${T.green}25`, borderRadius:10, padding:14, marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.green, letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Sales Module Light incluído</div>
                    <p style={{ fontSize:13, color:"#555", margin:0, lineHeight:1.5 }}>{tier.salesNote}</p>
                  </div>
                )}
                <div style={{ fontSize:12, color:T.mid, padding:"10px 14px", background:T.paper, borderRadius:8, marginBottom:20 }}>{tier.limits}</div>
                <div style={{ fontSize:12, fontWeight:600, color:T.green, display:"flex", alignItems:"center", gap:6 }}>
                  <I d={IC.zap} size={13} color={T.green}/> {tier.result}
                </div>
                {tier.erp&&(
                  <div style={{ marginTop:20 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.mid, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:8 }}>Integrações ERP certificadas</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {tier.erp.map(e=><Pill key={e} color={T.blue}>{e}</Pill>)}
                    </div>
                  </div>
                )}
                {tier.integrations&&(
                  <div style={{ marginTop:20 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.mid, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:8 }}>Plataformas nativas</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {tier.integrations.map(e=><Pill key={e} color={T.blue}>{e}</Pill>)}
                    </div>
                  </div>
                )}
              </div>
              {/* Right: modules */}
              <div style={{ background:T.paper, borderRadius:14, padding:24 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.mid, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:16 }}>Módulos incluídos</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {tier.modules.map((m,i)=>(
                    <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", fontSize:13, color:"#444", lineHeight:1.5 }}>
                      <I d={IC.check} size={13} color={tier.color} sw={2}/>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── WAVES ── */}
      <div style={{ background:T.paper, ...s.sec }}>
        <div style={s.cont}>
          <div style={{ marginBottom:16 }}><Badge c={T.amber} bg={`${T.amber}12`}>Roadmap de Agentes</Badge></div>
          <h2 style={{ ...s.h2, marginBottom:12 }}>17 agentes. Lançando em ondas.</h2>
          <p style={{ ...s.sub, maxWidth:560, marginBottom:40 }}>Wave 1 disponível agora. Waves 2 e 3 em desenvolvimento com previsão de lançamento nos próximos trimestres.</p>

          {/* Wave tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:28 }}>
            {WAVES.map((w,i)=>(
              <button key={i} onClick={()=>setAgentTab(i)} style={{
                padding:"8px 20px", borderRadius:50, border:`1px solid ${agentTab===i?w.color:T.line}`,
                background:agentTab===i?`${w.color}12`:"transparent",
                color:agentTab===i?w.color:T.mid, fontSize:12, fontWeight:700, cursor:"pointer",
              }}>{w.label}</button>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px,1fr))", gap:16 }}>
            {WAVES[agentTab].agents.map((a,i)=>(
              <div key={i} style={{ ...s.card, borderTop:`3px solid ${WAVES[agentTab].color}` }}>
                <div style={{ fontSize:11, color:WAVES[agentTab].color, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>{a.tier}</div>
                <h4 style={{ fontFamily:"'Inter', sans-serif", fontSize:15, fontWeight:700, marginBottom:8 }}>{a.name}</h4>
                <p style={{ fontSize:13, color:"#555", lineHeight:1.6, margin:0 }}>{a.promise}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PRICING ── */}
      <div id="precos" style={{ background:T.white, ...s.sec }}>
        <div style={s.cont}>
          <div style={{ marginBottom:16 }}><Badge c={T.green}>Preços Globais</Badge></div>
          <h2 style={{ ...s.h2, marginBottom:8 }}>Preço que faz sentido<br/>em qualquer continente.</h2>
          <p style={{ ...s.sub, maxWidth:560, marginBottom:36 }}>Value-Based Pricing com ajuste por PPP. Todos os planos incluem onboarding live e suporte premium humano.</p>

          {/* Region + billing selectors */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:32, alignItems:"center" }}>
            <div style={{ display:"flex", gap:4, background:T.paper, borderRadius:50, padding:4 }}>
              {REGIONS.map(r=>(
                <button key={r.id} onClick={()=>setRegion(r.id)} style={{
                  padding:"8px 16px", borderRadius:40, border:"none", cursor:"pointer",
                  fontSize:13, fontWeight:600, transition:"all .2s",
                  background:region===r.id?T.navy:"transparent",
                  color:region===r.id?"#fff":T.mid,
                }}>{r.label}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:4, background:T.paper, borderRadius:50, padding:4 }}>
              {[["annual","Anual (20% off)"],["monthly","Mensal"]].map(([k,l])=>(
                <button key={k} onClick={()=>setBilling(k)} style={{
                  padding:"8px 16px", borderRadius:40, border:"none", cursor:"pointer",
                  fontSize:13, fontWeight:600, transition:"all .2s",
                  background:billing===k?T.blue:"transparent",
                  color:billing===k?"#fff":T.mid,
                }}>{l}</button>
              ))}
            </div>
            {reg&&<span style={{ fontSize:12, color:T.mid }}>{reg.note}</span>}
          </div>

          {/* Pricing cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:16 }}>
            {TIERS.map(t=>{
              const price = t.price[region];
              const setup = t.setup[region];
              return (
                <div key={t.id} style={{
                  ...s.card, position:"relative",
                  border:`${t.popular?"2px":"1px"} solid ${t.popular?T.blue:T.line}`,
                  borderTop:`3px solid ${t.popular?T.blue:t.color}`,
                }}>
                  {t.popular&&(
                    <div style={{ position:"absolute", top:-13, left:"50%", transform:"translateX(-50%)", background:T.blue, color:"#fff", fontSize:10, fontWeight:700, padding:"3px 12px", borderRadius:20, letterSpacing:"0.05em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                      Mais vendido
                    </div>
                  )}
                  <div style={{ fontFamily:"'Inter', sans-serif", fontSize:18, fontWeight:800, marginBottom:4, marginTop:t.popular?8:0 }}>{t.label}</div>
                  <div style={{ fontSize:22, fontWeight:800, fontFamily:"'Inter', sans-serif", color:t.popular?T.blue:T.navy, letterSpacing:"-0.5px", margin:"12px 0 4px" }}>{price}<span style={{ fontSize:14, fontWeight:400, color:T.mid }}>/mês</span></div>
                  {billing==="annual"&&<div style={{ fontSize:11, color:T.green, fontWeight:600, marginBottom:4 }}>20% off — faturado anualmente</div>}
                  <div style={{ fontSize:12, color:T.mid, marginBottom:16 }}>Setup: {setup}</div>
                  <Btn variant={t.popular?"primary":"outline"} color={t.color} full onClick={goToPlatform}>
                    {t.id==="ent"?"Falar com especialista":"Começar agora"}
                  </Btn>
                </div>
              );
            })}
          </div>

          {/* What's included */}
          <div style={{ marginTop:32, ...s.card, background:T.paper }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:T.mid, marginBottom:16 }}>O que todos os planos incluem — justificativa do preço premium</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
              {[
                { icon:IC.play,   title:"Full Onboarding Live",  desc:"Sessões 1:1 com especialista. 5 sessões (Small) até ilimitadas (Enterprise)." },
                { icon:IC.shield, title:"Suporte Premium Humano", desc:"SLA de 2h (Small), 1h (Business), 15min (Enterprise). Pessoas reais, não bots." },
                { icon:IC.users,  title:"Customer Success Manager", desc:"Shared nos planos base. Dedicado a partir do Business." },
                { icon:IC.link,   title:"Atualizações Contínuas", desc:"Novos módulos sem custo adicional durante toda a vigência." },
                { icon:IC.db,     title:"Migration Assistance",  desc:"Importação de dados de CRMs anteriores sem custo extra." },
              ].map((inc,i)=>(
                <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${T.blue}10`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <I d={inc.icon} size={16} color={T.blue}/>
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>{inc.title}</div>
                    <div style={{ fontSize:12, color:T.mid, lineHeight:1.5 }}>{inc.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ONBOARDING TABLE ── */}
      <div style={{ background:T.navy, padding:"72px 0" }}>
        <div style={s.cont}>
          <div style={{ marginBottom:16 }}><Badge c={T.greenL} bg={`${T.green}20`}>Qualidade de Serviço</Badge></div>
          <h2 style={{ ...s.h2, color:"#fff", marginBottom:8 }}>Onboarding live.<br/>Suporte humano real.</h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,0.45)", maxWidth:560, marginBottom:40 }}>
            Não existe suporte por bot aqui. Cada cliente tem SLA garantido, onboarding com especialista e — a partir do Business — um Customer Success Manager dedicado.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
            {ONBOARDING.map((o,i)=>(
              <div key={i} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:24 }}>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:12 }}>{o.tier}</div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:2 }}>Sessões de onboarding</div>
                  <div style={{ fontFamily:"'Inter', sans-serif", fontSize:20, fontWeight:800, color:"#fff" }}>{o.sessions}</div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:2 }}>SLA de resposta</div>
                  <div style={{ fontFamily:"'Inter', sans-serif", fontSize:20, fontWeight:800, color:T.greenL }}>{o.sla}</div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:2 }}>Customer Success</div>
                  <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>{o.csm}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <div style={{ background:T.white, ...s.sec }}>
        <div style={{ ...s.cont, textAlign:"center" }}>
          <h2 style={{ ...s.h2, maxWidth:700, margin:"0 auto 12px" }}>Seus concorrentes já estão usando IA.<br/><span style={{ color:T.blue }}>A pergunta é qual.</span></h2>
          <p style={{ fontSize:16, color:T.mid, maxWidth:520, margin:"0 auto 40px", lineHeight:1.7 }}>
            Diagnostic gratuito de 45 minutos com um especialista. Mapeamos oportunidades reais na sua operação — sem compromisso.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Btn color={T.blue} onClick={goToPlatform}>Agendar diagnóstico gratuito <I d={IC.arrow} size={16} color="#fff"/></Btn>
            <Btn variant="outline" color={T.navy}>Ver demonstração</Btn>
          </div>
          <div style={{ display:"flex", gap:32, justifyContent:"center", marginTop:32, flexWrap:"wrap" }}>
            {["Setup em 24h","Onboarding ao vivo","Suporte premium humano","Cancele quando quiser"].map(t=>(
              <span key={t} style={{ fontSize:13, color:T.mid, display:"flex", alignItems:"center", gap:6 }}>
                <I d={IC.check} size={14} color={T.green}/> {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background:"#07070C", padding:"56px 0" }}>
        <div style={{ ...s.cont, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:32 }}>
          <div style={{ maxWidth:280 }}>
            <div style={{ fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:18, color:"#fff", marginBottom:6 }}>Core Agents IA</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.2)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:12 }}>by CorefyIT Group</div>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.3)", lineHeight:1.6, margin:0 }}>Holding europeia com sede em Portugal. Presença operacional em 5 continentes. 20+ anos de mercado.</p>
          </div>
          <div style={{ display:"flex", gap:48 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:12 }}>Produtos</div>
              {["SmartLeads","My Hub IA","Core Agents IA","CorefyIT"].map(p=>(
                <div key={p} style={{ fontSize:13, color:"rgba(255,255,255,0.45)", marginBottom:8, cursor:"pointer" }}>{p}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:12 }}>Empresa</div>
              {["Sobre","Carreiras","Imprensa","Contato"].map(p=>(
                <div key={p} style={{ fontSize:13, color:"rgba(255,255,255,0.45)", marginBottom:8, cursor:"pointer" }}>{p}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:12 }}>Compliance</div>
              {["GDPR Compliant","LGPD Compliant","SOC 2 Type II","ISO 27001"].map(p=>(
                <div key={p} style={{ fontSize:13, color:"rgba(255,255,255,0.45)", marginBottom:8 }}>{p}</div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ ...s.cont, borderTop:"1px solid rgba(255,255,255,0.06)", marginTop:40, paddingTop:24, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>© 2026 CorefyIT Group. Todos os direitos reservados.</div>
          <div style={{ display:"flex", gap:16 }}>
            {["Privacidade","Termos","Cookies"].map(l=>(
              <span key={l} style={{ fontSize:12, color:"rgba(255,255,255,0.2)", cursor:"pointer" }}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.3} }
        * { box-sizing: border-box; }
        button:hover { opacity: 0.88; }
      `}</style>
    </div>
  );
}
