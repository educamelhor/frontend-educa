// src/features/secretaria/alunos/ImportPDF.jsx
// -------------------------------------------------------
// Importação em lote de alunos via PDF ou XLSX.
// Este componente funciona como um "modal controlado":
// - open:     boolean para exibir/ocultar
// - onClose:  fecha o modal
// - onFinish: callback disparado após importação com sucesso (com dados)
//
// Ajuste desta revisão (PASSO 2.1):
// • Quando o arquivo enviado for PDF, gerar automaticamente um .xlsx
//   com os alunos localizados (listaAlunos) e disparar o download.
// • Acrescentar a coluna "turma" no .xlsx (e CSV fallback), preenchendo
//   cada linha com o nome do arquivo (turmaNome).
// -------------------------------------------------------

import React, { useRef, useState } from "react";
import api from "../../../services/api";
import { Button } from "../../../components/ui/Button"; // <- export nomeado

export default function ImportPDF({ open, onClose, onFinish }) {
  const fileRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null; // 🔹 modal só é renderizado quando open = true

  // ─────────────────────────────────────────────
  // Util: dispara download de um Blob qualquer
  // ─────────────────────────────────────────────
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ─────────────────────────────────────────────
  // Util: tenta gerar XLSX (fallback p/ CSV se 'xlsx' não existir)
  // entries: [{codigo, estudante, dataBr, sexo}]
  // turmaNome: string com o nome do arquivo (ex.: "1A", "2F", etc.)
  // ─────────────────────────────────────────────
  async function exportarPlanilha(entries, turmaNome = "alunos") {
    if (!Array.isArray(entries) || !entries.length) return;

    // Cabeçalho com a nova coluna "turma"
    const header = ["codigo", "estudante", "data_nascimento", "sexo", "turma"];
    const rows = entries.map((e) => [
      e.codigo ?? "",
      e.estudante ?? "",
      e.dataBr ?? "",
      e.sexo ?? "",
      turmaNome ?? "",
    ]);

    // Nome do arquivo com data
    const hoje = new Date();
    const y = String(hoje.getFullYear());
    const m = String(hoje.getMonth() + 1).padStart(2, "0");
    const d = String(hoje.getDate()).padStart(2, "0");
    const safeTurma = String(turmaNome || "alunos").replace(/[^\w\-]+/g, "_");
    const baseName = `alunos_${safeTurma}_${y}${m}${d}`;

    // Tenta XLSX via lazy import
    try {
      const XLSX = await import("xlsx"); // carrega só quando precisa
      const aoa = [header, ...rows];
      const sheet = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Alunos");

      const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([ab], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      downloadBlob(blob, `${baseName}.xlsx`);
      return;
    } catch (err) {
      console.warn(
        "[ImportPDF] Pacote 'xlsx' não disponível. Gerando CSV de fallback...",
        err
      );
    }

    // Fallback CSV (caso 'xlsx' não esteja instalado no front)
    const csvLinhas = [
      header.join(";"),
      ...rows.map((r) =>
        r
          .map((c) =>
            String(c ?? "")
              .replace(/"/g, '""')
              .replace(/\r?\n/g, " ")
          )
          .map((c) => (/[;," ]/.test(c) ? `"${c}"` : c))
          .join(";")
      ),
    ];
    const blobCsv = new Blob([csvLinhas.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    downloadBlob(blobCsv, `${baseName}.csv`);
  }

  // ─────────────────────────────────────────────
  // Seleção e envio do arquivo
  // ─────────────────────────────────────────────
  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida extensão
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "xlsx") {
      alert("Formato não suportado. Selecione um arquivo PDF ou XLSX.");
      e.target.value = null;
      return;
    }

    // Monta FormData
    const formData = new FormData();
    formData.append("file", file);

    // Nome da turma derivado do nome do arquivo
    const turmaNome = file.name.replace(/\.[^.]+$/, "").trim();
    setProgress(0);
    setSubmitting(true);

    try {
      // Define rota de acordo com o tipo de arquivo
      const rota =
        ext === "pdf" ? "/api/alunos/importar-pdf" : "/api/alunos/importar-xlsx";

      // Faz upload com progresso
      const { data } = await api.post(rota, formData, {
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      // Para PDF o backend envia também listaAlunos (usaremos para gerar o .xlsx)
      // { localizados, inseridos, jaExistiam, reativados, inativados, listaAlunos }
      const {
        localizados,
        inseridos,
        jaExistiam,
        inativados,
        reativados,
        listaAlunos,
      } = data || {};

      // 🔽 Se foi PDF e recebemos listaAlunos, exporta a planilha com a coluna "turma"
      if (ext === "pdf" && Array.isArray(listaAlunos) && listaAlunos.length) {
        await exportarPlanilha(listaAlunos, turmaNome); // baixa .xlsx (ou CSV fallback)
      }

      const resultado = {
        status: "sucesso",
        turma: turmaNome,
        localizados,
        inseridos,
        jaExistiam,
        reativados,
        inativados,
        message: `Turma ${turmaNome} importada com sucesso.`,
      };

      // 🔹 Notifica o pai com os dados (index.jsx usa para mostrar o card)
      onFinish && onFinish(resultado);
    } catch (err) {
      console.error("Erro na importação:", err);
      const erro = {
        status: "erro",
        message:
          err?.response?.data?.message ||
          err?.message ||
          "Erro ao importar arquivo.",
      };
      onFinish && onFinish(erro);
    } finally {
      setSubmitting(false);
      if (e.target) e.target.value = null; // limpa input
      setProgress(0);
    }
  }

  // ─────────────────────────────────────────────
  // Abre o seletor de arquivo
  // ─────────────────────────────────────────────
  function openPicker() {
    fileRef.current?.click();
  }

  // ─────────────────────────────────────────────
  // Renderização do modal
  // ─────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Incluir Estudantes (PDF/XLSX)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Selecione um arquivo <strong>PDF</strong> (padrão do sistema) ou{" "}
            <strong>XLSX</strong> contendo os alunos. O nome do arquivo será usado
            como rótulo da turma para o relatório de feedback.
          </p>

          {/* Input escondido */}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx"
            hidden
            onChange={handleFileSelected}
          />

          {/* Botões */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={openPicker}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
            >
              Escolher arquivo
            </Button>

            <Button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-60"
            >
              Cancelar
            </Button>
          </div>

          {/* Barra de progresso (apenas durante upload) */}
          {submitting && (
            <div className="w-full bg-gray-200 rounded h-2 overflow-hidden mt-2">
              <div
                className="h-2 bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <p className="text-xs text-gray-500">
            Dica: ao importar <strong>PDF</strong>, a planilha <em>.xlsx</em> será
            baixada automaticamente com os alunos identificados, incluindo a coluna{" "}
            <code>turma</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
