// src/features/secretaria/alunos/index.jsx
// ────────────────────────────────────────────────────────────────
// Lista de Alunos (Secretaria)
// - Busca alunos no backend
// - Debounce no filtro
// - "Manter filtro" (localStorage)
// - Paginação
// - Ações: Editar / Gerenciar (Inativar/Cancelar) / Boletim / Importação
// - Ajuste atual:
//   • Busca por "inativo" (qualquer variação) ou "000000" solicita ao backend
//     apenas INATIVOS via query param `status=inativo` (paginação normal).
// ────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { AcademicCapIcon, PlusCircleIcon, FolderOpenIcon } from "@heroicons/react/24/solid";
import AlunoTable from "./AlunoTable";
import AlunoForm from "./AlunoForm";
import ModalExcluirOuInativar from "./ModalExcluirOuInativar";
import ImportPDF from "./ImportPDF";
import Input from "../../../components/ui/Input";
import styles from "./styles.module.css";
import api from "../../../services/api";
import BoletimPrint from "../../boletim/BoletimPrint";
import BoletimAnual from "../../boletim/BoletimAnual";

// Helper: ano letivo com data de corte 31/jan (espelha a lógica do backend)
function anoLetivoPadrao() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  return mes <= 1 ? hoje.getFullYear() - 1 : hoje.getFullYear();
}

export default function Alunos() {
  // ────────────────────────────────────────────────────────────────
  // Preferências de filtro
  // ────────────────────────────────────────────────────────────────
  const [manterFiltro, setManterFiltro] = useState(
    () => JSON.parse(localStorage.getItem("manterFiltroAlunos") || "false")
  );

  const [filtro, setFiltro] = useState(() => {
    if (JSON.parse(localStorage.getItem("manterFiltroAlunos") || "false")) {
      return localStorage.getItem("filtroAlunos") || "";
    }
    return "";
  });

  const [debouncedFiltro, setDebouncedFiltro] = useState(filtro);

  // ────────────────────────────────────────────────────────────────
  // Dados / estados gerais
  // ────────────────────────────────────────────────────────────────
  const [alunos, setAlunos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 100;
  const [loading, setLoading] = useState(true);

  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [erro, setErro] = useState("");

  // Modais / estados auxiliares
  const [isFormOpen, setFormOpen] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [alunoParaExcluirOuInativar, setAlunoParaExcluirOuInativar] = useState(null);
  const [isImportOpen, setImportOpen] = useState(false);
  const [resultadoImportacao, setResultadoImportacao] = useState(null);

  // ────────────────────────────────────────────────────────────────
  // Filtro de Ano Letivo
  // ────────────────────────────────────────────────────────────────
  const [anosLetivos, setAnosLetivos] = useState([]);
  const [anoLetivo, setAnoLetivo] = useState(anoLetivoPadrao());

  const [modalBoletimOpen, setModalBoletimOpen] = useState(false);
  const [codigoAlunoBoletim, setCodigoAlunoBoletim] = useState(null);
  // Controla qual variante do boletim exibir: "anual" ou "2anos"
  const [boletimVariante, setBoletimVariante] = useState("anual");
  const [boletimConfigLoading, setBoletimConfigLoading] = useState(false);
  const [boletimConfigData, setBoletimConfigData] = useState(null);

  // ────────────────────────────────────────────────────────────────
  // Persistência "manter filtro"
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("manterFiltroAlunos", JSON.stringify(manterFiltro));
    if (!manterFiltro) localStorage.removeItem("filtroAlunos");
  }, [manterFiltro]);

  useEffect(() => {
    if (manterFiltro) localStorage.setItem("filtroAlunos", filtro);
  }, [filtro, manterFiltro]);

  // Debounce do filtro (400ms)
  useEffect(() => {
    const h = setTimeout(() => {
      setDebouncedFiltro(filtro);
      setPage(1);
    }, 400);
    return () => clearTimeout(h);
  }, [filtro]);

  // ────────────────────────────────────────────────────────────────
  // Carregar turmas e anos letivos disponíveis
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function carregarTurmas() {
      try {
        const res = await api.get("/api/turmas");
        setTurmas(res.data || []);
      } catch {
        setTurmas([]);
      }
    }
    async function carregarAnos() {
      try {
        const res = await api.get("/api/matriculas/anos");
        setAnosLetivos(Array.isArray(res.data) ? res.data : []);
      } catch {
        setAnosLetivos([anoLetivoPadrao()]);
      }
    }
    carregarTurmas();
    carregarAnos();
  }, []);

  // ────────────────────────────────────────────────────────────────
  // Helper: detectar busca por inativos
  // ────────────────────────────────────────────────────────────────
  function isBuscaInativos(termo) {
    const q = String(termo || "").trim();
    if (!q) return false;
    if (q === "000000") return true; // atalho
    const norm = q.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    return norm.includes("inativo");
  }

  // ────────────────────────────────────────────────────────────────
  // Buscar alunos (com backend filtrando por status quando necessário)
  // ────────────────────────────────────────────────────────────────
  async function fetchAlunos(paramsOverride = {}) {
    try {
      setErro("");
      setLoading(true);

      const escolaId = localStorage.getItem("escola_id") || undefined;
      const somenteInativos = isBuscaInativos(debouncedFiltro);

      // Quando for busca de INATIVOS:
      // - enviamos status=inativo;
      // - limpamos o filtro textual para trazer todos os inativos (paginação normal).
      const params = {
        filtro: somenteInativos ? "" : debouncedFiltro,
        status: somenteInativos ? "inativo" : "",
        ano_letivo: anoLetivo || undefined,
        limit,
        offset: (page - 1) * limit,
        escola_id: escolaId,
        ...paramsOverride,
      };

      const res = await api.get("/api/alunos", { params });

      let lista = [];
      let totalResp = 0;
      const data = res.data;

      if (Array.isArray(data)) {
        // (fallback) alguns backends antigos retornavam array direto
        lista = data;
        totalResp = data.length;
      } else if (data && typeof data === "object") {
        lista = data.alunos || [];
        totalResp = Number(data.total || lista.length || 0);
      } else {
        console.warn("Formato de resposta inesperado:", data);
      }

      setAlunos(lista);
      setTotal(totalResp);
    } catch (err) {
      console.error("Erro ao carregar alunos:", err);
      setErro("Erro ao carregar alunos.");
      setAlunos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // Dispara busca quando muda: página, filtro textual ou ano letivo
  useEffect(() => {
    fetchAlunos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedFiltro, anoLetivo]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ────────────────────────────────────────────────────────────────
  // Ações
  // ────────────────────────────────────────────────────────────────
  async function handleSalvar(dados) {
    try {
      if (alunoEditando?.id) {
        await api.put(`/api/alunos/${alunoEditando.id}`, dados);
        setMensagemSucesso("✅ Dados do aluno atualizados com sucesso!");
      } else {
        await api.post("/api/alunos", dados);
        setMensagemSucesso("✅ Aluno cadastrado com sucesso!");
      }
      setTimeout(() => setMensagemSucesso(""), 3000);
      setFormOpen(false);
      setAlunoEditando(null);
      await fetchAlunos();
      return true;
    } catch (err) {
      console.error("❌ Erro ao salvar aluno:", err);
      setErro("Erro ao salvar aluno.");
      return false;
    }
  }

  function handleEditar(aluno) {
    setAlunoEditando(aluno);
    setFormOpen(true);
  }

  function handleExcluir(aluno) {
    setAlunoParaExcluirOuInativar(aluno);
  }

  async function handleBoletim(codigo) {
    setCodigoAlunoBoletim(codigo);
    setBoletimConfigLoading(true);
    setModalBoletimOpen(true);

    try {
      const escolaId = localStorage.getItem("escola_id");
      const res = await api.get("/api/governanca/boletim-config", {
        params: { escola_id: escolaId },
      });
      const cfg = res.data?.config || {};
      setBoletimConfigData(cfg);
      // Se exibir_ano_anterior = "1" → mostra boletim de 2 anos, senão anual
      setBoletimVariante(cfg["boletim.exibir_ano_anterior"] === "1" ? "2anos" : "anual");
    } catch {
      // Fallback: se não conseguir buscar config, usa anual
      setBoletimVariante("anual");
    } finally {
      setBoletimConfigLoading(false);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <AcademicCapIcon className="w-8 h-8 text-blue-900" />
          <h1 className="text-3xl font-bold text-blue-900">Lista de Alunos</h1>
        </div>
      </div>

      {/* Controles principais */}
      <div className="flex justify-between items-start mb-3">
        {/* Botões à esquerda */}
        <div className="flex flex-col gap-2">
          {anoLetivo === anoLetivoPadrao() && (
            <>
              <button
                type="button"
                onClick={() => { setAlunoEditando(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
                title="Adicionar Estudante"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Adicionar Estudante
              </button>

              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-sm"
                title="Incluir Estudantes"
              >
                <FolderOpenIcon className="w-5 h-5" />
                Incluir Estudantes
              </button>
            </>
          )}

          {/* Card pós-importação */}
          {resultadoImportacao && (
            <div className="mt-2 bg-white rounded shadow-md border px-4 py-2 text-sm space-y-1 w-full max-w-md">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">
                  📄 Localizados: {resultadoImportacao.localizados ?? "-"}
                </span>
                <button
                  onClick={() => setResultadoImportacao(null)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>

              {"inseridos" in resultadoImportacao ? (
                <>
                  <div className="text-green-600">✅ Inseridos: {resultadoImportacao.inseridos}</div>
                  <div className="text-yellow-600">🟡 Já existiam: {resultadoImportacao.jaExistiam}</div>
                  <div className="text-blue-600">📘 Reativados: {resultadoImportacao.reativados}</div>
                  <div className="text-red-600">❌ Inativados: {resultadoImportacao.inativados}</div>
                  <div className="text-gray-600">
                    {resultadoImportacao.turma
                      ? `Turma ${resultadoImportacao.turma} importada.`
                      : (resultadoImportacao.message || "Importação concluída.")}
                  </div>
                </>
              ) : (
                <div className="text-gray-700">
                  {resultadoImportacao.message || "📥 Importação concluída."}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filtro de Ano Letivo */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white rounded-lg shadow-sm border border-blue-200">
          {/* Seletor de Ano Letivo */}
          <div className="flex items-center gap-1">
            <label htmlFor="filtro-ano" className="text-sm text-gray-600">Ano Letivo:</label>
            <select
              id="filtro-ano"
              value={anoLetivo}
              onChange={(e) => { setAnoLetivo(Number(e.target.value)); setPage(1); }}
              className="border rounded px-2 py-1 text-sm text-gray-800"
            >
              {anosLetivos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Busca à direita */}
        <div className="flex flex-col items-end gap-2">
          <label htmlFor="manter-filtro" className="flex items-center gap-2 text-sm text-gray-700 select-none">
            <input
              id="manter-filtro"
              type="checkbox"
              checked={manterFiltro}
              onChange={(e) => setManterFiltro(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            Manter filtro
          </label>

          <Input
            placeholder="🔍 Buscar aluno"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-72"
          />
        </div>
      </div>

      {/* Feedbacks */}
      {erro && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
          {erro}
        </div>
      )}
      {mensagemSucesso && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded">
          {mensagemSucesso}
        </div>
      )}

      {/* Tabela */}
      <AlunoTable
        alunos={alunos}
        onEditar={handleEditar}
        onDelete={handleExcluir}
        loading={loading}
        onBoletim={handleBoletim}
        // (Se não for modo "inativos", a tabela pode ocultar inativos)
        somenteAtivos={!isBuscaInativos(debouncedFiltro)}
      />

      {/* Paginação */}
      <div className="flex gap-2 justify-center mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="px-2 py-2 text-blue-900 font-bold">
          Página {page} de {Math.max(1, Math.ceil(total / limit))}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page * limit >= total}
          className="px-4 py-2 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
        >
          Próxima
        </button>
      </div>

      {/* Modal de cadastro/edição */}
      <AlunoForm
        open={isFormOpen}
        onClose={() => { setFormOpen(false); setAlunoEditando(null); }}
        onSubmit={handleSalvar}
        initialData={alunoEditando || {}}
        turmas={turmas}
        anoLetivo={anoLetivo}
      />

      {/* Modal Gerenciar (inativar/cancelar) */}
      <ModalExcluirOuInativar
        open={!!alunoParaExcluirOuInativar}
        onClose={() => setAlunoParaExcluirOuInativar(null)}
        aluno={alunoParaExcluirOuInativar}
        onDelete={async () => {
          try {
            await api.delete(`/api/alunos/${alunoParaExcluirOuInativar.id}`);
            setMensagemSucesso("✅ Aluno excluído com sucesso!");
          } catch (e) {
            console.error("❌ Erro ao excluir aluno:", e);
            setErro("Erro ao excluir aluno.");
          } finally {
            setAlunoParaExcluirOuInativar(null);
            await fetchAlunos();
            setTimeout(() => setMensagemSucesso(""), 3000);
          }
        }}
        onInactivate={async () => {
          try {
            await api.put(`/api/alunos/${alunoParaExcluirOuInativar.id}`, { status: "inativo" });
            setMensagemSucesso("⚠️ Aluno inativado com sucesso!");
          } catch (e) {
            console.error("❌ Erro ao inativar aluno:", e);
            setErro("Erro ao inativar aluno.");
          } finally {
            setAlunoParaExcluirOuInativar(null);
            await fetchAlunos();
            setTimeout(() => setMensagemSucesso(""), 3000);
          }
        }}
      />

      {/* Modal Boletim Inteligente (anual / 2 anos — definido pela governança) */}
      {modalBoletimOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalBoletimOpen(false);
          }}
        >
          <div
            style={{
              background: "#fff",
              maxWidth: "1100px",
              width: "95%",
              maxHeight: "95vh",
              overflowY: "auto",
              borderRadius: "16px",
              boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
              padding: "0.5rem",
              position: "relative",
            }}
          >
            {/* Botão Fechar */}
            <button
              onClick={() => setModalBoletimOpen(false)}
              style={{
                position: "absolute",
                top: "12px",
                right: "16px",
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#64748b",
                background: "none",
                border: "none",
                cursor: "pointer",
                zIndex: 10,
                transition: "color 0.15s ease",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.target.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.target.style.color = "#64748b")}
              title="Fechar"
              type="button"
            >
              ×
            </button>

            {boletimConfigLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
                <span style={{ fontSize: "1.1rem", color: "#64748b" }}>Carregando configurações...</span>
              </div>
            ) : boletimVariante === "2anos" ? (
              <BoletimPrint
                codigo={codigoAlunoBoletim}
                exibirBotaoImprimir={false}
              />
            ) : (
              <BoletimAnual
                codigo={codigoAlunoBoletim}
                exibirBotaoImprimir={false}
                boletimConfig={boletimConfigData}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal Importação */}
      <ImportPDF
        open={isImportOpen}
        onClose={() => setImportOpen(false)}
        onFinish={async (res) => {
          await fetchAlunos();
          if (res && typeof res === "object") {
            if (res.status === "erro") {
              setImportOpen(false);
              setResultadoImportacao({ message: res.message || "Erro na importação." });
            } else if (res._tipo === "inativacao") {
              // Confirmação de inativação: apenas acumula o campo inativados no resultado anterior
              setResultadoImportacao((prev) => ({
                ...(prev || {}),
                inativados: (prev?.inativados ?? 0) + (res.inativados ?? 0),
                message: res.message,
              }));
              setImportOpen(false);
            } else {
              // Resultado principal da importação do PDF/XLSX
              setResultadoImportacao({
                localizados: res.localizados ?? 0,
                inseridos: res.inseridos ?? 0,
                jaExistiam: res.jaExistiam ?? 0,
                reativados: res.reativados ?? 0,
                inativados: res.inativados ?? 0,
                turma: res.turma || res.turmaNome || res.nomeTurma || undefined,
                message: res.message,
              });
              // NÃO fechar o ImportPDF aqui — ele pode ter o modal de pendentes aberto.
              // O ImportPDF se auto-gerencia: se não houver pendentes, o usuário fechará manualmente.
            }
          } else {
            setImportOpen(false);
            setResultadoImportacao({ message: "📥 Importação concluída." });
          }
        }}
      />
    </div>
  );
}
