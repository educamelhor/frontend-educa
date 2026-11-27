// src/features/plataforma/PlataformaModulos.jsx
// ============================================================================
// Central Unificada de Modulação (CEO) — EDUCA.MELHOR
// Governa de forma isolada as 3 Esferas Institucionais:
//   1. 🏛️ Escolas Públicas     (origem = 'publica')
//   2. 🏫 Escolas Particulares (origem = 'particular' — whitelist homologada)
//   3. 🗺️ Regionais (CREs)     (cargos orgânicos SEEDF — Gabinete & Unidades)
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';

// ── 1) ÁRVORE DE MÓDULOS — ESCOLA PÚBLICA ─────────────────────────────────────
const MODULOS_TREE_PUBLICA = [
  {
    id: 'secretaria', label: 'Secretaria', icon: '📋',
    filhos: [
      { id: 'secretaria.matriculas', label: 'Matrículas' },
      { id: 'secretaria.alunos', label: 'Alunos' },
      { id: 'secretaria.responsaveis', label: 'Responsáveis' },
      { id: 'secretaria.cargas_horarias', label: 'Cargas Horárias' },
      { id: 'secretaria.disciplinas', label: 'Disciplinas' },
      { id: 'secretaria.turmas', label: 'Turmas' },
      { id: 'secretaria.professores', label: 'Professores' },
      { id: 'secretaria.boletim', label: 'Boletim (Edição)' },
      { id: 'secretaria.relatorios', label: 'Relatórios' },
      { id: 'secretaria.horarios', label: 'Horários' },
      { id: 'secretaria.agente', label: 'Agente (SEEDF PDF)' },
      { id: 'secretaria.tabela_codigos', label: 'Tabela de Códigos (SEEDF)' },
      { id: 'secretaria.sincronizar_seedf', label: 'Sincronizar SEEDF' },
      { id: 'secretaria.modulacao', label: 'Modulação' },
      { id: 'secretaria.etapas', label: 'Etapas de Ensino' },
      { id: 'secretaria.conflitos_notas', label: 'Conflitos de Notas' },
      { id: 'secretaria.faltas', label: 'Faltas' },
      { id: 'secretaria.liberacao', label: 'Liberação' },
    ],
  },
  {
    id: 'pedagogico', label: 'Pedagógico', icon: '🎓',
    filhos: [
      { id: 'pedagogico.agenda', label: 'Agenda' },
      { id: 'pedagogico.conselho', label: 'Conselho de Classe' },
      { id: 'pedagogico.conteudos', label: 'Conteúdos' },
      { id: 'pedagogico.relatorios', label: 'Relatórios' },
      { id: 'pedagogico.correcoes', label: 'Correções' },
    ],
  },
  {
    id: 'gabarito', label: 'Gabarito', icon: '✅',
    filhos: [
      { id: 'gabarito.gerar', label: 'Gerar / Imprimir' },
      { id: 'gabarito.corrigir_lote', label: 'Corrigir Lote' },
      { id: 'gabarito.corrigir', label: 'Corrigir' },
      { id: 'gabarito.resultados', label: 'Resultados' },
    ],
  },
  {
    id: 'frequencia', label: 'Frequência', icon: '📅',
    filhos: [
      { id: 'frequencia.atestados', label: 'Atestados' },
      { id: 'frequencia.relatorios', label: 'Relatórios' },
      { id: 'frequencia.busca_ativa', label: 'Busca Ativa' },
      { id: 'frequencia.conselho_tutelar', label: 'Conselho Tutelar' },
      { id: 'frequencia.liberacao', label: 'Liberação' },
    ],
  },
  {
    id: 'biblioteca', label: 'Biblioteca', icon: '📚',
    filhos: [
      { id: 'biblioteca.acervo', label: 'Acervo' },
      { id: 'biblioteca.emprestimos', label: 'Empréstimos' },
      { id: 'biblioteca.alunos', label: 'Alunos Leitores' },
      { id: 'biblioteca.leitor_destaque', label: 'Leitor Destaque' },
      { id: 'biblioteca.concurso', label: 'Ranking & Concurso' },
      { id: 'biblioteca.metadados', label: 'Metadados' },
    ],
  },
  {
    id: 'professores', label: 'Professores', icon: '👩‍🏫',
    filhos: [
      { id: 'professores.planos', label: 'Planos' },
      { id: 'professores.avaliacoes', label: 'Avaliações' },
      { id: 'professores.chamada', label: 'Chamada' },
      { id: 'professores.conteudos', label: 'Conteúdos' },
      { id: 'professores.provas', label: 'Provas' },
      { id: 'professores.conselho', label: 'Conselho de Classe' },
      { id: 'professores.boletim', label: 'Boletim Manual' },
      { id: 'professores.sala_recurso', label: 'Sala de Recursos' },
    ],
  },
  {
    id: 'monitoramento', label: 'Monitoramento', icon: '📡',
    filhos: [
      { id: 'monitoramento.painel', label: 'Painel' },
      { id: 'monitoramento.alertas', label: 'Alertas' },
      { id: 'monitoramento.embeddings', label: 'Embeddings' },
    ],
  },
  { id: 'questoes', label: 'Banco de Questões', icon: '❓', filhos: [] },
  {
    id: 'agente_educa', label: 'Agente EDUCA (EDUCADF)', icon: '🤖',
    filhos: [
      { id: 'agente_educa.credenciais', label: 'Credenciais' },
      { id: 'agente_educa.planos', label: 'Planos' },
      { id: 'agente_educa.notas', label: 'Notas' },
    ],
  },
  {
    id: 'impressao', label: 'Impressão', icon: '🖨️',
    filhos: [
      { id: 'impressao.gabaritos', label: 'Gabaritos' },
      { id: 'impressao.boletins', label: 'Boletins' },
      { id: 'impressao.listas', label: 'Listas' },
      { id: 'impressao.documentos', label: 'Documentos' },
    ],
  },
  { id: 'ferramentas', label: 'Ferramentas', icon: '🔧', filhos: [] },
  {
    id: 'direcao', label: 'Direção', icon: '🏛️',
    filhos: [
      { id: 'direcao.educa_capture', label: 'Educa-Capture' },
      { id: 'direcao.responsaveis', label: 'Responsáveis (App)' },
      { id: 'direcao.cadastro', label: 'Cadastro de Membros' },
      { id: 'direcao.governanca', label: 'Governança' },
    ],
  },
  {
    id: 'merenda', label: 'Merenda', icon: '🍽️',
    filhos: [
      { id: 'merenda.cadastro', label: 'Cadastro' },
      { id: 'merenda.cardapio', label: 'Cardápio' },
      { id: 'merenda.relatorios', label: 'Relatórios' },
    ],
  },
  {
    id: 'comunicacao', label: 'Comunicação', icon: '💬',
    filhos: [
      { id: 'comunicacao.avisos', label: 'Avisos' },
      { id: 'comunicacao.comunicados', label: 'Comunicados' },
      { id: 'comunicacao.mural', label: 'Mural' },
    ],
  },
  {
    id: 'sala_recurso', label: 'Sala de Recursos (AEE)', icon: '🧩',
    filhos: [
      { id: 'sala_recurso.alunos', label: 'Alunos AEE' },
      { id: 'sala_recurso.adequacoes', label: 'Adequações Curriculares' },
      { id: 'sala_recurso.impressao', label: 'Impressão' },
      { id: 'sala_recurso.pdi', label: 'Plano Individual (PDI/PEI)' },
      { id: 'sala_recurso.atendimentos', label: 'Diário de Sessões' },
    ],
  },
  {
    id: 'administrativo', label: 'Administrativo', icon: '🏢',
    filhos: [
      { id: 'administrativo.servidores', label: 'CADASTRO' },
      { id: 'administrativo.frequencia', label: 'BIOMETRIA' },
      { id: 'administrativo.ocorrencias', label: 'LANÇAMENTOS' },
      { id: 'administrativo.relatorios', label: 'IMPRIMIR / PDF' },
      { id: 'administrativo.memorando', label: 'MEMORANDO' },
    ],
  },
  {
    id: 'financeiro', label: 'Financeiro Público (Verbas)', icon: '💰',
    filhos: [
      { id: 'financeiro.pdaf', label: 'PDAF (Recursos Distritais / SEEDF)' },
      { id: 'financeiro.pdde', label: 'PDDE (Recursos Federais / FNDE)' },
    ],
  },
];

// ── 2) ÁRVORE DE MÓDULOS — ESCOLA PARTICULAR (Sem SEEDF/PDAF/PDDE) ────────────
// Separada em:
//   (A) Núcleo Homologado Rede Particular (pronto para escolas privadas)
//   (B) Base Escolar em Adaptação (recolhida por padrão — ativar só após homologação privada)
const MODULOS_PARTICULAR_HOMOLOGADOS = [
  {
    id: 'financeiro', label: 'Financeiro Particular (Comercial)', icon: '💰', homologado: true,
    filhos: [
      { id: 'financeiro.mensalidades', label: 'Mensalidades & Planos' },
      { id: 'financeiro.boletos_pix', label: 'Boletos & PIX' },
      { id: 'financeiro.contratos', label: 'Contratos Financeiros' },
      { id: 'financeiro.inadimplencia', label: 'Gestão de Inadimplência' },
      { id: 'financeiro.caixa_dre', label: 'Fluxo de Caixa & DRE' },
    ],
  },
  {
    id: 'direcao', label: 'Direção & Acessos da Equipe', icon: '🏛️', homologado: true,
    filhos: [
      { id: 'direcao.cadastro', label: 'Cadastro de Membros / Equipe' },
      { id: 'direcao.responsaveis', label: 'EDUCA MOBILE (Responsáveis)' },
      { id: 'direcao.educa_capture', label: 'Educa-Capture (Reconhecimento)' },
      { id: 'direcao.governanca', label: 'Governança da Unidade' },
    ],
  },
  {
    id: 'comunicacao', label: 'Comunicação Institucional', icon: '💬', homologado: true,
    filhos: [
      { id: 'comunicacao.avisos', label: 'Avisos' },
      { id: 'comunicacao.comunicados', label: 'Comunicados' },
      { id: 'comunicacao.mural', label: 'Mural' },
    ],
  },
  {
    id: 'monitoramento', label: 'Monitoramento & Portaria Facial', icon: '📡', homologado: true,
    filhos: [
      { id: 'monitoramento.painel', label: 'Painel' },
      { id: 'monitoramento.alertas', label: 'Alertas' },
      { id: 'monitoramento.embeddings', label: 'Embeddings' },
    ],
  },
];

const MODULOS_PARTICULAR_EM_ADAPTACAO = [
  {
    id: 'secretaria', label: 'Secretaria Acadêmica (Em adaptação)', icon: '📋', emAdaptacao: true,
    filhos: [
      { id: 'secretaria.matriculas', label: 'Matrículas' },
      { id: 'secretaria.alunos', label: 'Alunos' },
      { id: 'secretaria.responsaveis', label: 'Responsáveis' },
      { id: 'secretaria.cargas_horarias', label: 'Cargas Horárias' },
      { id: 'secretaria.disciplinas', label: 'Disciplinas' },
      { id: 'secretaria.turmas', label: 'Turmas' },
      { id: 'secretaria.professores', label: 'Professores' },
      { id: 'secretaria.boletim', label: 'Boletim (Edição)' },
      { id: 'secretaria.relatorios', label: 'Relatórios' },
      { id: 'secretaria.horarios', label: 'Horários' },
      { id: 'secretaria.modulacao', label: 'Modulação' },
      { id: 'secretaria.etapas', label: 'Etapas de Ensino' },
      { id: 'secretaria.conflitos_notas', label: 'Conflitos de Notas' },
      { id: 'secretaria.faltas', label: 'Faltas' },
      { id: 'secretaria.liberacao', label: 'Liberação' },
    ],
  },
  {
    id: 'pedagogico', label: 'Pedagógico (Em adaptação)', icon: '🎓', emAdaptacao: true,
    filhos: [
      { id: 'pedagogico.agenda', label: 'Agenda' },
      { id: 'pedagogico.conselho', label: 'Conselho de Classe' },
      { id: 'pedagogico.conteudos', label: 'Conteúdos' },
      { id: 'pedagogico.relatorios', label: 'Relatórios' },
      { id: 'pedagogico.correcoes', label: 'Correções' },
    ],
  },
  {
    id: 'gabarito', label: 'Gabarito & Simulados (Em adaptação)', icon: '✅', emAdaptacao: true,
    filhos: [
      { id: 'gabarito.gerar', label: 'Gerar / Imprimir' },
      { id: 'gabarito.corrigir_lote', label: 'Corrigir Lote' },
      { id: 'gabarito.corrigir', label: 'Corrigir' },
      { id: 'gabarito.resultados', label: 'Resultados' },
    ],
  },
  { id: 'questoes', label: 'Banco de Questões (Em adaptação)', icon: '❓', emAdaptacao: true, filhos: [] },
  {
    id: 'professores', label: 'Portal dos Professores (Em adaptação)', icon: '👩‍🏫', emAdaptacao: true,
    filhos: [
      { id: 'professores.planos', label: 'Planos' },
      { id: 'professores.avaliacoes', label: 'Avaliações' },
      { id: 'professores.chamada', label: 'Chamada' },
      { id: 'professores.conteudos', label: 'Conteúdos' },
      { id: 'professores.provas', label: 'Provas' },
      { id: 'professores.conselho', label: 'Conselho de Classe' },
      { id: 'professores.boletim', label: 'Boletim Manual' },
      { id: 'professores.sala_recurso', label: 'Sala de Recursos' },
    ],
  },
  {
    id: 'frequencia', label: 'Frequência (Em adaptação)', icon: '📅', emAdaptacao: true,
    filhos: [
      { id: 'frequencia.atestados', label: 'Atestados' },
      { id: 'frequencia.relatorios', label: 'Relatórios' },
      { id: 'frequencia.liberacao', label: 'Liberação' },
    ],
  },
  {
    id: 'biblioteca', label: 'Biblioteca (Em adaptação)', icon: '📚', emAdaptacao: true,
    filhos: [
      { id: 'biblioteca.acervo', label: 'Acervo' },
      { id: 'biblioteca.emprestimos', label: 'Empréstimos' },
      { id: 'biblioteca.alunos', label: 'Alunos Leitores' },
      { id: 'biblioteca.leitor_destaque', label: 'Leitor Destaque' },
      { id: 'biblioteca.concurso', label: 'Ranking & Concurso' },
      { id: 'biblioteca.metadados', label: 'Metadados' },
    ],
  },
  {
    id: 'impressao', label: 'Impressão (Em adaptação)', icon: '🖨️', emAdaptacao: true,
    filhos: [
      { id: 'impressao.gabaritos', label: 'Gabaritos' },
      { id: 'impressao.boletins', label: 'Boletins' },
      { id: 'impressao.listas', label: 'Listas' },
      { id: 'impressao.documentos', label: 'Documentos' },
    ],
  },
  {
    id: 'sala_recurso', label: 'Atendimento Especializado / AEE (Em adaptação)', icon: '🧩', emAdaptacao: true,
    filhos: [
      { id: 'sala_recurso.alunos', label: 'Alunos AEE' },
      { id: 'sala_recurso.adequacoes', label: 'Adequações Curriculares' },
      { id: 'sala_recurso.impressao', label: 'Impressão' },
      { id: 'sala_recurso.pdi', label: 'Plano Individual (PDI/PEI)' },
      { id: 'sala_recurso.atendimentos', label: 'Diário de Sessões' },
    ],
  },
];

const MODULOS_TREE_PARTICULAR = [
  ...MODULOS_PARTICULAR_HOMOLOGADOS,
  ...MODULOS_PARTICULAR_EM_ADAPTACAO,
];

// ── 3) ÁRVORE DE MÓDULOS — REGIONAIS DE ENSINO (CREs) ─────────────────────────
const MODULOS_TREE_CRE = [
  {
    id: 'cre', label: 'Gestão Regional de Ensino (CRE)', icon: '🗺️',
    filhos: [
      { id: 'cre.gabinete', label: 'Gabinete Regional (Visão Executiva da Rede)' },
      { id: 'cre.uniag', label: 'UNIAG • Auditoria Trimestral PDAF (Pré-SEI)' },
    ],
  },
];

// ── Perfis Escolares & Cargos Regionais ───────────────────────────────────────
const PERFIS_ESCOLA_PUBLICA = [
  { key: 'diretor',                   label: 'Diretor' },
  { key: 'vice_diretor',              label: 'Vice-Diretor' },
  { key: 'coordenacao',               label: 'Coordenação' },
  { key: 'secretaria',                label: 'Secretaria' },
  { key: 'orientador',                label: 'Orientador' },
  { key: 'supervisor_pedagogico',     label: 'Supervisor Pedagógico' },
  { key: 'supervisor_administrativo', label: 'Supervisor Administrativo' },
  { key: 'disciplinar',               label: 'Disciplinar' },
  { key: 'administrativo',            label: 'Administrativo' },
  { key: 'financeiro',                label: 'Financeiro' },
  { key: 'psicopedagogia',            label: 'Psicopedagogia' },
  { key: 'sala_recurso',              label: 'Sala de Recurso' },
  { key: 'apoio',                     label: 'Apoio' },
  { key: 'educador_social',           label: 'Educador Social' },
  { key: 'vigilancia',                label: 'Vigilância' },
  { key: 'merenda',                   label: 'Merenda' },
  { key: 'biblioteca',                label: 'Biblioteca' },
  { key: 'professor',                 label: 'Professor' },
  { key: 'pedagogo',                  label: 'Pedagogo' },
  { key: 'aluno',                     label: 'Aluno' },
  { key: 'responsavel',               label: 'Responsável' },
  { key: 'psicologo',                 label: 'Psicólogo' },
  { key: 'monitor',                   label: 'Monitor' },
];

const PERFIS_ESCOLA_PARTICULAR = [
  { key: 'diretor',                   label: 'Diretor / Mantenedor' },
  { key: 'vice_diretor',              label: 'Vice-Diretor' },
  { key: 'financeiro',                label: 'Financeiro / Tesouraria' },
  { key: 'secretaria',                label: 'Secretaria' },
  { key: 'coordenacao',               label: 'Coordenação Pedagógica' },
  { key: 'orientador',                label: 'Orientação Educacional' },
  { key: 'administrativo',            label: 'Administrativo' },
  { key: 'professor',                 label: 'Professor' },
  { key: 'psicopedagogia',            label: 'Psicopedagogia' },
  { key: 'sala_recurso',              label: 'Atendimento AEE' },
  { key: 'biblioteca',                label: 'Biblioteca' },
  { key: 'vigilancia',                label: 'Portaria / Segurança' },
  { key: 'aluno',                     label: 'Aluno' },
  { key: 'responsavel',               label: 'Responsável Financeiro' },
];

const CARGOS_CRE_LISTA = [
  { key: 'coordenador_regional', label: 'Coordenador(a) Geral (Gabinete)', sigla: 'GABINETE' },
  { key: 'chefe_uniag',          label: 'Administração Geral (UNIAG)',     sigla: 'UNIAG' },
  { key: 'chefe_unieb',          label: 'Educação Básica (UNIEB)',         sigla: 'UNIEB' },
  { key: 'chefe_uniplat',        label: 'Planejamento & Tec. (UNIPLAT)',   sigla: 'UNIPLAT' },
  { key: 'chefe_unigep',         label: 'Gestão de Pessoas (UNIGEP)',      sigla: 'UNIGEP' },
  { key: 'chefe_uniae',          label: 'Infraestrutura & Apoio (UNIAE)',  sigla: 'UNIAE' },
];

const PERFIL_ICONS = {
  diretor: '🎓', vice_diretor: '👔', professor: '👩‍🏫',
  coordenacao: '📋', coordenador: '📋', supervisor_pedagogico: '🔍',
  supervisor_administrativo: '🗂️', pedagogo: '📚', secretaria: '🗂️',
  orientador: '🧭', aluno: '👨‍🎓', biblioteca: '📖', educador_social: '🤝',
  merenda: '🍽️', psicologo: '🧠', psicopedagogia: '🧠', responsavel: '👨‍👩‍👧',
  vigilancia: '🔒', administrativo: '🏢', financeiro: '💰', sala_recurso: '🧩',
  disciplinar: '🛡️', apoio: '🤝', monitor: '👁️',
  coordenador_regional: '🏛️', chefe_uniag: '💰', chefe_unieb: '🎓',
  chefe_uniplat: '📊', chefe_unigep: '👥', chefe_uniae: '🏗️',
};

const GROUP_COLORS = [
  { accent: '#6366f1', bg: 'rgba(99,102,241,0.06)' },
  { accent: '#3b82f6', bg: 'rgba(59,130,246,0.06)' },
  { accent: '#10b981', bg: 'rgba(16,185,129,0.06)' },
  { accent: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
  { accent: '#ec4899', bg: 'rgba(236,72,153,0.06)' },
  { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.06)' },
  { accent: '#14b8a6', bg: 'rgba(20,184,166,0.06)' },
];

const countLeaves = (tree) =>
  tree.reduce((acc, g) => acc + (g.filhos.length > 0 ? g.filhos.length : 1), 0);

function getGroupState(grupo, ativos) {
  if (grupo.filhos.length === 0) {
    return ativos.has(grupo.id) ? 'all' : 'none';
  }
  const ativosCount = grupo.filhos.filter(f => ativos.has(f.id)).length;
  if (ativosCount === 0) return 'none';
  if (ativosCount === grupo.filhos.length) return 'all';
  return 'some';
}

function getGroupAccent(state, accent) {
  if (state === 'all') return '#10b981';
  if (state === 'some') return accent;
  return '#475569';
}

function getGroupBorder(state, accent) {
  if (state === 'all') return 'rgba(16,185,129,0.25)';
  if (state === 'some') return `${accent}40`;
  return 'rgba(255,255,255,0.06)';
}

function ToggleSwitch({ isActive, onClick, size = 'md' }) {
  const [hover, setHover] = useState(false);
  const w = size === 'sm' ? 38 : 44;
  const h = size === 'sm' ? 20 : 24;
  const knob = size === 'sm' ? 16 : 20;
  const knobOffset = 2;
  const knobActiveLeft = w - knob - knobOffset;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="switch"
      aria-checked={isActive}
      style={{
        width: w, height: h, borderRadius: h / 2,
        background: isActive
          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : hover ? '#334155' : '#1e293b',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.25s cubic-bezier(0.4,0,0.2,1)',
        border: isActive ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isActive ? '0 0 12px rgba(99,102,241,0.35)' : 'none',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: knobOffset,
        left: isActive ? knobActiveLeft : knobOffset,
        width: knob, height: knob,
        borderRadius: '50%',
        background: isActive ? '#ffffff' : '#64748b',
        boxShadow: isActive
          ? '0 2px 6px rgba(0,0,0,0.4), 0 0 4px rgba(99,102,241,0.3)'
          : '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1), background 0.2s',
      }} />
    </div>
  );
}

function CopyModal({ escolas, escolaAtual, esferaLabel, onConfirm, onClose }) {
  const [origemId, setOrigemId] = useState('');
  const origens = escolas.filter(e => e.id !== escolaAtual?.id);
  const origem = origens.find(e => String(e.id) === String(origemId));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 24, padding: '32px 36px', width: '100%', maxWidth: 480,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontSize: '2.2rem', textAlign: 'center', marginBottom: 10 }}>📋</div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9', textAlign: 'center', marginBottom: 6 }}>
          Copiar configuração ({esferaLabel})
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'rgba(148,163,184,0.8)', textAlign: 'center', marginBottom: 22, lineHeight: 1.6 }}>
          Apenas instituições da mesma natureza são listadas para evitar contaminação de módulos. Destino:{' '}
          <strong style={{ color: '#f1f5f9' }}>{escolaAtual?.nome}</strong>.
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block', fontSize: '0.7rem', fontWeight: 700,
            color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase',
            letterSpacing: '0.05em', marginBottom: 8,
          }}>
            Instituição de Origem
          </label>
          <select
            value={origemId}
            onChange={e => setOrigemId(e.target.value)}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: '0.88rem',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#f1f5f9', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">— Selecione uma escola —</option>
            {origens.map(e => (
              <option key={e.id} value={e.id} style={{ background: '#1e293b' }}>
                {e.nome} {e.apelido ? `(${e.apelido})` : ''}
              </option>
            ))}
          </select>
        </div>

        {origemId && (
          <div style={{
            marginBottom: 20, padding: '11px 14px', borderRadius: 12,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            fontSize: '0.8rem', color: '#fbbf24', lineHeight: 1.5,
          }}>
            ⚠️ A configuração deste perfil em <strong>{escolaAtual?.nome}</strong> será substituída pela de <strong>{origem?.nome}</strong>.
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px 18px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: 'rgba(148,163,184,0.9)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            disabled={!origemId}
            onClick={() => origemId && onConfirm(origemId)}
            style={{
              flex: 1, padding: '11px 18px', borderRadius: 12, border: 'none',
              background: origemId ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
              color: origemId ? '#fff' : 'rgba(148,163,184,0.4)',
              fontWeight: 700, fontSize: '0.88rem',
              cursor: origemId ? 'pointer' : 'not-allowed',
            }}
          >
            Confirmar Cópia
          </button>
        </div>
      </div>
    </div>
  );
}

function ModuloGrupo({ grupo, colorDef, ativos, onToggle, expandido, onToggleExpand }) {
  const [hoverGroup, setHoverGroup] = useState(false);
  const groupState = getGroupState(grupo, ativos);
  const accent = getGroupAccent(groupState, colorDef.accent);
  const borderColor = getGroupBorder(groupState, colorDef.accent);
  const hasSubs = grupo.filhos.length > 0;

  return (
    <div style={{
      borderRadius: 16,
      background: groupState === 'none'
        ? 'rgba(255,255,255,0.02)'
        : groupState === 'all'
          ? 'rgba(16,185,129,0.05)'
          : colorDef.bg,
      border: `1px solid ${borderColor}`,
      overflow: 'hidden',
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      boxShadow: groupState !== 'none' ? `0 4px 20px ${accent}18` : 'none',
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          cursor: hasSubs ? 'pointer' : 'default',
          userSelect: 'none',
          background: hoverGroup && hasSubs ? 'rgba(255,255,255,0.03)' : 'transparent',
        }}
        onMouseEnter={() => hasSubs && setHoverGroup(true)}
        onMouseLeave={() => setHoverGroup(false)}
        onClick={() => hasSubs && onToggleExpand(grupo.id)}
      >
        {hasSubs ? (
          <span style={{
            fontSize: '0.65rem', color: 'rgba(148,163,184,0.5)',
            transition: 'transform 0.2s',
            transform: expandido ? 'rotate(90deg)' : 'rotate(0deg)',
            display: 'inline-block',
          }}>▶</span>
        ) : (
          <span style={{ width: 12 }} />
        )}

        <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{grupo.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.88rem', fontWeight: 700,
            color: groupState === 'none' ? 'rgba(148,163,184,0.75)' : '#f1f5f9',
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          }}>
            <span>{grupo.label}</span>
            {grupo.homologado && (
              <span style={{
                fontSize: '0.55rem', fontWeight: 800, padding: '1px 7px', borderRadius: 10,
                background: 'rgba(245,158,11,0.16)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>Homologado Particular</span>
            )}
          </div>
          {hasSubs && (
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: accent, marginTop: 1, opacity: 0.85 }}>
              {groupState === 'all' ? `${grupo.filhos.length}/${grupo.filhos.length} ativos` :
               groupState === 'some' ? `${grupo.filhos.filter(f => ativos.has(f.id)).length}/${grupo.filhos.length} ativos` :
               'nenhum ativo'}
            </div>
          )}
        </div>

        <div style={{
          padding: '3px 10px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: groupState === 'all'
            ? 'rgba(16,185,129,0.15)'
            : groupState === 'some'
              ? `${colorDef.accent}20`
              : 'rgba(255,255,255,0.05)',
          color: accent, border: `1px solid ${accent}30`, whiteSpace: 'nowrap',
        }}>
          {groupState === 'all' ? '✓ ATIVO' : groupState === 'some' ? '◐ PARCIAL' : '○ OFF'}
        </div>

        <div onClick={e => e.stopPropagation()}>
          <ToggleSwitch
            isActive={ativos.has(grupo.id)}
            onClick={() => onToggle(grupo.id, 'group')}
          />
        </div>
      </div>

      {hasSubs && expandido && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
          {grupo.filhos.map((filho, fi) => {
            const isLast = fi === grupo.filhos.length - 1;
            const isOn = ativos.has(filho.id);
            return (
              <div
                key={filho.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 18px 10px 48px',
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.03)',
                }}
              >
                <span style={{ fontSize: '0.6rem', color: isOn ? accent : 'rgba(148,163,184,0.25)' }}>
                  {isLast ? '└─' : '├─'}
                </span>
                <span style={{
                  flex: 1, fontSize: '0.84rem',
                  color: isOn ? 'rgba(226,232,240,0.92)' : 'rgba(148,163,184,0.48)',
                  fontWeight: isOn ? 500 : 400,
                }}>
                  {filho.label}
                </span>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isOn ? accent : 'rgba(255,255,255,0.1)',
                  boxShadow: isOn ? `0 0 6px ${accent}` : 'none',
                }} />
                <ToggleSwitch
                  isActive={isOn}
                  onClick={() => onToggle(filho.id, 'child', grupo)}
                  size="sm"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    ativa:     { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Ativa',     dot: '#10b981' },
    bloqueada: { bg: 'rgba(249,115,22,0.15)', color: '#f97316', label: 'Bloqueada', dot: '#f97316' },
    cancelada: { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', label: 'Cancelada', dot: '#ef4444' },
  }[status] || { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', label: status || 'Ativa', dot: '#10b981' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: '0.58rem', fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

export default function PlataformaModulos() {
  const location = useLocation();

  // ── Esfera ativa: 'publica' | 'particular' | 'cre' ──
  const [esfera, setEsfera] = useState('publica');

  // ── Dados das instituições ──
  const [escolas, setEscolas] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [resumoEscolas, setResumoEscolas] = useState({});
  const [resumoCre, setResumoCre] = useState({});

  const [entidadeId, setEntidadeId] = useState(null); // escola_id ou regional_id
  const [perfilSel, setPerfilSel] = useState(null);   // perfil escolar ou cargo_regional
  const [modulosAtivos, setModulosAtivos] = useState(new Set());
  const [creCustomizado, setCreCustomizado] = useState(false);
  const [mostrarAdaptacaoPrivada, setMostrarAdaptacaoPrivada] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [expandidos, setExpandidos] = useState(
    new Set([...MODULOS_TREE_PUBLICA, ...MODULOS_TREE_PARTICULAR, ...MODULOS_TREE_CRE].map(m => m.id))
  );
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [error, setError] = useState(null);

  // ── Manutenção Programada ──
  const [manutData, setManutData] = useState(null);
  const [manutInicio, setManutInicio] = useState('');
  const [manutFim, setManutFim] = useState('');
  const [manutMsg, setManutMsg] = useState('O sistema está em manutenção programada.');
  const [manutSaving, setManutSaving] = useState(false);
  const [manutError, setManutError] = useState(null);
  const [showManutConfirm, setShowManutConfirm] = useState(false);
  const [manutEncerrada, setManutEncerrada] = useState(false);
  const manutAnteriorRef = React.useRef(null);

  const activeTree = useMemo(() => {
    if (esfera === 'cre') return MODULOS_TREE_CRE;
    if (esfera === 'particular') return MODULOS_TREE_PARTICULAR;
    return MODULOS_TREE_PUBLICA;
  }, [esfera]);

  const totalModulosEsfera = useMemo(() => {
    if (esfera === 'cre') return countLeaves(MODULOS_TREE_CRE);
    if (esfera === 'particular') return countLeaves(MODULOS_PARTICULAR_HOMOLOGADOS);
    return countLeaves(MODULOS_TREE_PUBLICA);
  }, [esfera]);

  const mostrarToast = useCallback((texto) => {
    setToastMsg(texto);
    setTimeout(() => setToastMsg(null), 4500);
  }, []);

  // ── Carregar Escolas + Regionais + Resumos ──────────────────────────────────
  const carregarDadosGlobais = useCallback(async () => {
    setSchoolLoading(true);
    try {
      const [escRes, regRes, resEsc, resCre] = await Promise.all([
        api.get('/api/plataforma/escolas'),
        api.get('/api/plataforma/regionais').catch(() => ({ data: { regionais: [] } })),
        api.get('/api/plataforma/modulos/resumo-escolas').catch(() => ({ data: { resumo: {} } })),
        api.get('/api/plataforma/modulos/cre/resumo').catch(() => ({ data: { resumo: {} } })),
      ]);
      const listEsc = Array.isArray(escRes.data?.escolas) ? escRes.data.escolas : Array.isArray(escRes.data) ? escRes.data : [];
      const listReg = Array.isArray(regRes.data?.regionais) ? regRes.data.regionais : Array.isArray(regRes.data) ? regRes.data : [];
      setEscolas(listEsc);
      setRegionais(listReg);
      setResumoEscolas(resEsc.data?.resumo || {});
      setResumoCre(resCre.data?.resumo || {});
    } catch (err) {
      console.error('[PlataformaModulos] erro ao buscar dados:', err);
    } finally {
      setSchoolLoading(false);
    }
  }, []);

  useEffect(() => { carregarDadosGlobais(); }, [carregarDadosGlobais]);

  // Lê query string opcional (?esfera=particular&escola=12) vinda de PlataformaEscolas
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const esfParam = params.get('esfera');
    const escParam = params.get('escola');
    const regParam = params.get('regional');
    if (esfParam && ['publica', 'particular', 'cre'].includes(esfParam)) {
      setEsfera(esfParam);
      setPerfilSel(null);
      setModulosAtivos(new Set());
    }
    if (escParam && Number(escParam) > 0) {
      setEntidadeId(Number(escParam));
    } else if (regParam && Number(regParam) > 0) {
      setEsfera('cre');
      setEntidadeId(Number(regParam));
    }
  }, [location.search]);

  // ── Manutenção ──
  const fetchManutencao = useCallback(async () => {
    try {
      const { data } = await api.get('/api/plataforma/manutencao');
      const novo = data?.manutencao || null;
      if (manutAnteriorRef.current && !novo) {
        setManutEncerrada(true);
        setTimeout(() => setManutEncerrada(false), 8000);
      }
      manutAnteriorRef.current = novo;
      setManutData(novo);
    } catch { setManutData(null); }
  }, []);

  useEffect(() => { fetchManutencao(); }, [fetchManutencao]);

  useEffect(() => {
    if (!manutData) return;
    const interval = setInterval(fetchManutencao, 30000);
    return () => clearInterval(interval);
  }, [manutData, fetchManutencao]);

  const handleAtivarManutencao = () => {
    if (!manutInicio || !manutFim) { setManutError('Informe início e fim.'); return; }
    if (new Date(manutFim) <= new Date(manutInicio)) { setManutError("'Fim' deve ser posterior a 'Início'."); return; }
    setManutError(null);
    setShowManutConfirm(true);
  };

  const handleConfirmarManutencao = async () => {
    setShowManutConfirm(false);
    setManutSaving(true); setManutError(null);
    try {
      await api.post('/api/plataforma/manutencao', {
        inicio: new Date(manutInicio).toISOString(),
        fim: new Date(manutFim).toISOString(),
        mensagem: manutMsg,
      });
      await fetchManutencao();
      setManutInicio(''); setManutFim('');
    } catch (err) {
      setManutError(err.response?.data?.message || 'Erro ao ativar manutenção.');
    } finally { setManutSaving(false); }
  };

  const handleCancelarManutencao = async () => {
    setManutSaving(true); setManutError(null);
    try {
      await api.delete('/api/plataforma/manutencao');
      setManutData(null);
    } catch (err) {
      setManutError(err.response?.data?.message || 'Erro ao cancelar.');
    } finally { setManutSaving(false); }
  };

  // ── Carregar Módulos da Entidade + Perfil/Cargo ─────────────────────────────
  const fetchModulos = useCallback(async (id, perfil, esferaAlvo = esfera) => {
    if (!id || !perfil) return;
    setLoading(true);
    setError(null);
    try {
      const url =
        esferaAlvo === 'cre'
          ? `/api/plataforma/modulos/cre/${id}/cargo/${perfil}`
          : `/api/plataforma/modulos/${id}/perfil/${perfil}`;

      const { data } = await api.get(url);
      const list = Array.isArray(data?.modulos) ? data.modulos : [];
      const treeRef =
        esferaAlvo === 'cre'
          ? MODULOS_TREE_CRE
          : esferaAlvo === 'particular'
          ? MODULOS_TREE_PARTICULAR
          : MODULOS_TREE_PUBLICA;

      const idsPermitidosTree = new Set();
      treeRef.forEach(g => {
        idsPermitidosTree.add(g.id);
        g.filhos.forEach(f => idsPermitidosTree.add(f.id));
      });

      const ativos = new Set(
        list.filter(m => m.ativo && idsPermitidosTree.has(m.modulo)).map(m => m.modulo)
      );

      treeRef.forEach(grupo => {
        if (grupo.filhos.length > 0) {
          const algumFilhoAtivo = grupo.filhos.some(f => ativos.has(f.id));
          if (algumFilhoAtivo) ativos.add(grupo.id);
          else ativos.delete(grupo.id);
        }
      });

      setModulosAtivos(ativos);
      if (esferaAlvo === 'cre') {
        setCreCustomizado(Boolean(data?.customizado));
      }
    } catch (err) {
      console.error('[PlataformaModulos] erro ao buscar módulos:', err);
      setError('Não foi possível carregar os módulos.');
      setModulosAtivos(new Set());
    } finally {
      setLoading(false);
    }
  }, [esfera]);

  const trocarEsfera = (novaEsfera) => {
    if (novaEsfera === esfera) return;
    setEsfera(novaEsfera);
    setEntidadeId(null);
    setPerfilSel(null);
    setModulosAtivos(new Set());
    setSearch('');
    setSaved(false);
    setError(null);
    setMostrarAdaptacaoPrivada(false);
  };

  const selectEntidade = (id) => {
    if (id === entidadeId) return;
    setEntidadeId(id);
    setPerfilSel(null);
    setModulosAtivos(new Set());
    setSaved(false);
    setError(null);
  };

  const selectPerfil = (perfil) => {
    if (perfil === perfilSel) return;
    setPerfilSel(perfil);
    setSaved(false);
    setError(null);
    if (entidadeId) fetchModulos(entidadeId, perfil, esfera);
  };

  // ── Toggle de Módulos ───────────────────────────────────────────────────────
  const handleToggle = useCallback((id, type, grupo) => {
    setSaved(false);
    setModulosAtivos(prev => {
      const next = new Set(prev);
      if (type === 'group') {
        const g = activeTree.find(m => m.id === id);
        if (!g) return next;
        if (g.filhos.length === 0) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }
        if (next.has(id)) {
          g.filhos.forEach(f => next.delete(f.id));
          next.delete(id);
        } else {
          g.filhos.forEach(f => next.add(f.id));
          next.add(id);
        }
        return next;
      }

      if (next.has(id)) {
        next.delete(id);
        if (grupo) {
          const anyOn = grupo.filhos.some(f => f.id !== id && next.has(f.id));
          if (!anyOn) next.delete(grupo.id);
        }
      } else {
        next.add(id);
        if (grupo) next.add(grupo.id);
      }
      return next;
    });
  }, [activeTree]);

  const activarHomologadosEsfera = useCallback(() => {
    setSaved(false);
    const all = new Set();
    const alvo = esfera === 'particular' ? MODULOS_PARTICULAR_HOMOLOGADOS : activeTree;
    alvo.forEach(g => {
      all.add(g.id);
      g.filhos.forEach(f => all.add(f.id));
    });
    setModulosAtivos(all);
  }, [esfera, activeTree]);

  const desativarTodos = useCallback(() => {
    setSaved(false);
    setModulosAtivos(new Set());
  }, []);

  const toggleExpand = useCallback((id) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Salvar Configuração do Perfil / Cargo ───────────────────────────────────
  const salvar = useCallback(async () => {
    if (!entidadeId || !perfilSel) return;
    setSaving(true);
    setError(null);
    try {
      const modulos = [];
      activeTree.forEach(g => {
        modulos.push({ modulo: g.id, ativo: modulosAtivos.has(g.id) });
        g.filhos.forEach(f => {
          modulos.push({ modulo: f.id, ativo: modulosAtivos.has(f.id) });
        });
      });

      if (esfera === 'cre') {
        await api.put(`/api/plataforma/modulos/cre/${entidadeId}/cargo/${perfilSel}`, { modulos });
        setCreCustomizado(true);
      } else {
        await api.put(`/api/plataforma/modulos/${entidadeId}/perfil/${perfilSel}`, { modulos });
      }

      setSaved(true);
      carregarDadosGlobais();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[PlataformaModulos] erro ao salvar:', err);
      setError(err.response?.data?.message || 'Erro ao salvar configuração.');
    } finally {
      setSaving(false);
    }
  }, [entidadeId, perfilSel, modulosAtivos, activeTree, esfera, carregarDadosGlobais]);

  // ── Templates Automáticos de 1 Clique ───────────────────────────────────────
  const aplicarTemplateEntidade = async () => {
    if (!entidadeId) return;
    setApplyingTemplate(true);
    setError(null);
    try {
      if (esfera === 'cre') {
        const { data } = await api.post(`/api/plataforma/modulos/cre/${entidadeId}/aplicar-template`);
        mostrarToast(`✅ ${data?.message || 'Padrão CRE aplicado!'}`);
      } else {
        const { data } = await api.post(`/api/plataforma/modulos/${entidadeId}/aplicar-template`);
        mostrarToast(`✅ ${data?.message || 'Pacote padrão aplicado!'}`);
      }
      await carregarDadosGlobais();
      if (perfilSel) {
        await fetchModulos(entidadeId, perfilSel, esfera);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao aplicar pacote padrão.');
    } finally {
      setApplyingTemplate(false);
    }
  };

  const replicarCreParaTodas = async () => {
    setApplyingTemplate(true);
    setError(null);
    try {
      const payload = entidadeId ? { origem_regional_id: entidadeId } : {};
      const { data } = await api.post('/api/plataforma/modulos/cre/aplicar-template-todas', payload);
      mostrarToast(`🌐 ${data?.message || 'Padrão replicado em todas as CREs!'}`);
      await carregarDadosGlobais();
      if (entidadeId && perfilSel) {
        await fetchModulos(entidadeId, perfilSel, 'cre');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao replicar para todas as CREs.');
    } finally {
      setApplyingTemplate(false);
    }
  };

  // ── Copiar de outra escola da mesma origem ──────────────────────────────────
  const copiarDe = useCallback(async (origemId) => {
    if (!entidadeId || !perfilSel || esfera === 'cre') return;
    setShowCopyModal(false);
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/plataforma/modulos/${entidadeId}/copiar-de/${origemId}/perfil/${perfilSel}`);
      await fetchModulos(entidadeId, perfilSel, esfera);
      carregarDadosGlobais();
      mostrarToast('✅ Configuração copiada com sucesso!');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao copiar configuração.');
    } finally {
      setLoading(false);
    }
  }, [entidadeId, perfilSel, esfera, fetchModulos, carregarDadosGlobais, mostrarToast]);

  // ── Listas Filtradas por Esfera ─────────────────────────────────────────────
  const escolasPublicas = useMemo(
    () => escolas.filter(e => e.origem !== 'particular'),
    [escolas]
  );
  const escolasParticulares = useMemo(
    () => escolas.filter(e => e.origem === 'particular'),
    [escolas]
  );

  const listaColunaEsquerda = useMemo(() => {
    const base =
      esfera === 'cre'
        ? regionais
        : esfera === 'particular'
        ? escolasParticulares
        : escolasPublicas;

    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(item =>
      item.nome?.toLowerCase().includes(q) ||
      item.apelido?.toLowerCase().includes(q) ||
      item.codigo_cre?.toLowerCase().includes(q) ||
      item.regional_apelido?.toLowerCase().includes(q)
    );
  }, [esfera, regionais, escolasParticulares, escolasPublicas, search]);

  const entidadeSelecionada = useMemo(() => {
    const base = esfera === 'cre' ? regionais : escolas;
    return base.find(x => Number(x.id) === Number(entidadeId)) || null;
  }, [esfera, regionais, escolas, entidadeId]);

  const perfisDaEsfera = useMemo(() => {
    if (esfera === 'cre') return CARGOS_CRE_LISTA;
    if (esfera === 'particular') return PERFIS_ESCOLA_PARTICULAR;
    return PERFIS_ESCOLA_PUBLICA;
  }, [esfera]);

  // Conta apenas folhas (ou grupo sem filhos) ativos para não inflar com IDs de pais
  const countFolhasAtivas = useMemo(() => {
    let c = 0;
    activeTree.forEach(g => {
      if (g.filhos.length === 0) {
        if (modulosAtivos.has(g.id)) c += 1;
      } else {
        g.filhos.forEach(f => {
          if (modulosAtivos.has(f.id)) c += 1;
        });
      }
    });
    return c;
  }, [activeTree, modulosAtivos]);

  const ESFERA_META = {
    publica: {
      titulo: 'Escolas Públicas',
      cor: '#10b981',
      grad: 'linear-gradient(135deg, #10b981, #059669)',
      bgSoft: 'rgba(16,185,129,0.12)',
      border: 'rgba(16,185,129,0.35)',
      icone: '🏛️',
      btnTemplate: '⚡ Aplicar Pacote Padrão (Rede Pública)',
    },
    particular: {
      titulo: 'Escolas Particulares',
      cor: '#f59e0b',
      grad: 'linear-gradient(135deg, #f59e0b, #d97706)',
      bgSoft: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.35)',
      icone: '🏫',
      btnTemplate: '⚡ Aplicar Pacote Inicial (Rede Particular)',
    },
    cre: {
      titulo: 'Regionais de Ensino (CREs)',
      cor: '#a855f7',
      grad: 'linear-gradient(135deg, #a855f7, #7c3aed)',
      bgSoft: 'rgba(168,85,247,0.14)',
      border: 'rgba(168,85,247,0.38)',
      icone: '🗺️',
      btnTemplate: '⚡ Aplicar Padrão nesta CRE',
    },
  }[esfera];

  const Spinner = ({ size = 32 }) => (
    <div style={{
      width: size, height: size,
      border: `${Math.max(2, size / 12)}px solid rgba(255,255,255,0.06)`,
      borderTop: `${Math.max(2, size / 12)}px solid ${ESFERA_META.cor}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );

  return (
    <div style={{
      width: '100%', height: '100vh',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      background: '#060d1f', color: '#f1f5f9',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .mod-fade { animation: fadeInUp 0.25s ease forwards; }
        .s-row { transition: all 0.15s; cursor: pointer; }
        .s-row:hover { background: rgba(255,255,255,0.04) !important; }
        .p-chip { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
        .p-chip:hover { transform: translateY(-3px) !important; border-color: rgba(139,92,246,0.45) !important; box-shadow: 0 8px 22px rgba(99,102,241,0.2) !important; }
        *::-webkit-scrollbar { width: 4px; }
        *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* ══ HERO BAR ══ */}
      <div style={{
        padding: '0 24px', height: 60, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(6,13,31,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: ESFERA_META.grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.95rem',
          }}>{ESFERA_META.icone}</div>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f1f5f9' }}>
              Central de Modulação Institucional · {ESFERA_META.titulo}
            </div>
            <div style={{ fontSize: '0.66rem', color: 'rgba(148,163,184,0.55)', marginTop: 1 }}>
              {escolasPublicas.length} Públicas · {escolasParticulares.length} Particulares · {regionais.length} CREs
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {toastMsg && (
            <span style={{
              padding: '5px 12px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 700,
              background: 'rgba(16,185,129,0.14)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)',
            }}>{toastMsg}</span>
          )}
          <button
            onClick={carregarDadosGlobais}
            disabled={schoolLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.09)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(203,213,225,0.8)',
              fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            <span>⟳</span> {schoolLoading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ─── COLUNA ESQUERDA: SELETOR DE ESFERA (3 ABAS) + LISTA ─── */}
        <div style={{
          width: 286, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: 'rgba(255,255,255,0.016)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          {/* 3 Abas de Esfera Institucional */}
          <div style={{ padding: '12px 10px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              fontSize: '0.56rem', fontWeight: 800, letterSpacing: '0.09em',
              color: 'rgba(148,163,184,0.45)', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2,
            }}>
              Esfera Institucional
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 10 }}>
              {[
                { k: 'publica', label: 'Públicas', icon: '🏛️', count: escolasPublicas.length, cor: '#10b981', bg: 'rgba(16,185,129,0.16)', bd: 'rgba(16,185,129,0.45)' },
                { k: 'particular', label: 'Partic.', icon: '🏫', count: escolasParticulares.length, cor: '#fbbf24', bg: 'rgba(245,158,11,0.16)', bd: 'rgba(245,158,11,0.45)' },
                { k: 'cre', label: 'CREs', icon: '🗺️', count: regionais.length, cor: '#c084fc', bg: 'rgba(168,85,247,0.18)', bd: 'rgba(168,85,247,0.45)' },
              ].map(tab => {
                const ativa = esfera === tab.k;
                return (
                  <button
                    key={tab.k}
                    type="button"
                    onClick={() => trocarEsfera(tab.k)}
                    style={{
                      padding: '7px 4px', borderRadius: 9, cursor: 'pointer',
                      background: ativa ? tab.bg : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${ativa ? tab.bd : 'rgba(255,255,255,0.06)'}`,
                      color: ativa ? '#ffffff' : 'rgba(148,163,184,0.7)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      transition: 'all 0.18s',
                    }}
                  >
                    <span style={{ fontSize: '0.88rem', lineHeight: 1 }}>{tab.icon}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>{tab.label}</span>
                    <span style={{ fontSize: '0.58rem', fontWeight: 700, color: ativa ? tab.cor : 'rgba(148,163,184,0.45)' }}>
                      ({tab.count})
                    </span>
                  </button>
                );
              })}
            </div>

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={esfera === 'cre' ? '🔍 Buscar CRE...' : '🔍 Buscar instituição...'}
              style={{
                width: '100%', padding: '8px 11px', borderRadius: 8,
                fontSize: '0.78rem', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Lista de Instituições da Esfera Selecionada */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
            {schoolLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner /></div>
            ) : listaColunaEsquerda.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'rgba(148,163,184,0.4)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                {search
                  ? 'Nenhum resultado encontrado.'
                  : esfera === 'particular'
                  ? 'Nenhuma escola particular cadastrada ainda em Instituições → Escolas.'
                  : esfera === 'cre'
                  ? 'Nenhuma Regional (CRE) cadastrada.'
                  : 'Nenhuma escola pública cadastrada.'}
              </div>
            ) : (
              listaColunaEsquerda.map(item => {
                const isSel = Number(item.id) === Number(entidadeId);
                const resumoItem = esfera === 'cre' ? resumoCre[item.id] : resumoEscolas[item.id];
                return (
                  <div
                    key={item.id}
                    className="s-row"
                    onClick={() => selectEntidade(item.id)}
                    style={{
                      padding: '10px 11px', borderRadius: 10, marginBottom: 4,
                      background: isSel ? ESFERA_META.bgSoft : 'transparent',
                      border: `1px solid ${isSel ? ESFERA_META.border : 'transparent'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.76rem', fontWeight: 700,
                          color: isSel ? '#ffffff' : 'rgba(226,232,240,0.8)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {item.nome}
                        </div>
                        <div style={{
                          fontSize: '0.62rem', color: 'rgba(148,163,184,0.5)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2,
                        }}>
                          {esfera === 'cre'
                            ? (item.codigo_cre || item.apelido || 'SEEDF')
                            : (item.regional_apelido ? `🏛️ ${item.regional_apelido}` : item.apelido || '')}
                        </div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{
                        fontSize: '0.57rem', fontWeight: 700,
                        color: isSel ? ESFERA_META.cor : 'rgba(148,163,184,0.42)',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '1px 7px', borderRadius: 5,
                      }}>
                        {esfera === 'cre'
                          ? (resumoItem?.customizado ? `${resumoItem.cargos_ativos} cargos mod.` : 'Padrão ativo')
                          : (resumoItem?.perfis_ativos ? `${resumoItem.perfis_ativos} perfis config.` : 'Sem config.')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── PAINEL PRINCIPAL ─── */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 26px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── MANUTENÇÃO PROGRAMADA ── */}
            <div style={{
              padding: '14px 20px', borderRadius: 13, flexShrink: 0,
              background: manutData ? 'rgba(245,158,11,0.07)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${manutData ? 'rgba(245,158,11,0.22)' : 'rgba(255,255,255,0.05)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: manutData ? 11 : 0 }}>
                <span style={{ fontSize: '1rem' }}>🔧</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f1f5f9' }}>Manutenção Programada</span>
                {manutData ? (
                  <span style={{
                    padding: '2px 7px', borderRadius: 20, fontSize: '0.55rem', fontWeight: 800,
                    textTransform: 'uppercase',
                    background: manutData.em_andamento ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                    color: manutData.em_andamento ? '#f87171' : '#fbbf24',
                  }}>
                    {manutData.em_andamento ? '● Em andamento' : '◑ Agendada'}
                  </span>
                ) : (
                  <span style={{
                    padding: '2px 7px', borderRadius: 20, fontSize: '0.55rem', fontWeight: 800,
                    textTransform: 'uppercase', background: 'rgba(16,185,129,0.1)', color: '#34d399',
                  }}>● Sistema Normal</span>
                )}
                {manutEncerrada && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#34d399' }}>
                    ✅ Manutenção encerrada — acesso restaurado
                  </span>
                )}
              </div>

              {manutData ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 600 }}>
                      {new Date(manutData.inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} →{' '}
                      {new Date(manutData.fim).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </div>
                    {manutData.mensagem && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)', marginTop: 3 }}>{manutData.mensagem}</div>
                    )}
                  </div>
                  <button
                    onClick={handleCancelarManutencao}
                    disabled={manutSaving}
                    style={{
                      padding: '7px 15px', borderRadius: 9, border: 'none',
                      background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                      color: '#fff', fontWeight: 700, fontSize: '0.77rem', cursor: 'pointer',
                    }}
                  >{manutSaving ? 'Cancelando...' : '✕ Cancelar Manutenção'}</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 11 }}>
                  {[
                    { label: 'Início', value: manutInicio, onChange: e => setManutInicio(e.target.value), type: 'datetime-local', flex: '1 1 150px' },
                    { label: 'Fim',    value: manutFim,    onChange: e => setManutFim(e.target.value),    type: 'datetime-local', flex: '1 1 150px' },
                  ].map(({ label, value, onChange, type, flex }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3, flex }}>
                      <label style={{ fontSize: '0.57rem', fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase' }}>{label}</label>
                      <input type={type} value={value} onChange={onChange} style={{
                        padding: '7px 9px', borderRadius: 8, fontSize: '0.78rem',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9',
                      }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '2 1 180px' }}>
                    <label style={{ fontSize: '0.57rem', fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase' }}>Mensagem</label>
                    <input
                      type="text" value={manutMsg} onChange={e => setManutMsg(e.target.value)}
                      style={{
                        padding: '7px 9px', borderRadius: 8, fontSize: '0.78rem',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9',
                      }}
                    />
                  </div>
                  <button
                    onClick={handleAtivarManutencao}
                    disabled={manutSaving}
                    style={{
                      padding: '7px 15px', borderRadius: 9, border: 'none',
                      background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                      color: '#fff', fontWeight: 700, fontSize: '0.77rem', cursor: 'pointer',
                    }}
                  >{manutSaving ? 'Ativando...' : '🚀 Ativar Manutenção'}</button>
                </div>
              )}
              {manutError && (
                <div style={{ marginTop: 9, fontSize: '0.73rem', color: '#f87171' }}>{manutError}</div>
              )}
            </div>

            {/* ── NENHUMA ENTIDADE SELECIONADA ── */}
            {!entidadeId && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 300 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.4 }}>{ESFERA_META.icone}</div>
                <div style={{ fontSize: '1.02rem', fontWeight: 700, color: 'rgba(226,232,240,0.65)', marginBottom: 7 }}>
                  Selecione uma instituição em {ESFERA_META.titulo}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(148,163,184,0.45)', maxWidth: 360, lineHeight: 1.6 }}>
                  {esfera === 'cre'
                    ? 'Escolha uma Coordenação Regional de Ensino à esquerda para modular os acessos de cada cargo orgânico (Gabinete, UNIAG, UNIEB, UNIPLAT, UNIGEP e UNIAE).'
                    : esfera === 'particular'
                    ? 'Escolha uma Escola Particular à esquerda. Apenas módulos compatíveis com a rede privada são habilitados.'
                    : 'Escolha uma Escola Pública à esquerda para configurar os módulos por perfil ou aplicar o pacote padrão em 1 clique.'}
                </div>

                {esfera === 'cre' && regionais.length > 0 && (
                  <button
                    onClick={replicarCreParaTodas}
                    disabled={applyingTemplate}
                    style={{
                      marginTop: 18, padding: '9px 18px', borderRadius: 10,
                      border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.14)',
                      color: '#e9d5ff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                    }}
                  >
                    {applyingTemplate ? 'Aplicando...' : `🌐 Garantir Padrão Inicial nas ${regionais.length} CREs`}
                  </button>
                )}
              </div>
            )}

            {/* ── ENTIDADE SELECIONADA — ESCOLHA DE PERFIL / CARGO ── */}
            {entidadeId && !perfilSel && entidadeSelecionada && (
              <div className="mod-fade" style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                  marginBottom: 20, padding: '16px 20px', borderRadius: 14, flexWrap: 'wrap',
                  background: ESFERA_META.bgSoft, border: `1px solid ${ESFERA_META.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 11, background: ESFERA_META.grad,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem',
                    }}>{ESFERA_META.icone}</div>
                    <div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff', marginBottom: 3 }}>
                        {entidadeSelecionada.nome}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <StatusBadge status={entidadeSelecionada.status} />
                        <span style={{ fontSize: '0.68rem', color: 'rgba(226,232,240,0.7)', fontWeight: 600 }}>
                          {ESFERA_META.titulo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações Rápidas de Template 1 Clique */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={aplicarTemplateEntidade}
                      disabled={applyingTemplate}
                      style={{
                        padding: '8px 15px', borderRadius: 10, border: 'none',
                        background: ESFERA_META.grad, color: '#ffffff',
                        fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                      }}
                    >
                      {applyingTemplate ? 'Aplicando...' : ESFERA_META.btnTemplate}
                    </button>

                    {esfera === 'cre' && (
                      <button
                        onClick={replicarCreParaTodas}
                        disabled={applyingTemplate}
                        style={{
                          padding: '8px 14px', borderRadius: 10,
                          border: '1px solid rgba(192,132,252,0.45)', background: 'rgba(168,85,247,0.16)',
                          color: '#f3e8ff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                        }}
                      >
                        🌐 Replicar esta CRE para todas as {regionais.length} CREs
                      </button>
                    )}
                  </div>
                </div>

                {esfera === 'particular' && (
                  <div style={{
                    marginBottom: 16, padding: '11px 15px', borderRadius: 11,
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                    fontSize: '0.76rem', color: '#fde68a', lineHeight: 1.55,
                  }}>
                    🛡️ <strong>Isolamento Rede Particular Ativo:</strong> Módulos governamentais da SEEDF (`Agente EDUCADF`, `PDAF`, `PDDE`, `Sincronizar SEEDF`) estão bloqueados nesta esfera. O botão de 1 clique ativa exclusivamente o núcleo privado homologado (`Direção`, `Financeiro Particular`, `Comunicação` e `Monitoramento`).
                  </div>
                )}

                <div style={{
                  fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.09em',
                  color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', marginBottom: 12,
                }}>
                  {esfera === 'cre'
                    ? 'Selecione o cargo regional para modular'
                    : 'Selecione o perfil da instituição para modular'}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: esfera === 'cre' ? 'repeat(auto-fill, minmax(200px, 1fr))' : 'repeat(auto-fill, minmax(132px, 1fr))',
                  gap: 10,
                }}>
                  {perfisDaEsfera.map(p => (
                    <div
                      key={p.key}
                      className="p-chip"
                      onClick={() => selectPerfil(p.key)}
                      style={{
                        padding: '16px 12px 14px', borderRadius: 13,
                        background: 'rgba(255,255,255,0.028)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        textAlign: 'center', userSelect: 'none',
                      }}
                    >
                      <div style={{ fontSize: '1.45rem', marginBottom: 7, lineHeight: 1 }}>
                        {PERFIL_ICONS[p.key] || '👤'}
                      </div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>
                        {p.label}
                      </div>
                      {p.sigla && (
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#c084fc', marginTop: 4 }}>
                          {p.sigla}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ENTIDADE + PERFIL/CARGO SELECIONADOS — INTERRUPTORES ── */}
            {entidadeId && perfilSel && entidadeSelecionada && (
              <div className="mod-fade" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Header de Configuração */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'rgba(148,163,184,0.55)', marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{entidadeSelecionada.nome}</span>
                      <span>›</span>
                      <span style={{ color: ESFERA_META.cor, fontWeight: 700 }}>
                        {PERFIL_ICONS[perfilSel] || '👤'} {perfisDaEsfera.find(p => p.key === perfilSel)?.label || perfilSel}
                      </span>
                      <button
                        onClick={() => { setPerfilSel(null); setModulosAtivos(new Set()); setSaved(false); }}
                        style={{
                          padding: '2px 9px', borderRadius: 6,
                          border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
                          color: '#cbd5e1', fontSize: '0.64rem', cursor: 'pointer',
                        }}
                      >← trocar {esfera === 'cre' ? 'cargo' : 'perfil'}</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <StatusBadge status={entidadeSelecionada.status} />
                      <span style={{
                        padding: '2px 10px', borderRadius: 20,
                        background: ESFERA_META.bgSoft, border: `1px solid ${ESFERA_META.border}`,
                        fontSize: '0.63rem', fontWeight: 800, color: ESFERA_META.cor,
                      }}>
                        {countFolhasAtivas} módulos ativos
                      </span>
                      {esfera === 'cre' && !creCustomizado && (
                        <span style={{ fontSize: '0.63rem', color: 'rgba(192,132,252,0.8)' }}>
                          (Usando padrão institucional SEEDF — salve para personalizar)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      onClick={activarHomologadosEsfera}
                      style={{
                        padding: '7px 13px', borderRadius: 8,
                        border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)',
                        color: '#34d399', fontWeight: 700, fontSize: '0.73rem', cursor: 'pointer',
                      }}
                    >
                      {esfera === 'particular' ? '✓ Ativar Núcleo Homologado' : '✓ Ativar Todos'}
                    </button>
                    <button
                      onClick={desativarTodos}
                      style={{
                        padding: '7px 13px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(203,213,225,0.75)', fontWeight: 700, fontSize: '0.73rem', cursor: 'pointer',
                      }}
                    >✕ Desativar Todos</button>

                    {esfera !== 'cre' && (
                      <button
                        onClick={() => setShowCopyModal(true)}
                        style={{
                          padding: '7px 13px', borderRadius: 8,
                          border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)',
                          color: '#60a5fa', fontWeight: 700, fontSize: '0.73rem', cursor: 'pointer',
                        }}
                      >📋 Copiar de outra {esfera === 'particular' ? 'particular' : 'pública'}</button>
                    )}

                    <button
                      onClick={salvar}
                      disabled={saving}
                      style={{
                        padding: '8px 20px', borderRadius: 10, border: 'none',
                        background: saved
                          ? 'linear-gradient(135deg,#10b981,#059669)'
                          : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {saving ? <><Spinner size={13} /> Salvando...</> : saved ? '✓ Salvo!' : '💾 Salvar'}
                    </button>
                  </div>
                </div>

                {/* Erro */}
                {error && (
                  <div style={{
                    padding: '9px 13px', borderRadius: 9,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
                    color: '#fca5a5', fontSize: '0.78rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span>⚠️</span> {error}
                    <button
                      onClick={() => setError(null)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}
                    >✕</button>
                  </div>
                )}

                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spinner size={38} />
                  </div>
                ) : esfera === 'particular' ? (
                  <>
                    {/* 1) Núcleo Homologado para Escola Particular */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
                      {MODULOS_PARTICULAR_HOMOLOGADOS.map((grupo, gi) => (
                        <ModuloGrupo
                          key={grupo.id}
                          grupo={grupo}
                          colorDef={GROUP_COLORS[gi % GROUP_COLORS.length]}
                          ativos={modulosAtivos}
                          onToggle={handleToggle}
                          expandido={expandidos.has(grupo.id)}
                          onToggleExpand={toggleExpand}
                        />
                      ))}
                    </div>

                    {/* 2) Gaveta Recolhida: Módulos Base em Adaptação para Rede Particular */}
                    <div style={{
                      marginTop: 8, borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.015)', overflow: 'hidden',
                    }}>
                      <button
                        type="button"
                        onClick={() => setMostrarAdaptacaoPrivada(v => !v)}
                        style={{
                          width: '100%', padding: '13px 18px', background: 'transparent', border: 'none',
                          color: 'rgba(203,213,225,0.8)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                            ⚙️ Módulos Acadêmicos Base (Em adaptação da Rede Pública para Particular)
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.55)', marginTop: 2 }}>
                            Desligados por padrão no pacote inicial. Ative individualmente apenas conforme cada módulo for homologado para escolas privadas.
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>
                          {mostrarAdaptacaoPrivada ? '▲ Recolher' : `▼ Exibir (${MODULOS_PARTICULAR_EM_ADAPTACAO.length})`}
                        </span>
                      </button>

                      {mostrarAdaptacaoPrivada && (
                        <div style={{
                          padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10,
                        }}>
                          {MODULOS_PARTICULAR_EM_ADAPTACAO.map((grupo, gi) => (
                            <ModuloGrupo
                              key={grupo.id}
                              grupo={grupo}
                              colorDef={GROUP_COLORS[(gi + 2) % GROUP_COLORS.length]}
                              ativos={modulosAtivos}
                              onToggle={handleToggle}
                              expandido={expandidos.has(grupo.id)}
                              onToggleExpand={toggleExpand}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: esfera === 'cre' ? '1fr' : 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: 10,
                  }}>
                    {activeTree.map((grupo, gi) => (
                      <ModuloGrupo
                        key={grupo.id}
                        grupo={grupo}
                        colorDef={GROUP_COLORS[gi % GROUP_COLORS.length]}
                        ativos={modulosAtivos}
                        onToggle={handleToggle}
                        expandido={expandidos.has(grupo.id)}
                        onToggleExpand={toggleExpand}
                      />
                    ))}
                  </div>
                )}

                {/* Barra Inferior de Salvamento */}
                {!loading && (
                  <div style={{
                    padding: '14px 20px', borderRadius: 12,
                    background: 'rgba(99,102,241,0.05)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>
                        Configuração de <span style={{ color: ESFERA_META.cor }}>{entidadeSelecionada.nome}</span>
                        {' · '}
                        <span style={{ color: '#cbd5e1' }}>
                          {PERFIL_ICONS[perfilSel]} {perfisDaEsfera.find(p => p.key === perfilSel)?.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'rgba(148,163,184,0.5)', marginTop: 2 }}>
                        As alterações entram em vigor em até 30 segundos nas sessões ativas, sem exigir novo login.
                      </div>
                    </div>
                    <button
                      onClick={salvar}
                      disabled={saving}
                      style={{
                        padding: '9px 22px', borderRadius: 10, border: 'none',
                        background: saved
                          ? 'linear-gradient(135deg,#10b981,#059669)'
                          : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color: '#fff', fontWeight: 800, fontSize: '0.83rem', cursor: 'pointer',
                      }}
                    >
                      {saving ? 'Salvando...' : saved ? '✓ Configuração salva!' : '💾 Salvar Configuração'}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ══ MODAL: Confirmação Manutenção ══ */}
      {showManutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg,#1e293b,#0f172a)',
            border: '1px solid rgba(245,158,11,0.28)', borderRadius: 20, padding: '30px 34px',
            width: '100%', maxWidth: 430,
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9', textAlign: 'center', marginBottom: 14 }}>
              🔧 Confirmar Manutenção
            </h3>
            <div style={{
              background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)',
              borderRadius: 10, padding: '11px 15px', marginBottom: 18, fontSize: '0.78rem', color: '#fbbf24', lineHeight: 1.7,
            }}>
              <div><strong>Início:</strong> {manutInicio ? new Date(manutInicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}</div>
              <div><strong>Fim:</strong> {manutFim ? new Date(manutFim).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}</div>
              <div><strong>Mensagem:</strong> "{manutMsg}"</div>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button
                onClick={() => setShowManutConfirm(false)}
                style={{
                  flex: 1, padding: '10px 18px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                  color: '#cbd5e1', fontWeight: 600, cursor: 'pointer',
                }}
              >Cancelar</button>
              <button
                onClick={handleConfirmarManutencao}
                style={{
                  flex: 1, padding: '10px 18px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                  color: '#fff', fontWeight: 700, cursor: 'pointer',
                }}
              >🚀 Confirmar e Ativar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Copiar de Outra Escola da Mesma Natureza ══ */}
      {showCopyModal && esfera !== 'cre' && (
        <CopyModal
          escolas={esfera === 'particular' ? escolasParticulares : escolasPublicas}
          escolaAtual={entidadeSelecionada}
          esferaLabel={esfera === 'particular' ? 'Escolas Particulares' : 'Escolas Públicas'}
          onConfirm={copiarDe}
          onClose={() => setShowCopyModal(false)}
        />
      )}
    </div>
  );
}
