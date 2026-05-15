import React from "react";

const faqs = [
  {
    q: "Como faço login no EDUCA Mobile?",
    a: "Digite seu CPF no campo indicado e toque em \"Enviar código\". Você receberá um código de verificação por SMS no número cadastrado pela escola. Insira o código e toque em \"Confirmar código\" para acessar.",
  },
  {
    q: "Não recebi o código SMS. O que fazer?",
    a: "Verifique se o número de telefone cadastrado está correto junto à secretaria da escola. O código pode levar até 2 minutos. Caso o problema persista, entre em contato com a secretaria da sua escola ou pelo e-mail de suporte abaixo.",
  },
  {
    q: "Não consigo ver os dados do meu filho. O que aconteceu?",
    a: "Seu acesso é vinculado ao cadastro feito pela escola. Confirme com a secretaria escolar se seu CPF foi corretamente registrado como responsável do aluno.",
  },
  {
    q: "Como solicito a exclusão dos meus dados?",
    a: "Acesse sistemaeducamelhor.com.br/excluir-conta ou envie um e-mail para privacidade@sistemaeducamelhor.com.br com o assunto \"Exclusão de conta\". O prazo de resposta é de até 15 dias úteis.",
  },
  {
    q: "O app está travando ou não abre. O que fazer?",
    a: "Tente fechar e reabrir o aplicativo. Se o problema persistir, desinstale e reinstale o EDUCA Mobile. Certifique-se de que seu dispositivo tem conexão com a internet. Em caso de dúvida, entre em contato pelo e-mail de suporte.",
  },
  {
    q: "O EDUCA Mobile está disponível para Android?",
    a: "Atualmente o EDUCA Mobile está disponível apenas para iOS (iPhone e iPad). A versão para Android está em desenvolvimento.",
  },
];

export default function SuportePage() {
  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#f5f7fa",
        minHeight: "100vh",
        color: "#1a1a2e",
        lineHeight: 1.7,
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2a5298 100%)",
          color: "#fff",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: 8 }}>🎓</div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 700, margin: "0 0 8px" }}>
          Central de Suporte
        </h1>
        <p style={{ margin: "0 0 4px", opacity: 0.85, fontSize: "1rem" }}>
          EDUCA Mobile — Plataforma EDUCA.MELHOR
        </p>
        <span
          style={{
            display: "inline-block",
            background: "#FFA133",
            color: "#fff",
            fontSize: "0.75rem",
            fontWeight: 700,
            padding: "4px 16px",
            borderRadius: 20,
            marginTop: 12,
            letterSpacing: 0.5,
          }}
        >
          Suporte ao Usuário
        </span>
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* Contato principal */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "32px",
            marginBottom: 28,
            boxShadow: "0 4px 20px rgba(0,0,0,.08)",
            border: "1px solid #e8edf5",
          }}
        >
          <h2
            style={{
              color: "#1e3a5f",
              fontSize: "1.2rem",
              fontWeight: 700,
              margin: "0 0 20px",
              paddingBottom: 12,
              borderBottom: "2px solid #e8edf5",
            }}
          >
            📬 Entre em Contato
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {/* E-mail de suporte */}
            <div
              style={{
                background: "#eff6ff",
                border: "1.5px solid #2a5298",
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>✉️</div>
              <div style={{ fontWeight: 700, color: "#1e3a5f", marginBottom: 4, fontSize: "0.9rem" }}>
                E-mail de Suporte
              </div>
              <a
                href="mailto:suporte@sistemaeducamelhor.com.br"
                style={{
                  color: "#2a5298",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                  wordBreak: "break-all",
                }}
              >
                suporte@sistemaeducamelhor.com.br
              </a>
              <div style={{ fontSize: "0.78rem", color: "#666", marginTop: 6 }}>
                Resposta em até 2 dias úteis
              </div>
            </div>

            {/* Privacidade / DPO */}
            <div
              style={{
                background: "#fff8f0",
                border: "1.5px solid #FFA133",
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>🔐</div>
              <div style={{ fontWeight: 700, color: "#1e3a5f", marginBottom: 4, fontSize: "0.9rem" }}>
                Privacidade &amp; LGPD (DPO)
              </div>
              <a
                href="mailto:dpo@sistemaeducamelhor.com.br"
                style={{
                  color: "#e07b00",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                  wordBreak: "break-all",
                }}
              >
                dpo@sistemaeducamelhor.com.br
              </a>
              <div style={{ fontSize: "0.78rem", color: "#666", marginTop: 6 }}>
                Prazo: até 15 dias úteis (LGPD Art. 18)
              </div>
            </div>

            {/* Site */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #22c55e",
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>🌐</div>
              <div style={{ fontWeight: 700, color: "#1e3a5f", marginBottom: 4, fontSize: "0.9rem" }}>
                Site
              </div>
              <a
                href="https://sistemaeducamelhor.com.br"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#16a34a", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none" }}
              >
                sistemaeducamelhor.com.br
              </a>
              <div style={{ fontSize: "0.78rem", color: "#666", marginTop: 6 }}>
                Plataforma EDUCA.MELHOR
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "32px",
            marginBottom: 28,
            boxShadow: "0 4px 20px rgba(0,0,0,.08)",
            border: "1px solid #e8edf5",
          }}
        >
          <h2
            style={{
              color: "#1e3a5f",
              fontSize: "1.2rem",
              fontWeight: 700,
              margin: "0 0 20px",
              paddingBottom: 12,
              borderBottom: "2px solid #e8edf5",
            }}
          >
            ❓ Perguntas Frequentes
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {faqs.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "#f8fafc",
                  borderRadius: 10,
                  padding: "18px 20px",
                  borderLeft: "4px solid #FFA133",
                }}
              >
                <div
                  style={{ fontWeight: 700, color: "#1e3a5f", fontSize: "0.95rem", marginBottom: 6 }}
                >
                  {item.q}
                </div>
                <div style={{ fontSize: "0.92rem", color: "#3a3a5c" }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sobre o app */}
        <div
          style={{
            background: "#eef4ff",
            borderLeft: "4px solid #1e3a5f",
            borderRadius: "0 12px 12px 0",
            padding: "18px 24px",
            fontSize: "0.9rem",
            color: "#3a3a5c",
          }}
        >
          <strong>Sobre o EDUCA Mobile:</strong> O EDUCA Mobile é um aplicativo exclusivo para
          responsáveis legais de alunos matriculados em instituições de ensino parceiras da
          plataforma EDUCA.MELHOR. O acesso é concedido pela secretaria escolar — responsáveis
          não realizam cadastro autônomo.
        </div>

        {/* Links úteis */}
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <a
            href="/privacidade"
            style={{ color: "#2a5298", fontWeight: 600, fontSize: "0.9rem", marginRight: 24, textDecoration: "none" }}
          >
            📄 Política de Privacidade
          </a>
          <a
            href="/excluir-conta"
            style={{ color: "#e07b00", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none" }}
          >
            🗑️ Solicitar Exclusão de Conta
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "24px",
          fontSize: "0.82rem",
          color: "#888",
          borderTop: "1px solid #e8edf5",
          background: "#fff",
        }}
      >
        © 2025 EDUCA.MELHOR ·{" "}
        <a href="https://sistemaeducamelhor.com.br" style={{ color: "#1e3a5f" }}>
          sistemaeducamelhor.com.br
        </a>{" "}
        ·{" "}
        <a href="mailto:suporte@sistemaeducamelhor.com.br" style={{ color: "#1e3a5f" }}>
          suporte@sistemaeducamelhor.com.br
        </a>
      </footer>
    </div>
  );
}
