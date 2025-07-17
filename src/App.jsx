// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import HeaderGlobal from "./components/layout/HeaderGlobal"; // IMPORTADO AQUI
import Home from "./features/home/Home.jsx";
import Alunos from "./features/alunos";
import Boletim from "./features/alunos/Boletim";
import FichaAluno from "./features/alunos/FichaAluno";
import FotoAluno from "./features/alunos/FotoAluno";
import Professores from "./features/professores";
import FichaProfessor from "./features/professores/FichaProfessor";
import BancoQuestoes from "./features/questoes/BancoQuestoes";
import Secretaria from "./features/secretaria";
import ListaDisciplinas from "./features/secretaria/disciplinas/ListaDisciplinas";
import ListaAlunos from "./features/secretaria/alunos/ListaAlunos";
import Horarios from "./features/pedagogico/horarios/Horarios";
import Redacao from "./features/pedagogico/correcoes/Redacao";
import Gabarito from "./features/pedagogico/correcoes/Gabarito";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
// import VoiceAssistant from "./components/VoiceAssistant";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen">
        {/* 1) Menu lateral unificado */}
        <Sidebar />

        {/* 2) Conteúdo principal */}
        <main className="flex-1 p-6 bg-blue-50 overflow-auto">
          <HeaderGlobal /> {/* AQUI ENTRA O HEADER NOVO */}
          {/* <VoiceAssistant /> */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/alunos" element={<Alunos />} />
            <Route path="/alunos/:codigo/boletim" element={<Boletim />} />
            <Route path="/alunos/:codigo/ficha" element={<FichaAluno />} />
            <Route path="/alunos/:codigo/foto-lote" element={<FotoAluno />} />

            <Route path="/questoes" element={<BancoQuestoes />} />

            <Route path="/professores" element={<Professores />} />
            <Route path="/professores/:id/ficha" element={<FichaProfessor />} />

            <Route path="/secretaria/*" element={<Secretaria />} />
            {/* <Route path="/secretaria/alunos" element={<ListaAlunos />} /> */}
            <Route path="/pedagogico/horarios" element={<Horarios />} />
            <Route path="/pedagogico/correcoes/redacao" element={<Redacao />} />
            <Route path="/pedagogico/correcoes/gabarito" element={<Gabarito />} />

            {/* catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
