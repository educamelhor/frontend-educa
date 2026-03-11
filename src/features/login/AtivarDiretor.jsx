import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AtivarDiretor() {
  const navigate = useNavigate();

  const [conviteToken, setConviteToken] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");

  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("token"); // token | senha | concluido
  const [usuario, setUsuario] = useState(null);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");

  const tokenLimpo = useMemo(() => String(conviteToken || "").trim(), [conviteToken]);

  async function validarConvite() {
    setErro("");
    setMsg("");

    if (!tokenLimpo) {
      setErro("Informe o convite_token.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/auth/convite/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convite_token: tokenLimpo }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.ok) {
        setErro(data?.message || "Convite inválido, expirado ou já utilizado.");
        setLoading(false);
        return;
      }

      setUsuario(data.usuario || null);
      setEtapa("senha");
      setMsg("Convite validado. Agora crie sua senha.");
    } catch (e) {
      setErro("Falha ao comunicar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function ativarConta(e) {
    e?.preventDefault?.();
    setErro("");
    setMsg("");

    if (!tokenLimpo) {
      setErro("convite_token ausente.");
      return;
    }

    if (!senha || !senha2) {
      setErro("Preencha a senha e a confirmação.");
      return;
    }

    if (senha !== senha2) {
      setErro("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/auth/convite/ativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convite_token: tokenLimpo, senha }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.ok) {
        setErro(data?.message || "Não foi possível ativar a conta.");
        setLoading(false);
        return;
      }

      setEtapa("concluido");
      setMsg("Senha criada com sucesso! Agora faça login com seu e-mail e a senha criada.");
    } catch (e) {
      setErro("Falha ao comunicar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Ativação do Diretor</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Use o <b>convite_token</b> recebido para validar e criar sua senha.
      </p>

      {erro ? (
        <div style={{ padding: 12, borderRadius: 10, background: "#ffe8e8", color: "#7a0b0b", marginBottom: 12 }}>
          {erro}
        </div>
      ) : null}

      {msg ? (
        <div style={{ padding: 12, borderRadius: 10, background: "#e8fff0", color: "#0b5a2a", marginBottom: 12 }}>
          {msg}
        </div>
      ) : null}

      {etapa === "token" && (
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ fontWeight: 700 }}>convite_token</label>
          <input
            value={conviteToken}
            onChange={(e) => setConviteToken(e.target.value)}
            placeholder="cole aqui o token"
            style={{ padding: 12, borderRadius: 10, border: "1px solid #d0d7de" }}
            autoComplete="off"
          />

          <button
            onClick={validarConvite}
            disabled={loading}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            {loading ? "Validando..." : "Validar convite"}
          </button>

          <button
            onClick={() => navigate("/login")}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #d0d7de",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Voltar para Login
          </button>
        </div>
      )}

      {etapa === "senha" && (
        <form onSubmit={ativarConta} style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #d0d7de",
              background: "#f6f8fa",
              marginBottom: 6,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Dados do convite</div>
            <div><b>Nome:</b> {usuario?.nome || "-"}</div>
            <div><b>Perfil:</b> {usuario?.perfil || "-"}</div>
            <div><b>Escola:</b> {usuario?.escola_id ?? "-"}</div>
          </div>

          <label style={{ fontWeight: 700 }}>Criar senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="ex.: Abc1$23"
            style={{ padding: 12, borderRadius: 10, border: "1px solid #d0d7de" }}
            autoComplete="new-password"
          />

          <label style={{ fontWeight: 700 }}>Confirmar senha</label>
          <input
            type="password"
            value={senha2}
            onChange={(e) => setSenha2(e.target.value)}
            placeholder="repita a senha"
            style={{ padding: 12, borderRadius: 10, border: "1px solid #d0d7de" }}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            {loading ? "Ativando..." : "Ativar conta"}
          </button>

          <button
            type="button"
            onClick={() => setEtapa("token")}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #d0d7de",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Voltar
          </button>
        </form>
      )}

      {etapa === "concluido" && (
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            border: "1px solid #d0d7de",
            background: "#ffffff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>
            Senha criada com sucesso!
          </div>

          <div style={{ opacity: 0.9, marginBottom: 14 }}>
            Agora você já pode entrar no sistema usando seu <b>e-mail</b> e a senha que acabou de criar.
          </div>

          <button
            onClick={() => navigate("/login", { replace: true })}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontWeight: 900,
              width: "100%",
            }}
          >
            Ir para Login
          </button>
        </div>
      )}
    </div>
  );
}
