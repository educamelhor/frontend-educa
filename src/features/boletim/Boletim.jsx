//src/features/boletim/boletim.jsx

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import styles from "../boletim/Boletim.module.css";
import useEscolaLogos from "../../hooks/useEscolaLogos";

export default function Boletim({ codigo: codigoProp, exibirBotaoImprimir = true, onLoaded }) {
  const params = useParams?.() || {};
  const codigo = codigoProp || params.codigo;
  const [aluno, setAluno] = useState(null);
  const [notas, setNotas] = useState(null);
  const [erro, setErro] = useState("");
  const [ranking, setRanking] = useState(null);
  const [showSemNotas, setShowSemNotas] = useState(true);
  const { logoEsquerda, logoDireita } = useEscolaLogos();

  useEffect(() => {
    let cancelado = false;
    async function fetchData() {
      try {
        setErro("");
        setShowSemNotas(true);

        // 1. Busca o aluno primeiro
        const resAluno = await api.get(`/api/alunos/${codigo}`);
        if (cancelado) return;
        setAluno(resAluno.data);

        // 2. Busca as notas
        const alunoId = resAluno.data.id;
        const resNotas = await api.get(`/api/notas/alunos/${alunoId}/notas`);
        if (cancelado) return;
        setNotas(Array.isArray(resNotas.data) ? resNotas.data : []);

        // 3. Busca o ranking real (pode falhar sem travar)
        try {
          const resRanking = await api.get(`/api/notas/alunos/${alunoId}/ranking`);
          if (!cancelado) setRanking(resRanking.data);
        } catch {
          if (!cancelado) setRanking(null);
        }
      } catch (err) {
        if (!cancelado) {
          setErro("Erro ao buscar dados do boletim. Tente novamente.");
          setAluno(null);
        }
      } finally {
        // Sinaliza ao pai que este boletim terminou de carregar (independente de erro ou não)
        if (typeof onLoaded === "function") onLoaded();
      }
    }
    fetchData();
    return () => { cancelado = true; };
  }, [codigo, onLoaded]);

  // Se há erro E NÃO é só a ausência de notas, exibe erro:
  if (erro && !aluno) {
    return (
      <div style={{ color: "red", margin: 30, fontSize: 22 }}>
        {erro}
      </div>
    );
  }

  // Enquanto está buscando aluno ou notas, mostra "Carregando notas..."
  if (!aluno || notas === null) {
    return (
      <div style={{ margin: 30, fontSize: 22, textAlign: "center" }}>
        Carregando notas...
      </div>
    );
  }

  // Disciplinas com id e nome EXATAMENTE como no seu banco!
  const disciplinas = [
    { id: 26, nome: "Artes" },
    { id: 25, nome: "Ciências" },
    { id: 27, nome: "Ed. Física" },
    { id: 23, nome: "Geografia" },
    { id: 29, nome: "Geometria" },
    { id: 24, nome: "História" },
    { id: 30, nome: "Inglês" },
    { id: 48, nome: "Português" },
    { id: 21, nome: "Matemática" },
    { id: 51, nome: "Prática Estudantil" }
  ];

  // Busca nota por disciplina_id, ano e bimestre
  const findNota = (discId, ano, bim) => {
    return (
      notas.find(n =>
        (n.disciplina_id === undefined
          ? n.disciplina === disciplinas.find(d => d.id === discId)?.nome
          : Number(n.disciplina_id) === Number(discId)) &&
        Number(n.ano) === Number(ano) &&
        Number(n.bimestre) === Number(bim)
      ) || {}
    );
  };

  const calcMedia = arr => {
    const hasAnyGrade = arr.some(x => x.nota != null && x.nota !== "");
    if (!hasAnyGrade) return "";
    const sum = arr.reduce((acc, x) => {
      const val = x.nota != null && x.nota !== "" ? Number(x.nota) : 0;
      return acc + val;
    }, 0);
    return (sum / 4).toFixed(2);
  };

  const somaNotas = notas
    .map(n => n.nota || 0)
    .reduce((a, b) => Number(a) + Number(b), 0)
    .toFixed(2);

  // Função para determinar a situação final da disciplina
  function getSituacaoFinal(b24, b25) {
    const nota4Bim2025 = b25[3]?.nota;
    if (nota4Bim2025 == null || nota4Bim2025 === "") {
      return <span style={{ color: "#888" }}>Cursando...</span>;
    }
    const notasValidas = [...b24, ...b25].map(x => Number(x.nota)).filter(n => !isNaN(n));
    if (notasValidas.length < 8) return <span style={{ color: "#888" }}>Cursando...</span>;
    const mediaFinal = notasValidas.reduce((a, b) => a + b, 0) / 8;
    if (mediaFinal >= 5) {
      return <span style={{ color: "green", fontWeight: "bold" }}>APROVADO</span>;
    } else {
      return <span style={{ color: "red", fontWeight: "bold" }}>RECUPERAÇÃO</span>;
    }
  }

  // Verifica se o aluno não tem nenhuma nota registrada
  const alunoSemNotas = Array.isArray(notas) && notas.length === 0;

  return (
    <div className="min-h-screen bg-blue-50 p-6 boletimWrapper">
      {/* Mensagem fixa se aluno não tem notas */}
      {alunoSemNotas && showSemNotas && (
        <div style={{
          background: "#fff3cd",
          border: "1px solid #ffeeba",
          color: "#856404",
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
          fontSize: 20,
          position: "relative",
          maxWidth: 500
        }}>
          Esse aluno ainda não têm notas registradas.
          <button
            onClick={() => setShowSemNotas(false)}
            style={{
              position: "absolute",
              top: 8,
              right: 16,
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "#856404"
            }}
            aria-label="Fechar mensagem"
          >×</button>
        </div>
      )}

      {/* Cabeçalho da escola */}
      <div className="bg-white rounded-lg shadow p-4 flex justify-center items-center mb-4">
        <img
          src={logoEsquerda}
          alt="Logo esquerda"
          className="h-[6rem] mr-4"
          onError={e => { e.target.style.display = "none"; }}
        />
        <div className="text-center">
          <div>GOVERNO DO DISTRITO FEDERAL</div>
          <div>SECRETARIA DE ESTADO DE EDUCAÇÃO – CRE – PLANALTINA</div>
          <div>CENTRO DE ENSINO FUNDAMENTAL 04 – COLÉGIO CÍVICO MILITAR</div>
          <div>INEP 53006160</div>
        </div>
        <img
          src={logoDireita}
          alt="Logo direita"
          className="h-[4.5rem] ml-4"
          onError={e => { e.target.style.display = "none"; }}
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
                Componentes<br />Curriculares
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
              const b24 = [1, 2, 3, 4].map(b => findNota(disc.id, 2024, b));
              const b25 = [1, 2, 3, 4].map(b => findNota(disc.id, 2025, b));
              const m24 = calcMedia(b24);
              const m25 = calcMedia(b25);
              const mediaFin = m25;
              const faltasFin = b25.reduce((a, b) => a + (Number(b.faltas) || 0), 0);

              return (
                <tr key={disc.id}>
                  <td className={styles.disc}>{disc.nome}</td>
                  {b24.map((x, i) => (
                    <React.Fragment key={`24-${i}`}>
                      <td>{x.nota != null ? Number(x.nota).toFixed(2).replace('.', ',') : ""}</td>
                      <td>{x.faltas != null ? x.faltas : ""}</td>
                    </React.Fragment>
                  ))}
                  <td>{m24.replace('.', ',')}</td>
                  {b25.map((x, i) => (
                    <React.Fragment key={`25-${i}`}>
                      <td>{x.nota != null ? Number(x.nota).toFixed(2).replace('.', ',') : ""}</td>
                      <td>{x.faltas != null ? x.faltas : ""}</td>
                    </React.Fragment>
                  ))}
                  <td>{m25.replace('.', ',')}</td>
                  <td className={styles.finalCell}>{mediaFin.replace('.', ',')}</td>
                  <td className={styles.faltasCell}>{faltasFin || ""}</td>
                  <td className={styles.situacaoCell}>{getSituacaoFinal(b24, b25)}</td>
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
            <strong>Soma das notas:</strong> {somaNotas.replace('.', ',')}
          </div>
          <div>
            <strong>Seu ranking:</strong>{" "}
            {ranking
              ? `${ranking.ranking}/${ranking.total_alunos}`
              : "Calculando..."}
          </div>
          <div>
            <strong>Observações:</strong> Atenção!! sua média está igual ou melhor que ano passado!!
          </div>
        </div>

        {exibirBotaoImprimir && (
          <button
            className="px-4 py-2 border rounded"
            onClick={() => window.print()}
          >
            IMPRIMIR
          </button>
        )}
      </div>
    </div>
  );
}
