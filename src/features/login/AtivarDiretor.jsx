import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";

/* ─────── Validação de senha forte ─────── */
function senhaForte(s) {
  if (!s) return false;
  return s.length >= 6 && /[A-Za-z]/.test(s) && /\d/.test(s) && /[$#@*_]/.test(s);
}

export default function AtivarDiretor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  // ── Estado geral ──
  const [conviteToken, setConviteToken] = useState(tokenFromUrl);
  const [etapa, setEtapa] = useState("token"); // token | email | otp | senha | concluido
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [usuario, setUsuario] = useState(null); // { nome, email, perfil, papel_label, escola_nome }

  // ── Etapa 2: E-mail ──
  const [email, setEmail] = useState("");

  // ── Etapa 3: OTP ──
  const [codigoDigitos, setCodigoDigitos] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef([]);
  const [timer, setTimer] = useState(0);

  // ── Etapa 4: Senha ──
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showSenha2, setShowSenha2] = useState(false);

  const tokenLimpo = String(conviteToken || "").trim();

  // Auto-validar se token veio pela URL
  useEffect(() => {
    if (tokenFromUrl) {
      setConviteToken(tokenFromUrl);
      validarConvite(tokenFromUrl);
    }
  }, []); // eslint-disable-line

  // Timer para reenvio
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  /* ═══ ETAPA 1: Validar token ═══ */
  const validarConvite = async (tk) => {
    const t = String(tk || conviteToken).trim();
    if (!t) { setErro("Cole o código de acesso recebido."); return; }
    setLoading(true); setErro("");
    try {
      const { data } = await api.post(`/api/plataforma/convites/${t}/validar`);
      setUsuario(data.usuario);
      setEmail(data.usuario?.email || "");
      setConviteToken(t);
      setEtapa("email");
    } catch (err) {
      const msg = err?.response?.data?.message || "Convite inválido.";
      setErro(msg);
    } finally { setLoading(false); }
  };

  /* ═══ ETAPA 2: Enviar OTP ═══ */
  const enviarCodigo = async () => {
    if (!email || !email.includes("@")) { setErro("Informe um e-mail válido."); return; }
    setLoading(true); setErro("");
    try {
      const { data } = await api.post(`/api/plataforma/convites/${tokenLimpo}/enviar-codigo`, { email });
      // Em dev, pode vir o código no response
      if (data._dev_codigo) console.log("[DEV] Código OTP:", data._dev_codigo);
      setCodigoDigitos(["", "", "", "", "", ""]);
      setEtapa("otp");
      setTimer(60);
    } catch (err) {
      setErro(err?.response?.data?.message || "Erro ao enviar código.");
    } finally { setLoading(false); }
  };

  /* ═══ ETAPA 3: Input OTP com 6 caixas ═══ */
  const handleDigitoChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const novo = [...codigoDigitos];
    novo[idx] = digit;
    setCodigoDigitos(novo);
    setErro("");
    if (digit && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleDigitoKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !codigoDigitos[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const novo = [...codigoDigitos];
    for (let i = 0; i < 6; i++) novo[i] = paste[i] || "";
    setCodigoDigitos(novo);
    if (paste.length >= 6) inputsRef.current[5]?.focus();
  };

  const codigoCompleto = codigoDigitos.join("");

  const reenviarCodigo = async () => {
    setTimer(60);
    await enviarCodigo();
  };

  /* ═══ ETAPA 4: Ativar conta ═══ */
  const handleAtivar = async (e) => {
    e?.preventDefault();
    if (!senhaForte(senha)) { setErro("Senha fraca."); return; }
    if (senha !== senha2) { setErro("As senhas não coincidem."); return; }
    setLoading(true); setErro("");
    try {
      await api.post(`/api/plataforma/convites/${tokenLimpo}/ativar`, {
        codigo: codigoCompleto,
        email: email.trim().toLowerCase(),
        senha,
      });
      setEtapa("concluido");
    } catch (err) {
      setErro(err?.response?.data?.message || "Erro ao ativar conta.");
    } finally { setLoading(false); }
  };

  /* ─── Checklist de força da senha ─── */
  const senhaChecks = [
    { label: "Mín. 6 caracteres", ok: senha.length >= 6 },
    { label: "Pelo menos 1 letra", ok: /[A-Za-z]/.test(senha) },
    { label: "Pelo menos 1 número", ok: /\d/.test(senha) },
    { label: "1 especial ($ # @ * _)", ok: /[$#@*_]/.test(senha) },
  ];

  /* ─── Eye icon SVG ─── */
  const EyeOpen = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
  const EyeClosed = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>;

  /* ─── Step indicator ─── */
  const steps = ["Convite", "E-mail", "Código", "Senha"];
  const stepIdx = etapa === "token" ? 0 : etapa === "email" ? 1 : etapa === "otp" ? 2 : etapa === "senha" ? 3 : 4;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo + Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl mb-3 border border-white/20">
            <svg className="h-7 w-7 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Ativação de Conta
          </h1>
          <p className="text-blue-200 mt-1 text-sm">Educa.Melhor — Plataforma Educacional</p>
        </div>

        {/* Progress steps */}
        {etapa !== "concluido" && (
          <div className="flex justify-center gap-2 mb-5">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < stepIdx ? "bg-green-400 text-white" :
                  i === stepIdx ? "bg-white text-blue-700 shadow-lg scale-110" :
                  "bg-white/20 text-blue-200"
                }`}>{i < stepIdx ? "✓" : i + 1}</div>
                {i < steps.length - 1 && <div className={`w-6 h-0.5 ${i < stepIdx ? "bg-green-400" : "bg-white/20"}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* ═══ ETAPA 1: TOKEN ═══ */}
          {etapa === "token" && (
            <div className="p-7">
              <h2 className="text-lg font-bold text-slate-800 mb-1">Código de acesso</h2>
              <p className="text-sm text-slate-500 mb-5">Cole abaixo o código enviado pelo administrador.</p>

              {erro && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{erro}</div>}

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Código de acesso *</label>
                <input type="text" value={conviteToken} onChange={e => { setConviteToken(e.target.value); setErro(""); }}
                  placeholder="Cole o código aqui..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                  autoFocus autoComplete="off" />
              </div>

              <button onClick={() => validarConvite()} disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-200 disabled:opacity-50">
                {loading ? "Validando..." : "Continuar"}
              </button>
              <button onClick={() => navigate("/login")} className="w-full mt-3 text-slate-500 hover:text-slate-700 font-medium py-2 text-sm transition">← Voltar para Login</button>
            </div>
          )}

          {/* ═══ ETAPA 2: CONFIRMAR E-MAIL ═══ */}
          {etapa === "email" && usuario && (
            <div className="p-7">
              {/* Card info diretor */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {usuario.nome?.charAt(0) || "D"}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{usuario.nome}</p>
                    <p className="text-xs text-blue-600">{usuario.papel_label} • {usuario.escola_nome}</p>
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-800 mb-1">Confirme seu e-mail</h2>
              <p className="text-sm text-slate-500 mb-5">
                Enviaremos um código de verificação para confirmar seu e-mail. Você pode corrigir se necessário.
              </p>

              {erro && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{erro}</div>}

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail *</label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErro(""); }}
                  placeholder="seu@email.com"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus autoComplete="email" />
              </div>

              <button onClick={enviarCodigo} disabled={loading || !email.includes("@")}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-200 disabled:opacity-50">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Enviando...
                  </span>
                ) : "Enviar código de verificação"}
              </button>
              <button onClick={() => setEtapa("token")} className="w-full mt-3 text-slate-500 hover:text-slate-700 font-medium py-2 text-sm transition">← Voltar</button>
            </div>
          )}

          {/* ═══ ETAPA 3: OTP ═══ */}
          {etapa === "otp" && (
            <div className="p-7 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4">
                <svg className="h-7 w-7 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Verificação de e-mail</h2>
              <p className="text-sm text-slate-500 mb-1">Enviamos um código de 6 dígitos para:</p>
              <p className="text-sm font-semibold text-blue-600 mb-5">{email}</p>

              {erro && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{erro}</div>}

              {/* 6 caixas de input */}
              <div className="flex justify-center gap-2 mb-5" onPaste={handlePaste}>
                {codigoDigitos.map((d, i) => (
                  <input key={i} ref={el => inputsRef.current[i] = el}
                    type="text" inputMode="numeric" maxLength={1}
                    value={d}
                    onChange={e => handleDigitoChange(i, e.target.value)}
                    onKeyDown={e => handleDigitoKeyDown(i, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {/* Reenviar */}
              <div className="mb-5">
                {timer > 0 ? (
                  <p className="text-xs text-slate-400">Reenviar código em <span className="font-semibold text-slate-600">{timer}s</span></p>
                ) : (
                  <button onClick={reenviarCodigo} disabled={loading} className="text-sm text-blue-600 hover:text-blue-800 font-medium transition">
                    Reenviar código
                  </button>
                )}
              </div>

              <button onClick={() => { setErro(""); setEtapa("senha"); }}
                disabled={codigoCompleto.length < 6}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-200 disabled:opacity-50">
                Verificar e continuar
              </button>
              <button onClick={() => setEtapa("email")} className="w-full mt-3 text-slate-500 hover:text-slate-700 font-medium py-2 text-sm transition">← Voltar</button>
            </div>
          )}

          {/* ═══ ETAPA 4: SENHA ═══ */}
          {etapa === "senha" && (
            <form onSubmit={handleAtivar} className="p-7">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                </div>
                <span className="text-sm font-medium text-green-700">E-mail verificado: {email}</span>
              </div>

              <h2 className="text-lg font-bold text-slate-800 mb-1">Defina sua senha</h2>
              <p className="text-sm text-slate-500 mb-5">Crie uma senha segura para acessar o sistema.</p>

              {erro && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{erro}</div>}

              {/* Senha */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha *</label>
                <div className="relative">
                  <input type={showSenha ? "text" : "password"} value={senha}
                    onChange={e => { setSenha(e.target.value); setErro(""); }}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none pr-12"
                    placeholder="Crie sua senha" autoFocus autoComplete="new-password" />
                  <button type="button" onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showSenha ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              {/* Checklist */}
              {senha && (
                <div className="mb-4 grid grid-cols-2 gap-1">
                  {senhaChecks.map((c, i) => (
                    <div key={i} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-green-600" : "text-slate-400"}`}>
                      {c.ok ? (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
                      )}
                      {c.label}
                    </div>
                  ))}
                </div>
              )}

              {/* Confirmar */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar senha *</label>
                <div className="relative">
                  <input type={showSenha2 ? "text" : "password"} value={senha2}
                    onChange={e => { setSenha2(e.target.value); setErro(""); }}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none pr-12"
                    placeholder="Repita a senha" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowSenha2(!showSenha2)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showSenha2 ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
                {senha2 && senha !== senha2 && <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>}
              </div>

              <button type="submit" disabled={loading || !senhaForte(senha) || senha !== senha2}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Ativando...
                  </span>
                ) : "Ativar minha conta"}
              </button>
              <button type="button" onClick={() => setEtapa("otp")} className="w-full mt-3 text-slate-500 hover:text-slate-700 font-medium py-2 text-sm transition">← Voltar</button>
            </form>
          )}

          {/* ═══ ETAPA 5: CONCLUÍDO ═══ */}
          {etapa === "concluido" && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Conta ativada com sucesso! 🎉</h2>
              <p className="text-slate-500 mb-1">
                Seu e-mail <strong>{email}</strong> foi verificado.
              </p>
              <p className="text-slate-500 mb-6">
                Agora faça login com seu <strong>CPF ou e‑mail</strong> e a senha que criou.
              </p>
              <button onClick={() => navigate("/login", { replace: true })}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-200 text-lg">
                Ir para Login →
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-blue-200/60 mt-5 text-xs">
          © {new Date().getFullYear()} Educa.Melhor • Plataforma Educacional
        </p>
      </div>
    </div>
  );
}
