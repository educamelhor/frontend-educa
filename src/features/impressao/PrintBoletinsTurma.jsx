// src/features/boletim/PrintBoletinsTurma.jsx
// ============================================================================
// Componente exclusivo para renderizar boletins em lote (um por página).
// Utiliza a rota /api/impressao/boletins, que retorna todos os alunos
// da turma já com suas notas detalhadas, evitando múltiplas requisições.
// Fluxo de automação real: sem botão manual, apenas container invisível.
//
// Governança: respeita "boletim.exibir_ano_anterior"
//   OFF → BoletimAnual (1 ano — padrão)
//   ON  → BoletimPrint (2 anos — modelo bianual)
// ============================================================================

import React, { useEffect, useState, useRef } from "react";
import BoletimPrint from "../boletim/BoletimPrint";
import BoletimAnual from "../boletim/BoletimAnual";
import api from "../../services/api";

export default function PrintBoletinsTurma() {
  // -------------------------------------------------------------------------
  // Captura parâmetros da URL: turma_id e secret
  // Exemplo: /print/boletins?turma_id=150&secret=123456
  // -------------------------------------------------------------------------
  const params = new URLSearchParams(window.location.search);
  const turma_id = params.get("turma_id");
  const secret = params.get("secret");

  // -------------------------------------------------------------------------
  // Estados locais
  // -------------------------------------------------------------------------
  const [alunos, setAlunos] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [exibirAnoAnterior, setExibirAnoAnterior] = useState(false);
  const [boletimConfig, setBoletimConfig] = useState(null);

  const printRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // -------------------------------------------------------------------------
  // Busca governance config + boletins da turma em paralelo
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!turma_id) return;

    const url = `/api/impressao/boletins?turma_id=${turma_id}${
      secret ? `&secret=${secret}` : ""
    }`;

    const escolaId = localStorage.getItem("escola_id");

    // Busca config de governança (uma única vez para toda a turma)
    const configPromise = escolaId
      ? api
          .get("/api/governanca/boletim-config", { params: { escola_id: escolaId } })
          .then((r) => r.data?.config || null)
          .catch(() => null)
      : Promise.resolve(null);

    // Busca alunos + notas da turma
    const alunosPromise = api
      .get(url)
      .then((res) => {
        let resultado = [];
        if (res.data.alunos) resultado = res.data.alunos;
        else if (res.data.data && res.data.data.alunos) resultado = res.data.data.alunos;
        return resultado;
      })
      .catch((err) => {
        console.error("Erro ao buscar boletins:", err);
        return [];
      });

    // Executa ambas em paralelo
    Promise.all([alunosPromise, configPromise]).then(([resultado, cfg]) => {
      setAlunos(resultado);
      if (cfg) {
        setBoletimConfig(cfg);
        const anoAnterior = cfg["boletim.exibir_ano_anterior"] === "1";
        setExibirAnoAnterior(anoAnterior);
        console.log("Governance: boletim.exibir_ano_anterior =", anoAnterior);
      }
      setCarregado(true);
      console.log("Boletins retornados para turma_id", turma_id, resultado);
    });
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
  // Renderização final: container com todos os boletins
  // Cada aluno ocupa uma página separada (page-break)
  //
  // Seleção do componente baseada na governance:
  //   exibirAnoAnterior = true  → BoletimPrint (2 colunas de ano)
  //   exibirAnoAnterior = false → BoletimAnual  (1 coluna de ano — padrão)
  // -------------------------------------------------------------------------
  return (
    <div id="boletins-pronto" style={{ background: "#fff", width: "100%" }}>
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
        <div ref={printRef} style={{ width: "100%" }}>
          {alunos.map((aluno, idx) =>
            aluno && aluno.codigo ? (
              <div
                className="boletim-print-page"
                key={aluno.id || idx}
                style={{
                  pageBreakAfter: idx < alunos.length - 1 ? "always" : "auto",
                  breakAfter: idx < alunos.length - 1 ? "always" : "auto",
                  background: "#fff",
                  width: "100%",
                }}
              >
                {exibirAnoAnterior ? (
                  // Modelo bianual (2 anos) — governance: boletim.exibir_ano_anterior = ON
                  <BoletimPrint
                    codigo={aluno.codigo}
                    alunoPreCarregado={aluno}
                    notasPreCarregadas={aluno.notas}
                    exibirBotaoImprimir={false}
                  />
                ) : (
                  // Modelo anual (1 ano) — governance: boletim.exibir_ano_anterior = OFF (padrão)
                  <BoletimAnual
                    codigo={aluno.codigo}
                    alunoPreCarregado={aluno}
                    notasPreCarregadas={aluno.notas}
                    exibirBotaoImprimir={false}
                    boletimConfig={boletimConfig}
                  />
                )}
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
