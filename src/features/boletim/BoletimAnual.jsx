// src/features/boletim/BoletimAnual.jsx
// ============================================================================
// BOLETIM ANUAL — Ano Letivo Único (Modelo V2)
// Renderiza apenas um único ano letivo (configurável via prop `anoLetivo`).
// Mantém: cabeçalho institucional, colunas nota/falta, média, resultado final,
//          situação final, ranking escola/turma/série/turno.
// ============================================================================

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import s from "./BoletimAnual.module.css";
import useEscolaLogos from "../../hooks/useEscolaLogos";

// Ano letivo padrão (pode ser sobrescrito via prop)
const ANO_DEFAULT = new Date().getFullYear();

const normalizeName = (name) => {
  if (!name) return "";
  let n = name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (n === "ED. FISICA" || n === "EDUCACAO FISICA") return "EDUCACAO FISICA";
  if (n === "PORTUGUES" || n === "LINGUA PORTUGUESA") return "PORTUGUES";
  if (
    n === "PRATICA ESTUDANTIL" ||
    n === "PD1" ||
    n === "PD2" ||
    n === "PARTE DIVERSIFICADA I" ||
    n === "PARTE DIVERSIFICADA II"
  ) {
    return "PRATICA ESTUDANTIL";
  }
  return n;
};

const getEscolaDetalhes = (escolaId) => {
  const id = Number(escolaId);
  if (id === 3) {
    return {
      nome: "CENTRO EDUCACIONAL POMPÍLIO MARQUES DE SOUSA",
      inep: "53014308",
      cre: "CRE – PLANALTINA",
      estado: "GOVERNO DO DISTRITO FEDERAL",
    };
  }
  if (id === 2) {
    return {
      nome: "CENTRO DE ENSINO FUNDAMENTAL 08 DE PLANALTINA",
      inep: "53006240",
      cre: "CRE – PLANALTINA",
      estado: "GOVERNO DO DISTRITO FEDERAL",
    };
  }
  return {
    nome: "CENTRO DE ENSINO FUNDAMENTAL 04 – COLÉGIO CÍVICO MILITAR",
    inep: "53006160",
    cre: "CRE – PLANALTINA",
    estado: "GOVERNO DO DISTRITO FEDERAL",
  };
};

export default function BoletimAnual({
  codigo: codigoProp,
  exibirBotaoImprimir = true,
  onLoaded,
  // Suporte pre-carregado (impressão em lote)
  alunoPreCarregado = null,
  notasPreCarregadas = null,
  // Config de governança pré-carregada (evita segunda chamada API)
  boletimConfig: boletimConfigProp = null,
  // Ano letivo a exibir (default: ano corrente)
  anoLetivo: anoLetivoProp = null,
}) {
  const params = useParams?.() || {};
  const codigo = codigoProp || params.codigo;
  const { logoEsquerda, logoDireita } = useEscolaLogos();

  // Resolve o ano a usar: prop > URL param > default
  const ANO_CORRENTE = anoLetivoProp
    ? Number(anoLetivoProp)
    : ANO_DEFAULT;

  const [aluno, setAluno] = useState(null);
  const [notas, setNotas] = useState(notasPreCarregadas);
  const [ranking, setRanking] = useState(null);
  const [erro, setErro] = useState("");
  const [showSemNotas, setShowSemNotas] = useState(true);
  const [disciplinasList, setDisciplinasList] = useState([]);
  const [disciplinasSem1, setDisciplinasSem1] = useState([]);
  const [disciplinasSem2, setDisciplinasSem2] = useState([]);

  // Governança: config flags do boletim
  const [govConfig, setGovConfig] = useState({
    exibirFaltas: true,
    exibirRanking: true,
    exibirMediaRodape: true,
  });

  // ───────────────────────────────────────────────────────────────
  // Fetch de dados
  // ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;

    async function fetchData() {
      let currentEscolaId = null;
      let currentEtapa = null;
      let currentTurno = null;
      let currentRegime = null;
      let currentTurmaId = null;

      // Buscar configs de governança (só se não veio como prop)
      const configPromise = boletimConfigProp
        ? Promise.resolve(boletimConfigProp)
        : (async () => {
            try {
              const escolaId = localStorage.getItem("escola_id");
              if (!escolaId) return null;
              const cfgRes = await api.get("/api/governanca/boletim-config", {
                params: { escola_id: escolaId },
              });
              return cfgRes.data?.config || null;
            } catch {
              return null;
            }
          })();

      // Fluxo pre-carregado (impressão em lote)
      if (notasPreCarregadas) {
        if (!cancelado) {
          const studentObj = {
            codigo,
            estudante: alunoPreCarregado?.nome || alunoPreCarregado?.estudante || "",
            turma: alunoPreCarregado?.turma || "",
            turno: alunoPreCarregado?.turno || "",
            serie: alunoPreCarregado?.serie || "",
            id: alunoPreCarregado?.id || null,
            escola_id: alunoPreCarregado?.escola_id || null,
            etapa: alunoPreCarregado?.etapa || null,
          };
          setAluno(studentObj);
          setNotas(notasPreCarregadas);
          setRanking(alunoPreCarregado?.ranking || null);
          currentEscolaId = studentObj.escola_id;
          currentEtapa = studentObj.etapa;
          currentTurno = studentObj.turno;
        }
      } else {
        // Fluxo individual
        try {
          setErro("");
          setShowSemNotas(true);

          // 1) Buscar aluno + config em PARALELO
          const [resAluno, resolvedConfig] = await Promise.all([
            api.get(`/api/alunos/${codigo}`),
            configPromise,
          ]);
          if (cancelado) return;
          setAluno(resAluno.data);
          currentEscolaId = resAluno.data.escola_id;
          currentEtapa = resAluno.data.etapa;
          currentTurno = resAluno.data.turno;
          currentRegime = resAluno.data.regime;
          currentTurmaId = resAluno.data.turma_id;

          // Aplicar config de governança
          if (resolvedConfig && !cancelado) {
            setGovConfig({
              exibirFaltas: resolvedConfig["boletim.exibir_faltas"] !== "0",
              exibirRanking: resolvedConfig["boletim.exibir_ranking"] !== "0",
              exibirMediaRodape: resolvedConfig["boletim.exibir_media_rodape"] !== "0",
            });
          }

          const alunoId = resAluno.data.id;

          // 2) Buscar notas (filtra apenas o ano corrente no front)
          const resNotas = await api.get(`/api/notas/alunos/${alunoId}/notas`);
          if (cancelado) return;
          const todas = Array.isArray(resNotas.data) ? resNotas.data : [];
          // Normalização nota/valor
          const norm = todas.map((n) => ({
            ...n,
            nota: n.nota != null ? n.nota : n.valor != null ? Number(n.valor) : n.nota,
          }));
          // Filtra apenas o ano corrente
          const notasAno = norm.filter((n) => Number(n.ano) === ANO_CORRENTE);
          setNotas(notasAno);

          // 3) Buscar ranking expandido (4 dimensões)
          try {
            const rk = await api.get(
              `/api/notas/alunos/${alunoId}/ranking-anual?ano=${ANO_CORRENTE}&ts=${Date.now()}`
            );
            if (!cancelado) setRanking(rk.data);
          } catch {
            // Fallback para ranking-completo (2 dimensões)
            try {
              const rkFb = await api.get(
                `/api/notas/alunos/${alunoId}/ranking-completo?ts=${Date.now()}`
              );
              if (!cancelado) setRanking(rkFb.data);
            } catch {
              if (!cancelado) setRanking(null);
            }
          }
        } catch {
          if (!cancelado) {
            setErro("Erro ao buscar dados do boletim. Tente novamente.");
            setAluno(null);
          }
        }
      }

      // Buscar disciplinas correspondentes de forma dinâmica
      if (currentEscolaId) {
        try {
          if (currentRegime === "semestral" && currentTurmaId) {
            const [resSem1, resSem2] = await Promise.all([
              api.get("/api/cargas-horarias", { params: { turma_id: currentTurmaId, semestre: 1 } }),
              api.get("/api/cargas-horarias", { params: { turma_id: currentTurmaId, semestre: 2 } })
            ]);
            if (!cancelado) {
              setDisciplinasSem1((resSem1.data?.itens || []).map(d => ({ id: d.disciplina_id, nome: d.disciplina_nome })));
              setDisciplinasSem2((resSem2.data?.itens || []).map(d => ({ id: d.disciplina_id, nome: d.disciplina_nome })));
            }
          } else {
            const resDisc = await api.get("/api/disciplinas", {
              params: {
                escola_id: currentEscolaId,
                etapa: currentEtapa,
                turno: currentTurno,
              },
            });
            if (!cancelado && Array.isArray(resDisc.data)) {
              const parsed = resDisc.data.map((d) => ({
                id: d.id,
                nome: d.nome || d.disciplina,
              }));
              setDisciplinasList(parsed);
            }
          }
        } catch (err) {
          console.error("Erro ao carregar disciplinas do aluno:", err);
        }
      }

      if (typeof onLoaded === "function") onLoaded();
    }

    fetchData();
    return () => { cancelado = true; };
  }, [codigo, onLoaded, notasPreCarregadas, alunoPreCarregado]);

  // ───────────────────────────────────────────────────────────────
  // Estados de loading/erro
  // ───────────────────────────────────────────────────────────────
  if (erro && !aluno) {
    return <div style={{ color: "red", margin: 30, fontSize: 22 }}>{erro}</div>;
  }

  if (!aluno || notas === null) {
    return (
      <div className={s.loading}>
        <div className={s.spinner} />
        <span className={s.loadingText}>Carregando boletim...</span>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // Disciplinas (mesma lista canônica do sistema)
  // ───────────────────────────────────────────────────────────────
  const DEFAULT_DISCIPLINAS = [
    { id: 26, nome: "Artes" },
    { id: 25, nome: "Ciências" },
    { id: 27, nome: "Ed. Física" },
    { id: 23, nome: "Geografia" },
    { id: 29, nome: "Geometria" },
    { id: 24, nome: "História" },
    { id: 30, nome: "Inglês" },
    { id: 48, nome: "Português" },
    { id: 21, nome: "Matemática" },
    { id: 51, nome: "Prática Estudantil" },
  ];

  const disciplinas = (disciplinasList.length > 0 ? disciplinasList : DEFAULT_DISCIPLINAS).map((d) => ({
    ...d,
    nome: String(d.nome || "").toUpperCase(),
  }));

  // ───────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────
  const findNota = (discId, bim) => {
    // Para turmas semestrais, disciplinas vêm de disciplinasSem1/Sem2, não de 'disciplinas'.
    // Monta uma lista combinada de todas as fontes para resolver o nome.
    const todasAsFontes = [
      ...disciplinas,
      ...disciplinasSem1,
      ...disciplinasSem2,
    ];
    const targetDisc = todasAsFontes.find((d) => d.id === discId);
    const targetNameNorm = targetDisc ? normalizeName(targetDisc.nome) : null;

    return (
      notas.find((n) => {
        const matchId = n.disciplina_id !== undefined && Number(n.disciplina_id) === Number(discId);
        const matchName = targetNameNorm
          ? normalizeName(n.disciplina) === targetNameNorm
          : false;

        return (
          (matchId || matchName) &&
          Number(n.ano) === ANO_CORRENTE &&
          Number(n.bimestre) === Number(bim)
        );
      }) || {}
    );
  };

  const calcMedia = (arr) => {
    const hasAnyGrade = arr.some((x) => x.nota != null && x.nota !== "");
    if (!hasAnyGrade) return "";
    const sum = arr.reduce((acc, x) => {
      const val = x.nota != null && x.nota !== "" ? Number(x.nota) : 0;
      return acc + val;
    }, 0);
    return (sum / 4).toFixed(2);
  };

  const fmt = (val) => (val ? String(val).replace(".", ",") : "");

  // Soma total das notas do ano
  const somaNotas = notas
    .filter((n) => Number(n.ano) === ANO_CORRENTE)
    .map((n) => n.nota || 0)
    .reduce((a, b) => Number(a) + Number(b), 0)
    .toFixed(2);

  // Situação final (para um único ano, precisa dos 4 bimestres)
  function getSituacaoFinal(bimestres) {
    const nota4Bim = bimestres[3]?.nota;
    if (nota4Bim == null || nota4Bim === "") {
      return <span className={s.statusCursando}>Cursando...</span>;
    }
    const notasValidas = bimestres
      .map((x) => Number(x.nota))
      .filter((n) => !isNaN(n));
    if (notasValidas.length < 4) {
      return <span className={s.statusCursando}>Cursando...</span>;
    }
    const media = notasValidas.reduce((a, b) => a + b, 0) / 4;
    return media >= 5 ? (
      <span className={s.statusAprovado}>APROVADO</span>
    ) : (
      <span className={s.statusRecuperacao}>RECUPERAÇÃO</span>
    );
  }

  const alunoSemNotas = Array.isArray(notas) && notas.length === 0;

  // Helper para renderizar um ranking card
  function RankingCard({ icon, titulo, data }) {
    return (
      <div className={s.rankingCard}>
        <div className={s.rankingIcon}>{icon}</div>
        <div className={s.rankingTitulo}>{titulo}</div>
        {data && !data.semNotas ? (
          <div className={s.rankingValor}>
            {data.ranking}º / {data.total_alunos}
          </div>
        ) : (
          <div className={s.rankingSemNota}>Sem dados</div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────
  return (
    <div className={s.boletimAnualWrapper}>
      {/* Aviso sem notas */}
      {alunoSemNotas && showSemNotas && (
        <div className={s.avisoSemNotas}>
          <span>⚠️</span>
          <span>Este aluno ainda não possui notas registradas para {ANO_CORRENTE}.</span>
          <button
            className={s.avisoSemNotasClose}
            onClick={() => setShowSemNotas(false)}
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}

      {/* ──── CABEÇALHO INSTITUCIONAL ──── */}
      {(() => {
        const escolaInfo = getEscolaDetalhes(aluno?.escola_id);
        const showLogoEsquerda = logoEsquerda && logoEsquerda !== "/logo-escola-left.png";
        const showLogoDireita = logoDireita && logoDireita !== "/logo-escola-right.png";

        return (
          <div className={s.cabecalho}>
            {showLogoEsquerda && (
              <img
                src={logoEsquerda}
                alt="Logo esquerda"
                className={s.cabecalhoLogo}
                onError={e => { e.target.style.display = "none"; }}
              />
            )}
            <div className={s.cabecalhoTexto}>
              <div>{escolaInfo.estado}</div>
              <div>SECRETARIA DE ESTADO DE EDUCAÇÃO – {escolaInfo.cre}</div>
              <div>{escolaInfo.nome}</div>
              <div>INEP {escolaInfo.inep}</div>
              <div className={s.anoLetivoBadge}>
                📅 ANO LETIVO {ANO_CORRENTE}
              </div>
            </div>
            {showLogoDireita && (
              <img
                src={logoDireita}
                alt="Logo direita"
                className={s.cabecalhoLogoSmall}
                onError={e => { e.target.style.display = "none"; }}
              />
            )}
          </div>
        );
      })()}

      {/* ──── DADOS DO ALUNO ──── */}
      <div className={s.dadosAluno}>
        <div>
          <strong>CÓDIGO:</strong> {aluno.codigo}
        </div>
        <div>
          <strong>ESTUDANTE:</strong> {aluno.estudante}
        </div>
        <div>
          <strong>TURNO:</strong> {aluno.turno}
        </div>
        <div>
          <strong>TURMA:</strong> {aluno.turma}
        </div>
      </div>

      {/* ──── TABELA DE BOLETIM ──── */}
      {/* ──── TABELA DE BOLETIM ──── */}
      <div className={s.tabelaContainer}>
        {aluno?.regime === "semestral" ? (
          <table className={s.tabela}>
            <thead>
              <tr>
                <th rowSpan={3} className={s.cabDisc}>Componentes<br />Curriculares</th>
                <th colSpan={govConfig.exibirFaltas ? 5 : 3} className={s.anoHeader}>1º SEMESTRE ({ANO_CORRENTE})</th>
                
                <th rowSpan={3} className={s.cabDisc} style={{ borderLeft: "2px solid #cbd5e1" }}>Componentes<br />Curriculares</th>
                <th colSpan={govConfig.exibirFaltas ? 5 : 3} className={s.anoHeader}>2º SEMESTRE ({ANO_CORRENTE})</th>
                
                <th rowSpan={2} colSpan={govConfig.exibirFaltas ? 2 : 1} className={s.resultadoHeader}>Resultado Final</th>
                <th rowSpan={3} className={s.situacaoHeader}>Situação<br />Final</th>
              </tr>
              <tr>
                {/* 1º Semestre */}
                {[1, 2].map((i) => (
                  <th key={`bim${i}`} colSpan={govConfig.exibirFaltas ? 2 : 1} className={s.bimestreHeader}>{i}º BIM.</th>
                ))}
                <th rowSpan={2} className={s.mediaCell} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 700, fontSize: '0.7rem', padding: '4px 2px', width: '28px', maxWidth: '28px' }}>Média</th>
                
                {/* 2º Semestre */}
                {[3, 4].map((i) => (
                  <th key={`bim${i}`} colSpan={govConfig.exibirFaltas ? 2 : 1} className={s.bimestreHeader}>{i}º BIM.</th>
                ))}
                <th rowSpan={2} className={s.mediaCell} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 700, fontSize: '0.7rem', padding: '4px 2px', width: '28px', maxWidth: '28px' }}>Média</th>
              </tr>
              <tr>
                {[1, 2].map((i) => (
                  <React.Fragment key={`sub${i}`}>
                    <th className={s.rotated}>Notas</th>
                    {govConfig.exibirFaltas && <th className={s.rotated}>Faltas</th>}
                  </React.Fragment>
                ))}
                {[3, 4].map((i) => (
                  <React.Fragment key={`sub${i}`}>
                    <th className={s.rotated}>Notas</th>
                    {govConfig.exibirFaltas && <th className={s.rotated}>Faltas</th>}
                  </React.Fragment>
                ))}
                <th className={s.rotated}>Notas</th>
                {govConfig.exibirFaltas && <th className={s.rotated}>Faltas</th>}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const maxLength = Math.max(disciplinasSem1.length, disciplinasSem2.length);
                const zippedDisciplinas = [];
                for (let i = 0; i < maxLength; i++) {
                  zippedDisciplinas.push({
                    sem1: disciplinasSem1[i] || null,
                    sem2: disciplinasSem2[i] || null
                  });
                }
                
                return zippedDisciplinas.map((row, idx) => {
                  const disc1 = row.sem1;
                  const disc2 = row.sem2;
                  
                  // Sem 1 logic
                  const bimsSem1 = disc1 ? [1, 2].map((b) => findNota(disc1.id, b)) : [];
                  const mediaSem1 = bimsSem1.some(x => x.nota != null && x.nota !== "") 
                      ? (bimsSem1.reduce((a, x) => a + Number(x.nota || 0), 0) / 2).toFixed(2) 
                      : "";

                  // Sem 2 logic
                  const bimsSem2 = disc2 ? [3, 4].map((b) => findNota(disc2.id, b)) : [];
                  const mediaSem2 = bimsSem2.some(x => x.nota != null && x.nota !== "") 
                      ? (bimsSem2.reduce((a, x) => a + Number(x.nota || 0), 0) / 2).toFixed(2) 
                      : "";

                  // Result / Final
                  let mediaFin = mediaSem2;
                  let faltasFin = disc2 ? bimsSem2.reduce((a, b) => a + (Number(b.faltas) || 0), 0) : "";
                  let sitFinal = <span className={s.statusCursando}>Cursando...</span>;
                  if (disc2) {
                     const n4 = bimsSem2[1]?.nota;
                     if (n4 != null && n4 !== "") {
                         const valid = bimsSem2.map(x => Number(x.nota)).filter(n => !isNaN(n));
                         if (valid.length >= 2) {
                             const avg = valid.reduce((a, b) => a + b, 0) / 2;
                             sitFinal = avg >= 5 ? <span className={s.statusAprovado}>APROVADO</span> : <span className={s.statusRecuperacao}>RECUPERAÇÃO</span>;
                         }
                     }
                  } else {
                     sitFinal = null;
                     mediaFin = "";
                  }

                  return (
                    <tr key={idx}>
                      {/* 1º Semestre */}
                      <td className={s.disc}>{disc1 ? disc1.nome.toUpperCase() : ""}</td>
                      {disc1 ? bimsSem1.map((x, i) => (
                        <React.Fragment key={`b1${i}`}>
                          <td className={s.notaCell}>{x.nota != null ? fmt(Number(x.nota).toFixed(2)) : ""}</td>
                          {govConfig.exibirFaltas && <td className={s.faltaCell}>{x.faltas != null ? x.faltas : ""}</td>}
                        </React.Fragment>
                      )) : (
                         <React.Fragment>
                            <td className={s.notaCell}></td>{govConfig.exibirFaltas && <td className={s.faltaCell}></td>}
                            <td className={s.notaCell}></td>{govConfig.exibirFaltas && <td className={s.faltaCell}></td>}
                         </React.Fragment>
                      )}
                      <td className={s.mediaCell}>{disc1 ? fmt(mediaSem1) : ""}</td>

                      {/* 2º Semestre */}
                      <td className={s.disc} style={{ borderLeft: "2px solid #cbd5e1" }}>{disc2 ? disc2.nome.toUpperCase() : ""}</td>
                      {disc2 ? bimsSem2.map((x, i) => (
                        <React.Fragment key={`b2${i}`}>
                          <td className={s.notaCell}>{x.nota != null ? fmt(Number(x.nota).toFixed(2)) : ""}</td>
                          {govConfig.exibirFaltas && <td className={s.faltaCell}>{x.faltas != null ? x.faltas : ""}</td>}
                        </React.Fragment>
                      )) : (
                         <React.Fragment>
                            <td className={s.notaCell}></td>{govConfig.exibirFaltas && <td className={s.faltaCell}></td>}
                            <td className={s.notaCell}></td>{govConfig.exibirFaltas && <td className={s.faltaCell}></td>}
                         </React.Fragment>
                      )}
                      <td className={s.mediaCell}>{disc2 ? fmt(mediaSem2) : ""}</td>
                      
                      {/* Resultado Final (for Sem 2) */}
                      <td className={s.finalCell}>{disc2 ? fmt(mediaFin) : ""}</td>
                      {govConfig.exibirFaltas && <td className={s.faltasFinalCell}>{disc2 ? faltasFin : ""}</td>}
                      <td className={s.situacaoCell}>{disc2 ? sitFinal : ""}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        ) : (
          <table className={s.tabela}>
            <thead>
              <tr>
                <th rowSpan={3} className={s.cabDisc}>
                  Componentes<br />Curriculares
                </th>
                <th colSpan={govConfig.exibirFaltas ? 8 : 4} className={s.anoHeader}>
                  {ANO_CORRENTE}
                </th>
                <th rowSpan={2} className={s.mediaCell} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 700, fontSize: '0.7rem', padding: '4px 2px', minWidth: 24 }}>
                  Média
                </th>
                <th rowSpan={2} colSpan={govConfig.exibirFaltas ? 2 : 1} className={s.resultadoHeader}>
                  Resultado Final
                </th>
                <th rowSpan={3} className={s.situacaoHeader}>
                  Situação<br />Final
                </th>
              </tr>
              <tr>
                {[1, 2, 3, 4].map((i) => (
                  <th key={`bim${i}`} colSpan={govConfig.exibirFaltas ? 2 : 1} className={s.bimestreHeader}>
                    {i}º BIM.
                  </th>
                ))}
              </tr>
              <tr>
                {[1, 2, 3, 4].map((i) => (
                  <React.Fragment key={`sub${i}`}>
                    <th className={s.rotated}>Notas</th>
                    {govConfig.exibirFaltas && <th className={s.rotated}>Faltas</th>}
                  </React.Fragment>
                ))}
                <th className={s.rotated}>Média</th>
                <th className={s.rotated}>Notas</th>
                {govConfig.exibirFaltas && <th className={s.rotated}>Faltas</th>}
              </tr>
            </thead>
            <tbody>
              {disciplinas.map((disc) => {
                const bims = [1, 2, 3, 4].map((b) => findNota(disc.id, b));
                const media = calcMedia(bims);
                const mediaFin = media;
                const faltasFin = bims.reduce((a, b) => a + (Number(b.faltas) || 0), 0);

                return (
                  <tr key={disc.id}>
                    <td className={s.disc}>{disc.nome}</td>
                    {bims.map((x, i) => (
                      <React.Fragment key={`b${i}`}>
                        <td className={s.notaCell}>
                          {x.nota != null ? fmt(Number(x.nota).toFixed(2)) : ""}
                        </td>
                        {govConfig.exibirFaltas && (
                          <td className={s.faltaCell}>
                            {x.faltas != null ? x.faltas : ""}
                          </td>
                        )}
                      </React.Fragment>
                    ))}
                    <td className={s.mediaCell}>{fmt(media)}</td>
                    <td className={s.finalCell}>{fmt(mediaFin)}</td>
                    {govConfig.exibirFaltas && (
                      <td className={s.faltasFinalCell}>{faltasFin || ""}</td>
                    )}
                    <td className={s.situacaoCell}>{getSituacaoFinal(bims)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ──── RODAPÉ COM RANKINGS ──── */}
      <div className={s.rodape}>
        {/* Soma total + Médias por Bimestre */}
        <div className={s.somaNotas}>
          <span className={s.somaNotasLabel}>Soma das notas:</span>
          <span className={s.somaNotasValor}>{fmt(somaNotas)}</span>

          {/* 4 Badges de Média por Bimestre (governança: exibirMediaRodape) */}
          {govConfig.exibirMediaRodape && (
            <div className={s.mediasBimGrid}>
              {[1, 2, 3, 4].map((bim) => {
                const notasDoBim = disciplinas
                  .map((disc) => findNota(disc.id, bim))
                  .map((x) => x.nota)
                  .filter((x) => x != null);
                const mediaBim = notasDoBim.length
                  ? (notasDoBim.reduce((a, b) => Number(a) + Number(b), 0) / notasDoBim.length).toFixed(2)
                  : null;

                return (
                  <div key={bim} className={s.mediaBimBadge} title={`Média geral do ${bim}º bimestre`}>
                    <span className={s.mediaBimLabel}>{bim}º Bim</span>
                    {mediaBim ? (
                      <span className={s.mediaBimValor}>{fmt(mediaBim)}</span>
                    ) : (
                      <span className={s.mediaBimVazio}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grid de Rankings (governança: exibirRanking) */}
        {govConfig.exibirRanking && (
          <div className={s.rankingGrid}>
            <RankingCard icon="🏫" titulo="Ranking Turma" data={ranking?.turma} />
            <RankingCard icon="📚" titulo="Ranking Série" data={ranking?.serie} />
            <RankingCard icon="🕐" titulo="Ranking Turno" data={ranking?.turno} />
            <RankingCard icon="🏆" titulo="Ranking Escola" data={ranking?.escola} />
          </div>
        )}

        {/* Observações */}
        <div className={s.observacoes}>
          <strong>📌 Observações:</strong>
          <span>Procure sempre melhorar suas notas e frequência escolar!</span>
        </div>

        {/* Botão Imprimir */}
        {exibirBotaoImprimir && (
          <button
            className={s.btnImprimir}
            onClick={() => window.print()}
            type="button"
          >
            🖨️ IMPRIMIR BOLETIM
          </button>
        )}
      </div>
    </div>
  );
}
