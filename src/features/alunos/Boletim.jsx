// src/features/alunos/Boletim.jsx

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import styles from "./Boletim.module.css";

export default function Boletim() {
  // Alterado para pegar o parâmetro “codigo” em vez de “id”
  const { codigo } = useParams();
  const [aluno, setAluno] = useState(null);
  const [notas, setNotas] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Busca os dados do aluno pelo código
        const resAluno = await api.get(`/api/alunos/${codigo}`);
        setAluno(resAluno.data);

        // Busca as notas do aluno pelo mesmo código
        const resNotas = await api.get(`/api/alunos/${codigo}/notas`);
        setNotas(resNotas.data);
      } catch (err) {
        console.error("Erro ao buscar dados do boletim:", err);
      }
    }
    fetchData();
  }, [codigo]);

  if (!aluno) return null;

  // Lista fixa de disciplinas (mantida conforme versão anterior)
  const disciplinas = [
    "Arte",
    "Ciências Naturais",
    "Educação Física",
    "Geografia",
    "Geometria",
    "História",
    "Língua Inglesa",
    "Língua Portuguesa",
    "Matemática",
    "Prática Estudantil"
  ];

  // Função para encontrar nota em disciplina/ano/bimestre
  const findNota = (disc, ano, bim) =>
    notas.find(n => n.disciplina === disc && n.ano === ano && n.bimestre === bim) || {};

  // Cálculo de média simples (somente notas não-nulas)
  const calcMedia = arr => {
    const vals = arr.map(x => x.nota).filter(x => x != null);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "";
  };

  // Soma total de todas as notas (para exibir no rodapé)
  const somaNotas = notas
    .map(n => n.nota || 0)
    .reduce((a, b) => a + b, 0)
    .toFixed(2);

  return (
    <div className="min-h-screen bg-blue-50 p-6 boletimWrapper">
      {/* Cabeçalho da escola */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-center items-center mb-4">
        <img
          src="/logo-escola-left.png"
          alt="Logo esquerda"
          className="h-[6rem] mr-4"
        />
        <div className="text-center">
          <div>GOVERNO DO DISTRITO FEDERAL</div>
          <div>SECRETARIA DE ESTADO DE EDUCAÇÃO – CRE – PLANALTINA</div>
          <div>CENTRO DE ENSINO FUNDAMENTAL 04 – COLÉGIO CÍVICO MILITAR</div>
          <div>INEP 53006160</div>
        </div>
        <img
          src="/logo-escola-right.png"
          alt="Logo direita"
          className="h-[4.5rem] ml-4"
        />
      </div>

      {/* Dados do aluno */}
      <div className="bg-gray-200 rounded-lg shadow p-4 mb-4 grid grid-cols-2 gap-x-8">
        <div className="space-y-1">
          <div>
            <strong>CÓDIGO:</strong> {aluno.codigo}
          </div>
          <div>
            <strong>TURNO:</strong> {aluno.turno}
          </div>
        </div>
        <div className="space-y-1 text-left">
          <div>
            <strong>ESTUDANTE:</strong> {aluno.estudante}
          </div>
          <div>
            <strong>TURMA:</strong> {aluno.turma}
          </div>
        </div>
      </div>

      {/* Tabela de boletim */}
      <div className="overflow-x-auto bg-white rounded-lg shadow mb-4">
        <table className="min-w-full border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th rowSpan={3} className={styles.cabDisc}>
                Componentes Curriculares
              </th>
              <th colSpan={9} className={styles.ano2024}>
                2024
              </th>
              <th colSpan={9} className={styles.ano2025}>
                2025
              </th>
              <th rowSpan={2} colSpan={2} className={styles.final}>
                Resultado Final
              </th>
              <th rowSpan={3} className={styles.situacao}>
                Situação Final
              </th>
            </tr>
            <tr>
              {[1, 2, 3, 4].map(i => (
                <th key={`24b${i}`} colSpan={2}>
                  {`${i}º BIM.`}
                </th>
              ))}
              <th rowSpan={2} className={styles.rotated}>
                Média
              </th>
              {[1, 2, 3, 4].map(i => (
                <th key={`25b${i}`} colSpan={2}>
                  {`${i}º BIM.`}
                </th>
              ))}
              <th rowSpan={2} className={styles.rotated}>
                Média
              </th>
            </tr>
            <tr>
              {[...Array(8)].map((_, idx) => (
                <React.Fragment key={idx}>
                  <th className={styles.rotated}>Notas</th>
                  <th className={styles.rotated}>Faltas</th>
                </React.Fragment>
              ))}
              <th className={styles.rotated}>Notas</th>
              <th className={styles.rotated}>Faltas</th>
            </tr>
          </thead>
          <tbody>
            {disciplinas.map(disc => {
              const b24 = [1, 2, 3, 4].map(b => findNota(disc, 2024, b));
              const b25 = [1, 2, 3, 4].map(b => findNota(disc, 2025, b));
              const m24 = calcMedia(b24);
              const m25 = calcMedia(b25);
              const todasFin = [...b24, ...b25];
              const notasFin = todasFin.map(x => x.nota).filter(x => x != null);
              const mediaFin = notasFin.length
                ? (notasFin.reduce((a, b) => a + b, 0) / notasFin.length).toFixed(2)
                : "";
              const faltasFin = todasFin.reduce((a, b) => a + (b.faltas || 0), 0);

              return (
                <tr key={disc}>
                  <td className={styles.disc}>{disc}</td>
                  {b24.map((x, i) => (
                    <React.Fragment key={`24-${i}`}>
                      <td>{x.nota != null ? x.nota.toFixed(2) : ""}</td>
                      <td>{x.faltas != null ? x.faltas : ""}</td>
                    </React.Fragment>
                  ))}
                  <td>{m24}</td>
                  {b25.map((x, i) => (
                    <React.Fragment key={`25-${i}`}>
                      <td>{x.nota != null ? x.nota.toFixed(2) : ""}</td>
                      <td>{x.faltas != null ? x.faltas : ""}</td>
                    </React.Fragment>
                  ))}
                  <td>{m25}</td>
                  <td className={styles.finalCell}>{mediaFin}</td>
                  <td className={styles.faltasCell}>{faltasFin || ""}</td>
                  <td className={styles.situacaoCell}>APROVADO</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="bg-yellow-100 rounded-lg shadow p-4 flex justify-between items-center">
        <div>
          <div>
            <strong>Soma das notas:</strong> {somaNotas}
          </div>
          <div>
            <strong>Seu ranking:</strong> 25/562
          </div>
          <div>
            <strong>Observações:</strong> Atenção!! sua média está igual ou melhor que ano passado!!
          </div>
        </div>
        <button
          className="px-4 py-2 border rounded"
          onClick={() => window.print()}
        >
          IMPRIMIR
        </button>
      </div>
    </div>
  );
}
