import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';
import { 
  ArrowLeftIcon, 
  UserCircleIcon,
  MapPinIcon,
  ClockIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export default function AphFormulario({ aluno, onBack, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const topoRef = useRef(null);

  // Form State
  const [local, setLocal] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [motivos, setMotivos] = useState([]);
  const [relato, setRelato] = useState('');
  const [condicaoGeral, setCondicaoGeral] = useState('Consciente');
  const [sinais, setSinais] = useState([]);
  const [atendimentos, setAtendimentos] = useState([]);
  const [descricaoAtendimento, setDescricaoAtendimento] = useState('');
  const [desfecho, setDesfecho] = useState('');
  const [comunicacaoResp, setComunicacaoResp] = useState('');

  // Rola para o topo do formulário de forma robusta garantindo que divs com overflow também rolem
  useEffect(() => {
    if (topoRef.current) {
      topoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Opções rápidas
  const locaisOptions = ["Sala de aula", "Quadra", "Pátio", "Refeitório", "Corredor", "Banheiro", "Entrada/saída", "Outro"];
  const motivosOptions = ["Mal-estar", "Dor", "Dor de cabeça", "Dor abdominal", "Náusea/vômito", "Tontura", "Desmaio", "Febre", "Queda", "Corte/ferimento", "Sangramento", "Contusão/pancada", "Entorse", "Suspeita de fratura", "Queimadura", "Reação alérgica", "Falta de ar", "Crise convulsiva"];
  const sinaisOptions = ["Dor", "Sangramento", "Inchaço", "Ferimento", "Dificuldade de movimento", "Outros"];
  const atendimentosOptions = ["Avaliação/observação", "Higienização do ferimento", "Curativo", "Gelo/compressa fria", "Controle de sangramento", "Imobilização", "Repouso", "Sinais vitais conferidos"];
  const desfechosOptions = ["Retornou para sala/aula", "Permaneceu em observação", "Foi liberado para o responsável", "Encaminhado p/ unidade de saúde", "Transportado pelo SAMU", "Transportado pelos Bombeiros"];

  const toggleArrayItem = (setter, array, item) => {
    if (array.includes(item)) setter(array.filter(i => i !== item));
    else setter([...array, item]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!local || motivos.length === 0 || !desfecho) {
      toast.error("Preencha as informações obrigatórias (Local, Motivo e Desfecho).");
      return;
    }
    
    try {
      setIsSubmitting(true);
      const payload = {
        aluno_id: aluno.id,
        escola_id: localStorage.getItem("escola_id") || 1,
        local,
        solicitante,
        motivos,
        relato,
        condicao_geral: condicaoGeral,
        sinais,
        atendimentos,
        descricao_atendimento: descricaoAtendimento,
        desfecho,
        comunicacao_resp: comunicacaoResp
      };
      
      const response = await api.post('/api/aph', payload);
      
      if (response.data?.success) {
        toast.success("Atendimento APH registrado com sucesso!");
        onSuccess();
      } else {
        toast.error("Erro ao registrar atendimento APH.");
      }
    } catch (error) {
      console.error("Erro APH:", error);
      toast.error("Erro de comunicação com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={topoRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* HEADER DO FORMULÁRIO */}
      <div className="bg-red-600 px-8 py-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Voltar para seleção"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/30">
              {aluno.foto_url ? (
                <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
              ) : (
                <UserCircleIcon className="w-8 h-8 text-white/70" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{aluno.nome}</h2>
              <div className="text-red-100 text-sm flex gap-3 opacity-90">
                <span>Turma: {aluno.turma?.turma || "N/D"}</span>
                <span>Matrícula: {aluno.matricula || "N/D"}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-red-100 hidden md:block">
          <div>Data: {new Date().toLocaleDateString('pt-BR')}</div>
          <div>Hora: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-10">

        {/* 1. IDENTIFICAÇÃO DA OCORRÊNCIA */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
            <MapPinIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-700">1. Local da Ocorrência <span className="text-red-500">*</span></h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {locaisOptions.map(l => (
              <button
                key={l} type="button"
                onClick={() => setLocal(l)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  local === l ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profissional que solicitou atendimento (opcional)</label>
            <input 
              type="text" value={solicitante} onChange={e => setSolicitante(e.target.value)}
              className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              placeholder="Ex: Prof. Maria (Educação Física)"
            />
          </div>
        </section>

        {/* 2. MOTIVO DO ATENDIMENTO */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
            <InformationCircleIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-700">2. Motivo do Atendimento <span className="text-red-500">*</span></h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {motivosOptions.map(m => (
              <button
                key={m} type="button"
                onClick={() => toggleArrayItem(setMotivos, motivos, m)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  motivos.includes(m) ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relato curto do que aconteceu</label>
            <textarea 
              value={relato} onChange={e => setRelato(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              rows="2" placeholder="Ex: Durante a aula, o estudante escorregou e caiu..."
            ></textarea>
          </div>
        </section>

        {/* 3. AVALIAÇÃO DO ESTUDANTE */}
        <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
            <ShieldCheckIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-bold text-gray-700">3. Avaliação Inicial</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Condição Geral</label>
              <div className="flex gap-3">
                {["Consciente", "Sonolento", "Desorientado", "Inconsciente"].map(cond => (
                  <label key={cond} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" name="condicao" value={cond}
                      checked={condicaoGeral === cond} onChange={() => setCondicaoGeral(cond)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{cond}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Queixas / Sinais</label>
              <div className="flex flex-wrap gap-2">
                {sinaisOptions.map(s => (
                  <button
                    key={s} type="button"
                    onClick={() => toggleArrayItem(setSinais, sinais, s)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-all ${
                      sinais.includes(s) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. ATENDIMENTO REALIZADO */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
            <CheckBadgeIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-bold text-gray-700">4. Atendimento Realizado</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {atendimentosOptions.map(a => (
              <label key={a} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                atendimentos.includes(a) ? 'bg-green-50 border-green-400' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}>
                <input 
                  type="checkbox" className="mt-1 w-4 h-4 text-green-600 rounded"
                  checked={atendimentos.includes(a)}
                  onChange={() => toggleArrayItem(setAtendimentos, atendimentos, a)}
                />
                <span className="text-sm text-gray-700 font-medium leading-tight">{a}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição adicional do atendimento</label>
            <input 
              type="text" value={descricaoAtendimento} onChange={e => setDescricaoAtendimento(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Descreva algum curativo específico ou orientação dada"
            />
          </div>
        </section>

        {/* 5. DESFECHO */}
        <section className="bg-red-50 p-6 rounded-xl border border-red-100">
          <div className="flex items-center gap-2 mb-4 border-b border-red-200 pb-2">
            <ArrowLeftIcon className="w-5 h-5 text-red-500 transform rotate-180" />
            <h3 className="text-lg font-bold text-red-800">5. Desfecho <span className="text-red-500">*</span></h3>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-3">Após o atendimento, o estudante:</label>
              <div className="space-y-2">
                {desfechosOptions.map(d => (
                  <label key={d} className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" name="desfecho" value={d}
                      checked={desfecho === d} onChange={() => setDesfecho(d)}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-800 font-medium">{d}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-3">Comunicação ao Responsável:</label>
              <div className="space-y-2">
                {["Não foi necessária", "Responsável comunicado (via telefone/app)", "Tentativa de contato sem sucesso", "Responsável compareceu à escola"].map(c => (
                  <label key={c} className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="radio" name="comunicacao" value={c}
                      checked={comunicacaoResp === c} onChange={() => setComunicacaoResp(c)}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-800 font-medium">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SUBMIT */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button" onClick={onBack}
            className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 transition-all disabled:opacity-70 flex items-center gap-2"
          >
            {isSubmitting ? 'Registrando...' : 'Finalizar Atendimento Médico'}
          </button>
        </div>
      </form>
    </div>
  );
}
