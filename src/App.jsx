import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import HeaderGlobal from "./components/layout/HeaderGlobal";
import Home from "./features/home/Home.jsx";
import Alunos from "./features/secretaria/alunos";
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
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import Login from "./features/login/Login.jsx";
import GerarGabaritos from "./features/impressao/GerarGabaritos";
import ConselhoClasse from "./features/pedagogico/conselho/ConselhoClasse";
import ConteudosAdmin from "./features/pedagogico/conteudos/ConteudosAdmin.jsx";
import AtividadesAvaliativas from "./features/pedagogico/avaliacoes/AtividadesAvaliativas";
import LandingPage from "./features/landing/LandingPage";
import Ferramentas from "./features/ferramentas";
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
*/}


import VisitantesHistorico from "./features/monitoramento/visitantes/VisitantesHistorico.jsx";

// ⭐️ NOVO IMPORT: Embeddings — Gerar
import EmbeddingsGerar from "./features/monitoramento/EmbeddingsGerar.jsx";

// ⭐️ NOVO IMPORT: Boletim → Secretaria (Edição)
import BoletimEdicao from "./features/secretaria/boletim/BoletimEdicao.jsx";

// Layout protegido para rotas autenticadas
function ProtectedLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-blue-50 overflow-auto">
        <HeaderGlobal />
        {children}
      </main>
    </div>
  );
}

// Rotas protegidas
function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas - sem menu/header */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login-professor" element={<LoginProfessor />} />
        <Route path="/cadastro" element={<CadastroUsuario />} />

        {/* 🔓 Rota pública de impressão */}
        <Route path="/print/boletins" element={<PrintBoletinsTurma />} />

        {/* Rotas protegidas */}
        <Route
          path="/*"
          element={
            <RequireAuth>
              <ProtectedLayout>
                <Routes>
                  <Route path="/home" element={<Home />} />
                  <Route path="/alunos" element={<Alunos />} />

                  {/* Monitoramento */}
                  <Route path="/monitoramento" element={<Monitoramento />} />
                  <Route
                    path="/monitoramento/alertas-teste"
                    element={<MonitoramentoAlertasTeste />}
                  />
                  <Route
                    path="/monitoramento/painel"
                    element={<MonitoramentoPainel />}
                  />

                  {/* Visitantes */}
                  {/*
                  <Route
                    path="/monitoramento/visitantes/registrar"
                    element={<VisitantesRegistrar />}
                  />
                  */}
                  <Route
                    path="/monitoramento/visitantes/historico"
                    element={<VisitantesHistorico />}
                  />

                  {/* Embeddings */}
                  <Route
                    path="/monitoramento/embeddings"
                    element={<EmbeddingsGerar />}
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
                  <Route
                    path="/pedagogico/conselho"
                    element={<ConselhoClasse />}
                  />

                  <Route
                    path="/pedagogico/conteudos"
                    element={<ConteudosAdmin />}
                  />







                  <Route
                    path="/_teste/avaliacoes"
                    element={<AtividadesAvaliativas />}
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

                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
              </ProtectedLayout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
