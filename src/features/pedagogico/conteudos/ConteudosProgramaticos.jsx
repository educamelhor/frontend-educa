import React, { useState } from "react";
import "./ConteudosProgramaticos.css";

// ── Dados mock ─────────────────────────────────────────────────────────────
const SERIES = ["6º Ano", "7º Ano", "8º Ano", "9º Ano"];

const DISCIPLINAS = [
  "Língua Portuguesa", "Matemática", "Ciências", "História",
  "Geografia", "Inglês", "Arte", "Educação Física", "Ensino Religioso",
];

const BIMESTRES = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];

const STATUS_COLORS = {
  APROVADO:   { bg: "#d1fae5", text: "#065f46", dot: "#10b981", label: "Aprovado" },
  ENVIADO:    { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6", label: "Em Revisão" },
  RASCUNHO:   { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8", label: "Rascunho" },
  PENDENTE:   { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b", label: "Pendente" },
};

const COR_SERIE = {
  "6º Ano": "#6366f1", "7º Ano": "#0ea5e9",
  "8º Ano": "#10b981", "9º Ano": "#f59e0b",
};

// Mock de conteúdos por série+disciplina+bimestre
const MOCK_CONTEUDOS = [
  { id: 1, serie: "6º Ano", disciplina: "Língua Portuguesa", bimestre: "1º Bimestre", unidade: "Leitura e Interpretação", conteudo: "Gêneros textuais: narrativo, descritivo e argumentativo", objetivo: "Identificar e interpretar diferentes gêneros textuais", status: "APROVADO", itens: 4 },
  { id: 2, serie: "6º Ano", disciplina: "Língua Portuguesa", bimestre: "2º Bimestre", unidade: "Produção Textual", conteudo: "Conto, crônica e poema — características e produção", objetivo: "Produzir textos com coesão e coerência", status: "ENVIADO", itens: 3 },
  { id: 3, serie: "6º Ano", disciplina: "Matemática", bimestre: "1º Bimestre", unidade: "Números Naturais", conteudo: "Operações fundamentais, potenciação e radiciação", objetivo: "Resolver problemas com operações de números naturais", status: "APROVADO", itens: 6 },
  { id: 4, serie: "6º Ano", disciplina: "Matemática", bimestre: "2º Bimestre", unidade: "Frações e Decimais", conteudo: "Fração como parte de um todo, operações com frações", objetivo: "Compreender frações e aplicar em situações-problema", status: "RASCUNHO", itens: 2 },
  { id: 5, serie: "7º Ano", disciplina: "Ciências", bimestre: "1º Bimestre", unidade: "Célula e Vida", conteudo: "Célula animal e vegetal, organelas e funções vitais", objetivo: "Reconhecer as estruturas celulares e suas funções", status: "APROVADO", itens: 5 },
  { id: 6, serie: "7º Ano", disciplina: "História", bimestre: "1º Bimestre", unidade: "Idade Média", conteudo: "Feudalismo, Igreja Católica e poder medieval", objetivo: "Analisar o sistema feudal e sua estrutura social", status: "PENDENTE", itens: 0 },
  { id: 7, serie: "8º Ano", disciplina: "Geografia", bimestre: "1º Bimestre", unidade: "Geopolítica", conteudo: "Globalização, blocos econômicos e relações internacionais", objetivo: "Compreender o cenário geopolítico contemporâneo", status: "ENVIADO", itens: 3 },
  { id: 8, serie: "9º Ano", disciplina: "Matemática", bimestre: "1º Bimestre", unidade: "Álgebra", conteudo: "Funções: linear, quadrática e exponencial", objetivo: "Representar e analisar funções matemáticas", status: "APROVADO", itens: 7 },
];

// ── Ícones SVG inline ──────────────────────────────────────────────────────
const IcoPlus  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="cp-icon"><path d="M12 5v14M5 12h14"/></svg>;
const IcoEdit  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoEye   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoCheck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="cp-icon"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoBook  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const IcoFilter = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IcoStats = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cp-icon"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

// ── Componente principal ───────────────────────────────────────────────────
export default function ConteudosProgramaticos() {
  const [serieFiltro, setSerieFiltro]         = useState("Todas");
  const [discFiltro, setDiscFiltro]           = useState("Todas");
  const [bimestreFiltro, setBimestreFiltro]   = useState("Todos");
  const [statusFiltro, setStatusFiltro]       = useState("Todos");
  const [viewMode, setViewMode]               = useState("cards"); // "cards" | "table"
  const [modalOpen, setModalOpen]             = useState(false);
  const [detalheItem, setDetalheItem]         = useState(null);

  // Filtros aplicados
  const filtered = MOCK_CONTEUDOS.filter(c =>
    (serieFiltro    === "Todas" || c.serie       === serieFiltro) &&
    (discFiltro     === "Todas" || c.disciplina  === discFiltro) &&
    (bimestreFiltro === "Todos" || c.bimestre    === bimestreFiltro) &&
    (statusFiltro   === "Todos" || c.status      === statusFiltro)
  );

  // KPIs
  const total    = MOCK_CONTEUDOS.length;
  const aprovado = MOCK_CONTEUDOS.filter(c => c.status === "APROVADO").length;
  const revisao  = MOCK_CONTEUDOS.filter(c => c.status === "ENVIADO").length;
  const pendente = MOCK_CONTEUDOS.filter(c => c.status === "PENDENTE" || c.status === "RASCUNHO").length;
  const pctOk    = Math.round((aprovado / total) * 100);

  return (
    <div className="cp-root">
      {/* ── Header ── */}
      <div className="cp-header">
        <div className="cp-header-left">
          <div className="cp-header-icon"><IcoBook /></div>
          <div>
            <h1 className="cp-title">Conteúdos Programáticos</h1>
            <p className="cp-subtitle">Gestão curricular por série, disciplina e bimestre</p>
          </div>
        </div>
        <div className="cp-header-actions">
          <button className="cp-btn-outline" onClick={() => setViewMode(v => v === "cards" ? "table" : "cards")}>
            <IcoStats /> {viewMode === "cards" ? "Visualização em tabela" : "Visualização em cards"}
          </button>
          <button className="cp-btn-primary" onClick={() => setModalOpen(true)}>
            <IcoPlus /> Novo Conteúdo
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="cp-kpi-row">
        <div className="cp-kpi cp-kpi-total">
          <span className="cp-kpi-num">{total}</span>
          <span className="cp-kpi-label">Registros totais</span>
          <div className="cp-kpi-bar"><div style={{ width: "100%", background: "#6366f1" }} /></div>
        </div>
        <div className="cp-kpi cp-kpi-ok">
          <span className="cp-kpi-num">{aprovado}</span>
          <span className="cp-kpi-label">Aprovados</span>
          <div className="cp-kpi-bar"><div style={{ width: `${pctOk}%`, background: "#10b981" }} /></div>
        </div>
        <div className="cp-kpi cp-kpi-rev">
          <span className="cp-kpi-num">{revisao}</span>
          <span className="cp-kpi-label">Em revisão</span>
          <div className="cp-kpi-bar"><div style={{ width: `${Math.round((revisao/total)*100)}%`, background: "#3b82f6" }} /></div>
        </div>
        <div className="cp-kpi cp-kpi-pend">
          <span className="cp-kpi-num">{pendente}</span>
          <span className="cp-kpi-label">Pendentes / Rascunho</span>
          <div className="cp-kpi-bar"><div style={{ width: `${Math.round((pendente/total)*100)}%`, background: "#f59e0b" }} /></div>
        </div>
        <div className="cp-kpi cp-kpi-prog">
          <span className="cp-kpi-num">{pctOk}%</span>
          <span className="cp-kpi-label">Conclusão geral</span>
          <div className="cp-progress-ring">
            <svg viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3"
                strokeDasharray={`${pctOk} ${100 - pctOk}`} strokeDashoffset="25" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="cp-filters">
        <div className="cp-filter-label"><IcoFilter /> Filtros</div>

        <select className="cp-select" value={serieFiltro} onChange={e => setSerieFiltro(e.target.value)}>
          <option value="Todas">Todas as séries</option>
          {SERIES.map(s => <option key={s}>{s}</option>)}
        </select>

        <select className="cp-select" value={discFiltro} onChange={e => setDiscFiltro(e.target.value)}>
          <option value="Todas">Todas as disciplinas</option>
          {DISCIPLINAS.map(d => <option key={d}>{d}</option>)}
        </select>

        <select className="cp-select" value={bimestreFiltro} onChange={e => setBimestreFiltro(e.target.value)}>
          <option value="Todos">Todos os bimestres</option>
          {BIMESTRES.map(b => <option key={b}>{b}</option>)}
        </select>

        <select className="cp-select" value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="Todos">Todos os status</option>
          <option value="APROVADO">Aprovado</option>
          <option value="ENVIADO">Em revisão</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="PENDENTE">Pendente</option>
        </select>

        <span className="cp-filter-count">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Conteúdo principal ── */}
      {viewMode === "cards" ? (
        <div className="cp-cards-grid">
          {filtered.length === 0 && (
            <div className="cp-empty">
              <IcoBook />
              <p>Nenhum conteúdo encontrado para os filtros selecionados.</p>
            </div>
          )}
          {filtered.map(item => {
            const st = STATUS_COLORS[item.status] || STATUS_COLORS.RASCUNHO;
            const corSerie = COR_SERIE[item.serie] || "#6366f1";
            return (
              <div key={item.id} className="cp-card" style={{ "--serie-color": corSerie }}>
                <div className="cp-card-top">
                  <div className="cp-card-serie" style={{ background: corSerie + "18", color: corSerie }}>
                    {item.serie}
                  </div>
                  <div className="cp-card-status" style={{ background: st.bg, color: st.text }}>
                    <span className="cp-status-dot" style={{ background: st.dot }} />
                    {st.label}
                  </div>
                </div>

                <div className="cp-card-disciplina">{item.disciplina}</div>
                <div className="cp-card-bimestre">{item.bimestre}</div>

                <div className="cp-card-unidade">{item.unidade}</div>
                <p className="cp-card-conteudo">{item.conteudo}</p>
                <p className="cp-card-objetivo"><strong>Objetivo:</strong> {item.objetivo}</p>

                <div className="cp-card-footer">
                  <span className="cp-card-itens">{item.itens} iten{item.itens !== 1 ? "s" : ""}</span>
                  <div className="cp-card-btns">
                    <button className="cp-icon-btn cp-icon-btn-view" title="Visualizar" onClick={() => setDetalheItem(item)}>
                      <IcoEye />
                    </button>
                    <button className="cp-icon-btn cp-icon-btn-edit" title="Editar">
                      <IcoEdit />
                    </button>
                    {item.status === "ENVIADO" && (
                      <button className="cp-icon-btn cp-icon-btn-approve" title="Aprovar">
                        <IcoCheck />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Tabela ── */
        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead>
              <tr>
                <th>Série</th>
                <th>Disciplina</th>
                <th>Bimestre</th>
                <th>Unidade Temática</th>
                <th>Conteúdo</th>
                <th>Itens</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="cp-table-empty">Nenhum resultado encontrado.</td></tr>
              )}
              {filtered.map((item, i) => {
                const st = STATUS_COLORS[item.status] || STATUS_COLORS.RASCUNHO;
                const corSerie = COR_SERIE[item.serie] || "#6366f1";
                return (
                  <tr key={item.id} className={i % 2 === 0 ? "cp-tr-even" : ""}>
                    <td>
                      <span className="cp-pill" style={{ background: corSerie + "18", color: corSerie }}>{item.serie}</span>
                    </td>
                    <td className="cp-td-bold">{item.disciplina}</td>
                    <td>{item.bimestre}</td>
                    <td>{item.unidade}</td>
                    <td className="cp-td-conteudo">{item.conteudo}</td>
                    <td className="cp-td-center">{item.itens}</td>
                    <td>
                      <span className="cp-status-badge" style={{ background: st.bg, color: st.text }}>
                        <span className="cp-status-dot" style={{ background: st.dot }} />
                        {st.label}
                      </span>
                    </td>
                    <td>
                      <div className="cp-td-actions">
                        <button className="cp-icon-btn cp-icon-btn-view" title="Visualizar" onClick={() => setDetalheItem(item)}><IcoEye /></button>
                        <button className="cp-icon-btn cp-icon-btn-edit" title="Editar"><IcoEdit /></button>
                        {item.status === "ENVIADO" && (
                          <button className="cp-icon-btn cp-icon-btn-approve" title="Aprovar"><IcoCheck /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Novo Conteúdo ── */}
      {modalOpen && (
        <div className="cp-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-header">
              <span className="cp-modal-icon"><IcoPlus /></span>
              <h2>Novo Conteúdo Programático</h2>
            </div>
            <div className="cp-modal-body">
              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label>Série</label>
                  <select className="cp-select cp-select-full">
                    {SERIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="cp-form-group">
                  <label>Disciplina</label>
                  <select className="cp-select cp-select-full">
                    {DISCIPLINAS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label>Bimestre</label>
                  <select className="cp-select cp-select-full">
                    {BIMESTRES.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="cp-form-group">
                  <label>Ano Letivo</label>
                  <select className="cp-select cp-select-full">
                    <option>2026</option><option>2025</option>
                  </select>
                </div>
              </div>
              <div className="cp-form-group cp-form-full">
                <label>Unidade Temática</label>
                <input type="text" className="cp-input" placeholder="Ex: Números Naturais" />
              </div>
              <div className="cp-form-group cp-form-full">
                <label>Conteúdo</label>
                <textarea className="cp-textarea" rows={3} placeholder="Descreva os conteúdos a serem trabalhados..." />
              </div>
              <div className="cp-form-group cp-form-full">
                <label>Objetivo de Aprendizagem</label>
                <textarea className="cp-textarea" rows={2} placeholder="O que o aluno deverá ser capaz de fazer ao final..." />
              </div>
            </div>
            <div className="cp-modal-footer">
              <button className="cp-btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="cp-btn-primary" onClick={() => setModalOpen(false)}>Salvar como Rascunho</button>
              <button className="cp-btn-success" onClick={() => setModalOpen(false)}>Salvar e Enviar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Detalhe ── */}
      {detalheItem && (
        <div className="cp-modal-overlay" onClick={() => setDetalheItem(null)}>
          <div className="cp-modal cp-modal-detalhe" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-header">
              <span className="cp-modal-icon" style={{ background: (COR_SERIE[detalheItem.serie] || "#6366f1") + "22", color: COR_SERIE[detalheItem.serie] || "#6366f1" }}>
                <IcoBook />
              </span>
              <div>
                <h2>{detalheItem.disciplina}</h2>
                <p style={{ color: "#64748b", fontSize: "0.85rem" }}>{detalheItem.serie} — {detalheItem.bimestre}</p>
              </div>
            </div>
            <div className="cp-modal-body">
              <div className="cp-detalhe-grid">
                <div className="cp-detalhe-field"><span>Unidade Temática</span><strong>{detalheItem.unidade}</strong></div>
                <div className="cp-detalhe-field"><span>Status</span>
                  <span className="cp-status-badge" style={{ background: STATUS_COLORS[detalheItem.status].bg, color: STATUS_COLORS[detalheItem.status].text }}>
                    <span className="cp-status-dot" style={{ background: STATUS_COLORS[detalheItem.status].dot }} />
                    {STATUS_COLORS[detalheItem.status].label}
                  </span>
                </div>
                <div className="cp-detalhe-field cp-detalhe-full"><span>Conteúdo</span><p>{detalheItem.conteudo}</p></div>
                <div className="cp-detalhe-field cp-detalhe-full"><span>Objetivo de Aprendizagem</span><p>{detalheItem.objetivo}</p></div>
                <div className="cp-detalhe-field"><span>Total de Itens</span><strong>{detalheItem.itens} itens cadastrados</strong></div>
              </div>
              {detalheItem.status === "ENVIADO" && (
                <div className="cp-detalhe-actions-bar">
                  <p>Este conteúdo está aguardando aprovação da coordenação.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="cp-btn-outline">Solicitar Ajuste</button>
                    <button className="cp-btn-success"><IcoCheck /> Aprovar Conteúdo</button>
                  </div>
                </div>
              )}
            </div>
            <div className="cp-modal-footer">
              <button className="cp-btn-outline" onClick={() => setDetalheItem(null)}>Fechar</button>
              <button className="cp-btn-primary"><IcoEdit /> Editar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
