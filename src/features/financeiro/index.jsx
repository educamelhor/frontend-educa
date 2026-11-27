// src/features/financeiro/index.jsx
// ============================================================================
// EDUCA.MELHOR — Módulo Financeiro (Hub Inteligente por Natureza Institucional)
// Isolamento estrito governado pelo pré-cadastro e modulação do CEO:
//   • Escola Pública    (escola_origem === 'publica')    -> PDAF e PDDE
//   • Escola Particular (escola_origem === 'particular') -> Mensalidades, Boletos/PIX, Contratos, Inadimplência e Caixa/DRE
// ============================================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  ArrowRightIcon,
  DocumentCheckIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  ChartBarSquareIcon,
} from "@heroicons/react/24/outline";

const SUBMODULOS_PARTICULAR = [
  {
    modulo: "financeiro.mensalidades",
    titulo: "Mensalidades & Planos",
    subtitulo: "PLANOS ESCOLARES • DESCONTOS • BOLSAS",
    descricao:
      "Estruturação de tabelas de anuidade, parcelas mensais por etapa de ensino, descontos de pontualidade e irmãos.",
    selo: "REDE PARTICULAR",
    Icon: BanknotesIcon,
    corTopo: "from-emerald-600 via-teal-600 to-cyan-500",
    corIcone: "bg-emerald-50 border-emerald-200 text-emerald-700",
    corSelo: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    modulo: "financeiro.boletos_pix",
    titulo: "Boletos & PIX",
    subtitulo: "FATURAMENTO • 2ª VIA • BAIXA AUTOMÁTICA",
    descricao:
      "Emissão de cobranças registradas, QR Code PIX copia-e-cola e conciliação automática com o aplicativo dos responsáveis.",
    selo: "COBRANÇA BANCÁRIA",
    Icon: QrCodeIcon,
    corTopo: "from-blue-600 via-indigo-600 to-sky-500",
    corIcone: "bg-blue-50 border-blue-200 text-blue-700",
    corSelo: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    modulo: "financeiro.contratos",
    titulo: "Contratos Financeiros",
    subtitulo: "MATRÍCULAS • REMATRÍCULAS • RESPONSÁVEL FINANCEIRO",
    descricao:
      "Vínculo contratual entre estudante, responsável financeiro (CPF) e plano de pagamento vigente no ano letivo.",
    selo: "CONTRATOS",
    Icon: DocumentCheckIcon,
    corTopo: "from-violet-600 via-purple-600 to-indigo-500",
    corIcone: "bg-violet-50 border-violet-200 text-violet-700",
    corSelo: "bg-violet-50 text-violet-800 border-violet-200",
  },
  {
    modulo: "financeiro.inadimplencia",
    titulo: "Gestão de Inadimplência",
    subtitulo: "RÉGUA DE COBRANÇA • ACORDOS • RENEGOCIAÇÃO",
    descricao:
      "Acompanhamento de títulos em atraso por turma e responsável, lembretes preventivos e simulação de acordos.",
    selo: "RECEBÍVEIS",
    Icon: ExclamationTriangleIcon,
    corTopo: "from-amber-500 via-orange-500 to-amber-600",
    corIcone: "bg-amber-50 border-amber-200 text-amber-700",
    corSelo: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    modulo: "financeiro.caixa_dre",
    titulo: "Fluxo de Caixa & DRE",
    subtitulo: "RECEITAS • DESPESAS • RESULTADO OPERACIONAL",
    descricao:
      "Visão executiva de entradas realizadas, contas a pagar da instituição e Demonstração do Resultado do Exercício.",
    selo: "EXECUTIVO",
    Icon: ChartBarSquareIcon,
    corTopo: "from-slate-700 via-slate-800 to-slate-900",
    corIcone: "bg-slate-100 border-slate-300 text-slate-700",
    corSelo: "bg-slate-100 text-slate-800 border-slate-300",
  },
];

function lerContextoFinanceiro() {
  const origem = String(localStorage.getItem("escola_origem") || "publica")
    .toLowerCase()
    .trim();
  let modulos = null;
  try {
    const raw = localStorage.getItem("modulos_ativos");
    if (raw && raw !== "null") {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) modulos = parsed;
    }
  } catch {
    modulos = null;
  }
  return { origem: origem === "particular" ? "particular" : "publica", modulos };
}

export default function FinanceiroModule() {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState(lerContextoFinanceiro);

  useEffect(() => {
    const sync = () => setCtx(lerContextoFinanceiro());
    window.addEventListener("storage", sync);
    window.addEventListener("escola_origem_updated", sync);
    sync();
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("escola_origem_updated", sync);
    };
  }, []);

  const isParticular = ctx.origem === "particular";
  const modulos = ctx.modulos;

  // Para escola pública: se modulos === null (irrestrito) ou se tinha 'financeiro' legado sem filhos, mostra PDAF e PDDE
  const temFilhosPublicosExplicitos =
    Array.isArray(modulos) &&
    (modulos.includes("financeiro.pdaf") || modulos.includes("financeiro.pdde"));

  const podePdaf =
    !isParticular &&
    (modulos === null ||
      modulos.includes("financeiro.pdaf") ||
      (!temFilhosPublicosExplicitos && modulos.includes("financeiro")));

  const podePdde =
    !isParticular &&
    (modulos === null ||
      modulos.includes("financeiro.pdde") ||
      (!temFilhosPublicosExplicitos && modulos.includes("financeiro")));

  const cardsParticularesVisiveis = SUBMODULOS_PARTICULAR.filter(
    (item) => modulos === null || (Array.isArray(modulos) && modulos.includes(item.modulo))
  );

  if (isParticular) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5 shadow-sm flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
              <BanknotesIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Instituição Particular • Módulo Financeiro Comercial
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Gestão Financeira Escolar
              </h1>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            Rede Particular
          </span>
        </div>

        {cardsParticularesVisiveis.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
            Nenhum submódulo financeiro particular está habilitado para o seu perfil nesta instituição.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {cardsParticularesVisiveis.map((card) => {
              const IconComp = card.Icon;
              return (
                <div
                  key={card.modulo}
                  className="group relative bg-white rounded-3xl border-2 border-slate-200 hover:border-amber-400 p-7 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden"
                >
                  <div className={`absolute top-0 inset-x-0 h-2 bg-gradient-to-r ${card.corTopo}`} />
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${card.corIcone}`}>
                        <IconComp className="w-7 h-7" />
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${card.corSelo}`}>
                        {card.selo}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-5">
                      {card.titulo}
                    </h2>
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mt-1">
                      {card.subtitulo}
                    </p>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                      {card.descricao}
                    </p>
                  </div>

                  <div className="mt-7 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      ✓ Licenciado pelo CEO
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Trilho Rede Particular
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho Institucional — Rede Pública */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shrink-0">
          <BanknotesIcon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Gestão Escolar Pública / Módulo Financeiro
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Programas de Execução Financeira
          </h1>
        </div>
      </div>

      {/* Seleção dos Programas Habilitados pelo CEO */}
      <div className="space-y-4">
        <p className="text-sm text-slate-600 px-1">
          Selecione abaixo o programa financeiro que deseja gerenciar:
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {podePdaf && (
            <div
              onClick={() => navigate("/financeiro/pdaf")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/financeiro/pdaf");
                }
              }}
              className="group relative bg-white rounded-3xl border-2 border-slate-200 hover:border-blue-500 p-7 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500" />

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center group-hover:scale-105 transition">
                    <BuildingLibraryIcon className="w-8 h-8" />
                  </div>

                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                    GDF • SEEDF
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-6 group-hover:text-blue-700 transition">
                  PDAF
                </h2>
                <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-blue-700 mt-1 leading-snug">
                  PDAF - PROGRAMA DE DESCENTRALIZAÇÃO ADMINISTRATIVA E FINANCEIRA
                </p>

                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  Gestão e acompanhamento dos recursos distritais descentralizados para custeio e capital da unidade escolar.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Recursos Distritais
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-sm group-hover:bg-blue-700 transition">
                  Acessar PDAF <ArrowRightIcon className="w-4 h-4" />
                </span>
              </div>
            </div>
          )}

          {podePdde && (
            <div
              onClick={() => navigate("/financeiro/pdde")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/financeiro/pdde");
                }
              }}
              className="group relative bg-white rounded-3xl border-2 border-slate-200 hover:border-emerald-500 p-7 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-500" />

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
                    <BanknotesIcon className="w-8 h-8" />
                  </div>

                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                    MEC • FNDE
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-6 group-hover:text-emerald-700 transition">
                  PDDE
                </h2>
                <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-emerald-700 mt-1 leading-snug">
                  PDDE - PROGRAMA DINHEIRO DIRETO NA ESCOLA
                </p>

                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  Gestão e acompanhamento dos recursos federais transferidos pelo FNDE para custeio e capital da unidade escolar.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Recursos Federais
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-sm group-hover:bg-emerald-700 transition">
                  Acessar PDDE <ArrowRightIcon className="w-4 h-4" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
