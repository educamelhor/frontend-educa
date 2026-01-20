// src/features/login/Login.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api"; // Serviço centralizado para requisições

function isEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isCelularValido(valor) {
  const digits = String(valor || "").replace(/\D/g, "");
  // Aceita 10 ou 11 dígitos (com ou sem DDD)
  return digits.length === 10 || digits.length === 11;
}


export default function Login() {
  // 📌 Controle de etapas do fluxo de login
  const [etapa, setEtapa] = useState("login"); // "login" | "codigo" | "escola"

  // 📌 Campos do formulário
  const location = useLocation();

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");

  // 📌 Metadados do usuário e UI
  const [usuarioId, setUsuarioId] = useState(null);
  const [nomeUsuarioLogin, setNomeUsuarioLogin] = useState(""); // ✅ nome para exibir no multi-escola
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);


  // ✅ Multi-escola (seleção de contexto)
  const [escolasVinculadas, setEscolasVinculadas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState("");


  // ✅ Mensagens inline (substitui alert)
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro"); // "erro" | "info" | "sucesso"

  // ✅ Reenviar código (cooldown)
  const [cooldown, setCooldown] = useState(0); // segundos restantes


  const navigate = useNavigate();

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

    // ✅ Limpa feedback/flags
    setMensagem("");
    setTipoMensagem("erro");
    setSuccess(false);
    setLoading(false);
    setCooldown(0);
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
   * 1ª Etapa — Envia e-mail/celular + senha para gerar o código de confirmação
   */
  const handleLogin = async (e) => {
    e.preventDefault();

    // ✅ Hard validation (não dispara request desnecessária)
    if (!usuario?.trim() || !senha?.trim()) {
      setTipoMensagem("erro");
      setMensagem("Informe e-mail (ou celular) e senha para continuar.");
      return;
    }

    // ✅ Validação premium: evita tentar login com NOME (ou texto aleatório)
    const valorLogin = usuario.trim();
    const okLogin = isEmailValido(valorLogin) || isCelularValido(valorLogin);

    if (!okLogin) {
      setTipoMensagem("erro");
      setMensagem("Informe um e-mail válido ou um celular válido (com DDD) para continuar.");
      return;
    }


    setLoading(true);
    setMensagem("");

    try {
      const { data } = await api.post("/api/auth/login", {
        emailOuCelular: usuario,
        senha,
      });

      // Armazena ID do usuário para usar na confirmação
      // Blindagem: backend pode devolver esse id com nomes diferentes (usuarioId, userId, id, usuario_id)
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

    // segurança: precisa de credenciais ainda em memória para reenviar
    if (!usuario?.trim() || !senha?.trim()) {
      setTipoMensagem("erro");
      setMensagem("Para reenviar o código, informe e-mail e senha novamente.");
      setEtapa("login");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      const { data } = await api.post("/api/auth/login", {
        emailOuCelular: usuario,
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
      setCodigo(""); // limpa tentativa anterior


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

    // Blindagem: se o usuarioId não estiver presente, não adianta tentar confirmar
    if (!usuarioId) {
      setTipoMensagem("erro");
      setMensagem("Sessão da confirmação perdida. Clique em Voltar e envie o código novamente.");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      const { data } = await api.post("/api/auth/confirmar", {
        usuarioId,
        codigo,
      });

      // ✅ Se for multi-escola, não salva token ainda. Obriga escolher a escola.
      if (data?.multi_escola) {
        const lista = Array.isArray(data?.escolas) ? data.escolas : [];
        setEscolasVinculadas(lista);

        // ✅ Pré-seleciona última escola usada (se ainda existir no vínculo)
        const ultima = localStorage.getItem("last_escola_id");
        const existe = ultima && lista.some((e) => String(e.id) === String(ultima));
        setEscolaSelecionada(existe ? String(ultima) : "");

        // ✅ Nome para cabeçalho da etapa "escola"
        setNomeUsuarioLogin(String(data?.nome || ""));

        setTipoMensagem("info");
        setMensagem("Selecione a escola para entrar no sistema.");
        setEtapa("escola");
        return;
      }


      // Salva dados no localStorage para uso global
      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.nome || "Usuário");
      localStorage.setItem("escola_id", data.escola_id || 1);
      localStorage.setItem("nome_escola", data.nome_escola || "Escola não definida");
      localStorage.setItem("perfil", data.perfil || "aluno");

      // ✅ Cabeçalho: CPF + Foto (URL) para avatar global
      // Tolerante a variações do backend: fotoUrl | foto_url | foto
      const cpfLs = data?.cpf || data?.usuario?.cpf || data?.user?.cpf || "";
      const fotoLs = data?.fotoUrl || data?.foto_url || data?.foto || "";

      localStorage.setItem("cpf", String(cpfLs || ""));
      localStorage.setItem("foto_url", String(fotoLs || ""));


      setTipoMensagem("sucesso");
      setMensagem("Login realizado com sucesso!");
      setSuccess(true);

      // Redireciona após breve feedback
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

    if (!escolaSelecionada) {
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
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("userName", data.nome || "Usuário");
      localStorage.setItem("escola_id", data.escola_id || 1);
      localStorage.setItem("nome_escola", data.nome_escola || "Escola não definida");
      localStorage.setItem("perfil", data.perfil || "aluno");

      // ✅ Cabeçalho: CPF + Foto (URL) para avatar global
      // Tolerante a variações do backend: fotoUrl | foto_url | foto
      const cpfLs = data?.cpf || data?.usuario?.cpf || data?.user?.cpf || "";
      const fotoLs = data?.fotoUrl || data?.foto_url || data?.foto || "";

      localStorage.setItem("cpf", String(cpfLs || ""));
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
            <h2 className="text-xl font-bold text-center text-blue-900">Login</h2>

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
              placeholder="E-mail ou celular"
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
              {loading ? "Enviando..." : "Enviar código"}
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
                      value={String(esc.id)}
                      checked={String(escolaSelecionada) === String(esc.id)}
                      onChange={(e) => {
                        setEscolaSelecionada(e.target.value);
                        setMensagem("");
                      }}
                      disabled={loading}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">{esc.nome}</span>

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
              disabled={loading || !escolaSelecionada}
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

