import React, { useState } from "react";
import ModalAdicionarItemAvaliativo from "./ModalAdicionarItemAvaliativo";


/**
 * AtividadesAvaliativas.jsx
 * ------------------------------------------------------------
 * Página: Plano de Avaliação Pedagógica
 * Escopo atual: SOMENTE FRONTEND (layout + fluxo visual)
 * Backend e persistência serão integrados em passos futuros.
 * ------------------------------------------------------------
 */

export default function AtividadesAvaliativas() {
  // ---------------------------
  // Estados de seleção
  // ---------------------------
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(null);
  const [bimestreSelecionado, setBimestreSelecionado] = useState(null);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);
  const [mostrarTabela, setMostrarTabela] = useState(false);

  // Tabela (mock inicial) — em passos futuros virá do backend




  const [itens, setItens] = useState([
    {
      atividade: "Prova Bimestral",
      data_inicio: "",
      data_final: "",
      nota_total: 10,
      oportunidades: 1,
      nota_invertida: 0,
      descricao: "",
    },
  ]);

  const [modalItemOpen, setModalItemOpen] = useState(false);

  // Campos do modal
  const [atividade, setAtividade] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [notaTotal, setNotaTotal] = useState("");
  const [oportunidades, setOportunidades] = useState("1");
  const [notaInvertida, setNotaInvertida] = useState("0");
  const [descricao, setDescricao] = useState("");






  // ---------------------------
  // Dados mockados (temporários)
  // ---------------------------
  const disciplinas = ["Matemática", "Geometria"];
  const bimestres = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
  const turmas = [
    "1A", "1B", "1C", "1D", "1E", "1F",
    "1G", "1H", "1I", "1J"
  ];

  // ---------------------------
  // Utilidades
  // ---------------------------
  const toggleTurma = (turma) => {
    setTurmasSelecionadas((prev) =>
      prev.includes(turma)
        ? prev.filter((t) => t !== turma)
        : [...prev, turma]
    );
  };

  const selecionarTodasTurmas = (checked) => {
    setTurmasSelecionadas(checked ? turmas : []);
  };

  const gerarNomePlano = () => {
    if (!disciplinaSelecionada || !bimestreSelecionado) return "Plano de Avaliação";
    const disc = disciplinaSelecionada.substring(0, 3).toUpperCase();
    const bim = bimestreSelecionado.split(" ")[0];
    const turmasLabel = turmasSelecionadas.length === turmas.length ? "T" : "P";
    const ano = new Date().getFullYear();
    return `${disc}-${bim}-BIM-${turmasLabel}-${ano}`;
  };

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="p-6">
      {/* Título */}
      <h1
        className="text-5xl font-bold text-center text-blue-900 mb-10"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        Plano de Avaliação Pedagógica
      </h1>

      {/* =======================
          Linha 1 — Disciplinas
      ======================== */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-blue-800 mb-3">Disciplina</h2>
        <div className="flex gap-4 flex-wrap">
          {disciplinas.map((disc) => (
            <button
              key={disc}
              onClick={() => setDisciplinaSelecionada(disc)}
              className={`px-6 py-3 rounded-xl shadow transition font-semibold ${
                disciplinaSelecionada === disc
                  ? "bg-blue-700 text-white"
                  : "bg-blue-100 text-blue-900 hover:bg-blue-200"
              }`}
            >
              {disc}
            </button>
          ))}
        </div>
      </section>

      {/* =======================
          Linha 2 — Bimestres
      ======================== */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-blue-800 mb-3">Bimestre</h2>
        <div className="flex gap-4 flex-wrap">
          {bimestres.map((bim) => (
            <button
              key={bim}
              onClick={() => setBimestreSelecionado(bim)}
              className={`px-6 py-3 rounded-xl shadow transition font-semibold ${
                bimestreSelecionado === bim
                  ? "bg-green-600 text-white"
                  : "bg-green-100 text-green-900 hover:bg-green-200"
              }`}
            >
              {bim}
            </button>
          ))}
        </div>
      </section>

      {/* =======================
          Linha 3 — Turmas
      ======================== */}
      <section className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <h2 className="text-xl font-semibold text-blue-800">Turmas</h2>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={turmasSelecionadas.length === turmas.length}
              onChange={(e) => selecionarTodasTurmas(e.target.checked)}
            />
            Selecionar todas
          </label>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {turmas.map((turma) => (
            <div
              key={turma}
              onClick={() => toggleTurma(turma)}
              className={`cursor-pointer rounded-md px-4 py-2 text-center font-semibold shadow transition ${
                turmasSelecionadas.includes(turma)
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-900 hover:bg-blue-200"
              }`}
            >
              {turma}
            </div>
          ))}
        </div>
      </section>

      {/* =======================
          Linha 4 — Plano
      ======================== */}
      <section className="flex items-center justify-center gap-4 mb-10">
        <div className="w-full max-w-xl px-6 py-4 rounded-xl bg-gray-100 text-blue-900 font-bold shadow text-center">
          {gerarNomePlano()}
        </div>

        <button
          onClick={() => setMostrarTabela(true)}
          className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow transition"
        >
          CRIAR / EDITAR
        </button>
      </section>


      {/* =======================
          Tabela de Atividades
      ======================== */}
      {mostrarTabela && (
        <section className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-semibold text-blue-800">
              Atividades Avaliativas
            </h3>

            <button
              type="button"
              onClick={() => {
                setAtividade("");
                setDataInicio("");
                setDataFinal("");
                setNotaTotal("");
                setOportunidades("1");
                setNotaInvertida("0");
                setDescricao("");
                setModalItemOpen(true);
              }}

              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition"
              title="Adicionar nova atividade avaliativa"
            >
              + Item
            </button>
          </div>


          <table className="w-full border">
            <thead className="bg-blue-100">
              <tr>
                <th className="border px-4 py-2">Valor</th>
                <th className="border px-4 py-2">Atividade Avaliativa</th>
                <th className="border px-4 py-2">Ações</th>
              </tr>
            </thead>



            <tbody>
              {itens.map((item, idx) => (
                <tr key={`${item.atividade}-${idx}`} className="text-center">
                  <td className="border px-4 py-2">{item.nota_total}</td>
                  <td className="border px-4 py-2">{item.atividade}</td>
                  <td className="border px-4 py-2 text-gray-400">—</td>
                </tr>
              ))}
            </tbody>






          </table>
        </section>
      )}


      <ModalAdicionarItemAvaliativo
        open={modalItemOpen}
        onClose={() => setModalItemOpen(false)}
        atividade={atividade}
        setAtividade={setAtividade}
        dataInicio={dataInicio}
        setDataInicio={setDataInicio}
        dataFinal={dataFinal}
        setDataFinal={setDataFinal}
        notaTotal={notaTotal}
        setNotaTotal={setNotaTotal}
        oportunidades={oportunidades}
        setOportunidades={setOportunidades}
        notaInvertida={notaInvertida}
        setNotaInvertida={setNotaInvertida}
        descricao={descricao}
        setDescricao={setDescricao}
        onSalvar={() => {
          const nome = (atividade || "").trim();
          const nt = Number(notaTotal);
          const op = Number(oportunidades);
          const ni = Number(notaInvertida);

          // validação mínima (refinamos depois)
          if (!nome) return;
          if (Number.isNaN(nt)) return;

          setItens((prev) => [
            ...prev,
            {
              atividade: nome,
              data_inicio: dataInicio || "",
              data_final: dataFinal || "",
              nota_total: nt,
              oportunidades: Number.isNaN(op) ? 1 : op,
              nota_invertida: Number.isNaN(ni) ? 0 : ni,
              descricao: (descricao || "").trim(),
            },
          ]);

          setModalItemOpen(false);
        }}
      />








    </div>
  );
}
