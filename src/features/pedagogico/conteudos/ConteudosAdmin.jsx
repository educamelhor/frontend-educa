import React, { useEffect, useState } from "react";
import api from "../../../services/api"; // ajuste o path se seu projeto usar outro alias

export default function ConteudosAdmin() {
  const [turmaId, setTurmaId] = useState("");
  const [disciplinaId, setDisciplinaId] = useState("");
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  const [bimestre, setBimestre] = useState("");

  const [plano, setPlano] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarPlano() {
    if (!turmaId || !disciplinaId || !bimestre || !anoLetivo) return;

    setLoading(true);
    setErro("");
    setPlano(null);
    setItens([]);

    try {
      const { data } = await api.get(
        "/api/pedagogico/conteudos/planos",
        {





          params: {
            turma_id: Number(turmaId),
            disciplina_id: Number(disciplinaId),
            ano_letivo: Number(anoLetivo),
            bimestre: Number(bimestre),
          },






        }
      );

      const encontrado = data?.planos?.[0];
      if (!encontrado) {
        setPlano(null);
        setItens([]);
        return;
      }

      const detalhe = await api.get(
        `/api/pedagogico/conteudos/planos/${encontrado.id}`
      );

      setPlano(detalhe.data.plano);
      setItens(detalhe.data.itens || []);




    } catch (e) {
      console.error(e);

      const status = e?.response?.status;
      const msgApi = e?.response?.data?.message || e?.response?.data?.erro;
      const msg = e?.message;

      setErro(
        `Erro ao carregar conteúdos.` +
          (status ? ` (HTTP ${status})` : "") +
          (msgApi ? ` — ${msgApi}` : "") +
          (msg ? ` — ${msg}` : "")
      );
    } finally {






      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPlano();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turmaId, disciplinaId, anoLetivo, bimestre]);

  return (

    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold text-blue-900 mb-2">Conteúdos</h1>
      <p className="text-slate-700">
        Página administrativa para cadastrar e organizar conteúdos por turma, disciplina, ano letivo e bimestre.
      </p>




      <div className="mt-6 p-4 bg-white rounded-xl shadow-sm border border-slate-200 space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="number"
            placeholder="Turma ID"
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            className="input"
          />
          <input
            type="number"
            placeholder="Disciplina ID"
            value={disciplinaId}
            onChange={(e) => setDisciplinaId(e.target.value)}
            className="input"
          />
          <input
            type="number"
            placeholder="Ano letivo"
            value={anoLetivo}
            onChange={(e) => setAnoLetivo(e.target.value)}
            className="input"
          />
          <select
            value={bimestre}
            onChange={(e) => setBimestre(e.target.value)}
            className="input"
         >
           <option value="">Bimestre</option>
           <option value="1">1º</option>
           <option value="2">2º</option>
           <option value="3">3º</option>
           <option value="4">4º</option>
           </select>
        </div>

        {/* Estados */}
        {loading && <p className="text-slate-500">Carregando...</p>}
        {erro && <p className="text-red-600">{erro}</p>}

        {/* Preview */}
        {plano && (
          <div className="border rounded-lg p-4 bg-slate-50">
            <h2 className="font-semibold text-slate-800 mb-2">
              {plano.titulo || "Plano sem título"}
            </h2>

            <ul className="list-disc ml-5 space-y-1">
              {itens.map((i) => (
                <li key={i.id} className="text-slate-700">
                  {i.texto}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && !plano && turmaId && disciplinaId && bimestre && (
          <p className="text-slate-500">
            Nenhum conteúdo cadastrado para esse filtro.
          </p>
        )}
      </div>






    </div>
  );
}
