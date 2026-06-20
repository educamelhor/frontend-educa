// src/features/login/Login.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api"; // Serviço centralizado para requisições

function isEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isCelularValido(valor) {
  const digits = String(valor || "").replace(/\D/g, "");
  // Aceita 10 ou 11 dÃ­gitos (com ou sem DDD)
  return digits.length === 10 || digits.length === 11;
}

function isCpfValido(valor) {
  const digits = String(valor || "").replace(/\D/g, "");
  return digits.length === 11;
}

// âœ… Normaliza o identificador de login:
// - e-mail => trim + lowercase
// - celular/cpf => somente dÃ­gitos
function normalizarLogin(valor) {
  const v = String(valor || "").trim();
  if (isEmailValido(v)) return v.toLowerCase();
  return v.replace(/\D/g, "");
}

// ✅ Mesma regra do cadastro (mínimo 6, letra, número e 1 destes: $#@*_)
function senhaForte(s) {
  if (!s) return false;
  const temMinimo = s.length >= 6;
  const temLetra = /[A-Za-z]/.test(s);
  const temNumero = /\d/.test(s);
  const temEspecial = /[$#@*_]/.test(s);
  return temMinimo && temLetra && temNumero && temEspecial;
}

export default function Login() {
  // 📌 Controle de etapas do fluxo de login
  const [etapa, setEtapa] = useState("login"); // "login" | "codigo" | 'escola' | "reset_codigo" | "reset_nova_senha"

  // 📌 Campos do formulário
  const location = useLocation();

  const [tipoAcesso, setTipoAcesso] = useState("escola"); // "escola" | "plataforma"

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");

  // ✅ Reset de senha (via OTP)
  const [resetCodigo, setResetCodigo] = useState("");
  const [resetSenha, setResetSenha] = useState("");
  const [resetConfSenha, setResetConfSenha] = useState("");
  const [resetEmailLocked, setResetEmailLocked] = useState(false);

  // 📌 Metadados do usuário e UI
  const [usuarioId, setUsuarioId] = useState(null);
  const [nomeUsuarioLogin, setNomeUsuarioLogin] = useState(""); // ✅ nome para exibir no multi-escola
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);


  // ✅ Multi-escola (seleção de contexto)
  const [escolasVinculadas, setEscolasVinculadas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState("");
  const [usuarioCtxSelecionado, setUsuarioCtxSelecionado] = useState("");


  // ✅ Mensagens inline (substitui alert)
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro"); // "erro" | "info" | "sucesso"

  // ✅ Reenviar código (cooldown)
  const [cooldown, setCooldown] = useState(0); // segundos restantes

  // ✅ Dispositivo confiado
  const [confirarDispositivo, setConfirarDispositivo] = useState(false);

  // Helpers para device_token (localStorage)
  const getDeviceToken = () => {
    try { return localStorage.getItem("device_token") || ""; } catch { return ""; }
  };
  const saveDeviceToken = (token) => {
    try { if (token) localStorage.setItem("device_token", token); } catch {}
  };
  const clearDeviceToken = () => {
    try { localStorage.removeItem("device_token"); } catch {}
  };


  const navigate = useNavigate();

  // ✅ Higiene de sessão: ao entrar no Sistema Escolar, remove vestígios da Plataforma (CEO)
  // (não toca no token escolar)
  const limparSessaoPlataforma = () => {
    try {
      localStorage.removeItem("plataforma_token");
      localStorage.removeItem("plataforma_scope");
      localStorage.removeItem("plataforma_perfil");
    } catch {}
  };

  // ✅ Carrega disciplinas do professor logado e grava no localStorage
  // - Formato novo (definitivo): disciplinas_professor_ctx = [{ id, nome }]
  // - Compatibilidade (até PASSO 9.3): disciplinas_professor = ["Matemática", ...]
  const carregarDisciplinasProfessor = async (token) => {
    try {
      if (!token) return;

      const { data } = await api.get("/api/professores/me/disciplinas", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Novo formato: [{ id, nome }]
      const disciplinasCtx = Array.isArray(data?.disciplinas)
        ? data.disciplinas
            .map((d) => ({
              id: Number(d?.id),
              nome: String(d?.nome || "").trim(),
            }))
            .filter((d) => Number.isFinite(d.id) && d.nome)
        : [];

      // Compatibilidade: apenas nomes (para a tela Conteúdos atual não quebrar)
      const nomes = disciplinasCtx.map((d) => d.nome);

      localStorage.setItem("disciplinas_professor_ctx", JSON.stringify(disciplinasCtx));
      localStorage.setItem("disciplinas_professor", JSON.stringify(nomes));
    } catch (e) {
      // fallback seguro: não impede login
      localStorage.setItem("disciplinas_professor_ctx", JSON.stringify([]));
      localStorage.setItem("disciplinas_professor", JSON.stringify([]));
    }
  };

  // ✅ CTA de cadastro (aparece somente quando a mensagem for "Usuário não encontrado.")
  const irParaCadastro = () => {
    const email = String(usuario || "").trim();
    navigate("/cadastro", { state: { email } });
  };

  // ✅ Voltar da etapa "escola" para "codigo" sem resetar sessão (usuarioId/senha/cooldown)
  const voltarParaCodigo = () => {
    setEtapa("codigo");
    setMensagem("");
    setTipoMensagem("info");
    // Mantém escolasVinculadas e usuarioId para evitar reenviar código
  };


  // ✅ Voltar com limpeza completa do estado da etapa "codigo"
  const voltarParaLogin = () => {
    setEtapa("login");

    // ✅ Limpa multi-escola
    setEscolasVinculadas([]);
    setEscolaSelecionada("");

    // ✅ Limpa estado da etapa de código
    setCodigo("");
    setUsuarioId(null);
    setNomeUsuarioLogin("");

    // ✅ Segurança: ao voltar, limpa a senha (mantém e-mail por conveniência)
    setSenha("");

    // ✅ Reset de senha
    setResetCodigo("");
    setResetSenha("");
    setResetConfSenha("");
    setResetEmailLocked(false);

    // ✅ Limpa feedback/flags
    setMensagem("");
    setTipoMensagem("erro");
    setSuccess(false);
    setLoading(false);
    setCooldown(0);
  };

  // ✅ Abrir fluxo de reset (só quando o e-mail for válido)
  const abrirResetSenha = () => {
    const email = String(usuario || "").trim().toLowerCase();

    if (!isEmailValido(email)) {
      setTipoMensagem("erro");
      setMensagem("Para redefinir a senha, informe um e-mail válido.");
      return;
    }

    setResetCodigo("");
    setResetSenha("");
    setResetConfSenha("");
    setResetEmailLocked(true); // trava para garantir o e-mail localizado

    setTipoMensagem("info");
    setMensagem("");
    setEtapa("reset_codigo");
    setCooldown(0);
  };

  // ✅ Enviar código de reset
  const handleResetEnviarCodigo = async () => {
    if (loading) return;

    const email = String(usuario || "").trim().toLowerCase();
    if (!isEmailValido(email)) {
      setTipoMensagem("erro");
      setMensagem("E-mail inválido.");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      await api.post("/api/auth/reset-senha/enviar-codigo", { email });

      setTipoMensagem("info");
      setMensagem("Enviamos um código para seu e-mail. Informe abaixo para continuar.");
      setCooldown(60);
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Erro ao enviar o código.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Confirmar código de reset
  const handleResetConfirmarCodigo = async (e) => {
    e.preventDefault();
    if (loading) return;

    const email = String(usuario || "").trim().toLowerCase();

    if (!isEmailValido(email)) {
      setTipoMensagem("erro");
      setMensagem("E-mail inválido.");
      return;
    }

    if (String(resetCodigo || "").trim().length !== 6) {
      setTipoMensagem("erro");
      setMensagem("Informe o código de 6 dígitos.");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      await api.post("/api/auth/reset-senha/confirmar-codigo", {
        email,
        codigo: String(resetCodigo).trim(),
      });

      setTipoMensagem("sucesso");
      setMensagem("Código confirmado. Agora crie sua nova senha.");
      setEtapa("reset_nova_senha");
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Código inválido ou expirado.");

      // 🔁 Limpa o código quando estiver incorreto
      setResetCodigo("");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Alterar senha (reset)
  const handleResetAlterarSenha = async (e) => {
    e.preventDefault();
    if (loading) return;

    const email = String(usuario || "").trim().toLowerCase();
    const code = String(resetCodigo || "").trim();

    if (!isEmailValido(email)) {
      setTipoMensagem("erro");
      setMensagem("E-mail inválido.");
      return;
    }

    if (code.length !== 6) {
      setTipoMensagem("erro");
      setMensagem("Código inválido.");
      return;
    }

    if (!senhaForte(resetSenha)) {
      setTipoMensagem("erro");
      setMensagem("Senha fraca. Use no mínimo 6 caracteres com letras, números e 1 destes: $#@*_");
      return;
    }

    if (resetSenha !== resetConfSenha) {
      setTipoMensagem("erro");
      setMensagem("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      await api.post("/api/auth/reset-senha/alterar", {
        email,
        codigo: code,
        senha: resetSenha,
      });

      setTipoMensagem("sucesso");
      setMensagem("Senha redefinida com sucesso! Você será redirecionado para o login.");

      // ✅ volta automático para login (mantendo o e-mail)
      setTimeout(() => {
        setEtapa("login");
        setSenha("");
        setResetCodigo("");
        setResetSenha("");
        setResetConfSenha("");
        setResetEmailLocked(false);
        setTipoMensagem("info");
        setMensagem("Agora faça login com sua nova senha.");
      }, 1200);
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Se veio do CadastroUsuario, já preenche o e-mail no campo
  useEffect(() => {
    const emailFromState = location?.state?.email;
    if (emailFromState) setUsuario(emailFromState);
  }, [location?.state]);

  // ✅ Ao entrar na etapa de código, inicia cooldown e controla contagem
  useEffect(() => {
    if (etapa !== "codigo") return;

    // inicia 60s somente se ainda não houver cooldown ativo
    setCooldown((prev) => (prev > 0 ? prev : 60));

    const t = setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(t);
  }, [etapa]);


  /**
   * 1ª Etapa — Envia:
   * - escola + cpf + senha => login escolar direto (diretor)
   * - escola + email/celular + senha => gera código de confirmação (OTP)
   * - plataforma + email + senha => inicia OTP da plataforma
   */
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!usuario?.trim() || !senha?.trim()) {
      setTipoMensagem("erro");
      setMensagem(
        tipoAcesso === "plataforma"
          ? "Informe e-mail e senha para continuar."
          : "Informe CPF, e-mail ou celular, além da senha, para continuar."
      );
      return;
    }

    const valorLogin = normalizarLogin(usuario);
    const isCpf = isCpfValido(valorLogin);

    if (tipoAcesso === "plataforma") {
      if (!isEmailValido(valorLogin)) {
        setTipoMensagem("erro");
        setMensagem("Na Plataforma, informe um e-mail válido para continuar.");
        return;
      }

      setLoading(true);
      setMensagem("");

      try {
        const { data } = await api.post("/api/auth-plataforma/login", {
          email: valorLogin,
          senha,
        });

        const resolvedUsuarioId =
          data?.usuarioId ?? data?.userId ?? data?.id ?? data?.usuario_id ?? data?.usuario?.id ?? null;

        if (!resolvedUsuarioId) {
          setTipoMensagem("erro");
          setMensagem("Falha ao iniciar confirmação da Plataforma. Atualize a página e tente novamente.");
          return;
        }

        setUsuarioId(resolvedUsuarioId);
        setTipoMensagem("info");
        setMensagem("Código enviado para o e-mail da Plataforma.");
        setCooldown(60);
        setEtapa("codigo");
        return;
      } catch (err) {
        setTipoMensagem("erro");
        setMensagem(err.response?.data?.message || "Erro no login da Plataforma.");
        return;
      } finally {
        setLoading(false);
      }
    }

    const okLogin = isEmailValido(valorLogin) || isCelularValido(valorLogin) || isCpf;

    if (!okLogin) {
      setTipoMensagem("erro");
      setMensagem("Informe um CPF, e-mail ou celular válido para continuar.");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      const payload = isCpf
        ? { cpf: valorLogin, senha }
        : { emailOuCelular: valorLogin, senha, device_token: getDeviceToken() };

      const { data } = await api.post("/api/auth/login", payload);

      // ✅ Fluxo novo: CPF de diretor retorna token direto (sem etapa OTP)
      if (isCpf && data?.token) {
        limparSessaoPlataforma();

        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.nome || "Usuário");
        localStorage.setItem("escola_id", data.escola_id || "");
        localStorage.setItem("nome_escola", data.nome_escola || "Escola não definida");
        localStorage.setItem("perfil", data.perfil || "diretor");
        localStorage.setItem("scope", data.scope || "escola");
        localStorage.setItem("perfis", JSON.stringify(Array.isArray(data?.perfis) ? data.perfis : []));
        localStorage.setItem("permissoes", JSON.stringify(Array.isArray(data?.permissoes) ? data.permissoes : []));
        // ✅ Sincroniza modulos_ativos no login — evita sidebar com valores obsoletos
        if (Array.isArray(data.modulos_ativos)) {
          localStorage.setItem('modulos_ativos', JSON.stringify(data.modulos_ativos));
        } else if (data.modulos_ativos === null) {
          localStorage.removeItem('modulos_ativos'); // null = irrestrito (CEO/super_admin)
        }

        // ✅ Sincroniza escola_tipo (ex: ['CCMDF']) para regras CCMDF no Sidebar
        if (Array.isArray(data.escola_tipo)) {
          localStorage.setItem('escola_tipo', JSON.stringify(data.escola_tipo));
        } else {
          localStorage.removeItem('escola_tipo');
        }

        setTipoMensagem("sucesso");
        setMensagem("Login realizado com sucesso!");
        setSuccess(true);

        setTimeout(() => {
          navigate("/home");
        }, 1200);

        return;
      }

      // ✅ Dispositivo confiado: backend pulou OTP (pode ter token direto ou pedir escola)
      // BUG FIX: não exigir data?.token aqui — multi-escola retorna sem token ainda
      if (!isCpf && data?.dispositivo_confiado) {
        limparSessaoPlataforma();

        // Multi-escola ainda precisa de seleção
        if (data?.multi_escola) {
          const lista = Array.isArray(data?.escolas) ? data.escolas : [];
          setEscolasVinculadas(lista);
          setUsuarioId(data.usuarioId || null);

          const ultima = localStorage.getItem("last_escola_id");
          const ctx = ultima ? lista.find((e) => String(e.id) === String(ultima)) : null;
          setEscolaSelecionada(ctx ? String(ctx.id) : "");
          setUsuarioCtxSelecionado(ctx ? String(ctx.usuario_ctx_id || "") : "");
          setNomeUsuarioLogin(String(data?.nome || ""));
          setTipoMensagem("info");
          setMensagem("Selecione a escola para entrar no sistema.");
          setEtapa("escola");
          return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.nome || "Usuário");
        localStorage.setItem("escola_id", data.escola_id || 1);
        localStorage.setItem("nome_escola", data.nome_escola || "Escola não definida");
        localStorage.setItem("perfil", data.perfil || "aluno");
        localStorage.setItem("scope", data.scope || "escola");
        localStorage.setItem("perfis", JSON.stringify(Array.isArray(data?.perfis) ? data.perfis : []));
        localStorage.setItem("permissoes", JSON.stringify(Array.isArray(data?.permissoes) ? data.permissoes : []));
        // ✅ Sincroniza modulos_ativos no login (dispositivo confiado)
        if (Array.isArray(data.modulos_ativos)) {
          localStorage.setItem('modulos_ativos', JSON.stringify(data.modulos_ativos));
        } else if (data.modulos_ativos === null) {
          localStorage.removeItem('modulos_ativos');
        }

        // ✅ Sincroniza escola_tipo (ex: ['CCMDF']) para regras CCMDF no Sidebar
        if (Array.isArray(data.escola_tipo)) {
          localStorage.setItem('escola_tipo', JSON.stringify(data.escola_tipo));
        } else {
          localStorage.removeItem('escola_tipo');
        }

        await carregarDisciplinasProfessor(data.token);

        const cpfLsD = data?.cpf || "";
        const fotoLsD = data?.foto_url || "";
        localStorage.setItem("cpf", String(cpfLsD || "").replace(/\D/g, ""));
        localStorage.setItem("foto_url", String(fotoLsD || ""));
        localStorage.setItem("last_escola_id", String(data.escola_id || ""));

        setTipoMensagem("sucesso");
        setMensagem("🔒 Login rápido! Dispositivo reconhecido.");
        setSuccess(true);

        setTimeout(() => { navigate("/home"); }, 1200);
        return;
      }

      // ✅ Fluxo legado/OTP: backend devolve usuarioId para confirmar código
      const resolvedUsuarioId =
        data?.usuarioId ?? data?.userId ?? data?.id ?? data?.usuario_id ?? data?.usuario?.id ?? null;

      if (!resolvedUsuarioId) {
        setTipoMensagem("erro");
        setMensagem("Falha ao iniciar confirmação: usuarioId não retornou no login. Atualize a página e tente novamente.");
        return;
      }

      setUsuarioId(resolvedUsuarioId);
      setTipoMensagem("info");
      setMensagem("Código enviado. Verifique seu e-mail.");
      setCooldown(60);
      setEtapa("codigo");
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Erro no login.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 2ª Etapa — Confirma o código enviado por e-mail
   * ✅ IMPORTANTE: mesma regra de rota (prefixo /auth já é aplicado ao /api no baseURL)
   * Espera-se que o backend retorne token, nome, escola_id, nome_escola e perfil.
   */

  const handleReenviarCodigo = async () => {
    if (loading) return;
    if (cooldown > 0) return;

    if (!usuario?.trim() || !senha?.trim()) {
      setTipoMensagem("erro");
      setMensagem(
        tipoAcesso === "plataforma"
          ? "Para reenviar o código, informe e-mail e senha novamente."
          : "Para reenviar o código, informe e-mail ou celular e senha novamente."
      );
      setEtapa("login");
      return;
    }

    const valorLogin = normalizarLogin(usuario);
    const isCpf = isCpfValido(valorLogin);

    if (tipoAcesso === "plataforma") {
      if (!isEmailValido(valorLogin)) {
        setTipoMensagem("erro");
        setMensagem("Na Plataforma, o reenviar código é válido apenas para e-mail.");
        setEtapa("login");
        return;
      }

      setLoading(true);
      setMensagem("");

      try {
        const { data } = await api.post("/api/auth-plataforma/login", {
          email: valorLogin,
          senha,
        });

        const resolvedUsuarioId =
          data?.usuarioId ?? data?.userId ?? data?.id ?? data?.usuario_id ?? data?.usuario?.id ?? null;

        if (!resolvedUsuarioId) {
          setTipoMensagem("erro");
          setMensagem("Falha ao reenviar: usuarioId não retornou no login da Plataforma.");
          return;
        }

        setUsuarioId(resolvedUsuarioId);
        setCodigo("");
        setTipoMensagem("info");
        setMensagem("Novo código enviado para o e-mail da Plataforma.");
        setCooldown(60);
        return;
      } catch (err) {
        setTipoMensagem("erro");
        setMensagem(err.response?.data?.message || "Erro ao reenviar o código da Plataforma.");
        return;
      } finally {
        setLoading(false);
      }
    }

    const okLogin = isEmailValido(valorLogin) || isCelularValido(valorLogin);

    if (isCpf || !okLogin) {
      setTipoMensagem("erro");
      setMensagem("O reenviar código é válido apenas para login por e-mail ou celular.");
      setEtapa("login");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      const { data } = await api.post("/api/auth/login", {
        emailOuCelular: valorLogin,
        senha,
      });

      const resolvedUsuarioId =
        data?.usuarioId ?? data?.userId ?? data?.id ?? data?.usuario_id ?? data?.usuario?.id ?? null;

      if (!resolvedUsuarioId) {
        setTipoMensagem("erro");
        setMensagem("Falha ao reenviar: usuarioId não retornou no login. Volte e tente novamente.");
        return;
      }

      setUsuarioId(resolvedUsuarioId);
      setCodigo("");
      setTipoMensagem("info");
      setMensagem("Novo código enviado. Verifique seu e-mail.");
      setCooldown(60);
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Erro ao reenviar o código.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async (e) => {
    e.preventDefault();

    if (!codigo?.trim()) {
      setTipoMensagem("erro");
      setMensagem("Informe o código para confirmar.");
      return;
    }

    if (!usuarioId) {
      setTipoMensagem("erro");
      setMensagem("Sessão da confirmação perdida. Clique em Voltar e envie o código novamente.");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      // ✅ Fluxo Plataforma (CEO)
      if (tipoAcesso === "plataforma") {
        const { data } = await api.post("/api/auth-plataforma/confirmar", {
          usuarioId,
          codigo,
        });

        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.nome || "Usuário");
        localStorage.setItem("perfil", data.perfil || "ADMIN_GLOBAL");
        localStorage.setItem("scope", data.scope || "plataforma");
        localStorage.setItem("perfis", JSON.stringify(Array.isArray(data?.perfis) ? data.perfis : []));
        localStorage.setItem("permissoes", JSON.stringify(Array.isArray(data?.permissoes) ? data.permissoes : []));

        // limpa vestígios do contexto escolar
        localStorage.removeItem("escola_id");
        localStorage.removeItem("nome_escola");
        localStorage.removeItem("cpf");
        localStorage.removeItem("foto_url");
        localStorage.removeItem("disciplinas_professor_ctx");
        localStorage.removeItem("disciplinas_professor");

        setTipoMensagem("sucesso");
        setMensagem("Login da Plataforma realizado com sucesso!");
        setSuccess(true);

        setTimeout(() => {
          navigate("/plataforma/escolas");
        }, 1200);

        return;
      }

      // ✅ Fluxo Escolar
      const { data } = await api.post("/api/auth/confirmar", {
        usuarioId,
        codigo,
        confiar_dispositivo: confirarDispositivo,
      });

      if (data?.multi_escola) {
        const lista = Array.isArray(data?.escolas) ? data.escolas : [];
        setEscolasVinculadas(lista);

        const ultima = localStorage.getItem("last_escola_id");
        const contextoUltimo = ultima
          ? lista.find((e) => String(e.id) === String(ultima))
          : null;

        setEscolaSelecionada(contextoUltimo ? String(contextoUltimo.id) : "");
        setUsuarioCtxSelecionado(contextoUltimo ? String(contextoUltimo.usuario_ctx_id || "") : "");
        setNomeUsuarioLogin(String(data?.nome || ""));

        setTipoMensagem("info");
        setMensagem("Selecione a escola para entrar no sistema.");
        setEtapa("escola");
        return;
      }

      limparSessaoPlataforma();

      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.nome || "Usuário");
      localStorage.setItem("escola_id", data.escola_id || 1);
      localStorage.setItem("nome_escola", data.nome_escola || "Escola não definida");
      localStorage.setItem("perfil", data.perfil || "aluno");
      localStorage.setItem("scope", data.scope || "escola");
      localStorage.setItem("perfis", JSON.stringify(Array.isArray(data?.perfis) ? data.perfis : []));
      localStorage.setItem("permissoes", JSON.stringify(Array.isArray(data?.permissoes) ? data.permissoes : []));
      // ✅ Sincroniza modulos_ativos no login (confirmação OTP)
      if (Array.isArray(data.modulos_ativos)) {
        localStorage.setItem('modulos_ativos', JSON.stringify(data.modulos_ativos));
      } else if (data.modulos_ativos === null) {
        localStorage.removeItem('modulos_ativos');
      }

      // ✅ Sincroniza escola_tipo (ex: ['CCMDF']) para regras CCMDF no Sidebar
      if (Array.isArray(data.escola_tipo)) {
        localStorage.setItem('escola_tipo', JSON.stringify(data.escola_tipo));
      } else {
        localStorage.removeItem('escola_tipo');
      }

      await carregarDisciplinasProfessor(data.token);

      const cpfLs = data?.cpf || data?.usuario?.cpf || data?.user?.cpf || "";
      const fotoLs = data?.fotoUrl || data?.foto_url || data?.foto || "";

      localStorage.setItem("cpf", String(cpfLs || "").replace(/\D/g, ""));
      localStorage.setItem("foto_url", String(fotoLs || ""));

      // ✅ Salvar device_token se o backend gerou (usuário marcou "confiar neste dispositivo")
      if (data?.device_token) saveDeviceToken(data.device_token);
      // Só limpa o device_token se o usuário explicitamente desmarcou a opção
      // NÃO limpar automaticamente apenas porque passou pelo OTP sem marcar
      // (usuário pode já ter um token válido de sessão anterior)
      if (!confirarDispositivo && !getDeviceToken()) clearDeviceToken();

      setTipoMensagem("sucesso");
      setMensagem("Login realizado com sucesso!");
      setSuccess(true);

      setTimeout(() => {
        navigate("/home");
      }, 1500);
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Erro na confirmação.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarEscola = async (e) => {
    e.preventDefault();

    if (!usuarioId) {
      setTipoMensagem("erro");
      setMensagem("Sessão perdida. Volte e envie o código novamente.");
      setEtapa("login");
      return;
    }

    if (!escolaSelecionada || !usuarioCtxSelecionado) {
      setTipoMensagem("erro");
      setMensagem("Selecione uma escola para continuar.");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      const { data } = await api.post("/api/auth/confirmar-escola", {
        usuarioId,
        escola_id: Number(escolaSelecionada),
        usuario_ctx_id: Number(usuarioCtxSelecionado),
      });

      localStorage.setItem("token", data.token);

      // ✅ Entrou no escopo escola: limpa sessão antiga da Plataforma (CEO)
      limparSessaoPlataforma();

      localStorage.setItem("userName", data.nome || "Usuário");
      localStorage.setItem("escola_id", data.escola_id || 1);
      localStorage.setItem("nome_escola", data.nome_escola || "Escola não definida");
      localStorage.setItem("perfil", data.perfil || "aluno");
      localStorage.setItem("scope", data.scope || "escola");

      // ✅ RBAC (perfis/permissoes)
      localStorage.setItem("perfis", JSON.stringify(Array.isArray(data?.perfis) ? data.perfis : []));
      localStorage.setItem("permissoes", JSON.stringify(Array.isArray(data?.permissoes) ? data.permissoes : []));
      // ✅ Sincroniza modulos_ativos no login (multi-escola)
      if (Array.isArray(data.modulos_ativos)) {
        localStorage.setItem('modulos_ativos', JSON.stringify(data.modulos_ativos));
      } else if (data.modulos_ativos === null) {
        localStorage.removeItem('modulos_ativos');
      }

      // ✅ Sincroniza escola_tipo (ex: ['CCMDF']) para regras CCMDF no Sidebar
      if (Array.isArray(data.escola_tipo)) {
        localStorage.setItem('escola_tipo', JSON.stringify(data.escola_tipo));
      } else {
        localStorage.removeItem('escola_tipo');
      }

      // ✅ DISCIPLINAS do professor (para Conteúdos)
      await carregarDisciplinasProfessor(data.token);

      // ✅ Cabeçalho: CPF + Foto (URL) para avatar global
      // Tolerante a variações do backend: fotoUrl | foto_url | foto
      const cpfLs = data?.cpf || data?.usuario?.cpf || data?.user?.cpf || "";
      const fotoLs = data?.fotoUrl || data?.foto_url || data?.foto || "";

      localStorage.setItem("cpf", String(cpfLs || "").replace(/\D/g, ""));
      localStorage.setItem("foto_url", String(fotoLs || ""));

      // ✅ Memoriza a última escola usada para pré-seleção futura
      localStorage.setItem("last_escola_id", String(data.escola_id || ""));



      setTipoMensagem("sucesso");
      setMensagem("Login realizado com sucesso!");
      setSuccess(true);

      setTimeout(() => {
        navigate("/home");
      }, 1500);
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(err.response?.data?.message || "Erro ao selecionar escola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen relative flex items-center justify-center">
      {/* 🌆 Fundo */}
      <div className="absolute inset-0 bg-[url('/login_wallpaper.png')] bg-repeat bg-[length:750px_750px]"></div>
      <div className="absolute inset-0 bg-blue-200/20"></div>

      {/* 🧾 Card */}
      <div className="relative z-10 bg-white/90 p-8 rounded-2xl shadow-xl w-96 min-h-[420px] flex flex-col justify-center">
        {success ? (
          <div className="text-center text-green-700 font-semibold text-lg animate-fadeIn">
            Login realizado com sucesso!
          </div>

        ) : etapa === "login" ? (
          // 🔐 Formulário de login
          <form onSubmit={handleLogin} className="flex flex-col space-y-4">
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => {
                  setTipoAcesso("escola");
                  setMensagem("");
                  setUsuario("");
                  setSenha("");
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  tipoAcesso === "escola"
                    ? "bg-blue-600 text-white shadow"
                    : "text-gray-700 hover:bg-white"
                }`}
              >
                Sistema Escolar
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoAcesso("plataforma");
                  setMensagem("");
                  setUsuario("");
                  setSenha("");
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  tipoAcesso === "plataforma"
                    ? "bg-slate-800 text-white shadow"
                    : "text-gray-700 hover:bg-white"
                }`}
              >
                Plataforma (CEO)
              </button>
            </div>

            <h2 className="text-xl font-bold text-center text-blue-900">
              {tipoAcesso === "plataforma" ? "Login da Plataforma" : "Login"}
            </h2>

            {mensagem && (
              <div className="space-y-3">
                <div
                  className={`rounded border p-2 text-center text-sm font-semibold ${
                    tipoMensagem === "sucesso"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : tipoMensagem === "info"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {mensagem}
                </div>

                {/* ✅ CTA: direciona para cadastro somente quando for "Usuário não encontrado." */}
                {tipoAcesso === "escola" &&
                  tipoMensagem === "erro" &&
                  String(mensagem || "").toLowerCase().includes("usuário não encontrado") && (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <div className="text-center text-sm text-gray-700">
                        Ainda não tem cadastro?
                      </div>

                      <button
                        type="button"
                        onClick={irParaCadastro}
                        className="mt-2 w-full rounded-lg bg-gray-900 py-2 text-sm font-semibold text-white hover:bg-black"
                      >
                        Criar conta
                      </button>

                      <div className="mt-2 text-center text-xs text-gray-500">
                        Você será direcionado para o cadastro e seu e-mail será reaproveitado.
                      </div>
                    </div>
                  )}

                {/* ✅ CTA: redefinir senha (somente quando senha estiver incorreta) */}
                {tipoAcesso === "escola" &&
                  tipoMensagem === "erro" &&
                  (String(mensagem || "").toLowerCase().includes("senha") ||
                    String(mensagem || "").toLowerCase().includes("credenciais")) &&
                  !String(mensagem || "").toLowerCase().includes("usuário não encontrado") && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <div className="text-center text-sm font-semibold text-amber-900">
                        Esqueceu sua senha?
                      </div>

                      <div className="mt-1 text-center text-xs text-amber-800">
                        Vamos enviar um código para seu e-mail e permitir criar uma nova senha com segurança.
                      </div>

                      <button
                        type="button"
                        onClick={abrirResetSenha}
                        className="mt-2 w-full rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                      >
                        Criar nova senha
                      </button>
                    </div>
                  )}
              </div>
            )}

            <input
              type="text"
              placeholder={
                tipoAcesso === "plataforma"
                  ? "E-mail da Plataforma"
                  : "CPF, e-mail ou celular"
              }
              value={usuario}
              onChange={(e) => {
                setUsuario(e.target.value);
                setMensagem("");
              }}
              className="px-4 py-2 rounded-lg border border-gray-300"
            />

            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setMensagem("");
              }}
              className="px-4 py-2 rounded-lg border border-gray-300"
            />

            <button
              className="bg-blue-600 text-white py-2 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || !usuario?.trim() || !senha?.trim()}
            >
              {loading ? "Entrando..." : "Continuar"}
            </button>

            {loading && (
              <div className="flex flex-col items-center mt-2 text-blue-600">
                <svg
                  className="animate-spin h-5 w-5 mb-1"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                <span className="text-sm font-medium">Verificando...</span>
              </div>
            )}
          </form>





        ) : etapa === "reset_codigo" ? (
          // 🔐 Reset senha — etapa 1: enviar/confirmar código
          <form onSubmit={handleResetConfirmarCodigo} className="flex flex-col space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-900">Redefinir senha</h2>

            <p className="text-center text-sm text-gray-600">
              Enviaremos um código de verificação para o e-mail cadastrado.
            </p>

            {mensagem && (
              <div
                className={`rounded border p-2 text-center text-sm font-semibold ${
                  tipoMensagem === "sucesso"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : tipoMensagem === "info"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {mensagem}
              </div>
            )}

            <input
              type="email"
              placeholder="E-mail"
              value={usuario}
              readOnly={resetEmailLocked}
              onChange={(e) => {
                setUsuario(e.target.value);
                setMensagem("");
              }}
              className={`px-4 py-2 rounded-lg border border-gray-300 ${
                resetEmailLocked ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            />

            <button
              type="button"
              onClick={handleResetEnviarCodigo}
              className="rounded-lg border border-blue-200 bg-blue-50 py-2 font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || !isEmailValido(usuario)}
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>

            <input
              type="text"
              placeholder="Digite o código"
              value={resetCodigo}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              onChange={(e) => {
                const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setResetCodigo(onlyDigits);
                setMensagem("");
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-center font-mono text-lg tracking-widest"
            />

            <button
              className="bg-green-600 text-white py-2 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || resetCodigo.length !== 6}
            >
              {loading ? "Confirmando..." : "Confirmar código"}
            </button>

            <button
              type="button"
              onClick={voltarParaLogin}
              className="rounded-lg border border-gray-300 bg-white py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading}
            >
              Voltar
            </button>
          </form>
        ) : etapa === "reset_nova_senha" ? (
          // 🔐 Reset senha — etapa 2: criar nova senha
          <form onSubmit={handleResetAlterarSenha} className="flex flex-col space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-900">Criar nova senha</h2>

            <p className="text-center text-sm text-gray-600">
              Mínimo 6 caracteres, com letras, números e pelo menos 1 destes: $#@*_
            </p>

            {mensagem && (
              <div
                className={`rounded border p-2 text-center text-sm font-semibold ${
                  tipoMensagem === "sucesso"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : tipoMensagem === "info"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {mensagem}
              </div>
            )}

            <input
              type="password"
              placeholder="Nova senha"
              value={resetSenha}
              autoComplete="new-password"
              onChange={(e) => {
                setResetSenha(e.target.value);
                setMensagem("");
              }}
              className="px-4 py-2 rounded-lg border border-gray-300"
            />

            {resetSenha && !senhaForte(resetSenha) && (
              <div className="text-xs text-red-600 text-center">
                Senha fraca. Use no mínimo 6 caracteres com letras, números e 1 destes: $#@*_
              </div>
            )}

            <input
              type="password"
              placeholder="Confirmar nova senha"
              value={resetConfSenha}
              autoComplete="new-password"
              onChange={(e) => {
                setResetConfSenha(e.target.value);
                setMensagem("");
              }}
              className="px-4 py-2 rounded-lg border border-gray-300"
            />

            {resetConfSenha && resetSenha !== resetConfSenha && (
              <div className="text-xs text-red-600 text-center">As senhas não coincidem.</div>
            )}

            <button
              className="bg-green-600 text-white py-2 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || !senhaForte(resetSenha) || resetSenha !== resetConfSenha}
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>

            <button
              type="button"
              onClick={voltarParaLogin}
              className="rounded-lg border border-gray-300 bg-white py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading}
            >
              Voltar
            </button>
          </form>
        ) : etapa === "codigo" ? (






          // 🔢 Formulário de confirmação de código
          <form onSubmit={handleConfirmar} className="flex flex-col space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-900">Confirmação</h2>
            <p className="text-center text-sm text-gray-600">
              Um código foi enviado para seu e-mail cadastrado.
            </p>

            {mensagem && (
              <div
                className={`rounded border p-2 text-center text-sm font-semibold ${
                  tipoMensagem === "sucesso"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : tipoMensagem === "info"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {mensagem}
              </div>
            )}

            <input
              type="text"
              placeholder="Digite o código"
              value={codigo}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              onChange={(e) => {
                const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCodigo(onlyDigits);
                setMensagem("");
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-center font-mono text-lg tracking-widest"
            />

            {/* ✅ Opção: Confiar neste dispositivo */}
            <label
              htmlFor="confiar-dispositivo"
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all select-none ${
                confirarDispositivo
                  ? "border-blue-400 bg-blue-50 shadow-sm"
                  : "border-gray-200 bg-gray-50 hover:bg-white"
              }`}
            >
              <input
                id="confiar-dispositivo"
                type="checkbox"
                checked={confirarDispositivo}
                onChange={(e) => setConfirarDispositivo(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-blue-600 flex-shrink-0"
              />
              <div>
                <div className={`text-sm font-semibold ${ confirarDispositivo ? "text-blue-800" : "text-gray-700" }`}>
                  Não pedir código neste aparelho
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Este dispositivo será lembrado por 90 dias. Use apenas em aparelhos de uso pessoal.
                </div>
              </div>
            </label>

            <button
              className="bg-green-600 text-white py-2 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || codigo.length !== 6}
            >
              {loading ? "Confirmando..." : "Confirmar"}
            </button>

            <button
              type="button"
              onClick={handleReenviarCodigo}
              className="rounded-lg border border-blue-200 bg-blue-50 py-2 font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || cooldown > 0}
            >
              {cooldown > 0 ? `Reenviar em 00:${String(cooldown).padStart(2, "0")}` : "Reenviar código"}
            </button>

            <button
              type="button"
              onClick={voltarParaLogin}
              className="rounded-lg border border-gray-300 bg-white py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading}
            >
              Voltar
            </button>

            {loading && (
              <div className="flex flex-col items-center mt-2 text-green-600">
                <svg
                  className="animate-spin h-5 w-5 mb-1"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                <span className="text-sm font-medium">Verificando...</span>
              </div>
            )}
          </form>
        ) : (
          // 🏫 Seleção de escola (multi-escola)
          <form onSubmit={handleConfirmarEscola} className="flex flex-col space-y-4">
            <h2 className="text-xl font-bold text-center text-blue-900">Selecione a escola</h2>

            {nomeUsuarioLogin?.trim() && (
              <p className="text-center text-sm text-gray-700">
                Bem-vindo(a), <span className="font-semibold">{nomeUsuarioLogin}</span>
              </p>
            )}

            <p className="text-center text-sm text-gray-600">
              Você possui vínculo com mais de uma escola. Escolha o contexto de acesso.
            </p>


            {mensagem && (
              <div
                className={`rounded border p-2 text-center text-sm font-semibold ${
                  tipoMensagem === "sucesso"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : tipoMensagem === "info"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {mensagem}
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-col gap-2">
                {(Array.isArray(escolasVinculadas) ? escolasVinculadas : []).map((esc) => (
                  <label
                    key={String(esc.id)}
                      className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-gray-50"
                  >

                    <input
                      type="radio"
                      name="escola"
                      value={String(esc.usuario_ctx_id || esc.id)}
                      checked={String(usuarioCtxSelecionado) === String(esc.usuario_ctx_id || "")}
                      onChange={() => {
                        setEscolaSelecionada(String(esc.id));
                        setUsuarioCtxSelecionado(String(esc.usuario_ctx_id || ""));
                        setMensagem("");
                      }}
                      disabled={loading}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">
                        {esc.nome}
                        {esc.apelido && (
                          <span className="ml-1 font-semibold text-blue-700">({esc.apelido})</span>
                        )}
                        {" "}<span className="text-xs text-gray-500">({esc.perfil})</span>
                      </span>

                      {String(localStorage.getItem("last_escola_id") || "") === String(esc.id) && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Última usada
                        </span>
                      )}
                    </div>
                  </label>

                ))}
              </div>
            </div>

            <button
              className="bg-green-600 text-white py-2 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || !escolaSelecionada || !usuarioCtxSelecionado}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <button
              type="button"
              onClick={voltarParaCodigo}
              className="rounded-lg border border-gray-300 bg-white py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading}
            >
              Voltar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

