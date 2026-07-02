/**
 * SidebarGuards.js — Variáveis de controle de acesso da Sidebar
 *
 * ⚠️  ARQUIVO PROTEGIDO — DECISÕES ARQUITETURAIS
 * ================================================================
 * Este arquivo contém as regras de acesso centralizadas da Sidebar.
 * Editar o Sidebar.jsx NÃO afeta essas regras.
 *
 * HISTÓRICO DE DECISÕES (não reverter sem aprovação):
 *
 * [GOVERNANÇA v2 — commit a4492a8d — 2026-07-01]
 *   - Perfil 'militar' foi RENOMEADO para 'diretor_disciplinar'
 *   - isMilitar = 'diretor_disciplinar' || 'comandante'   ← NÃO mudar para 'militar'
 *   - canGovernanca inclui 'diretor_disciplinar'           ← NÃO remover
 *
 * [REGRA ÚNICA DISCIPLINAR — commit 9f557de9 — 2026-06-30]
 *   - Apenas isDisciplinar vê o menu DISCIPLINAR
 *   - isCCMDF e isDiretorPedagogicoCCMDF foram REMOVIDOS intencionalmente
 *   - NÃO restaurar isCCMDF sem decisão arquitetural explícita
 *
 * [ESTUDANTES — commit 4bdf5bf8 — 2026-07-02]
 *   - Link Estudantes usa hasModulo('estudantes')          ← NÃO usar 'secretaria.alunos'
 *
 * [SECRETARIA — commit eea7c000 — 2026-07-02]
 *   - Bloco SECRETARIA é INDEPENDENTE de canAgenteEduca   ← NÃO aninhar dentro
 *
 * [FREQUÊNCIA professor — commit 580eff16 — 2026-07-02]
 *   - hasModulo('frequencia') obrigatório no bloco professor
 *   - Cada <li> com hasModulo('frequencia.submenu')
 * ================================================================
 */

/**
 * Conjunto de perfis com acesso ao módulo DISCIPLINAR.
 * REGRA: apenas estes perfis veem o menu Disciplinar — independente da escola.
 * NÃO adicionar outros perfis aqui sem aprovação.
 */
export const PERFIS_MILITARES = [
  'disciplinar',
  'diretor_disciplinar',  // ← era 'militar' antes de 2026-07-01 (GOVERNANÇA v2)
  'comandante',
];

export const PERFIS_MILITARES_SET = new Set(PERFIS_MILITARES);

/**
 * Perfis que podem acessar Governança (cada um vê apenas seu domínio).
 * REGRA: inclui diretor_disciplinar — ele tem sua própria aba de governança.
 * NÃO remover diretor_disciplinar daqui.
 */
export const PERFIS_GOVERNANCA = [
  'diretor',
  'vice_diretor',
  'diretor_disciplinar',  // ← adicionado em GOVERNANÇA v2 (commit a4492a8d)
];

/**
 * Perfis bloqueados do Agente EDUCA (acesso exclusivo aos módulos militares).
 * REGRA: usa diretor_disciplinar, NÃO 'militar'.
 */
export const PERFIS_SEM_AGENTE_EDUCA = new Set([
  'diretor_disciplinar',
  'comandante',
]);

/**
 * Perfis que veem o link "Gestão de Equipe" no menu Disciplinar.
 */
export const PERFIS_GESTAO_EQUIPE = new Set([
  'diretor',
  'diretor_disciplinar',  // ← era 'militar' antes de GOVERNANÇA v2
]);

/**
 * Retorna o perfil do usuário logado (normalizado).
 */
export function getPerfil() {
  return String(localStorage.getItem('perfil') || '').toLowerCase().trim();
}

/**
 * Retorna o estado inicial do grupo aberto na sidebar.
 * Perfis disciplinares/militares começam com o grupo Disciplinar aberto.
 */
export function getInitialOpenGroup() {
  const p = getPerfil();
  // 'diretor_disciplinar' e 'comandante' abrem direto no menu Disciplinar
  return (p === 'diretor_disciplinar' || p === 'comandante') ? 'disciplinar' : null;
}
