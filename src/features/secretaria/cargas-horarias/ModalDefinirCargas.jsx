// src/features/secretaria/cargas-horarias/ModalDefinirCargas.jsx
// ============================================================================
// Modal – Cargas Horárias
// ---------------------------------------------------------------------------
// Objetivo
// - Definir as disciplinas de uma turma (sem repetição) e calcular o Total da
//   Carga a partir das cargas das disciplinas no banco.
// - Salvar a definição em massa via POST /api/cargas-horarias/definir.
// ---------------------------------------------------------------------------
// Principais pontos
// - Mantém o layout existente (sem simplificações), com grid responsivo.
// - Evita overflow visual (min-w-0/max-w-full nos wrappers e no <select>).
// - Normaliza IDs como string para impedir duplicidade por tipo (str/num).
// - Opções já escolhidas em outra linha aparecem desabilitadas.
// - Após salvar com sucesso: dispara alert simples e chama onClose()
//   (o pai pode recarregar a tabela na sequência).
// ---------------------------------------------------------------------------
// Dependências
// - api: "../../../services/api"
// - O backend já implementa GET/POST de cargas-horarias.
// ============================================================================

import React, { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";

// ----------------------------------------------------------------------------
// Util: normaliza qualquer id para string (evita bug str vs number)
// ----------------------------------------------------------------------------
const asId = (v) => (v == null ? "" : String(v));

// ----------------------------------------------------------------------------
/* Util: extrai campo de carga aceitando diferentes nomes (tolerante ao backend) */
// ----------------------------------------------------------------------------
function getCargaFromDisciplina(d) {
  if (!d) return 0;
  return (
    Number(d.carga) ||          // campo padrão no seu banco
    Number(d.carga_horaria) ||  // tolerância a schemas antigos
    Number(d.aulas) ||
    Number(d.horas) ||
    Number(d.weekly_hours) ||
    0
  );
}

// ============================================================================
// Componente
// ============================================================================
export default function ModalDefinirCargas({ turno, turma, onClose }) {
  // --------------------------------------------------------------------------
  // Estado: formulário e dados
  // --------------------------------------------------------------------------
  const [qtd, setQtd] = useState(1);                   // quantidade de disciplinas (linhas)
  const [disciplinas, setDisciplinas] = useState([]);  // lista carregada da API
  const [loading, setLoading] = useState(false);       // carregando disciplinas
  const [erro, setErro] = useState("");                // erro de carregamento da API

  const [selecionadas, setSelecionadas] = useState([]); // array de ids (string)
  const [cargaPorId, setCargaPorId] = useState({});     // cache id->carga

  const [saving, setSaving] = useState(false);         // estado de salvamento

  // OBS: se o backend já usa req.user.escola_id (como turmas), este valor será ignorado.
  const escola_id = useMemo(() => localStorage.getItem("escola_id") || 1, []);

  // --------------------------------------------------------------------------
  // Efeito: carregar disciplinas do turno ao abrir
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErro("");
      try {
        const { data } = await api.get("/api/disciplinas", {
          params: { escola_id, turno },
        });
        const arr = Array.isArray(data) ? data : [];

        // Normaliza cada item (sempre id string + nome)
        const normalizadas = arr.map((d, i) => ({
          id: asId(d.id ?? d.codigo ?? `disc-${i}`),
          nome: d.nome ?? d.disciplina ?? d.titulo ?? `Disciplina ${i + 1}`,
          ...d,
        }));
        setDisciplinas(normalizadas);

        // Prepara cache de cargas
        const cache = {};
        for (const d of normalizadas) cache[asId(d.id)] = getCargaFromDisciplina(d);
        setCargaPorId(cache);

        // Zera seleções ao abrir
        setSelecionadas([]);
      } catch (err) {
        console.error("Erro ao listar disciplinas:", err);
        setErro("Não foi possível carregar disciplinas do turno.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [turno, escola_id]);

  // --------------------------------------------------------------------------
  // Linhas dinâmicas conforme 'qtd' (limite de segurança)
  // --------------------------------------------------------------------------
  const linhas = useMemo(() => {
    const n = Math.max(0, Math.min(30, Number(qtd) || 0));
    return Array.from({ length: n }, (_, idx) => idx);
  }, [qtd]);

  // --------------------------------------------------------------------------
  // Conjunto de ids já escolhidos (para desabilitar opções repetidas)
  // --------------------------------------------------------------------------
  const escolhidasSet = useMemo(
    () => new Set(selecionadas.map(asId).filter(Boolean)),
    [selecionadas]
  );

  // --------------------------------------------------------------------------
  // Handler: seleção por linha
  // --------------------------------------------------------------------------
  function handleSelect(index, idDisc) {
    const idStr = asId(idDisc);
    setSelecionadas((prev) => {
      const novo = [...prev];
      novo[index] = idStr || "";
      return novo;
    });
  }

  // --------------------------------------------------------------------------
  // Total de carga (somatório das cargas das disciplinas selecionadas)
  // --------------------------------------------------------------------------
  const totalCarga = useMemo(
    () => selecionadas.reduce((acc, id) => acc + (cargaPorId[asId(id)] || 0), 0),
    [selecionadas, cargaPorId]
  );

  // --------------------------------------------------------------------------
  // Validação: só pode prosseguir se todas as linhas estiverem preenchidas
  // --------------------------------------------------------------------------
  const podeProsseguir = useMemo(() => {
    const n = Number(qtd) || 0;
    if (n === 0) return false;
    return Array.from({ length: n }).every((_, i) => !!selecionadas[i]);
  }, [qtd, selecionadas]);

  // --------------------------------------------------------------------------
  // Salvar: envia definição em massa ao backend
  // --------------------------------------------------------------------------
  async function handleSalvar() {
    try {
      setSaving(true);

      const payload = {
        // Se a API já usa req.user.escola_id, este campo será ignorado no backend revisado.
        // Mantido aqui por compatibilidade com versões antigas.
        escola_id,
        turma_id: turma?.id,
        itens: selecionadas, // array de ids (string/number)
      };

      const { data } = await api.post("/api/cargas-horarias/definir", payload);

      // Feedback simples — pode ser trocado por toast do seu design system.
      alert(`✅ Cargas salvas com sucesso!\nTotal: ${data?.totalCarga ?? 0}`);

      // Fecha o modal; o pai (index.jsx) recarrega as cargas no onClose.
      onClose();
    } catch (err) {
      console.error("Erro ao salvar cargas:", err?.response?.data || err?.message);
      alert(err?.response?.data?.message || "Erro ao salvar cargas da turma. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="w-full max-w-2xl mx-auto p-4 box-border">
      {/* Cabeçalho ----------------------------------------------------------- */}
      <div className="mb-4 overflow-hidden">
        <div className="text-xs text-gray-500 font-medium">
          Turno: <span className="text-blue-700">{turno}</span> &nbsp;|&nbsp; Turma:{" "}
          <span className="text-blue-700">{turma?.turma ?? turma?.nome}</span>
        </div>
        <h2 className="text-xl font-bold text-blue-900 mt-1">
          Definir Cargas por Disciplina
        </h2>
      </div>

      {/* Quantidade --------------------------------------------------------- */}
      <div className="mb-3 overflow-hidden">
        <label className="block text-sm font-medium mb-1">Quantas disciplinas?</label>
        <input
          type="number"
          min={0}
          max={30}
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          className="border rounded p-2 w-28 max-w-full"
        />
        <p className="text-[11px] text-gray-500 mt-1">
          Informe o número de disciplinas que esta <strong>turma</strong> terá no turno{" "}
          <strong>{turno}</strong>.
        </p>
      </div>

      {/* Linhas dinâmicas --------------------------------------------------- */}
      {loading ? (
        <div className="p-3 bg-gray-50 border rounded overflow-hidden">Carregando disciplinas…</div>
      ) : erro ? (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded overflow-hidden">
          {erro}
        </div>
      ) : (
        <div className="space-y-3 max-h-[320px] overflow-y-auto overflow-x-hidden">
          {linhas.map((i) => {
            const valor = asId(selecionadas[i] || "");
            return (
              <div
                key={i}
                className="flex flex-col sm:grid sm:grid-cols-5 gap-2 sm:gap-3 items-start sm:items-center"
              >
                <div className="sm:col-span-2 text-sm text-gray-600 font-medium min-w-0">
                  Disciplina {i + 1}
                </div>

                <div className="w-full sm:col-span-3 min-w-0">
                  <select
                    value={valor}
                    onChange={(e) => handleSelect(i, e.target.value)}
                    className="border rounded p-2 w-full min-w-0 max-w-full text-sm"
                  >
                    <option value="">— selecione —</option>
                    {disciplinas.map((d) => {
                      const idStr = asId(d.id);
                      const escolhidaNestaLinha = valor === idStr;
                      const escolhidaEmOutraLinha =
                        escolhidasSet.has(idStr) && !escolhidaNestaLinha;

                      return (
                        <option key={idStr} value={idStr} disabled={escolhidaEmOutraLinha}>
                          {d.nome}
                          {getCargaFromDisciplina(d) ? ` • ${getCargaFromDisciplina(d)}h` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}

          {linhas.length === 0 && (
            <div className="p-3 bg-gray-50 border rounded text-gray-600 overflow-hidden">
              Defina acima a quantidade de disciplinas para esta turma.
            </div>
          )}
        </div>
      )}

      {/* Rodapé ------------------------------------------------------------- */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 overflow-hidden">
        <div className="text-base min-w-0">
          <span className="font-semibold text-blue-900">Total de carga horária:</span>{" "}
          <span className="font-bold">{totalCarga}</span>
        </div>

        <div className="flex gap-2 justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!podeProsseguir || saving}
            onClick={handleSalvar}
            className={`px-4 py-2 rounded text-white text-sm ${
              podeProsseguir && !saving
                ? "bg-green-600 hover:bg-green-700"
                : "bg-green-300 cursor-not-allowed"
            }`}
            title={podeProsseguir ? "" : "Preencha todas as disciplinas para continuar"}
          >
            {saving ? "Salvando..." : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
