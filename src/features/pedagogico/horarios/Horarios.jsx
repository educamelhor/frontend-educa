// src/features/pedagogico/Horarios.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserPlusIcon,
  CalculatorIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import api from "../../../services/api";




export default function Horarios() {
  const [turnos, setTurnos] = useState([]);
  const [turnoSelecionado, setTurnoSelecionado] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [turmasTurno, setTurmasTurno] = useState([]);
  const [escola, setEscola] = useState("");
  const [alocacoes, setAlocacoes] = useState([]);


  // Buscar todas as disciplina no banco
  const [disciplinas, setDisciplinas] = useState([]);

  useEffect(() => {
    api.get("/api/disciplinas").then(res => setDisciplinas(res.data));
  }, []);

  function getCargaDisciplina(prof) {
    // Ajuste o nome conforme o campo correto na tabela de disciplinas (normalmente "carga" ou "aulas")
    const disciplina = disciplinas.find(
      d => d.id === prof.disciplina_id);
    return disciplina ? (disciplina.carga || disciplina.aulas || 0) : 0;
  }
  
  // Função auxiliar para buscar a carga da disciplina do professor
  function getAlocacoesPorProfessor(profId) {
  // Só conta as alocações que realmente têm turma (não turmaId null)
  return alocacoes.filter(a => a.profId === profId && a.turmaId != null).length;
  }

 





  // Pra saber se uma célula está marcada
  const isAlocado = (profId, turmaId) =>
  alocacoes.some(a => a.profId === profId && a.turmaId === turmaId);

  // Professores
  const [professoresDisponiveis, setProfessoresDisponiveis] = useState([]);
  const [professoresTabela, setProfessoresTabela] = useState([]);
  const [dropdownProfOpen, setDropdownProfOpen] = useState(false);

  // Modal Quantidade Aulas (mantido para próximo passo)
  const [modalOpen, setModalOpen] = useState(false);

  // Refs para fechar dropdowns ao clicar fora
  const dropdownRef = useRef();
  const dropdownProfRef = useRef();

  // Buscar turnos ao montar
  useEffect(() => {
    api.get("/api/turmas")
      .then(res => {
        const unicos = Array.from(new Set(res.data.map(t => t.turno))).filter(Boolean);
        setTurnos(unicos);
      });
  }, []);


  // Buscar o objeto completo da escola (pega a primeira por enquanto)
  useEffect(() => {
    api.get("/api/escolas").then(res => {
      if (res.data && res.data.length > 0) setEscola(res.data[0]);
    });
  }, []);


  // Buscar grade horária salva no banco ao selecionar o turno
  useEffect(() => {
    if (!turnoSelecionado || !disciplinas.length) {
      setTurmasTurno([]);
      setProfessoresTabela([]);
      setAlocacoes([]);
      return;
    }

    api.get(`/api/horarios?turno=${encodeURIComponent(turnoSelecionado)}`)
      .then(res => {
        setTurmasTurno(res.data.turmas || []);

        const professoresUnicos = [];
        const vistos = new Set();





console.log("Alocações recebidas:", res.data.alocacoes);
console.log("Disciplinas carregadas:", disciplinas);








        (res.data.alocacoes || []).forEach(a => {
          if (!vistos.has(a.professor_id)) {
            professoresUnicos.push({
              id: a.professor_id,
              nome: a.professor_nome,
              disciplina_id: a.disciplina_id,
              disciplina_nome: a.disciplina_nome,
              aulas: a.aulas // <-- usa o valor das aulas do professor, não da disciplina!
            });
            vistos.add(a.professor_id);
          }
        });







        setProfessoresTabela(professoresUnicos);

        setAlocacoes(
          (res.data.alocacoes || []).map(a => ({
            profId: a.professor_id,
            turmaId: a.turma_id
          }))
        );
      })
      .catch(() => {
        setTurmasTurno([]);
        setProfessoresTabela([]);
        setAlocacoes([]);
      });
  }, [turnoSelecionado, disciplinas]);

  












  // Buscar professores ao montar
  useEffect(() => {
    api.get("/api/professores").then(res => {
      setProfessoresDisponiveis(res.data); // todos os professores do banco
    });
  }, []);

  // Atualizar lista de professores disponíveis conforme tabela
  useEffect(() => {
    api.get("/api/professores").then(res => {
      const disponiveis = res.data.filter(
        prof => !professoresTabela.some(p => p.id === prof.id)
      );
      setProfessoresDisponiveis(disponiveis);
    });
  }, [professoresTabela]);

  // Fecha dropdown de turnos ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Fecha dropdown de professores ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownProfRef.current && !dropdownProfRef.current.contains(event.target)) {
        setDropdownProfOpen(false);
      }
    }
    if (dropdownProfOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownProfOpen]);

  // Função utilitária para obter primeiro nome
  const getPrimeiroNome = nome => nome?.split(" ")[0] || "";



  function handleAlocar(prof, turma) {
    const cargaDisciplina = getCargaDisciplina(prof); // quanto vale cada alocação
    const aulasRestantes = prof.aulas - getAlocacoesPorProfessor(prof.id) * cargaDisciplina;

    if (isAlocado(prof.id, turma.id)) {
      // Remover alocação (desfazer check)
      setAlocacoes(prev => prev.filter(a => !(a.profId === prof.id && a.turmaId === turma.id)));
    } else {
      if (aulasRestantes <= 0) {
        alert("Professor já está alocado em todas as turmas possíveis!");
        return;
      }
      if (aulasRestantes < cargaDisciplina) {
        alert("Professor não tem aula suficiente para ser alocado nessa turma.");
        return;
      }
      setAlocacoes(prev => [...prev, { profId: prof.id, turmaId: turma.id }]);
    }
  }


  
  function handleSalvarHorarios() {
    if (!professoresTabela.length) {
      alert("Nenhum professor na tabela para salvar!");
      return;
    }
    if (!escola?.id) {
      alert("ID da escola não encontrado!");
      return;
    }

    // 2) Monta o payload, salvando todos os professores,
    //    mesmo os que não estão alocados em turma nenhuma
    const payload = professoresTabela.flatMap((prof) => {
      const turmasAlocadas = alocacoes
        .filter(a => a.profId === prof.id)
        .map(a => a.turmaId);

      // Se não houver alocação, salva professor com turma_id: null
      if (turmasAlocadas.length === 0) {
        return [{
          escola_id: escola.id,
          professor_id: prof.id,
          turma_id: null,
          disciplina_id: prof.disciplina_id,
          aulas: prof.aulas
        }];
      }
      // para cada turma alocada, um registro
      return turmasAlocadas.map(turmaId => ({
        escola_id: escola.id,
        professor_id: prof.id,
        turma_id: turmaId,
        disciplina_id: prof.disciplina_id,
        aulas: prof.aulas
      }));
    });

    // 3) Envia ao backend normalmente
    api.post("/api/horarios", payload)
      .then(() => alert("Horários salvos com sucesso!"))
      .catch(() => alert("Erro ao salvar horários."));
  }










  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      {/* Título */}
      <div className="flex items-center gap-2 mb-6">
        <ClockIcon className="w-8 h-8 text-blue-900" />
        <h1 className="text-3xl font-bold text-blue-900">Grade Horária</h1>
      </div>

      {/* Botões superiores */}


  <div className="flex items-center justify-between mb-8">
    {/* Botões à esquerda */}
    <div className="flex gap-4 items-center">
      {/* Botão Escolher Turno */}
      <div className="relative" ref={dropdownRef}>
        <button
          className="flex items-center bg-blue-700 text-white font-medium px-6 py-2 rounded shadow hover:bg-blue-800 transition"
          onClick={() => setDropdownOpen(open => !open)}
          type="button"
        >
          {(dropdownOpen ? <ChevronUpIcon className="w-5 h-5 mr-2" /> : <ChevronDownIcon className="w-5 h-5 mr-2" />)}
          {turnoSelecionado ? turnoSelecionado.toUpperCase() : "ESCOLHER TURNO"}
        </button>
        {/* Dropdown */}
        {dropdownOpen && (
          <ul className="absolute z-50 mt-2 left-0 w-full bg-white border rounded shadow text-blue-900">
            {turnos.length === 0 && (
              <li className="px-4 py-2 text-gray-500">Nenhum turno encontrado</li>
            )}
            {turnos.filter(Boolean).map((turno, idx) => (
              <li
                key={turno}
                className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => {
                  setTurnoSelecionado(turno);
                  setDropdownOpen(false);
                }}
              >
                {turno.toUpperCase()}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Botão Inserir Professor */}
      <div className="relative" ref={dropdownProfRef}>
        <button
          className="flex items-center bg-green-600 text-white font-medium px-6 py-2 rounded shadow hover:bg-green-700 transition"
          onClick={() => setDropdownProfOpen(open => !open)}
          type="button"
          disabled={!turnoSelecionado}
          title={!turnoSelecionado ? "Escolha um turno primeiro" : ""}
        >
          <UserPlusIcon className="w-5 h-5 mr-2" />
          Inserir Professor
        </button>
        {/* Dropdown */}
        {dropdownProfOpen && (
          <ul className="absolute z-50 mt-2 left-0 w-full bg-white border rounded shadow text-blue-900">
            {professoresDisponiveis.length === 0 && (
              <li className="px-4 py-2 text-gray-500">Nenhum professor encontrado</li>
            )}
            {professoresDisponiveis.map((prof) => (
              <li
                key={prof.id}
                className="px-4 py-2 hover:bg-green-100 cursor-pointer"
                onClick={() => {
                  setProfessoresTabela(prev => [...prev, prof]);
                  setDropdownProfOpen(false);
                }}
              >
                {getPrimeiroNome(prof.nome)} {prof.disciplina_nome && (
                  <span className="text-xs text-gray-500">
                    ({prof.disciplina_nome.toUpperCase()})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>

    {/* Botão SALVAR à direita */}
    <button
      className="bg-blue-700 text-white font-medium px-6 py-2 rounded shadow hover:bg-blue-800 transition"
      onClick={handleSalvarHorarios}
      disabled={!turnoSelecionado}
    >
      SALVAR
    </button>
  </div>














      {/* Após seleção do turno, mostrar nome da escola e as turmas */}
      {turnoSelecionado && (
        <div className="mb-8">
          {/* Nome da escola */}
          {escola && (
            <div className="text-xl font-semibold text-blue-900 mb-1">{escola.nome}</div>
          )}
          {/* Palavra "PROFESSORES" */}
          <div className="uppercase text-gray-700 mb-3 font-bold tracking-wider text-sm">
            PROFESSORES
          </div>
          {/* Tabela */}




          {turmasTurno.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white shadow rounded border">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border text-blue-900 font-semibold text-center bg-gray-100">
                      Professor
                    </th>
                    <th className="py-2 px-4 border text-blue-900 font-semibold text-center bg-gray-100">
                      Disciplina
                    </th>
                    <th className="py-2 px-4 border text-blue-900 font-semibold text-center bg-gray-100">
                      Aulas
                    </th>
                    {turmasTurno.map((turma) => (
                      <th
                        key={turma.id}
                        className="py-2 px-4 border text-blue-900 font-semibold text-center"
                      >
                        {(turma.nome || turma.turma || "").toUpperCase()}
                      </th>
                    ))}
                  </tr>
               </thead>
               <tbody>
                 {professoresTabela.length === 0 ? (
                   <tr>
                     <td className="text-gray-400 text-center py-8" colSpan={3 + turmasTurno.length}>
                       Nenhum professor inserido para esse turno.
                     </td>
                   </tr>
                 ) : (
                   professoresTabela.map((prof) => (
                     <tr key={prof.id}>
                       {/* ... células da linha ... */}
                       <td className="border px-4 py-2 font-medium bg-gray-50 flex items-center">
                         {getPrimeiroNome(prof.nome)}
                         <button
                           className="ml-2 p-1 rounded hover:bg-red-100"
                           title="Remover Professor"
                           onClick={() => {
                             setProfessoresTabela(prev => prev.filter(p => p.id !== prof.id));
                             setAlocacoes(prev => prev.filter(a => a.profId !== prof.id));
                           }}
                           type="button"
                           tabIndex={-1}
                         >
                           <XMarkIcon className="w-5 h-5 text-red-500" />
                         </button>
                       </td>
                       <td className="border px-4 py-2">
                         {(prof.disciplina_nome || "—").toUpperCase()}
                       </td>
                       <td className="border px-4 py-2 text-center">





{console.log("Render prof", prof.nome, "prof.aulas", prof.aulas, "alocacoes:", getAlocacoesPorProfessor(prof.id), "cargaDisciplina:", getCargaDisciplina(prof))}







                         {getAlocacoesPorProfessor(prof.id) === 0
                           ? prof.aulas
                           : prof.aulas - getAlocacoesPorProfessor(prof.id) * getCargaDisciplina(prof)
                         }
                       </td>
                       {turmasTurno.map(turma => (
                         <td
                           key={turma.id}
                           className="border px-4 py-2 text-center cursor-pointer"
                           onClick={() => handleAlocar(prof, turma)}
                           style={{ background: isAlocado(prof.id, turma.id) ? "#e6ffe6" : undefined }}
                         >
                           {isAlocado(prof.id, turma.id) && (
                             <span style={{ color: "#22c55e", fontSize: 22, display: "inline-block" }}>
                               ✓
                             </span>
                           )}
                         </td>
                       ))}
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
         )}

















        </div>
      )}


      


      
   
















    </div>
  );
}