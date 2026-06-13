import React, { useState, useCallback, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import HeaderGlobal from "./components/layout/HeaderGlobal";
import Home from "./features/home/Home.jsx";
import Alunos from "./features/secretaria/alunos";
import AlunosDisciplinar from "./features/disciplinar/alunos";
import AjustesDisciplinar from "./features/disciplinar/ajustes";
import FOColetivo from "./features/disciplinar/fo-coletivo/FOColetivo";
import ResponsaveisDisciplinar from "./features/disciplinar/responsaveis/index.jsx";
import MetadadosDisciplinar from "./features/disciplinar/metadados";
import RegimentosDisciplinar from "./features/disciplinar/regimentos";
import ManualDisciplinar from "./features/disciplinar/manual";
import SuporteSAC from "./features/disciplinar/suporte";
import HistoricoDisciplinar from "./features/disciplinar/historico";
import AtasDisciplinar from "./features/disciplinar/atas/AtasPage.jsx";
import LiberacaoDisciplinar from "./features/disciplinar/liberacao/LiberacaoPage.jsx";
import Boletim from "./features/boletim/Boletim";
import BoletimAnual from "./features/boletim/BoletimAnual";
import FichaAluno from "./features/alunos/FichaAluno";
import FotoAluno from "./features/alunos/FotoAluno";
import Professores from "./features/secretaria/professores";
import FichaProfessor from "./features/secretaria/professores/FichaProfessor";
import BancoQuestoes from "./features/questoes/BancoQuestoes";
import Secretaria from "./features/secretaria";
import Modulacao from "./features/secretaria/modulacao/Modulacao";
import Redacao from "./features/pedagogico/correcoes/Redacao";
import Gabarito from "./features/pedagogico/correcoes/Gabarito";
import GabaritoModule from "./features/gabarito";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import Login from "./features/login/Login.jsx";
import AtivarDiretor from "./features/login/AtivarDiretor.jsx";
import GerarGabaritos from "./features/impressao/GerarGabaritos";
import ConselhoClasse from "./features/pedagogico/conselho/ConselhoClasse";
import ConteudosAdmin from "./features/pedagogico/conteudos/ConteudosAdmin.jsx";
import ConteudosProgramaticos from "./features/pedagogico/conteudos/ConteudosProgramaticos.jsx";
import Planos from "./features/professores/planos/Planos";
import Avaliacoes from "./features/professores/avaliacoes/Avaliacoes";
import ConteudosProfessor from "./features/professores/conteudos/Conteudos";
import ProvasProfessor from "./features/professores/provas/Provas";
import BoletimManual from "./features/professores/boletim/BoletimManual";
import SolicitacoesConteudos from "./features/pedagogico/coordenacao/SolicitacoesConteudos.jsx";
import LandingPage from "./features/landing/LandingPage";
import PrivacidadePage from "./pages/PrivacidadePage";
import ExcluirContaPage from "./pages/ExcluirContaPage";
import CapturePrivacidadePage from "./pages/CapturePrivacidadePage";
import SuportePage from "./pages/SuportePage";
import Ferramentas from "./features/ferramentas";

// ✅ MÓDULO BIBLIOTECA
import BibliotecaAcervo from "./features/biblioteca/acervo/AcervoPage";
import BibliotecaEmprestimos from "./features/biblioteca/emprestimos/EmprestimosPage";
import BibliotecaAlunos from "./features/biblioteca/alunos/AlunosLeitorPage";
import LeitorDestaque from "./features/biblioteca/leitor-destaque/LeitorDestaquePage";
import BibliotecaConcurso from "./features/biblioteca/concurso/ConcursoPage";
import BibliotecaMetadados from "./features/biblioteca/metadados/MetadadosPage";

// ✅ Direção (Diretor) — Devices EDUCA-CAPTURE
import DiretorPedagogico from "./features/direcao/diretor/DiretorPedagogico.jsx";
import GestaoEquipe from "./features/direcao/gestao-acessos/GestaoEquipe.jsx";
import CadastroMembros from "./features/direcao/cadastro/CadastroMembros.jsx";
import Governanca from "./features/direcao/governanca/Governanca.jsx";

// ✅ PLATAFORMA (CEO) — v1
import PlataformaEscolas from "./features/plataforma/PlataformaEscolas.jsx";
import PlataformaDiretores from "./features/plataforma/PlataformaDiretores.jsx";
import PlataformaAuditoriaRBAC from "./features/plataforma/PlataformaAuditoriaRBAC.jsx";
import PlataformaUsageInsights from "./features/plataforma/PlataformaUsageInsights.jsx";
import UsageEscolaDetalhe from "./features/plataforma/UsageEscolaDetalhe.jsx";
import PlataformaSuporte from "./features/plataforma/PlataformaSuporte.jsx";
import PlataformaGovernanca from "./features/plataforma/PlataformaGovernanca.jsx";
import PlataformaDashboard from "./features/plataforma/PlataformaDashboard.jsx";
import PlataformaModulos from "./features/plataforma/PlataformaModulos.jsx";
import BoletimTurmas from "./features/impressao/BoletimTurmas";
import ListasImpressao from "./features/impressao/ListasImpressao";
import DocumentosImpressao from "./features/impressao/DocumentosImpressao";
import PrintBoletinsTurma from "./features/impressao/PrintBoletinsTurma";
import LoginProfessor from "./features/login/LoginProfessor";
import CadastroUsuario from "./features/login/CadastroUsuario.jsx";
import TabelaCodigos from "./features/secretaria/tabela-codigos";
import HorariosPage from "./features/secretaria/horarios/index.jsx";
import LayoutGrade from "./features/secretaria/horarios/LayoutGrade.jsx";
import ExecutarMock from "./features/secretaria/horarios/ExecutarMock.jsx";
import AgenteCredenciais from "./features/agente-educa/Credenciais";
import AgentePlanos from "./features/agente-educa/AgentePlanos";
import AgenteNotas from "./features/agente-educa/AgenteNotas";

// ✅ MÓDULO FREQUÊNCIA
import Atestados from "./features/frequencia/Atestados.jsx";
import Relatorios from "./features/frequencia/Relatorios.jsx";
import BuscaAtiva from "./features/frequencia/BuscaAtiva.jsx";
import ConselhoTutelar from "./features/frequencia/ConselhoTutelar.jsx";

// ✅ NOVO IMPORT — Configurações Pedagógicas
import ConfiguracoesPedagogicas from "./features/secretaria/horarios/ConfiguracoesPedagogicas.jsx";

// ✅ NOVO IMPORT — EscopoStep (página inicial do módulo Horários)
import EscopoStep from "./features/secretaria/horarios/EscopoStep.jsx";

import MonitoramentoAlertasTeste from "./features/monitoramento/MonitoramentoAlertasTeste.jsx";

// >>> NOVO IMPORT: Monitoramento
import Monitoramento from "./features/monitoramento/Monitoramento.jsx";
import MonitoramentoPainel from "./features/monitoramento/MonitoramentoPainel.jsx";

// ⭐️ NOVO IMPORT: Embeddings — Gerar
import EmbeddingsGerar from "./features/monitoramento/EmbeddingsGerar.jsx";

// ⭐️ NOVO IMPORT: Boletim → Secretaria (Edição)
import BoletimEdicao from "./features/secretaria/boletim/BoletimEdicao.jsx";

// ✅ NOVO IMPORT: Relatórios da Secretaria
import RelatoriosSecretaria from "./features/secretaria/relatorios/RelatoriosSecretaria.jsx";

// ✅ NOVO IMPORT: Relatórios Pedagógicos
import RelatoriosPedagogicos from "./features/pedagogico/relatorios/RelatoriosPedagogicos.jsx";
import PlanoAvaliacaoPage from "./features/pedagogico/relatorios/PlanoAvaliacaoPage.jsx";

// Layout protegido para rotas autenticadas
function ProtectedLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen relative">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <main className="flex-1 p-3 md:p-6 bg-blue-50 overflow-auto w-full">
        <HeaderGlobal onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <Outlet />
      </main>
    </div>
  );
}

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  const payload = parseJwtPayload(token);
  const scope = String(payload?.scope || "").toLowerCase();
  if (scope !== "escola") {
    try { localStorage.removeItem("token"); } catch { }
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequirePlatformAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  const payload = parseJwtPayload(token);
  const scope = String(payload?.scope || "").toLowerCase();
  if (scope !== "plataforma") return <Navigate to="/login" replace />;
  return children;
}

function RequireDiretor({ children }) {
  const p = String(localStorage.getItem('perfil') || '').toLowerCase().trim();
  if (p === 'diretor' || p === 'vice_diretor') return children;
  return <Navigate to="/home" replace />;
}

// Banco de Questões — restrito a Direção + Coordenação (módulo em aprovação)
function RequireBancoQuestoes({ children }) {
  const p = String(localStorage.getItem('perfil') || '').toLowerCase().trim();
  if (p === 'diretor' || p === 'vice_diretor' || p === 'coordenador') return children;
  return <Navigate to="/home" replace />;
}

function RequireDiretorMilitar({ children }) {
  const p = String(localStorage.getItem('perfil') || '').toLowerCase().trim();
  if (p === 'diretor' || p === 'militar') return children;
  return <Navigate to="/disciplinar/alunos" replace />;
}

function RequireCeo({ children }) {
  const perfil = String(localStorage.getItem("perfil") || "").toUpperCase();
  let permissoes = [];
  try {
    const raw = localStorage.getItem("permissoes");
    const arr = raw ? JSON.parse(raw) : [];
    permissoes = Array.isArray(arr) ? arr : [];
  } catch { permissoes = []; }
  const ok = perfil === "SUPER_ADMIN" || perfil === "ADMIN_GLOBAL" || permissoes.includes("plataforma.visualizar");
  if (ok) return children;
  return (
    <div className="bg-white rounded-xl shadow p-6 border border-red-200">
      <h2 className="text-xl font-bold text-red-700">Acesso restrito</h2>
      <p className="mt-2 text-gray-700">A área <b>Plataforma (CEO)</b> só pode ser acessada por <b>SUPER_ADMIN</b> / <b>ADMIN_GLOBAL</b>.</p>
      <p className="mt-2 text-gray-700">Seu perfil atual é: <b>{perfil || "N/D"}</b>.</p>
    </div>
  );
}

function RequirePerm({ perm, children }) {
  let permissoes = [];
  try {
    const raw = localStorage.getItem("permissoes");
    const arr = raw ? JSON.parse(raw) : [];
    permissoes = Array.isArray(arr) ? arr : [];
  } catch { permissoes = []; }
  return permissoes.includes(perm) ? children : <Navigate to="/home" replace />;
}

// ── Módulos: bloqueia rota se módulo não licenciado para esta escola ──
function RequireModulo({ modulo, children }) {
  const getModulos = () => {
    try {
      const raw = localStorage.getItem('modulos_ativos');
      if (!raw) return null; // null = sem restrição (backward compatible)
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch { return null; }
  };
  const modulos = getModulos();
  if (modulos !== null && !modulos.includes(modulo)) {
    return <Navigate to="/home" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/ativar-diretor" element={<AtivarDiretor />} />
        <Route path="/login-professor" element={<LoginProfessor />} />
        <Route path="/cadastro" element={<CadastroUsuario />} />
        <Route path="/privacidade" element={<PrivacidadePage />} />
        <Route path="/excluir-conta" element={<ExcluirContaPage />} />
        {/* EDUCA Mobile — página pública de suporte (App Store: Guideline 1.5.0) */}
        <Route path="/suporte" element={<SuportePage />} />
        {/* EDUCA-CAPTURE — páginas públicas (App Store Connect: support/privacy URLs) */}
        <Route path="/capture/privacidade" element={<CapturePrivacidadePage />} />
        <Route path="/capture/suporte" element={<CapturePrivacidadePage />} />
        <Route path="/print/boletins" element={<PrintBoletinsTurma />} />

        {/* Rotas protegidas da PLATAFORMA */}
        <Route element={<RequirePlatformAuth><ProtectedLayout /></RequirePlatformAuth>}>
          <Route path="/plataforma/dashboard"     element={<RequireCeo><PlataformaDashboard /></RequireCeo>} />
          <Route path="/plataforma/modulos"       element={<RequireCeo><PlataformaModulos /></RequireCeo>} />
          <Route path="/plataforma/escolas"       element={<RequireCeo><PlataformaEscolas /></RequireCeo>} />
          <Route path="/plataforma/diretores"     element={<RequireCeo><PlataformaDiretores /></RequireCeo>} />
          <Route path="/plataforma/auditoria-rbac" element={<RequireCeo><PlataformaAuditoriaRBAC /></RequireCeo>} />
          <Route path="/plataforma/usage"          element={<RequireCeo><PlataformaUsageInsights /></RequireCeo>} />
          <Route path="/plataforma/usage/:id"      element={<RequireCeo><UsageEscolaDetalhe /></RequireCeo>} />
          <Route path="/plataforma/suporte"        element={<RequireCeo><PlataformaSuporte /></RequireCeo>} />
          <Route path="/plataforma/governanca"     element={<RequireCeo><PlataformaGovernanca /></RequireCeo>} />
        </Route>

        {/* Rotas protegidas do SISTEMA ESCOLAR */}
        <Route element={<RequireAuth><ProtectedLayout /></RequireAuth>}>
          <Route path="/home" element={<Home />} />
          <Route path="/alunos" element={<RequireModulo modulo="secretaria.alunos"><Alunos /></RequireModulo>} />

          {/* ── Disciplinar ──────────────────────────────────────────────── */}
          <Route path="/disciplinar/alunos"       element={<RequireModulo modulo="disciplinar"><AlunosDisciplinar /></RequireModulo>} />
          <Route path="/disciplinar/ajustes"      element={<RequireModulo modulo="disciplinar"><AjustesDisciplinar /></RequireModulo>} />
          <Route path="/disciplinar/responsaveis" element={<RequireModulo modulo="disciplinar"><ResponsaveisDisciplinar /></RequireModulo>} />
          {/* F.O. Coletivo — Registro em Lote */}
          <Route path="/disciplinar/fo-coletivo"  element={<RequireModulo modulo="disciplinar"><FOColetivo /></RequireModulo>} />
          {/* Gestão de Equipe (apenas Diretor e Militar) */}
          <Route path="/disciplinar/equipe" element={
            <RequireDiretorMilitar><GestaoEquipe /></RequireDiretorMilitar>
          } />
          <Route path="/disciplinar/historico"  element={<RequireModulo modulo="disciplinar"><HistoricoDisciplinar /></RequireModulo>} />
          <Route path="/disciplinar/atas"       element={<RequireModulo modulo="disciplinar"><AtasDisciplinar /></RequireModulo>} />
          <Route path="/disciplinar/liberacao"  element={<RequireModulo modulo="disciplinar"><LiberacaoDisciplinar /></RequireModulo>} />
          <Route path="/disciplinar/metadados"  element={<RequireModulo modulo="disciplinar"><MetadadosDisciplinar /></RequireModulo>} />
          <Route path="/disciplinar/regimentos" element={<RequireModulo modulo="disciplinar"><RegimentosDisciplinar /></RequireModulo>} />
          <Route path="/disciplinar/manual"     element={<ManualDisciplinar />} />
          <Route path="/disciplinar/suporte"    element={<SuporteSAC />} />

          {/* ── Monitoramento ────────────────────────────────────────────── */}
          <Route path="/monitoramento" element={<RequireModulo modulo="monitoramento"><RequirePerm perm="monitoramento.visualizar"><Monitoramento /></RequirePerm></RequireModulo>} />
          <Route path="/monitoramento/alertas-teste" element={<RequireModulo modulo="monitoramento"><RequirePerm perm="monitoramento.visualizar"><MonitoramentoAlertasTeste /></RequirePerm></RequireModulo>} />
          <Route path="/monitoramento/painel"    element={<RequireModulo modulo="monitoramento"><RequirePerm perm="monitoramento.visualizar"><MonitoramentoPainel /></RequirePerm></RequireModulo>} />
          <Route path="/monitoramento/embeddings" element={<RequireModulo modulo="monitoramento"><RequirePerm perm="monitoramento.visualizar"><EmbeddingsGerar /></RequirePerm></RequireModulo>} />

          {/* ── Alunos individuais ───────────────────────────────────────── */}
          <Route path="/alunos/:codigo/boletim"       element={<Boletim />} />
          <Route path="/alunos/:codigo/boletim-anual" element={<BoletimAnual />} />
          <Route path="/alunos/:codigo/ficha"         element={<FichaAluno />} />
          <Route path="/alunos/:codigo/foto-lote"     element={<FotoAluno />} />
          <Route path="/questoes" element={<RequireModulo modulo="questoes"><RequireBancoQuestoes><BancoQuestoes /></RequireBancoQuestoes></RequireModulo>} />

          {/* ── Secretaria ───────────────────────────────────────────────── */}
          <Route path="/secretaria/professores" element={<RequireModulo modulo="secretaria"><Professores /></RequireModulo>} />
          <Route path="/secretaria/professores/:id/ficha" element={<RequireModulo modulo="secretaria"><FichaProfessor /></RequireModulo>} />
          <Route path="/secretaria/boletim"    element={<RequireModulo modulo="secretaria"><BoletimEdicao /></RequireModulo>} />
          <Route path="/secretaria/relatorios" element={<RequireModulo modulo="secretaria"><RelatoriosSecretaria /></RequireModulo>} />
          <Route path="/secretaria/*"          element={<RequireModulo modulo="secretaria"><Secretaria /></RequireModulo>} />
          <Route path="/secretaria/modulacao"  element={<RequireModulo modulo="secretaria"><Modulacao /></RequireModulo>} />
          <Route path="/secretaria/horarios"   element={<RequireModulo modulo="secretaria"><HorariosPage /></RequireModulo>} />
          <Route path="/secretaria/horarios/configuracoes-pedagogicas" element={<RequireModulo modulo="secretaria"><ConfiguracoesPedagogicas /></RequireModulo>} />
          <Route path="/secretaria/tabela-codigos" element={<RequireModulo modulo="secretaria"><TabelaCodigos /></RequireModulo>} />

          {/* ── Pedagógico ───────────────────────────────────────────────── */}
          <Route path="/pedagogico/correcoes/redacao" element={<Redacao />} />
          {/* Rotas legadas pedagógico/gabarito → redirecionam para /gabarito */}
          <Route path="/pedagogico/gabarito"            element={<Navigate to="/gabarito" replace />} />
          <Route path="/pedagogico/gabarito/imprimir"   element={<Navigate to="/gabarito/gerar" replace />} />
          <Route path="/pedagogico/gabarito/corrigir"   element={<Navigate to="/gabarito/corrigir-lote" replace />} />
          <Route path="/pedagogico/gabarito/resultados" element={<Navigate to="/gabarito/resultados" replace />} />

          {/* ── Gabarito Unificado ─────────────────────────────────────────── */}
          <Route path="/gabarito"              element={<RequireModulo modulo="gabarito"><GabaritoModule /></RequireModulo>} />
          <Route path="/gabarito/gerar"        element={<RequireModulo modulo="gabarito"><GabaritoModule /></RequireModulo>} />
          <Route path="/gabarito/corrigir-lote" element={<RequireModulo modulo="gabarito"><GabaritoModule /></RequireModulo>} />
          <Route path="/gabarito/corrigir"     element={<RequireModulo modulo="gabarito"><GabaritoModule /></RequireModulo>} />
          <Route path="/gabarito/resultados"   element={<RequireModulo modulo="gabarito"><GabaritoModule /></RequireModulo>} />
          <Route path="/pedagogico/conselho" element={<RequireModulo modulo="pedagogico"><ConselhoClasse /></RequireModulo>} />
          <Route path="/professores/conselho" element={<RequireModulo modulo="professores"><ConselhoClasse /></RequireModulo>} />
          <Route path="/pedagogico/conteudos" element={
            <RequireModulo modulo="pedagogico"><RequirePerm perm="conteudos:ver"><ConteudosAdmin /></RequirePerm></RequireModulo>
          } />
          <Route path="/pedagogico/conteudos-programaticos" element={
            <RequireModulo modulo="pedagogico"><RequirePerm perm="conteudos:ver"><ConteudosProgramaticos /></RequirePerm></RequireModulo>
          } />
          <Route path="/pedagogico/coordenacao/solicitacoes" element={<RequireModulo modulo="pedagogico"><SolicitacoesConteudos /></RequireModulo>} />

          {/* ✅ Relatórios Pedagógicos */}
          <Route path="/pedagogico/relatorios" element={<RequireModulo modulo="pedagogico"><RelatoriosPedagogicos /></RequireModulo>} />
          <Route path="/pedagogico/relatorios/plano-avaliacao" element={<RequireModulo modulo="pedagogico"><PlanoAvaliacaoPage /></RequireModulo>} />

          {/* ── Professores ──────────────────────────────────────────────── */}
          <Route path="/professores/planos"     element={<RequireModulo modulo="professores"><Planos /></RequireModulo>} />
          <Route path="/professores/avaliacoes" element={<RequireModulo modulo="professores"><Avaliacoes /></RequireModulo>} />
          <Route path="/professores/conteudos"  element={<RequireModulo modulo="professores"><ConteudosProfessor /></RequireModulo>} />
          <Route path="/professores/provas"     element={<RequireModulo modulo="professores"><ProvasProfessor /></RequireModulo>} />
          <Route path="/pedagogico/provas"      element={<ProvasProfessor />} />
          <Route path="/professores/boletim"    element={<RequireModulo modulo="professores"><BoletimManual /></RequireModulo>} />

          {/* ── Frequência ───────────────────────────────────────────────── */}
          <Route path="/frequencia/atestados"       element={<RequireModulo modulo="frequencia"><Atestados /></RequireModulo>} />
          <Route path="/frequencia/relatorios"      element={<RequireModulo modulo="frequencia"><Relatorios /></RequireModulo>} />
          <Route path="/frequencia/busca-ativa"     element={<RequireModulo modulo="frequencia"><BuscaAtiva /></RequireModulo>} />
          <Route path="/frequencia/conselho-tutelar" element={<RequireModulo modulo="frequencia"><ConselhoTutelar /></RequireModulo>} />

          {/* ── Impressão ────────────────────────────────────────────────── */}
          <Route path="/impressao/gabaritos"   element={<RequireModulo modulo="impressao"><GerarGabaritos /></RequireModulo>} />
          <Route path="/impressao/boletins"    element={<RequireModulo modulo="impressao"><BoletimTurmas /></RequireModulo>} />
          <Route path="/impressao/listas"      element={<RequireModulo modulo="impressao"><ListasImpressao /></RequireModulo>} />
          <Route path="/impressao/documentos"  element={<RequireModulo modulo="impressao"><DocumentosImpressao /></RequireModulo>} />

          {/* ── Horários ─────────────────────────────────────────────────── */}
          <Route path="/secretaria/horarios/layout" element={<LayoutGrade />} />
          <Route path="/secretaria/horarios/mock"   element={<ExecutarMock />} />

          {/* ── Ferramentas ─────────────────────────────────────────────── */}
          <Route path="/ferramentas" element={<RequireModulo modulo="ferramentas"><Ferramentas /></RequireModulo>} />

          {/* ── Biblioteca ──────────────────────────────────────────── */}
          <Route path="/biblioteca/acervo"          element={<RequireModulo modulo="biblioteca"><BibliotecaAcervo /></RequireModulo>} />
          <Route path="/biblioteca/emprestimos"     element={<RequireModulo modulo="biblioteca"><BibliotecaEmprestimos /></RequireModulo>} />
          <Route path="/biblioteca/alunos"          element={<RequireModulo modulo="biblioteca"><BibliotecaAlunos /></RequireModulo>} />
          <Route path="/biblioteca/leitor-destaque" element={<RequireModulo modulo="biblioteca"><LeitorDestaque /></RequireModulo>} />
          <Route path="/biblioteca/concurso"        element={<RequireModulo modulo="biblioteca"><BibliotecaConcurso /></RequireModulo>} />
          <Route path="/biblioteca/metadados"       element={<RequireModulo modulo="biblioteca"><BibliotecaMetadados /></RequireModulo>} />

          {/* ── Agente EDUCA ─────────────────────────────────────────────── */}
          <Route path="/agente-educa/credenciais" element={<RequireModulo modulo="agente_educa"><AgenteCredenciais /></RequireModulo>} />
          <Route path="/agente-educa/planos"      element={<RequireModulo modulo="agente_educa"><AgentePlanos /></RequireModulo>} />
          <Route path="/agente-educa/notas"       element={<RequireModulo modulo="agente_educa"><AgenteNotas /></RequireModulo>} />

          {/* ── Direção ──────────────────────────────────────────────────── */}
          <Route path="/direcao/diretor" element={
            <RequireModulo modulo="direcao"><RequirePerm perm="capture_devices.gerenciar"><DiretorPedagogico /></RequirePerm></RequireModulo>
          } />
          <Route path="/direcao/responsaveis" element={<RequireModulo modulo="direcao"><ResponsaveisDisciplinar /></RequireModulo>} />
          <Route path="/direcao/cadastro" element={
            <RequireModulo modulo="direcao"><RequirePerm perm="capture_devices.gerenciar"><CadastroMembros /></RequirePerm></RequireModulo>
          } />
          <Route path="/direcao/governanca" element={
            <RequireModulo modulo="direcao"><RequireDiretor><Governanca /></RequireDiretor></RequireModulo>
          } />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
