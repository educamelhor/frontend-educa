import React, { useState } from "react";

const BRAND_BLUE = "#1a56a7";
const BRAND_LIGHT = "#e8f0fb";

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #e8f0fb 0%, #f4f8ff 100%)",
    fontFamily: "'Montserrat', 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 16px 48px",
  },
  header: {
    width: "100%",
    background: BRAND_BLUE,
    padding: "20px 32px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 2px 16px rgba(26,86,167,0.18)",
    marginBottom: "0",
  },
  logo: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "18px",
    color: BRAND_BLUE,
    letterSpacing: "-1px",
  },
  brandName: {
    color: "#fff",
    fontSize: "20px",
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 8px 40px rgba(26,86,167,0.10)",
    maxWidth: "640px",
    width: "100%",
    marginTop: "40px",
    padding: "40px 36px",
  },
  icon: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "#fef2f2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    margin: "0 auto 20px",
    border: "2px solid #fecaca",
  },
  title: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#1e293b",
    textAlign: "center",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    textAlign: "center",
    marginBottom: "32px",
    lineHeight: "1.6",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "14px",
    color: "#1e293b",
    background: "#f8fafc",
    marginBottom: "18px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  select: {
    width: "100%",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "14px",
    color: "#1e293b",
    background: "#f8fafc",
    marginBottom: "18px",
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "14px",
    color: "#1e293b",
    background: "#f8fafc",
    marginBottom: "18px",
    outline: "none",
    boxSizing: "border-box",
    minHeight: "90px",
    resize: "vertical",
  },
  infoBox: {
    background: "#eff6ff",
    border: "1.5px solid #bfdbfe",
    borderRadius: "12px",
    padding: "16px 18px",
    marginBottom: "24px",
  },
  infoTitle: {
    fontWeight: 700,
    color: BRAND_BLUE,
    fontSize: "13px",
    marginBottom: "8px",
  },
  infoItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    fontSize: "13px",
    color: "#374151",
    marginBottom: "6px",
    lineHeight: "1.5",
  },
  bullet: {
    color: BRAND_BLUE,
    fontWeight: 700,
    marginTop: "1px",
    flexShrink: 0,
  },
  btn: {
    width: "100%",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.1s",
    marginTop: "4px",
  },
  successCard: {
    background: "#f0fdf4",
    border: "2px solid #86efac",
    borderRadius: "16px",
    padding: "32px",
    textAlign: "center",
  },
  successIcon: {
    fontSize: "48px",
    marginBottom: "12px",
  },
  successTitle: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#166534",
    marginBottom: "8px",
  },
  successText: {
    fontSize: "14px",
    color: "#374151",
    lineHeight: "1.7",
  },
  footer: {
    marginTop: "32px",
    fontSize: "12px",
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: "1.6",
  },
};

export default function ExcluirContaPage() {
  const [form, setForm] = useState({ email: "", motivo: "", detalhe: "" });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErro("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.motivo) {
      setErro("Por favor, preencha o e-mail e selecione o motivo.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    setLoading(true);
    // Simula envio (pode integrar a um endpoint real futuramente)
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setEnviado(true);
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>EM</div>
        <span style={styles.brandName}>EDUCA.MELHOR</span>
      </header>

      <div style={styles.card}>
        {enviado ? (
          <div style={styles.successCard}>
            <div style={styles.successIcon}>✅</div>
            <div style={styles.successTitle}>Solicitação Recebida!</div>
            <p style={styles.successText}>
              Recebemos seu pedido de exclusão de conta para <strong>{form.email}</strong>.
              <br /><br />
              Nossa equipe irá processar a solicitação em até <strong>30 dias corridos</strong> e você receberá uma confirmação por e-mail.
              <br /><br />
              Se tiver dúvidas, entre em contato: <strong>contato@sistemaeducamelhor.com.br</strong>
            </p>
          </div>
        ) : (
          <>
            <div style={styles.icon}>🗑️</div>
            <h1 style={styles.title}>Solicitar Exclusão de Conta</h1>
            <p style={styles.subtitle}>
              Ao solicitar a exclusão, sua conta e todos os dados associados serão permanentemente removidos de nossos servidores.
            </p>

            {/* Informações sobre o que será excluído */}
            <div style={styles.infoBox}>
              <div style={styles.infoTitle}>📋 O que será excluído:</div>
              <div style={styles.infoItem}>
                <span style={styles.bullet}>•</span>
                <span>Dados de perfil e informações pessoais</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.bullet}>•</span>
                <span>Histórico de atividades e registros no aplicativo</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.bullet}>•</span>
                <span>Preferências e configurações salvas</span>
              </div>
              <div style={styles.infoTitle} style={{ ...styles.infoTitle, marginTop: "12px" }}>
                ⚠️ O que poderá ser mantido:
              </div>
              <div style={styles.infoItem}>
                <span style={styles.bullet}>•</span>
                <span>Registros obrigatórios por lei (até 5 anos, conforme LGPD)</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.bullet}>•</span>
                <span>Dados necessários para obrigações contratuais em curso</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label style={styles.label} htmlFor="email-excluir">
                E-mail cadastrado na conta *
              </label>
              <input
                id="email-excluir"
                type="email"
                name="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={handleChange}
                style={styles.input}
                autoComplete="email"
              />

              <label style={styles.label} htmlFor="motivo-excluir">
                Motivo da exclusão *
              </label>
              <select
                id="motivo-excluir"
                name="motivo"
                value={form.motivo}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="">Selecione um motivo...</option>
                <option value="nao_uso_mais">Não uso mais o aplicativo</option>
                <option value="privacidade">Preocupações com privacidade</option>
                <option value="mudou_escola">Mudei de escola/instituição</option>
                <option value="problemas_tecnico">Problemas técnicos</option>
                <option value="outro">Outro motivo</option>
              </select>

              <label style={styles.label} htmlFor="detalhe-excluir">
                Detalhes adicionais (opcional)
              </label>
              <textarea
                id="detalhe-excluir"
                name="detalhe"
                placeholder="Descreva aqui qualquer informação adicional..."
                value={form.detalhe}
                onChange={handleChange}
                style={styles.textarea}
              />

              {erro && (
                <div style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#dc2626",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}>
                  ⚠️ {erro}
                </div>
              )}

              <button
                type="submit"
                id="btn-solicitar-exclusao"
                style={styles.btn}
                disabled={loading}
                onMouseOver={e => e.currentTarget.style.background = "#b91c1c"}
                onMouseOut={e => e.currentTarget.style.background = "#dc2626"}
              >
                {loading ? "Enviando solicitação..." : "🗑️ Solicitar Exclusão de Conta"}
              </button>
            </form>
          </>
        )}

        <div style={styles.footer}>
          EDUCA.MELHOR — Sistema de Gestão Escolar<br />
          Conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)<br />
          Dúvidas: <a href="mailto:contato@sistemaeducamelhor.com.br" style={{ color: BRAND_BLUE }}>contato@sistemaeducamelhor.com.br</a>
        </div>
      </div>
    </div>
  );
}
