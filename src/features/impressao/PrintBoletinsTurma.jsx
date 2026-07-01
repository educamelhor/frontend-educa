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

  // -------------------------------------------------------------------------
  // Estados locais
  // alunos → lista de alunos da turma, cada um com suas notas detalhadas
  // carregado → indica que a API respondeu
  // -------------------------------------------------------------------------
  const [alunos, setAlunos] = useState([]);
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
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (turma_id) {
      const url = `/api/impressao/boletins?turma_id=${turma_id}${
        secret ? `&secret=${secret}` : ""
      }`;

      api
        .get(url)
        .then((res) => {
          console.log("Resposta completa da API de boletins:", res.data);

          // Rota pode retornar { alunos: [...] } ou { data: { alunos: [...] } }
          let resultado = [];
          if (res.data.alunos) {
            resultado = res.data.alunos;
          } else if (res.data.data && res.data.data.alunos) {
            resultado = res.data.data.alunos;
          }

          setAlunos(resultado);
          setCarregado(true);
          console.log("Boletins retornados para turma_id", turma_id, resultado);
        })
        .catch((err) => {
          setAlunos([]);
          setCarregado(true);
          console.error("Erro ao buscar boletins:", err);
        });
    }
  }, [turma_id, secret]);

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
        {alunos.map((aluno, idx) =>
          aluno && aluno.codigo ? (
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
              <BoletimAnual
                codigo={aluno.codigo}
                alunoPreCarregado={aluno}
                notasPreCarregadas={aluno.notas}
                exibirBotaoImprimir={false}
                anoLetivo={anoParam ? Number(anoParam) : undefined}
              />
            </div>
          ) : null
        )}
      </div>
    )}

    {/* 🔑 Sinalizador SEMPRE presente, mesmo sem alunos */}
    <div id="render-completo" style={{ display: "none" }} />
  </div>
);
}
