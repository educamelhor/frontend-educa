import React, { useState } from "react";
import ModalAdicionarItemAvaliativo from "./ModalAdicionarItemAvaliativo";

import {
  IdentificationIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";



/**
 * AtividadesAvaliativas.jsx
 * ------------------------------------------------------------
 * Página: Plano de Avaliação Pedagógica
 * Escopo atual: SOMENTE FRONTEND (layout + fluxo visual)
 * Backend e persistência serão integrados em passos futuros.
 * ------------------------------------------------------------
 */

export default function AtividadesAvaliativas() {
  // ---------------------------
  // Estados de seleção
  // ---------------------------
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(null);
  const [bimestreSelecionado, setBimestreSelecionado] = useState(null);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState([]);
  const [mostrarTabela, setMostrarTabela] = useState(false);

  // ---------------------------
  // PAP (mock) — controle local
  // ---------------------------
  const [papStatus, setPapStatus] = useState("RASCUNHO"); // RASCUNHO | ENVIADO | APROVADO | DEVOLVIDO | BLOQUEADO_TEMPO

  // "Banco" em memória para simular unicidade por configuração (disciplina+bimestre+conjunto de turmas)
  const [papIndexMock, setPapIndexMock] = useState({}); // { [papKey]: { itens, status, nomeCodigo } }
  const [papKeyAtiva, setPapKeyAtiva] = useState(null);


  // ---------------------------
  // Regras de pontuação (mock)
  // ---------------------------
  const PONTOS_TOTAL_PAP = 10;

  const totalPontos = (lista) =>
    (lista || []).reduce((acc, it) => acc + Number(it?.nota_total || 0), 0);

  // Tabela (mock inicial) — em passos futuros virá do backend

  const [itens, setItens] = useState([
    {
      atividade: "Prova Bimestral",
      data_inicio: "",
      data_final: "",
      nota_total: 5, // ✅ regra mock da direção: 5 pontos fixos
      oportunidades: 1,
      nota_invertida: 0,
      descricao: "",
      fixo_direcao: true, // ✅ trava edição/remoção
    },
  ]);

  // ✅ Cálculos dependem de "itens" — devem ficar DEPOIS do state
  const totalAtual = totalPontos(itens);
  const saldo = Number((PONTOS_TOTAL_PAP - totalAtual).toFixed(2));

  const pontosOk = Math.abs(totalAtual - PONTOS_TOTAL_PAP) < 0.0001;
  const pontosExcedeu = totalAtual > PONTOS_TOTAL_PAP;

  const [modalItemOpen, setModalItemOpen] = useState(false);

  // ✅ Controle de edição (null = inclusão / número = índice do item em edição)
  const [editIndex, setEditIndex] = useState(null);

  // ✅ Modal premium de confirmação (exclusão)
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [confirmExcluirIndex, setConfirmExcluirIndex] = useState(null);

  // Campos do modal
  const [atividade, setAtividade] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [notaTotal, setNotaTotal] = useState("");
  const [oportunidades, setOportunidades] = useState("1");
  const [notaInvertida, setNotaInvertida] = useState("0");
  const [descricao, setDescricao] = useState("");

  // ---------------------------
  // Dados mockados (temporários)
  // ---------------------------
  const disciplinas = ["Matemática", "Geometria"];
  const bimestres = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];

  // ---------------------------
  // Regra temporal (MOCK)
  // - Ajustaremos depois para vir do calendário da escola (backend)
  // ---------------------------
  // Exemplo: no mês 9 (setembro) -> 1º e 2º encerrados (bloqueados)
  const mesAtual = new Date().getMonth() + 1; // 1..12

  const statusBimestreMock = (bimLabel) => {
    const n = Number((bimLabel || "").split("º")[0]);
    if (!n) return "ATIVO";

    // Regras simples para mock:
    // Jan–Mar: 1º ATIVO, demais FUTURO
    // Abr–Jun: 1º ENCERRADO, 2º ATIVO
    // Jul–Set: 1º/2º ENCERRADOS, 3º ATIVO
    // Out–Dez: 1º/2º/3º ENCERRADOS, 4º ATIVO
    if (mesAtual <= 3) return n === 1 ? "ATIVO" : "FUTURO";
    if (mesAtual <= 6) return n === 1 ? "ENCERRADO" : n === 2 ? "ATIVO" : "FUTURO";
    if (mesAtual <= 9) return n <= 2 ? "ENCERRADO" : n === 3 ? "ATIVO" : "FUTURO";
    return n <= 3 ? "ENCERRADO" : "ATIVO";
  };

  const bimestreEncerrado = (bimLabel) => statusBimestreMock(bimLabel) === "ENCERRADO";

  const turmas = [
    "1A", "1B", "1C", "1D", "1E", "1F",
    "1G", "1H", "1I", "1J"
  ];

  // ---------------------------
  // Utilidades
  // ---------------------------
  const toggleTurma = (turma) => {
    setTurmasSelecionadas((prev) =>
      prev.includes(turma)
        ? prev.filter((t) => t !== turma)
        : [...prev, turma]
    );
  };

  const selecionarTodasTurmas = (checked) => {
    setTurmasSelecionadas(checked ? turmas : []);
  };

  const gerarPapKey = () => {
    if (!disciplinaSelecionada || !bimestreSelecionado) return null;
    const disc = (disciplinaSelecionada || "").trim();
    const bim = (bimestreSelecionado || "").trim();
    const turmasSorted = [...turmasSelecionadas].sort(); // mock: por nome
    const turmasHash = turmasSorted.join("-");
    return `${disc}__${bim}__${turmasHash}`;
  };

  const gerarNomePlano = () => {
    if (!disciplinaSelecionada || !bimestreSelecionado) return "Plano de Avaliação";
    const disc = disciplinaSelecionada.substring(0, 3).toUpperCase();
    const bim = bimestreSelecionado.split(" ")[0];

    // ✅ ajuste solicitado:
    // - Se todas as turmas estiverem selecionadas => "U" (Plano Único)
    // - Caso contrário, mantém "P" (Plano Parcial / Grupo) para não quebrar a lógica atual
    const turmasLabel = turmasSelecionadas.length === turmas.length ? "U" : "P";

    const ano = new Date().getFullYear();
    return `${disc}-${bim}-BIM-${turmasLabel}-${ano}`;
  };

  const selecaoMinimaOk =
    !!disciplinaSelecionada &&
    !!bimestreSelecionado &&
    turmasSelecionadas.length > 0;

  const bloqueadoPorTempo = !!bimestreSelecionado && bimestreEncerrado(bimestreSelecionado);

  // ---------------------------
  // Mensagens do sistema (mock)
  // ---------------------------
  const [mensagemSistema, setMensagemSistema] = useState(null); // { type: "info"|"warn"|"error"|"success", text: string }

  const showMsg = (type, text) => {
    setMensagemSistema({ type, text });
    window.clearTimeout(showMsg._t);
    showMsg._t = window.setTimeout(() => setMensagemSistema(null), 3500);
  };

  // ---------------------------
  // Render
  // ---------------------------

  return (
    <div className="p-6">
      {/* Título */}
      <h1
        className="text-5xl font-bold text-center text-blue-900 mb-10"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        Plano de Avaliação Pedagógica
      </h1>

      {/* =======================
          Linha 1 — Disciplinas
      ======================== */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-blue-800 mb-3">Disciplina</h2>
        <div className="flex gap-4 flex-wrap">
          {disciplinas.map((disc) => (
            <button
              key={disc}
              onClick={() => setDisciplinaSelecionada(disc)}
              className={`px-6 py-3 rounded-xl shadow transition font-semibold ${
                disciplinaSelecionada === disc
                  ? "bg-blue-700 text-white"
                  : "bg-blue-100 text-blue-900 hover:bg-blue-200"
              }`}
            >
              {disc}
            </button>
          ))}
        </div>
      </section>

      {/* =======================
          Linha 2 — Bimestres
      ======================== */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-blue-800 mb-3">Bimestre</h2>
        <div className="flex gap-4 flex-wrap">

          {bimestres.map((bim) => {
            const encerrado = bimestreEncerrado(bim);
            return (
              <button
                key={bim}
                onClick={() => {
                  if (encerrado) return;
                  setBimestreSelecionado(bim);
                }}
                disabled={encerrado}
                className={`px-6 py-3 rounded-xl shadow transition font-semibold ${
                  encerrado
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : bimestreSelecionado === bim
                      ? "bg-green-600 text-white"
                      : "bg-green-100 text-green-900 hover:bg-green-200"
                }`}
                title={encerrado ? "Bimestre encerrado (somente consulta)" : "Selecionar bimestre"}
              >
                {bim}
              </button>
            );
          })}


        </div>
      </section>

      {/* =======================
          Linha 3 — Turmas
      ======================== */}
      <section className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <h2 className="text-xl font-semibold text-blue-800">Turmas</h2>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={turmasSelecionadas.length === turmas.length}
              onChange={(e) => selecionarTodasTurmas(e.target.checked)}
            />
            Selecionar todas
          </label>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {turmas.map((turma) => (
            <div
              key={turma}
              onClick={() => toggleTurma(turma)}
              className={`cursor-pointer rounded-md px-4 py-2 text-center font-semibold shadow transition ${
                turmasSelecionadas.includes(turma)
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 text-blue-900 hover:bg-blue-200"
              }`}
            >
              {turma}
            </div>
          ))}
        </div>
      </section>

      {/* =======================
          Linha 4 — Plano
      ======================== */}
      <section className="flex items-center justify-center gap-4 mb-10">
        <div className="w-full max-w-xl px-6 py-4 rounded-xl bg-gray-100 text-blue-900 font-bold shadow text-center">
          {gerarNomePlano()}
        </div>

        <button
          onClick={() => {
            if (!selecaoMinimaOk) return;

            const key = gerarPapKey();
            if (!key) return;

            // Se bimestre encerrado: apenas consulta (abre tabela, mas mantém bloqueio)
            if (bloqueadoPorTempo) {
              setPapStatus("BLOQUEADO_TEMPO");
            } else {
              // Se já existe PAP nessa configuração, carregamos do "banco" mock
              if (papIndexMock[key]) {
                const existente = papIndexMock[key];
                setPapStatus(existente.status || "RASCUNHO");
                setItens(existente.itens || []);
              } else {
                // Senão, inicializa novo PAP em memória com o item padrão existente
                const nomeCodigo = gerarNomePlano();
                const novo = {
                  status: "RASCUNHO",
                  nomeCodigo,
                  itens,
                };
                setPapIndexMock((prev) => ({ ...prev, [key]: novo }));
                setPapStatus("RASCUNHO");
              }
            }

            setPapKeyAtiva(key);
            setMostrarTabela(true);
          }}
          disabled={!selecaoMinimaOk}
          className={`px-8 py-4 text-white font-bold rounded-xl shadow transition ${
            selecaoMinimaOk
              ? "bg-orange-500 hover:bg-orange-600"
              : "bg-gray-300 cursor-not-allowed"
          }`}
          title={
            !selecaoMinimaOk
              ? "Selecione disciplina, bimestre e ao menos uma turma"
              : bloqueadoPorTempo
                ? "Bimestre encerrado (somente consulta)"
                : "Criar ou editar o PAP"
          }
        >
          CRIAR / EDITAR
        </button>

      </section>

      {/* =======================
          Tabela de Atividades
      ======================== */}

      {mostrarTabela && (
        <section className="bg-white rounded-xl shadow-lg p-6">
          {/* Mensagem do sistema */}
          {mensagemSistema && (
            <div
              className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${
                mensagemSistema.type === "success"
                  ? "bg-green-100 text-green-800"
                  : mensagemSistema.type === "warn"
                    ? "bg-yellow-100 text-yellow-800"
                    : mensagemSistema.type === "info"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
              }`}
            >
              {mensagemSistema.text}
            </div>
          )}

          {/* Banner de governança (modo consulta) */}
          {(papStatus === "BLOQUEADO_TEMPO" || papStatus === "APROVADO" || papStatus === "ENVIADO") && (
            <div className="mb-4 rounded-lg px-4 py-3 text-sm bg-gray-50 text-gray-700 border">
              <span className="font-bold">Modo:</span>{" "}
              {papStatus === "BLOQUEADO_TEMPO"
                ? "CONSULTA (bimestre encerrado)"
                : papStatus === "APROVADO"
                  ? "CONSULTA (PAP aprovado)"
                  : "CONSULTA (PAP enviado para direção)"}
            </div>
          )}

          {/* Banner de pontuação */}
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold border ${
              pontosOk
                ? "bg-green-50 text-green-800 border-green-200"
                : pontosExcedeu
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-yellow-50 text-yellow-800 border-yellow-200"
            }`}
          >
            Total do PAP: <span className="font-bold">{totalAtual}</span> / {PONTOS_TOTAL_PAP} pontos
            {"  "}
            {!pontosOk && (
              <span className="ml-2">
                {pontosExcedeu
                  ? `(Excedeu ${Math.abs(saldo)} ponto(s))`
                  : `(Faltam ${saldo} ponto(s))`}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-semibold text-blue-800">
              Atividades Avaliativas
            </h3>

            <button
              type="button"
              onClick={() => {
                // bloqueios de governança (mock)
                if (papStatus === "ENVIADO")
                  return showMsg("info", "PAP enviado: aguardando apreciação da direção.");
                if (papStatus === "APROVADO")
                  return showMsg("info", "PAP aprovado: edição bloqueada.");
                if (papStatus === "BLOQUEADO_TEMPO")
                  return showMsg("info", "Bimestre encerrado: apenas consulta.");

                // ✅ mensagem mesmo ao “tentar”
                if (pontosOk)
                  return showMsg(
                    "warn",
                    "Pontuação completa (10/10). Para adicionar novo item, reduza algum item existente."
                  );

                if (pontosExcedeu)
                  return showMsg(
                    "error",
                    "Pontuação excedida. Ajuste os valores antes de adicionar novos itens."
                  );

                // ✅ modo inclusão
                setEditIndex(null);

                setAtividade("");
                setDataInicio("");
                setDataFinal("");
                setNotaTotal("");
                setOportunidades("1");
                setNotaInvertida("0");
                setDescricao("");
                setModalItemOpen(true);

              }}
              disabled={
                papStatus === "ENVIADO" ||
                papStatus === "APROVADO" ||
                papStatus === "BLOQUEADO_TEMPO"
              }
              className={`px-4 py-2 rounded-lg text-white font-semibold shadow transition ${
                papStatus === "ENVIADO" ||
                papStatus === "APROVADO" ||
                papStatus === "BLOQUEADO_TEMPO"
                  ? "bg-gray-300 cursor-not-allowed"
                  : pontosOk || pontosExcedeu
                    ? "bg-blue-600 opacity-70 hover:opacity-80"
                    : "bg-blue-600 hover:bg-blue-700"
              }`}
              title={
                papStatus === "BLOQUEADO_TEMPO"
                  ? "Bimestre encerrado (somente consulta)"
                  : papStatus === "ENVIADO"
                    ? "PAP enviado (aguardando direção)"
                    : papStatus === "APROVADO"
                      ? "PAP aprovado (bloqueado)"
                      : pontosOk
                        ? "Pontuação completa (10/10)"
                        : pontosExcedeu
                          ? "Pontuação excedida"
                          : "Adicionar nova atividade avaliativa"
              }
            >
              + Item
            </button>

          </div>

          <table className="w-full border">

            <thead className="bg-blue-100">
              <tr>
                <th className="border px-4 py-2">Valor</th>
                <th className="border px-4 py-2">Frequência</th>
                <th className="border px-4 py-2">Por ocorrência</th>
                <th className="border px-4 py-2">Atividade Avaliativa</th>
                <th className="border px-4 py-2">Ações</th>
              </tr>
            </thead>

            <tbody>
              {itens.map((item, idx) => {
                const freq = Number(item?.oportunidades || 1);
                const valor = Number(item?.nota_total || 0);
                const porOcorrencia =
                  freq > 0 ? Number((valor / freq).toFixed(2)) : valor;

                const isFixo = !!item?.fixo_direcao;

                return (
                  <tr key={`${item.atividade}-${idx}`} className="text-center">
                    <td className="border px-4 py-2">{valor}</td>
                    <td className="border px-4 py-2">{Number.isNaN(freq) ? 1 : freq}</td>
                    <td className="border px-4 py-2">{porOcorrencia}</td>
                    <td className="border px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <span>{item.atividade}</span>
                        {isFixo && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                            FIXO (DIREÇÃO)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      {isFixo ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          {/* Ícone 1 (AZUL) — padrão discreto (igual Alunos) */}

                          <button
                            type="button"
                            onClick={() => {
                              // Ícone 1 (AZUL) — Solicitar edição do item (mock)

                              // 1) Se o bimestre já encerrou (status final)
                              if (papStatus === "BLOQUEADO_TEMPO") {
                                return showMsg(
                                  "info",
                                  "Bimestre encerrado: não é mais possível editar este item."
                                );
                              }

                              // 2) Se o PAP ainda está em rascunho (não enviado)
                              if (papStatus === "RASCUNHO") {
                                return showMsg(
                                  "info",
                                  "Plano ainda não foi enviado para a direção. Você pode continuar editando para finalizar."
                                );
                              }

                              // 3) Qualquer outro status (ENVIADO / APROVADO / DEVOLVIDO):
                              //    Solicitação de edição vai para direção (mock)
                              return showMsg(
                                "info",
                                "Sua solicitação para editar este item foi enviada para a direção. Em breve você poderá editar."
                              );
                            }}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition"
                            title="Solicitar edição do item"
                          >
                            <IdentificationIcon className="h-5 w-5" />
                          </button>

                          {/* Ícone 3 (ROXO) — Editar item (respeitando status do PAP) */}
                          <button
                            type="button"
                            onClick={() => {
                              // Ícone 3 (ROXO) — Editar item (mock)

                              // 1) Se o bimestre já encerrou (status final)
                              if (papStatus === "BLOQUEADO_TEMPO") {
                                return showMsg(
                                  "info",
                                  "Bimestre encerrado: não é mais possível editar este item."
                                );
                              }

                              // 2) Se o PAP ainda está em rascunho (pode editar livremente)

                              if (papStatus === "RASCUNHO") {
                                // ✅ modo edição
                                setEditIndex(idx);

                                // abre modal preenchido com os dados do item
                                setAtividade(item?.atividade || "");
                                setDataInicio(item?.data_inicio || "");
                                setDataFinal(item?.data_final || "");
                                setNotaTotal(String(item?.nota_total ?? ""));
                                setOportunidades(String(item?.oportunidades ?? "1"));
                                setNotaInvertida(String(item?.nota_invertida ?? "0"));
                                setDescricao(item?.descricao || "");

                                setModalItemOpen(true);
                                return;
                              }

                              // 3) Qualquer outro status (ENVIADO / APROVADO / DEVOLVIDO):
                              //    Solicitação de edição vai para direção (mock)
                              return showMsg(
                                "info",
                                "Sua solicitação para editar este item foi enviada para a direção. Em breve você poderá editar."
                              );
                            }}
                            className="p-1.5 rounded text-purple-600 hover:bg-purple-50 transition"
                            title="Editar item"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>

                          {/* Ícone 4 (VERMELHO) — padrão discreto (igual Alunos) */}
                          <button
                            type="button"
                            onClick={() => {
                              if (papStatus === "ENVIADO") return showMsg("info", "PAP enviado: edição bloqueada.");
                              if (papStatus === "APROVADO") return showMsg("info", "PAP aprovado: edição bloqueada.");
                              if (papStatus === "BLOQUEADO_TEMPO") return showMsg("info", "Bimestre encerrado: apenas consulta.");

                              // ✅ abre modal premium de confirmação
                              setConfirmExcluirIndex(idx);
                              setConfirmExcluirOpen(true);
                            }}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 transition"
                            title="Remover item"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>

                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>

          {/* Ações do PAP (mock) */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-800">Status do PAP:</span>{" "}
              <span className="font-semibold">
                {papStatus === "BLOQUEADO_TEMPO" ? "BLOQUEADO (TEMPO)" : papStatus}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!papKeyAtiva) return;

                if (papStatus === "BLOQUEADO_TEMPO") return showMsg("info", "Bimestre encerrado: apenas consulta.");
                if (papStatus === "APROVADO") return showMsg("info", "PAP aprovado: edição bloqueada.");
                if (papStatus === "ENVIADO") return showMsg("info", "Este PAP já foi enviado para direção.");

                if (!pontosOk) {
                  return showMsg(
                    "warn",
                    `Para enviar, o PAP deve fechar ${PONTOS_TOTAL_PAP} pontos. Atualmente: ${totalAtual}.`
                  );
                }

                // envia para direção (mock)
                setPapStatus("ENVIADO");

                setPapIndexMock((prev) => ({
                  ...prev,
                  [papKeyAtiva]: {
                    ...(prev[papKeyAtiva] || {}),
                    status: "ENVIADO",
                    nomeCodigo: gerarNomePlano(),
                    itens,
                  },
                }));

                showMsg("success", "PAP enviado para direção com sucesso.");
              }}

              disabled={!papKeyAtiva || papStatus === "BLOQUEADO_TEMPO" || papStatus === "APROVADO" || papStatus === "ENVIADO"}
              className={`px-6 py-3 rounded-xl font-bold shadow transition ${
                !papKeyAtiva || papStatus === "BLOQUEADO_TEMPO" || papStatus === "APROVADO" || papStatus === "ENVIADO"
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
              title={
                papStatus === "BLOQUEADO_TEMPO"
                  ? "Bimestre encerrado (somente consulta)"
                  : papStatus === "ENVIADO"
                    ? "Já enviado para direção"
                    : papStatus === "APROVADO"
                      ? "PAP aprovado (bloqueado)"
                      : "Enviar este PAP para a direção/coordenação"
              }
            >
              ENVIAR PARA DIREÇÃO
            </button>
          </div>
        </section>
      )}


      {/* Modal premium de confirmação de exclusão */}
      {confirmExcluirOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            // clique fora fecha
            setConfirmExcluirOpen(false);
            setConfirmExcluirIndex(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()} // evita fechar ao clicar dentro
          >
            <div className="px-6 py-5 border-b">
              <h4 className="text-xl font-bold text-blue-900">
                Confirmar exclusão
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Você está prestes a excluir este item avaliativo. Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-lg bg-gray-50 border px-4 py-3 text-sm text-gray-700">
                <span className="font-semibold">Item:</span>{" "}
                <span className="font-bold">
                  {confirmExcluirIndex !== null && itens?.[confirmExcluirIndex]
                    ? itens[confirmExcluirIndex]?.atividade
                    : "—"}
                </span>
              </div>
            </div>

            <div className="px-6 py-5 border-t flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmExcluirOpen(false);
                  setConfirmExcluirIndex(null);
                }}
                className="px-5 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmExcluirIndex === null) {
                    setConfirmExcluirOpen(false);
                    return;
                  }

                  setItens((prev) => prev.filter((_, i) => i !== confirmExcluirIndex));
                  setConfirmExcluirOpen(false);
                  setConfirmExcluirIndex(null);

                  showMsg("success", "Item removido. Ajuste a pontuação para fechar 10 pontos.");
                }}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow transition"
              >
                Excluir item
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalAdicionarItemAvaliativo
        open={modalItemOpen}

        onClose={() => {
          setModalItemOpen(false);
          setEditIndex(null);
        }}

        modo={editIndex !== null ? "editar" : "adicionar"}

        atividade={atividade}
        setAtividade={setAtividade}
        dataInicio={dataInicio}
        setDataInicio={setDataInicio}
        dataFinal={dataFinal}
        setDataFinal={setDataFinal}
        notaTotal={notaTotal}
        setNotaTotal={setNotaTotal}
        oportunidades={oportunidades}
        setOportunidades={setOportunidades}
        notaInvertida={notaInvertida}
        setNotaInvertida={setNotaInvertida}
        descricao={descricao}
        setDescricao={setDescricao}

        onSalvar={() => {
          // bloqueios de governança (mock)
          if (papStatus === "ENVIADO")
            return { ok: false, type: "info", text: "PAP enviado: edição bloqueada." };

          if (papStatus === "APROVADO")
            return { ok: false, type: "info", text: "PAP aprovado: edição bloqueada." };

          if (papStatus === "BLOQUEADO_TEMPO")
            return { ok: false, type: "info", text: "Bimestre encerrado: apenas consulta." };

          const nome = (atividade || "").trim();

          const nt = Number(notaTotal);
          const op = Number(oportunidades);
          const ni = Number(notaInvertida);

          if (!nome)
            return { ok: false, type: "warn", text: "Informe o nome da atividade avaliativa." };

          // ✅ evita item com pontuação zero (ou negativa)
          if (Number.isNaN(nt) || nt <= 0)
            return { ok: false, type: "warn", text: "A nota total deve ser maior que 0." };

          if (Number.isNaN(op) || op < 1)
            return { ok: false, type: "warn", text: "Oportunidades deve ser >= 1." };

          // ✅ regra: não estourar 10 pontos (considerando edição)
          const totalAntes = totalPontos(itens);
          const oldNt =
            editIndex !== null && itens?.[editIndex]
              ? Number(itens[editIndex]?.nota_total || 0)
              : 0;

          const novoTotal = editIndex !== null ? totalAntes - oldNt + nt : totalAntes + nt;

          if (novoTotal > PONTOS_TOTAL_PAP) {
            const restante = Number((PONTOS_TOTAL_PAP - (totalAntes - oldNt)).toFixed(2));
            return {
              ok: false,
              type: "error",
              text: `Pontuação excedida. Restam ${restante} ponto(s) disponíveis neste PAP.`,
            };
          }

          const payload = {
            atividade: nome,
            data_inicio: dataInicio || "",
            data_final: dataFinal || "",
            nota_total: nt,
            oportunidades: op,
            nota_invertida: Number.isNaN(ni) ? 0 : ni,
            descricao: (descricao || "").trim(),
          };

          // ✅ EDITAR (update) ou ADICIONAR (append)
          if (editIndex !== null) {
            setItens((prev) =>
              prev.map((it, i) => (i === editIndex ? { ...it, ...payload } : it))
            );

            // encerra modo edição
            setEditIndex(null);

            return { ok: true, type: "success", text: "Item atualizado com sucesso." };
          }

          setItens((prev) => [...prev, payload]);

          return { ok: true, type: "success", text: "Item adicionado com sucesso." };
        }}

      />
    </div>
  );
}
