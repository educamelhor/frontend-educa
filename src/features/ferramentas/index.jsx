// src/features/ferramentas/index.jsx
import React, { useRef } from "react";
import { ArrowRightIcon, DocumentIcon } from "@heroicons/react/24/outline";
import toast, { Toaster } from "react-hot-toast";

export default function Ferramentas() {
  // ============================================================
  // Refs para inputs de arquivo
  // ============================================================
  const fileInputPdf = useRef();
  const fileInputNotaPdf = useRef();

  // Novo: ref para pasta/arquivos .xlsx (unificação)
  const dirInputUnificarXlsx = useRef();

  // NOVO: ref para ALUNO (PDF)
  const fileInputAlunoPdf = useRef();

  // Detecta URL do backend (dev/prod). Ajuste a VITE_API_BASE se quiser.
  const API_BASE =
    import.meta?.env?.VITE_API_BASE ||
    (window.location.origin.includes(":5173")
      ? window.location.origin.replace(":5173", ":3000")
      : window.location.origin);

  // ============================================================
  // Util: recupera token salvo no localStorage
  // ============================================================
  const getToken = () =>
    localStorage.getItem("educa.token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");

  // ============================================================
  // Ações de abrir o explorer de arquivos
  // ============================================================
  const handleBuscarPdf = () => {
    fileInputPdf.current.value = null;
    fileInputPdf.current.click();
  };

  const handleBuscarNotaPdf = () => {
    fileInputNotaPdf.current.value = null;
    fileInputNotaPdf.current.click();
  };

  // Novo: abrir seletor de PASTA/arquivos .xlsx
  const handleBuscarUnificarXlsx = () => {
    try {
      // limpa seleção anterior
      if (dirInputUnificarXlsx.current) {
        dirInputUnificarXlsx.current.value = null;
        dirInputUnificarXlsx.current.click();
      }
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível abrir o seletor de arquivos.");
    }
  };

  // NOVO: abrir seletor para ALUNO (PDF)
  const handleBuscarAlunoPdf = () => {
    if (!fileInputAlunoPdf.current) return;
    fileInputAlunoPdf.current.value = null;
    fileInputAlunoPdf.current.click();
  };

  // ============================================================
  // Conversão PDF → XLSX (Professores)
  // ============================================================
  const handlePdfToXlsx = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = getToken();
      const response = await fetch("/api/ferramentas/pdf-para-xlsx", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (response.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      if (!response.ok) {
        toast.error("Erro ao converter PDF em XLSX.");
        return;
      }

      // Nome padrão para a planilha de professores (essa rota não precisa copiar o nome do PDF)
      const downloadName = "professores.xlsx";

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName; // força o nome
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Arquivo de professores gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao converter ou baixar o arquivo.");
    }
  };

  // ============================================================
  // Conversão NOTA (PDF) → NOTA (XLSX)
  // - Usa o prefixo /api/ferramentas/nota/...
  // - Força o nome do download = mesmo nome do PDF (troca .pdf→.xlsx)
  // ============================================================
  const handleNotaPdfToXlsx = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = getToken();
      const response = await fetch("/api/ferramentas/nota/nota-pdf-para-xlsx", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (response.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      if (!response.ok) {
        toast.error("Erro ao converter NOTA (PDF) em NOTA (XLSX).");
        return;
      }

      // Usa SEMPRE o nome do PDF selecionado
      const base = file.name.replace(/\.[Pp][Dd][Ff]$/, "");
      const downloadName = `${base}.xlsx`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName; // força o nome para igual ao PDF
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Arquivo de notas gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao converter ou baixar o arquivo de notas.");
    }
  };

  // ============================================================
  // UNIFICAR XLSX (NOTA) → gera 1 XLSX unificado no backend
  // - Abre pasta/arquivos, filtra .xlsx, envia multipart
  // - Baixa o .xlsx unificado
  // - Exibe feedback: qtd .xlsx e total de alunos (se headers vierem)
  // ============================================================
  const handleUnificarXlsx = async (e) => {
    const allFiles = Array.from(e.target.files || []);
    // Filtra apenas .xlsx (ignora outras extensões)
    const xlsxFiles = allFiles.filter((f) => /\.xlsx$/i.test(f.name));
    if (xlsxFiles.length === 0) {
      toast.error("Nenhum arquivo .xlsx encontrado na seleção.");
      return;
    }

    const formData = new FormData();
    // backend aceitará o campo "files" com múltiplos
    xlsxFiles.forEach((f) => formData.append("files", f, f.name));

    const uploadingId = toast.loading(`Unificando ${xlsxFiles.length} planilha(s)...`);

    try {
      const token = getToken();

      // Tenta rota principal; se 404, tenta rota compatível (fallback)
      const doPost = async (url) =>
        fetch(url, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });

      let res = await doPost(`${API_BASE}/api/ferramentas/unir/unificar-xlsx`);
      if (res.status === 404) {
        res = await doPost(`${API_BASE}/api/ferramentas/unir/nota/unificar-xlsx`);
      }

      if (res.status === 401) {
        toast.dismiss(uploadingId);
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      if (!res.ok) {
        toast.dismiss(uploadingId);
        toast.error("Falha ao unificar as planilhas.");
        return;
      }

      // Tenta pegar nome pelo Content-Disposition; fallback genérico
      const dispo = res.headers.get("Content-Disposition") || "";
      const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(dispo);
      const suggestedName = m ? decodeURIComponent(m[1]) : "Notas_Unificado.xlsx";

      // Lê (opcionais) contadores vindos no header
      const countFiles = Number(res.headers.get("X-Xlsx-Count") || xlsxFiles.length);
      const alunosTotalHeader = res.headers.get("X-Alunos-Total");
      const alunosTotal = alunosTotalHeader ? Number(alunosTotalHeader) : null;

      // Baixa o arquivo
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(uploadingId);
      if (Number.isFinite(alunosTotal)) {
        toast.success(`Unificação concluída! ${countFiles} .xlsx consolidados • ${alunosTotal} alunos no total.`);
      } else {
        toast.success(`Unificação concluída! ${countFiles} .xlsx consolidados.`);
      }
    } catch (err) {
      console.error(err);
      toast.dismiss(uploadingId);
      toast.error("Erro durante a unificação.");
    }
  };

  // ============================================================
  // NOVO: Converter ALUNO (PDF) → ALUNO (XLSX)
  // - Rota: /api/ferramentas/converter-aluno
  // - Força o nome do download = mesmo nome do PDF (troca .pdf→.xlsx)
  // ============================================================
  const handleAlunoPdfToXlsx = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/ferramentas/converter-aluno`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
        cache: "no-store", // evita pegar resposta antiga em cache
      });

      // >>> DEBUG visível para garantirmos que é a rota nova
      const ver = res.headers.get("X-Converter-Version");
      if (ver) {
        console.log("[Ferramentas] Converter-Aluno version:", ver);
        toast(`Converter-Aluno: versão ${ver}`, { icon: "🧩" });
      }

      if (!res.ok) {
        // Se der 400 (parser não casou), mostramos o motivo retornado pelo backend v3
        let msg = "Erro ao converter ALUNO (PDF) em ALUNO (XLSX).";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
          if (j?.preview) {
            console.warn("[Ferramentas] Preview do PDF:", j.preview);
          }
        } catch {}
        toast.error(msg);
        return;
      }

      // Força o nome do download = MESMO nome do PDF + sufixo anti-cache
      const base = file.name.replace(/\.[Pp][Dd][Ff]$/, "");
      const stamp = new Date().getTime(); // evita cache do navegador
      const downloadName = `${base}.xlsx?ts=${stamp}`;

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}.xlsx`; // nome visível correto
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Arquivo de alunos gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao converter ou baixar o arquivo de alunos.");
    }
  };

  // ============================================================
  // Renderização da página
  // ============================================================
  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      {/* Toaster global para mensagens */}
      <Toaster position="top-right" />

      <h1 className="text-3xl font-bold mb-6 text-blue-900">CEF04 - CCMD</h1>
      <h2 className="text-2xl font-semibold mb-6 text-blue-800">
        Ferramentas do Sistema
      </h2>

      {/* Converter PDF → XLSX (Professores) */}
      <div className="mb-8 flex items-center gap-4">
        <span className="text-lg font-medium">Converter</span>
        <span className="font-bold text-red-700">PDF</span>
        <ArrowRightIcon className="w-6 h-6 text-blue-700" />
        <span className="font-bold text-green-700">XLSX</span>
        <button
          className="ml-8 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded flex items-center gap-2 transition"
          onClick={handleBuscarPdf}
        >
          <DocumentIcon className="w-5 h-5" />
          Buscar PDF
        </button>
        <input
          type="file"
          accept=".pdf"
          ref={fileInputPdf}
          hidden
          onChange={handlePdfToXlsx}
        />
      </div>

      {/* Converter NOTA (PDF) → NOTA (XLSX) */}
      <div className="mb-8 flex items-center gap-4">
        <span className="text-lg font-medium">Converter</span>
        <span className="font-bold text-red-700">NOTA (PDF)</span>
        <ArrowRightIcon className="w-6 h-6 text-blue-700" />
        <span className="font-bold text-green-700">NOTA (XLSX)</span>
        <button
          className="ml-8 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded flex items-center gap-2 transition"
          onClick={handleBuscarNotaPdf}
        >
          <DocumentIcon className="w-5 h-5" />
          Buscar NOTA
        </button>
        <input
          type="file"
          accept=".pdf"
          ref={fileInputNotaPdf}
          hidden
          onChange={handleNotaPdfToXlsx}
        />
      </div>

      {/* === NOVO === Unificar XLSX (NOTA) → Buscar XLSX (pasta) */}
      <div className="mb-8 flex items-center gap-4">
        <span className="text-lg font-medium">Unificar</span>
        <span className="font-bold text-green-700">XLSX (NOTA)</span>
        <ArrowRightIcon className="w-6 h-6 text-blue-700" />
        <span className="text-blue-800">→</span>
        <button
          className="ml-8 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded flex items-center gap-2 transition"
          onClick={handleBuscarUnificarXlsx}
          title="Selecione uma pasta contendo os .xlsx de notas (arquivos de mesmo padrão)"
        >
          <DocumentIcon className="w-5 h-5" />
          Buscar XLSX
        </button>

        {/* Importante: webkitdirectory permite selecionar uma PASTA.
           Mantemos multiple+accept como fallback para navegadores que não suportam pasta. */}
        <input
          type="file"
          multiple
          accept=".xlsx"
          ref={dirInputUnificarXlsx}
          hidden
          // @ts-ignore - atributo específico de Chromium
          webkitdirectory="true"
          onChange={handleUnificarXlsx}
        />
      </div>

      {/* === NOVO === Converter ALUNO (PDF) → ALUNO (XLSX) */}
      <div className="mb-8 flex items-center gap-4">
        <span className="text-lg font-medium">Converter</span>
        <span className="font-bold text-red-700">ALUNO (PDF)</span>
        <ArrowRightIcon className="w-6 h-6 text-blue-700" />
        <span className="font-bold text-green-700">ALUNO (XLSX)</span>
        <button
          className="ml-8 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded flex items-center gap-2 transition"
          onClick={handleBuscarAlunoPdf}
        >
          <DocumentIcon className="w-5 h-5" />
          Buscar ALUNO
        </button>
        <input
          type="file"
          accept=".pdf"
          ref={fileInputAlunoPdf}
          hidden
          onChange={handleAlunoPdfToXlsx}
        />
      </div>

      {/* Converter XLSX → PDF (desativado) */}
      <div className="mb-8 flex items-center gap-4 opacity-70">
        <span className="text-lg font-medium">Converter</span>
        <span className="font-bold text-green-700">XLSX</span>
        <ArrowRightIcon className="w-6 h-6 text-blue-700" />
        <span className="font-bold text-red-700">PDF</span>
        <button
          className="ml-8 bg-gray-400 text-white font-bold px-6 py-2 rounded flex items-center gap-2 cursor-not-allowed"
          disabled
        >
          <DocumentIcon className="w-5 h-5" />
          Buscar XLSX
        </button>
      </div>

      {/* Converter WORD → PDF (desativado) */}
      <div className="mb-8 flex items-center gap-4 opacity-70">
        <span className="text-lg font-medium">Converter</span>
        <span className="font-bold text-blue-700">WORD</span>
        <ArrowRightIcon className="w-6 h-6 text-blue-700" />
        <span className="font-bold text-red-700">PDF</span>
        <button
          className="ml-8 bg-gray-400 text-white font-bold px-6 py-2 rounded flex items-center gap-2 cursor-not-allowed"
          disabled
        >
          <DocumentIcon className="w-5 h-5" />
          Buscar WORD
        </button>
      </div>
    </div>
  );
}
