// src/features/alunos/AlunoForm.jsx
// ────────────────────────────────────────────────────────────────
// Componente: AlunoForm
// Finalidade: Modal de cadastro/edição de aluno (individual)
//
// Ajustes (PASSO 1 - já entregues e mantidos):
// 1) Normalizar data para <input type="date"> (YYYY-MM-DD)
// 2) Preencher automaticamente a TURMA ao abrir em modo de edição:
//    - Se não vier turma_id, mas vier o nome da turma (ex.: "1A"),
//      mapear pelo nome dentro da lista carregada de /api/turmas.
//
// Ajuste (PASSO 2 - atual):
// 3) Bloquear edição do campo CÓDIGO quando estiver em modo edição
//    (ou seja, quando existir initialData.id).
//
// Observação: Todo o restante foi preservado como já aprovado.
// ────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from "react";
import { Dialog } from "@headlessui/react";
import api from "../../../services/api";
import Input from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";

// ────────────────────────────────────────────────────────────────
// Normalizador / Abreviador de ANEE (Padrão SEEDF / EDUCADF)
// Converte descrições longas do CSV EDUCADF em siglas oficiais:
// Ex.: "TRANSTORNO DO ESPECTRO AUTISTA" -> "TEA"
//      "DEFICIÊNCIA FÍSICA MÉDIAS NECESSIDADES ESPECIAIS, TRANSTORNO DO DÉFICIT DE ATENÇÃO E HIPERATIVIDADE" -> "DF, TDAH"
// ────────────────────────────────────────────────────────────────
const REGRAS_ANEES_SEEDF = [
  { sigla: "SC", descricao: "Surdocegueira", regex: /SURDOCEGUEIR|\bSC\b/ },
  {
    sigla: "TEA",
    descricao: "Transtorno do Espectro Autista",
    regex: /\bTEA\b|ESPECTRO AUTISTA|\bAUTISM|\bASPERGER\b|SINDROME DE RETT|DESINTEGRATIVO DA INFANCIA/,
  },
  {
    sigla: "TGD",
    descricao: "Transtorno Global do Desenvolvimento",
    regex: /\bTGD\b|GLOBAL DO DESENVOLVIMENTO/,
  },
  {
    sigla: "DF",
    descricao: "Deficiência Física",
    regex: /\bDF\b|DEFICIENCIA FISICA|DEFICIENCIA MOTORA|PARALISIA CEREBRAL|OSTOMIA|MOBILIDADE REDUZIDA/,
  },
  {
    sigla: "DI",
    descricao: "Deficiência Intelectual",
    regex: /\bDI\b|DEFICIENCIA INTELECTUAL|DEFICIENCIA MENTAL|ATRASO COGNITIVO/,
  },
  {
    sigla: "DA",
    descricao: "Deficiência Auditiva",
    regex: /\bDA\b|DEFICIENCIA AUDITIVA|HIPOACUSIA/,
  },
  {
    sigla: "SURDEZ",
    descricao: "Surdez",
    regex: /\bSURDEZ\b/,
    skipIfSurdocegueira: true,
  },
  {
    sigla: "BV",
    descricao: "Baixa Visão",
    regex: /\bBV\b|BAIXA VISAO|VISAO SUBNORMAL/,
  },
  {
    sigla: "VM",
    descricao: "Visão Monocular",
    regex: /\bVM\b|VISAO MONOCULAR/,
  },
  {
    sigla: "DV",
    descricao: "Deficiência Visual",
    regex: /\bDV\b|DEFICIENCIA VISUAL|\bCEGUEIRA\b/,
    skipIfSurdocegueira: true,
  },
  {
    sigla: "DMU",
    descricao: "Deficiência Múltipla",
    regex: /\bDMU\b|DEFICIENCIAS? MULTIPLAS?/,
  },
  {
    sigla: "AH/SD",
    descricao: "Altas Habilidades / Superdotação",
    regex: /\bAH\s*\/?\s*SD\b|ALTAS HABILIDADES|SUPERDOTAC/,
  },
  {
    sigla: "SD",
    descricao: "Síndrome de Down",
    regex: /\bSD\b|SINDROME DE DOWN|TRISSOMIA DO 21/,
    stripAhSdFirst: true,
  },
  {
    sigla: "TDAH",
    descricao: "Transtorno do Déficit de Atenção e Hiperatividade",
    regex: /\bTDAH\b|\bTDA\b|DEFICIT DE ATENCAO|HIPERATIVIDADE/,
  },
  {
    sigla: "TOD",
    descricao: "Transtorno Opositivo Desafiador",
    regex: /\bTOD\b|OPOSITOR DESAFIADOR|OPOSITIVO DESAFIADOR|DESAFIADOR OPOSITIVO/,
  },
  {
    sigla: "TPAC",
    descricao: "Transtorno do Processamento Auditivo Central",
    regex: /\bTPAC\b|\bDPAC\b|PROCESSAMENTO AUDITIVO CENTRAL/,
  },
  {
    sigla: "TDL",
    descricao: "Transtorno do Desenvolvimento da Linguagem",
    regex: /\bTDL\b|\bDEL\b|DESENVOLVIMENTO DA LINGUAGEM|ESPECIFICO DE LINGUAGEM|TRANSTORNO DE LINGUAGEM/,
  },
  { sigla: "DISLEXIA", descricao: "Dislexia", regex: /\bDISLEXIA\b/ },
  { sigla: "DISCALCULIA", descricao: "Discalculia", regex: /\bDISCALCULIA\b/ },
  { sigla: "DISGRAFIA", descricao: "Disgrafia", regex: /\bDISGRAFIA\b/ },
  { sigla: "DISORTOGRAFIA", descricao: "Disortografia", regex: /\bDISORTOGRAFIA\b/ },
  { sigla: "DISLALIA", descricao: "Dislalia", regex: /\bDISLALIA\b/ },
  {
    sigla: "TFE",
    descricao: "Transtorno Funcional Específico",
    regex: /\bTFE\b|FUNCIONAL ESPECIFICO|ESPECIFICO DE APRENDIZAGEM/,
  },
];

export function abreviarAneesEducaDF(raw) {
  const textoLimpo = String(raw ?? "")
    .replace(/[\u00A0\t\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!textoLimpo) {
    return { siglas: [], textoSiglas: "", itens: [] };
  }

  const segmentos = textoLimpo
    .split(/[,;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const vistos = new Set();
  const itens = [];

  for (const seg of segmentos) {
    const segNorm = seg
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!segNorm) continue;

    const temSurdocegueira = /SURDOCEGUEIR/.test(segNorm);
    const segSemAhSd = segNorm.replace(/\bAH\s*\/?\s*SD\b/g, " ");
    let bateuRegra = false;

    for (const r of REGRAS_ANEES_SEEDF) {
      if (r.skipIfSurdocegueira && temSurdocegueira) continue;
      const alvo = r.stripAhSdFirst ? segSemAhSd : segNorm;
      if (r.regex.test(alvo)) {
        bateuRegra = true;
        if (!vistos.has(r.sigla)) {
          vistos.add(r.sigla);
          itens.push({ sigla: r.sigla, descricao: r.descricao });
        }
      }
    }

    if (!bateuRegra) {
      const fallback = seg
        .replace(/\s*[-–]?\s*(BAIXAS?|M[EÉ]DIAS?|ALTAS?)\s+NECESSIDADES?\s+ESPECIAIS?/gi, "")
        .trim();
      const siglaFallback = (fallback || seg).toUpperCase();
      if (siglaFallback && !vistos.has(siglaFallback)) {
        vistos.add(siglaFallback);
        itens.push({ sigla: siglaFallback, descricao: seg });
      }
    }
  }

  const siglas = itens.map((i) => i.sigla);
  return {
    siglas,
    textoSiglas: siglas.join(", "),
    itens,
  };
}

export default function AlunoForm({ open, onClose, onSubmit, initialData = {}, anoLetivo }) {
  // ────────────────────────────────────────────────────────────────
  // Helpers locais
  // ────────────────────────────────────────────────────────────────
  // Normaliza "YYYY-MM-DDTHH:mm:ss" -> "YYYY-MM-DD" para <input type="date">
  const normalizeDate = (s) => (typeof s === "string" ? s.split("T")[0] : "");

  // ────────────────────────────────────────────────────────────────
  // Estados dos campos
  // ────────────────────────────────────────────────────────────────
  const [codigo, setCodigo] = useState(initialData.codigo || "");
  const [estudante, setEstudante] = useState(
    initialData.nome_registro || initialData.estudante || ""
  );
  const [dataNascimento, setDataNascimento] = useState(
    initialData.data_nascimento ? normalizeDate(initialData.data_nascimento) : ""
  );
  const [turmaId, setTurmaId] = useState(
    initialData.turma_id ? String(initialData.turma_id) : ""
  );
  const [cpf, setCpf] = useState(initialData.cpf || "");
  const [atendimentoDiferencial, setAtendimentoDiferencial] = useState(
    initialData.atendimento_diferencial === 1 || initialData.atendimento_diferencial === true
  );
  const [aneesBrutoOriginal, setAneesBrutoOriginal] = useState(initialData.anees || "");
  const [aneesInput, setAneesInput] = useState(
    () => abreviarAneesEducaDF(initialData.anees || "").textoSiglas
  );
  const [aneesEditadoManual, setAneesEditadoManual] = useState(false);
  const [usaNomeSocial, setUsaNomeSocial] = useState(
    initialData.usa_nome_social === 1 || initialData.usa_nome_social === true
  );
  const [nomeSocial, setNomeSocial] = useState(initialData.nome_social || "");
  const [turmas, setTurmas] = useState([]);
  const [modalAtivarOpen, setModalAtivarOpen] = useState(false);

  const resumoAneesAtual = useMemo(() => abreviarAneesEducaDF(aneesInput), [aneesInput]);

  const legendaAnees = useMemo(() => {
    if (resumoAneesAtual.itens.length === 0) {
      return "Siglas usuais: TEA, DF, DI, DA, DV, TDAH, TOD, TPAC, DMU, AH/SD.";
    }
    return resumoAneesAtual.itens
      .map((item) =>
        item.descricao && item.descricao.toUpperCase() !== item.sigla.toUpperCase()
          ? `${item.sigla} — ${item.descricao}`
          : item.sigla
      )
      .join(" · ");
  }, [resumoAneesAtual]);

  // ────────────────────────────────────────────────────────────────
  // Carrega lista de turmas quando o modal abre
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    api
      .get("/api/turmas")
      .then((res) => setTurmas(res.data))
      .catch((err) => console.error("Erro ao carregar turmas:", err));
  }, [open]);

  // ────────────────────────────────────────────────────────────────
  // Hidrata campos sempre que o modal abre (ou initialData muda)
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setCodigo(initialData.codigo || "");
      setEstudante(initialData.nome_registro || initialData.estudante || "");
      setDataNascimento(normalizeDate(initialData.data_nascimento));
      setTurmaId(initialData.turma_id ? String(initialData.turma_id) : "");
      setCpf(initialData.cpf || "");
      const isAee =
        initialData.atendimento_diferencial === 1 ||
        initialData.atendimento_diferencial === true ||
        Boolean(String(initialData.anees || "").trim());
      setAtendimentoDiferencial(isAee);
      const rawAnees = String(initialData.anees || "").trim();
      setAneesBrutoOriginal(rawAnees);
      setAneesInput(abreviarAneesEducaDF(rawAnees).textoSiglas);
      setAneesEditadoManual(false);
      setUsaNomeSocial(
        initialData.usa_nome_social === 1 || initialData.usa_nome_social === true
      );
      setNomeSocial(initialData.nome_social || "");

      // Fallback defensivo caso initialData tenha vindo sem o campo `anees`
      if (initialData.codigo && typeof initialData.anees === "undefined") {
        let cancelado = false;
        api
          .get(`/api/alunos/${initialData.codigo}`)
          .then((res) => {
            if (cancelado || !res?.data) return;
            const fetchedAnees = String(res.data.anees || "").trim();
            if (fetchedAnees) {
              setAneesBrutoOriginal(fetchedAnees);
              setAneesInput((prev) => prev || abreviarAneesEducaDF(fetchedAnees).textoSiglas);
              setAtendimentoDiferencial(true);
            }
          })
          .catch(() => {});
        return () => {
          cancelado = true;
        };
      }
    }
  }, [open, initialData]);

  // ────────────────────────────────────────────────────────────────
  // PASSO 1 (mantido): Mapear nome da turma -> turma_id quando editar
  // Cenário: veio initialData.turma (ex.: "1A"), mas não veio turma_id.
  // Assim que a lista de turmas estiver carregada, tenta mapear.
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    // Se já há turma_id no initialData, não sobrescreve
    if (initialData?.turma_id) return;

    // Se existir nome da turma no initialData e já temos a lista
    if (initialData?.turma && Array.isArray(turmas) && turmas.length) {
      const alvo = String(initialData.turma).toUpperCase().trim();
      const match = turmas.find(
        (t) => String(t.turma).toUpperCase().trim() === alvo
      );
      if (match?.id) setTurmaId(String(match.id));
    }
  }, [open, initialData, turmas]);

  // ────────────────────────────────────────────────────────────────
  // Submit (mantido + suporte a Nome Social)
  // ────────────────────────────────────────────────────────────────
  const buildPayload = () => {
    const nomeRegistroTrim = String(estudante || "").trim();
    const nomeSocialTrim = String(nomeSocial || "").trim();
    const aneesDigitado = String(aneesInput || "").trim();
    let aneesParaSalvar = null;
    if (atendimentoDiferencial) {
      if (!aneesEditadoManual && aneesBrutoOriginal) {
        aneesParaSalvar = aneesBrutoOriginal;
      } else {
        aneesParaSalvar = aneesDigitado || null;
      }
    }
    return {
      codigo,
      estudante: usaNomeSocial ? nomeSocialTrim : nomeRegistroTrim,
      nome_registro: nomeRegistroTrim,
      usa_nome_social: usaNomeSocial ? 1 : 0,
      nome_social: usaNomeSocial ? nomeSocialTrim : null,
      data_nascimento: dataNascimento,
      turma_id: Number(turmaId),
      cpf,
      atendimento_diferencial: atendimentoDiferencial ? 1 : 0,
      anees: aneesParaSalvar,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (usaNomeSocial && !String(nomeSocial || "").trim()) {
      return;
    }

    const payload = buildPayload();

    let sucesso = false;

    if (initialData.id) {
      // aluno já existia — mantemos o status atual ou ativo (se undefined)
      sucesso = await onSubmit({
        ...initialData,
        ...payload,
        status: initialData.status || "ativo",
      });
    } else {
      // novo aluno
      sucesso = await onSubmit(payload);
    }

    if (sucesso) onClose();
  };

  // ────────────────────────────────────────────────────────────────
  // Ativação explícita
  // ────────────────────────────────────────────────────────────────
  const handleConfirmarAtivacao = async () => {
    if (usaNomeSocial && !String(nomeSocial || "").trim()) {
      setModalAtivarOpen(false);
      return;
    }

    const payload = buildPayload();

    const sucesso = await onSubmit({
      ...initialData,
      ...payload,
      status: "ativo",
    });

    if (sucesso) {
      setModalAtivarOpen(false);
      onClose();
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Renderização do modal
  // ────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <Dialog.Overlay className="fixed inset-0 bg-black/30" />
      <div className="bg-white rounded-lg w-full max-w-md max-h-[92vh] overflow-y-auto p-6 z-10">
        <Dialog.Title className="text-xl font-semibold mb-4">
          {initialData?.id ? "Editar Estudante" : "Adicionar Estudante"}
        </Dialog.Title>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* RE (Registro Estudantil) */}
          <div>
            <label className="block font-medium mb-1">RE (Registro Estudantil)</label>
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              className="w-full"
              disabled={!!initialData.id}     // 🔒 bloqueia edição quando existe ID
              title={initialData.id ? "Campo bloqueado durante a edição" : undefined}
            />
          </div>

          {/* Estudante (Nome Civil / Registro) */}
          <div>
            <label className="block font-medium mb-1">
              {usaNomeSocial ? "Estudante (Nome de Registro)" : "Estudante"}
            </label>
            <Input
              value={estudante}
              onChange={(e) => setEstudante(e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* CPF */}
          <div>
            <label className="block font-medium mb-1">CPF do Estudante</label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full"
            />
          </div>

          {/* Atendimento Diferencial */}
          <div className="flex items-center space-x-2 mt-2 bg-slate-50 p-3 rounded border border-slate-200">
            <input
              type="checkbox"
              id="atendimento_diferencial"
              checked={atendimentoDiferencial}
              onChange={(e) => setAtendimentoDiferencial(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="atendimento_diferencial" className="font-medium text-slate-700 cursor-pointer">
              Estudante com Atendimento Diferencial (AEE)
            </label>
          </div>

          {/* Campo condicional logo abaixo do checkbox AEE — Deficiência / ANEE (abreviatura: TEA, DF, etc.) */}
          {atendimentoDiferencial && (
            <div className="bg-blue-50/60 p-3 rounded border border-blue-200 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label
                  htmlFor="anees_estudante"
                  className="block font-medium text-slate-800 text-sm"
                >
                  Deficiência / Necessidade (ANEE)
                </label>
                {resumoAneesAtual.itens.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {resumoAneesAtual.itens.map((item) => (
                      <span
                        key={item.sigla}
                        title={item.descricao || item.sigla}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm"
                      >
                        {item.sigla}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Input
                id="anees_estudante"
                value={aneesInput}
                onChange={(e) => {
                  setAneesInput(e.target.value);
                  setAneesEditadoManual(true);
                }}
                placeholder="Ex.: TEA, DF, DI, DA, DV, TDAH, AH/SD"
                className="w-full font-semibold text-slate-800"
              />

              {legendaAnees && (
                <p className="text-xs text-slate-600 leading-snug">
                  {legendaAnees}
                </p>
              )}
            </div>
          )}

          {/* Nome Social — Res. CNE/CP nº 1/2018 · Lei nº 9.394/96 · Dec. 8.727/2016 · Dec. DF 37.982/2017 */}
          <div className="flex items-center space-x-2 mt-2 bg-slate-50 p-3 rounded border border-slate-200">
            <input
              type="checkbox"
              id="usa_nome_social"
              checked={usaNomeSocial}
              onChange={(e) => setUsaNomeSocial(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="usa_nome_social"
              className="font-medium text-slate-700 cursor-pointer text-sm sm:text-base"
              title="Resolução CNE/CP nº 1/2018 (MEC), Lei nº 9.394/1996 (LDB), Decreto Federal nº 8.727/2016 e Decreto Distrital nº 37.982/2017"
            >
              Nome Social — Res. CNE/CP nº 1/2018 (Lei nº 9.394/96)
            </label>
          </div>

          {/* Campo condicional para inserir o Nome Social */}
          {usaNomeSocial && (
            <div className="bg-blue-50/60 p-3 rounded border border-blue-200 space-y-1">
              <label className="block font-medium text-slate-800 mb-1">
                Nome Social do Estudante
              </label>
              <Input
                value={nomeSocial}
                onChange={(e) => setNomeSocial(e.target.value)}
                placeholder="Informe o nome social do estudante"
                required={usaNomeSocial}
                className="w-full"
              />
              <p className="text-xs text-slate-500">
                Exibido em todas as listas, chamadas, diários, boletins e aplicativo.
              </p>
            </div>
          )}

          {/* Data de Nascimento */}
          <div>
            <label className="block font-medium mb-1">Data de Nascimento</label>
            <Input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Turma */}
          <div>
            <label className="block font-medium mb-1">Turma</label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="w-full border rounded p-2"
              required
            >
              <option value="">Selecione a turma</option>
              {turmas
                .filter((t) => !anoLetivo || Number(t.ano) === Number(anoLetivo))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.turma}
                  </option>
                ))}
            </select>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 mt-6">
            {initialData?.status === "inativo" && (
              <Button
                type="button"
                onClick={() => setModalAtivarOpen(true)}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow-sm"
              >
                Ativar
              </Button>
            )}
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Salvar
            </Button>
          </div>
        </form>
      </div>

      {/* Modal Confirmar Ativação */}
      <Dialog
        open={modalAtivarOpen}
        onClose={() => setModalAtivarOpen(false)}
        className="fixed inset-0 z-[60] flex items-center justify-center"
      >
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <div className="bg-white rounded-lg w-full max-w-sm p-6 z-10 text-center shadow-xl">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Confirmar Ativação</h3>
          <p className="text-gray-600 mb-6">
            Deseja reativar o estudante{" "}
            <strong>{usaNomeSocial && nomeSocial.trim() ? nomeSocial.trim() : estudante}</strong>?
          </p>
          <div className="flex justify-center gap-3">
            <Button
              type="button"
              onClick={() => setModalAtivarOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarAtivacao}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Sim, Ativar
            </Button>
          </div>
        </div>
      </Dialog>
    </Dialog>
  );
}
