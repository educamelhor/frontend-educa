// src/features/secretaria/boletim/BoletimEdicao.jsx
// ============================================================================
// Tela de Gestão de Boletim (Edição pela Secretaria)
// - Topo com 4 cards de bimestres + switches (edição professores / visibilidade / bianual)
// - Barra de busca inteligente (código, estudante, turma)
// - Lista de alunos filtrada à esquerda
// - Ao clicar no aluno, carrega-se as disciplinas da turma e as notas do bimestre selecionado.
// - Nesta primeira fase usamos dados mock apenas para layout.
// ============================================================================

import React, { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Componente de botão liga/desliga
// ---------------------------------------------------------------------------
function TogglePill({ label, enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition
        ${enabled ? "bg-emerald-500 text-white" : "bg-gray-300 text-gray-700"}`}
    >
      <span
        className={`inline-block w-3 h-3 rounded-full mr-2 transition
        ${enabled ? "bg-white" : "bg-gray-500"}`}
      />
      {label}
    </button>
  );
}

// ============================================================================
// MOCKS (somente para visual)
// ============================================================================
const MOCK_ALUNOS = [
  { id: 1, codigo: "2023001", nome: "Ana Beatriz Souza", turma: "7º A" },
  { id: 2, codigo: "2023002", nome: "Bruno Silva", turma: "7º A" },
  { id: 3, codigo: "2023003", nome: "Carolina Lima", turma: "7º B" },
  { id: 4, codigo: "2023004", nome: "Diego Rocha", turma: "8º A" },
];

const MOCK_DISCIPLINAS = [
  { id: 10, nome: "Matemática" },
  { id: 11, nome: "Português" },
  { id: 12, nome: "Ciências" },
  { id: 13, nome: "Geografia" },
  { id: 14, nome: "História" },
];

const MOCK_NOTAS = {
  "1-10-1": 8.5,
  "1-11-1": 7.2,
  "1-12-1": 9.0,
  "2-10-1": 6.8,
  "2-11-1": 7.0,
  "3-10-1": 9.5,
};

function getKey(alunoId, disciplinaId, bimestre) {
  return `${alunoId}-${disciplinaId}-${bimestre}`;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function BoletimEdicao() {
  // Agora cada bimestre tem 3 controles
  const [controlesBimestre, setControlesBimestre] = useState({
    1: { edicaoProf: true, visivelPais: false, bianual: false },
    2: { edicaoProf: false, visivelPais: false, bianual: false },
    3: { edicaoProf: false, visivelPais: false, bianual: false },
    4: { edicaoProf: false, visivelPais: false, bianual: false },
  });

  const [bimestreSelecionado, setBimestreSelecionado] = useState(1);

  const [busca, setBusca] = useState("");

  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  const [notasEdicao, setNotasEdicao] = useState({});

  // ---------------------------------------------------------------------------
  // Lista filtrada
  // ---------------------------------------------------------------------------
  const listaFiltrada = useMemo(() => {
    if (!busca.trim()) return MOCK_ALUNOS;
    const q = busca.trim().toLowerCase();
    return MOCK_ALUNOS.filter((a) => {
      return (
        a.codigo.toLowerCase().includes(q) ||
        a.nome.toLowerCase().includes(q) ||
        a.turma.toLowerCase().includes(q)
      );
    });
  }, [busca]);

  // ---------------------------------------------------------------------------
  // Notas
  // ---------------------------------------------------------------------------
  function getNotaAtual(alunoId, disciplinaId) {
    const key = getKey(alunoId, disciplinaId, bimestreSelecionado);
    if (key in notasEdicao) return notasEdicao[key];
    if (key in MOCK_NOTAS) return MOCK_NOTAS[key];
    return "";
  }

  function handleChangeNota(alunoId, disciplinaId, value) {
    const key = getKey(alunoId, disciplinaId, bimestreSelecionado);
    setNotasEdicao((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSalvarNotas() {
    if (!alunoSelecionado) return;

    console.log("Simulação salvar:", {
      aluno: alunoSelecionado,
      bimestre: bimestreSelecionado,
      notas: Object.fromEntries(
        MOCK_DISCIPLINAS.map((d) => {
          const key = getKey(alunoSelecionado.id, d.id, bimestreSelecionado);
          return [key, getNotaAtual(alunoSelecionado.id, d.id)];
        })
      ),
    });

    alert("Simulação de salvamento (fase designer).");
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const bimestres = [
    { id: 1, label: "1º Bimestre", cor: "from-blue-500 to-blue-600" },
    { id: 2, label: "2º Bimestre", cor: "from-emerald-500 to-emerald-600" },
    { id: 3, label: "3º Bimestre", cor: "from-amber-500 to-amber-600" },
    { id: 4, label: "4º Bimestre", cor: "from-rose-500 to-rose-600" },
  ];

  return (
    <div className="flex-1 bg-blue-50 min-h-screen">
      <div className="px-6 py-6 space-y-6">

        {/* TÍTULO */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
              Gestão de Boletim
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Controle de notas por bimestre, visibilidade e regras de edição.
            </p>
          </div>
        </header>

        {/* =======================================================================
            BANNERS DE BIMESTRE
        =======================================================================*/}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {bimestres.map((b) => {
            const ctrl = controlesBimestre[b.id];
            const ativo = bimestreSelecionado === b.id;

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBimestreSelecionado(b.id)}
                className={`relative rounded-xl shadow transition transform hover:-translate-y-0.5 text-left
                  bg-gradient-to-r ${b.cor} text-white p-4 ${
                  ativo ? "ring-2 ring-offset-2 ring-white/70" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wide">
                    {b.label}
                  </span>

                  {ativo && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      Bimestre ativo
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {/* --- Edição Professores --- */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Edição professores</span>
                    <TogglePill
                      label={ctrl.edicaoProf ? "Liberada" : "Bloqueada"}
                      enabled={ctrl.edicaoProf}
                      onChange={(value) =>
                        setControlesBimestre((prev) => ({
                          ...prev,
                          [b.id]: { ...prev[b.id], edicaoProf: value },
                        }))
                      }
                    />
                  </div>

                  {/* --- Visível para pais/alunos --- */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Visível para pais/alunos</span>
                    <TogglePill
                      label={ctrl.visivelPais ? "Visível" : "Oculto"}
                      enabled={ctrl.visivelPais}
                      onChange={(value) =>
                        setControlesBimestre((prev) => ({
                          ...prev,
                          [b.id]: { ...prev[b.id], visivelPais: value },
                        }))
                      }
                    />
                  </div>

                  {/* --- NOVO: BOLETIM BIANUAL --- */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Boletim bianual</span>
                    <TogglePill
                      label={ctrl.bianual ? "Ativo" : "Inativo"}
                      enabled={ctrl.bianual}
                      onChange={(value) =>
                        setControlesBimestre((prev) => ({
                          ...prev,
                          [b.id]: { ...prev[b.id], bianual: value },
                        }))
                      }
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* ======================================================================
            BARRA DE BUSCA
        ======================================================================*/}
        <section className="bg-white border rounded-xl shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Buscar aluno (código, nome ou turma)
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: 2023001, Ana, 7º A..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-xs text-blue-900 min-w-[220px]">
            <div className="font-semibold">Filtro atual</div>
            <div>
              Bimestre:{" "}
              <span className="font-semibold">
                {bimestres.find((b) => b.id === bimestreSelecionado)?.label}
              </span>
            </div>
            <div>
              Alunos encontrados:{" "}
              <span className="font-semibold">{listaFiltrada.length}</span>
            </div>
          </div>
        </section>

        {/* ======================================================================
            PAINEL COM LISTA + DISCIPLINAS
        ======================================================================*/}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* ================= LEFT: LISTA ALUNOS ================= */}
          <div className="xl:col-span-2 bg-white border rounded-xl shadow-sm flex flex-col">

            <div className="border-b px-4 py-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Alunos</h2>
              <span className="text-xs text-gray-500">
                Clique para carregar as notas.
              </span>
            </div>

            <div className="grid grid-cols-12 text-xs font-semibold text-gray-500 px-4 py-2 border-b bg-gray-50">
              <div className="col-span-3">Código</div>
              <div className="col-span-6">Estudante</div>
              <div className="col-span-3 text-right">Turma</div>
            </div>

            <div className="flex-1 overflow-auto">
              {listaFiltrada.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">
                  Nenhum aluno encontrado.
                </div>
              ) : (
                <ul className="divide-y">
                  {listaFiltrada.map((a) => {
                    const ativo = alunoSelecionado?.id === a.id;
                    return (
                      <li
                        key={a.id}
                        onClick={() => setAlunoSelecionado(a)}
                        className={`px-4 py-2 text-sm cursor-pointer transition ${
                          ativo
                            ? "bg-blue-50 text-blue-900"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3 font-mono text-xs">
                            {a.codigo}
                          </div>
                          <div className="col-span-6">
                            <span className="font-medium">{a.nome}</span>
                          </div>
                          <div className="col-span-3 text-xs text-right">
                            {a.turma}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* ================= RIGHT: DISCIPLINAS / NOTAS ================= */}
          <div className="bg-white border rounded-xl shadow-sm flex flex-col">

            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-800">
                Disciplinas e Notas
              </h2>

              {!alunoSelecionado ? (
                <p className="text-xs text-gray-500 mt-1">
                  Selecione um estudante.
                </p>
              ) : (
                <p className="text-xs text-gray-600 mt-1">
                  {alunoSelecionado.nome} —{" "}
                  <span className="font-mono">{alunoSelecionado.codigo}</span>{" "}
                  ({alunoSelecionado.turma})
                </p>
              )}
            </div>

            {/* Seletor rápido de bimestre */}
            <div className="px-4 py-2 border-b bg-gray-50 flex flex-wrap gap-2">
              {bimestres.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBimestreSelecionado(b.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    bimestreSelecionado === b.id
                      ? "bg-blue-700 text-white"
                      : "bg-white text-gray-700 border"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Lista disciplinas */}
            <div className="flex-1 overflow-auto px-4 py-3">
              {!alunoSelecionado ? (
                <div className="text-sm text-gray-500">
                  Nenhum aluno selecionado.
                </div>
              ) : (
                <div className="space-y-2">
                  {MOCK_DISCIPLINAS.map((disc) => (
                    <div
                      key={disc.id}
                      className="flex items-center gap-2 py-1 border-b last:border-b-0"
                    >
                      <div className="flex-1 text-sm text-gray-800">
                        {disc.nome}
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        className="w-20 px-2 py-1 border rounded-md text-sm text-right"
                        value={getNotaAtual(alunoSelecionado.id, disc.id)}
                        onChange={(e) =>
                          handleChangeNota(
                            alunoSelecionado.id,
                            disc.id,
                            e.target.value
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
              <p className="text-[11px] text-gray-500 max-w-[70%]">
                Esta é uma simulação. Na próxima etapa integraremos ao backend.
              </p>
              <button
                type="button"
                onClick={handleSalvarNotas}
                disabled={!alunoSelecionado}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 
                  hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar alterações
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
