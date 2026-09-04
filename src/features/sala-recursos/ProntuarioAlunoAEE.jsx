// src/features/sala-recursos/ProntuarioAlunoAEE.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  ArrowLeftIcon,
  SparklesIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ClockIcon,
  UserIcon,
  PlusIcon,
  PrinterIcon,
  PencilSquareIcon,
  TrashIcon,
  HeartIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import ModalAdequacaoCurricular from "./ModalAdequacaoCurricular";
import ModalConfigAlunoAEE from "./ModalConfigAlunoAEE";
import ModalLaudoMedico from "./ModalLaudoMedico";
import ModalRegistroAtendimento from "./ModalRegistroAtendimento";

export default function ProntuarioAlunoAEE() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [aluno, setAluno] = useState(null);
  const [config, setConfig] = useState(null);
  const [laudos, setLaudos] = useState([]);
  const [adequacoes, setAdequacoes] = useState([]);
  const [pdi, setPdi] = useState(null);
  const [atendimentos, setAtendimentos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("adequacoes"); // 'laudos' | 'adequacoes' | 'pdi' | 'atendimentos'

  // Modais
  const [modalAdequacaoOpen, setModalAdequacaoOpen] = useState(false);
  const [editAdequacaoId, setEditAdequacaoId] = useState(null);

  const [modalConfigOpen, setModalConfigOpen] = useState(false);
  
  const [modalLaudoOpen, setModalLaudoOpen] = useState(false);
  const [editLaudo, setEditLaudo] = useState(null);

  const [modalAtendimentoOpen, setModalAtendimentoOpen] = useState(false);
  const [fotoZoom, setFotoZoom] = useState(null);

  // Fecha fotoZoom ao pressionar tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setFotoZoom(null);
    };
    if (fotoZoom) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fotoZoom]);

  // PDI form state
  const [salvandoPdi, setSalvandoPdi] = useState(false);
  const [pdiMsg, setPdiMsg] = useState("");
  const [pdiForm, setPdiForm] = useState({
    diagnostico_pedagogico: "",
    objetivos_gerais: "",
    cronograma_atendimento: "",
    acoes_escola: "",
    acoes_familia: "",
    recursos_acessibilidade: "",
    status: "ativo"
  });

  const carregarProntuario = async () => {
    if (!id) return;
    setLoading(true);
    setErro("");
    try {
      const res = await api.get(`/api/sala-recursos/alunos/${id}`);
      if (res.data) {
        setAluno(res.data.aluno);
        setConfig(res.data.config);
        setLaudos(res.data.laudos || []);
        setAdequacoes(res.data.adequacoes || []);
        setPdi(res.data.pdi);
        setAtendimentos(res.data.atendimentos || []);

        if (res.data.pdi) {
          setPdiForm({
            diagnostico_pedagogico: res.data.pdi.diagnostico_pedagogico || "",
            objetivos_gerais: res.data.pdi.objetivos_gerais || "",
            cronograma_atendimento: res.data.pdi.cronograma_atendimento || "",
            acoes_escola: res.data.pdi.acoes_escola || "",
            acoes_familia: res.data.pdi.acoes_familia || "",
            recursos_acessibilidade: res.data.pdi.recursos_acessibilidade || "",
            status: res.data.pdi.status || "ativo"
          });
        }
      }
    } catch (err) {
      console.error("Erro ao carregar prontuário AEE:", err);
      setErro("Não foi possível carregar os dados do prontuário.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarProntuario();
  }, [id]);

  const handleSalvarPdi = async (e) => {
    e.preventDefault();
    if (!id) return;
    setSalvandoPdi(true);
    setPdiMsg("");
    try {
      await api.post(`/api/sala-recursos/pdi/${id}`, pdiForm);
      setPdiMsg("Plano de Desenvolvimento Individual (PDI) salvo com sucesso!");
      setTimeout(() => setPdiMsg(""), 4000);
      carregarProntuario();
    } catch (err) {
      console.error("Erro ao salvar PDI:", err);
      alert("Erro ao salvar PDI: " + (err.response?.data?.message || err.message));
    } finally {
      setSalvandoPdi(false);
    }
  };

  const handleImprimirAdequacao = (adeqId) => {
    const token = localStorage.getItem("token");
    const apiBase = (api.defaults?.baseURL || "").replace(/\/api$/, "");
    window.open(`${apiBase}/api/sala-recursos/adequacoes/${adeqId}/pdf?token=${token}`, "_blank");
  };

  const handleDeleteAdequacao = async (adeqId) => {
    if (!window.confirm("Deseja realmente excluir esta adequação curricular?")) return;
    try {
      await api.delete(`/api/sala-recursos/adequacoes/${adeqId}`);
      carregarProntuario();
    } catch (err) {
      alert("Erro ao excluir adequação: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteLaudo = async (laudoId) => {
    if (!window.confirm("Deseja realmente remover este laudo?")) return;
    try {
      await api.delete(`/api/sala-recursos/laudos/${laudoId}`);
      carregarProntuario();
    } catch (err) {
      alert("Erro ao remover laudo: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteAtendimento = async (atendId) => {
    if (!window.confirm("Deseja excluir este registro de atendimento?")) return;
    try {
      await api.delete(`/api/sala-recursos/atendimentos/${atendId}`);
      carregarProntuario();
    } catch (err) {
      alert("Erro ao remover atendimento: " + (err.response?.data?.message || err.message));
    }
  };

  const formatDate = (val) => {
    if (!val) return "—";
    try {
      const s = String(val).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split("-");
        return `${d}/${m}/${y}`;
      }
      return new Date(val).toLocaleDateString("pt-BR");
    } catch {
      return "—";
    }
  };

  if (loading && !aluno) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Carregando prontuário da Sala de Recursos...</p>
        </div>
      </div>
    );
  }

  if (erro || !aluno) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4 text-center">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
          <p className="font-bold">{erro || "Aluno não encontrado."}</p>
          <button
            onClick={() => navigate("/sala-recursos")}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-700 text-white font-semibold text-sm rounded-xl"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Voltar ao Painel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Botão de Retorno e Ações */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/sala-recursos")}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-sm transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Voltar aos Alunos
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalConfigOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            ⚙️ Configurar AEE
          </button>
        </div>
      </div>

      {/* Cartão de Cabeçalho do Estudante */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              onClick={() => aluno.foto && setFotoZoom(aluno)}
              className={`relative ${aluno.foto ? "cursor-pointer group" : ""}`}
              title={aluno.foto ? "Clique para ampliar a foto do estudante" : aluno.estudante}
            >
              {aluno.foto ? (
                <div className="relative">
                  <img
                    src={aluno.foto}
                    alt={aluno.estudante}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-lg group-hover:ring-2 group-hover:ring-blue-400 group-hover:scale-105 transition-all"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity">
                    <MagnifyingGlassPlusIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center font-black text-2xl text-blue-200">
                  {aluno.estudante?.charAt(0) || "?"}
                </div>
              )}
              <span className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-emerald-500 text-white font-black text-[10px] uppercase rounded-full shadow">
                AEE
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-2xl font-black tracking-tight">{aluno.estudante}</h1>
                <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-xs font-semibold text-blue-200 border border-white/10">
                  Cód: {aluno.codigo || "—"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-blue-100/90">
                <span>🎓 Turma: <strong>{aluno.turma_nome || "—"} ({aluno.turma_turno || "—"})</strong></span>
                <span>•</span>
                <span>🎂 Nasc: <strong>{formatDate(aluno.data_nascimento)}</strong></span>
                {config?.professor_aee && (
                  <>
                    <span>•</span>
                    <span>👩‍🏫 AEE: <strong>{config.professor_aee}</strong></span>
                  </>
                )}
              </div>

              {/* Badges de CID */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {laudos.length > 0 ? (
                  laudos.map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30"
                    >
                      🏷️ CID {l.cid || "—"}: {l.diagnostico ? l.diagnostico.slice(0, 38) + "..." : ""}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-300 italic">
                    Sem laudo médico cadastrado no sistema
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick AEE Stats */}
          <div className="flex md:flex-col gap-3 bg-white/10 p-3.5 rounded-xl border border-white/15 text-xs">
            <div>
              <span className="text-blue-200 block">Atendimento:</span>
              <span className="font-bold text-white">{config?.tipo_atendimento || "SRM Tipo I"}</span>
            </div>
            <div>
              <span className="text-blue-200 block">Horário / Turno:</span>
              <span className="font-bold text-white">{config?.turno_atendimento || "Contraturno"} ({config?.dias_semana || "—"})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-px">
        {[
          { id: "adequacoes", label: "Adequações Curriculares", icon: SparklesIcon, count: adequacoes.length },
          { id: "laudos", label: "Laudos & Diagnósticos", icon: DocumentTextIcon, count: laudos.length },
          { id: "pdi", label: "Plano Individual (PDI/PEI)", icon: AcademicCapIcon },
          { id: "atendimentos", label: "Diário de Sessões", icon: ClockIcon, count: atendimentos.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const ativa = abaAtiva === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap ${
                ativa
                  ? "border-blue-700 text-blue-700 bg-blue-50/50 rounded-t-xl"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                  ativa ? "bg-blue-200 text-blue-900" : "bg-slate-200 text-slate-700"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── ABA 1: ADEQUAÇÕES CURRICULARES ───────────────────────────────────── */}
      {abaAtiva === "adequacoes" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-800">Adequações Curriculares Individualizadas</h2>
              <p className="text-xs text-slate-500">
                Flexibilizações metodológicas, recursos assistivos e critérios adaptados de avaliação por disciplina.
              </p>
            </div>
            <button
              onClick={() => {
                setEditAdequacaoId(null);
                setModalAdequacaoOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Nova Adequação
            </button>
          </div>

          {adequacoes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <SparklesIcon className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Nenhuma adequação curricular registrada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Registre as adequações curriculares para compartilhar com os professores regentes e gerar os documentos oficiais da SEEDF.
              </p>
              <button
                onClick={() => {
                  setEditAdequacaoId(null);
                  setModalAdequacaoOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-bold rounded-xl"
              >
                <PlusIcon className="w-4 h-4" /> Criar Primeira Adequação
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adequacoes.map((adeq) => (
                <div
                  key={adeq.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 mb-1">
                          {adeq.bimestre}
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{adeq.disciplina}</h3>
                        <p className="text-xs text-slate-500">
                          Prof. Regente: {adeq.professor_regente || "—"} • AEE: {adeq.professor_aee || "—"}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {adeq.status || "Concluído"}
                      </span>
                    </div>

                    {/* Resumo das Seções */}
                    <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-700 block">🎯 Habilidades Adaptadas:</span>
                        <p className="text-slate-600 line-clamp-2">{adeq.habilidades_prioritarias || "—"}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block">💡 Metodologias & Recursos:</span>
                        <p className="text-slate-600 line-clamp-2">{adeq.metodologias_estrategias || "—"}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block">📝 Avaliação Diferenciada:</span>
                        <p className="text-slate-600 line-clamp-2">{adeq.avaliacao_adaptada || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleImprimirAdequacao(adeq.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors"
                    >
                      <PrinterIcon className="w-4 h-4" /> PDF Institucional
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditAdequacaoId(adeq.id);
                          setModalAdequacaoOpen(true);
                        }}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar adequação"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdequacao(adeq.id)}
                        className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir adequação"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA 2: LAUDOS MÉDICOS ───────────────────────────────────────────── */}
      {abaAtiva === "laudos" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-800">Laudos Médicos e Diagnósticos Clínicos</h2>
              <p className="text-xs text-slate-500">Histórico de laudos médicos, CIDs, prescrições e terapias externas.</p>
            </div>
            <button
              onClick={() => {
                setEditLaudo(null);
                setModalLaudoOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Adicionar Laudo
            </button>
          </div>

          {laudos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <DocumentTextIcon className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Nenhum laudo cadastrado</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Adicione as informações médicas e diagnósticas para embasar o atendimento educacional especializado.
              </p>
              <button
                onClick={() => {
                  setEditLaudo(null);
                  setModalLaudoOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-sm font-bold rounded-xl"
              >
                <PlusIcon className="w-4 h-4" /> Cadastrar Laudo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {laudos.map((l) => (
                <div key={l.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 font-black text-sm rounded-lg border border-amber-200">
                        CID: {l.cid || "Não informado"}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{l.diagnostico || "Diagnóstico não descrito"}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Emissor: <strong>{l.medico_nome || "—"}</strong> ({l.medico_crm || "CRM não informado"}) • {l.medico_especialidade || "Especialista"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditLaudo(l);
                          setModalLaudoOpen(true);
                        }}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLaudo(l.id)}
                        className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-700 block">📅 Data de Emissão:</span>
                      <span className="text-slate-600">{formatDate(l.data_laudo)}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block">💊 Medicamentos em Uso:</span>
                      <span className="text-slate-600">{l.medicamentos || "Nenhum informado"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block">🏥 Terapias / Externo:</span>
                      <span className="text-slate-600">{l.acompanhamento_externo || "Nenhum informado"}</span>
                    </div>
                  </div>

                  {l.observacoes && (
                    <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                      💬 Observações: {l.observacoes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA 3: PDI / PEI ─────────────────────────────────────────────────── */}
      {abaAtiva === "pdi" && (
        <form onSubmit={handleSalvarPdi} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Plano de Desenvolvimento Individual (PDI / PEI)</h2>
              <p className="text-xs text-slate-500">
                Planejamento pedagógico integral, metas anuais e articulação com a escola e a família.
              </p>
            </div>
            <button
              type="submit"
              disabled={salvandoPdi}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              <CheckCircleIcon className="w-4 h-4" />
              {salvandoPdi ? "Salvando PDI..." : "Salvar PDI"}
            </button>
          </div>

          {pdiMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{pdiMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                1. Diagnóstico Pedagógico Inicial & Potencialidades
              </label>
              <textarea
                value={pdiForm.diagnostico_pedagogico}
                onChange={(e) => setPdiForm({ ...pdiForm, diagnostico_pedagogico: e.target.value })}
                rows={4}
                placeholder="Descreva as facilidades do estudante, canais preferenciais de aprendizagem, interesses e principais barreiras..."
                className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                2. Objetivos Gerais e Metas de Desenvolvimento para o Ano Letivo
              </label>
              <textarea
                value={pdiForm.objetivos_gerais}
                onChange={(e) => setPdiForm({ ...pdiForm, objetivos_gerais: e.target.value })}
                rows={4}
                placeholder="Metas acadêmicas, de autonomia, convivência e linguagem a serem atingidas..."
                className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                3. Ações Articuladas com a Equipe Escolar (Sala Comum, Gestão e Orientação)
              </label>
              <textarea
                value={pdiForm.acoes_escola}
                onChange={(e) => setPdiForm({ ...pdiForm, acoes_escola: e.target.value })}
                rows={3}
                placeholder="Como a Sala de Recursos orientará os professores e a coordenação..."
                className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                4. Parceria com a Família e Orientações Domiciliares
              </label>
              <textarea
                value={pdiForm.acoes_familia}
                onChange={(e) => setPdiForm({ ...pdiForm, acoes_familia: e.target.value })}
                rows={3}
                placeholder="Orientações de rotina, combinados e reuniões periódicas com os responsáveis..."
                className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                5. Recursos de Tecnologia Assistiva e Adaptações Ambientais
              </label>
              <textarea
                value={pdiForm.recursos_acessibilidade}
                onChange={(e) => setPdiForm({ ...pdiForm, recursos_acessibilidade: e.target.value })}
                rows={3}
                placeholder="Tecnologia assistiva, posicionamento em sala, materiais sensoriais..."
                className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={salvandoPdi}
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {salvandoPdi ? "Salvando PDI..." : "Salvar PDI"}
            </button>
          </div>
        </form>
      )}

      {/* ─── ABA 4: DIÁRIO DE ATENDIMENTOS ────────────────────────────────────── */}
      {abaAtiva === "atendimentos" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-800">Diário de Atendimentos & Sessões</h2>
              <p className="text-xs text-slate-500">Registro cronológico das sessões realizadas na Sala de Recursos.</p>
            </div>
            <button
              onClick={() => setModalAtendimentoOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Registrar Sessão
            </button>
          </div>

          {atendimentos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <ClockIcon className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Nenhum atendimento registrado</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Registre cada sessão realizada para manter o histórico de evolução e controle de frequência do AEE.
              </p>
              <button
                onClick={() => setModalAtendimentoOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-700 text-white text-sm font-bold rounded-xl"
              >
                <PlusIcon className="w-4 h-4" /> Registrar Primeiro Atendimento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {atendimentos.map((atend) => (
                <div key={atend.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-800 font-bold flex flex-col items-center justify-center text-xs">
                        <span>{atend.data_atendimento ? atend.data_atendimento.split("-")[2] : "—"}</span>
                        <span className="text-[9px] uppercase">{atend.data_atendimento ? atend.data_atendimento.split("-")[1] : ""}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {formatDate(atend.data_atendimento)} • {atend.tipo_sessao}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            Number(atend.presenca) === 1 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}>
                            {Number(atend.presenca) === 1 ? "Presente" : "Falta"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Horário: {atend.horario_inicio || "—"} às {atend.horario_fim || "—"} • Registrado por: {atend.registrado_por || "Docente AEE"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAtendimento(atend.id)}
                      className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir registro"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-700 block">🎲 Atividades Realizadas:</span>
                      <p className="text-slate-600">{atend.atividades_realizadas || "—"}</p>
                    </div>
                    {atend.evolucao_observacoes && (
                      <div>
                        <span className="font-bold text-slate-700 block">📈 Evolução e Resposta do Estudante:</span>
                        <p className="text-slate-600">{atend.evolucao_observacoes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modais Integrados */}
      <ModalAdequacaoCurricular
        isOpen={modalAdequacaoOpen}
        onClose={() => {
          setModalAdequacaoOpen(false);
          setEditAdequacaoId(null);
        }}
        aluno={aluno}
        adequacaoId={editAdequacaoId}
        onSuccess={carregarProntuario}
      />

      <ModalConfigAlunoAEE
        isOpen={modalConfigOpen}
        onClose={() => setModalConfigOpen(false)}
        aluno={{ ...aluno, ...config }}
        onSuccess={carregarProntuario}
      />

      <ModalLaudoMedico
        isOpen={modalLaudoOpen}
        onClose={() => {
          setModalLaudoOpen(false);
          setEditLaudo(null);
        }}
        aluno={aluno}
        laudo={editLaudo}
        onSuccess={carregarProntuario}
      />

      <ModalRegistroAtendimento
        isOpen={modalAtendimentoOpen}
        onClose={() => setModalAtendimentoOpen(false)}
        aluno={aluno}
        onSuccess={carregarProntuario}
      />

      {/* Modal de Zoom da Foto do Estudante */}
      {fotoZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setFotoZoom(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-6 text-white space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com Nome e Botão Fechar */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="pr-4">
                <h3 className="text-lg font-black text-white leading-tight">
                  {fotoZoom.estudante}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cód: <span className="text-slate-200 font-semibold">{fotoZoom.codigo || "—"}</span>
                  {fotoZoom.turma_nome && (
                    <> • Turma: <span className="text-blue-300 font-semibold">{fotoZoom.turma_nome}</span> {fotoZoom.turma_turno ? `(${fotoZoom.turma_turno})` : ""}</>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFotoZoom(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex-shrink-0"
                title="Fechar (Esc)"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Imagem Ampliada */}
            <div className="w-full flex justify-center py-2">
              <img
                src={fotoZoom.foto}
                alt={fotoZoom.estudante}
                className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain border-2 border-slate-700 shadow-2xl bg-black"
              />
            </div>

            {/* Rodapé / Dica */}
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <SparklesIcon className="w-4 h-4" /> Prontuário Sala de Recursos (AEE)
              </span>
              <span>Clique fora ou no ✕ para fechar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
