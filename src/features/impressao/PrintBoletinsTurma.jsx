// src/features/impressao/PrintBoletinsTurma.jsx
// ============================================================================
// Componente exclusivo para renderizar boletins em lote (um por página).
// Utiliza a rota /api/impressao/boletins, que retorna todos os alunos
// da turma já com suas notas detalhadas, evitando múltiplas requisições.
// Fluxo de automação real: sem botão manual, apenas container invisível.
// Usa BoletimAnual (ano único) em vez do modelo de dois anos.
// ============================================================================

import React, { useEffect, useState, useRef } from "react";
import BoletimAnual from "../boletim/BoletimAnual"; // ← layout de um único ano letivo
import BoletimPrint from "../boletim/BoletimPrint"; // ← layout de 2 anos (quando boletim.exibir_ano_anterior = "1")
import api from "../../services/api";

export default function PrintBoletinsTurma() {
  // -------------------------------------------------------------------------
  // Captura parâmetros da URL: turma_id, secret, ano
  // Exemplo: /print/boletins?turma_id=150&secret=123456&ano=2026
  // -------------------------------------------------------------------------
  const params = new URLSearchParams(window.location.search);
  const turma_id = params.get("turma_id");
  const secret = params.get("secret");
  const anoParam = params.get("ano");  // ano letivo selecionado (ex: "2026")
  const aluno_id = params.get("aluno_id"); // se presente, filtra apenas para este aluno

  // -------------------------------------------------------------------------
  // Estados locais
  // alunos → lista de alunos da turma, cada um com suas notas detalhadas
  // boletimConfig → configurações da categoria Boletim (Direção > Governança)
  // carregado → indica que a API respondeu
  // -------------------------------------------------------------------------
  const [alunos, setAlunos] = useState([]);
  const [boletimConfig, setBoletimConfig] = useState(null);
  const [carregado, setCarregado] = useState(false);

  // -------------------------------------------------------------------------
  // Ref para container invisível (útil se for necessário com Puppeteer)
  // -------------------------------------------------------------------------
  const printRef = useRef(null);

  // -------------------------------------------------------------------------
  // Ao montar, força scroll no topo (boa prática em páginas de impressão)
  // -------------------------------------------------------------------------
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // -------------------------------------------------------------------------
  // Busca os boletins da turma usando a rota oficial /api/impressao/boletins
  // e garante que a configuração de Governança (Boletim) da escola esteja carregada
  // ANTES de sinalizar #render-completo para o Playwright.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (turma_id) {
      const url = `/api/impressao/boletins?turma_id=${turma_id}${
        aluno_id ? `&aluno_id=${encodeURIComponent(aluno_id)}` : ""
      }${anoParam ? `&ano=${encodeURIComponent(anoParam)}` : ""}${secret ? `&secret=${secret}` : ""}`;

      api
        .get(url)
        .then(async (res) => {
          console.log("Resposta completa da API de boletins:", res.data);

          // Rota pode retornar { alunos: [...] } ou { data: { alunos: [...] } }
          let resultado = [];
          let cfg = res.data?.boletim_config || res.data?.data?.boletim_config || null;

          if (res.data.alunos) {
            resultado = res.data.alunos;
          } else if (res.data.data && res.data.data.alunos) {
            resultado = res.data.data.alunos;
          }

          if (aluno_id && resultado.length > 1) {
            resultado = resultado.filter(
              (a) =>
                String(a.id) === String(aluno_id) ||
                String(a.codigo) === String(aluno_id) ||
                Number(a.id) === Number(aluno_id)
            );
          }

          if (!cfg && resultado.length > 0 && resultado[0]?.boletim_config) {
            cfg = resultado[0].boletim_config;
          }

          if (!cfg) {
            const escId = resultado[0]?.escola_id || localStorage.getItem("escola_id");
            if (escId) {
              try {
                const cfgRes = await api.get("/api/governanca/boletim-config", {
                  params: { escola_id: escId },
                });
                cfg = cfgRes.data?.config || null;
              } catch {
                cfg = null;
              }
            }
          }

          setBoletimConfig(cfg);
          setAlunos(resultado);
          setCarregado(true);
          console.log("Boletins retornados para turma_id", turma_id, resultado);
        })
        .catch((err) => {
          console.error("Erro ao buscar boletins:", err);
          setAlunos([]);
          setCarregado(true);
        });
    }
  }, [turma_id, secret, aluno_id, anoParam]);

  // -------------------------------------------------------------------------
  // Estado de loading (API ainda não respondeu)
  // -------------------------------------------------------------------------
  if (!carregado) {
    return (
      <div
        style={{
          color: "#1e293b",
          fontSize: 22,
          textAlign: "center",
          margin: 40,
        }}
      >
        Carregando boletins...
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Renderização final: container invisível com todos os boletins
  // Cada aluno ocupa uma página separada (page-break)
  // -------------------------------------------------------------------------
  return (
    <div id="boletins-pronto" style={{ background: "#fff", margin: 0, padding: 0 }}>
      {carregado && alunos.length === 0 ? (
        <div
          style={{
            color: "#b91c1c",
            fontSize: 22,
            textAlign: "center",
            margin: 40,
          }}
        >
          Nenhum aluno encontrado para essa turma.
        </div>
      ) : (
        <div ref={printRef}>
          {alunos.map((aluno, idx) => {
            if (!aluno || !aluno.codigo) return null;
            const cfgEfetiva = aluno.boletim_config || boletimConfig || null;
            const exibirAnoAnterior = String(cfgEfetiva?.["boletim.exibir_ano_anterior"]) === "1";

            return (
              <div
                className="boletim-print-page"
                key={aluno.id || idx}
                style={{
                  /* page-break-after faz a quebra APÓS o boletim, antes do próximo */
                  pageBreakAfter: idx < alunos.length - 1 ? "always" : "avoid",
                  breakAfter:     idx < alunos.length - 1 ? "always" : "avoid",
                  /* page-break-inside:avoid impede que um único boletim quebre no meio */
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                  background: "#fff",
                  overflow: "hidden",   /* garante que conteúdo não vaze além do bloco */
                }}
              >
                {exibirAnoAnterior ? (
                  <BoletimPrint
                    codigo={aluno.codigo}
                    alunoPreCarregado={aluno}
                    notasPreCarregadas={aluno.notas}
                    boletimConfig={cfgEfetiva}
                    exibirBotaoImprimir={false}
                  />
                ) : (
                  <BoletimAnual
                    codigo={aluno.codigo}
                    alunoPreCarregado={aluno}
                    notasPreCarregadas={aluno.notas}
                    boletimConfig={cfgEfetiva}
                    exibirBotaoImprimir={false}
                    anoLetivo={anoParam ? Number(anoParam) : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 🔑 Sinalizador SEMPRE presente, mesmo sem alunos */}
      <div id="render-completo" style={{ display: "none" }} />
    </div>
  );
}
