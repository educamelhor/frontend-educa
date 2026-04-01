// src/features/boletim/BoletimAnual.jsx
// ============================================================================
// BOLETIM ANUAL — Ano Letivo Único (Modelo V2)
// Renderiza apenas o ano letivo corrente (ex: 2025).
// Mantém: cabeçalho institucional, colunas nota/falta, média, resultado final,
//          situação final, ranking escola/turma/série/turno.
// O modelo original (dois anos) permanece intacto em Boletim.jsx / BoletimPrint.jsx
// ============================================================================

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import s from "./BoletimAnual.module.css";

// Ano letivo corrente
const ANO_CORRENTE = new Date().getFullYear();

export default function BoletimAnual({
  codigo: codigoProp,
  exibirBotaoImprimir = true,
  onLoaded,
  // Suporte pre-carregado (impressão em lote)
  alunoPreCarregado = null,
  notasPreCarregadas = null,
  // Config de governança pré-carregada (evita segunda chamada API)
  boletimConfig: boletimConfigProp = null,
}) {
  const params = useParams?.() || {};
  const codigo = codigoProp || params.codigo;

  const [aluno, setAluno] = useState(null);
  const [notas, setNotas] = useState(notasPreCarregadas);
  const [ranking, setRanking] = useState(null);
  const [erro, setErro] = useState("");
  const [showSemNotas, setShowSemNotas] = useState(true);

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
      // Fluxo pre-carregado (impressão em lote)
      if (notasPreCarregadas) {
        if (!cancelado) {
          setAluno({
            codigo,
            estudante: alunoPreCarregado?.nome || alunoPreCarregado?.estudante || "",
            turma: alunoPreCarregado?.turma || "",
            turno: alunoPreCarregado?.turno || "",
            serie: alunoPreCarregado?.serie || "",
            id: alunoPreCarregado?.id || null,
          });
          setNotas(notasPreCarregadas);
          setRanking(alunoPreCarregado?.ranking || null);
        }
        if (typeof onLoaded === "function") onLoaded();
        return;
      }

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
      } finally {
        if (typeof onLoaded === "function") onLoaded();
      }
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
    { id: 51, nome: "Prática Estudantil" },
  ];

  // ───────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────
  const findNota = (discId, bim) => {
    return (
      notas.find(
        (n) =>
          (n.disciplina_id === undefined
            ? n.disciplina === disciplinas.find((d) => d.id === discId)?.nome
            : Number(n.disciplina_id) === Number(discId)) &&
          Number(n.ano) === ANO_CORRENTE &&
          Number(n.bimestre) === Number(bim)
      ) || {}
    );
  };

  const calcMedia = (arr) => {
    const vals = arr.map((x) => x.nota).filter((x) => x != null);
    return vals.length
      ? (vals.reduce((a, b) => Number(a) + Number(b), 0) / vals.length).toFixed(2)
      : "";
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
      <div className={s.cabecalho}>
        <img
          src="/logo-escola-left.png"
          alt="Logo esquerda"
          className={s.cabecalhoLogo}
        />
        <div className={s.cabecalhoTexto}>
          <div>GOVERNO DO DISTRITO FEDERAL</div>
          <div>SECRETARIA DE ESTADO DE EDUCAÇÃO – CRE – PLANALTINA</div>
          <div>CENTRO DE ENSINO FUNDAMENTAL 04 – COLÉGIO CÍVICO MILITAR</div>
          <div>INEP 53006160</div>
          <div className={s.anoLetivoBadge}>
            📅 ANO LETIVO {ANO_CORRENTE}
          </div>
        </div>
        <img
          src="/logo-escola-right.png"
          alt="Logo direita"
          className={s.cabecalhoLogoSmall}
        />
      </div>

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
      <div className={s.tabelaContainer}>
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
              const notasFin = bims.map((x) => x.nota).filter((x) => x != null);
              const mediaFin = notasFin.length
                ? (notasFin.reduce((a, b) => Number(a) + Number(b), 0) / notasFin.length).toFixed(2)
                : "";
              const faltasFin = bims.reduce((a, b) => a + (b.faltas || 0), 0);

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
