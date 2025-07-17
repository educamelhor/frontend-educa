// src/pages/Boletim.jsx
import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import api from "../services/api";

export default function Boletim() {
  const { alunoId } = useParams();
  if (!alunoId) return <Navigate to="/estudantes" replace />;

  const [aluno, setAluno] = useState(null);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/alunos/${alunoId}`)
      .then(res => setAluno(res.data))
      .catch(err => console.error("Erro ao carregar aluno:", err));

    api.get(`/alunos/${alunoId}/notas`)
      .then(res => setNotas(res.data))
      .catch(() => setNotas([]))
      .finally(() => setLoading(false));
  }, [alunoId]);

  if (loading) return <div className="p-6">Carregando boletim…</div>;
  if (!aluno)  return <div className="p-6 text-red-600">Aluno não encontrado.</div>;

  const somaNotas = notas.reduce((sum, item) => {
    const vals = [
      item.b1_2024.nota, item.b2_2024.nota,
      item.b3_2024.nota, item.b4_2024.nota,
      item.b1_2025.nota, item.b2_2025.nota,
      item.b3_2025.nota, item.b4_2025.nota,
    ].map(Number).filter(n => !isNaN(n));
    return sum + vals.reduce((a,b) => a + b, 0);
  }, 0).toFixed(2);

  const ranking = "25/562";
  const obs = "Atenção!! sua média está igual ou melhor que ano passado!!";

  return (
    <div className="pt-0 px-6 pb-0 bg-blue-50 min-h-screen">
      {/* cabeçalho */}
      <div className="bg-white rounded shadow p-2 mb-3 flex items-center justify-between">
        <img src="/LOGO_EDUCA_MELHOR.jpeg" alt="Educa.Melhor" className="h-12" />
        <div className="text-center text-xs leading-tight space-y-0">
          <div>GOVERNO DO DISTRITO FEDERAL</div>
          <div>SECRETARIA DE ESTADO DE EDUCAÇÃO</div>
          <div>CRE – PLANALTINA</div>
          <div>CENTRO DE ENSINO FUNDAMENTAL 04 – COLÉGIO CÍVICO MILITAR</div>
          <div>INEP 53006160</div>
        </div>
        <img src="/LOGO_CCMDF.jpg" alt="CCMDF" className="h-12" />
      </div>

      {/* informações do aluno inline */}
      <div className="bg-gray-100 rounded p-3 mb-6 flex flex-wrap gap-8 text-sm">
        <div><span className="font-bold">CÓDIGO:</span> {aluno.codigo}</div>
        <div><span className="font-bold">ESTUDANTE:</span> {aluno.nome}</div>
        <div><span className="font-bold">TURNO:</span> {aluno.turno}</div>
        <div><span className="font-bold">TURMA:</span> {aluno.turma}</div>
      </div>

      {/* tabela de notas */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th rowSpan={3} className="px-2 py-1 border text-center">Componentes Curriculares</th>
              <th colSpan={9} className="px-2 py-1 bg-yellow-100 text-center">2024</th>
              <th colSpan={9} className="px-2 py-1 bg-green-100 text-center">2025</th>
              <th colSpan={2} className="px-2 py-1 bg-orange-200 text-center">Resultado Final</th>
              <th rowSpan={3} className="px-2 py-1 bg-blue-300 text-white text-center">Situação Final</th>
            </tr>
            <tr>
              {[1,2,3,4].map(n => (
                <th key={`bim24-${n}`} colSpan={2} className="px-1 py-1 bg-yellow-50 text-center">
                  {`${n}º BIM.`}
                </th>
              ))}
              <th rowSpan={2} className="px-1 py-1 bg-yellow-50 text-center">Média</th>
              {[1,2,3,4].map(n => (
                <th key={`bim25-${n}`} colSpan={2} className="px-1 py-1 bg-green-50 text-center">
                  {`${n}º BIM.`}
                </th>
              ))}
              <th rowSpan={2} className="px-1 py-1 bg-green-50 text-center">Média</th>
              <th rowSpan={2} className="px-1 py-1 bg-orange-100 text-center">Notas</th>
              <th rowSpan={2} className="px-1 py-1 bg-orange-100 text-center">Faltas</th>
            </tr>
            <tr>
              {Array.from({ length: 4 }).flatMap((_, i) => [
                <th key={`24n-${i}`} className="px-1 py-3 border text-xs text-center h-12 align-bottom">
                  <div className="transform -rotate-90 whitespace-nowrap">Notas</div>
                </th>,
                <th key={`24f-${i}`} className="px-1 py-3 border text-xs text-center h-12 align-bottom">
                  <div className="transform -rotate-90 whitespace-nowrap">Faltas</div>
                </th>,
              ])}
              {Array.from({ length: 4 }).flatMap((_, i) => [
                <th key={`25n-${i}`} className="px-1 py-3 border text-xs text-center h-12 align-bottom">
                  <div className="transform -rotate-90 whitespace-nowrap">Notas</div>
                </th>,
                <th key={`25f-${i}`} className="px-1 py-3 border text-xs text-center h-12 align-bottom">
                  <div className="transform -rotate-90 whitespace-nowrap">Faltas</div>
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {notas.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="px-1 py-0 border text-xs text-center align-middle">{item.disciplina}</td>
                {[item.b1_2024, item.b2_2024, item.b3_2024, item.b4_2024].flatMap((b, j) => [
                  <td key={`24n-${i}-${j}`} className="px-1 py-0.5 border text-xs text-center align-middle">{b.nota||"—"}</td>,
                  <td key={`24f-${i}-${j}`} className="px-1 py-0 border text-xs text-center align-middle">{b.falta||"—"}</td>,
                ])}
                <td className="px-1 py-0 border text-xs text-center align-middle">{item.media_2024||"—"}</td>
                {[item.b1_2025, item.b2_2025, item.b3_2025, item.b4_2025].flatMap((b, j) => [
                  <td key={`25n-${i}-${j}`} className="px-1 py-0 border text-xs text-center align-middle">{b.nota||"—"}</td>,
                  <td key={`25f-${i}-${j}`} className="px-1 py-0 border text-xs text-center align-middle">{b.falta||"—"}</td>,
                ])}
                <td className="px-1 py-0 border text-xs text-center align-middle">{item.media_2025||"—"}</td>
                <td className="px-1 py-0 border text-xs text-center align-middle">{item.resultado.nota||"—"}</td>
                <td className="px-1 py-0 border text-xs text-center align-middle">{item.resultado.falta||"—"}</td>
                <td className="px-1 py-0 border text-xs text-center align-middle text-center">{item.situacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* rodapé compacto */}
      <div className="bg-yellow-100 rounded p-2 mt-4 flex justify-between items-start text-sm leading-tight space-y-0">
        <div>
          <div><strong>Soma das notas:</strong> {somaNotas}</div>
          <div><strong>Seu ranking:</strong> {ranking}</div>
          <div><strong>Observações:</strong> {obs}</div>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-white border border-gray-400 px-3 py-1 rounded hover:bg-gray-50 text-xs"
        >
          IMPRIMIR
        </button>
      </div>
    </div>
  );
}
