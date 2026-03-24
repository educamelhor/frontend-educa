import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import HeaderGlobal from "./components/layout/HeaderGlobal";
import Home from "./features/home/Home.jsx";
import Alunos from "./features/secretaria/alunos";
import AlunosDisciplinar from "./features/disciplinar/alunos";
import AjustesDisciplinar from "./features/disciplinar/ajustes";
import ResponsaveisDisciplinar from "./features/disciplinar/responsaveis/index.jsx";
import MetadadosDisciplinar from "./features/disciplinar/metadados";
import RegimentosDisciplinar from "./features/disciplinar/regimentos";
import SuporteDisciplinar from "./features/disciplinar/suporte";
import Boletim from "./features/boletim/Boletim";
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
import Planos from "./features/professores/planos/Planos";
import Avaliacoes from "./features/professores/avaliacoes/Avaliacoes";
import ConteudosProfessor from "./features/professores/conteudos/Conteudos";
import ProvasProfessor from "./features/professores/provas/Provas";
import SolicitacoesConteudos from "./features/pedagogico/coordenacao/SolicitacoesConteudos.jsx";
import LandingPage from "./features/landing/LandingPage";
import Ferramentas from "./features/ferramentas";

// ✅ Direção (Diretor) — Devices EDUCA-CAPTURE
import DiretorPedagogico from "./features/direcao/diretor/DiretorPedagogico.jsx";
import GestaoEquipe from "./features/direcao/gestao-acessos/GestaoEquipe.jsx";

// ✅ PLATAFORMA (CEO) — v1
import PlataformaEscolas from "./features/plataforma/PlataformaEscolas.jsx";
import PlataformaDiretores from "./features/plataforma/PlataformaDiretores.jsx";
import PlataformaAuditoriaRBAC from "./features/plataforma/PlataformaAuditoriaRBAC.jsx";
import BoletimTurmas from "./features/impressao/BoletimTurmas";
import PrintBoletinsTurma from "./features/impressao/PrintBoletinsTurma";
import LoginProfessor from "./features/login/LoginProfessor";
import CadastroUsuario from "./features/login/CadastroUsuario.jsx";
import TabelaCodigos from "./features/secretaria/tabela-codigos";
import HorariosPage from "./features/secretaria/horarios/index.jsx";
import LayoutGrade from "./features/secretaria/horarios/LayoutGrade.jsx";
import ExecutarMock from "./features/secretaria/horarios/ExecutarMock.jsx";

// ✅ NOVO IMPORT — Configurações Pedagógicas
import ConfiguracoesPedagogicas from "./features/secretaria/horarios/ConfiguracoesPedagogicas.jsx";

// ✅ NOVO IMPORT — EscopoStep (página inicial do módulo Horários)
import EscopoStep from "./features/secretaria/horarios/EscopoStep.jsx";

import MonitoramentoAlertasTeste from "./features/monitoramento/MonitoramentoAlertasTeste.jsx";

// >>> NOVO IMPORT: Monitoramento
import Monitoramento from "./features/monitoramento/Monitoramento.jsx";
import MonitoramentoPainel from "./features/monitoramento/MonitoramentoPainel.jsx";

// ⭐️ NOVO: Módulo Monitoramento > Visitantes


{/*
   import VisitantesRegistrar from "./features/monitoramento/visitantes/VisitantesRegistrar.jsx";
  import VisitantesHistorico from "./features/monitoramento/visitantes/VisitantesHistorico.jsx";
*/}



// ⭐️ NOVO IMPORT: Embeddings — Gerar
import EmbeddingsGerar from "./features/monitoramento/EmbeddingsGerar.jsx";

// ⭐️ NOVO IMPORT: Boletim → Secretaria (Edição)
import BoletimEdicao from "./features/secretaria/boletim/BoletimEdicao.jsx";

// Layout protegido para rotas autenticadas
function ProtectedLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-blue-50 overflow-auto">
        <HeaderGlobal />
        <Outlet />
      </main>
    </div>
  );
}

// Rotas protegidas (agora exige scope="escola")
function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;

    // base64url -> base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
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

    // ✅ contrato deste módulo: apenas "escola" entra no sistema escolar
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

    if (scope !== "plataforma") {
      return <Navigate to="/login" replace />;
    }

    return children;
  }

  // ✅ Guard simples (v1): só libera PLATAFORMA para SUPER_ADMIN/ADMIN_GLOBAL
  function RequireCeo({ children }) {

  const perfil = String(localStorage.getItem("perfil") || "").toUpperCase();

  let permissoes = [];
  try {
    const raw = localStorage.getItem("permissoes");
    const arr = raw ? JSON.parse(raw) : [];
    permissoes = Array.isArray(arr) ? arr : [];
  } catch {
    permissoes = [];
  }

  const ok =
    perfil === "SUPER_ADMIN" ||
    perfil === "ADMIN_GLOBAL" ||
    permissoes.includes("plataforma.visualizar");

  if (ok) return children;

  return (
    <div className="bg-white rounded-xl shadow p-6 border border-red-200">
      <h2 className="text-xl font-bold text-red-700">Acesso restrito</h2>
      <p className="mt-2 text-gray-700">
        A área <b>Plataforma (CEO)</b> só pode ser acessada por <b>SUPER_ADMIN</b> /
        <b> ADMIN_GLOBAL</b> (ou por quem tiver a permissão <code>plataforma.visualizar</code>).
      </p>
      <p className="mt-2 text-gray-700">
        Seu perfil atual é: <b>{perfil || "N/D"}</b>.
      </p>
    </div>
  );
}


// Guard por permissão (RBAC)
function RequirePerm({ perm, children }) {
  let permissoes = [];
  try {
    const raw = localStorage.getItem("permissoes");
    const arr = raw ? JSON.parse(raw) : [];
    permissoes = Array.isArray(arr) ? arr : [];
  } catch {
    permissoes = [];
  }

  const ok = permissoes.includes(perm);
  return ok ? children : <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas - sem menu/header */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/ativar-diretor" element={<AtivarDiretor />} />
        <Route path="/login-professor" element={<LoginProfessor />} />
        <Route path="/cadastro" element={<CadastroUsuario />} />

        {/* 🔓 Rota pública de impressão */}
        <Route path="/print/boletins" element={<PrintBoletinsTurma />} />

        {/* Rotas protegidas da PLATAFORMA */}
        <Route
          element={
            <RequirePlatformAuth>
              <ProtectedLayout />
            </RequirePlatformAuth>
          }
        >
          <Route
            path="/plataforma/escolas"
            element={
              <RequireCeo>
                <PlataformaEscolas />
              </RequireCeo>
            }
          />
          <Route
            path="/plataforma/diretores"
            element={
              <RequireCeo>
                <PlataformaDiretores />
              </RequireCeo>
            }
          />
          <Route
            path="/plataforma/auditoria-rbac"
            element={
              <RequireCeo>
                <PlataformaAuditoriaRBAC />
              </RequireCeo>
            }
          />
        </Route>

        {/* Rotas protegidas do SISTEMA ESCOLAR */}
        <Route
          element={
            <RequireAuth>
              <ProtectedLayout />
            </RequireAuth>
          }
        >
          <Route path="/home" element={<Home />} />

          <Route path="/alunos" element={<Alunos />} />

          <Route path="/disciplinar/alunos" element={<AlunosDisciplinar />} />
          <Route path="/disciplinar/ajustes" element={<AjustesDisciplinar />} />
          <Route path="/disciplinar/responsaveis" element={<ResponsaveisDisciplinar />} />

          {/* Disciplinar — Gestão de Equipe (apenas Diretor Pedagógico e Comandante) */}
          <Route path="/disciplinar/equipe" element={
            (() => {
              const p = String(localStorage.getItem('perfil') || '').toLowerCase().trim();
              if (p === 'diretor' || p === 'militar') return <GestaoEquipe />;
              return <Navigate to="/disciplinar/alunos" replace />;
            })()
          } />

          {/* Disciplinar — Metadados (Dashboard Analítico) */}
          <Route path="/disciplinar/metadados" element={<MetadadosDisciplinar />} />

          {/* Disciplinar — Regimentos (Biblioteca de Documentos) */}
          <Route path="/disciplinar/regimentos" element={<RegimentosDisciplinar />} />

          {/* Disciplinar — Suporte (Em breve) */}
          <Route path="/disciplinar/suporte" element={<SuporteDisciplinar />} />

          {/* Monitoramento */}
          <Route
            path="/monitoramento"
            element={
              <RequirePerm perm="monitoramento.visualizar">
                <Monitoramento />
              </RequirePerm>
            }
          />
          <Route
            path="/monitoramento/alertas-teste"
            element={
              <RequirePerm perm="monitoramento.visualizar">
                <MonitoramentoAlertasTeste />
              </RequirePerm>
            }
          />
          <Route
            path="/monitoramento/painel"
            element={
              <RequirePerm perm="monitoramento.visualizar">
                <MonitoramentoPainel />
              </RequirePerm>
            }
          />

          {/* Visitantes */}
          {/*
                    <Route
                      path="/monitoramento/visitantes/registrar"
                      element={<VisitantesRegistrar />}
                    />
                    <Route
                      path="/monitoramento/visitantes/historico"
                      element={<VisitantesHistorico />}
                    />
                  */}

          {/* Embeddings */}
          <Route
            path="/monitoramento/embeddings"
            element={
              <RequirePerm perm="monitoramento.visualizar">
                <EmbeddingsGerar />
              </RequirePerm>
            }
          />


          <Route path="/alunos/:codigo/boletim" element={<Boletim />} />
          <Route path="/alunos/:codigo/ficha" element={<FichaAluno />} />
          <Route path="/alunos/:codigo/foto-lote" element={<FotoAluno />} />

          <Route path="/questoes" element={<BancoQuestoes />} />

          {/* Secretaria */}
          <Route path="/secretaria/professores" element={<Professores />} />
          <Route
            path="/secretaria/professores/:id/ficha"
            element={<FichaProfessor />}
          />

          {/* ⭐️ ROTA DO BOLETIM (SECRETARIA) */}
          <Route path="/secretaria/boletim" element={<BoletimEdicao />} />

          <Route path="/secretaria/*" element={<Secretaria />} />
          <Route path="/secretaria/modulacao" element={<Modulacao />} />

          {/* ✅ AJUSTE: Horários agora abre direto no EscopoStep */}
          <Route path="/secretaria/horarios" element={<HorariosPage />} />

          {/* ✅ NOVA ROTA — Configurações Pedagógicas */}
          <Route
            path="/secretaria/horarios/configuracoes-pedagogicas"
            element={<ConfiguracoesPedagogicas />}
          />

          <Route
            path="/secretaria/tabela-codigos"
            element={<TabelaCodigos />}
          />

          {/* Pedagógico */}
          <Route
            path="/pedagogico/correcoes/redacao"
            element={<Redacao />}
          />
          <Route
            path="/pedagogico/correcoes/gabarito"
            element={<Gabarito />}
          />

          {/* ⭐ MÓDULO GABARITO (Novo — Premium) */}
          <Route path="/gabarito" element={<GabaritoModule />} />
          <Route path="/gabarito/gerar" element={<GabaritoModule />} />
          <Route path="/gabarito/corrigir" element={<GabaritoModule />} />
          <Route path="/gabarito/resultados" element={<GabaritoModule />} />
          <Route
            path="/pedagogico/conselho"
            element={<ConselhoClasse />}
          />

          <Route
            path="/pedagogico/conteudos"
            element={
              <RequirePerm perm="conteudos.visualizar">
                <ConteudosAdmin />
              </RequirePerm>
            }
          />


          <Route
            path="/pedagogico/coordenacao/solicitacoes"
            element={<SolicitacoesConteudos />}
          />

          <Route
            path="/professores/planos"
            element={<Planos />}
          />

          <Route
            path="/professores/avaliacoes"
            element={<Avaliacoes />}
          />

          <Route
            path="/professores/conteudos"
            element={<ConteudosProfessor />}
          />

          <Route
            path="/professores/provas"
            element={<ProvasProfessor />}
          />


          {/* Impressão */}
          <Route
            path="/impressao/gabaritos"
            element={<GerarGabaritos />}
          />
          <Route
            path="/impressao/boletins"
            element={<BoletimTurmas />}
          />

          {/* Horários */}
          <Route
            path="/secretaria/horarios/layout"
            element={<LayoutGrade />}
          />
          <Route
            path="/secretaria/horarios/mock"
            element={<ExecutarMock />}
          />

          <Route path="/ferramentas" element={<Ferramentas />} />

          {/* Direção (Diretor) — Devices EDUCA-CAPTURE */}
          <Route
            path="/direcao/diretor"
            element={
              <RequirePerm perm="capture_devices.gerenciar">
                <DiretorPedagogico />
              </RequirePerm>
            }
          />

          {/* Direção — Responsáveis (cópia do Disciplinar) */}
          <Route path="/direcao/responsaveis" element={<ResponsaveisDisciplinar />} />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
