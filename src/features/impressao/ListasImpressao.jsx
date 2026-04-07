// src/features/impressao/ListasImpressao.jsx
// ============================================================================
// Módulo LISTAS — Geração de listas imprimíveis para coordenação/direção.
// Tipos: Chamada, Assinatura (provas), Alunos Faltosos, Aniversariantes,
//        Lista de Contatos (responsáveis), Lista em Branco.
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import api from "../../services/api";
import {
  ClipboardDocumentListIcon,
  PrinterIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  CakeIcon,
  PhoneIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

// ─── Normaliza texto para comparação ───
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// ─── Tipos de lista ───
const TIPOS_LISTA = [
  {
    id: "chamada",
    nome: "Lista de Chamada",
    desc: "Frequência diária com campos para marcar presença/falta",
    icon: ClipboardDocumentListIcon,
    color: "from-blue-500 to-blue-700",
    fields: ["Nº", "Estudante", "P", "F", "Observação"],
  },
  {
    id: "assinatura_prova",
    nome: "Assinatura — Prova",
    desc: "Folha de assinatura para dia de aplicação de provas/avaliações",
    icon: DocumentTextIcon,
    color: "from-indigo-500 to-indigo-700",
    fields: ["Nº", "Estudante", "Assinatura"],
  },
  {
    id: "assinatura_geral",
    nome: "Assinatura — Geral",
    desc: "Folha de assinatura para reuniões, eventos ou entregas de material",
    icon: UserGroupIcon,
    color: "from-violet-500 to-violet-700",
    fields: ["Nº", "Estudante", "Assinatura", "Responsável"],
  },
  {
    id: "aniversariantes",
    nome: "Aniversariantes do Mês",
    desc: "Lista de alunos por mês de nascimento — ideal para ações pedagógicas",
    icon: CakeIcon,
    color: "from-pink-500 to-rose-600",
    fields: ["Nº", "Estudante", "Data Nasc.", "Turma"],
  },
  {
    id: "contatos",
    nome: "Contatos (Responsáveis)",
    desc: "Lista com telefone e e-mail dos responsáveis para comunicação",
    icon: PhoneIcon,
    color: "from-emerald-500 to-emerald-700",
    fields: ["Nº", "Estudante", "Responsável", "Telefone"],
  },
  {
    id: "branco",
    nome: "Lista em Branco",
    desc: "Linhas vazias numeradas para preenchimento manual",
    icon: AcademicCapIcon,
    color: "from-gray-500 to-gray-700",
    fields: ["Nº", "Nome", "Observação"],
  },
];

// ─── Meses ───
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function ListasImpressao() {
  // ─── Estado ───
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(false);
  const [loadingAlunos, setLoadingAlunos] = useState(false);

  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [tipoLista, setTipoLista] = useState(null);

  // Extras
  const [tituloPersonalizado, setTituloPersonalizado] = useState("");
  const [dataAplicacao, setDataAplicacao] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());
  const [qtdLinhasBranco, setQtdLinhasBranco] = useState(30);

  const printRef = useRef(null);

  const nomeEscola = localStorage.getItem("nome_escola") || "Escola";
  const turnos = ["Matutino", "Vespertino", "Noturno"];

  // ─── Buscar turmas ───
  useEffect(() => {
    (async () => {
      setLoadingTurmas(true);
      try {
        const escola_id = localStorage.getItem("escola_id") || 1;
        const { data } = await api.get("/api/turmas", {
          params: { escola_id },
        });
        setTurmas(data);
      } catch {
        setTurmas([]);
      } finally {
        setLoadingTurmas(false);
      }
    })();
  }, []);

  // ─── Buscar alunos quando selecionar turma ───
  useEffect(() => {
    if (!turmaSelecionada) {
      setAlunos([]);
      return;
    }
    (async () => {
      setLoadingAlunos(true);
      try {
        const { data } = await api.get("/api/alunos", {
          params: {
            turma_id: turmaSelecionada.id,
            status: "ativo",
          },
        });
        // Ordena por nome
        const sorted = (data || []).sort((a, b) =>
          (a.nome || "").localeCompare(b.nome || "", "pt-BR")
        );
        setAlunos(sorted);
      } catch {
        setAlunos([]);
      } finally {
        setLoadingAlunos(false);
      }
    })();
  }, [turmaSelecionada]);

  // ─── Turmas filtradas por turno ───
  const turmasFiltradas = useMemo(
    () =>
      turmas
        .filter(
          (t) =>
            turnoSelecionado &&
            norm(t.turno) === norm(turnoSelecionado)
        )
        .sort((a, b) => (a.turma || "").localeCompare(b.turma || "", "pt-BR")),
    [turmas, turnoSelecionado]
  );

  // ─── Aniversariantes filtrados ───
  const aniversariantes = useMemo(() => {
    if (tipoLista?.id !== "aniversariantes") return [];
    return alunos.filter((a) => {
      if (!a.data_nascimento) return false;
      const dt = new Date(a.data_nascimento);
      return dt.getMonth() === mesSelecionado;
    });
  }, [alunos, mesSelecionado, tipoLista]);

  // ─── Data formatada ───
  const dataFormatada = useMemo(() => {
    if (!dataAplicacao) return "";
    const [y, m, d] = dataAplicacao.split("-");
    return `${d}/${m}/${y}`;
  }, [dataAplicacao]);

  // ═══ IMPRIMIR ═══
  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;

    const printWin = window.open("", "_blank");
    if (!printWin) return alert("Habilite pop-ups para imprimir.");

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Lista — ${tipoLista?.nome || "Impressão"}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; }
    .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
    .header h1 { font-size: 15px; font-weight: 800; color: #1e3a5f; letter-spacing: -0.02em; }
    .header h2 { font-size: 13px; font-weight: 700; color: #334155; margin-top: 2px; }
    .header .meta { font-size: 10px; color: #64748b; margin-top: 4px; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #e2e8f0; color: #1e293b; font-weight: 700; font-size: 10px; text-transform: uppercase;
         letter-spacing: 0.04em; padding: 5px 6px; border: 1px solid #94a3b8; text-align: left; }
    td { padding: 5px 6px; border: 1px solid #cbd5e1; font-size: 10.5px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .sign-cell { min-width: 120px; }
    .obs-cell { min-width: 100px; }
    .footer { margin-top: 16px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    .footer strong { color: #475569; }
    .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-size: 9px; font-weight: 700;
             padding: 1px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  ${el.innerHTML}
</body>
</html>`);
    printWin.document.close();

    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 300);
  };

  // ═══ RENDER do conteúdo imprimível ═══
  const renderPrintContent = () => {
    if (!tipoLista || !turmaSelecionada) return null;

    const tipo = tipoLista;
    const turma = turmaSelecionada;
    const titulo = tituloPersonalizado || tipo.nome;

    const headerHTML = (
      <>
        <div className="header">
          <h1>{nomeEscola}</h1>
          <h2>{titulo}</h2>
          <div className="meta">
            <span><strong>Turma:</strong> {turma.turma} — {turma.turno}</span>
            <span><strong>Data:</strong> {dataFormatada}</span>
            <span><strong>Total:</strong> {tipo.id === "aniversariantes" ? aniversariantes.length : tipo.id === "branco" ? qtdLinhasBranco : alunos.length} aluno(s)</span>
          </div>
        </div>
      </>
    );

    const footerHTML = (
      <div className="footer">
        <strong>EDUCA.MELHOR</strong> — {nomeEscola} — Impresso em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </div>
    );

    // ─── CHAMADA ───
    if (tipo.id === "chamada") {
      return (
        <>
          {headerHTML}
          <table>
            <thead>
              <tr>
                <th style={{ width: "30px" }}>Nº</th>
                <th>Estudante</th>
                <th style={{ width: "30px", textAlign: "center" }}>P</th>
                <th style={{ width: "30px", textAlign: "center" }}>F</th>
                <th className="obs-cell">Observação</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a, i) => (
                <tr key={a.id}>
                  <td style={{ textAlign: "center" }}>{i + 1}</td>
                  <td>{a.nome}</td>
                  <td style={{ textAlign: "center" }}></td>
                  <td style={{ textAlign: "center" }}></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "12px", fontSize: "10px", color: "#64748b" }}>
            <strong>Legenda:</strong> P = Presente &nbsp;|&nbsp; F = Falta
          </div>
          {footerHTML}
        </>
      );
    }

    // ─── ASSINATURA PROVA ───
    if (tipo.id === "assinatura_prova") {
      return (
        <>
          {headerHTML}
          <table>
            <thead>
              <tr>
                <th style={{ width: "30px" }}>Nº</th>
                <th>Estudante</th>
                <th className="sign-cell" style={{ textAlign: "center" }}>Assinatura</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a, i) => (
                <tr key={a.id} style={{ height: "28px" }}>
                  <td style={{ textAlign: "center" }}>{i + 1}</td>
                  <td>{a.nome}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
            <div>
              <div style={{ borderTop: "1px solid #334155", width: "200px", marginTop: "40px", textAlign: "center", paddingTop: "4px" }}>
                Aplicador(a)
              </div>
            </div>
            <div>
              <div style={{ borderTop: "1px solid #334155", width: "200px", marginTop: "40px", textAlign: "center", paddingTop: "4px" }}>
                Coordenador(a)
              </div>
            </div>
          </div>
          {footerHTML}
        </>
      );
    }

    // ─── ASSINATURA GERAL ───
    if (tipo.id === "assinatura_geral") {
      return (
        <>
          {headerHTML}
          <table>
            <thead>
              <tr>
                <th style={{ width: "30px" }}>Nº</th>
                <th>Estudante</th>
                <th className="sign-cell" style={{ textAlign: "center" }}>Assinatura Aluno</th>
                <th className="sign-cell" style={{ textAlign: "center" }}>Assinatura Responsável</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a, i) => (
                <tr key={a.id} style={{ height: "28px" }}>
                  <td style={{ textAlign: "center" }}>{i + 1}</td>
                  <td>{a.nome}</td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
          {footerHTML}
        </>
      );
    }

    // ─── ANIVERSARIANTES ───
    if (tipo.id === "aniversariantes") {
      return (
        <>
          {headerHTML}
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <span className="badge">🎂 {MESES[mesSelecionado]}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: "30px" }}>Nº</th>
                <th>Estudante</th>
                <th style={{ width: "90px" }}>Data Nasc.</th>
                <th style={{ width: "100px" }}>Turma</th>
              </tr>
            </thead>
            <tbody>
              {aniversariantes.length > 0 ? (
                aniversariantes.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ textAlign: "center" }}>{i + 1}</td>
                    <td>{a.nome}</td>
                    <td>{a.data_nascimento ? new Date(a.data_nascimento).toLocaleDateString("pt-BR") : "—"}</td>
                    <td>{a.turma || turma.turma}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", padding: "12px" }}>
                    Nenhum aniversariante em {MESES[mesSelecionado]}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {footerHTML}
        </>
      );
    }

    // ─── CONTATOS ───
    if (tipo.id === "contatos") {
      return (
        <>
          {headerHTML}
          <table>
            <thead>
              <tr>
                <th style={{ width: "30px" }}>Nº</th>
                <th>Estudante</th>
                <th>Responsável</th>
                <th style={{ width: "120px" }}>Telefone</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a, i) => (
                <tr key={a.id}>
                  <td style={{ textAlign: "center" }}>{i + 1}</td>
                  <td>{a.nome}</td>
                  <td>{a.responsavel || "—"}</td>
                  <td>{a.telefone_responsavel || a.celular || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {footerHTML}
        </>
      );
    }

    // ─── EM BRANCO ───
    if (tipo.id === "branco") {
      const linhas = Array.from({ length: qtdLinhasBranco }, (_, i) => i + 1);
      return (
        <>
          {headerHTML}
          <table>
            <thead>
              <tr>
                <th style={{ width: "30px" }}>Nº</th>
                <th>Nome</th>
                <th className="obs-cell">Observação</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((n) => (
                <tr key={n} style={{ height: "26px" }}>
                  <td style={{ textAlign: "center" }}>{n}</td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
          {footerHTML}
        </>
      );
    }

    return null;
  };

  // ─── STATUS ───
  const step =
    !tipoLista ? 1 :
    !turnoSelecionado ? 2 :
    !turmaSelecionada ? 3 : 4;

  return (
    <div className="max-w-6xl mx-auto">
      {/* ─── HERO HEADER ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-700 to-blue-900 px-6 py-8 md:px-10 md:py-10 mb-8 shadow-xl">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative flex items-center gap-5">
          <div className="hidden md:flex h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm items-center justify-center shadow-lg">
            <PrinterIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              📋 Listas para Impressão
            </h1>
            <p className="mt-1 text-blue-200 text-sm md:text-base">
              Selecione o tipo de lista, turno e turma para gerar e imprimir.
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="relative mt-6 flex items-center gap-2">
          {[
            { n: 1, label: "Tipo" },
            { n: 2, label: "Turno" },
            { n: 3, label: "Turma" },
            { n: 4, label: "Imprimir" },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && (
                <div className={`flex-1 h-0.5 ${step > s.n - 1 ? "bg-green-400" : "bg-white/20"}`} />
              )}
              <div
                className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all ${
                  step >= s.n
                    ? "bg-green-400 text-green-900 shadow-lg shadow-green-400/30"
                    : "bg-white/15 text-white/60"
                }`}
              >
                {step > s.n ? <CheckCircleIcon className="h-5 w-5" /> : s.n}
              </div>
            </React.Fragment>
          ))}
          <span className="ml-3 text-white/70 text-xs hidden sm:inline">
            {step === 1 && "Escolha o tipo de lista"}
            {step === 2 && "Selecione o turno"}
            {step === 3 && "Selecione a turma"}
            {step === 4 && "Pronto para imprimir!"}
          </span>
        </div>
      </div>

      {/* ─── STEP 1: Tipo de Lista ─── */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-extrabold">1</span>
          Tipo de Lista
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TIPOS_LISTA.map((t) => {
            const Icon = t.icon;
            const sel = tipoLista?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTipoLista(t);
                  setTurmaSelecionada(null);
                  setAlunos([]);
                }}
                className={`group relative overflow-hidden rounded-xl border-2 text-left p-4 transition-all duration-200 ${
                  sel
                    ? "border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-200/50 scale-[1.02]"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0 shadow`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className={`font-bold text-sm ${sel ? "text-indigo-800" : "text-gray-900"}`}>
                      {t.nome}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.desc}</p>
                  </div>
                </div>
                {sel && (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── STEP 2: Turno ─── */}
      {tipoLista && (
        <div className="mb-8 animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-extrabold">2</span>
            Turno
          </h2>
          <div className="flex flex-wrap gap-3">
            {turnos.map((turno) => (
              <button
                key={turno}
                onClick={() => {
                  setTurnoSelecionado(turno);
                  setTurmaSelecionada(null);
                  setAlunos([]);
                }}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  turnoSelecionado === turno
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-300/40 scale-105"
                    : "bg-white text-blue-800 border border-blue-200 hover:bg-blue-50 hover:border-blue-400"
                }`}
              >
                {turno}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── STEP 3: Turma ─── */}
      {turnoSelecionado && (
        <div className="mb-8 animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-extrabold">3</span>
            Turma
          </h2>
          {loadingTurmas ? (
            <p className="text-gray-500">Carregando turmas...</p>
          ) : turmasFiltradas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {turmasFiltradas.map((turma) => {
                const sel = turmaSelecionada?.id === turma.id;
                return (
                  <button
                    key={turma.id}
                    onClick={() => setTurmaSelecionada(turma)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      sel
                        ? "bg-green-600 text-white shadow-lg shadow-green-300/40 scale-105"
                        : "bg-gradient-to-b from-blue-100 to-blue-50 text-blue-900 border border-blue-200 hover:shadow-md hover:scale-105"
                    }`}
                  >
                    {turma.turma}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma turma para {turnoSelecionado}.</p>
          )}
        </div>
      )}

      {/* ─── STEP 4: Configuração + Preview ─── */}
      {turmaSelecionada && tipoLista && (
        <div className="animate-fadeIn">
          {/* Config bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-end gap-4">
              {/* Título personalizado */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Título da lista</label>
                <input
                  type="text"
                  value={tituloPersonalizado}
                  onChange={(e) => setTituloPersonalizado(e.target.value)}
                  placeholder={tipoLista.nome}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Data */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Data</label>
                <input
                  type="date"
                  value={dataAplicacao}
                  onChange={(e) => setDataAplicacao(e.target.value)}
                  className="mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Mês (aniversariantes) */}
              {tipoLista.id === "aniversariantes" && (
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Mês</label>
                  <select
                    value={mesSelecionado}
                    onChange={(e) => setMesSelecionado(Number(e.target.value))}
                    className="mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    {MESES.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Qtd linhas (branco) */}
              {tipoLista.id === "branco" && (
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Linhas</label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={qtdLinhasBranco}
                    onChange={(e) => setQtdLinhasBranco(Number(e.target.value))}
                    className="mt-1 w-20 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              )}

              {/* Botão imprimir */}
              <button
                onClick={handlePrint}
                disabled={loadingAlunos}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PrinterIcon className="h-5 w-5" />
                Imprimir
              </button>
            </div>
          </div>

          {/* Info */}
          {loadingAlunos ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-400 border-r-transparent mb-3"></div>
              <p>Carregando alunos...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">
                  📄 Pré-visualização — {tipoLista.nome}
                </span>
                <span className="text-xs text-gray-500">
                  {tipoLista.id === "aniversariantes" ? aniversariantes.length : tipoLista.id === "branco" ? qtdLinhasBranco : alunos.length} linha(s)
                </span>
              </div>

              {/* Área imprimível (hidden mas DOM presente) */}
              <div
                ref={printRef}
                className="border border-gray-100 rounded-lg p-4 bg-white max-h-[400px] overflow-auto text-[11px]"
                style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
              >
                {renderPrintContent()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
