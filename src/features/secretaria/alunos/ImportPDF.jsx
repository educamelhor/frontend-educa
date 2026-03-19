// src/features/secretaria/alunos/ImportPDF.jsx
// -------------------------------------------------------
// Importação em lote de alunos via PDF ou XLSX.
// - open:     boolean para exibir/ocultar
// - onClose:  fecha o modal
// - onFinish: callback disparado após importação com sucesso
//
// Fluxo inteligente:
//   1. Usuário seleciona arquivo
//   2. Extrai nome da turma do nome do arquivo
//   3. Consulta API para verificar se a turma já existe
//   4. Se existir → prossegue com importação
//   5. Se NÃO existir → exibe modal premium instruindo o cadastro
// -------------------------------------------------------

import React, { useRef, useState } from "react";
import api from "../../../services/api";
import { Button } from "../../../components/ui/Button";

export default function ImportPDF({ open, onClose, onFinish }) {
  const fileRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Estado do modal "turma não encontrada"
  const [turmaNaoEncontrada, setTurmaNaoEncontrada] = useState(null); // { nome }

  if (!open) return null;

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
  // Util: tenta gerar XLSX (fallback p/ CSV)
  // ─────────────────────────────────────────────
  async function exportarPlanilha(entries, turmaNome = "alunos") {
    if (!Array.isArray(entries) || !entries.length) return;

    const header = ["RE", "estudante", "data_nascimento", "responsavel", "cpf_responsavel", "turma"];
    const rows = entries.map((e) => [
      e.codigo ?? "",
      e.estudante ?? "",
      e.dataBr ?? "",
      e.responsavel ?? "",
      e.cpfResponsavel ?? "",
      turmaNome ?? "",
    ]);

    const hoje = new Date();
    const y = String(hoje.getFullYear());
    const m = String(hoje.getMonth() + 1).padStart(2, "0");
    const d = String(hoje.getDate()).padStart(2, "0");
    const safeTurma = String(turmaNome || "alunos").replace(/[^\w\-]+/g, "_");
    const baseName = `alunos_${safeTurma}_${y}${m}${d}`;

    try {
      const XLSX = await import("xlsx");
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

    // Fallback CSV
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
  // Verifica se a turma existe no sistema
  // ─────────────────────────────────────────────
  async function verificarTurmaExiste(turmaNome) {
    try {
      const res = await api.get("/api/turmas");
      const turmas = res.data || [];
      // Compara normalizando caracteres (Âº → º) e ignorando case
      const nomeNorm = turmaNome.replace(/Âº/g, "º").replace(/Âª/g, "ª").trim().toUpperCase();
      const match = turmas.find(
        (t) => String(t.turma || "").trim().toUpperCase() === nomeNorm
      );
      return match || null; // retorna o objeto da turma ou null
    } catch (err) {
      console.error("Erro ao verificar turma:", err);
      return null;
    }
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

    // Nome da turma derivado do nome do arquivo
    const turmaNome = file.name.replace(/\.[^.]+$/, "").trim();

    // ─── VALIDAÇÃO INTELIGENTE: verifica se a turma existe ───
    const turmaEncontrada = await verificarTurmaExiste(turmaNome);
    if (!turmaEncontrada) {
      setTurmaNaoEncontrada({ nome: turmaNome });
      if (e.target) e.target.value = null;
      return;
    }

    // ─── Turma existe, prossegue com a importação ───
    const formData = new FormData();
    formData.append("file", file);
    formData.append("turmaNome", turmaNome);
    
    setProgress(0);
    setSubmitting(true);

    try {
      const rota =
        ext === "pdf" ? "/api/alunos/importar-pdf" : "/api/alunos/importar-xlsx";

      const { data } = await api.post(rota, formData, {
        timeout: 120_000, // 2min — importação em lote pode ser demorada
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      const {
        localizados,
        inseridos,
        jaExistiam,
        inativados,
        reativados,
        listaAlunos,
      } = data || {};

      if (ext === "pdf" && Array.isArray(listaAlunos) && listaAlunos.length) {
        await exportarPlanilha(listaAlunos, turmaNome);
      }

      const resultado = {
        status: "sucesso",
        turma: turmaNome,
        turno: turmaEncontrada.turno || "",
        localizados,
        inseridos,
        jaExistiam,
        reativados,
        inativados,
        message: `Turma ${turmaNome} importada com sucesso.`,
      };

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
      if (e.target) e.target.value = null;
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
  // Renderização do modal principal
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

      {/* ═══════════════════════════════════════════════════════
          MODAL PREMIUM: Turma não encontrada
          ═══════════════════════════════════════════════════════ */}
      {turmaNaoEncontrada && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ animation: "fadeInScale 0.25s ease-out" }}
          >
            {/* Faixa de alerta no topo */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Turma não encontrada
                  </h3>
                  <p className="text-amber-100 text-sm">
                    É necessário cadastrar antes de enturmar
                  </p>
                </div>
              </div>
            </div>

            {/* Corpo do modal */}
            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-gray-700 text-sm leading-relaxed">
                  A turma{" "}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {turmaNaoEncontrada.nome}
                  </span>{" "}
                  ainda não está cadastrada no sistema.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-gray-600 text-sm font-medium">
                  Para prosseguir com a importação dos estudantes:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-sm text-gray-700">
                      Acesse{" "}
                      <strong className="text-blue-700">Secretaria → Turmas</strong>{" "}
                      e cadastre a turma com o <strong>nome exato</strong> e o{" "}
                      <strong>turno</strong> correspondente.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-sm text-gray-700">
                      Retorne aqui e selecione o arquivo novamente.
                      A importação será realizada automaticamente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 leading-relaxed">
                  💡 <strong>Dica:</strong> o nome do arquivo deve corresponder 
                  exatamente ao nome da turma cadastrada. Exemplo: arquivo{" "}
                  <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700 font-mono text-xs">
                    {turmaNaoEncontrada.nome}.pdf
                  </code>{" "}
                  → turma{" "}
                  <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700 font-mono text-xs">
                    {turmaNaoEncontrada.nome}
                  </code>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <Button
                type="button"
                onClick={() => setTurmaNaoEncontrada(null)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CSS da animação inline */}
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
