// src/features/login/Login.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  ShieldCheckIcon,
  SparklesIcon,
  LockClosedIcon,
  EnvelopeIcon,
  IdentificationIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import "@fontsource/montserrat/700.css";
import api from "../../services/api";
import logo from "../landing/logo.png";

function isEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function normalizarLogin(valor) {
  return String(valor || "").trim().toLowerCase();
}

function senhaForte(s) {
  if (!s) return false;
  return s.length >= 6 && /[A-Za-z]/.test(s) && /\d/.test(s) && /[$#@*_]/.test(s);
}

// ── Configuração dos 3 Portais de Acesso (Tríade Cromática: Esmeralda • Ametista Real • Ouro Imperial) ──
const PORTAIS_CONFIG = {
  escola: {
    key: "escola",
    badge: "UNIDADES ESCOLARES",
    titulo: "ESCOLA",
    subtitulo: "Ambiente Escolar Integrado",
    descricao:
      "Gestão pedagógica, diário eletrônico, chamada inteligente, gabaritos, frequência, secretaria e equipe técnica.",
    publico: ["Direção", "Coordenação", "Secretaria", "Professores", "Disciplinar & Equipe"],
    placeholderLogin: "seu.email@email.com.br",
    labelLogin: "E-mail de acesso",
    dicaSeguranca: "Autenticação corporativa unificada por e-mail e senha com verificação em 2 etapas (2FA) e opção de dispositivo confiado.",
    Icon: AcademicCapIcon,
    cardGradient: "linear-gradient(152deg, rgba(6, 52, 40, 0.95) 0%, rgba(5, 34, 30, 0.96) 52%, rgba(7, 22, 34, 0.97) 100%)",
    cornerGlow: "rgba(16, 185, 129, 0.28)",
    bottomGlow: "rgba(20, 184, 166, 0.18)",
    panelGradient: "linear-gradient(155deg, #064e3b 0%, #047857 48%, #0d9488 100%)",
    btnGradient: "linear-gradient(135deg, #10b981 0%, #059669 52%, #0d9488 100%)",
    accentRing: "rgba(52, 211, 153, 0.72)",
    restingRing: "rgba(52, 211, 153, 0.32)",
    auroraColor: "rgba(16, 185, 129, 0.44)",
    badgeClass: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
    subtitleClass: "text-emerald-300/95",
    descClass: "text-emerald-50/80",
    chipClass: "bg-emerald-500/15 text-emerald-100/95 border-emerald-400/25",
    ctaHoverClass: "group-hover:text-emerald-200",
    pillActiveClass: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50 shadow-[0_0_16px_rgba(16,185,129,0.35)]",
    modalAccentText: "text-emerald-700",
    ctaLabel: "Acessar Unidade Escolar",
  },
  cre: {
    key: "cre",
    badge: "COORDENAÇÕES REGIONAIS",
    titulo: "CREs",
    subtitulo: "Coordenações Regionais de Ensino",
    descricao:
      "Supervisão regional da rede, acompanhamento das escolas vinculadas, planejamento territorial e gestão de pessoas.",
    publico: ["Coordenador Regional", "UNIEB", "UNIPLAT", "UNIGEP", "UNIAE", "UNIAG"],
    placeholderLogin: "seu.email@email.com.br",
    labelLogin: "E-mail institucional (CRE)",
    dicaSeguranca: "Acesso exclusivo por e-mail e senha para Coordenadores Regionais de Ensino e Chefes das Unidades Orgânicas.",
    Icon: BuildingLibraryIcon,
    cardGradient: "linear-gradient(152deg, rgba(40, 18, 84, 0.95) 0%, rgba(27, 16, 66, 0.96) 52%, rgba(15, 19, 48, 0.97) 100%)",
    cornerGlow: "rgba(168, 85, 247, 0.32)",
    bottomGlow: "rgba(99, 102, 241, 0.20)",
    panelGradient: "linear-gradient(155deg, #2e1065 0%, #5b21b6 48%, #4338ca 100%)",
    btnGradient: "linear-gradient(135deg, #a855f7 0%, #7c3aed 52%, #4f46e5 100%)",
    accentRing: "rgba(192, 132, 252, 0.72)",
    restingRing: "rgba(167, 139, 250, 0.34)",
    auroraColor: "rgba(139, 92, 246, 0.46)",
    badgeClass: "bg-violet-500/20 text-violet-200 border-violet-400/40",
    subtitleClass: "text-violet-300/95",
    descClass: "text-indigo-50/80",
    chipClass: "bg-violet-500/15 text-violet-100/95 border-violet-400/25",
    ctaHoverClass: "group-hover:text-violet-200",
    pillActiveClass: "bg-violet-500/20 text-violet-200 border-violet-400/50 shadow-[0_0_16px_rgba(139,92,246,0.38)]",
    modalAccentText: "text-violet-700",
    ctaLabel: "Acessar Regional (CRE)",
  },
  plataforma: {
    key: "plataforma",
    badge: "GOVERNANÇA EXECUTIVA",
    titulo: "CEO",
    subtitulo: "Plataforma & Governança Central",
    descricao:
      "Controle global de instituições, licenciamento de módulos por perfil, auditoria RBAC, prazos e telemetria.",
    publico: ["CEO", "Super Admin", "Governança", "Auditoria & Insights"],
    placeholderLogin: "seu.email@email.com.br",
    labelLogin: "E-mail Executivo (CEO / Plataforma)",
    dicaSeguranca: "Ambiente de alta segurança protegido por autenticação obrigatória de duplo fator (OTP).",
    Icon: SparklesIcon,
    cardGradient: "linear-gradient(152deg, rgba(56, 30, 8, 0.95) 0%, rgba(35, 20, 9, 0.96) 52%, rgba(20, 14, 12, 0.97) 100%)",
    cornerGlow: "rgba(245, 158, 11, 0.30)",
    bottomGlow: "rgba(234, 88, 12, 0.18)",
    panelGradient: "linear-gradient(155deg, #1c1917 0%, #78350f 50%, #b45309 100%)",
    btnGradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 52%, #ea580c 100%)",
    accentRing: "rgba(251, 191, 36, 0.72)",
    restingRing: "rgba(251, 191, 36, 0.34)",
    auroraColor: "rgba(245, 158, 11, 0.44)",
    badgeClass: "bg-amber-500/20 text-amber-200 border-amber-400/40",
    subtitleClass: "text-amber-300/95",
    descClass: "text-amber-50/80",
    chipClass: "bg-amber-500/15 text-amber-100/95 border-amber-400/25",
    ctaHoverClass: "group-hover:text-amber-200",
    pillActiveClass: "bg-amber-500/20 text-amber-200 border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.35)]",
    modalAccentText: "text-amber-700",
    ctaLabel: "Acessar Plataforma CEO",
  },
};

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  // ── Controle do Portal, Carrossel Orbital 3D e Modal ──
  const CARROSSEL_ORDEM = ["escola", "cre", "plataforma"];
  // null = estado inicial com os 3 cards lado a lado; ao passar o mouse sobre qualquer card, inicia o giro 3D!
  const [hoveredCard, setHoveredCard] = useState(null);
  const hoverLockUntilRef = useRef(0);
  const lockedSideRef = useRef(null); // "left" | "right" | null — trava o lado onde um card de fundo acabou de deslizar sob o cursor
  const mouseAnchorRef = useRef({ x: null, t: 0 });
  const hoverIntentTimerRef = useRef(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoAcesso, setTipoAcesso] = useState("escola"); // "escola" | "cre" | "plataforma"

  const limparHoverIntent = () => {
    if (hoverIntentTimerRef.current) {
      clearTimeout(hoverIntentTimerRef.current);
      hoverIntentTimerRef.current = null;
    }
  };

  const atualizarAncoraMouse = (clientX) => {
    if (typeof clientX !== "number") return;
    const agora = Date.now();
    if (mouseAnchorRef.current.x === null || agora - mouseAnchorRef.current.t > 90) {
      mouseAnchorRef.current = { x: clientX, t: agora };
    }
  };

  // Blindagem Tripla (Zona Neutra Lateral + Trava Pós-Giro Sob o Cursor + Vetor Direcional):
  // - Quando o usuário passa o mouse em um card lateral, ele gira para o centro e outro card ocupa aquela lateral sob o cursor.
  // - Essa lateral fica travada (`lockedSideRef`) até o cursor chegar ao card central (ou sair pelas bordas externas),
  //   garantindo caminho 100% livre da lateral até o centro para clicar no card desejado!
  const ativarCardCarrossel = (chave, posAtual, clientX, forcar = false) => {
    if (chave === hoveredCard) {
      limparHoverIntent();
      return;
    }
    const agora = Date.now();

    // 1) Disparo imediato no estado inicial (3 cards lado a lado), clique direto na aba de fundo ou nos indicadores
    if (forcar || hoveredCard === null) {
      limparHoverIntent();
      if (typeof clientX === "number") {
        mouseAnchorRef.current = { x: clientX, t: agora };
      }
      lockedSideRef.current =
        posAtual === "flat-left" || posAtual === "left"
          ? "left"
          : posAtual === "flat-right" || posAtual === "right"
          ? "right"
          : null;
      hoverLockUntilRef.current = agora + 780;
      setHoveredCard(chave);
      return;
    }

    // 2) Trava pós-giro na lateral de origem: impede que o novo card que deslizou sob o cursor gire sozinho
    //    enquanto o usuário leva o mouse da lateral até o card central para clicar
    if (lockedSideRef.current && posAtual === lockedSideRef.current) {
      limparHoverIntent();
      return;
    }

    // 3) Trava durante a animação de giro (780ms)
    if (agora < hoverLockUntilRef.current) return;

    // 4) Guarda de Vetor Direcional (janela suavizada contra movimento diagonal):
    //    Se o card está na ESQUERDA ("left") e o mouse se move para a DIREITA (rumo ao centro, dx > 2) -> NÃO GIRA!
    //    Se o card está na DIREITA ("right") e o mouse se move para a ESQUERDA (rumo ao centro, dx < -2) -> NÃO GIRA!
    if (typeof clientX === "number") {
      const anchorX = mouseAnchorRef.current.x;
      if (anchorX !== null) {
        const dx = clientX - anchorX;
        if (posAtual === "left" && dx > 2) {
          limparHoverIntent();
          mouseAnchorRef.current = { x: clientX, t: agora };
          return;
        }
        if (posAtual === "right" && dx < -2) {
          limparHoverIntent();
          mouseAnchorRef.current = { x: clientX, t: agora };
          return;
        }
      }
      atualizarAncoraMouse(clientX);
    }

    // 5) Confirmação suave de intenção (130ms na aba externa) para eliminar disparos por esbarrão rápido
    if (!hoverIntentTimerRef.current) {
      hoverIntentTimerRef.current = setTimeout(() => {
        hoverIntentTimerRef.current = null;
        if (Date.now() < hoverLockUntilRef.current) return;
        if (lockedSideRef.current && posAtual === lockedSideRef.current) return;
        lockedSideRef.current = posAtual === "left" ? "left" : posAtual === "right" ? "right" : null;
        hoverLockUntilRef.current = Date.now() + 780;
        setHoveredCard(chave);
      }, 130);
    }
  };

  // ── Controle de etapas do fluxo de login ──
  const [etapa, setEtapa] = useState("login"); // "login" | "codigo" | "escola" | "reset_codigo" | "reset_nova_senha"

  // ── Campos do formulário ──
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [capsLockAtivo, setCapsLockAtivo] = useState(false);
  const [codigo, setCodigo] = useState("");
  const otpRefs = useRef([]);

  // ── Reset de senha (via OTP) ──
  const [resetCodigo, setResetCodigo] = useState("");
  const [resetSenha, setResetSenha] = useState("");
  const [resetConfSenha, setResetConfSenha] = useState("");
  const [showResetSenha, setShowResetSenha] = useState(false);
  const [resetEmailLocked, setResetEmailLocked] = useState(false);

  // ── Metadados do usuário e UI ──
  const [usuarioId, setUsuarioId] = useState(null);
  const [nomeUsuarioLogin, setNomeUsuarioLogin] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Multi-escola ──
  const [escolasVinculadas, setEscolasVinculadas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState("");
  const [usuarioCtxSelecionado, setUsuarioCtxSelecionado] = useState("");

  // ── Mensagens inline ──
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro"); // "erro" | "info" | "sucesso"

  // ── Reenviar código (cooldown) & Dispositivo confiado ──
  const [cooldown, setCooldown] = useState(0);
  const [confirarDispositivo, setConfirarDispositivo] = useState(false);

  // ── Manutenção Programada ──
  const [manutencao, setManutencao] = useState(null);

  useEffect(() => {
    if (tipoAcesso === "plataforma") return;
    api.get("/api/auth/status")
      .then((res) => {
        if (res.data?.maintenance) setManutencao(res.data);
      })
      .catch(() => {});
  }, [tipoAcesso]);

  // Se veio redirecionado do CadastroUsuario ou AtivarDiretor com state.email, abre o modal correto já preenchido
  useEffect(() => {
    const emailFromState = location?.state?.email;
    const portalFromState = location?.state?.portal || "escola";
    if (emailFromState) {
      setUsuario(emailFromState);
      setTipoAcesso(portalFromState);
      setHoveredCard(portalFromState);
      setModalAberto(true);
    }
  }, [location?.state]);

  // Fechar modal no ESC (quando não está autenticando)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && modalAberto && !loading && !success) {
        fecharModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalAberto, loading, success]);

  // Cooldown da etapa de código
  useEffect(() => {
    if (etapa !== "codigo") return;
    setCooldown((prev) => (prev > 0 ? prev : 60));
    const t = setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [etapa]);

  // Helpers para device_token (localStorage)
  const getDeviceToken = () => {
    try { return localStorage.getItem("device_token") || ""; } catch { return ""; }
  };
  const saveDeviceToken = (token) => {
    try { if (token) localStorage.setItem("device_token", token); } catch {}
  };
  const clearDeviceToken = () => {
    try { localStorage.removeItem("device_token"); } catch {}
  };

  const limparSessaoPlataforma = () => {
    try {
      localStorage.removeItem("plataforma_token");
      localStorage.removeItem("plataforma_scope");
      localStorage.removeItem("plataforma_perfil");
    } catch {}
  };

  const limparSessaoCre = () => {
    try {
      localStorage.removeItem("regional_id");
      localStorage.removeItem("cargo_regional");
      localStorage.removeItem("cargo_label");
      localStorage.removeItem("codigo_cre");
    } catch {}
  };

  const persistirSessaoCre = (data) => {
    limparSessaoPlataforma();
    const cargoReg = String(data?.cargo_regional || "coordenador_regional").toLowerCase().trim();
    const modulosCre = Array.isArray(data?.modulos_ativos)
      ? data.modulos_ativos
      : ["cre", "cre.gabinete", ...(cargoReg === "coordenador_regional" || cargoReg === "chefe_uniag" ? ["cre.uniag"] : [])];

    localStorage.setItem("token", data.token);
    localStorage.setItem("userName", data.nome || "Gestor Regional");
    localStorage.setItem("scope", "cre");
    localStorage.setItem("perfil", data.perfil || "chefe_regional");
    localStorage.setItem("regional_id", String(data.regional_id || ""));
    localStorage.setItem("cargo_regional", cargoReg);
    localStorage.setItem("cargo_label", String(data.cargo_label || ""));
    localStorage.setItem("codigo_cre", String(data.codigo_cre || ""));
    localStorage.setItem("nome_escola", data.nome_regional || data.nome_escola || "Coordenação Regional");
    localStorage.setItem("perfis", JSON.stringify(Array.isArray(data?.perfis) ? data.perfis : [cargoReg]));
    localStorage.setItem("permissoes", JSON.stringify(Array.isArray(data?.permissoes) ? data.permissoes : []));
    localStorage.setItem("modulos_ativos", JSON.stringify(modulosCre));
    localStorage.setItem("cpf", String(data?.cpf || "").replace(/\D/g, ""));
    localStorage.setItem("foto_url", String(data?.foto_url || data?.fotoUrl || ""));
    sessionStorage.removeItem("modulos_last_refresh");

    localStorage.removeItem("escola_id");
    localStorage.removeItem("last_escola_id");
    localStorage.removeItem("disciplinas_professor_ctx");
    localStorage.removeItem("disciplinas_professor");

    return cargoReg === "chefe_uniag" ? "/cre/uniag" : "/cre/gabinete";
  };

  const carregarDisciplinasProfessor = async (token) => {
    try {
      if (!token) return;
      const { data } = await api.get("/api/professores/me/disciplinas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const disciplinasCtx = Array.isArray(data?.disciplinas)
        ? data.disciplinas
            .map((d) => ({ id: Number(d?.id), nome: String(d?.nome || "").trim() }))
            .filter((d) => Number.isFinite(d.id) && d.nome)
        : [];
      const nomes = disciplinasCtx.map((d) => d.nome);
      localStorage.setItem("disciplinas_professor_ctx", JSON.stringify(disciplinasCtx));
      localStorage.setItem("disciplinas_professor", JSON.stringify(nomes));
    } catch {
      localStorage.setItem("disciplinas_professor_ctx", JSON.stringify([]));
      localStorage.setItem("disciplinas_professor", JSON.stringify([]));
    }
  };

  const irParaCadastro = () => {
    const email = String(usuario || "").trim();
    navigate("/cadastro", { state: { email } });
  };

  const abrirPortalModal = (chave) => {
    setTipoAcesso(chave);
    setHoveredCard(chave);
    setEtapa("login");
    setMensagem("");
    setSenha("");
    setShowSenha(false);
    setCodigo("");
    setSuccess(false);
    setModalAberto(true);
  };

  const trocarPerfilNoModal = (chave) => {
    if (loading || success) return;
    setTipoAcesso(chave);
    setHoveredCard(chave);
    voltarParaLogin(true);
  };

  const fecharModal = () => {
    if (loading) return;
    setModalAberto(false);
    voltarParaLogin(false);
  };

  const voltarParaCodigo = () => {
    setEtapa("codigo");
    setMensagem("");
    setTipoMensagem("info");
  };

  const voltarParaLogin = (limparUsuario = false) => {
    setEtapa("login");
    setEscolasVinculadas([]);
    setEscolaSelecionada("");
    setCodigo("");
    setUsuarioId(null);
    setNomeUsuarioLogin("");
    if (limparUsuario) setUsuario("");
    setSenha("");
    setResetCodigo("");
    setResetSenha("");
    setResetConfSenha("");
    setResetEmailLocked(false);
    setMensagem("");
    setTipoMensagem("erro");
    setSuccess(false);
    setLoading(false);
    setCooldown(0);
  };

  const checarCapsLock = (e) => {
    if (e?.getModifierState) {
      setCapsLockAtivo(e.getModifierState("CapsLock"));
    }
  };

  // Validação visual em tempo real do formato do e-mail corporativo
  const detectarTipoIdentificador = () => {
    const raw = String(usuario || "").trim();
    if (!raw) return null;
    if (isEmailValido(raw)) {
      return { icone: "✓", texto: "Formato de e-mail válido", ok: true };
    }
    return { icone: "✉️", texto: "Digite seu e-mail completo", ok: false };
  };
  const infoIdentificador = detectarTipoIdentificador();

  // ──Manipulação das 6 caixas de OTP──
  const codigoDigitos = Array.from({ length: 6 }, (_, i) => codigo[i] || "");

  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const arr = [...codigoDigitos];
    arr[idx] = digit;
    const joined = arr.join("");
    setCodigo(joined);
    setMensagem("");
    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !codigoDigitos[idx] && idx > 0) {
      const arr = [...codigoDigitos];
      arr[idx - 1] = "";
      setCodigo(arr.join(""));
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    setCodigo(pasted);
    setMensagem("");
    if (pasted.length > 0) {
      otpRefs.current[Math.min(5, pasted.length - 1)]?.focus();
    }
  };

  // ── Reset de Senha ──
  const abrirResetSenha = () => {
    const email = String(usuario || "").trim().toLowerCase();
    if (!isEmailValido(email)) {
      setTipoMensagem("erro");
      setMensagem("Informe seu e-mail no campo de identificação para redefinir a senha.");
      return;
    }
    setResetCodigo("");
    setResetSenha("");
    setResetConfSenha("");
    setResetEmailLocked(true);
    setTipoMensagem("info");
    setMensagem("");
    setEtapa("reset_codigo");
    setCooldown(0);
  };

  const handleResetEnviarCodigo = async () => {
    if (loading) return;
    const email = String(usuario || "").trim().toLowerCase();
    if (!isEmailValido(email)) {
      setTipoMensagem("erro");
      setMensagem("E-mail inválido.");
      return;
    }
    setLoading(true);
    setMensagem("");
    try {
      await api.post("/api/auth/reset-senha/enviar-codigo", { email });
      setTipoMensagem("info");
      setMensagem("Enviamos um código de 6 dígitos para seu e-mail.");
      setCooldown(60);
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Erro ao enviar o código.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirmarCodigo = async (e) => {
    e.preventDefault();
    if (loading) return;
    const email = String(usuario || "").trim().toLowerCase();
    if (!isEmailValido(email)) {
      setTipoMensagem("erro");
      setMensagem("E-mail inválido.");
      return;
    }
    if (String(resetCodigo || "").trim().length !== 6) {
      setTipoMensagem("erro");
      setMensagem("Informe o código de 6 dígitos.");
      return;
    }
    setLoading(true);
    setMensagem("");
    try {
      await api.post("/api/auth/reset-senha/confirmar-codigo", {
        email,
        codigo: String(resetCodigo).trim(),
      });
      setTipoMensagem("sucesso");
      setMensagem("Código validado! Defina sua nova senha abaixo.");
      setEtapa("reset_nova_senha");
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Código inválido ou expirado.");
      setResetCodigo("");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAlterarSenha = async (e) => {
    e.preventDefault();
    if (loading) return;
    const email = String(usuario || "").trim().toLowerCase();
    const code = String(resetCodigo || "").trim();
    if (!senhaForte(resetSenha)) {
      setTipoMensagem("erro");
      setMensagem("Use no mínimo 6 caracteres com letras, números e 1 especial ($#@*_).");
      return;
    }
    if (resetSenha !== resetConfSenha) {
      setTipoMensagem("erro");
      setMensagem("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    setMensagem("");
    try {
      await api.post("/api/auth/reset-senha/alterar", {
        email,
        codigo: code,
        senha: resetSenha,
      });
      setTipoMensagem("sucesso");
      setMensagem("Senha redefinida com sucesso! Retornando ao login...");
      setTimeout(() => {
        setEtapa("login");
        setSenha("");
        setResetCodigo("");
        setResetSenha("");
        setResetConfSenha("");
        setResetEmailLocked(false);
        setTipoMensagem("info");
        setMensagem("Pronto! Faça login com sua nova senha.");
      }, 1200);
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  // ── 1ª Etapa: Login Principal (Padrão Corporativo Unificado: E-mail + Senha) ──
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!usuario?.trim() || !senha?.trim()) {
      setTipoMensagem("erro");
      setMensagem("Informe seu e-mail cadastrado e senha para continuar.");
      return;
    }

    const valorLogin = normalizarLogin(usuario);
    if (!isEmailValido(valorLogin)) {
      setTipoMensagem("erro");
      setMensagem("Informe um endereço de e-mail válido.");
      return;
    }

    // ── Fluxo CEO / Plataforma ──
    if (tipoAcesso === "plataforma") {
      setLoading(true);
      setMensagem("");
      try {
        const { data } = await api.post("/api/auth-plataforma/login", {
          email: valorLogin,
          senha,
        });
        const resolvedUsuarioId =
          data?.usuarioId ?? data?.userId ?? data?.id ?? data?.usuario_id ?? data?.usuario?.id ?? null;
        if (!resolvedUsuarioId) {
          setTipoMensagem("erro");
          setMensagem("Falha ao iniciar verificação de segurança. Tente novamente.");
          return;
        }
        setUsuarioId(resolvedUsuarioId);
        setTipoMensagem("info");
        setMensagem("Código de segurança enviado para seu e-mail executivo.");
        setCooldown(60);
        setEtapa("codigo");
        return;
      } catch (err) {
        setTipoMensagem("erro");
        setMensagem(err.response?.data?.message || "Credenciais inválidas na Plataforma CEO.");
        return;
      } finally {
        setLoading(false);
      }
    }

    // ── Fluxo ESCOLA ou CREs (Unificado por E-mail + Senha + 2FA / Dispositivo Confiado) ──
    setLoading(true);
    setMensagem("");

    try {
      const payload = {
        email: valorLogin,
        emailOuCelular: valorLogin,
        senha,
        device_token: getDeviceToken(),
        contexto: tipoAcesso,
      };

      const { data } = await api.post("/api/auth/login", payload);

      // Dispositivo confiado (pula OTP)
      if (data?.dispositivo_confiado) {
        limparSessaoPlataforma();
        if (data?.multi_escola) {
          const lista = Array.isArray(data?.escolas) ? data.escolas : [];
          setEscolasVinculadas(lista);
          setUsuarioId(data.usuarioId || null);
          const ultima = localStorage.getItem("last_escola_id");
          const ctx = ultima ? lista.find((e) => String(e.id) === String(ultima)) : null;
          setEscolaSelecionada(ctx ? String(ctx.id) : "");
          setUsuarioCtxSelecionado(ctx ? String(ctx.usuario_ctx_id || "") : "");
          setNomeUsuarioLogin(String(data?.nome || ""));
          setTipoMensagem("info");
          setMensagem("Selecione a unidade para acessar.");
          setEtapa("escola");
          return;
        }

        // ── Sessão isolada CRE (scope: "cre") ──
        if (String(data?.scope || "").toLowerCase() === "cre") {
          const destinoCre = persistirSessaoCre(data);
          setNomeUsuarioLogin(data.nome || "");
          setTipoMensagem("sucesso");
          setMensagem("Dispositivo reconhecido!");
          setSuccess(true);
          setTimeout(() => navigate(destinoCre), 1100);
          return;
        }

        limparSessaoCre();
        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.nome || "Usuário");
        localStorage.setItem("escola_id", data.escola_id ?? 1);
        localStorage.setItem("escola_origem", data.escola_origem || "publica");
        localStorage.setItem("nome_escola", data.nome_escola || "Instituição");
        localStorage.setItem("perfil", data.perfil || "aluno");
        localStorage.setItem("scope", data.scope || "escola");
        localStorage.setItem("perfis", JSON.stringify(Array.isArray(data?.perfis) ? data.perfis : []));
        localStorage.setItem("permissoes", JSON.stringify(Array.isArray(data?.permissoes) ? data.permissoes : []));
        localStorage.setItem("modulos_ativos", JSON.stringify(Array.isArray(data?.modulos_ativos) ? data.modulos_ativos : []));
        sessionStorage.removeItem("modulos_last_refresh");

        await carregarDisciplinasProfessor(data.token);

        localStorage.setItem("cpf", String(data?.cpf || "").replace(/\D/g, ""));
        localStorage.setItem("foto_url", String(data?.foto_url || ""));
        localStorage.setItem("last_escola_id", String(data.escola_id || ""));

        setNomeUsuarioLogin(data.nome || "");
        setTipoMensagem("sucesso");
        setMensagem("Dispositivo reconhecido!");
        setSuccess(true);
        setTimeout(() => navigate("/home"), 1200);
        return;
      }

      // Fluxo OTP padrão
      const resolvedUsuarioId =
        data?.usuarioId ?? data?.userId ?? data?.id ?? data?.usuario_id ?? data?.usuario?.id ?? null;

      if (!resolvedUsuarioId) {
        setTipoMensagem("erro");
        setMensagem("Não foi possível iniciar a verificação. Tente novamente.");
        return;
      }

      setUsuarioId(resolvedUsuarioId);
      setTipoMensagem("info");
      setMensagem("Enviamos um código de 6 dígitos para seu e-mail cadastrado.");
      setCooldown(60);
      setEtapa("codigo");
    } catch (err) {
      if (err.response?.status === 503 && err.response?.data?.maintenance) {
        setManutencao(err.response.data);
        setModalAberto(false);
        return;
      }
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Não foi possível autenticar.");
    } finally {
      setLoading(false);
    }
  };

  // ── Reenviar Código OTP ──
  const handleReenviarCodigo = async () => {
    if (loading || cooldown > 0) return;
    if (!usuario?.trim() || !senha?.trim()) {
      setEtapa("login");
      return;
    }
    const valorLogin = normalizarLogin(usuario);

    if (tipoAcesso === "plataforma") {
      setLoading(true);
      setMensagem("");
      try {
        const { data } = await api.post("/api/auth-plataforma/login", { email: valorLogin, senha });
        const resolvedUsuarioId = data?.usuarioId ?? data?.userId ?? data?.id ?? data?.usuario_id ?? null;
        if (resolvedUsuarioId) setUsuarioId(resolvedUsuarioId);
        setCodigo("");
        setTipoMensagem("info");
        setMensagem("Novo código enviado para seu e-mail executivo.");
        setCooldown(60);
      } catch (err) {
        setTipoMensagem("erro");
        setMensagem(err.response?.data?.message || "Erro ao reenviar código.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setMensagem("");
    try {
      const { data } = await api.post("/api/auth/login", {
        email: valorLogin,
        emailOuCelular: valorLogin,
        senha,
        contexto: tipoAcesso,
      });
      const resolvedUsuarioId = data?.usuarioId ?? data?.userId ?? data?.id ?? data?.usuario_id ?? null;
      if (resolvedUsuarioId) setUsuarioId(resolvedUsuarioId);
      setCodigo("");
      setTipoMensagem("info");
      setMensagem("Novo código enviado! Verifique sua caixa de entrada.");
      setCooldown(60);
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Erro ao reenviar código.");
    } finally {
      setLoading(false);
    }
  };

  // ── 2ª Etapa: Confirmar OTP ──
  const handleConfirmar = async (e) => {
    e.preventDefault();
    if (!codigo?.trim() || codigo.length !== 6) {
      setTipoMensagem("erro");
      setMensagem("Digite os 6 números do código de verificação.");
      return;
    }
    if (!usuarioId) {
      setTipoMensagem("erro");
      setMensagem("Sessão expirada. Volte e faça login novamente.");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      if (tipoAcesso === "plataforma") {
        const { data } = await api.post("/api/auth-plataforma/confirmar", { usuarioId, codigo });
        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.nome || "Administrador CEO");
        localStorage.setItem("perfil", data.perfil || "ADMIN_GLOBAL");
        localStorage.setItem("scope", data.scope || "plataforma");
        localStorage.setItem("perfis", JSON.stringify(Array.isArray(data?.perfis) ? data.perfis : []));
        localStorage.setItem("permissoes", JSON.stringify(Array.isArray(data?.permissoes) ? data.permissoes : []));

        localStorage.removeItem("escola_id");
        localStorage.removeItem("escola_origem");
        localStorage.removeItem("nome_escola");
        localStorage.removeItem("cpf");
        localStorage.removeItem("foto_url");
        localStorage.removeItem("disciplinas_professor_ctx");
        localStorage.removeItem("disciplinas_professor");
        limparSessaoCre();

        setNomeUsuarioLogin(data.nome || "CEO");
        setTipoMensagem("sucesso");
        setMensagem("Acesso Executivo Autorizado!");
        setSuccess(true);
        setTimeout(() => navigate("/plataforma/dashboard"), 1200);
        return;
      }

      const { data } = await api.post("/api/auth/confirmar", {
        usuarioId,
        codigo,
        confiar_dispositivo: confirarDispositivo,
      });

      if (data?.multi_escola) {
        const lista = Array.isArray(data?.escolas) ? data.escolas : [];
        setEscolasVinculadas(lista);
        const ultima = localStorage.getItem("last_escola_id");
        const ctxUlt = ultima ? lista.find((e) => String(e.id) === String(ultima)) : null;
        setEscolaSelecionada(ctxUlt ? String(ctxUlt.id) : "");
        setUsuarioCtxSelecionado(ctxUlt ? String(ctxUlt.usuario_ctx_id || "") : "");
        setNomeUsuarioLogin(String(data?.nome || ""));
        setTipoMensagem("info");
        setMensagem("Escolha a instituição para iniciar sua sessão.");
        setEtapa("escola");
        return;
      }

      // ── Sessão isolada CRE (scope: "cre") ──
      if (String(data?.scope || "").toLowerCase() === "cre") {
        if (data?.device_token) saveDeviceToken(data.device_token);
        if (!confirarDispositivo && !getDeviceToken()) clearDeviceToken();

        const destinoCre = persistirSessaoCre(data);
        setNomeUsuarioLogin(data.nome || "");
        setTipoMensagem("sucesso");
        setMensagem("Acesso Regional Confirmado!");
        setSuccess(true);
        setTimeout(() => navigate(destinoCre), 1200);
        return;
      }

      limparSessaoPlataforma();
      limparSessaoCre();
      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.nome || "Usuário");
      localStorage.setItem("escola_id", data.escola_id ?? 1);
      localStorage.setItem("escola_origem", data.escola_origem || "publica");
      localStorage.setItem("nome_escola", data.nome_escola || "Instituição");
      localStorage.setItem("perfil", data.perfil || "aluno");
      localStorage.setItem("scope", data.scope || "escola");
      localStorage.setItem("perfis", JSON.stringify(Array.isArray(data?.perfis) ? data.perfis : []));
      localStorage.setItem("permissoes", JSON.stringify(Array.isArray(data?.permissoes) ? data.permissoes : []));

      await carregarDisciplinasProfessor(data.token);

      const cpfLs = data?.cpf || data?.usuario?.cpf || data?.user?.cpf || "";
      const fotoLs = data?.fotoUrl || data?.foto_url || data?.foto || "";
      localStorage.setItem("cpf", String(cpfLs || "").replace(/\D/g, ""));
      localStorage.setItem("foto_url", String(fotoLs || ""));

      if (data?.device_token) saveDeviceToken(data.device_token);
      if (!confirarDispositivo && !getDeviceToken()) clearDeviceToken();

      localStorage.setItem("modulos_ativos", JSON.stringify(Array.isArray(data?.modulos_ativos) ? data.modulos_ativos : []));
      sessionStorage.removeItem("modulos_last_refresh");

      setNomeUsuarioLogin(data.nome || "");
      setTipoMensagem("sucesso");
      setMensagem("Acesso confirmado!");
      setSuccess(true);
      setTimeout(() => navigate("/home"), 1300);
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  // ── 3ª Etapa: Seleção Multi-Escola ──
  const handleConfirmarEscola = async (e) => {
    e.preventDefault();
    if (!usuarioId || !escolaSelecionada || !usuarioCtxSelecionado) {
      setTipoMensagem("erro");
      setMensagem("Selecione uma unidade para continuar.");
      return;
    }
    setLoading(true);
    setMensagem("");
    try {
      const { data } = await api.post("/api/auth/confirmar-escola", {
        usuarioId,
        escola_id: Number(escolaSelecionada),
        usuario_ctx_id: Number(usuarioCtxSelecionado),
      });

      localStorage.setItem("token", data.token);
      limparSessaoPlataforma();
      localStorage.setItem("userName", data.nome || "Usuário");
      localStorage.setItem("escola_id", data.escola_id || 1);
      localStorage.setItem("escola_origem", data.escola_origem || "publica");
      localStorage.setItem("nome_escola", data.nome_escola || "Escola não definida");
      localStorage.setItem("perfil", data.perfil || "aluno");
      localStorage.setItem("scope", data.scope || "escola");
      localStorage.setItem("perfis", JSON.stringify(Array.isArray(data?.perfis) ? data.perfis : []));
      localStorage.setItem("permissoes", JSON.stringify(Array.isArray(data?.permissoes) ? data.permissoes : []));

      await carregarDisciplinasProfessor(data.token);

      const cpfLs = data?.cpf || data?.usuario?.cpf || data?.user?.cpf || "";
      const fotoLs = data?.fotoUrl || data?.foto_url || data?.foto || "";
      localStorage.setItem("cpf", String(cpfLs || "").replace(/\D/g, ""));
      localStorage.setItem("foto_url", String(fotoLs || ""));
      localStorage.setItem("last_escola_id", String(data.escola_id || ""));
      localStorage.setItem(
        "modulos_ativos",
        JSON.stringify(Array.isArray(data?.modulos_ativos) ? data.modulos_ativos : [])
      );
      sessionStorage.removeItem("modulos_last_refresh");

      setNomeUsuarioLogin(data.nome || "");
      setTipoMensagem("sucesso");
      setMensagem("Unidade selecionada com sucesso!");
      setSuccess(true);
      setTimeout(() => navigate("/home"), 1200);
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Erro ao selecionar unidade.");
    } finally {
      setLoading(false);
    }
  };

  const portalAtivo = PORTAIS_CONFIG[tipoAcesso] || PORTAIS_CONFIG.escola;
  const ActivePortalIcon = portalAtivo.Icon;
  const portalAuroraColor = hoveredCard
    ? PORTAIS_CONFIG[hoveredCard]?.auroraColor || "rgba(56, 189, 248, 0.28)"
    : "rgba(56, 189, 248, 0.28)";
  const stepIndex = success ? 3 : etapa === "codigo" || etapa === "escola" ? 2 : 1;

  const senhaChecks = [
    { label: "6+ caracteres", ok: resetSenha.length >= 6 },
    { label: "Letras (A-Z)", ok: /[A-Za-z]/.test(resetSenha) },
    { label: "Números (0-9)", ok: /\d/.test(resetSenha) },
    { label: "Especial ($#@*_)", ok: /[$#@*_]/.test(resetSenha) },
  ];

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden flex flex-col justify-between text-white select-none"
      style={{
        background: "radial-gradient(circle at 50% 0%, #0f2557 0%, #07122e 52%, #030714 100%)",
      }}
    >
      <style>{`
        @keyframes vaultModalSpring {
          0%   { opacity: 0; transform: scale(0.92) translateY(24px); }
          65%  { opacity: 1; transform: scale(1.015) translateY(-3px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cardFloatIn {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes borderBeamSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .animate-vaultModal {
          animation: vaultModalSpring 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* ── Luzes Volumétricas Dinâmicas que reagem ao Card em foco ── */}
      <div
        className="pointer-events-none fixed top-[-140px] left-1/2 -translate-x-1/2 w-[780px] h-[520px] rounded-full blur-[140px] transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${portalAuroraColor}, transparent 70%)` }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.09]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(circle at 50% 38%, black 30%, transparent 82%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 38%, black 30%, transparent 82%)",
        }}
      />

      {/* ── Header do Portal de Acesso ── */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-xs sm:text-sm font-semibold text-blue-100 transition-all"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Início</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded-xl border border-white/35 shadow-md"
            style={{ background: "linear-gradient(145deg, #fbbf24 0%, #f59e0b 52%, #ea580c 100%)" }}
          >
            <img
              src={logo}
              alt="Educa.Melhor"
              className="w-6 h-6 object-contain"
              style={{ filter: "grayscale(1) contrast(1.6)" }}
              draggable={false}
            />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Educa<span className="text-sky-400">.Melhor</span>
          </span>
        </div>

        <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-xs text-emerald-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Portais Operacionais</span>
        </div>
      </header>

      {/* ── Conteúdo Principal: Aviso de Manutenção OU Os 3 Cards (ESCOLA, CREs, CEO) ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 max-w-6xl mx-auto w-full">
        {manutencao ? (
          <div className="max-w-lg w-full rounded-3xl bg-white/10 backdrop-blur-2xl border border-amber-400/35 p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-5">
              <ExclamationTriangleIcon className="h-9 w-9 text-amber-300" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">Manutenção Programada</h2>
            <p className="text-sm text-blue-100/85 leading-relaxed mb-5">
              {manutencao.mensagem || "Estamos aplicando melhorias programadas no ambiente escolar. Voltaremos em instantes."}
            </p>
            {(manutencao.inicio || manutencao.fim) && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-400/25 p-4 text-xs text-amber-200 mb-6 space-y-1">
                {manutencao.inicio && (
                  <div>
                    <strong>Início:</strong>{" "}
                    {new Date(manutencao.inicio).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </div>
                )}
                {manutencao.fim && (
                  <div>
                    <strong>Previsão de retorno:</strong>{" "}
                    {new Date(manutencao.fim).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setManutencao(null)}
                className="flex-1 py-3 rounded-xl bg-white/15 hover:bg-white/25 font-semibold text-sm text-white transition"
              >
                Voltar aos Portais
              </button>
              <button
                type="button"
                onClick={() => {
                  setManutencao(null);
                  abrirPortalModal("plataforma");
                }}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-sm text-slate-950 transition"
              >
                Acesso Executivo (CEO)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Cabeçalho da Página de Seleção */}
            <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold tracking-[0.2em] uppercase text-sky-300 mb-3">
                <LockClosedIcon className="h-3.5 w-3.5" />
                <span>Central de Autenticação Inteligente</span>
              </div>
              <h1
                className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-2.5"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Escolha seu perfil de acesso
              </h1>
              <p className="text-sm sm:text-base text-blue-200/80 font-light">
                Passe o cursor sobre a esfera desejada para trazê-la ao centro e clique para autenticar.
              </p>
            </div>

            {/* ═══ PALCO CARROSSEL ORBITAL 3D (DESKTOP >= 768px) ═══ */}
            <div className="hidden md:flex flex-col items-center w-full">
              <div className="relative w-full max-w-6xl h-[465px] flex items-center justify-center pointer-events-none">
                {/* Halo luminoso projetado no piso sob o card central (aparece quando o carrossel 3D está ativo) */}
                <div
                  className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 w-[380px] h-14 rounded-full blur-2xl transition-all duration-700 ${
                    hoveredCard ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ background: portalAuroraColor }}
                />

                <div
                  className="relative w-full h-full pointer-events-none"
                  onMouseMove={(e) => {
                    if (hoveredCard !== null) {
                      atualizarAncoraMouse(e.clientX);
                    }
                  }}
                >
                  {/* 🛡️ ZONA NEUTRA LATERAL AO REDOR DO CARD CENTRAL (680px = ~412px card central projetado + 134px livres de cada lado):
                      Fica em zIndex 25 (acima dos cards de fundo zIndex 10 e abaixo do card central zIndex 30),
                      criando um corredor amplo nas duas laterais do card central que NÃO detecta os cards de fundo! */}
                  {hoveredCard !== null && (
                    <div
                      onMouseEnter={limparHoverIntent}
                      onMouseMove={(e) => {
                        limparHoverIntent();
                        atualizarAncoraMouse(e.clientX);
                      }}
                      style={{
                        width: "680px",
                        left: "50%",
                        top: "0px",
                        bottom: "0px",
                        transform: "translateX(-50%)",
                        zIndex: 25,
                      }}
                      className="pointer-events-auto absolute"
                    />
                  )}

                  {CARROSSEL_ORDEM.map((chave, idx) => {
                    const cfg = PORTAIS_CONFIG[chave];
                    const IconComp = cfg.Icon;
                    const isModoInicialLadoALado = hoveredCard === null;

                    // Quando hoveredCard === null: 3 cards lado a lado (idx 0 = esquerda, idx 1 = centro, idx 2 = direita)
                    // Quando hoveredCard !== null: carrossel 3D ativo (card sob hover vai para frente/centro, os outros 2 recuam)
                    let pos = "center";
                    if (isModoInicialLadoALado) {
                      pos = idx === 0 ? "flat-left" : idx === 1 ? "flat-center" : "flat-right";
                    } else {
                      const activeIdx = CARROSSEL_ORDEM.indexOf(hoveredCard);
                      const diff = (idx - activeIdx + 3) % 3;
                      pos = diff === 0 ? "center" : diff === 1 ? "right" : "left";
                    }

                    const isCenter = pos === "center";
                    const isDestaque = isModoInicialLadoALado || isCenter;

                    const transform3d =
                      pos === "flat-left"
                        ? "perspective(1400px) translate3d(calc(-50% - 376px), 0px, 0px) rotateY(0deg) scale(1)"
                        : pos === "flat-center"
                        ? "perspective(1400px) translate3d(-50%, 0px, 0px) rotateY(0deg) scale(1)"
                        : pos === "flat-right"
                        ? "perspective(1400px) translate3d(calc(-50% + 376px), 0px, 0px) rotateY(0deg) scale(1)"
                        : pos === "center"
                        ? "perspective(1400px) translate3d(-50%, 0px, 95px) rotateY(0deg) scale(1.08)"
                        : pos === "left"
                        ? "perspective(1400px) translate3d(calc(-50% - 365px), 12px, -135px) rotateY(26deg) scale(0.86)"
                        : "perspective(1400px) translate3d(calc(-50% + 365px), 12px, -135px) rotateY(-26deg) scale(0.86)";

                    const glareTransform =
                      pos === "left"
                        ? "translateX(-35%) rotate(18deg)"
                        : pos === "right"
                        ? "translateX(35%) rotate(18deg)"
                        : "translateX(0%) rotate(18deg)";

                    return (
                      <button
                        key={cfg.key}
                        type="button"
                        onMouseEnter={(e) => {
                          if (isCenter) {
                            lockedSideRef.current = null;
                            limparHoverIntent();
                            return;
                          }
                          ativarCardCarrossel(chave, pos, e.clientX);
                        }}
                        onMouseMove={(e) => {
                          if (isCenter) {
                            lockedSideRef.current = null;
                            return;
                          }
                          ativarCardCarrossel(chave, pos, e.clientX);
                        }}
                        onMouseLeave={(e) => {
                          limparHoverIntent();
                          // Se o mouse saiu pela borda externa/vertical (fora do carrossel), libera a trava daquele lado
                          if (lockedSideRef.current === pos) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const saiuPorFora =
                              (pos === "left" && e.clientX <= rect.left + 12) ||
                              (pos === "right" && e.clientX >= rect.right - 12) ||
                              e.clientY <= rect.top + 12 ||
                              e.clientY >= rect.bottom - 12;
                            if (saiuPorFora) {
                              lockedSideRef.current = null;
                            }
                          }
                        }}
                        onFocus={() => ativarCardCarrossel(chave, pos, undefined, true)}
                        onClick={() => {
                          if (!isModoInicialLadoALado && !isCenter) {
                            ativarCardCarrossel(chave, pos, undefined, true);
                            return;
                          }
                          abrirPortalModal(chave);
                        }}
                        style={{
                          width: "356px",
                          left: "50%",
                          top: "20px",
                          background: cfg.cardGradient,
                          transform: transform3d,
                          zIndex: isCenter ? 30 : isModoInicialLadoALado ? 20 : 10,
                          opacity: isDestaque ? 1 : 0.62,
                          filter: isCenter
                            ? "brightness(1.06)"
                            : isModoInicialLadoALado
                            ? "brightness(1)"
                            : "brightness(0.75) saturate(0.88)",
                          transition:
                            "transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 520ms ease, box-shadow 620ms ease, filter 520ms ease",
                          boxShadow: isCenter
                            ? `0 34px 80px -15px rgba(0,0,0,0.88), 0 0 56px -8px ${cfg.auroraColor}, 0 0 0 1.5px ${cfg.accentRing}`
                            : isModoInicialLadoALado
                            ? `0 24px 55px -16px rgba(0,0,0,0.82), 0 0 32px -12px ${cfg.auroraColor}, 0 0 0 1px ${cfg.restingRing}`
                            : `0 20px 45px -18px rgba(0,0,0,0.75), 0 0 0 1px ${cfg.restingRing}`,
                          backfaceVisibility: "hidden",
                          willChange: "transform, opacity",
                        }}
                        className="pointer-events-auto group absolute text-left rounded-3xl p-7 backdrop-blur-2xl flex flex-col justify-between min-h-[392px] overflow-hidden cursor-pointer"
                      >
                        {/* Nebulosa interna da esfera (iluminação volumétrica de joalheria) */}
                        <div
                          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
                          style={{
                            background: `radial-gradient(circle at 88% 12%, ${cfg.cornerGlow} 0%, transparent 56%), radial-gradient(circle at 12% 92%, ${cfg.bottomGlow} 0%, transparent 52%)`,
                            opacity: isDestaque ? 1 : 0.65,
                          }}
                        />

                        {/* Feixe superior colorido */}
                        <div
                          className="pointer-events-none absolute inset-x-0 top-0 h-1.5 transition-opacity duration-500"
                          style={{
                            background: cfg.btnGradient,
                            opacity: isDestaque ? 1 : 0.65,
                          }}
                        />

                        {/* Reflexo especular de vidro que desliza conforme o ângulo 3D */}
                        <div
                          className="pointer-events-none absolute -inset-y-16 -inset-x-24 opacity-20 transition-transform duration-700"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.16) 50%, transparent 100%)",
                            transform: glareTransform,
                          }}
                        />

                        <div className="relative z-10">
                          <div className="flex items-start justify-between gap-3 mb-5">
                            <div
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-white/30 shadow-lg transition-transform duration-500 ${
                                isCenter ? "scale-105" : "scale-95"
                              }`}
                              style={{ background: cfg.btnGradient }}
                            >
                              <IconComp className="h-7 w-7 text-white" />
                            </div>
                            <span
                              className={`text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full border ${cfg.badgeClass}`}
                            >
                              {cfg.badge}
                            </span>
                          </div>

                          <h2
                            className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1"
                            style={{ fontFamily: "'Montserrat', sans-serif" }}
                          >
                            {cfg.titulo}
                          </h2>
                          <div className={`text-xs font-semibold mb-3 ${cfg.subtitleClass}`}>
                            {cfg.subtitulo}
                          </div>
                          <p className={`text-xs sm:text-[13px] leading-relaxed mb-5 ${cfg.descClass}`}>
                            {cfg.descricao}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mb-5">
                            {cfg.publico.map((p) => (
                              <span
                                key={p}
                                className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md border ${cfg.chipClass}`}
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between">
                          <span className={`text-sm font-bold text-white transition-colors ${cfg.ctaHoverClass}`}>
                            {cfg.ctaLabel}
                          </span>
                          <span
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                              isCenter
                                ? "bg-white text-slate-900 shadow-md group-hover:translate-x-1"
                                : "bg-white/10 text-white"
                            }`}
                          >
                            <ArrowRightIcon className="h-4 w-4 stroke-[2.5]" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Indicadores Orbitais Discretos */}
              <div className="flex items-center gap-2.5 mt-4">
                {CARROSSEL_ORDEM.map((chave) => {
                  const cfg = PORTAIS_CONFIG[chave];
                  const ativo = hoveredCard === chave;
                  return (
                    <button
                      key={chave}
                      type="button"
                      onMouseEnter={() => ativarCardCarrossel(chave, "indicator", undefined, true)}
                      onClick={() => abrirPortalModal(chave)}
                      className={`px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider transition-all border ${
                        ativo
                          ? `${cfg.pillActiveClass} scale-105`
                          : "bg-white/5 text-blue-200/50 border-white/10 hover:text-white/80"
                      }`}
                    >
                      {ativo ? `● ${cfg.titulo}` : cfg.titulo}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ═══ VERSÃO MOBILE EMPILHADA (< 768px — onde não há hover de mouse) ═══ */}
            <div className="grid grid-cols-1 gap-5 w-full md:hidden">
              {CARROSSEL_ORDEM.map((chave) => {
                const cfg = PORTAIS_CONFIG[chave];
                const IconComp = cfg.Icon;
                return (
                  <button
                    key={cfg.key}
                    type="button"
                    onClick={() => abrirPortalModal(chave)}
                    style={{
                      background: cfg.cardGradient,
                      boxShadow: `0 20px 45px -16px rgba(0,0,0,0.8), 0 0 0 1px ${cfg.restingRing}`,
                    }}
                    className="relative text-left rounded-3xl p-6 flex flex-col justify-between overflow-hidden"
                  >
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `radial-gradient(circle at 88% 12%, ${cfg.cornerGlow} 0%, transparent 56%)`,
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
                      style={{ background: cfg.btnGradient }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/25"
                          style={{ background: cfg.btnGradient }}
                        >
                          <IconComp className="h-6 w-6 text-white" />
                        </div>
                        <span className={`text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full border ${cfg.badgeClass}`}>
                          {cfg.badge}
                        </span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white mb-0.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        {cfg.titulo}
                      </h2>
                      <div className={`text-xs font-semibold mb-2 ${cfg.subtitleClass}`}>{cfg.subtitulo}</div>
                      <p className={`text-xs mb-4 ${cfg.descClass}`}>{cfg.descricao}</p>
                    </div>
                    <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{cfg.ctaLabel}</span>
                      <ArrowRightIcon className="h-4 w-4 text-white" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Links Rápidos Inferiores (Primeiro Acesso / Convite) */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-blue-200/80">
              <span>Ainda não possui conta escolar?</span>
              <button
                type="button"
                onClick={() => navigate("/cadastro")}
                className="font-bold text-emerald-300 hover:text-emerald-200 underline underline-offset-4 transition"
              >
                Criar conta gratuita
              </button>
              <span className="opacity-40">•</span>
              <button
                type="button"
                onClick={() => navigate("/ativar-diretor")}
                className="inline-flex items-center gap-1.5 font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-4 transition"
              >
                <KeyIcon className="h-3.5 w-3.5" />
                <span>Tenho um código de convite (Diretor / Chefe CRE)</span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* ── Rodapé Minimalista ── */}
      <footer className="relative z-10 text-center pb-5 px-4 text-xs text-blue-300/60">
        © {new Date().getFullYear()} Educa.Melhor • Segurança Criptografada TLS + 2FA •{" "}
        <a href="/suporte" className="hover:text-white underline underline-offset-2">Suporte</a> •{" "}
        <a href="/privacidade" className="hover:text-white underline underline-offset-2">Privacidade</a>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL DE LOGIN CINEMATOGRÁFICO (SPLIT-SHOWCASE VAULT MODAL)
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xl"
          onClick={(e) => {
            if (e.target === e.currentTarget) fecharModal();
          }}
        >
          <div className="animate-vaultModal relative w-full max-w-4xl rounded-[2rem] overflow-hidden shadow-[0_32px_90px_rgba(0,0,0,0.75)] border border-white/20 bg-slate-900 grid grid-cols-1 lg:grid-cols-12">
            {/* Botão Fechar (X) */}
            <button
              type="button"
              onClick={fecharModal}
              disabled={loading}
              title="Fechar (Esc)"
              className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition shadow-sm"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {/* ─── COLUNA ESQUERDA: IDENTIDADE VIVA DO PERFIL & TELEMETRIA ─── */}
            <div
              className="lg:col-span-5 p-6 sm:p-8 text-white flex flex-col justify-between relative overflow-hidden transition-all duration-500"
              style={{ background: portalAtivo.panelGradient }}
            >
              {/* Efeito de brilho radial no painel esquerdo */}
              <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white/15 blur-3xl" />

              <div>
                {/* Seletor Rápido de Esfera dentro do próprio Modal */}
                <div className="inline-flex items-center p-1 rounded-xl bg-black/25 backdrop-blur-md border border-white/15 mb-6 w-full">
                  {[
                    { k: "escola", l: "Escola" },
                    { k: "cre", l: "CREs" },
                    { k: "plataforma", l: "CEO" },
                  ].map((tab) => (
                    <button
                      key={tab.k}
                      type="button"
                      onClick={() => trocarPerfilNoModal(tab.k)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        tipoAcesso === tab.k
                          ? "bg-white text-slate-900 shadow-md"
                          : "text-white/75 hover:text-white"
                      }`}
                    >
                      {tab.l}
                    </button>
                  ))}
                </div>

                {/* Emblema + Título da Esfera */}
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                    <ActivePortalIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold tracking-widest uppercase text-white/75 block">
                      PORTAL SELECIONADO
                    </span>
                    <h3
                      className="text-2xl font-extrabold tracking-tight"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {portalAtivo.titulo}
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-white/85 leading-relaxed mb-6">
                  {portalAtivo.dicaSeguranca}
                </p>

                {/* Stepper Dinâmico de Segurança em Tempo Real */}
                <div className="hidden sm:block space-y-3 pt-4 border-t border-white/15">
                  {[
                    { n: 1, t: "Identificação Criptografada", d: "Validação de credenciais" },
                    { n: 2, t: "Verificação Inteligente", d: "Código 2FA ou dispositivo confiado" },
                    { n: 3, t: "Sessão Autenticada", d: "Carregamento de permissões RBAC" },
                  ].map((st) => {
                    const concluido = stepIndex > st.n;
                    const atual = stepIndex === st.n;
                    return (
                      <div
                        key={st.n}
                        className={`flex items-center gap-3 transition-opacity ${
                          atual || concluido ? "opacity-100" : "opacity-45"
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold border ${
                            concluido
                              ? "bg-emerald-400 text-slate-950 border-emerald-300"
                              : atual
                              ? "bg-white text-slate-900 border-white shadow-[0_0_15px_rgba(255,255,255,0.6)]"
                              : "bg-white/10 text-white border-white/25"
                          }`}
                        >
                          {concluido ? "✓" : st.n}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{st.t}</div>
                          <div className="text-[11px] text-white/70">{st.d}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selo Inferior de Segurança */}
              <div className="hidden lg:flex items-center gap-2 pt-6 text-[11px] text-white/75">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-300 flex-shrink-0" />
                <span>Protegido por criptografia ponta a ponta Educa.Melhor Vault™</span>
              </div>
            </div>

            {/* ─── COLUNA DIREITA: FORMULÁRIOS ULTRA-MODERNOS (FUNDO CLARO CLEAN) ─── */}
            <div className="lg:col-span-7 bg-white text-slate-800 p-6 sm:p-10 flex flex-col justify-center min-h-[470px]">
              {/* ═══ ESTADO DE SUCESSO CELEBRATÓRIO ═══ */}
              {success ? (
                <div className="text-center py-8 animate-fadeIn">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <CheckCircleIcon className="h-12 w-12 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 mb-1">
                    Acesso Autorizado!
                  </h3>
                  {nomeUsuarioLogin && (
                    <p className="text-sm font-semibold text-blue-600 mb-2">
                      Bem-vindo(a), {nomeUsuarioLogin}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mb-6">
                    Preparando seu ambiente {portalAtivo.subtitulo}...
                  </p>
                  <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden mx-auto">
                    <div
                      className="h-full rounded-full animate-pulse"
                      style={{ width: "100%", background: portalAtivo.btnGradient }}
                    />
                  </div>
                </div>

              ) : etapa === "login" ? (
                /* ═══ ETAPA 1: CREDENCIAIS ═══ */
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${portalAtivo.modalAccentText}`}>
                      {portalAtivo.subtitulo}
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                      Entrar em {portalAtivo.titulo}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Insira suas credenciais abaixo para autenticar sua sessão.
                    </p>
                  </div>

                  {/* Alertas e CTAs inteligentes */}
                  {mensagem && (
                    <div className="space-y-3">
                      <div
                        className={`rounded-xl border px-4 py-3 text-xs sm:text-sm font-semibold flex items-center gap-2.5 ${
                          tipoMensagem === "sucesso"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : tipoMensagem === "info"
                            ? "border-blue-200 bg-blue-50 text-blue-800"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        <span className="flex-1">{mensagem}</span>
                      </div>

                      {tipoAcesso === "escola" &&
                        tipoMensagem === "erro" &&
                        String(mensagem || "").toLowerCase().includes("usuário não encontrado") && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between gap-3">
                            <div className="text-xs text-slate-600">
                              <strong className="text-slate-800 block">Ainda não tem cadastro?</strong>
                              Crie sua conta agora aproveitando o e-mail digitado.
                            </div>
                            <button
                              type="button"
                              onClick={irParaCadastro}
                              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold whitespace-nowrap transition"
                            >
                              Criar conta →
                            </button>
                          </div>
                        )}

                      {tipoAcesso !== "plataforma" &&
                        tipoMensagem === "erro" &&
                        (String(mensagem || "").toLowerCase().includes("senha") ||
                          String(mensagem || "").toLowerCase().includes("credenciais")) &&
                        !String(mensagem || "").toLowerCase().includes("usuário não encontrado") && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-center justify-between gap-3">
                            <div className="text-xs text-amber-900">
                              <strong className="block">Esqueceu sua senha?</strong>
                              Receba um código no seu e-mail e crie uma nova senha.
                            </div>
                            <button
                              type="button"
                              onClick={abrirResetSenha}
                              className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold whitespace-nowrap transition"
                            >
                              Redefinir senha
                            </button>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Campo Identificador com Auto-Detecção Inteligente */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        {portalAtivo.labelLogin}
                      </label>
                      {infoIdentificador && (
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            infoIdentificador.ok
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {infoIdentificador.icone} {infoIdentificador.texto}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <EnvelopeIcon className={`h-5 w-5 ${isEmailValido(usuario) ? "text-blue-600" : ""}`} />
                      </div>
                      <input
                        type="email"
                        autoComplete="email"
                        autoFocus
                        placeholder={portalAtivo.placeholderLogin}
                        value={usuario}
                        onChange={(e) => {
                          setUsuario(e.target.value);
                          setMensagem("");
                        }}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-slate-50/60 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Campo Senha com Olho Mostrar/Ocultar + Detector Caps Lock */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">Senha de acesso</label>
                      {tipoAcesso !== "plataforma" && isEmailValido(usuario) && (
                        <button
                          type="button"
                          onClick={abrirResetSenha}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                        >
                          Esqueceu a senha?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <LockClosedIcon className="h-5 w-5" />
                      </div>
                      <input
                        type={showSenha ? "text" : "password"}
                        placeholder="Digite sua senha"
                        value={senha}
                        onKeyUp={checarCapsLock}
                        onKeyDown={checarCapsLock}
                        onChange={(e) => {
                          setSenha(e.target.value);
                          setMensagem("");
                        }}
                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-slate-50/60 focus:bg-white"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowSenha((v) => !v)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition"
                        title={showSenha ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showSenha ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                    </div>
                    {capsLockAtivo && (
                      <p className="text-[11px] font-semibold text-amber-600 mt-1.5 flex items-center gap-1">
                        <span>⚠️</span> Caps Lock está ativado
                      </p>
                    )}
                  </div>

                  {/* Botão Entrar com Gradiente do Portal */}
                  <button
                    type="submit"
                    disabled={loading || !usuario?.trim() || !senha?.trim()}
                    style={{ background: portalAtivo.btnGradient }}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:opacity-95 hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>Autenticando com segurança...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuar para {portalAtivo.titulo}</span>
                        <ArrowRightIcon className="h-4 w-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </form>

              ) : etapa === "codigo" ? (
                /* ═══ ETAPA 2: 6 CAIXAS INTELIGENTES DE CÓDIGO OTP ═══ */
                <form onSubmit={handleConfirmar} className="space-y-5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                      Verificação em Duas Etapas (2FA)
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                      Digite o código de 6 dígitos
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Enviamos um código de segurança para o e-mail vinculado à sua conta.
                    </p>
                  </div>

                  {mensagem && (
                    <div
                      className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${
                        tipoMensagem === "erro"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-blue-200 bg-blue-50 text-blue-800"
                      }`}
                    >
                      {mensagem}
                    </div>
                  )}

                  {/* 6 Caixas Individuais de OTP */}
                  <div className="flex justify-between gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                    {codigoDigitos.map((dig, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        autoFocus={i === 0}
                        value={dig}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-full h-14 text-center text-2xl font-extrabold rounded-xl border-2 transition-all focus:outline-none ${
                          dig
                            ? "border-blue-600 bg-blue-50/50 text-slate-900 shadow-sm"
                            : "border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-white"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Opção Confiar neste Dispositivo (para Escola e CRE) */}
                  {tipoAcesso !== "plataforma" && (
                    <label
                      htmlFor="confiar-dispositivo"
                      className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                        confirarDispositivo
                          ? "border-blue-400 bg-blue-50/70"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100/70"
                      }`}
                    >
                      <input
                        id="confiar-dispositivo"
                        type="checkbox"
                        checked={confirarDispositivo}
                        onChange={(e) => setConfirarDispositivo(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-blue-600 rounded"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          Confiar neste dispositivo por 90 dias
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Não pediremos código nos próximos acessos neste aparelho pessoal.
                        </div>
                      </div>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={loading || codigo.length !== 6}
                    style={{ background: portalAtivo.btnGradient }}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:opacity-95 transition disabled:opacity-40"
                  >
                    {loading ? "Validando código..." : "Confirmar e Entrar"}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => voltarParaLogin(false)}
                      disabled={loading}
                      className="font-semibold text-slate-500 hover:text-slate-800 transition"
                    >
                      ← Alterar login
                    </button>
                    <button
                      type="button"
                      onClick={handleReenviarCodigo}
                      disabled={loading || cooldown > 0}
                      className="font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400 transition"
                    >
                      {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
                    </button>
                  </div>
                </form>

              ) : etapa === "escola" ? (
                /* ═══ ETAPA 3: SELEÇÃO MULTI-ESCOLA ═══ */
                <form onSubmit={handleConfirmarEscola} className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                      Múltiplos Vínculos Encontrados
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                      {nomeUsuarioLogin ? `Olá, ${nomeUsuarioLogin.split(" ")[0]}!` : "Escolha a instituição"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Selecione em qual unidade você deseja trabalhar nesta sessão:
                    </p>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {escolasVinculadas.map((esc) => {
                      const selecionado = String(usuarioCtxSelecionado) === String(esc.usuario_ctx_id || "");
                      const ultimaUsada = String(localStorage.getItem("last_escola_id") || "") === String(esc.id);
                      return (
                        <label
                          key={String(esc.usuario_ctx_id || esc.id)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            selecionado
                              ? "border-blue-600 bg-blue-50/60 shadow-sm"
                              : "border-slate-200 hover:border-blue-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="escola_ctx"
                              checked={selecionado}
                              onChange={() => {
                                setEscolaSelecionada(String(esc.id));
                                setUsuarioCtxSelecionado(String(esc.usuario_ctx_id || ""));
                                setMensagem("");
                              }}
                              className="h-4 w-4 accent-blue-600"
                            />
                            <div>
                              <div className="text-sm font-bold text-slate-800">
                                {esc.apelido || esc.nome}
                              </div>
                              <div className="text-xs text-slate-500">
                                {esc.nome} • Perfil: <span className="font-semibold uppercase">{esc.perfil}</span>
                              </div>
                            </div>
                          </div>
                          {ultimaUsada && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              Última usada
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={voltarParaCodigo}
                      disabled={loading}
                      className="px-4 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !escolaSelecionada || !usuarioCtxSelecionado}
                      style={{ background: portalAtivo.btnGradient }}
                      className="flex-1 py-3 rounded-xl text-white font-bold text-sm shadow-lg disabled:opacity-40 transition"
                    >
                      {loading ? "Entrando..." : "Acessar Unidade →"}
                    </button>
                  </div>
                </form>

              ) : etapa === "reset_codigo" ? (
                /* ═══ RECUPERAÇÃO DE SENHA — ETAPA 1 ═══ */
                <form onSubmit={handleResetConfirmarCodigo} className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                      Recuperação de Acesso
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">Redefinir sua senha</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Clique em "Enviar código" para receber os 6 dígitos no seu e-mail.
                    </p>
                  </div>

                  {mensagem && (
                    <div
                      className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${
                        tipoMensagem === "erro"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-blue-200 bg-blue-50 text-blue-800"
                      }`}
                    >
                      {mensagem}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="seu.email@email.com.br"
                      value={usuario}
                      readOnly={resetEmailLocked}
                      onChange={(e) => setUsuario(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-100 text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleResetEnviarCodigo}
                      disabled={loading || !isEmailValido(usuario)}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold whitespace-nowrap disabled:opacity-40 transition"
                    >
                      {loading ? "Enviando..." : "Enviar código"}
                    </button>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={resetCodigo}
                    onChange={(e) => setResetCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full py-3 rounded-xl border border-slate-300 text-center font-mono text-xl font-bold tracking-[0.4em] text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => voltarParaLogin(false)}
                      className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || resetCodigo.length !== 6}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 transition"
                    >
                      Validar código
                    </button>
                  </div>
                </form>

              ) : (
                /* ═══ RECUPERAÇÃO DE SENHA — ETAPA 2 (NOVA SENHA) ═══ */
                <form onSubmit={handleResetAlterarSenha} className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                      Código Confirmado
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">Crie sua nova senha</h2>
                  </div>

                  {mensagem && (
                    <div
                      className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${
                        tipoMensagem === "sucesso"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {mensagem}
                    </div>
                  )}

                  <div className="relative">
                    <input
                      type={showResetSenha ? "text" : "password"}
                      placeholder="Nova senha forte"
                      value={resetSenha}
                      onChange={(e) => setResetSenha(e.target.value)}
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetSenha((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400"
                    >
                      {showResetSenha ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {senhaChecks.map((c) => (
                      <div
                        key={c.label}
                        className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                          c.ok ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        <span>{c.ok ? "✓" : "○"}</span>
                        <span>{c.label}</span>
                      </div>
                    ))}
                  </div>

                  <input
                    type={showResetSenha ? "text" : "password"}
                    placeholder="Confirme a nova senha"
                    value={resetConfSenha}
                    onChange={(e) => setResetConfSenha(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />

                  <button
                    type="submit"
                    disabled={loading || !senhaForte(resetSenha) || resetSenha !== resetConfSenha}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-40 transition"
                  >
                    {loading ? "Salvando..." : "Salvar Nova Senha"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
