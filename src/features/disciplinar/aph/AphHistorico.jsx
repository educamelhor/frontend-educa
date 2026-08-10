import React, { useState, useCallback, useRef } from "react";
import api from "../../../services/api";
import {
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  UserCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  PrinterIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/solid";

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
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarHora(dateStr) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const MOTIVO_CORES = {
  grave: ["Suspeita de fratura","Crise convulsiva","Desmaio","Reacao alergica","Falta de ar","Queimadura","Sangramento"],
  medio: ["Queda","Contusao/pancada","Entorse","Corte/ferimento","Tontura","Febre"],
};

function motivoColor(motivo) {
  if (MOTIVO_CORES.grave.includes(motivo)) return "bg-red-100 text-red-700 border-red-200";
  if (MOTIVO_CORES.medio.includes(motivo)) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-blue-50 text-blue-700 border-blue-100";
}

function AtendimentoCard({ atend, onVerDetalhes }) {
  const motivos = parseJsonField(atend.motivos);
  const isGrave = motivos.some(m => MOTIVO_CORES.grave.includes(m));
  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${isGrave ? "border-red-200" : "border-gray-100"}`}>
      <div className={`h-1 w-full ${isGrave ? "bg-red-500" : "bg-blue-400"}`} />
      <div className="p-5">
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
                {formatarData(atend.data_ocorrencia)} as {formatarHora(atend.data_ocorrencia)}
              </span>
              {atend.local && (
                <span className="flex items-center gap-1">
                  <MapPinIcon className="w-3.5 h-3.5" />
                  {atend.local}
                </span>
              )}
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
        {atend.desfecho && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            <CheckBadgeIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-xs text-gray-600 font-medium">{atend.desfecho}</span>
          </div>
        )}
        {atend.socorrista_nome && (
          <div className="mt-1 flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-400">Socorrista: {atend.socorrista_nome}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalDetalhes({ atend, aluno, onClose }) {
  if (!atend) return null;
  const motivos      = parseJsonField(atend.motivos);
  const sinais       = parseJsonField(atend.sinais);
  const atendimentos = parseJsonField(atend.atendimentos);
  const materiais    = parseJsonField(atend.materiais);

  const Section = ({ icon: Icon, title, children }) => (
    <div className="mb-6">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="bg-red-600 text-white rounded-t-2xl p-5 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <HeartIcon className="w-6 h-6 text-white/70" />
              <div>
                <p className="text-xs text-red-200 font-medium">Atendimento Pre-Hospitalar</p>
                <h3 className="text-xl font-extrabold">{atend.numero_atendimento || `#${atend.id}`}</h3>
              </div>
            </div>
            <p className="text-sm text-red-100 mt-1">{aluno?.nome || "--"} - {formatarData(atend.data_ocorrencia)} as {formatarHora(atend.data_ocorrencia)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} title="Imprimir" className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
              <PrinterIcon className="w-5 h-5" />
            </button>
            <button onClick={onClose} title="Fechar" className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Section icon={ShieldCheckIcon} title="1. Identificacao">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400 text-xs">Aluno</span><p className="font-semibold text-gray-800">{aluno?.nome || "--"}</p></div>
              <div><span className="text-gray-400 text-xs">Matricula</span><p className="font-semibold text-gray-800">{aluno?.matricula || "--"}</p></div>
              <div><span className="text-gray-400 text-xs">Data</span><p className="font-semibold text-gray-800">{formatarData(atend.data_ocorrencia)}</p></div>
              <div><span className="text-gray-400 text-xs">Hora</span><p className="font-semibold text-gray-800">{formatarHora(atend.data_ocorrencia)}</p></div>
              {atend.socorrista_nome && <div className="col-span-2"><span className="text-gray-400 text-xs">Socorrista</span><p className="font-semibold text-gray-800">{atend.socorrista_nome}</p></div>}
            </div>
          </Section>

          <Section icon={MapPinIcon} title="2. Local da Ocorrencia">
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
            <Section icon={ShieldCheckIcon} title="4. Avaliacao Inicial">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {atend.condicao_geral && <div><span className="text-gray-400 text-xs">Condicao Geral</span><p className="font-semibold text-gray-800">{atend.condicao_geral}</p></div>}
                {sinais.length > 0 && <div><span className="text-gray-400 text-xs">Queixas / Sinais</span><div className="mt-1">{sinais.map(s => <Chip key={s} label={s} />)}</div></div>}
              </div>
            </Section>
          )}

          {(atendimentos.length > 0 || atend.descricao_atendimento) && (
            <Section icon={CheckBadgeIcon} title="5. Atendimento Realizado">
              {atendimentos.map(a => <Chip key={a} label={a} color="bg-green-50 text-green-700 border-green-100" />)}
              {atend.descricao_atendimento && <p className="text-sm text-gray-700 italic mt-2">"{atend.descricao_atendimento}"</p>}
            </Section>
          )}

          {(materiais.length > 0 || atend.outro_material) && (
            <Section icon={ArchiveBoxIcon} title="6. Material Utilizado">
              {materiais.map(m => <Chip key={m} label={m} color="bg-purple-50 text-purple-700 border-purple-100" />)}
              {atend.outro_material && <Chip label={`Outros: ${atend.outro_material}`} color="bg-gray-100 text-gray-700 border-gray-200" />}
            </Section>
          )}

          {atend.desfecho && (
            <Section icon={CheckBadgeIcon} title="7. Desfecho">
              <p className="text-sm font-semibold text-gray-800">{atend.desfecho}</p>
            </Section>
          )}

          {atend.comunicacao_resp && (
            <Section icon={ClockIcon} title="8. Comunicacao ao Responsavel">
              <p className="text-sm font-semibold text-gray-800">{atend.comunicacao_resp}</p>
              {atend.hora_comunicacao && <p className="text-xs text-gray-500 mt-1">Horario da comunicacao: <strong>{atend.hora_comunicacao}</strong></p>}
              {atend.hora_comparecimento && <p className="text-xs text-gray-500 mt-1">Horario do comparecimento: <strong>{atend.hora_comparecimento}</strong></p>}
            </Section>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
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

export default function AphHistorico() {
  const [query, setQuery]                = useState("");
  const [buscando, setBuscando]          = useState(false);
  const [resultados, setResultados]      = useState([]);
  const [alunoSelecionado, setAlunoSel] = useState(null);
  const [historico, setHistorico]        = useState([]);
  const [loadingHist, setLoadingHist]    = useState(false);
  const [atendDetalhes, setAtendDet]     = useState(null);
  const debounceRef = useRef(null);
  const baseURL = api.defaults.baseURL || "";

  const handleSearch = useCallback(async (valor) => {
    setQuery(valor);
    clearTimeout(debounceRef.current);
    if (valor.trim().length < 3) { setResultados([]); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await api.get("/api/alunos", { params: { filtro: valor, limit: 8 } });
        setResultados(data.alunos || []);
      } catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 400);
  }, []);

  const handleSelectAluno = async (aluno) => {
    setAlunoSel(aluno);
    setResultados([]);
    setQuery("");
    setLoadingHist(true);
    try {
      const { data } = await api.get(`/api/aph/historico/${aluno.id}`);
      setHistorico(data || []);
    } catch { setHistorico([]); }
    finally { setLoadingHist(false); }
  };

  const handleVoltar = () => { setAlunoSel(null); setHistorico([]); setQuery(""); setResultados([]); };

  if (alunoSelecionado) {
    const fotoURL = buildFotoURL(alunoSelecionado.foto || alunoSelecionado.foto_url, baseURL);
    return (
      <>
        <div className="bg-red-600 px-8 py-5 text-white rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={handleVoltar} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex-shrink-0" title="Nova busca">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 bg-white/20 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/40 flex-shrink-0">
              {fotoURL ? <img src={fotoURL} alt={alunoSelecionado.nome} className="w-full h-full object-cover" /> : <UserCircleIcon className="w-9 h-9 text-white/70" />}
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{alunoSelecionado.nome || alunoSelecionado.estudante}</h2>
              <div className="text-red-100 text-sm flex flex-wrap gap-3 mt-0.5 opacity-90">
                <span>Matricula: {alunoSelecionado.matricula || alunoSelecionado.codigo || "--"}</span>
                {alunoSelecionado.turma_nome && <span>Turma: {alunoSelecionado.turma_nome}</span>}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-red-100">
            <span className="font-bold text-white text-base">{historico.length} {historico.length === 1 ? "atendimento" : "atendimentos"}</span>
            <br /><span>registrado{historico.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {loadingHist ? (
          <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
            <ArrowPathIcon className="w-6 h-6 animate-spin" /> Carregando historico...
          </div>
        ) : historico.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 flex flex-col items-center text-center">
            <ClockIcon className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-500">Nenhum atendimento registrado</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-xs">Este estudante ainda nao possui atendimentos APH registrados no sistema.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historico.map(atend => <AtendimentoCard key={atend.id} atend={atend} onVerDetalhes={setAtendDet} />)}
          </div>
        )}

        {atendDetalhes && (
          <ModalDetalhes
            atend={atendDetalhes}
            aluno={{ nome: alunoSelecionado.nome || alunoSelecionado.estudante, matricula: alunoSelecionado.matricula || alunoSelecionado.codigo }}
            onClose={() => setAtendDet(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-8 pt-8 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 rounded-xl">
            <ClockIcon className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Historico de Atendimentos</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">Pesquise por nome ou matricula do estudante para ver o historico completo de atendimentos APH.</p>
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text" value={query} onChange={e => handleSearch(e.target.value)}
            placeholder="Pesquisar por nome ou matricula..."
            className="w-full pl-12 pr-4 py-4 text-sm border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-red-400 outline-none bg-gray-50 focus:bg-white transition-all"
          />
          {buscando && <ArrowPathIcon className="w-5 h-5 text-red-400 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />}
        </div>
      </div>

      <div className="p-8">
        {resultados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resultados.map(aluno => {
              const fotoURL = buildFotoURL(aluno.foto || aluno.foto_url, baseURL);
              return (
                <button key={aluno.id} onClick={() => handleSelectAluno(aluno)}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-red-300 hover:bg-red-50 transition-all text-left group">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center border-2 border-transparent group-hover:border-red-200">
                    {fotoURL ? <img src={fotoURL} alt={aluno.nome || aluno.estudante} className="w-full h-full object-cover" /> : <UserCircleIcon className="w-8 h-8 text-gray-400" />}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-gray-800 truncate group-hover:text-red-700 text-sm">{aluno.nome || aluno.estudante}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex gap-2">
                      <span>Matr.: {aluno.matricula || aluno.codigo || "--"}</span>
                      {aluno.turma_nome && <span>- {aluno.turma_nome}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : query.length >= 3 && !buscando ? (
          <div className="text-center py-12">
            <UserCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum aluno encontrado</p>
            <p className="text-sm text-gray-400 mt-1">Tente pesquisar por outro nome ou matricula.</p>
          </div>
        ) : (
          <div className="text-center py-16 flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <MagnifyingGlassIcon className="w-10 h-10 text-red-300" />
            </div>
            <h3 className="font-bold text-gray-600 text-lg">Pesquise um estudante</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-xs">Digite pelo menos 3 letras para pesquisar um estudante e ver seu historico de atendimentos APH.</p>
          </div>
        )}
      </div>
    </div>
  );
}
