import React, { useMemo, useRef, useState } from "react";

// pdfjs + pdf-lib são pesados: carregados só quando o professor usa esta página
const carregarPdf = () => import("./chamadaPdf");

/**
 * Chamada.jsx — FASE 0 (protótipo, 100% no navegador)
 * ------------------------------------------------------------
 * Fluxo:
 *   1) Professor envia o PDF "Chamada para foto" emitido pelo EDUCADF;
 *   2) o sistema lê turma, disciplina, aulas (data/horário) e alunos;
 *   3) professor marca as faltas por aula e confirma ("Dei esta aula");
 *   4) o sistema gera o PDF ORIGINAL com as bolhas preenchidas (+ PNG 300 dpi).
 * Nada é enviado ao servidor nem ao EDUCADF nesta fase.
 * ------------------------------------------------------------
 */

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const dataCurta = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = DIAS[new Date(y, m - 1, d).getDay()];
  return { wd, dm: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}` };
};
const hojeIso = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
const rotuloAula = (c) => `${c.ordem ? `${c.ordem}ª` : "Aula"}${c.horario ? ` · ${c.horario}` : ""}`;
const slug = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");

const pill = (ativo, extra = {}) => ({
  padding: "0.5rem 1rem",
  borderRadius: "0.6rem",
  fontWeight: 700,
  fontSize: "0.85rem",
  cursor: "pointer",
  transition: "all 0.2s",
  background: ativo ? "linear-gradient(135deg,#22d3ee,#0ea5e9)" : "rgba(255,255,255,0.07)",
  color: ativo ? "#0f172a" : "#cbd5e1",
  border: ativo ? "none" : "1px solid rgba(255,255,255,0.12)",
  boxShadow: ativo ? "0 4px 14px rgba(34,211,238,0.35)" : "none",
  ...extra,
});

export default function Chamada() {
  const inputRef = useRef(null);
  const [modelo, setModelo] = useState(null);
  const [erro, setErro] = useState("");
  const [lendo, setLendo] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [colSel, setColSel] = useState(null);
  const [faltas, setFaltas] = useState({}); // { [colKey]: number[] }
  const [confirmadas, setConfirmadas] = useState(() => new Set());
  const [gerando, setGerando] = useState(false);
  const [gerado, setGerado] = useState(null); // { bytes, previas, nome }

  const hoje = hojeIso();

  const porData = useMemo(() => {
    if (!modelo) return [];
    const mapa = new Map();
    modelo.colunas
      .filter((c) => !c.semAula && c.data)
      .forEach((c) => {
        if (!mapa.has(c.data)) mapa.set(c.data, []);
        mapa.get(c.data).push(c);
      });
    return [...mapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, cols]) => ({ data, cols: cols.sort((a, b) => a.pageIndex - b.pageIndex || a.col - b.col) }));
  }, [modelo]);

  const colAtual = modelo && colSel ? modelo.colunas.find((c) => c.key === colSel) : null;
  const linhasFalta = new Set(colAtual ? faltas[colAtual.key] || [] : []);

  const resetar = () => {
    setModelo(null); setErro(""); setEtapa(1); setColSel(null);
    setFaltas({}); setConfirmadas(new Set()); setGerado(null);
  };

  const onArquivo = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    resetar();
    setLendo(true);
    try {
      const { lerFolhaEducaDF } = await carregarPdf();
      const m = await lerFolhaEducaDF(f);
      if (!m.colunas.some((c) => !c.semAula)) throw new Error("Não encontrei aulas (datas) nesta folha.");
      setModelo(m);
      setEtapa(2);
    } catch (err) {
      console.error(err);
      setErro(err.message || "Não foi possível ler o PDF.");
    } finally {
      setLendo(false);
    }
  };

  const alternarFalta = (linha) => {
    if (!colAtual) return;
    setGerado(null);
    setFaltas((prev) => {
      const atual = new Set(prev[colAtual.key] || []);
      atual.has(linha) ? atual.delete(linha) : atual.add(linha);
      return { ...prev, [colAtual.key]: [...atual] };
    });
  };

  const limparAula = () => {
    if (!colAtual) return;
    setGerado(null);
    setFaltas((prev) => ({ ...prev, [colAtual.key]: [] }));
  };

  const alternarConfirmada = () => {
    if (!colAtual) return;
    setGerado(null);
    setConfirmadas((prev) => {
      const n = new Set(prev);
      n.has(colAtual.key) ? n.delete(colAtual.key) : n.add(colAtual.key);
      return n;
    });
  };

  const exemploDeTeste = () => {
    const primeira = porData.find((d) => d.data <= hoje)?.cols[0];
    if (!primeira || !modelo.alunos.length) return;
    setGerado(null);
    setFaltas({ [primeira.key]: [modelo.alunos[0].linha] });
    setConfirmadas(new Set([primeira.key]));
    setColSel(primeira.key);
    setEtapa(2);
  };

  const resumo = useMemo(() => {
    if (!modelo) return [];
    return modelo.colunas
      .filter((c) => !c.semAula && (confirmadas.has(c.key) || (faltas[c.key] || []).length))
      .map((c) => ({
        c,
        confirmada: confirmadas.has(c.key),
        nFaltas: (faltas[c.key] || []).length,
      }))
      .sort((a, b) => (a.c.data || "").localeCompare(b.c.data || "") || a.c.col - b.c.col);
  }, [modelo, faltas, confirmadas]);

  const gerar = async () => {
    setGerando(true);
    setErro("");
    try {
      const { gerarPdfPreenchido, renderizarPagina } = await carregarPdf();
      const bytes = await gerarPdfPreenchido(modelo, faltas, confirmadas);
      const previas = [];
      for (let i = 0; i < modelo.folhas.length; i++) {
        const cv = await renderizarPagina(bytes, i, 90);
        previas.push(cv.toDataURL("image/png"));
      }
      setGerado({ bytes, previas, nome: `Chamada-${slug(modelo.turma)}-${slug(modelo.disciplina)}-preenchida` });
      setEtapa(3);
    } catch (err) {
      console.error(err);
      setErro(err.message || "Falha ao gerar o PDF.");
    } finally {
      setGerando(false);
    }
  };

  const baixarPdf = async () => {
    const { baixarBlob } = await carregarPdf();
    baixarBlob(new Blob([gerado.bytes], { type: "application/pdf" }), `${gerado.nome}.pdf`);
  };
  const baixarPng = async (i) => {
    const { renderizarPagina, baixarBlob } = await carregarPdf();
    const cv = await renderizarPagina(gerado.bytes, i, 300);
    cv.toBlob((b) => b && baixarBlob(b, `${gerado.nome}-pag${i + 1}.png`), "image/png");
  };

  const etapas = [
    { n: 1, titulo: "Folha EDUCADF", sub: modelo ? `${modelo.turma} · ${modelo.disciplina}` : "Enviar o PDF", ok: !!modelo },
    { n: 2, titulo: "Aula e faltas", sub: colAtual ? `${dataCurta(colAtual.data).dm} · ${rotuloAula(colAtual)}` : "Selecionar a aula", ok: confirmadas.size > 0 },
    { n: 3, titulo: "Gerar arquivo", sub: gerado ? "PDF pronto" : "PDF e PNG", ok: !!gerado },
  ];

  return (
    <div className="space-y-6">
      {/* ───────── Cabeçalho com etapas ───────── */}
      <div style={{ borderRadius: "1.2rem", overflow: "hidden", background: "linear-gradient(135deg,#0f172a,#1e1b4b)", boxShadow: "0 10px 30px rgba(15,23,42,0.35)" }}>
        <div style={{ padding: "1.4rem 2rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ color: "#fff", fontSize: "1.6rem", fontWeight: 900, letterSpacing: "0.02em" }}>
              CHAMADA <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.12em", marginLeft: 8 }}>FOLHA EDUCADF</span>
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: 2 }}>
              Protótipo (Fase 0) — o arquivo é gerado no seu navegador; nada é enviado ao servidor ou ao EDUCADF.
            </p>
          </div>
          {modelo && (
            <button onClick={resetar} style={pill(false, { fontSize: "0.75rem", padding: "0.4rem 0.9rem" })}>Trocar folha</button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {etapas.map((e) => {
            const habilitada = e.n === 1 || !!modelo;
            const ativa = etapa === e.n;
            return (
              <button
                key={e.n}
                disabled={!habilitada}
                onClick={() => habilitada && (e.n !== 3 || gerado) && setEtapa(e.n)}
                style={{
                  textAlign: "left", padding: "0.9rem 1.4rem", background: "transparent", cursor: habilitada ? "pointer" : "not-allowed",
                  opacity: habilitada ? 1 : 0.4, border: "none",
                  borderBottom: ativa ? "2px solid #22d3ee" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: "0.7rem",
                }}
              >
                <span style={{ width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "0.7rem", fontWeight: 800, background: e.ok ? "#22d3ee" : "rgba(255,255,255,0.12)", color: e.ok ? "#0f172a" : "#cbd5e1" }}>
                  {e.ok ? "✓" : e.n}
                </span>
                <span>
                  <span style={{ display: "block", fontSize: "0.62rem", color: "#22d3ee", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Etapa {e.n}</span>
                  <span style={{ display: "block", fontSize: "0.85rem", color: "#fff", fontWeight: 700 }}>{e.titulo}</span>
                  <span style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8" }}>{e.sub}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* ───────── Painel da etapa ───────── */}
        <div style={{ padding: "1.4rem 2rem 1.7rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {etapa === 1 && (
            <div>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.7rem" }}>
                Envie o PDF “Chamada para foto” baixado do EDUCADF
              </p>
              <input ref={inputRef} type="file" accept="application/pdf" onChange={onArquivo} style={{ display: "none" }} />
              <button onClick={() => inputRef.current?.click()} disabled={lendo} style={pill(true, { padding: "0.7rem 1.4rem" })}>
                {lendo ? "Lendo o PDF…" : "Escolher o PDF da folha"}
              </button>
              <div style={{ marginTop: "1rem", padding: "0.8rem 1rem", borderRadius: "0.6rem", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", color: "#fde68a", fontSize: "0.78rem", lineHeight: 1.5 }}>
                <strong>Use uma folha emitida agora.</strong> O EDUCADF recusa folhas antigas com a mensagem
                “A turma mudou desde a impressão desta folha — emita a folha de novo”. Emita a folha no EDUCADF
                imediatamente antes de usar aqui.
              </div>
            </div>
          )}

          {etapa === 2 && modelo && (
            <div>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.7rem" }}>
                Selecione a aula · {modelo.turma} · {modelo.disciplina}
                {modelo.periodo.ini ? ` · ${modelo.periodo.ini} a ${modelo.periodo.fim}` : ""}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem" }}>
                {porData.map(({ data, cols }) => {
                  const d = dataCurta(data);
                  const futura = data > hoje;
                  return (
                    <div key={data} style={{ display: "flex", flexDirection: "column", gap: 4, opacity: futura ? 0.4 : 1 }} title={futura ? "Aula futura: ainda não pode ser lançada" : undefined}>
                      <span style={{ fontSize: "0.65rem", color: data === hoje ? "#22d3ee" : "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {d.wd} {d.dm}{data === hoje ? " · hoje" : ""}
                      </span>
                      <div style={{ display: "flex", gap: 4 }}>
                        {cols.map((c) => {
                          const conf = confirmadas.has(c.key);
                          const n = (faltas[c.key] || []).length;
                          return (
                            <button key={c.key} disabled={futura} onClick={() => setColSel(c.key)} style={pill(colSel === c.key, { padding: "0.4rem 0.7rem", fontSize: "0.75rem", cursor: futura ? "not-allowed" : "pointer" })}>
                              {conf ? "✓ " : ""}{rotuloAula(c)}{n > 0 ? ` · ${n}F` : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: "1rem" }}>
                <button onClick={exemploDeTeste} style={pill(false, { fontSize: "0.72rem", padding: "0.35rem 0.8rem" })}>
                  Preencher exemplo de teste (1 falta + 1 “Dei esta aula”)
                </button>
              </div>
            </div>
          )}

          {etapa === 3 && gerado && (
            <p style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
              Arquivo gerado a partir do PDF original, com as faltas marcadas em “X” (formato que o leitor do EDUCADF reconheceu nos testes).
              Confira a pré-visualização abaixo, baixe o PDF (ou o PNG de cada página) e envie em “Enviar arquivos” no EDUCADF — ele mostra a leitura antes de gravar.
            </p>
          )}
        </div>
      </div>

      {erro && (
        <div className="p-4 rounded-xl font-bold bg-red-100 text-red-800 border border-red-200">{erro}</div>
      )}

      {modelo?.avisos?.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-sm">
          <strong>Atenção na leitura do PDF:</strong>
          <ul className="list-disc ml-5 mt-1">{modelo.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}

      {/* ───────── Grade de alunos ───────── */}
      {etapa === 2 && colAtual && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-800">
                {dataCurta(colAtual.data).wd} {dataCurta(colAtual.data).dm} · {rotuloAula(colAtual)}
              </h2>
              <p className="text-xs text-slate-500">
                Toque no aluno que <strong>faltou</strong>. Sem marca = presente.{" "}
                <strong className="text-rose-600">{linhasFalta.size} falta(s)</strong> de {modelo.alunos.length}.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={limparAula} className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Todos presentes</button>
              <button
                onClick={alternarConfirmada}
                className={`px-4 py-2 rounded-lg text-sm font-black ${confirmadas.has(colAtual.key) ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
              >
                {confirmadas.has(colAtual.key) ? "✓ Aula confirmada" : "Dei esta aula"}
              </button>
            </div>
          </div>

          <div className="p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {modelo.alunos.map((a) => {
              const falta = linhasFalta.has(a.linha);
              return (
                <button
                  key={a.linha}
                  onClick={() => alternarFalta(a.linha)}
                  className={`text-left px-4 py-3 rounded-xl border-2 transition ${falta ? "bg-rose-50 border-rose-400" : "bg-white border-slate-200 hover:border-indigo-300"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-xs font-black ${falta ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600"}`}>{a.nr}</span>
                    <span className="flex-1 text-sm font-bold text-slate-800 leading-tight">{a.nome}</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${falta ? "bg-rose-500 text-white" : "bg-emerald-100 text-emerald-700"}`}>{falta ? "FALTA" : "PRESENTE"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ───────── Resumo + gerar ───────── */}
      {modelo && etapa !== 1 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800">Aulas do arquivo</h3>
              <p className="text-xs text-slate-500">Só entram no PDF as aulas <strong>confirmadas</strong> (“Dei esta aula”) — igual à regra da folha.</p>
            </div>
            <button onClick={gerar} disabled={gerando || confirmadas.size === 0} className="px-5 py-2.5 rounded-xl font-black text-white bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40">
              {gerando ? "Gerando…" : "Gerar PDF para o EDUCADF"}
            </button>
          </div>

          {resumo.length === 0 ? (
            <p className="text-sm text-slate-400 mt-3">Nenhuma aula marcada ainda.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {resumo.map(({ c, confirmada, nFaltas }) => (
                <span key={c.key} className={`text-xs font-bold px-3 py-1.5 rounded-full border ${confirmada ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  {dataCurta(c.data).dm} · {rotuloAula(c)} · {nFaltas} falta(s) · {confirmada ? "confirmada" : "NÃO confirmada (fica fora do PDF)"}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ───────── Resultado ───────── */}
      {gerado && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button onClick={baixarPdf} className="px-4 py-2 rounded-lg font-black text-white bg-indigo-600 hover:bg-indigo-700">Baixar PDF</button>
            {gerado.previas.map((_, i) => (
              <button key={i} onClick={() => baixarPng(i)} className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">
                Baixar PNG pág. {i + 1} (300 dpi)
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {gerado.previas.map((src, i) => (
              <figure key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                <img src={src} alt={`Folha ${i + 1} preenchida`} className="w-full h-auto" />
                <figcaption className="text-xs text-slate-500 px-3 py-2 bg-slate-50">Folha {i + 1} de {gerado.previas.length}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
