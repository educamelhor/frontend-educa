// src/features/login/CadastroUsuario.jsx
import React, { useRef, useState } from "react";
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

  // Regras:
  // - mínimo 6 caracteres
  // - pelo menos 1 letra
  // - pelo menos 1 número
  // - pelo menos 1 caractere especial dentre: $#@*_
  const temMinimo = s.length >= 6;
  const temLetra = /[A-Za-z]/.test(s);
  const temNumero = /\d/.test(s);
  const temEspecial = /[$#@*_]/.test(s);

  return temMinimo && temLetra && temNumero && temEspecial;
}


/* ──────────────────────────────────────────────────────────────
   Constantes
   ────────────────────────────────────────────────────────────── */
const sexos = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
];
const perfis = ["Professor"];

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
          Mínimo 6 caracteres, com letras, números e pelo menos 1 destes: $#@*_
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
          {senha && !senhaForte(senha) && (
            <div className="mt-1 text-xs text-red-600">
              Senha fraca. Use no mínimo 6 caracteres com letras, números e 1 destes: $#@*_
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
  const fileInputRef = useRef(null);

  const [fotoFile, setFotoFile] = useState(null);
  const [erroFoto, setErroFoto] = useState("");
  const [tocado, setTocado] = useState({});

  const [enviando, setEnviando] = useState(false);






  const [escolaId, setEscolaId] = useState(null);

  // Pré-cadastros pendentes por CPF (pode haver mais de uma escola)
  const [escolasPendentes, setEscolasPendentes] = useState([]);

  // ✅ NOVO: seleção múltipla (1 ou mais escolas)
  const [escolasSelecionadas, setEscolasSelecionadas] = useState([]); // array de strings (ids)








  // Modal de senha
  const [abrirModalSenha, setAbrirModalSenha] = useState(false);
  const [senha, setSenha] = useState("");
  const [confSenha, setConfSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const navigate = useNavigate();

  /* ── ETAPA 1: CPF (pré-cadastro) ─────────────────────────── */
  const [cpfPreValidado, setCpfPreValidado] = useState(false);

  const handleCpfChange = (e) => {
    const val = maskCPF(e.target.value);
    setCpf(val);
    setCpfPreValidado(false);
    setEscolasPendentes([]);
    setEscolasSelecionadas([]);
    setEscolaId(null);
    setMensagem("");
    setEmailJaExiste(false); // reutilizado como "já cadastrado" para exibir CTA de login
  };


  /* ── ETAPA 2: e-mail (OTP) ───────────────────────────────── */
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setEmailValido(isEmailValido(val));
    setMensagem("");
  };

  // -------------------------------------------------------------------------
  // ETAPA 1 — Valida pré-cadastro por CPF (professores é a fonte oficial)
  // Endpoint esperado: GET /api/auth/pre-cadastros/por-cpf/:cpf
  // Retorno esperado (padrão do fluxo aprovado):
  //   { jaCadastrado:boolean, preCadastroValido:boolean, escolas:[...] }
  // -------------------------------------------------------------------------
  const handleValidarCpfPreCadastro = async (e) => {
    e.preventDefault();
    setMensagem("");

    const cpfLimpo = (cpf || "").replace(/\D/g, "");
    if (!isCPFValido(cpfLimpo)) {
      setMensagem("CPF inválido. Verifique e tente novamente.");
      return;
    }

    // Se já validou CPF e já escolheu escola (quando houver múltiplas), avança direto
    if (
      cpfPreValidado &&
      ((Array.isArray(escolasPendentes) && escolasPendentes.length <= 1) ||
        (Array.isArray(escolasSelecionadas) && escolasSelecionadas.length > 0))
    ) {
      setEtapa(2); // próxima etapa: coletar e-mail e enviar OTP
      return;
    }


    setAguardando(true);

    try {
      const { data } = await api.post("/api/auth/validar-professor",{ cpf: cpfLimpo });


      // ⛔ Se já está cadastrado, interrompe o cadastro e orienta login
      if (data?.jaCadastrado === true) {
        setMensagem(
          data?.message ||
            "Cadastro já concluído para este CPF. Faça login para acessar o sistema."
        );
        setEmailJaExiste(true); // reutilizado para CTA "Ir para Login"
        return;
      }

      // ⛔ Se não existe pré-cadastro válido, interrompe
      if (data?.preCadastroValido !== true) {
        setMensagem(
          data?.message ||
            "Não foi possível prosseguir. Procure a direção/secretaria para liberar seu acesso."
        );
        setEmailJaExiste(false);
        return;
      }

      // ✅ Pré-cadastro válido: pode haver mais de um vínculo/escola
      const escolas = Array.isArray(data?.escolas) ? data.escolas : [];
      setEscolasPendentes(escolas);

      // Normaliza id da escola (tolerante a nomes de campo do backend)
      const getEscolaId = (x) => x?.escola_id ?? x?.escolaId ?? x?.id ?? null;

      if (escolas.length > 1) {
        // ✅ Mensagem fica dentro do bloco de seleção (evita repetição)
        setMensagem("");
        setCpfPreValidado(true);
        setEmailJaExiste(false);
        return; // aguarda seleção (agora múltipla)
      }


      // Se só existe 1 vínculo, já define e segue
      const unicaEscolaId = escolas.length === 1 ? getEscolaId(escolas[0]) : null;
      if (unicaEscolaId) {
        setEscolaId(unicaEscolaId);
        setEscolasSelecionadas([String(unicaEscolaId)]);
      }


      setCpfPreValidado(true);
      setEmailJaExiste(false);
      setEtapa(2); // próxima etapa: coletar e-mail e enviar OTP
    } catch (err) {
      if (err?.response?.status === 404) {
        setMensagem(
          "CPF não localizado no pré-cadastro. Procure a direção/secretaria para liberar seu acesso."
        );
        setEmailJaExiste(false);
        return;
      }
      setMensagem("Erro ao verificar CPF. Tente novamente.");
    } finally {
      setAguardando(false);
    }
  };

  // -------------------------------------------------------------------------
  // ETAPA 2 — Envia OTP para o e-mail (CPF já validado e escola_id definido)
  // -------------------------------------------------------------------------
  const handleEnviarCodigoEmail = async (e) => {
    e.preventDefault();
    setMensagem("");
    setAguardando(true);

    try {
      await api.post("/api/auth/enviar-codigo-cadastro", {
        email,
        cpf: (cpf || "").replace(/\D/g, ""),
        escola_id: escolaId || undefined,
      });

      setCodigoEnviadoPara(email);
      setMensagem("Enviamos um código de verificação para seu e-mail.");
      setEtapa(3); // próxima etapa: confirmar OTP
      setEmailJaExiste(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Erro ao enviar código. Verifique o e-mail e tente novamente.";
      setMensagem(msg);
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
      const { data } = await api.post("/api/auth/confirmar-codigo-cadastro", {
        email: codigoEnviadoPara,
        codigo: codigoInput,
      });

      setMensagem("Código verificado com sucesso!");

      // ✅ Dados vindos do pré-cadastro (professores)
      const cpfSrv = String(data?.cpf || "").replace(/\D/g, "");
      const escolaSrv = data?.escola_id ?? null;

      setUsuarioIdPreCadastro(data?.usuario_id ?? null);
      setEscolaId(escolaSrv);
      setCpf(maskCPF(cpfSrv || (cpf || "").replace(/\D/g, "")));

      // perfil deve vir do pré-cadastro (preferir em minúsculo, como no BD)
      setPerfilSelecionado(String(data?.perfil || "professor").toLowerCase());

      // nome vem do pré-cadastro e pode ser conferido na tela seguinte
      setNomePreCadastrado(data?.nome || "");

      // Libera diretamente a etapa de completar dados
      setTimeout(() => {
        setMensagem("");
        setCpfLocalizado(true); // já está validado via OTP + pré-cadastro
        setEtapa(4);
      }, 800);
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

    if (erroFoto) {
      setMensagem(erroFoto);
      return;
    }

    setMensagem("");
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

    // ✅ Multi-escola: salva em 1 ou mais escolas selecionadas
    const escolasParaSalvar =
      Array.isArray(escolasSelecionadas) && escolasSelecionadas.length > 0
        ? escolasSelecionadas.map(String)
        : escolaId
        ? [String(escolaId)]
        : [];

    if (!escolasParaSalvar.length) {
      setErroSenha("Selecione ao menos uma escola para concluir o cadastro.");
      setEnviando(false);
      return;
    }

    try {
      // 0) Foto (opcional) + 1) Complementar dados — para CADA escola selecionada
      for (const escolaIdLoop of escolasParaSalvar) {
        const payloadDados = {
          // ⚠️ Não fixar id aqui: em multi-escola, cada linha pode ter um id diferente.
          // O backend já consegue localizar por (cpf + escola_id + perfil) se id não vier.
          cpf: cpfLimpo,
          nome: nomePreCadastrado,
          data_nascimento: formatDateForInput(dataNasc),
          sexo,
          celular: celular.replace(/\D/g, ""),
          email: codigoEnviadoPara,
          escola_id: Number(escolaIdLoop),
          perfil: perfilSelecionado,
        };

        if (fotoFile) {
          const fd = new FormData();
          fd.append("foto", fotoFile);
          fd.append("cpf", cpfLimpo);
          fd.append("escola_id", String(escolaIdLoop));

          await api.post("/api/auth/upload-foto-professor", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }

        await api.post("/api/auth/complementar-professor", payloadDados);
      }

      // 2) Cadastrar senha — UMA vez só
      // (backend já atualiza por cpf+perfil e cobre as linhas das escolas)
      await api.post("/api/auth/cadastrar-senha", {
        cpf: cpfLimpo,
        senha,
        email: codigoEnviadoPara,
        celular: celular.replace(/\D/g, ""),
        perfil: perfilSelecionado,
      });

      setSucesso(true);
      setMensagem("Cadastro realizado com sucesso!");
      setAbrirModalSenha(false);
      setTimeout(() => {
        navigate("/login", { state: { email: codigoEnviadoPara } });
      }, 1500);
    } catch (err) {
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.error || err?.response?.data?.message || "";

      // ✅ Mensagens "premium" para conflitos (409)
      if (status === 409) {
        const msgLower = String(backendMsg || "").toLowerCase();

        // Se o backend já mandou uma mensagem boa, prioriza.
        if (backendMsg) {
          setErroSenha(backendMsg);
          return;
        }

        // Fallback seguro caso o backend não mande mensagem detalhada
        if (msgLower.includes("celular") || msgLower.includes("telefone")) {
          setErroSenha("Este celular já está em uso. Informe outro celular para continuar.");
          return;
        }

        if (msgLower.includes("e-mail") || msgLower.includes("email")) {
          setErroSenha("Este e-mail já está em uso. Informe outro e-mail para continuar.");
          return;
        }

        setErroSenha("Conflito de cadastro. Verifique seus dados e tente novamente.");
        return;
      }

      const msg = backendMsg || "Erro ao concluir o cadastro. Tente novamente.";
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

      {/* ETAPA 1: CPF (pré-cadastro) */}
      {etapa === 1 && (
        <form onSubmit={handleValidarCpfPreCadastro}>
          <label>Digite seu CPF:</label>
          <input
            className="mb-2 w-full rounded border px-3 py-2"
            type="text"
            value={cpf}
            onChange={handleCpfChange}
            required
            autoFocus
            maxLength={14}
            placeholder="000.000.000-00"
            inputMode="numeric"
            autoComplete="off"
            disabled={aguardando}
          />

          {cpf && cpf.replace(/\D/g, "").length >= 11 && !isCPFValido(cpf) && (
            <div className="animate-fadeIn mb-2 text-sm text-red-600">CPF inválido.</div>
          )}

          {/* ✅ Feedback visível */}
          {mensagem && !sucesso && !(Array.isArray(escolasPendentes) && escolasPendentes.length > 1) && (
            <div
              className={`mb-3 rounded border p-2 text-center text-sm font-semibold ${
                emailJaExiste
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {mensagem}
            </div>
          )}


          {/* ✅ Se houver múltiplas escolas/vínculos, solicitar seleção */}
          {Array.isArray(escolasPendentes) && escolasPendentes.length > 1 && !emailJaExiste && (
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  Selecione a(s) escola(s) para concluir:
                </label>


                <button
                  type="button"
                  className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-40"
                  disabled={aguardando}
                  onClick={() => {
                    const ids = escolasPendentes
                      .map((esc) => String(esc?.escola_id ?? esc?.escolaId ?? esc?.id ?? ""))
                      .filter(Boolean);

                    setEscolasSelecionadas(ids);

                    // ✅ Mantém compatibilidade: escolaId = primeira selecionada (OTP seguirá por ela)
                    setEscolaId(ids.length ? Number(ids[0]) : null);
                    setMensagem("");
                  }}
                >
                  Selecionar todas
                </button>
              </div>

              <div className="rounded border bg-white p-3">
                <div className="mb-2 text-sm text-gray-600">
                  Pré-cadastros encontrados: <span className="font-semibold">{escolasPendentes.length}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {escolasPendentes.map((esc, idx) => {
                    const id = String(esc?.escola_id ?? esc?.escolaId ?? esc?.id ?? "");
                    const nome =
                      esc?.escola_nome ?? esc?.escolaNome ?? esc?.nome ?? `Escola ${id || idx + 1}`;

                    const checked = escolasSelecionadas.includes(id);

                    return (
                      <label key={`${id}-${idx}`} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={aguardando}
                          onChange={(e) => {
                            const on = e.target.checked;

                            setEscolasSelecionadas((prev) => {
                              const next = on ? [...prev, id] : prev.filter((x) => x !== id);

                              // ✅ Mantém compatibilidade: escolaId = primeira selecionada (para OTP)
                              const first = next[0] ? Number(next[0]) : null;
                              setEscolaId(first);

                              return next;
                            });

                            setMensagem("");
                          }}
                        />
                        <span className="text-sm text-gray-800">{nome}</span>
                      </label>
                    );
                  })}
                </div>

                {Array.isArray(escolasSelecionadas) && escolasSelecionadas.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    Selecionadas: <span className="font-semibold">{escolasSelecionadas.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}


          <button
            className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
            type={emailJaExiste ? "button" : "submit"}
            onClick={() => {
              if (emailJaExiste) navigate("/login");
            }}
            disabled={
              aguardando ||
              !isCPFValido(cpf) ||
              (Array.isArray(escolasPendentes) &&
                escolasPendentes.length > 1 &&
                !emailJaExiste &&
                !(Array.isArray(escolasSelecionadas) && escolasSelecionadas.length > 0))
            }

          >
            {emailJaExiste ? "Ir para Login" : aguardando ? "Validando..." : "Avançar"}
          </button>
        </form>
      )}

      {/* ETAPA 2: e-mail (envio OTP) */}
      {etapa === 2 && (
        <form onSubmit={handleEnviarCodigoEmail}>
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

          {mensagem && !sucesso && (
            <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-center text-sm font-semibold text-red-700">
              {mensagem}
            </div>
          )}

          <button
            className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
            type="submit"
            disabled={!emailValido || aguardando}
          >
            {aguardando ? "Enviando código..." : "Enviar código"}
          </button>
        </form>
      )}

      {/* ETAPA 3: código de verificação */}
      {etapa === 3 && (
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

      {/* ETAPA 4: dados do cadastro (perfil/nome vindos do pré-cadastro) */}
      {etapa === 4 && (
        <div>
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-2 text-center text-sm font-semibold text-blue-700">
            Perfil definido pelo pré-cadastro: <b>{(perfilSelecionado || "professor").toUpperCase()}</b>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2">
            <div>
              <label className="text-sm text-gray-700">CPF (pré-cadastro)</label>
              <input
                className="w-full cursor-not-allowed rounded border bg-gray-100 px-3 py-2"
                value={cpf}
                readOnly
                disabled
              />
            </div>

            <div>
              <label className="text-sm text-gray-700">Nome (confirme)</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={nomePreCadastrado}
                onChange={(e) => setNomePreCadastrado(e.target.value)}
                required
              />
            </div>
          </div>

          <form className="mt-2" autoComplete="off" onSubmit={abrirModalDeSenha}>
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

            {/* Celular (vai para usuarios) */}
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

            {/* Foto (opcional) - será ligada no próximo passo */}
            <div className="mb-2">
              <label>Foto (opcional):</label>

              <div className="flex items-center gap-2">

                <input
                  ref={fileInputRef}
                  className="w-full"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;

                    // reset
                    setErroFoto("");
                    setFotoFile(null);

                    if (!f) return;

                    const tiposOk = ["image/jpeg", "image/png", "image/webp"];
                    const maxBytes = 2 * 1024 * 1024; // 2MB

                    if (!tiposOk.includes(f.type)) {
                      setErroFoto("Formato inválido. Envie JPEG, PNG ou WEBP.");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      return;
                    }

                    if (f.size > maxBytes) {
                      setErroFoto("Arquivo muito grande. Limite: 2MB.");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      return;
                    }

                    setFotoFile(f);
                  }}
                />
                {fotoFile && (
                  <button
                    type="button"
                    className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                    title="Remover foto"
                    onClick={() => {
                      setFotoFile(null);
                      setErroFoto("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}

                  >
                    X
                  </button>
                )}
              </div>

              {fotoFile && !erroFoto && (
                <div className="mt-2 text-xs text-gray-600">
                  Arquivo selecionado: <span className="font-semibold">{fotoFile.name}</span>
                </div>
              )}

              {erroFoto ? (
                <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-center text-sm font-semibold text-red-700">
                  {erroFoto}
                </div>
              ) : (
                <div className="mt-1 text-xs text-gray-500">
                  Formatos aceitos: JPEG, PNG, WEBP (até 2MB).
                </div>
              )}
            </div>

            {/* Continuar → abre modal de senha */}
            <button
              className="mt-3 w-full rounded bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={
                !nomePreCadastrado ||
                !isDataValida(formatDateForInput(dataNasc)) ||
                !sexo ||
                !!erroFoto
              }
            >
              Continuar
            </button>
          </form>
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
