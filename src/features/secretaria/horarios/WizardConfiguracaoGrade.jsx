// src/features/secretaria/horarios/WizardConfiguracaoGrade.jsx
import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const TURNOS_CONFIG = [
  { id: "matutino",   label: "Matutino",   emoji: "☀️",  desc: "Manhã",  periodos_default: 5 },
  { id: "vespertino", label: "Vespertino", emoji: "🌤️", desc: "Tarde",  periodos_default: 5 },
  { id: "noturno",    label: "Noturno",    emoji: "🌙",  desc: "Noite", periodos_default: 4 },
];

const DIAS_SEMANA = [
  { num: 1, label: "Seg", nome: "Segunda" },
  { num: 2, label: "Ter", nome: "Terça"   },
  { num: 3, label: "Qua", nome: "Quarta"  },
  { num: 4, label: "Qui", nome: "Quinta"  },
  { num: 5, label: "Sex", nome: "Sexta"   },
  { num: 6, label: "Sáb", nome: "Sábado"  },
];

const S = {
  outer: {
    flex: 1,
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "20px 16px",
    fontFamily: "'Montserrat', sans-serif",
    minHeight: "100vh"
  },
  card: {
    width: "100%", maxWidth: 780,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20, padding: "28px 32px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.5)",
    color: "#f1f5f9",
  },
};

function Pill({ children, color = "#3b82f6" }) {
  return (
    <span style={{
      background: color + "30", border: `1px solid ${color}`,
      borderRadius: 8, padding: "4px 12px", fontSize: 13,
      color, fontWeight: 600, display: "inline-block",
    }}>{children}</span>
  );
}

function ResumoCard({ icon, titulo, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, padding: "12px 16px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          {titulo}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function gerarParesGovernancaPadrao(maxPeriodos = 6, recreioApos = 3, bloquearRecreio = true, existentes = []) {
  const totalP = Math.max(2, Number(maxPeriodos) || 6);
  const rec = Number(recreioApos) || 3;

  const defaultStarts = [];
  if (totalP >= 2) defaultStarts.push(1);
  if (rec > 0 && rec + 1 < totalP && !defaultStarts.includes(rec + 1)) {
    defaultStarts.push(rec + 1);
  }
  for (let p = 1; p < totalP; p++) {
    if (p === rec) continue;
    if (!defaultStarts.includes(p)) defaultStarts.push(p);
  }
  if (rec > 0 && rec < totalP && !defaultStarts.includes(rec)) {
    defaultStarts.push(rec);
  }

  const mapExistentes = new Map();
  const ordered = [];

  if (Array.isArray(existentes)) {
    for (const it of existentes) {
      const ini = Number(it?.inicio ?? it?.p1 ?? 0);
      if (ini >= 1 && ini < totalP && !mapExistentes.has(ini)) {
        let modo = String(it?.modo || "prioritario").toLowerCase();
        if (!["obrigatorio", "prioritario", "permitido", "bloqueado"].includes(modo)) {
          modo = "prioritario";
        }
        if (bloquearRecreio && rec > 0 && ini === rec) {
          modo = "bloqueado";
        }
        const obj = {
          inicio: ini,
          fim: ini + 1,
          modo,
          bloqueado_por_recreio: Boolean(rec > 0 && ini === rec && modo === "bloqueado"),
        };
        mapExistentes.set(ini, obj);
        ordered.push(obj);
      }
    }
  }

  for (const ini of defaultStarts) {
    if (!mapExistentes.has(ini)) {
      const cortaRecreio = rec > 0 && ini === rec;
      const modo = cortaRecreio && bloquearRecreio
        ? "bloqueado"
        : ordered.length < 2
        ? "prioritario"
        : "permitido";
      const obj = {
        inicio: ini,
        fim: ini + 1,
        modo,
        bloqueado_por_recreio: Boolean(cortaRecreio && modo === "bloqueado"),
      };
      mapExistentes.set(ini, obj);
      ordered.push(obj);
    }
  }

  return ordered;
}

export default function WizardConfiguracaoGrade({ onConcluir, configInicial }) {
  const [passo, setPasso]       = useState(1);
  const [turnos, setTurnos]     = useState(configInicial?.turnos || ["matutino", "vespertino"]);
  const [dias, setDias]         = useState(configInicial?.dias_semana || [1, 2, 3, 4, 5]);
  const [periodos, setPeriodos] = useState(configInicial?.periodos || { matutino: 5, vespertino: 5, noturno: 4 });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState([]);
  
  // Regras Gerais
  const rg = configInicial?.regras_gerais || {};
  const initTurnos = configInicial?.turnos || ["matutino", "vespertino"];
  const initPeriodos = configInicial?.periodos || { matutino: 5, vespertino: 5, noturno: 4 };
  const initMaxPeriodos = Math.max(4, ...initTurnos.map(t => Number(initPeriodos[t]) || 6));
  const govIntervalos = configInicial?.intervalos_por_turno || {};
  const initRecreioMap = rg.recreio_apos_periodo || {
    matutino: govIntervalos?.matutino?.apos_periodo ?? 3,
    vespertino: govIntervalos?.vespertino?.apos_periodo ?? 3,
    noturno: govIntervalos?.noturno?.apos_periodo ?? ((Number(initPeriodos.noturno) || 4) >= 5 ? 3 : 2),
  };
  const initRecreioRef = Number(initRecreioMap[initTurnos[0]] ?? initRecreioMap.matutino ?? 3);

  // Nota: Se havia par bloqueado no recreio ou bloquear_duplas_no_recreio explícito, respeita;
  // por padrão ativamos o bloqueio de duplas cortadas pelo recreio (true).
  const initBloquearRecreio =
    rg.bloquear_duplas_no_recreio !== undefined
      ? Boolean(rg.bloquear_duplas_no_recreio)
      : rg.aulas_duplas_separar_recreio !== undefined
      ? !rg.aulas_duplas_separar_recreio
      : true;

  const [regrasGerais, setRegrasGerais] = useState({
    preferencia_aulas_duplas: rg.preferencia_aulas_duplas !== undefined ? rg.preferencia_aulas_duplas : true,
    proibir_aulas_separadas_mesmo_dia: rg.proibir_aulas_separadas_mesmo_dia !== undefined ? rg.proibir_aulas_separadas_mesmo_dia : true,
    bloquear_duplas_no_recreio: initBloquearRecreio,
    aulas_duplas_separar_recreio: !initBloquearRecreio,
    max_aulas_mesmo_dia: rg.max_aulas_mesmo_dia || 2,
    recreio_apos_periodo: initRecreioMap,
    pares_duplas_governanca: gerarParesGovernancaPadrao(
      initMaxPeriodos,
      initRecreioRef,
      initBloquearRecreio,
      rg.pares_duplas_governanca
    ),
    disciplinas_excludentes: rg.disciplinas_excludentes || [],
    blocos_simultaneos: Array.isArray(rg.blocos_simultaneos) ? rg.blocos_simultaneos : [],
    recursos_fisicos: Array.isArray(rg.recursos_fisicos) ? rg.recursos_fisicos : [],
    interturno_regras: {
      ativo: rg.interturno_regras?.ativo !== false,
      interjornada_min_horas:
        rg.interturno_regras?.interjornada_min_horas !== undefined
          ? Number(rg.interturno_regras.interjornada_min_horas)
          : 11,
      interjornada_modo: rg.interturno_regras?.interjornada_modo === "soft" ? "soft" : "hard",
      transicao_turno_min_minutos:
        rg.interturno_regras?.transicao_turno_min_minutos !== undefined
          ? Number(rg.interturno_regras.transicao_turno_min_minutos)
          : 30,
      transicao_turno_modo: rg.interturno_regras?.transicao_turno_modo === "hard" ? "hard" : "soft",
      max_aulas_dia_cpf:
        rg.interturno_regras?.max_aulas_dia_cpf !== undefined
          ? Number(rg.interturno_regras.max_aulas_dia_cpf)
          : 12,
      max_aulas_dia_modo: rg.interturno_regras?.max_aulas_dia_modo === "soft" ? "soft" : "hard",
    },
  });

  const [selDisc1, setSelDisc1] = useState("");
  const [selDisc2, setSelDisc2] = useState("");
  const [turmasDisponiveis, setTurmasDisponiveis] = useState([]);
  const [agrupamentosAtivosCount, setAgrupamentosAtivosCount] = useState(0);
  const [feedbackEtapa3, setFeedbackEtapa3] = useState("");

  // Estado do criador de Bloco Simultâneo (Passo 7)
  const [novoBlocoNome, setNovoBlocoNome] = useState("");
  const [novoBlocoTurno, setNovoBlocoTurno] = useState(initTurnos[0] || "matutino");
  const [novoBlocoTurmaIds, setNovoBlocoTurmaIds] = useState([]);
  const [novoBlocoDiscIds, setNovoBlocoDiscIds] = useState([]);
  const [novoBlocoMesmoProf, setNovoBlocoMesmoProf] = useState(true);

  // Estado do criador de Sala / Recurso Físico (Passo 8)
  const [novaSalaIcone, setNovaSalaIcone] = useState("🏛️");
  const [novaSalaNome, setNovaSalaNome] = useState("");
  const [novaSalaCap, setNovaSalaCap] = useState(1);
  const [novaSalaModo, setNovaSalaModo] = useState("hard");
  const [novaSalaDiscIds, setNovaSalaDiscIds] = useState([]);

  useEffect(() => {
    const hoje = new Date();
    const anoRef = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();

    api.get("/api/disciplinas").then(res => {
      setDisciplinasDisponiveis(Array.isArray(res.data) ? res.data : (res.data?.disciplinas || []));
    }).catch(err => console.error("Erro ao carregar disciplinas:", err));

    api.get("/api/turmas", { params: { ano: anoRef } }).then(res => {
      const lista = Array.isArray(res.data) ? res.data : (res.data?.turmas || []);
      setTurmasDisponiveis(lista);
    }).catch(() => {});

    api.get("/api/agrupamentos").then(res => {
      const ags = Array.isArray(res.data) ? res.data : (res.data?.agrupamentos || []);
      const validos = ags.filter(a => a && a.ativo !== false && Array.isArray(a.turmas_ids || a.turmas) && (a.turmas_ids || a.turmas).length >= 2);
      setAgrupamentosAtivosCount(validos.length);
    }).catch(() => {});
  }, []);

  const maxPeriodosAtivos = Math.max(4, ...turnos.map(t => Number(periodos[t]) || 6));
  const turnoPrincipal = turnos[0] || "matutino";
  const recreioPrincipal = Number(regrasGerais.recreio_apos_periodo?.[turnoPrincipal] ?? 3);

  // Sincroniza a lista de pares caso o número máximo de períodos mude no Passo 3 ou o recreio mude no Passo 5
  useEffect(() => {
    setRegrasGerais(prev => ({
      ...prev,
      pares_duplas_governanca: gerarParesGovernancaPadrao(
        maxPeriodosAtivos,
        recreioPrincipal,
        prev.bloquear_duplas_no_recreio !== false,
        prev.pares_duplas_governanca
      ),
    }));
  }, [maxPeriodosAtivos, recreioPrincipal]);

  const toggleBloqueioRecreio = (bloquear) => {
    setRegrasGerais(prev => {
      const rec = Number(prev.recreio_apos_periodo?.[turnoPrincipal] ?? 3);
      const novaLista = (prev.pares_duplas_governanca || []).map(p => {
        if (rec > 0 && p.inicio === rec) {
          return { ...p, modo: bloquear ? "bloqueado" : (p.modo === "bloqueado" ? "permitido" : p.modo) };
        }
        return p;
      });
      return {
        ...prev,
        bloquear_duplas_no_recreio: bloquear,
        aulas_duplas_separar_recreio: !bloquear,
        pares_duplas_governanca: novaLista,
      };
    });
  };

  const moverParPrioridade = (idx, direcao) => {
    setRegrasGerais(prev => {
      const lista = [...(prev.pares_duplas_governanca || [])];
      const novoIdx = idx + direcao;
      if (novoIdx < 0 || novoIdx >= lista.length) return prev;
      const temp = lista[idx];
      lista[idx] = lista[novoIdx];
      lista[novoIdx] = temp;
      return { ...prev, pares_duplas_governanca: lista };
    });
  };

  const alterarModoPar = (inicio, novoModo) => {
    setRegrasGerais(prev => {
      const rec = Number(prev.recreio_apos_periodo?.[turnoPrincipal] ?? 3);
      const lista = (prev.pares_duplas_governanca || []).map(p =>
        p.inicio === inicio ? { ...p, modo: novoModo } : p
      );
      const cortaRecreio = rec > 0 && inicio === rec;
      const novoBloquearRecreio = cortaRecreio
        ? novoModo === "bloqueado"
        : prev.bloquear_duplas_no_recreio;
      return {
        ...prev,
        bloquear_duplas_no_recreio: novoBloquearRecreio,
        aulas_duplas_separar_recreio: !novoBloquearRecreio,
        pares_duplas_governanca: lista,
      };
    });
  };

  const aplicarPresetPares = (preset) => {
    setRegrasGerais(prev => {
      const rec = Number(prev.recreio_apos_periodo?.[turnoPrincipal] ?? 3);
      const base = gerarParesGovernancaPadrao(maxPeriodosAtivos, rec, true, []);
      const ajustada = base.map(p => {
        if (rec > 0 && p.inicio === rec) return { ...p, modo: "bloqueado" };
        if (preset === "obrigatorio_1_2") {
          if (p.inicio === 1) return { ...p, modo: "obrigatorio" };
          if (p.inicio === rec + 1) return { ...p, modo: "prioritario" };
          return { ...p, modo: "permitido" };
        }
        if (preset === "obrigatorio_1_2_e_pos_recreio") {
          if (p.inicio === 1 || p.inicio === rec + 1) return { ...p, modo: "obrigatorio" };
          return { ...p, modo: "permitido" };
        }
        return p;
      });
      return {
        ...prev,
        bloquear_duplas_no_recreio: true,
        aulas_duplas_separar_recreio: false,
        pares_duplas_governanca: ajustada,
      };
    });
  };

  const toggleTurno = (id) =>
    setTurnos(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const toggleDia = (num) =>
    setDias(prev =>
      prev.includes(num) ? prev.filter(d => d !== num) : [...prev, num].sort((a, b) => a - b)
    );

  const setPeriodoTurno = (turnoId, n) =>
    setPeriodos(prev => ({ ...prev, [turnoId]: n }));

  const setRecreioTurno = (turnoId, n) =>
    setRegrasGerais(prev => ({ ...prev, recreio_apos_periodo: { ...prev.recreio_apos_periodo, [turnoId]: n } }));

  const addExcludente = () => {
    if (selDisc1 && selDisc2 && selDisc1 !== selDisc2) {
      // Ordenar os IDs para evitar duplicação invertida
      const par = [selDisc1, selDisc2].sort();
      const jahExiste = regrasGerais.disciplinas_excludentes.some(p => p[0] === par[0] && p[1] === par[1]);
      if (!jahExiste) {
        setRegrasGerais(prev => ({ ...prev, disciplinas_excludentes: [...prev.disciplinas_excludentes, par] }));
      }
      setSelDisc1(""); setSelDisc2("");
    }
  };

  const removeExcludente = (idx) => {
    setRegrasGerais(prev => ({
      ...prev,
      disciplinas_excludentes: prev.disciplinas_excludentes.filter((_, i) => i !== idx)
    }));
  };

  const getDiscNome = (idStr) => {
    const idNum = parseInt(idStr, 10);
    const d = disciplinasDisponiveis.find(x => x.id === idNum || String(x.id) === String(idStr));
    return d ? (d.nome || d.descricao || String(idStr)) : String(idStr);
  };

  const getTurmaNome = (idVal) => {
    const idNum = Number(idVal);
    const t = turmasDisponiveis.find(x => Number(x.id ?? x.turma_id) === idNum);
    return t ? String(t.nome || t.turma || t.sigla || `Turma ${idNum}`) : `Turma ${idVal}`;
  };

  const normAscii = (str) =>
    String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

  // Auto-detector 1-clique de IFAs / Eletivas / Trilhas por Turno + Série
  const autoDetectarBlocosIfa = () => {
    const regexIfa = /(IFA|ELETIV|ITINER|TRILHA|PROJETO DE VIDA|SEGREDO|APROFUND|OFICINA)/i;
    const discsIfa = disciplinasDisponiveis.filter(d => regexIfa.test(normAscii(d.nome || d.descricao)));
    if (discsIfa.length === 0) {
      setFeedbackEtapa3("ℹ️ Nenhuma disciplina com nomenclatura IFA / Eletiva / Trilha encontrada. Você pode criar blocos manualmente abaixo.");
      setTimeout(() => setFeedbackEtapa3(""), 5000);
      return;
    }

    const grupos = new Map();
    for (const t of turmasDisponiveis) {
      const tId = Number(t.id ?? t.turma_id);
      const tNome = String(t.nome || t.turma || "");
      const tTurno = String(t.turno || "").trim().toLowerCase();
      if (!tId || !tTurno || !turnos.includes(tTurno)) continue;
      const matchSerie = normAscii(tNome).match(/\b([1236789])\s*(?:O|º|ª)?\s*(ANO|SERIE)\b/) || normAscii(tNome).match(/\b([123])\b/);
      const serieKey = matchSerie ? matchSerie[1] : "GERAL";
      // Apenas Ensino Médio (1º, 2º, 3º) por padrão para IFA, exceto se só houver outras séries
      if (!["1", "2", "3"].includes(serieKey)) continue;
      const gKey = `${tTurno}|${serieKey}`;
      if (!grupos.has(gKey)) grupos.set(gKey, { turno: tTurno, serie: serieKey, turmaIds: [] });
      grupos.get(gKey).turmaIds.push(tId);
    }

    const novosBlocos = [];
    const discIdsIfa = discsIfa.map(d => Number(d.id)).filter(Boolean);
    for (const [, g] of grupos.entries()) {
      if (g.turmaIds.length < 2) continue;
      const bId = `auto_ifa_${g.turno}_${g.serie}serie`;
      novosBlocos.push({
        id: bId,
        nome: `IFA / Eletivas — ${g.serie}ª Série (${g.turno})`,
        turno: g.turno,
        turma_ids: g.turmaIds,
        disciplina_ids: discIdsIfa,
        permitir_mesmo_prof_simultaneo: true,
        modo: "hard",
        ativo: true,
      });
    }

    if (novosBlocos.length === 0) {
      setFeedbackEtapa3("ℹ️ Não há 2+ turmas da mesma série de Ensino Médio nos turnos ativos para agrupar automaticamente.");
      setTimeout(() => setFeedbackEtapa3(""), 5000);
      return;
    }

    setRegrasGerais(prev => {
      const existentes = Array.isArray(prev.blocos_simultaneos) ? prev.blocos_simultaneos : [];
      const idsExistentes = new Set(existentes.map(b => b.id));
      const mesclados = [...existentes, ...novosBlocos.filter(b => !idsExistentes.has(b.id))];
      return { ...prev, blocos_simultaneos: mesclados };
    });
    setFeedbackEtapa3(`✨ ${novosBlocos.length} bloco(s) simultâneo(s) de IFA detectado(s) com ${discIdsIfa.length} disciplina(s)!`);
    setTimeout(() => setFeedbackEtapa3(""), 5000);
  };

  const adicionarBlocoSimultaneoManual = () => {
    if (novoBlocoTurmaIds.length < 2 || novoBlocoDiscIds.length < 1) return;
    const nomeLimpo =
      String(novoBlocoNome || "").trim() ||
      `Super-Aula (${novoBlocoTurmaIds.length} turmas • ${novoBlocoTurno})`;
    const novo = {
      id: `bloco_${Date.now()}`,
      nome: nomeLimpo,
      turno: novoBlocoTurno,
      turma_ids: [...novoBlocoTurmaIds],
      disciplina_ids: [...novoBlocoDiscIds],
      permitir_mesmo_prof_simultaneo: Boolean(novoBlocoMesmoProf),
      modo: "hard",
      ativo: true,
    };
    setRegrasGerais(prev => ({
      ...prev,
      blocos_simultaneos: [...(prev.blocos_simultaneos || []), novo],
    }));
    setNovoBlocoNome("");
    setNovoBlocoTurmaIds([]);
    setNovoBlocoDiscIds([]);
  };

  const removerBlocoSimultaneo = (id) => {
    setRegrasGerais(prev => ({
      ...prev,
      blocos_simultaneos: (prev.blocos_simultaneos || []).filter(b => b.id !== id),
    }));
  };

  const toggleMesmoProfBloco = (id) => {
    setRegrasGerais(prev => ({
      ...prev,
      blocos_simultaneos: (prev.blocos_simultaneos || []).map(b =>
        b.id === id ? { ...b, permitir_mesmo_prof_simultaneo: !b.permitir_mesmo_prof_simultaneo } : b
      ),
    }));
  };

  const adicionarPresetRecursoFisico = (tipo) => {
    const presets = {
      quadra: {
        id: "preset_quadra",
        icone: "🏀",
        nome: "Quadra Poliesportiva",
        regex: /(EDUCACAO FISICA|ED\.?\s*FISICA|ESPORTE)/i,
      },
      lab_ciencias: {
        id: "preset_lab_ciencias",
        icone: "🔬",
        nome: "Lab. Ciências / Química / Física / Biologia",
        regex: /(CIENCIA|QUIMICA|FISICA|BIOLOGIA|LABORATORIO)/i,
      },
      lab_info: {
        id: "preset_lab_info",
        icone: "💻",
        nome: "Laboratório de Informática",
        regex: /(INFORMATICA|COMPUTACAO|ROBOTICA|TECNOLOGIA)/i,
      },
      sala_artes: {
        id: "preset_sala_artes",
        icone: "🎭",
        nome: "Sala de Artes / Auditório",
        regex: /(ARTE|MUSICA|TEATRO|DANCA)/i,
      },
    };
    const cfg = presets[tipo];
    if (!cfg) return;

    const matchedIds = disciplinasDisponiveis
      .filter(d => {
        const nm = normAscii(d.nome || d.descricao);
        if (tipo === "lab_ciencias" && /EDUCACAO FISICA|ED\.?\s*FISICA/.test(nm)) return false;
        return cfg.regex.test(nm);
      })
      .map(d => Number(d.id))
      .filter(Boolean);

    if (matchedIds.length === 0) {
      setNovaSalaIcone(cfg.icone);
      setNovaSalaNome(cfg.nome);
      setFeedbackEtapa3(`ℹ️ Selecione abaixo qual disciplina utiliza "${cfg.nome}" e clique em + Adicionar.`);
      setTimeout(() => setFeedbackEtapa3(""), 4500);
      return;
    }

    setRegrasGerais(prev => {
      const lista = Array.isArray(prev.recursos_fisicos) ? prev.recursos_fisicos : [];
      if (lista.some(r => r.id === cfg.id || normAscii(r.nome) === normAscii(cfg.nome))) {
        return prev;
      }
      return {
        ...prev,
        recursos_fisicos: [
          ...lista,
          {
            id: `${cfg.id}_${Date.now()}`,
            icone: cfg.icone,
            nome: cfg.nome,
            capacidade: 1,
            disciplina_ids: matchedIds,
            modo: "hard",
            ativo: true,
          },
        ],
      };
    });
  };

  const adicionarSalaManual = () => {
    if (!String(novaSalaNome || "").trim() || novaSalaDiscIds.length === 0) return;
    const novo = {
      id: `rec_${Date.now()}`,
      icone: novaSalaIcone || "🏛️",
      nome: String(novaSalaNome).trim(),
      capacidade: Math.max(1, Number(novaSalaCap) || 1),
      disciplina_ids: [...novaSalaDiscIds],
      modo: novaSalaModo === "soft" ? "soft" : "hard",
      ativo: true,
    };
    setRegrasGerais(prev => ({
      ...prev,
      recursos_fisicos: [...(prev.recursos_fisicos || []), novo],
    }));
    setNovaSalaNome("");
    setNovaSalaDiscIds([]);
    setNovaSalaCap(1);
  };

  const atualizarRecursoFisico = (id, patch) => {
    setRegrasGerais(prev => ({
      ...prev,
      recursos_fisicos: (prev.recursos_fisicos || []).map(r => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removerRecursoFisico = (id) => {
    setRegrasGerais(prev => ({
      ...prev,
      recursos_fisicos: (prev.recursos_fisicos || []).filter(r => r.id !== id),
    }));
  };

  const podeAvancar =
    (passo === 1 && turnos.length > 0) ||
    (passo === 2 && dias.length > 0)   ||
    (passo === 3 && turnos.every(t => (periodos[t] || 0) > 0)) ||
    passo >= 4;

  async function confirmar() {
    setSalvando(true); setErro("");
    try {
      const periodosAtivos = {};
      turnos.forEach(t => { periodosAtivos[t] = periodos[t] || 5; });
      const payloadRegras = {
        ...regrasGerais,
        aulas_duplas_separar_recreio: !regrasGerais.bloquear_duplas_no_recreio,
      };
      await api.post("/api/escola/configuracao-grade", {
        turnos, dias_semana: dias, periodos: periodosAtivos, regras_gerais: payloadRegras
      });
      onConcluir({ turnos, dias_semana: dias, periodos: periodosAtivos, regras_gerais: payloadRegras });
    } catch {
      setErro("Erro ao salvar. Verifique sua conexão e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const passoLabels = [
    "Turnos",
    "Dias",
    "Períodos",
    "Regras",
    "Recreio",
    "Conflitos",
    "Super-Aulas",
    "CPF & Salas",
    "Revisão",
  ];

  return (
    <div style={S.outer}>
      <div style={S.card}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>⚙️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
            Configuração da Grade Horária
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
            Configure regras globais, Super-Aulas (IFA), Interjornada por CPF e Salas Especiais.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 26, flexWrap: "wrap", rowGap: 8 }}>
          {passoLabels.map((label, idx) => {
            const num = idx + 1;
            const ativo = num === passo;
            const concluido = num < passo;
            return (
              <React.Fragment key={num}>
                <div
                  onClick={() => turnos.length > 0 && dias.length > 0 && setPasso(num)}
                  title={`Ir direto para ${num}. ${label}`}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: concluido ? "#10b981" : ativo ? "#3b82f6" : "rgba(255,255,255,0.08)",
                    border: ativo ? "2px solid #60a5fa" : "2px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: "#fff",
                    boxShadow: ativo ? "0 0 12px rgba(59,130,246,0.5)" : "none",
                    transition: "all 0.3s",
                  }}>
                    {concluido ? "✓" : num}
                  </div>
                  <span style={{ fontSize: 8.5, color: ativo ? "#93c5fd" : "#64748b", fontWeight: ativo ? 700 : 500 }}>
                    {label}
                  </span>
                </div>
                {idx < passoLabels.length - 1 && (
                  <div style={{
                    height: 2, width: 10, margin: "0 2px", marginBottom: 16,
                    background: concluido ? "#10b981" : "rgba(255,255,255,0.08)",
                    transition: "background 0.3s",
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ minHeight: 240 }}>
          {/* PASSO 1, 2, 3 = Turnos, Dias, Periodos */}
          {passo === 1 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                Quais turnos a escola oferece?
              </h2>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
                {TURNOS_CONFIG.map(t => {
                  const sel = turnos.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleTurno(t.id)} style={{
                      width: 140, padding: "16px 12px", borderRadius: 16,
                      border: sel ? "2px solid #3b82f6" : "2px solid rgba(255,255,255,0.1)",
                      background: sel ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)",
                      cursor: "pointer", color: "#fff", transition: "all 0.2s",
                      boxShadow: sel ? "0 0 16px rgba(59,130,246,0.3)" : "none",
                      transform: sel ? "translateY(-2px) scale(1.02)" : "scale(1)",
                    }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{t.emoji}</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                      {sel && <div style={{ marginTop: 8, color: "#60a5fa", fontSize: 11, fontWeight: 600 }}>✓ Selecionado</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {passo === 2 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 20 }}>
                Quais são os dias letivos?
              </h2>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {DIAS_SEMANA.map(d => {
                  const sel = dias.includes(d.num);
                  return (
                    <button key={d.num} onClick={() => toggleDia(d.num)} style={{
                      width: 68, height: 68, borderRadius: 12,
                      border: sel ? "2px solid #10b981" : "2px solid rgba(255,255,255,0.1)",
                      background: sel ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.04)",
                      cursor: "pointer", color: "#fff", transition: "all 0.2s",
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{d.label}</div>
                      <div style={{ color: sel ? "#6ee7b7" : "#94a3b8", fontSize: 10, marginTop: 2 }}>{d.nome}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {passo === 3 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 20 }}>
                Quantas aulas por dia em cada turno?
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {TURNOS_CONFIG.filter(t => turnos.includes(t.id)).map(t => (
                  <div key={t.id} style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{t.emoji}</span>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(t.id === "noturno" ? [3, 4, 5] : [4, 5, 6, 7]).map(n => (
                        <button key={n} onClick={() => setPeriodoTurno(t.id, n)} style={{
                          width: 38, height: 38, borderRadius: 8,
                          border: periodos[t.id] === n ? "2px solid #f59e0b" : "2px solid rgba(255,255,255,0.1)",
                          background: periodos[t.id] === n ? "rgba(245,158,11,0.22)" : "rgba(255,255,255,0.04)",
                          color: periodos[t.id] === n ? "#fbbf24" : "#94a3b8",
                          fontWeight: 800, fontSize: 15, cursor: "pointer", transition: "all 0.15s",
                        }}>{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 4: Regras de Aulas */}
          {passo === 4 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>
                Regras e Governança de Aulas Duplas (Geminadas)
              </h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={regrasGerais.preferencia_aulas_duplas}
                      onChange={e => setRegrasGerais({...regrasGerais, preferencia_aulas_duplas: e.target.checked})}
                      style={{ width: 20, height: 20, accentColor: "#3b82f6" }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Preferencialmente Aulas Duplas (Geminadas)</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>O algoritmo agrupará aulas da mesma disciplina em blocos consecutivos segundo a ordem de prioridade da escola abaixo.</div>
                    </div>
                  </label>
                </div>

                <div style={{ background: "rgba(16,185,129,0.08)", padding: 14, borderRadius: 12, border: "1px solid rgba(16,185,129,0.28)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={regrasGerais.proibir_aulas_separadas_mesmo_dia !== false}
                      onChange={e => setRegrasGerais({...regrasGerais, proibir_aulas_separadas_mesmo_dia: e.target.checked})}
                      style={{ width: 20, height: 20, accentColor: "#10b981" }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#6ee7b7" }}>Proibir aulas separadas da mesma disciplina no mesmo dia (Exigir Geminação)</div>
                      <div style={{ fontSize: 11, color: "#cbd5e1" }}>Impede que uma disciplina apareça duas vezes no mesmo dia em horários distantes (ex.: 1º e 6º horário). Se houver 2 aulas no dia, elas serão obrigatoriamente consecutivas.</div>
                    </div>
                  </label>
                </div>

                <div style={{ background: "rgba(245,158,11,0.08)", padding: 14, borderRadius: 12, border: "1px solid rgba(245,158,11,0.32)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={regrasGerais.bloquear_duplas_no_recreio !== false}
                      onChange={e => toggleBloqueioRecreio(e.target.checked)}
                      style={{ width: 20, height: 20, accentColor: "#f59e0b" }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#fde68a" }}>
                        Proibir que o Recreio/Intervalo corte Aulas Duplas ao meio {recreioPrincipal > 0 ? `(Bloquear par #${recreioPrincipal}-#${recreioPrincipal + 1})` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: "#cbd5e1" }}>
                        Quando marcado (recomendado), o algoritmo bloqueia estritamente que uma aula dupla comece antes do intervalo e termine depois do intervalo.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Painel de Governança Multi-Escola de Pares de Aulas Duplas */}
                {regrasGerais.preferencia_aulas_duplas && (
                  <div style={{
                    background: "rgba(15,23,42,0.65)",
                    padding: "16px",
                    borderRadius: 14,
                    border: "1px solid rgba(59,130,246,0.35)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#93c5fd", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>🎯</span> Governança de Combinações para Aulas Duplas (Ordem de Prioridade)
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                          Ordene os pares consecutivos da maior prioridade (1ª opção) para a menor. Cada escola pode definir blocos <b>Obrigatórios</b>, <b>Prioritários</b>, <b>Permitidos</b> ou <b>Bloqueados</b>.
                        </div>
                      </div>
                    </div>

                    {/* Botões rápidos de Preset */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      <button
                        type="button"
                        onClick={() => aplicarPresetPares("padrao")}
                        style={{
                          padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                          background: "rgba(59,130,246,0.16)", border: "1px solid rgba(59,130,246,0.4)", color: "#93c5fd",
                        }}
                      >
                        ⚡ Padrão Recomendado
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarPresetPares("obrigatorio_1_2")}
                        style={{
                          padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                          background: "rgba(16,185,129,0.16)", border: "1px solid rgba(16,185,129,0.4)", color: "#6ee7b7",
                        }}
                      >
                        🔒 Exigir (#1-#2) Obrigatório
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarPresetPares("obrigatorio_1_2_e_pos_recreio")}
                        style={{
                          padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                          background: "rgba(139,92,246,0.16)", border: "1px solid rgba(139,92,246,0.45)", color: "#c4b5fd",
                        }}
                      >
                        🔒 Exigir (#1-#2) e (#{recreioPrincipal + 1}-#{recreioPrincipal + 2}) Obrigatórios
                      </button>
                    </div>

                    {/* Lista Ordenável de Pares */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(regrasGerais.pares_duplas_governanca || [])
                        .filter(par => par.inicio < maxPeriodosAtivos)
                        .map((par, idx, arr) => {
                          const cortaRecreio = recreioPrincipal > 0 && par.inicio === recreioPrincipal;
                          const isBlocked = par.modo === "bloqueado";
                          const isMandatory = par.modo === "obrigatorio";
                          const isPriority = par.modo === "prioritario";

                          // Calcula a posição entre os pares ativos (não bloqueados)
                          const activeRank = arr.slice(0, idx).filter(x => x.modo !== "bloqueado").length + 1;

                          const borderColor = isBlocked
                            ? "rgba(239,68,68,0.4)"
                            : isMandatory
                            ? "rgba(16,185,129,0.55)"
                            : isPriority
                            ? "rgba(59,130,246,0.45)"
                            : "rgba(255,255,255,0.12)";

                          const bgColor = isBlocked
                            ? "rgba(239,68,68,0.08)"
                            : isMandatory
                            ? "rgba(16,185,129,0.12)"
                            : isPriority
                            ? "rgba(59,130,246,0.1)"
                            : "rgba(255,255,255,0.03)";

                          return (
                            <div
                              key={`${par.inicio}-${par.fim}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                padding: "8px 10px",
                                borderRadius: 10,
                                background: bgColor,
                                border: `1px solid ${borderColor}`,
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                {/* Badge de Ordem de Prioridade */}
                                <span style={{
                                  minWidth: 74,
                                  textAlign: "center",
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  background: isBlocked
                                    ? "rgba(239,68,68,0.22)"
                                    : isMandatory
                                    ? "#059669"
                                    : isPriority
                                    ? "#2563eb"
                                    : "rgba(148,163,184,0.2)",
                                  color: isBlocked ? "#fca5a5" : "#fff",
                                }}>
                                  {isBlocked ? "🚫 BLOQUEADO" : `${activeRank}ª OPÇÃO`}
                                </span>

                                {/* Rótulo do Par (#1-#2) */}
                                <span style={{
                                  fontWeight: 800,
                                  fontSize: 13.5,
                                  color: isBlocked ? "#fca5a5" : "#f8fafc",
                                  letterSpacing: 0.3,
                                }}>
                                  (#{par.inicio}–#{par.fim})
                                </span>

                                {/* Contexto Pedagógico do Par */}
                                {cortaRecreio ? (
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "2px 7px",
                                    borderRadius: 6,
                                    background: "rgba(245,158,11,0.2)",
                                    border: "1px solid rgba(245,158,11,0.45)",
                                    color: "#fde68a",
                                  }}>
                                    ☕ Corta o Recreio ({par.inicio}ª / {par.fim}ª aula)
                                  </span>
                                ) : par.inicio === 1 ? (
                                  <span style={{ fontSize: 10.5, color: "#93c5fd", fontWeight: 600 }}>
                                    🌅 Início do Turno
                                  </span>
                                ) : par.inicio === recreioPrincipal + 1 ? (
                                  <span style={{ fontSize: 10.5, color: "#6ee7b7", fontWeight: 600 }}>
                                    🔔 Pós-Intervalo
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10.5, color: "#94a3b8" }}>
                                    {par.inicio}º e {par.fim}º horários
                                  </span>
                                )}
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {/* Seletor de Modo de Governança */}
                                <select
                                  value={par.modo}
                                  onChange={e => alterarModoPar(par.inicio, e.target.value)}
                                  style={{
                                    background: "#0f172a",
                                    border: `1px solid ${borderColor}`,
                                    padding: "5px 8px",
                                    color: "#f8fafc",
                                    borderRadius: 6,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  <option value="obrigatorio">🔒 Obrigatório (Exigir Dupla)</option>
                                  <option value="prioritario">⭐ Prioritário (Alta Prioridade)</option>
                                  <option value="permitido">✅ Permitido (Menor Prioridade)</option>
                                  <option value="bloqueado">🚫 Bloqueado (Proibir Dupla)</option>
                                </select>

                                {/* Botões Subir / Descer Prioridade */}
                                <div style={{ display: "flex", gap: 3 }}>
                                  <button
                                    type="button"
                                    title="Aumentar prioridade (subir)"
                                    disabled={idx === 0}
                                    onClick={() => moverParPrioridade(idx, -1)}
                                    style={{
                                      width: 26, height: 26, borderRadius: 6,
                                      border: "1px solid rgba(255,255,255,0.15)",
                                      background: idx === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.1)",
                                      color: idx === 0 ? "#475569" : "#f8fafc",
                                      cursor: idx === 0 ? "not-allowed" : "pointer",
                                      fontSize: 11, fontWeight: 800,
                                    }}
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    title="Diminuir prioridade (descer)"
                                    disabled={idx === arr.length - 1}
                                    onClick={() => moverParPrioridade(idx, 1)}
                                    style={{
                                      width: 26, height: 26, borderRadius: 6,
                                      border: "1px solid rgba(255,255,255,0.15)",
                                      background: idx === arr.length - 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.1)",
                                      color: idx === arr.length - 1 ? "#475569" : "#f8fafc",
                                      cursor: idx === arr.length - 1 ? "not-allowed" : "pointer",
                                      fontSize: 11, fontWeight: 800,
                                    }}
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8", lineHeight: 1.45 }}>
                      💡 <b>Flexibilização Inteligente:</b> Os blocos marcados como <b>🔒 Obrigatório</b> recebem força máxima de geminação. Caso a disponibilidade de algum professor ou carga ímpar impeça 100% dos blocos obrigatórios, o motor prioriza não deixar aulas sem alocar e informa a direção para eventual flexibilização.
                    </div>
                  </div>
                )}

                <div style={{ background: "rgba(255,255,255,0.05)", padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Máximo de aulas da mesma disciplina no mesmo dia (RC02)</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>A mesma disciplina não entrará na mesma turma mais do que X vezes num mesmo dia.</div>
                  <select 
                    value={regrasGerais.max_aulas_mesmo_dia}
                    onChange={e => setRegrasGerais({...regrasGerais, max_aulas_mesmo_dia: parseInt(e.target.value)})}
                    style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", padding: "8px 12px", color: "#fff", borderRadius: 6, width: "100%" }}
                  >
                    <option value={1}>1 aula (Apenas simples)</option>
                    <option value={2}>2 aulas (Aulas Duplas no máximo)</option>
                    <option value={3}>3 aulas no dia</option>
                    <option value={4}>4 aulas no dia</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 5: Recreio */}
          {passo === 5 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                Horário do Intervalo (Recreio)
              </h2>
              <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, marginBottom: 20 }}>
                Após qual aula acontece o intervalo em cada turno?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {TURNOS_CONFIG.filter(t => turnos.includes(t.id)).map(t => {
                  const maxPeriodos = periodos[t.id] || 5;
                  const atuais = regrasGerais.recreio_apos_periodo || {};
                  return (
                  <div key={t.id} style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{t.emoji}</span>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                    </div>
                    <select 
                      value={atuais[t.id] || 3}
                      onChange={e => setRecreioTurno(t.id, parseInt(e.target.value))}
                      style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", padding: "8px 12px", color: "#fff", borderRadius: 6 }}
                    >
                      <option value={0}>Sem intervalo</option>
                      {Array.from({length: maxPeriodos - 1}).map((_, i) => (
                        <option key={i+1} value={i+1}>Após a {i+1}ª aula</option>
                      ))}
                    </select>
                  </div>
                )})}
              </div>
            </div>
          )}

          {/* PASSO 6: Disciplinas Conflitantes */}
          {passo === 6 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                Disciplinas Conflitantes
              </h2>
              <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, marginBottom: 20 }}>
                Evitar que turmas tenham estas duas disciplinas no mesmo dia.
              </p>
              
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select value={selDisc1} onChange={e => setSelDisc1(e.target.value)} style={{ flex: 1, background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", padding: "8px", color: "#fff", borderRadius: 6 }}>
                    <option value="">Selecione...</option>
                    {disciplinasDisponiveis.map(d => <option key={d.id} value={d.id}>{d.nome || d.descricao}</option>)}
                  </select>
                  <span style={{ fontWeight: "bold", color: "#64748b" }}>X</span>
                  <select value={selDisc2} onChange={e => setSelDisc2(e.target.value)} style={{ flex: 1, background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", padding: "8px", color: "#fff", borderRadius: 6 }}>
                    <option value="">Selecione...</option>
                    {disciplinasDisponiveis.map(d => <option key={d.id} value={d.id}>{d.nome || d.descricao}</option>)}
                  </select>
                  <button onClick={addExcludente} disabled={!selDisc1 || !selDisc2 || selDisc1===selDisc2} style={{
                    padding: "8px 12px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontWeight: "bold"
                  }}>+</button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {regrasGerais.disciplinas_excludentes.map((par, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "8px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{getDiscNome(par[0])} <span style={{ color:"#ef4444" }}>⚔️</span> {getDiscNome(par[1])}</span>
                    <button onClick={() => removeExcludente(idx)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                ))}
                {regrasGerais.disciplinas_excludentes.length === 0 && (
                  <div style={{ textAlign: "center", fontSize: 12, color: "#64748b" }}>Nenhum par conflitante cadastrado.</div>
                )}
              </div>
            </div>
          )}

          {/* PASSO 7: Super-Aulas / IFA Simultâneo & Turmas Unidas */}
          {passo === 7 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                🔗 Super-Aulas Simultâneas (IFA / Eletivas / Turmas Unidas)
              </h2>
              <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginBottom: 14 }}>
                Sincroniza 2 ou mais turmas exatamente no mesmo dia e horário (ex.: rodízio de Itinerários Formativos ou turmas unidas com o mesmo professor).
              </p>

              {agrupamentosAtivosCount > 0 && (
                <div style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 12,
                  fontSize: 12,
                  color: "#a7f3d0",
                }}>
                  ✅ <strong>Integração Automática Ativa:</strong> {agrupamentosAtivosCount} agrupamento(s) cadastrado(s) em <em>Modulação &gt; Agrupamentos</em> já são sincronizados automaticamente pelo Solver 2.0.
                </div>
              )}

              {feedbackEtapa3 && (
                <div style={{
                  background: "rgba(59, 130, 246, 0.16)",
                  border: "1px solid rgba(96, 165, 250, 0.45)",
                  borderRadius: 10,
                  padding: "9px 14px",
                  marginBottom: 12,
                  fontSize: 12,
                  color: "#bfdbfe",
                }}>
                  {feedbackEtapa3}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={autoDetectarBlocosIfa}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "1px solid #60a5fa",
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "#bfdbfe",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✨ Auto-Detectar IFAs / Eletivas por Série
                </button>
              </div>

              {/* Criador de Bloco Simultâneo */}
              <div style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 14,
              }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <input
                    value={novoBlocoNome}
                    onChange={e => setNovoBlocoNome(e.target.value)}
                    placeholder="Nome do bloco (ex.: IFA 2ª Série ou Ed. Física Unida)"
                    style={{
                      flex: 2,
                      minWidth: 210,
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 6,
                      padding: "7px 10px",
                      color: "#fff",
                      fontSize: 12,
                    }}
                  />
                  <select
                    value={novoBlocoTurno}
                    onChange={e => {
                      setNovoBlocoTurno(e.target.value);
                      setNovoBlocoTurmaIds([]);
                    }}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 6,
                      padding: "7px 10px",
                      color: "#fff",
                      fontSize: 12,
                    }}
                  >
                    {TURNOS_CONFIG.filter(t => turnos.includes(t.id)).map(t => (
                      <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>
                  1) Selecione 2 ou mais Turmas ({novoBlocoTurno}):
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 92, overflowY: "auto", marginBottom: 10 }}>
                  {turmasDisponiveis
                    .filter(t => String(t.turno || "").trim().toLowerCase() === novoBlocoTurno)
                    .map(t => {
                      const tId = Number(t.id ?? t.turma_id);
                      const sel = novoBlocoTurmaIds.includes(tId);
                      return (
                        <button
                          key={tId}
                          type="button"
                          onClick={() =>
                            setNovoBlocoTurmaIds(prev =>
                              prev.includes(tId) ? prev.filter(x => x !== tId) : [...prev, tId]
                            )
                          }
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            border: sel ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.15)",
                            background: sel ? "rgba(59,130,246,0.3)" : "rgba(15,23,42,0.6)",
                            color: sel ? "#fff" : "#cbd5e1",
                            fontSize: 11,
                            fontWeight: sel ? 700 : 500,
                            cursor: "pointer",
                          }}
                        >
                          {sel ? "✓ " : ""}{t.nome || t.turma}
                        </button>
                      );
                    })}
                </div>

                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>
                  2) Selecione a(s) Disciplina(s) que caminham juntas neste bloco:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 96, overflowY: "auto", marginBottom: 10 }}>
                  {disciplinasDisponiveis.map(d => {
                    const dId = Number(d.id);
                    const sel = novoBlocoDiscIds.includes(dId);
                    return (
                      <button
                        key={dId}
                        type="button"
                        onClick={() =>
                          setNovoBlocoDiscIds(prev =>
                            prev.includes(dId) ? prev.filter(x => x !== dId) : [...prev, dId]
                          )
                        }
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: sel ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.15)",
                          background: sel ? "rgba(16,185,129,0.28)" : "rgba(15,23,42,0.6)",
                          color: sel ? "#ecfdf5" : "#cbd5e1",
                          fontSize: 11,
                          fontWeight: sel ? 700 : 500,
                          cursor: "pointer",
                        }}
                      >
                        {sel ? "✓ " : ""}{d.nome || d.descricao}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "#cbd5e1", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={novoBlocoMesmoProf}
                      onChange={e => setNovoBlocoMesmoProf(e.target.checked)}
                      style={{ accentColor: "#10b981" }}
                    />
                    🤝 Permitir <strong>Turmas Unidas</strong> (mesmo professor nas turmas simultâneas sem acusar choque)
                  </label>
                  <button
                    type="button"
                    disabled={novoBlocoTurmaIds.length < 2 || novoBlocoDiscIds.length < 1}
                    onClick={adicionarBlocoSimultaneoManual}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: "none",
                      background:
                        novoBlocoTurmaIds.length >= 2 && novoBlocoDiscIds.length >= 1
                          ? "#10b981"
                          : "rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor:
                        novoBlocoTurmaIds.length >= 2 && novoBlocoDiscIds.length >= 1
                          ? "pointer"
                          : "not-allowed",
                    }}
                  >
                    + Adicionar Bloco
                  </button>
                </div>
              </div>

              {/* Lista de blocos configurados */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 175, overflowY: "auto" }}>
                {(regrasGerais.blocos_simultaneos || []).map(b => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: "9px 12px",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#f8fafc" }}>
                        🔗 {b.nome}{" "}
                        <span style={{ fontSize: 10.5, color: "#93c5fd", fontWeight: 600 }}>
                          ({b.turno || "todos"})
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        Turmas: {(b.turma_ids || []).map(getTurmaNome).join(", ")} • Disc.:{" "}
                        {(b.disciplina_ids || []).map(getDiscNome).join(", ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMesmoProfBloco(b.id)}
                      title="Alternar permissão de Turmas Unidas (mesmo professor simultâneo)"
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: b.permitir_mesmo_prof_simultaneo ? "rgba(16,185,129,0.22)" : "rgba(255,255,255,0.05)",
                        color: b.permitir_mesmo_prof_simultaneo ? "#6ee7b7" : "#94a3b8",
                        fontSize: 10.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {b.permitir_mesmo_prof_simultaneo ? "🤝 Unidas OK" : "Profs Distintos"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removerBlocoSimultaneo(b.id)}
                      style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 17, fontWeight: 700 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {(regrasGerais.blocos_simultaneos || []).length === 0 && (
                  <div style={{ textAlign: "center", fontSize: 12, color: "#64748b", padding: "6px 0" }}>
                    Nenhum bloco extra manual cadastrado (opcional).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASSO 8: Controle Inter-Turnos por CPF & Capacidade Física de Salas/Laboratórios */}
          {passo === 8 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                🔄 Interjornada por CPF & 🏛️ Salas / Laboratórios
              </h2>

              {feedbackEtapa3 && (
                <div style={{
                  background: "rgba(59, 130, 246, 0.16)",
                  border: "1px solid rgba(96, 165, 250, 0.45)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 11.5,
                  color: "#bfdbfe",
                }}>
                  {feedbackEtapa3}
                </div>
              )}

              {/* Card A: Controle Inter-Turnos por CPF */}
              <div style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f8fafc" }}>
                      🔄 Cruzamento Inter-Turnos & Interjornada (CPF)
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      Identifica o mesmo professor em Matutino/Vespertino/Noturno pelo CPF e protege descanso legal.
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#6ee7b7", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={regrasGerais.interturno_regras?.ativo !== false}
                      onChange={e =>
                        setRegrasGerais(prev => ({
                          ...prev,
                          interturno_regras: { ...(prev.interturno_regras || {}), ativo: e.target.checked },
                        }))
                      }
                      style={{ accentColor: "#10b981", width: 16, height: 16 }}
                    />
                    Ativo
                  </label>
                </div>

                {regrasGerais.interturno_regras?.ativo !== false && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 600, marginBottom: 4 }}>
                        🌙 Descanso Noite → Manhã (Interjornada)
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <select
                          value={regrasGerais.interturno_regras?.interjornada_min_horas ?? 11}
                          onChange={e =>
                            setRegrasGerais(prev => ({
                              ...prev,
                              interturno_regras: {
                                ...(prev.interturno_regras || {}),
                                interjornada_min_horas: Number(e.target.value),
                              },
                            }))
                          }
                          style={{ flex: 1, background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px", color: "#fff", fontSize: 11.5 }}
                        >
                          <option value={0}>Desativado (0h)</option>
                          <option value={9}>Mínimo 9h</option>
                          <option value={10}>Mínimo 10h</option>
                          <option value={11}>11h (CLT / SEEDF)</option>
                          <option value={12}>Mínimo 12h</option>
                        </select>
                        <select
                          value={regrasGerais.interturno_regras?.interjornada_modo || "hard"}
                          onChange={e =>
                            setRegrasGerais(prev => ({
                              ...prev,
                              interturno_regras: {
                                ...(prev.interturno_regras || {}),
                                interjornada_modo: e.target.value,
                              },
                            }))
                          }
                          style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px", color: "#fff", fontSize: 11 }}
                        >
                          <option value="hard">🔒 Estrito</option>
                          <option value="soft">⭐ Evitar</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 600, marginBottom: 4 }}>
                        ⏱️ Transição entre Turnos Adjacentes
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <select
                          value={regrasGerais.interturno_regras?.transicao_turno_min_minutos ?? 30}
                          onChange={e =>
                            setRegrasGerais(prev => ({
                              ...prev,
                              interturno_regras: {
                                ...(prev.interturno_regras || {}),
                                transicao_turno_min_minutos: Number(e.target.value),
                              },
                            }))
                          }
                          style={{ flex: 1, background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px", color: "#fff", fontSize: 11.5 }}
                        >
                          <option value={0}>Sem folga (0 min)</option>
                          <option value={20}>Mín. 20 min</option>
                          <option value={30}>Mín. 30 min</option>
                          <option value={45}>Mín. 45 min</option>
                          <option value={60}>Mín. 60 min</option>
                        </select>
                        <select
                          value={regrasGerais.interturno_regras?.transicao_turno_modo || "soft"}
                          onChange={e =>
                            setRegrasGerais(prev => ({
                              ...prev,
                              interturno_regras: {
                                ...(prev.interturno_regras || {}),
                                transicao_turno_modo: e.target.value,
                              },
                            }))
                          }
                          style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px", color: "#fff", fontSize: 11 }}
                        >
                          <option value="soft">⭐ Evitar</option>
                          <option value="hard">🔒 Estrito</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 600, marginBottom: 4 }}>
                        📊 Teto Diário por CPF (Todos os Turnos)
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <select
                          value={regrasGerais.interturno_regras?.max_aulas_dia_cpf ?? 12}
                          onChange={e =>
                            setRegrasGerais(prev => ({
                              ...prev,
                              interturno_regras: {
                                ...(prev.interturno_regras || {}),
                                max_aulas_dia_cpf: Number(e.target.value),
                              },
                            }))
                          }
                          style={{ flex: 1, background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px", color: "#fff", fontSize: 11.5 }}
                        >
                          <option value={0}>Sem limite</option>
                          <option value={8}>Máx. 8 aulas/dia</option>
                          <option value={10}>Máx. 10 aulas/dia</option>
                          <option value={12}>Máx. 12 aulas/dia</option>
                          <option value={15}>Máx. 15 aulas/dia</option>
                        </select>
                        <select
                          value={regrasGerais.interturno_regras?.max_aulas_dia_modo || "hard"}
                          onChange={e =>
                            setRegrasGerais(prev => ({
                              ...prev,
                              interturno_regras: {
                                ...(prev.interturno_regras || {}),
                                max_aulas_dia_modo: e.target.value,
                              },
                            }))
                          }
                          style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px", color: "#fff", fontSize: 11 }}
                        >
                          <option value="hard">🔒 Estrito</option>
                          <option value="soft">⭐ Evitar</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card B: Capacidade Física de Salas / Quadras / Laboratórios */}
              <div style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f8fafc" }}>
                      🏛️ Limite de Salas Especiais, Quadras & Laboratórios
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      Impede que mais turmas do que a capacidade física ocupem o mesmo espaço no mesmo horário.
                    </div>
                  </div>
                </div>

                {/* Botões rápidos de Presets */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <button type="button" onClick={() => adicionarPresetRecursoFisico("quadra")} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(245,158,11,0.45)", background: "rgba(245,158,11,0.16)", color: "#fde68a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    + 🏀 Quadra (Ed. Física)
                  </button>
                  <button type="button" onClick={() => adicionarPresetRecursoFisico("lab_ciencias")} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(16,185,129,0.45)", background: "rgba(16,185,129,0.16)", color: "#a7f3d0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    + 🔬 Lab. Ciências/Exatas
                  </button>
                  <button type="button" onClick={() => adicionarPresetRecursoFisico("lab_info")} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(59,130,246,0.45)", background: "rgba(59,130,246,0.16)", color: "#bfdbfe", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    + 💻 Lab. Informática
                  </button>
                  <button type="button" onClick={() => adicionarPresetRecursoFisico("sala_artes")} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(168,85,247,0.45)", background: "rgba(168,85,247,0.16)", color: "#e9d5ff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    + 🎭 Sala de Artes
                  </button>
                </div>

                {/* Criador customizado compacto */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <input
                    value={novaSalaNome}
                    onChange={e => setNovaSalaNome(e.target.value)}
                    placeholder="Outro espaço (ex.: Piscina, Auditório)..."
                    style={{ flex: 2, minWidth: 180, background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 11.5 }}
                  />
                  <select
                    value={novaSalaCap}
                    onChange={e => setNovaSalaCap(Number(e.target.value))}
                    style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 8px", color: "#fff", fontSize: 11.5 }}
                  >
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Cap: {n} turma(s)</option>)}
                  </select>
                  <select
                    value={novaSalaModo}
                    onChange={e => setNovaSalaModo(e.target.value)}
                    style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 8px", color: "#fff", fontSize: 11.5 }}
                  >
                    <option value="hard">🔒 Estrito</option>
                    <option value="soft">⭐ Preferencial</option>
                  </select>
                  <button
                    type="button"
                    disabled={!String(novaSalaNome || "").trim() || novaSalaDiscIds.length === 0}
                    onClick={adicionarSalaManual}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: String(novaSalaNome || "").trim() && novaSalaDiscIds.length > 0 ? "#3b82f6" : "rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: String(novaSalaNome || "").trim() && novaSalaDiscIds.length > 0 ? "pointer" : "not-allowed",
                    }}
                  >
                    + Adicionar
                  </button>
                </div>

                {String(novaSalaNome || "").trim() && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 74, overflowY: "auto", marginBottom: 10 }}>
                    {disciplinasDisponiveis.map(d => {
                      const dId = Number(d.id);
                      const sel = novaSalaDiscIds.includes(dId);
                      return (
                        <button
                          key={dId}
                          type="button"
                          onClick={() =>
                            setNovaSalaDiscIds(prev =>
                              prev.includes(dId) ? prev.filter(x => x !== dId) : [...prev, dId]
                            )
                          }
                          style={{
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: sel ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.14)",
                            background: sel ? "rgba(59,130,246,0.3)" : "rgba(15,23,42,0.5)",
                            color: "#fff",
                            fontSize: 10.5,
                            cursor: "pointer",
                          }}
                        >
                          {sel ? "✓ " : ""}{d.nome || d.descricao}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Lista de Salas configuradas */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 145, overflowY: "auto" }}>
                  {(regrasGerais.recursos_fisicos || []).map(r => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        background: "rgba(15,23,42,0.55)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: "7px 10px",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc" }}>
                          {r.icone || "🏛️"} {r.nome}
                        </div>
                        <div style={{ fontSize: 10.5, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {(r.disciplina_ids || []).map(getDiscNome).join(", ")}
                        </div>
                      </div>
                      <select
                        value={r.capacidade || 1}
                        onChange={e => atualizarRecursoFisico(r.id, { capacidade: Number(e.target.value) })}
                        style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "4px 6px", color: "#fff", fontSize: 11 }}
                      >
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} turma(s)/horário</option>)}
                      </select>
                      <select
                        value={r.modo || "hard"}
                        onChange={e => atualizarRecursoFisico(r.id, { modo: e.target.value })}
                        style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "4px 6px", color: "#fff", fontSize: 11 }}
                      >
                        <option value="hard">🔒 Estrito</option>
                        <option value="soft">⭐ Evitar</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removerRecursoFisico(r.id)}
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, fontWeight: 700 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(regrasGerais.recursos_fisicos || []).length === 0 && (
                    <div style={{ textAlign: "center", fontSize: 11.5, color: "#64748b" }}>
                      Nenhum limite de sala/quadra ativo (sem restrição de espaço físico).
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 9: Revisão */}
          {passo === 9 && (
            <div>
              <h2 style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 20 }}>
                Tudo pronto! Revise antes de confirmar.
              </h2>
              
              <ResumoCard icon="🔄" titulo="Turnos & Dias">
                {turnos.map(t => <Pill key={t} color="#3b82f6">{t}</Pill>)}
                <div style={{ width: "100%", height: 1 }} />
                {DIAS_SEMANA.filter(d => dias.includes(d.num)).map(d => <Pill key={d.num} color="#10b981">{d.nome}</Pill>)}
              </ResumoCard>

              <ResumoCard icon="⚙️" titulo="Regras Pedagógicas">
                <Pill color={regrasGerais.preferencia_aulas_duplas ? "#10b981" : "#64748b"}>Aulas Duplas</Pill>
                <Pill color={regrasGerais.max_aulas_mesmo_dia ? "#3b82f6" : "#64748b"}>Max {regrasGerais.max_aulas_mesmo_dia}/dia</Pill>
                {regrasGerais.bloquear_duplas_no_recreio !== false && <Pill color="#f59e0b">Recreio protegido (sem duplas cortadas)</Pill>}
                {regrasGerais.disciplinas_excludentes.length > 0 && <Pill color="#ef4444">{regrasGerais.disciplinas_excludentes.length} Conflitos</Pill>}
              </ResumoCard>

              <ResumoCard icon="🚀" titulo="Super-Aulas, Interjornada CPF & Salas">
                <Pill color={regrasGerais.interturno_regras?.ativo !== false ? "#10b981" : "#64748b"}>
                  {regrasGerais.interturno_regras?.ativo !== false
                    ? `CPF Inter-Turnos (${regrasGerais.interturno_regras?.interjornada_min_horas ?? 11}h descanso)`
                    : "CPF Inter-Turnos Desativado"}
                </Pill>
                {(agrupamentosAtivosCount > 0 || (regrasGerais.blocos_simultaneos || []).length > 0) && (
                  <Pill color="#3b82f6">
                    🔗 {(regrasGerais.blocos_simultaneos || []).length + agrupamentosAtivosCount} Bloco(s) Simultâneo(s)
                  </Pill>
                )}
                {(regrasGerais.recursos_fisicos || []).length > 0 && (
                  <Pill color="#f59e0b">
                    🏛️ {(regrasGerais.recursos_fisicos || []).length} Espaço(s) c/ Capacidade
                  </Pill>
                )}
              </ResumoCard>

              {regrasGerais.preferencia_aulas_duplas && (
                <ResumoCard icon="🎯" titulo="Prioridade de Pares de Aulas Duplas">
                  {(regrasGerais.pares_duplas_governanca || [])
                    .filter(p => p.inicio < maxPeriodosAtivos)
                    .map((p, idx) => {
                      const cor =
                        p.modo === "obrigatorio"
                          ? "#10b981"
                          : p.modo === "prioritario"
                          ? "#3b82f6"
                          : p.modo === "permitido"
                          ? "#94a3b8"
                          : "#ef4444";
                      const icone =
                        p.modo === "obrigatorio"
                          ? "🔒"
                          : p.modo === "prioritario"
                          ? "⭐"
                          : p.modo === "permitido"
                          ? "✅"
                          : "🚫";
                      return (
                        <Pill key={`${p.inicio}-${p.fim}`} color={cor}>
                          {p.modo === "bloqueado" ? `${icone} (#${p.inicio}-#${p.fim}) Bloqueado` : `${idx + 1}º ${icone} (#${p.inicio}-#${p.fim})`}
                        </Pill>
                      );
                    })}
                </ResumoCard>
              )}

              {erro && <p style={{ color: "#f87171", textAlign: "center", marginTop: 16, fontSize: 13 }}>{erro}</p>}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
          <button onClick={() => setPasso(p => p - 1)} disabled={passo === 1} style={{
            padding: "10px 20px", borderRadius: 8,
            border: passo === 1 ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.2)",
            background: passo === 1 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.08)",
            color: passo === 1 ? "#64748b" : "#e2e8f0",
            cursor: passo === 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s",
          }}>← Voltar</button>

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <div key={n} style={{
                width: n === passo ? 16 : 4, height: 4, borderRadius: 2,
                background: n <= passo ? "#3b82f6" : "rgba(255,255,255,0.12)", transition: "all 0.3s",
              }} />
            ))}
          </div>

          {passo < 9 ? (
            <button onClick={() => podeAvancar && setPasso(p => p + 1)} disabled={!podeAvancar} style={{
              padding: "10px 24px", borderRadius: 8, background: podeAvancar ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.06)",
              border: "none", color: podeAvancar ? "#fff" : "#64748b", cursor: podeAvancar ? "pointer" : "not-allowed",
              fontSize: 13, fontWeight: 700, boxShadow: podeAvancar ? "0 4px 14px rgba(59,130,246,0.4)" : "none", transition: "all 0.2s",
            }}>Próximo →</button>
          ) : (
            <button onClick={confirmar} disabled={salvando} style={{
              padding: "10px 24px", borderRadius: 8, background: salvando ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #10b981, #059669)",
              border: "none", color: "#fff", cursor: salvando ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 700, boxShadow: salvando ? "none" : "0 4px 14px rgba(16,185,129,0.4)", transition: "all 0.2s",
            }}>
              {salvando ? "Salvando…" : "✓ Confirmar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
