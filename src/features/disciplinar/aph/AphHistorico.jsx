import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";
import {
  MagnifyingGlassIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  PrinterIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  UserCircleIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/solid";

// ──────────────────────────────────────────────────────
// HELPERS E DADOS FIXOS
// ──────────────────────────────────────────────────────
function buildFotoURL(foto, baseURL) {
  if (!foto) return null;
  if (foto.startsWith("http")) return foto;
  const base = baseURL?.replace(/\/api$/, "") || "";
  return `${base}${foto.startsWith("/") ? "" : "/"}${foto}`;
}

function parseJsonField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

function formatarData(dateStr) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function formatarHora(dateStr) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const MOTIVO_CORES = {
  grave: ["Suspeita de fratura","Crise convulsiva","Desmaio","Reação alérgica","Falta de ar","Queimadura","Sangramento"],
  medio: ["Queda","Contusão/pancada","Entorse","Corte/ferimento","Tontura","Febre"],
};

const MOTIVOS_TODOS = [
  "Mal-estar", "Dor", "Dor de cabeça", "Dor abdominal", "Náusea/vômito", "Tontura", "Desmaio", "Febre", "Queda", "Corte/ferimento", "Sangramento", "Contusão/pancada", "Entorse", "Suspeita de fratura", "Queimadura", "Reação alérgica", "Falta de ar", "Crise convulsiva"
];

function motivoColor(motivo) {
  if (MOTIVO_CORES.grave.includes(motivo)) return "bg-red-100 text-red-700 border-red-200";
  if (MOTIVO_CORES.medio.includes(motivo)) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-blue-50 text-blue-700 border-blue-100";
}

// ──────────────────────────────────────────────────────
// CARD DE ATENDIMENTO
// ──────────────────────────────────────────────────────
function AtendimentoCard({ atend, onVerDetalhes, baseURL }) {
  const motivos = parseJsonField(atend.motivos);
  const isGrave = motivos.some(m => MOTIVO_CORES.grave.includes(m));
  const fotoURL = buildFotoURL(atend.aluno_foto || atend.aluno_foto_url, baseURL);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col ${isGrave ? "border-red-200" : "border-gray-100"}`}>
      <div className={`h-1 w-full ${isGrave ? "bg-red-500" : "bg-blue-400"}`} />
      
      {/* Cabeçalho do Aluno (Novo) */}
      <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3 bg-gray-50/50">
        <div className="w-10 h-10 bg-white rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-200">
          {fotoURL ? <img src={fotoURL} alt="Foto" className="w-full h-full object-cover" /> : <UserCircleIcon className="w-6 h-6 text-gray-400" />}
        </div>
        <div className="overflow-hidden">
          <div className="font-bold text-gray-800 text-sm truncate">{atend.aluno_nome || "Aluno Excluído"}</div>
          <div className="text-xs text-gray-500 truncate">{atend.turma_nome || "Sem Turma"} - Matr: {atend.aluno_matricula || "--"}</div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-md">
                {atend.numero_atendimento || `APH-${atend.id}`}
              </span>
              {isGrave && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <ExclamationCircleIcon className="w-3.5 h-3.5" /> Grave
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                {formatarData(atend.data_ocorrencia)} às {formatarHora(atend.data_ocorrencia)}
              </span>
            </div>
          </div>
          <button
            onClick={() => onVerDetalhes(atend)}
            className="flex-shrink-0 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100"
          >
            Ver Detalhes
          </button>
        </div>

        {motivos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {motivos.map(m => (
              <span key={m} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${motivoColor(m)}`}>{m}</span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-gray-100 flex flex-col gap-1">
          {atend.desfecho && (
            <div className="flex items-center gap-2">
              <CheckBadgeIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-xs text-gray-600 font-medium">{atend.desfecho}</span>
            </div>
          )}
          {atend.socorrista_nome && (
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-400">Socorrista: {atend.socorrista_nome}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// MODAL DE DETALHES
// ──────────────────────────────────────────────────────
function ModalDetalhes({ atend, onClose }) {
  if (!atend) return null;
  const motivos      = parseJsonField(atend.motivos);
  const sinais       = parseJsonField(atend.sinais);
  const atendimentos = parseJsonField(atend.atendimentos);
  const materiais    = parseJsonField(atend.materiais);

  const Section = ({ icon: Icon, title, children }) => (
    <div className="mb-6 break-inside-avoid">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-red-500" />
        <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{title}</h4>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">{children}</div>
    </div>
  );

  const Chip = ({ label, color = "bg-blue-50 text-blue-700 border-blue-100" }) => (
    <span className={`inline-block text-xs px-2 py-1 rounded-full border font-medium mr-1 mb-1 ${color}`}>{label}</span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:p-0 print:bg-white print:block overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col my-auto max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none">
        
        {/* Header */}
        <div className="bg-red-600 text-white rounded-t-2xl p-5 flex items-center justify-between flex-shrink-0 print:rounded-none">
          <div>
            <div className="flex items-center gap-3">
              <HeartIcon className="w-6 h-6 text-white/70" />
              <div>
                <p className="text-xs text-red-200 font-medium">Atendimento Pré-Hospitalar</p>
                <h3 className="text-xl font-extrabold">{atend.numero_atendimento || `#${atend.id}`}</h3>
              </div>
            </div>
            <p className="text-sm text-red-100 mt-1">
              {atend.aluno_nome || "Aluno Excluído"} - {formatarData(atend.data_ocorrencia)} às {formatarHora(atend.data_ocorrencia)}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button onClick={() => window.print()} title="Imprimir" className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
              <PrinterIcon className="w-5 h-5" />
            </button>
            <button onClick={onClose} title="Fechar" className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 print:overflow-visible">
          <Section icon={ShieldCheckIcon} title="1. Identificação">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400 text-xs">Aluno</span><p className="font-semibold text-gray-800">{atend.aluno_nome || "--"}</p></div>
              <div><span className="text-gray-400 text-xs">Turma / Matrícula</span><p className="font-semibold text-gray-800">{atend.turma_nome || "--"} / {atend.aluno_matricula || "--"}</p></div>
              <div><span className="text-gray-400 text-xs">Data</span><p className="font-semibold text-gray-800">{formatarData(atend.data_ocorrencia)}</p></div>
              <div><span className="text-gray-400 text-xs">Hora</span><p className="font-semibold text-gray-800">{formatarHora(atend.data_ocorrencia)}</p></div>
              {atend.socorrista_nome && <div className="col-span-2"><span className="text-gray-400 text-xs">Socorrista</span><p className="font-semibold text-gray-800">{atend.socorrista_nome}</p></div>}
            </div>
          </Section>

          <Section icon={MapPinIcon} title="2. Local da Ocorrência">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400 text-xs">Local</span><p className="font-semibold text-gray-800">{atend.local || "--"}</p></div>
              {atend.solicitante && <div><span className="text-gray-400 text-xs">Solicitante</span><p className="font-semibold text-gray-800">{atend.solicitante}</p></div>}
            </div>
          </Section>

          <Section icon={ExclamationCircleIcon} title="3. Motivo do Atendimento">
            {motivos.length > 0 && <div className="mb-3">{motivos.map(m => <Chip key={m} label={m} color={motivoColor(m)} />)}</div>}
            {atend.relato && <p className="text-sm text-gray-700 italic">"{atend.relato}"</p>}
          </Section>

          {(atend.condicao_geral || sinais.length > 0) && (
            <Section icon={ShieldCheckIcon} title="4. Avaliação Inicial">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {atend.condicao_geral && <div><span className="text-gray-400 text-xs">Condição Geral</span><p className="font-semibold text-gray-800">{atend.condicao_geral}</p></div>}
                {sinais.length > 0 && <div className="col-span-2"><span className="text-gray-400 text-xs">Queixas / Sinais</span><div className="mt-1">{sinais.map(s => <Chip key={s} label={s} />)}</div></div>}
              </div>
            </Section>
          )}

          {(atendimentos.length > 0 || atend.descricao_atendimento) && (
            <Section icon={CheckBadgeIcon} title="5. Atendimento Realizado">
              {atendimentos.length > 0 && <div className="mb-2">{atendimentos.map(a => <Chip key={a} label={a} color="bg-green-50 text-green-700 border-green-100" />)}</div>}
              {atend.descricao_atendimento && <p className="text-sm text-gray-700 italic mt-2">"{atend.descricao_atendimento}"</p>}
            </Section>
          )}

          {(materiais.length > 0 || atend.outro_material) && (
            <Section icon={ArchiveBoxIcon} title="6. Material Utilizado">
              {materiais.length > 0 && <div>{materiais.map(m => <Chip key={m} label={m} color="bg-purple-50 text-purple-700 border-purple-100" />)}</div>}
              {atend.outro_material && <div className="mt-1"><Chip label={`Outros: ${atend.outro_material}`} color="bg-gray-100 text-gray-700 border-gray-200" /></div>}
            </Section>
          )}

          {atend.desfecho && (
            <Section icon={CheckBadgeIcon} title="7. Desfecho">
              <p className="text-sm font-semibold text-gray-800">{atend.desfecho}</p>
            </Section>
          )}

          {atend.comunicacao_resp && (
            <Section icon={ClockIcon} title="8. Comunicação ao Responsável">
              <p className="text-sm font-semibold text-gray-800">{atend.comunicacao_resp}</p>
              <div className="flex gap-4 mt-2">
                {atend.hora_comunicacao && <p className="text-xs text-gray-500">Horário da comunicação: <strong>{atend.hora_comunicacao}</strong></p>}
                {atend.hora_comparecimento && <p className="text-xs text-gray-500">Comparecimento: <strong>{atend.hora_comparecimento}</strong></p>}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 print:hidden">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors">
            <PrinterIcon className="w-4 h-4" /> Imprimir
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ──────────────────────────────────────────────────────
export default function AphHistorico() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [turmas, setTurmas]             = useState([]);
  const [atendDetalhes, setAtendDetalhes] = useState(null);
  const baseURL = api.defaults.baseURL || "";

  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim]       = useState("");
  const [filtroTurma, setFiltroTurma]           = useState("");
  const [filtroMotivo, setFiltroMotivo]         = useState("");
  const [filtroNome, setFiltroNome]             = useState("");

  const debounceRef = useRef(null);

  // Carrega turmas da escola
  useEffect(() => {
    async function loadTurmas() {
      try {
        const { data } = await api.get("/api/turmas");
        setTurmas(data.turmas || data || []);
      } catch (err) {
        console.error("Erro ao carregar turmas", err);
      }
    }
    loadTurmas();
  }, []);

  // Busca de atendimentos (disparada ao mudar filtros)
  const buscarAtendimentos = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/aph/escola", {
        params: {
          data_inicio: filtroDataInicio || undefined,
          data_fim: filtroDataFim || undefined,
          turma_id: filtroTurma || undefined,
          motivo: filtroMotivo || undefined,
          aluno_nome: filtroNome || undefined,
          limit: 100
        }
      });
      setAtendimentos(data.atendimentos || []);
    } catch (err) {
      console.error("Erro ao carregar atendimentos", err);
      setAtendimentos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      buscarAtendimentos();
    }, 400); // debounce para não espamar a API enquanto digita nome
  }, [filtroDataInicio, filtroDataFim, filtroTurma, filtroMotivo, filtroNome]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Header e Barra de Filtros */}
      <div className="px-8 pt-8 pb-6 border-b border-gray-100 bg-gray-50/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <FunnelIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Painel de Ocorrências</h2>
              <p className="text-sm text-gray-500">Histórico geral de atendimentos APH da escola</p>
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
            {atendimentos.length} registro(s)
          </div>
        </div>

        {/* Filtros em Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
          {/* Aluno (Busca por Nome) */}
          <div className="md:col-span-2 relative">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Aluno</label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text" value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-400 outline-none"
              />
            </div>
          </div>

          {/* Turma */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Turma</label>
            <select
              value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-400 outline-none text-gray-700 bg-white"
            >
              <option value="">Todas as Turmas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>

          {/* Tipo (Motivo) */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Ocorrência</label>
            <select
              value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-400 outline-none text-gray-700 bg-white"
            >
              <option value="">Qualquer Motivo</option>
              {MOTIVOS_TODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Período (Data Início e Fim) */}
          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">De</label>
              <input
                type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-gray-700"
              />
            </div>
            <div className="w-1/2">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Até</label>
              <input
                type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-gray-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Área de Resultados */}
      <div className="p-6 md:p-8 bg-white min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <ArrowPathIcon className="w-8 h-8 animate-spin mb-4" />
            <p>Carregando ocorrências...</p>
          </div>
        ) : atendimentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center">
            <CheckBadgeIcon className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-500">Nenhum atendimento encontrado</h3>
            <p className="text-sm mt-1 max-w-md">Nenhum registro APH bate com os filtros selecionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in-up">
            {atendimentos.map(atend => (
              <AtendimentoCard key={atend.id} atend={atend} onVerDetalhes={setAtendDetalhes} baseURL={baseURL} />
            ))}
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {atendDetalhes && <ModalDetalhes atend={atendDetalhes} onClose={() => setAtendDetalhes(null)} />}

      <style>{`
        .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media print {
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
