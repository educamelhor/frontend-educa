import React, { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function LoginProfessor() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(1);
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [escolas, setEscolas] = useState([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [usuarioExistente, setUsuarioExistente] = useState(null);

  const formatarCPF = (valor) =>
    valor.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2")
         .replace(/(\d{3})(\d)/, "$1.$2")
         .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  const buscarCPF = async () => {
    setMensagem(""); // Limpa mensagem anterior
    try {
      const { data } = await api.get(`/api/usuarios/por-cpf/${cpf.replace(/\D/g, "")}`);
      setUsuarioExistente(data);

      if (data?.id) {
        const escolasResp = await api.get(`/api/escolas/por-cpf/${cpf.replace(/\D/g, "")}`);
        setEscolas(escolasResp.data);
        setEtapa(2);
      } else {
        setMensagem("CPF não localizado. Procure a secretaria ou direção da sua escola para solicitar o pré-cadastro.");
      }
    } catch (err) {
      if (
        err.response &&
        err.response.status === 404
      ) {
        setMensagem("CPF não localizado. Procure a secretaria ou direção da sua escola para solicitar o pré-cadastro.");
      } else {
        setMensagem("Erro ao verificar CPF. Tente novamente mais tarde.");
      }
    }
  };

  const enviarCodigo = async () => {
    setMensagem("");
    try {
      await api.post("/auth/enviar-codigo", { email });
      setMensagem("Código enviado com sucesso!");
      setEtapa(3);
    } catch (err) {
      setMensagem("Erro ao enviar código.");
    }
  };

  const verificarCodigo = async () => {
    setMensagem("");
    try {
      await api.post("/auth/confirmar", { email, codigo });
      setEtapa(4);
      setMensagem("Código verificado. Crie sua senha.");
    } catch (err) {
      setMensagem("Código inválido ou expirado.");
    }
  };

  const cadastrarSenha = async () => {
    setMensagem("");
    if (senha !== confirmarSenha) {
      setMensagem("As senhas não coincidem.");
      return;
    }
    try {
      await api.post("/auth/cadastrar-senha", {
        cpf: cpf.replace(/\D/g, ""),
        email,
        senha,
        escola_id: escolaSelecionada,
      });
      setMensagem("Cadastro realizado com sucesso!");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setMensagem("Erro ao cadastrar senha.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold text-center mb-4">Cadastro de Professores</h1>

      {mensagem && <p className="text-red-500 mb-4">{mensagem}</p>}

      {etapa === 1 && (
        <>
          <label>CPF:</label>
          <input
            type="text"
            value={formatarCPF(cpf)}
            onChange={(e) => setCpf(e.target.value)}
            className="w-full border px-3 py-2 rounded mb-4"
            maxLength={14}
            autoFocus
          />
          <button
            onClick={buscarCPF}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            Verificar CPF
          </button>
        </>
      )}

      {etapa === 2 && (
        <>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded mb-4"
            autoFocus
          />

          <label>Escolha a escola:</label>
          <select
            value={escolaSelecionada}
            onChange={(e) => setEscolaSelecionada(e.target.value)}
            className="w-full border px-3 py-2 rounded mb-4"
          >
            <option value="">Selecione</option>
            {escolas.map((esc) => (
              <option key={esc.id} value={esc.id}>
                {esc.apelido || esc.nome}
              </option>
            ))}
          </select>

          <button
            onClick={enviarCodigo}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            Enviar código
          </button>
        </>
      )}

      {etapa === 3 && (
        <>
          <label>Código de Verificação:</label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="w-full border px-3 py-2 rounded mb-4"
            autoFocus
          />
          <button
            onClick={verificarCodigo}
            className="bg-green-600 text-white px-4 py-2 rounded w-full"
          >
            Confirmar Código
          </button>
        </>
      )}

      {etapa === 4 && (
        <>
          <label>Senha:</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full border px-3 py-2 rounded mb-2"
            autoFocus
          />
          <label>Confirmar Senha:</label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className="w-full border px-3 py-2 rounded mb-4"
          />
          <button
            onClick={cadastrarSenha}
            className="bg-purple-600 text-white px-4 py-2 rounded w-full"
          >
            Finalizar Cadastro
          </button>
        </>
      )}
    </div>
  );
}
