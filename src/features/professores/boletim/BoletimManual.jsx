// src/features/professores/boletim/BoletimManual.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";

const BIMESTRES = [
  { num: 1, label: "1º Bimestre" },
  { num: 2, label: "2º Bimestre" },
  { num: 3, label: "3º Bimestre" },
  { num: 4, label: "4º Bimestre" },
];

const Spinner = ({ size = 20, color = "#6366f1" }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      border: `3px solid ${color}22`,
      borderTopColor: color,
      display: "inline-block",
      animation: "boletim-spin 0.65s linear infinite",
    }}
  />
);

// Helper para obter iniciais e cores pastel para a foto do aluno
const getStudentBadgeStyle = (name) => {
  const words = String(name || "").trim().split(" ");
  const initials = (words[0]?.[0] || "") + (words[1]?.[0] || "");
  const chars = initials.toUpperCase();
  
  // Hash simples para selecionar paleta coerente
  const code = chars.charCodeAt(0) + (chars.charCodeAt(1) || 0);
  const palettes = [
    { bg: "linear-gradient(135deg, #ffedfa 0%, #ffd6f3 100%)", text: "#db2777" },
    { bg: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", text: "#0369a1" },
    { bg: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)", text: "#047857" },
    { bg: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)", text: "#6d28d9" },
    { bg: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", text: "#b45309" },
  ];
  const selected = palettes[code % palettes.length];
  return { chars, ...selected };
};

export default function BoletimManual() {
  const [turmas, setTurmas] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  
  // Filtros ativos
  const [selectedTurma, setSelectedTurma] = useState("");
  const [selectedDisciplina, setSelectedDisciplina] = useState("");
  const [selectedBimestre, setSelectedBimestre] = useState("1");
  const [ano] = useState(() => new Date().getFullYear());

  // Loaders e Status
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Mensagens
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Lançamentos locais temporários para digitação
  const [lancamentos, setLancamentos] = useState({}); // { [aluno_id]: { nota: string, faltas: string } }
  const [validations, setValidations] = useState({}); // { [aluno_id]: { notaValida: bool, faltasValida: bool } }

  // Carrega as turmas moduladas do professor no início
  const carregarTurmas = useCallback(async () => {
    try {
      setLoadingFilter(true);
      setErrorMsg("");
      const { data } = await api.get("/professores/me/turmas");
      setTurmas(data?.turmas || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Não foi possível carregar as turmas moduladas.");
    } finally {
      setLoadingFilter(false);
    }
  }, []);

  useEffect(() => {
    carregarTurmas();
  }, [carregarTurmas]);

  // Carrega as disciplinas moduladas quando a turma muda
  useEffect(() => {
    if (!selectedTurma) {
      setDisciplinas([]);
      setSelectedDisciplina("");
      return;
    }

    const carregarDisciplinas = async () => {
      try {
        setLoadingFilter(true);
        const { data } = await api.get(`/professores/me/turmas/${selectedTurma}/disciplinas`);
        setDisciplinas(data?.disciplinas || []);
        if (data?.disciplinas?.length > 0) {
          // Auto seleciona a primeira se houver apenas uma
          if (data.disciplinas.length === 1) {
            setSelectedDisciplina(data.disciplinas[0].id);
          } else {
            setSelectedDisciplina("");
          }
        } else {
          setSelectedDisciplina("");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Erro ao buscar disciplinas desta turma.");
      } finally {
        setLoadingFilter(false);
      }
    };

    carregarDisciplinas();
  }, [selectedTurma]);

  // Carrega os alunos e as notas salvas quando todos os filtros estão preenchidos
  const buscarAlunos = useCallback(async () => {
    if (!selectedTurma || !selectedDisciplina || !selectedBimestre) {
      setAlunos([]);
      setLancamentos({});
      setValidations({});
      return;
    }

    try {
      setLoadingStudents(true);
      setErrorMsg("");
      setSuccessMsg("");
      
      const { data } = await api.get("/professores/boletim/alunos", {
        params: {
          turma_id: selectedTurma,
          disciplina_id: selectedDisciplina,
          bimestre: selectedBimestre,
          ano
        }
      });

      const list = data?.alunos || [];
      setAlunos(list);

      // Preenche os inputs com dados do banco
      const initialLancamentos = {};
      const initialValidations = {};
      list.forEach((al) => {
        initialLancamentos[al.aluno_id] = {
          nota: al.nota !== null ? String(al.nota).replace(".", ",") : "",
          faltas: al.faltas !== null ? String(al.faltas) : "",
        };
        initialValidations[al.aluno_id] = {
          notaValida: true,
          faltasValida: true
        };
      });
      setLancamentos(initialLancamentos);
      setValidations(initialValidations);
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro ao carregar a lista de alunos para o boletim.");
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedTurma, selectedDisciplina, selectedBimestre, ano]);

  useEffect(() => {
    buscarAlunos();
  }, [buscarAlunos]);

  // Trata digitação e validações reativas
  const handleInputChange = (alunoId, field, val) => {
    let cleanVal = val;
    
    // Se for nota, normaliza apenas caracteres válidos (números, vírgula ou ponto)
    if (field === "nota") {
      cleanVal = val.replace(/[^0-9.,]/g, "");
    } else if (field === "faltas") {
      cleanVal = val.replace(/[^0-9]/g, ""); // Apenas inteiros positivos
    }

    const updated = {
      ...lancamentos,
      [alunoId]: {
        ...lancamentos[alunoId],
        [field]: cleanVal
      }
    };
    setLancamentos(updated);

    // Validação em tempo real
    let isNotaValida = true;
    let isFaltasValida = true;

    const notaStr = updated[alunoId]?.nota;
    if (notaStr !== "") {
      const parsedNota = parseFloat(String(notaStr).replace(",", "."));
      if (Number.isNaN(parsedNota) || parsedNota < 0 || parsedNota > 10) {
        isNotaValida = false;
      }
    }

    const faltasStr = updated[alunoId]?.faltas;
    if (faltasStr !== "") {
      const parsedFaltas = parseInt(faltasStr, 10);
      if (Number.isNaN(parsedFaltas) || parsedFaltas < 0) {
        isFaltasValida = false;
      }
    }

    setValidations({
      ...validations,
      [alunoId]: {
        notaValida: isNotaValida,
        faltasValida: isFaltasValida
      }
    });
  };

  // Atalhos de teclado para navegação vertical ágil (ArrowUp e ArrowDown)
  const handleKeyDown = (e, field, index) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = document.getElementById(`input-${field}-${index + 1}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = document.getElementById(`input-${field}-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Verifica se o formulário inteiro está válido
  const isFormValido = () => {
    return Object.values(validations).every((v) => v.notaValida && v.faltasValida);
  };

  // Submissão / Salvar em lote
  const handleSalvar = async () => {
    if (!isFormValido()) {
      setErrorMsg("Por favor, corrija os valores inválidos destacados em vermelho antes de salvar.");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      const payload = alunos.map((al) => {
        const item = lancamentos[al.aluno_id];
        const nStr = item?.nota ? String(item.nota).replace(",", ".") : "";
        const fStr = item?.faltas || "";
        
        return {
          aluno_id: al.aluno_id,
          nota: nStr !== "" ? parseFloat(nStr) : null,
          faltas: fStr !== "" ? parseInt(fStr, 10) : null
        };
      });

      await api.post("/professores/boletim/salvar", {
        turma_id: selectedTurma,
        disciplina_id: selectedDisciplina,
        bimestre: selectedBimestre,
        ano,
        lancamentos: payload
      });

      setSuccessMsg("Boletim atualizado com sucesso no banco de dados!");
      window.scrollTo({ top: 0, behavior: "smooth" });
      
      // Re-carrega para fixar os dados limpos
      setTimeout(() => buscarAlunos(), 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "Ocorreu um erro ao salvar o boletim.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes boletim-spin { to { transform: rotate(360deg); } }
        @keyframes boletim-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .boletim-animate-fade { animation: boletim-fadein 0.35s ease both; }
      `}</style>

      <div className="flex flex-col gap-0 w-full padding-bottom-40 boletim-animate-fade">
        
        {/* ── HEADER PREMIUM ── */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)",
            borderRadius: 20,
            padding: "28px 32px",
            marginBottom: 28,
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.25)",
          }}
        >
          <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(99,102,241,0.15)" }} />
          <div style={{ position: "absolute", right: 80, bottom: -60, width: 140, height: 140, borderRadius: "50%", background: "rgba(139,92,246,0.1)" }} />

          <div style={{ position: "relative" }}>
            <div className="flex items-center gap-4 mb-3">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  boxShadow: "0 8px 24px rgba(59, 130, 246, 0.4)",
                }}
              >
                📊
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white m-0">
                  Boletim Escolar
                </h1>
                <p className="text-sm text-gray-300 mt-1 m-0">
                  Lançamento de Notas Finais e Faltas Manuais de cada Bimestre
                </p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap mt-3">
              {[
                { icon: "🎯", label: "Nota Final Bimestral" },
                { icon: "📅", label: `Ano Letivo ${ano}` },
                { icon: "🛡️", label: "Governança da Direção" },
                { icon: "⚡", label: "Teclado Rápido (Up/Down)" },
              ].map((tag, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-gray-300 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {tag.icon} {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── MENSAGENS INLINE ── */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-sm font-semibold m-0">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl border border-green-200 bg-green-50 text-green-800 flex items-center gap-3">
            <span className="text-xl">✨</span>
            <p className="text-sm font-semibold m-0">{successMsg}</p>
          </div>
        )}

        {/* ── CARD FILTROS ── */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🔍</span>
            <h2 className="text-base font-extrabold text-gray-800 m-0">
              Filtros de Seleção
            </h2>
            {loadingFilter && <Spinner size={16} />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Turma */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Turma
              </label>
              <select
                value={selectedTurma}
                onChange={(e) => setSelectedTurma(e.target.value)}
                disabled={loadingFilter || saving}
                className="w-full h-11 px-3 border border-gray-250 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-semibold transition"
              >
                <option value="">Selecione uma turma...</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.turno})
                  </option>
                ))}
              </select>
            </div>

            {/* Disciplina */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Disciplina
              </label>
              <select
                value={selectedDisciplina}
                onChange={(e) => setSelectedDisciplina(e.target.value)}
                disabled={loadingFilter || !selectedTurma || saving}
                className="w-full h-11 px-3 border border-gray-250 rounded-xl bg-gray-50 disabled:opacity-60 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-semibold transition"
              >
                <option value="">
                  {!selectedTurma ? "Selecione primeiro a turma..." : "Selecione uma disciplina..."}
                </option>
                {disciplinas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Bimestre */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Bimestre
              </label>
              <div className="flex gap-2 w-full h-11 border border-gray-200 bg-gray-50 p-1 rounded-xl">
                {BIMESTRES.map((b) => {
                  const act = selectedBimestre === String(b.num);
                  return (
                    <button
                      key={b.num}
                      type="button"
                      onClick={() => setSelectedBimestre(String(b.num))}
                      disabled={saving}
                      className={`flex-1 rounded-lg text-xs font-extrabold transition ${
                        act
                          ? "bg-white shadow text-indigo-700 border border-gray-150"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {b.num}º Bim
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── LISTA DE LANÇAMENTO ── */}
        {!selectedTurma || !selectedDisciplina ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "#fff",
              borderRadius: 20,
              border: "2px dashed #e2e8f0",
              color: "#94a3b8",
            }}
          >
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-base font-bold text-gray-600 m-0">Aguardando Seleção</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto m-0">
              Selecione a turma e a disciplina nos filtros acima para carregar a lista de estudantes.
            </p>
          </div>
        ) : loadingStudents ? (
          <div className="bg-white rounded-2xl p-12 flex flex-col items-center justify-center gap-4 shadow-sm border border-gray-150">
            <Spinner size={36} color="#6366f1" />
            <p className="text-sm font-semibold text-gray-500 m-0">Carregando lista de estudantes...</p>
          </div>
        ) : alunos.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-150">
            <div className="text-4xl mb-3">🤷</div>
            <h3 className="text-base font-bold text-gray-600 m-0">Nenhum Aluno Ativo</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto m-0">
              Não encontramos alunos com matrícula ativa nesta turma para o ano letivo de {ano}.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden">
            
            {/* Header da Tabela */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-150 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <div className="col-span-1 text-center">Nº</div>
              <div className="col-span-2">RE / Matrícula</div>
              <div className="col-span-5">Nome do Estudante</div>
              <div className="col-span-2 text-center">Nota Final</div>
              <div className="col-span-2 text-center">Faltas</div>
            </div>

            {/* Linhas de Alunos */}
            <div className="divide-y divide-gray-100">
              {alunos.map((al, idx) => {
                const badge = getStudentBadgeStyle(al.nome);
                const isNotaInvalida = !validations[al.aluno_id]?.notaValida;
                const isFaltasInvalida = !validations[al.aluno_id]?.faltasValida;

                return (
                  <div
                    key={al.aluno_id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-6 py-4 hover:bg-slate-50/50 transition"
                  >
                    
                    {/* Número Ordenado */}
                    <div className="col-span-1 hidden md:block text-center text-sm font-extrabold text-gray-400">
                      {String(idx + 1).padStart(2, "0")}
                    </div>

                    {/* Matrícula */}
                    <div className="col-span-2 flex items-center md:block gap-2 justify-between">
                      <span className="text-xxs font-bold text-gray-400 uppercase md:hidden">Matrícula:</span>
                      <span className="px-2.5 py-1 text-xs font-mono font-bold text-gray-700 bg-gray-100 rounded-md">
                        {al.matricula || "S/M"}
                      </span>
                    </div>

                    {/* Nome Aluno */}
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="relative w-8.5 h-8.5 flex-shrink-0 flex items-center justify-center">
                        {al.foto ? (
                          <img
                            src={al.foto}
                            alt={al.nome}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const initialsBadge = e.target.nextSibling;
                              if (initialsBadge) initialsBadge.style.display = 'flex';
                            }}
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "1.5px solid #e2e8f0",
                              boxShadow: "0 2px 5px rgba(0,0,0,0.06)"
                            }}
                          />
                        ) : null}
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: badge.bg,
                            color: badge.text,
                            display: al.foto ? "none" : "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
                          }}
                        >
                          {badge.chars}
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-gray-800 leading-tight">
                        {al.nome}
                      </span>
                    </div>

                    {/* Nota Input */}
                    <div className="col-span-2 flex items-center md:block gap-2 justify-between">
                      <span className="text-xxs font-bold text-gray-400 uppercase md:hidden">Nota:</span>
                      <div className="w-32 md:w-full mx-auto relative">
                        <input
                          id={`input-nota-${idx}`}
                          type="text"
                          maxLength={5}
                          value={lancamentos[al.aluno_id]?.nota || ""}
                          onChange={(e) => handleInputChange(al.aluno_id, "nota", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, "nota", idx)}
                          disabled={saving}
                          placeholder="0,0"
                          style={{
                            borderWidth: 1.5,
                            outline: "none",
                            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
                            transition: "all 0.15s",
                          }}
                          className={`w-full h-10 px-3 text-center rounded-lg text-sm font-extrabold ${
                            isNotaInvalida
                              ? "border-red-500 bg-red-50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                              : "border-gray-250 focus:border-indigo-500 focus:bg-white"
                          }`}
                        />
                        {isNotaInvalida && (
                          <span className="absolute -bottom-4 left-0 right-0 text-center text-xxs font-extrabold text-red-600">
                            0,0 a 10,0
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Faltas Input */}
                    <div className="col-span-2 flex items-center md:block gap-2 justify-between">
                      <span className="text-xxs font-bold text-gray-400 uppercase md:hidden">Faltas:</span>
                      <div className="w-32 md:w-full mx-auto relative">
                        <input
                          id={`input-faltas-${idx}`}
                          type="text"
                          maxLength={3}
                          value={lancamentos[al.aluno_id]?.faltas || ""}
                          onChange={(e) => handleInputChange(al.aluno_id, "faltas", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, "faltas", idx)}
                          disabled={saving}
                          placeholder="0"
                          style={{
                            borderWidth: 1.5,
                            outline: "none",
                            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
                            transition: "all 0.15s",
                          }}
                          className={`w-full h-10 px-3 text-center rounded-lg text-sm font-extrabold ${
                            isFaltasInvalida
                              ? "border-red-500 bg-red-50 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                              : "border-gray-250 focus:border-indigo-500 focus:bg-white"
                          }`}
                        />
                        {isFaltasInvalida && (
                          <span className="absolute -bottom-4 left-0 right-0 text-center text-xxs font-extrabold text-red-600">
                            Inválido
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Barra de Ações do Rodapé */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-150 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-semibold m-0">
                  Total de Alunos: <b className="text-gray-700 font-extrabold">{alunos.length}</b>
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-400 font-semibold m-0">
                  Status do Formulário:{" "}
                  <b className={isFormValido() ? "text-green-600 font-extrabold" : "text-red-500 font-extrabold"}>
                    {isFormValido() ? "✓ Válido" : "✗ Contém Erros"}
                  </b>
                </span>
              </div>

              <button
                type="button"
                onClick={handleSalvar}
                disabled={saving || !isFormValido()}
                className="w-full md:w-auto px-8 h-11 text-xs font-bold uppercase tracking-wider rounded-xl text-white flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
                }}
              >
                {saving ? (
                  <>
                    <Spinner size={16} color="#ffffff" />
                    <span>Salvando dados...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Salvar Boletim</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </>
  );
}
