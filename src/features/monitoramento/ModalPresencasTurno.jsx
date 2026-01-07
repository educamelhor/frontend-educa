// src/features/monitoramento/ModalPresencasTurno.jsx
// ============================================================================
// ModalPedagógico — FIX CÓDIGO (sem alterar o layout já validado)
//  - Renderiza a coluna "Código" usando j.presentes[].codigo / j.ausentes[].codigo
//  - Mantém exportações via BACKEND (XLSX/PDF) e demais comportamentos aprovados
// ============================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";

export default function ModalPresencasTurno({ isOpen, onClose, turno, dataFiltro }) {
  const hojeISO = new Date().toISOString().slice(0, 10);
  const [dataLocal, setDataLocal] = useState(dataFiltro || hojeISO);
  const [abaAtiva, setAbaAtiva] = useState("presentes"); // "presentes" | "ausentes"
  const [dadosBrutos, setDadosBrutos] = useState({
    presentes: [],
    ausentes: [],
    total_presentes: 0,
    total_ausentes: 0,
    data: "",
    turno,
  });
  const [busca, setBusca] = useState("");

  // --- Dropdown PDF (mantido) ---
  const [pdfAba, setPdfAba] = useState("ambos");
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [includeHeader, setIncludeHeader] = useState(true);
  const pdfMenuRef = useRef(null);

  useEffect(() => {
    function close(ev) {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(ev.target)) {
        setShowPdfMenu(false);
      }
    }
    if (showPdfMenu) window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [showPdfMenu]);

  useEffect(() => {
    if (isOpen && turno === "historico") setDataLocal((p) => p || hojeISO);
  }, [isOpen, turno, hojeISO]);

  async function carregar() {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.set("turno", turno === "historico" ? "matutino" : turno);
      if (turno === "historico") params.set("data", dataLocal);
      else if (dataFiltro) params.set("data", dataFiltro);

      const resp = await fetch(
        `http://localhost:3000/api/monitoramento/presencas-turno?${params.toString()}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        }
      );
      const j = await resp.json();
      if (j?.ok) {
        setDadosBrutos({
          presentes: Array.isArray(j.presentes) ? j.presentes : [],
          ausentes: Array.isArray(j.ausentes) ? j.ausentes : [],
          total_presentes: j.total_presentes ?? 0,
          total_ausentes: j.total_ausentes ?? 0,
          data: j.data,
          turno: j.turno,
        });
      }
    } catch {
      /* silencioso */
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    carregar();
    const id = setInterval(carregar, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, turno, dataLocal, dataFiltro]);

  useEffect(() => {
    if (isOpen) setBusca("");
  }, [isOpen, turno, dataLocal]);

  const listaBase = abaAtiva === "presentes" ? dadosBrutos.presentes : dadosBrutos.ausentes;

  // Busca por Nome | Turma | Código
  const listaFiltrada = useMemo(() => {
    const ord = [...listaBase].sort((a, b) =>
      (a.nome || "").localeCompare(b.nome || "", "pt-BR")
    );
    const q = busca.trim().toLowerCase();
    if (!q) return ord;
    return ord.filter((i) => {
      const nome = (i.nome || "").toLowerCase();
      const turma = (i.turma || "").toLowerCase();
      const codigo = String(i.codigo ?? "").toLowerCase();
      return nome.includes(q) || turma.includes(q) || codigo.includes(q);
    });
  }, [listaBase, busca]);

  if (!isOpen) return null;

  const fecharBackdrop = (e) => e.target === e.currentTarget && onClose();

  const titulo = turno === "historico"
    ? "Histórico"
    : turno.charAt(0).toUpperCase() + turno.slice(1);
  const dataVisivel = dadosBrutos.data || dataLocal || "Data atual";

  // ======================================================================
  // Exportações via BACKEND (mantidas)
  // ======================================================================
  const API_BASE = "http://localhost:3000/api/monitoramento";

  function getFilenameFromContentDisposition(disposition, fallback) {
    if (!disposition) return fallback;
    try {
      const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(disposition);
      if (m && m[1]) {
        const raw = m[1].replace(/"/g, "");
        try { return decodeURIComponent(raw); } catch { return raw; }
      }
    } catch {}
    return fallback;
  }

  function nomeBaseArquivo(tipo, abaCustom) {
    const turnoTxt = turno === "historico" ? "historico" : (dadosBrutos.turno || turno);
    const dataTxt  = (dadosBrutos.data || dataLocal || hojeISO);
    const abaTxt   = tipo === "xlsx" ? "" : `_${(abaCustom || (abaAtiva === "presentes" ? "presentes" : "ausentes"))}`;
    return `presencas_${turnoTxt}${abaTxt}_${dataTxt}`;
  }

  async function baixarBlob(url, filenameFallback) {
    const token = localStorage.getItem("token");
    try {
      const resp = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : "" } });
      if (!resp.ok) {
        let detail = "";
        try {
          const ct = resp.headers.get("Content-Type") || "";
          detail = ct.includes("application/json") ? JSON.stringify(await resp.json()) : await resp.text();
        } catch {}
        alert(`Falha ao exportar (${resp.status}). ${detail || ""}`); return;
      }
      const cd = resp.headers.get("Content-Disposition");
      const filename = getFilenameFromContentDisposition(cd, filenameFallback);
      const blob = await resp.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(href);
    } finally {
      setShowPdfMenu(false);
    }
  }

  async function handleExportXlsxServer() {
    const params = new URLSearchParams();
    params.set("turno", turno === "historico" ? "matutino" : turno);
    if (turno === "historico") params.set("data", dataLocal);
    else if (dataFiltro) params.set("data", dataFiltro);

    const url = `${API_BASE}/presencas-turno/export.xlsx?${params.toString()}`;
    await baixarBlob(url, `${nomeBaseArquivo("xlsx")}.xlsx`);
  }

  async function handleExportPdfServer(abaEscolhida) {
    const params = new URLSearchParams();
    params.set("turno", turno === "historico" ? "matutino" : turno);
    if (turno === "historico") params.set("data", dataLocal);
    else if (dataFiltro) params.set("data", dataFiltro);
    params.set("aba", abaEscolhida || pdfAba);
    params.set("cabecalho", includeHeader ? "1" : "0");

    const url = `${API_BASE}/presencas-turno/export.pdf?${params.toString()}`;
    await baixarBlob(url, `${nomeBaseArquivo("pdf", abaEscolhida)}.pdf`);
  }

  function HeaderSwitch() {
    return (
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <span className="text-[0.75rem] text-blue-900 font-semibold hidden sm:inline">Cabeçalho da escola</span>
        <span className="text-[0.75rem] text-blue-900 font-semibold sm:hidden">Cabeçalho</span>
        <span
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${includeHeader ? "bg-blue-600" : "bg-blue-300"}`}
          onClick={() => setIncludeHeader(v => !v)}
          role="switch"
          aria-checked={includeHeader}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${includeHeader ? "translate-x-6" : "translate-x-1"}`} />
        </span>
      </label>
    );
  }

  function PdfDropdown() {
    return (
      <div className="relative" ref={pdfMenuRef}>
        <button
          type="button"
          onClick={() => setShowPdfMenu(s => !s)}
          className="bg-blue-900 text-white rounded-md px-3 py-1 font-semibold hover:bg-blue-800 flex items-center gap-1"
          title="Baixar PDF gerado no servidor"
        >
          Exportar PDF
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition ${showPdfMenu ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.062l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {showPdfMenu && (
          <div className="absolute right-0 bottom-full mb-2 w-48 rounded-md border border-blue-200 bg-white shadow-lg z-[9999]">
            <div className="px-3 py-2 border-b border-blue-100">
              <div className="text-[0.75rem] text-blue-900 font-semibold mb-1">Selecionar conteúdo</div>
              <div className="flex flex-col gap-2">
                {[
                  { key: "presentes", label: "Presentes" },
                  { key: "ausentes", label: "Ausentes" },
                  { key: "ambos", label: "Ambos" },
                ].map(opt => (
                  <label key={opt.key} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pdfAba"
                      value={opt.key}
                      checked={pdfAba === opt.key}
                      onChange={() => setPdfAba(opt.key)}
                      className="text-blue-900"
                    />
                    <span className="text-sm text-blue-900">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-3 py-2 border-b border-blue-100">
              <HeaderSwitch />
            </div>

            <div className="px-3 py-2">
              <button
                type="button"
                onClick={() => handleExportPdfServer(pdfAba)}
                className="w-full bg-blue-900 text-white rounded-md px-3 py-1 text-sm font-semibold hover:bg-blue-800"
              >
                Baixar PDF
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={fecharBackdrop}>
      <div className="bg-white rounded-xl shadow-2xl border border-blue-300 max-w-4xl w-full flex flex-col max-h-[90vh] overflow-visible">
        {/* Cabeçalho */}
        <div className="bg-blue-900 text-white px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <div className="text-lg font-semibold">{`Presenças - ${titulo}`}</div>
            <div className="text-xs opacity-80">
              {`Data: ${dataVisivel}`} • {dadosBrutos.total_presentes} presente(s) | {dadosBrutos.total_ausentes} faltando
            </div>
          </div>
          <div className="flex items-center gap-2">
            {turno === "historico" && (
              <input
                type="date"
                value={dataLocal}
                max={hojeISO}
                onChange={(e) => setDataLocal(e.target.value)}
                className="rounded-md border border-blue-300 bg-white px-2 py-1 text-xs text-blue-900 focus:ring-2 focus:ring-blue-400"
              />
            )}
            <button type="button" onClick={onClose} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-sm font-semibold">X</button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-blue-300 text-sm font-semibold text-blue-900">
          {["presentes", "ausentes"].map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setAbaAtiva(tab)}
              className={`flex-1 py-2 ${abaAtiva === tab ? "bg-blue-200 border-b-2 border-blue-900" : "bg-blue-50 hover:bg-blue-100"}`}
            >
              {tab === "presentes" ? "Presentes ✅" : "Faltando ❌"}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="p-3 border-b border-blue-200 bg-blue-50">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno (nome, turma, código)..."
            className="w-full border border-blue-300 rounded-md px-3 py-2 text-sm text-blue-900 focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-y-auto p-4">
          {listaFiltrada.length === 0 ? (
            <div className="text-center text-blue-500 text-xs italic py-10">Nenhum aluno encontrado.</div>
          ) : (
            <table className="w-full text-[0.8rem] border border-blue-200 rounded-md overflow-hidden">
              <thead className="bg-blue-100 text-blue-900">
                <tr className="text-left text-[0.7rem]">
                  {abaAtiva === "presentes" && <th className="py-2 px-2 w-[4rem] font-semibold">Hora</th>}
                  <th className="py-2 px-2 font-semibold">Nome</th>
                  <th className="py-2 px-2 font-semibold w-[5rem]">Turma</th>
                  {abaAtiva === "presentes" && (
                    <>
                      <th className="py-2 px-2 font-semibold w-[5rem]">Câmera</th>
                      <th className="py-2 px-2 font-semibold w-[5rem]">Código</th>
                    </>
                  )}
                  {abaAtiva === "ausentes" && <th className="py-2 px-2 font-semibold w-[5rem]">Código</th>}
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((a, i) => (
                  <tr key={i} className="odd:bg-white even:bg-blue-50/40 border-b border-blue-100">
                    {abaAtiva === "presentes" && (
                      <td className="py-2 px-2 font-semibold">{a.horario ? a.horario.slice(0, 5) : "--:--"}</td>
                    )}
                    <td className="py-2 px-2">{a.nome}</td>
                    <td className="py-2 px-2">{a.turma}</td>
                    {abaAtiva === "presentes" && (
                      <>
                        <td className="py-2 px-2 text-xs text-blue-700">{a.camera_id_origem ? `Câmera ${a.camera_id_origem}` : "—"}</td>
                        <td className="py-2 px-2 text-xs text-blue-700">{a.codigo || "—"}</td>
                      </>
                    )}
                    {abaAtiva === "ausentes" && (
                      <td className="py-2 px-2 text-xs text-blue-700">{a.codigo || "—"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 text-[0.75rem] text-blue-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>Atualiza automaticamente a cada 5 segundos</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportXlsxServer}
              className="bg-white text-blue-900 border border-blue-300 rounded-md px-3 py-1 font-semibold hover:bg-blue-100"
              title="Baixar planilha Excel (.xlsx) gerada no servidor"
            >
              Exportar Excel (.xlsx)
            </button>
            <div className="relative" ref={pdfMenuRef}>
              <button
                type="button"
                onClick={() => setShowPdfMenu(s => !s)}
                className="bg-blue-900 text-white rounded-md px-3 py-1 font-semibold hover:bg-blue-800 flex items-center gap-1"
                title="Baixar PDF gerado no servidor"
              >
                Exportar PDF
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition ${showPdfMenu ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.062l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {showPdfMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-48 rounded-md border border-blue-200 bg-white shadow-lg z-[9999]">
                  <div className="px-3 py-2 border-b border-blue-100">
                    <div className="text-[0.75rem] text-blue-900 font-semibold mb-1">Selecionar conteúdo</div>
                    <div className="flex flex-col gap-2">
                      {[
                        { key: "presentes", label: "Presentes" },
                        { key: "ausentes", label: "Ausentes" },
                        { key: "ambos", label: "Ambos" },
                      ].map(opt => (
                        <label key={opt.key} className="inline-flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="pdfAba" value={opt.key} checked={pdfAba === opt.key} onChange={() => setPdfAba(opt.key)} className="text-blue-900" />
                          <span className="text-sm text-blue-900">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="px-3 py-2 border-b border-blue-100">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-[0.75rem] text-blue-900 font-semibold">Cabeçalho da escola</span>
                      <span
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${includeHeader ? "bg-blue-600" : "bg-blue-300"}`}
                        onClick={() => setIncludeHeader(v => !v)}
                        role="switch"
                        aria-checked={includeHeader}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${includeHeader ? "translate-x-6" : "translate-x-1"}`} />
                      </span>
                    </label>
                  </div>

                  <div className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleExportPdfServer(pdfAba)}
                      className="w-full bg-blue-900 text-white rounded-md px-3 py-1 text-sm font-semibold hover:bg-blue-800"
                    >
                      Baixar PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
