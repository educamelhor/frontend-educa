// src/features/secretaria/cargas-horarias/ConfigCargaSegmento.jsx
// ============================================================================
// Configuração de Carga por Segmento (Modulação Inteligente)
// Define quantas aulas uma disciplina consome por turma
// dependendo da etapa (Fundamental, Médio...) e do turno (Matutino, Noturno...)
// ============================================================================

import React, { useEffect, useState, useMemo } from "react";
import { TrashIcon, PlusIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import api from "../../../services/api";

const ETAPAS = ["EI", "Fundamental", "Médio", "Técnico", "EJA"];
const TURNOS = ["Matutino", "Vespertino", "Noturno", "Integral"];

function norm(s) {
  return String(s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export default function ConfigCargaSegmento() {
  const [configs, setConfigs]       = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [erro, setErro]             = useState("");
  const [sucesso, setSucesso]       = useState("");
  const [filtro, setFiltro]         = useState("");

  // Form de adição
  const [form, setForm] = useState({ disciplina_id: "", etapa: "", turno: "", carga: 1 });
  const [formErro, setFormErro] = useState("");

  // Confirmação de remoção
  const [removendo, setRemovendo]   = useState(null); // id do item a remover

  // ─── Carregamento inicial ─────────────────────────────────────────────────
  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      // Chamadas independentes para isolar falhas
      const resConfigs = await api.get("/api/cargas-horarias/config-segmento");
      setConfigs(resConfigs.data?.itens ?? []);
    } catch (e) {
      console.error("[ConfigCargaSegmento] Erro ao carregar configs:", e);
      setErro(`Não foi possível carregar as configurações. (${e?.response?.status ?? "sem resposta"})`);
    } finally {
      setLoading(false);
    }

    // Disciplinas — carregadas separadamente para não bloquear o painel
    try {
      const escola_id = localStorage.getItem("escola_id") || 1;
      const resDiscs = await api.get("/api/disciplinas", { params: { escola_id } });
      const raw = Array.isArray(resDiscs.data)
        ? resDiscs.data
        : Array.isArray(resDiscs.data?.disciplinas)
        ? resDiscs.data.disciplinas
        : [];
      // Normaliza: backend retorna o campo como "disciplina" (alias no SELECT),
      // mas nosso componente usa "nome". Idêntico ao que faz ListaCargasHorarias.jsx.
      const discs = raw.map((d) => ({
        ...d,
        nome: d.nome ?? d.disciplina ?? d.titulo ?? `Disciplina ${d.id}`,
      }));
      setDisciplinas(discs.sort((a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR")));
    } catch (e) {
      console.warn("[ConfigCargaSegmento] Disciplinas não carregadas:", e?.response?.status, e?.message);
      // Não exibe erro crítico — o usuário ainda pode ver as configs existentes
    }
  }

  useEffect(() => { carregar(); }, []);

  // ─── Filtro de busca ──────────────────────────────────────────────────────
  const configsFiltradas = useMemo(() => {
    const t = norm(filtro);
    if (!t) return configs;
    return configs.filter(c =>
      norm(c.disciplina_nome).includes(t) ||
      norm(c.etapa).includes(t) ||
      norm(c.turno).includes(t)
    );
  }, [configs, filtro]);

  // ─── Detecta duplicata antes de salvar ───────────────────────────────────
  const jaCadastrado = useMemo(() => {
    if (!form.disciplina_id || !form.etapa || !form.turno) return false;
    return configs.some(
      c =>
        String(c.disciplina_id) === String(form.disciplina_id) &&
        norm(c.etapa) === norm(form.etapa) &&
        norm(c.turno) === norm(form.turno)
    );
  }, [form, configs]);

  // ─── Salvar nova config ───────────────────────────────────────────────────
  async function handleSalvar(e) {
    e.preventDefault();
    setFormErro("");
    setSucesso("");

    if (!form.disciplina_id || !form.etapa || !form.turno) {
      setFormErro("Preencha disciplina, etapa e turno.");
      return;
    }
    const carga = Number(form.carga);
    if (!Number.isInteger(carga) || carga < 1) {
      setFormErro("A carga deve ser um número inteiro ≥ 1.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/cargas-horarias/config-segmento", {
        disciplina_id: Number(form.disciplina_id),
        etapa: form.etapa,
        turno: form.turno,
        carga,
      });
      setSucesso(jaCadastrado ? "Configuração atualizada!" : "Configuração salva!");
      setForm({ disciplina_id: "", etapa: "", turno: "", carga: 1 });
      await carregar();
      setTimeout(() => setSucesso(""), 3000);
    } catch (e) {
      setFormErro(e?.response?.data?.message || "Erro ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Remover config ───────────────────────────────────────────────────────
  async function handleRemover(id) {
    setRemovendo(null);
    try {
      await api.delete(`/api/cargas-horarias/config-segmento/${id}`);
      setConfigs(prev => prev.filter(c => c.id !== id));
      setSucesso("Configuração removida.");
      setTimeout(() => setSucesso(""), 3000);
    } catch {
      setErro("Não foi possível remover. Tente novamente.");
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header da seção */}
      <div className="bg-gradient-to-r from-indigo-700 to-blue-600 rounded-xl p-5 text-white shadow-md">
        <h2 className="text-xl font-bold flex items-center gap-2">
          ⚡ Configuração de Carga por Segmento
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          Define quantas aulas uma disciplina consome por turma na Modulação,
          dependendo da <strong>etapa</strong> (Fundamental, Médio…) e do <strong>turno</strong>.
          <br />
          Exemplo: <em>Artes + Fundamental + Noturno = 1 aula</em> |{" "}
          <em>Artes + Médio + Noturno = 3 aulas</em>
        </p>
      </div>

      {/* Feedback global */}
      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
          {sucesso}
        </div>
      )}

      {/* Formulário de adição */}
      <form onSubmit={handleSalvar} className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          {jaCadastrado ? "Atualizar configuração existente" : "Adicionar nova configuração"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Disciplina */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Disciplina *</label>
            <select
              value={form.disciplina_id}
              onChange={e => setForm(f => ({ ...f, disciplina_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">— selecione —</option>
              {disciplinas.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>

          {/* Etapa */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Etapa *</label>
            <select
              value={form.etapa}
              onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">— selecione —</option>
              {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Turno */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Turno *</label>
            <select
              value={form.turno}
              onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">— selecione —</option>
              {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Carga */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Aulas/turma *</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.carga}
              onChange={e => setForm(f => ({ ...f, carga: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Botão salvar */}
          <div className="sm:col-span-3 flex items-end">
            {formErro && (
              <p className="text-xs text-red-600 flex items-center gap-1 mr-4">
                <ExclamationCircleIcon className="w-4 h-4" /> {formErro}
              </p>
            )}
            {jaCadastrado && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 mr-3">
                ⚠️ Já existe — ao salvar, irá atualizar
              </span>
            )}
          </div>
          <div className="sm:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg shadow transition"
            >
              {saving ? "Salvando…" : jaCadastrado ? "Atualizar" : "Adicionar"}
            </button>
          </div>
        </div>
      </form>

      {/* Tabela de configs */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">
            Configurações cadastradas
            {configs.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">
                {configs.length}
              </span>
            )}
          </h3>
          <input
            type="text"
            placeholder="🔍 Filtrar…"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando…</div>
        ) : configsFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {configs.length === 0
              ? "Nenhuma configuração cadastrada ainda."
              : "Nenhum resultado para o filtro."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50 text-indigo-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Disciplina</th>
                  <th className="px-4 py-3 text-center font-semibold">Etapa</th>
                  <th className="px-4 py-3 text-center font-semibold">Turno</th>
                  <th className="px-4 py-3 text-center font-semibold">Aulas/turma</th>
                  <th className="px-4 py-3 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configsFiltradas.map(c => (
                  <tr key={c.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.disciplina_nome}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{c.etapa}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">{c.turno}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-9 h-9 bg-green-100 text-green-800 rounded-full font-bold text-base shadow-sm">
                        {c.carga}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {removendo === c.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs text-gray-600">Confirmar?</span>
                          <button
                            onClick={() => handleRemover(c.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setRemovendo(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRemovendo(c.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Remover configuração"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="text-xs text-gray-500 bg-gray-50 border rounded-lg p-3 flex gap-2">
        <span>💡</span>
        <span>
          Quando não há configuração específica para uma combinação Disciplina+Etapa+Turno,
          o sistema usa a <strong>carga padrão da disciplina</strong> (cadastrada em Disciplinas).
          Se nem essa existir, assume <strong>1 aula</strong> por turma.
        </span>
      </div>
    </div>
  );
}
