// src/features/login/CadastroUsuario.jsx
import React, { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

/* ──────────────────────────────────────────────────────────────
   Utilitários (máscaras e validações)
   ────────────────────────────────────────────────────────────── */
function maskCPF(value) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .slice(0, 14);
}
function maskCelular(value) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
}
function isCPFValido(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = 11 - (soma % 11);
  let dig1 = resto >= 10 ? 0 : resto;
  if (dig1 !== parseInt(cpf.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = 11 - (soma % 11);
  let dig2 = resto >= 10 ? 0 : resto;
  if (dig2 !== parseInt(cpf.charAt(10))) return false;
  return true;
}
function isDataValida(data) {
  if (!data) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(data);
}
function isEmailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function toIsoDate(data) {
  if (!data) return "";
  if (data.includes("/")) {
    const [d, m, a] = data.split("/");
    return `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return data;
}
function formatDateForInput(data) {
  return toIsoDate(data);
}
function senhaForte(s) {
  if (!s) return false;
  return s.length >= 6; // regra mínima acordada (pode evoluir)
}

/* ──────────────────────────────────────────────────────────────
   Constantes
   ────────────────────────────────────────────────────────────── */
const sexos = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
];
const perfis = [
  "Admin",
  "Coordenador",
  "Diretor ou Vice",
  "Estudante",
  "Militar",
  "Orientador",
  "Pais ou Responsáveis",
  "Professor",
  "Prof. Sala de Recurso",
  "Secretário",
  "Supervisor",
].sort();

/* ──────────────────────────────────────────────────────────────
   Modal de Senha (moderno)
   ────────────────────────────────────────────────────────────── */
function ModalSenha({
  open,
  onClose,
  onSalvar,
  senha,
  setSenha,
  confSenha,
  setConfSenha,
  enviando,
  erroSenha,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-center text-2xl font-bold text-blue-700">
          Crie sua senha
        </h2>
        <p className="mb-4 text-center text-sm text-gray-500">
          Use no mínimo 6 caracteres. Confirme abaixo.
        </p>

        <div className="mb-3">
          <label className="text-sm text-gray-700">Senha</label>
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoFocus
            autoComplete="new-password"
          />
          {!senhaForte(senha) && (
            <div className="mt-1 text-xs text-red-600">
              Senha fraca (mínimo 6 caracteres).
            </div>
          )}
        </div>

        <div className="mb-2">
          <label className="text-sm text-gray-700">Confirmar senha</label>
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            value={confSenha}
            onChange={(e) => setConfSenha(e.target.value)}
            autoComplete="new-password"
          />
          {confSenha && senha !== confSenha && (
            <div className="mt-1 text-xs text-red-600">Senhas não coincidem.</div>
          )}
        </div>

        {erroSenha && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-center text-sm text-red-600">
            {erroSenha}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded border px-4 py-2 hover:bg-gray-100"
            onClick={onClose}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onSalvar}
            disabled={enviando || !senhaForte(senha) || senha !== confSenha}
          >
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Componente principal
   ────────────────────────────────────────────────────────────── */
export default function CadastroUsuario() {
  const [etapa, setEtapa] = useState(1);
  const [email, setEmail] = useState("");
  const [emailValido, setEmailValido] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [codigoInput, setCodigoInput] = useState("");
  const [aguardando, setAguardando] = useState(false);
  const [codigoEnviadoPara, setCodigoEnviadoPara] = useState("");
  const [emailJaExiste, setEmailJaExiste] = useState(false);
  const [usuarioIdPreCadastro, setUsuarioIdPreCadastro] = useState(null);

  // Perfil/CPF + dados pessoais
  const [perfilSelecionado, setPerfilSelecionado] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfBuscando, setCpfBuscando] = useState(false);
  const [cpfNaoEncontrado, setCpfNaoEncontrado] = useState(false);
  const [cpfLocalizado, setCpfLocalizado] = useState(false);
  const [perfilDoBanco, setPerfilDoBanco] = useState("");
  const [nomePreCadastrado, setNomePreCadastrado] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [sexo, setSexo] = useState("");
  const [celular, setCelular] = useState("");
  const [tocado, setTocado] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [escolaId, setEscolaId] = useState(null);

  // Modal de senha
  const [abrirModalSenha, setAbrirModalSenha] = useState(false);
  const [senha, setSenha] = useState("");
  const [confSenha, setConfSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const navigate = useNavigate();

  /* ── ETAPA 1: e-mail ─────────────────────────────────────── */
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setEmailValido(isEmailValido(val));
    setMensagem("");
  };

  const handleEnviarCodigo = async (e) => {
    e.preventDefault();
    setMensagem("");
    setAguardando(true);

    if (emailJaExiste) {
      navigate("/login");
      return;
    }

    try {
      await api.get(`/api/usuarios/por-email/${email}`);
      setMensagem(
        "E-mail já cadastrado. Entre com seu usuário e senha. Se esqueceu a senha, crie uma nova senha."
      );
      setEmailJaExiste(true);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        try {
          await api.post("/api/auth/enviar-codigo-cadastro", { email });
          setCodigoEnviadoPara(email);
          setMensagem("Enviamos um código de verificação para seu e-mail.");
          setEtapa(2);
          setEmailJaExiste(false);
        } catch {
          setMensagem("Erro ao enviar código. Tente novamente.");
        }
      } else {
        setMensagem("Erro ao verificar usuário. Tente novamente.");
      }
    } finally {
      setAguardando(false);
    }
  };

  /* ── ETAPA 2: código ─────────────────────────────────────── */
  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    setMensagem("");
    setAguardando(true);
    try {
      await api.post("/api/auth/confirmar-codigo-cadastro", {
        email: codigoEnviadoPara,
        codigo: codigoInput,
      });
      setMensagem("Código verificado com sucesso!");
      // pequena transição antes da próxima tela
      setTimeout(() => {
        setMensagem("");
        setEtapa(4); // vai para seleção de perfil (conforme fluxo já aprovado)
      }, 1200);
    } catch {
      setMensagem("Código não confere ou expirou.");
    } finally {
      setAguardando(false);
    }
  };

  /* ── ETAPA 3/4: perfil + CPF + dados pessoais ────────────── */
  const handlePerfilChange = (e) => {
    setPerfilSelecionado(e.target.value);
    setCpf("");
    setCpfNaoEncontrado(false);
    setCpfLocalizado(false);
    setPerfilDoBanco("");
    setNomePreCadastrado("");
    setDataNasc("");
    setSexo("");
    setCelular("");
    setTocado({});
  };

  const handleBuscarCPF = async (e) => {
    e.preventDefault();
    setCpfBuscando(true);
    setCpfNaoEncontrado(false);
    setMensagem("");
    setCpfLocalizado(false);
    setPerfilDoBanco("");
    setNomePreCadastrado("");
    setDataNasc("");
    setSexo("");
    setCelular("");
    
    try {
      const cpfLimpo = cpf.replace(/\D/g, "");
      const { data } = await api.get(`/api/usuarios/por-cpf/${cpfLimpo}`);
      setUsuarioIdPreCadastro(data.id || null); // 🔹 Guardar o ID do usuário localizado
      setEscolaId(data.escola_id || null);
      setPerfilDoBanco(data.perfil || "");
      setNomePreCadastrado(data.nome || "");
      setDataNasc(formatDateForInput(data.data_nascimento || ""));
      setSexo(data.sexo || "");
      setCelular(data.celular || "");
      setCpfNaoEncontrado(false);
      setCpfLocalizado(true);
      setTocado({});
    } catch {
      setCpfNaoEncontrado(true);
      setCpfLocalizado(false);
    } finally {
      setCpfBuscando(false);
    }
  };

  // 👉 Conforme o fluxo acordado:
  // "Continuar" aqui APENAS abre o modal de senha.
  // Nada é salvo no backend ainda.
  const abrirModalDeSenha = (e) => {
    e.preventDefault();
    setErroSenha("");
    setSenha("");
    setConfSenha("");
    setAbrirModalSenha(true);
  };

  /* ── ETAPA FINAL: salvar tudo (dados pessoais + senha) ───── */
  const handleSalvarTudo = async () => {
    setErroSenha("");
    setEnviando(true);
 
     // 🔹 Sempre enviar CPF sem máscara para evitar falhas no backend
  const cpfLimpo = cpf.replace(/\D/g, "");


    const payloadDados = {
      id: usuarioIdPreCadastro, // 🔹 ID do usuário pré-cadastrado (preferido no backend)
      cpf: cpfLimpo,
      nome: nomePreCadastrado,
      data_nascimento: formatDateForInput(dataNasc),
      sexo,
      celular: celular.replace(/\D/g, ""), // 🔹 Celular também sem máscara
      email: codigoEnviadoPara, // 🔹 Sempre o e-mail verificado
      escola_id: escolaId
    };

    try {
      // 1) Completa dados pessoais
      await api.post("/api/auth/complementar-professor", payloadDados);

      // 2) Cadastra senha usando o CPF limpo
      await api.post("/api/auth/cadastrar-senha", {
        cpf: cpfLimpo,
        senha,
        email: codigoEnviadoPara,
        celular: celular.replace(/\D/g, ""),
        perfil: perfilSelecionado
      });

      // Sucesso → mensagem verde + redirecionar /login em 2s
      setSucesso(true);
      setMensagem("Cadastro concluído! Redirecionando para o login...");
      setAbrirModalSenha(false);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Erro ao concluir o cadastro. Tente novamente.";
      setErroSenha(msg);
    } finally {
      setEnviando(false);
    }
  };

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto mt-10 max-w-md rounded bg-white p-6 shadow">
      <h1 className="mb-4 text-center text-2xl font-bold">Cadastro de Usuário</h1>

      {/* Loader elegante */}
      {aguardando && (
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-4 border-t-4 border-blue-500"></div>
          <div className="mt-2 animate-pulse text-sm font-semibold text-blue-500">
            Processando...
          </div>
        </div>
      )}

      {sucesso && mensagem && (
        <div className="mb-4 text-center font-semibold text-green-600">{mensagem}</div>
      )}

      {/* ETAPA 1: e-mail */}
      {etapa === 1 && (
        <form onSubmit={handleEnviarCodigo}>
          <label>Digite seu e-mail:</label>
          <input
            className="mb-2 w-full rounded border px-3 py-2"
            type="email"
            value={email}
            onChange={handleEmailChange}
            required
            autoFocus
            maxLength={60}
            placeholder="seu@email.com"
            inputMode="email"
            autoComplete="off"
            disabled={aguardando}
          />
          {!emailValido && email.length > 3 && (
            <div className="animate-fadeIn mb-2 text-sm text-red-600">
              Informe um e-mail válido.
            </div>
          )}
          <button
            className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
            type="submit"
            disabled={!emailValido || aguardando}
          >
            {emailJaExiste ? "Ir para Login" : aguardando ? "Enviando código..." : "Avançar"}
          </button>
        </form>
      )}

      {/* ETAPA 2: código de verificação */}
      {etapa === 2 && (
        <form onSubmit={handleVerificarCodigo}>
          <label>
            Informe o código enviado para <br />
            <span className="font-semibold">{codigoEnviadoPara}</span>
          </label>
          <input
            className="mt-2 mb-2 w-full rounded border px-3 py-2 text-center font-mono text-xl tracking-widest"
            type="text"
            value={codigoInput}
            onChange={(e) => setCodigoInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            maxLength={6}
            autoFocus
            placeholder="Digite o código"
            disabled={aguardando}
          />
          {mensagem && (
            <div
              className={`mb-3 text-center font-semibold ${
                mensagem.includes("sucesso") ? "text-green-600" : "text-red-600"
              }`}
            >
              {mensagem}
            </div>
          )}
          <button
            className="w-full rounded bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
            type="submit"
            disabled={codigoInput.length !== 6 || aguardando}
          >
            {aguardando ? "Verificando..." : "Confirmar código"}
          </button>
        </form>
      )}

      {/* ETAPA 4: seleção de perfil + CPF + DADOS PESSOAIS */}
      {etapa === 4 && (
        <div>
          <label>Selecione o tipo de usuário:</label>
          <select
            className="mb-4 w-full rounded border px-3 py-2"
            value={perfilSelecionado}
            onChange={handlePerfilChange}
            autoFocus
          >
            <option value="">Selecione...</option>
            {perfis.map((p) => (
              <option value={p} key={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Perfil que exige CPF */}
          {perfilSelecionado &&
            perfilSelecionado !== "Estudante" &&
            perfilSelecionado !== "Pais ou Responsáveis" && (
              <>
                {/* CPF */}
                <form onSubmit={handleBuscarCPF} autoComplete="off">
                  <label>Digite seu CPF:</label>
                  <input
                    className="mb-2 w-full rounded border px-3 py-2"
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    disabled={cpfBuscando || cpfLocalizado}
                    autoFocus
                  />
                  {cpf && !isCPFValido(cpf) && (
                    <div className="animate-fadeIn mb-2 text-sm text-red-600">CPF inválido!</div>
                  )}
                  <button
                    className="w-full rounded bg-blue-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
                    type="submit"
                    disabled={!isCPFValido(cpf) || cpfBuscando || cpfLocalizado}
                  >
                    {cpfBuscando ? "Buscando CPF..." : "Confirmar CPF"}
                  </button>

                  {cpfNaoEncontrado && (
                    <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-center text-red-600">
                      Procure sua escola para realizar o seu pré-cadastro.
                    </div>
                  )}
                </form>

                {/* CPF localizado e perfil confere → formulário de dados pessoais */}
                {cpfLocalizado &&
                  perfilDoBanco &&
                  perfilDoBanco.toLowerCase() === perfilSelecionado.toLowerCase() && (
                    <>
                      <div className="mt-3 rounded border border-green-200 bg-green-50 p-2 text-center text-green-700">
                        CPF localizado! Complete seu cadastro abaixo.
                      </div>

                      <form className="mt-4" autoComplete="off" onSubmit={abrirModalDeSenha}>
                        {/* Nome (somente leitura) */}
                        <div className="mb-2">
                          <label>Nome completo:</label>
                          <input
                            className="w-full cursor-not-allowed rounded border bg-gray-100 px-3 py-2"
                            value={nomePreCadastrado}
                            readOnly
                            disabled
                          />
                        </div>

                        {/* Data Nascimento */}
                        <div className="mb-2">
                          <label>Data de nascimento:</label>
                          <input
                            className="w-full rounded border px-3 py-2"
                            type="date"
                            value={formatDateForInput(dataNasc)}
                            onBlur={() => setTocado((t) => ({ ...t, dataNasc: true }))}
                            onChange={(e) => setDataNasc(e.target.value)}
                            required
                          />
                          {tocado.dataNasc && !isDataValida(formatDateForInput(dataNasc)) && (
                            <div className="mt-1 text-xs text-red-600">Campo obrigatório</div>
                          )}
                        </div>

                        {/* Sexo */}
                        <div className="mb-2">
                          <label>Sexo:</label>
                          <select
                            className="w-full rounded border px-3 py-2"
                            value={sexo}
                            onBlur={() => setTocado((t) => ({ ...t, sexo: true }))}
                            onChange={(e) => setSexo(e.target.value)}
                            required
                          >
                            <option value="">Selecione...</option>
                            {sexos.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          {tocado.sexo && !sexo && (
                            <div className="mt-1 text-xs text-red-600">Campo obrigatório</div>
                          )}
                        </div>





                        {/* Celular */}
                        <div className="mb-2">
                          <label>Celular:</label>
                          <input
                            className="w-full rounded border px-3 py-2"
                            type="text"
                            value={celular}
                            onBlur={() => setTocado((t) => ({ ...t, celular: true }))}
                            onChange={(e) => setCelular(maskCelular(e.target.value))}
                            required
                            placeholder="(99) 99999-9999"
                            maxLength={15}
                          />
                          {tocado.celular && !celular && (
                            <div className="mt-1 text-xs text-red-600">Campo obrigatório</div>
                          )}
                        </div>








                        {/* Continuar → abre modal de senha (NADA salvo ainda) */}
                        <button
                          className="mt-3 w-full rounded bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                          type="submit"
                          disabled={!isDataValida(formatDateForInput(dataNasc)) || !sexo}
                        >
                          Continuar
                        </button>
                      </form>
                    </>
                  )}

                {/* Perfil divergente */}
                {cpfLocalizado &&
                  perfilDoBanco &&
                  perfilDoBanco.toLowerCase() !== perfilSelecionado.toLowerCase() && (
                    <div className="mt-3 rounded border border-red-300 bg-red-100 p-2 text-center text-red-700">
                      Você não tem permissão para cadastrar como <b>{perfilSelecionado}</b>, apenas
                      como <b>{perfilDoBanco}</b>.
                    </div>
                  )}
              </>
            )}
        </div>
      )}

      {/* MODAL SENHA */}
      <ModalSenha
        open={abrirModalSenha}
        onClose={() => setAbrirModalSenha(false)} // se fechar modal → nada foi salvo
        onSalvar={handleSalvarTudo} // envia dados pessoais + senha em sequência
        senha={senha}
        setSenha={setSenha}
        confSenha={confSenha}
        setConfSenha={setConfSenha}
        enviando={enviando}
        erroSenha={erroSenha}
      />
    </div>
  );
}
