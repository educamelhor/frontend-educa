import React, { useState, useEffect } from "react";

// Função para normalizar (retirar acentos, minúsculo, tirar espaços/_/-)
function normalize(str = "") {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s_\-]/g, "");
}

// Levenshtein para similaridade de nomes
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export default function GabaritoOficial({ open, onClose, onSave, gabaritosExistentes = [] }) {
  const [nomeGabarito, setNomeGabarito] = useState("");
  const [numQuestoes, setNumQuestoes] = useState("");
  const [numAlternativas, setNumAlternativas] = useState("");
  const [notaTotal, setNotaTotal] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (open) {
      setNomeGabarito("");
      setNumQuestoes("");
      setNumAlternativas("");
      setNotaTotal("");
      setErro("");
    }
  }, [open]);

  function validarESalvar() {
    // Debug robusto:
    console.log("VALIDANDO:", { nomeGabarito, numQuestoes, numAlternativas, notaTotal, gabaritosExistentes });

    if (!String(nomeGabarito).trim()) {
      setErro("O campo Nome do Gabarito é obrigatório.");
      return;
    }
    if (!String(numQuestoes).trim()) {
      setErro("O campo Quantas questões? é obrigatório.");
      return;
    }
    if (!String(numAlternativas).trim()) {
      setErro("O campo Quantas alternativas por questão? é obrigatório.");
      return;
    }
    if (!String(notaTotal).trim()) {
      setErro("O campo Nota total é obrigatório.");
      return;
    }

    const nQuestoes = Number(numQuestoes);
    const nAlternativas = Number(numAlternativas);
    const nNotaTotal = Number(notaTotal.replace(",", "."));

    if (
      isNaN(nQuestoes) ||
      nQuestoes < 1 ||
      nQuestoes > 100
    ) {
      setErro("O número de questões deve ser entre 1 e 100.");
      return;
    }
    if (
      isNaN(nAlternativas) ||
      nAlternativas < 2 ||
      nAlternativas > 6
    ) {
      setErro("O número de alternativas deve ser entre 2 e 6.");
      return;
    }
    if (
      isNaN(nNotaTotal) ||
      nNotaTotal <= 0 ||
      nNotaTotal > 100
    ) {
      setErro("A nota total deve ser maior que zero e menor que 100.");
      return;
    }

    // ---- Validação de duplicidade/semelhança ----
    const nomeNovo = normalize(nomeGabarito);

    for (const nomeExistenteRaw of gabaritosExistentes) {
      const nomeExistente = normalize(nomeExistenteRaw);

      if (nomeNovo === nomeExistente) {
        setErro(`Já existe um gabarito com este nome ("${nomeExistenteRaw}").`);
        return;
      }

      const baseNovo = nomeNovo.replace(/\d+$/, "");
      const baseExistente = nomeExistente.replace(/\d+$/, "");
      const regexNumeroFinal = /\d+$/;

      if (baseNovo === baseExistente && regexNumeroFinal.test(nomeNovo)) {
        const numeroNovo = nomeNovo.match(/\d+$/)?.[0];
        const numeroExistente = nomeExistente.match(/\d+$/)?.[0];

        if (numeroNovo && numeroNovo === numeroExistente) {
          setErro(`Já existe um gabarito semelhante com o número ${numeroNovo}. Altere o número para evitar duplicidade.`);
          return;
        }
        const confirmar = window.confirm(
          `Já existe o gabarito "${nomeExistenteRaw}".\nDeseja realmente criar "${nomeGabarito}" como variação numerada?`
        );
        if (!confirmar) {
          return;
        }
        continue;
      }

      const distancia = levenshtein(nomeNovo, nomeExistente);
      if (distancia > 0 && distancia <= 2) {
        setErro(`Nome muito semelhante ao já existente: "${nomeExistenteRaw}". Corrija o nome antes de salvar.`);
        return;
      }
    }

    // Tudo OK!
    setErro("");
    onSave(nomeGabarito.trim(), nQuestoes, nAlternativas, nNotaTotal);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-xs flex flex-col gap-4">
        <h2 className="text-lg font-bold mb-2 text-center">Configurar Gabarito Oficial</h2>
        <div>
          <label className="block mb-1 text-sm font-semibold">Nome do Gabarito</label>
          <input
            type="text"
            className={`w-full border rounded px-3 py-2 outline-blue-400 ${erro.includes("Nome do Gabarito") || erro.includes("gabarito") || erro.includes("nome") ? "border-red-500" : ""}`}
            value={nomeGabarito}
            onChange={e => {
              setNomeGabarito(e.target.value.slice(0, 50));
              setErro("");
            }}
            maxLength={50}
            placeholder="Ex: Simulado Matemática 1"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-semibold">Quantas questões?</label>
          <input
            type="number"
            className={`w-full border rounded px-3 py-2 outline-blue-400 ${erro.includes("Quantas questões") ? "border-red-500" : ""}`}
            value={numQuestoes}
            min={1}
            max={100}
            onChange={e => {
              setNumQuestoes(e.target.value.replace(/\D/, ""));
              setErro("");
            }}
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-semibold">Quantas alternativas por questão?</label>
          <input
            type="number"
            className={`w-full border rounded px-3 py-2 outline-blue-400 ${erro.includes("alternativas") ? "border-red-500" : ""}`}
            value={numAlternativas}
            min={2}
            max={6}
            onChange={e => {
              setNumAlternativas(e.target.value.replace(/\D/, ""));
              setErro("");
            }}
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-semibold">Qual a nota total?</label>
          <input
            type="number"
            className={`w-full border rounded px-3 py-2 outline-blue-400 ${erro.includes("nota total") ? "border-red-500" : ""}`}
            value={notaTotal}
            min={0.1}
            max={1000}
            step="any"
            onChange={e => {
              setNotaTotal(e.target.value.replace(",", "."));
              setErro("");
            }}
            placeholder="Ex: 10, 100, 7.5"
            required
          />
        </div>

        {erro && (
          <div className="bg-red-100 border border-red-300 text-red-800 px-2 py-1 rounded text-center text-sm mb-2">
            {erro}
          </div>
        )}

        <div className="flex gap-4 justify-between mt-3">
          <button
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold"
            onClick={validarESalvar}
            type="button"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
