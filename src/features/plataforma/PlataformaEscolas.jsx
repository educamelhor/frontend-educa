import React, { useState, useEffect } from "react";
import api from "../../services/api";

export default function PlataformaEscolas() {
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados do form "Nova Escola"
  const [nomeEscola, setNomeEscola] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [criandoEscola, setCriandoEscola] = useState(false);

  // Estados do form "Gerar Convite"
  const [conviteEscolaId, setConviteEscolaId] = useState("");
  const [conviteEmail, setConviteEmail] = useState("");
  const [enviandoConvite, setEnviandoConvite] = useState(false);

  // Feedback
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  useEffect(() => {
    fetchEscolas();
  }, []);

  const fetchEscolas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/plataforma/escolas");
      setEscolas(Array.isArray(data) ? data : data.escolas || []);
    } catch (err) {
      console.error("Erro ao listar escolas:", err);
      mostrarMensagem("Erro ao carregar lista de escolas.", "erro");
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensagem = (texto, tipo = "sucesso") => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  const handleCreateEscola = async (e) => {
    e.preventDefault();
    if (!nomeEscola) return;

    setCriandoEscola(true);
    try {
      const payload = { nome: nomeEscola, cidade, estado };
      await api.post("/api/plataforma/escolas", payload);
      mostrarMensagem("✅ Escola criada com sucesso!");
      
      setNomeEscola("");
      setCidade("");
      setEstado("");
      
      await fetchEscolas();
    } catch (err) {
      console.error("Erro ao criar escola:", err);
      mostrarMensagem("❌ Erro ao criar escola.", "erro");
    } finally {
      setCriandoEscola(false);
    }
  };

  const handleSendConvite = async (e) => {
    e.preventDefault();
    if (!conviteEscolaId || !conviteEmail) return;

    setEnviandoConvite(true);
    try {
      const payload = {
        escola_id: Number(conviteEscolaId),
        email: conviteEmail
      };
      await api.post("/api/plataforma/convite-diretor", payload);
      mostrarMensagem("✅ Convite gerado e enviado com sucesso!");
      
      setConviteEmail("");
      setConviteEscolaId("");
    } catch (err) {
      console.error("Erro ao gerar convite:", err);
      mostrarMensagem("❌ Erro ao gerar convite. Verifique os dados.", "erro");
    } finally {
      setEnviandoConvite(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-2xl shadow p-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">Plataforma (CEO) • Gestão de Escolas</h1>

        {mensagem.texto && (
          <div className={`mb-6 p-4 rounded-lg font-medium transition-all ${mensagem.tipo === 'erro' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
            {mensagem.texto}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Formulários na lateral */}
          <div className="lg:col-span-1 space-y-8">
            {/* CRIAR NOVA ESCOLA */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-semibold text-lg text-slate-800 mb-4">Nova Escola</h2>
              <form onSubmit={handleCreateEscola} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Escola *</label>
                  <input
                    type="text"
                    required
                    value={nomeEscola}
                    onChange={(e) => setNomeEscola(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Ex: CEF 04 CEM"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Ex: Brasília"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <input
                      type="text"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Ex: DF"
                      maxLength={2}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={criandoEscola}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 mt-2"
                >
                  {criandoEscola ? "Criando..." : "Criar Escola"}
                </button>
              </form>
            </div>

            {/* GERAR CONVITE DIRETOR */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-semibold text-lg text-slate-800 mb-4">Convidar Diretor</h2>
              <form onSubmit={handleSendConvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Escola Destino *</label>
                  <select
                    required
                    value={conviteEscolaId}
                    onChange={(e) => setConviteEscolaId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione uma escola</option>
                    {escolas.map((esc) => (
                      <option key={esc.id} value={esc.id}>{esc.nome} (ID: {esc.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email do Diretor *</label>
                  <input
                    type="email"
                    required
                    value={conviteEmail}
                    onChange={(e) => setConviteEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="diretor@escola.com.br"
                  />
                </div>
                <button
                  type="submit"
                  disabled={enviandoConvite}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 mt-2"
                >
                  {enviandoConvite ? "Enviando..." : "Gerar e Enviar Convite"}
                </button>
              </form>
            </div>
          </div>

          {/* TABELA DE ESCOLAS */}
          <div className="lg:col-span-2">
            <h2 className="font-semibold text-xl text-slate-800 mb-4">Escolas Cadastradas</h2>
            
            {loading ? (
              <div className="flex justify-center p-8 text-slate-500">Recuperando escolas do banco...</div>
            ) : escolas.length === 0 ? (
              <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-lg mb-2">Nenhuma escola cadastrada no momento.</p>
                <p className="text-sm">Utilize os formulários ao lado para popular sua rede de ensino.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Nome da Escola</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Localização</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Diretor responsável</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {escolas.map((esc) => (
                      <tr key={esc.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">#{esc.id}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{esc.nome}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {esc.cidade || esc.estado ? `${esc.cidade || '-'} / ${esc.estado || '-'}` : <span className="text-slate-400 italic">Não informada</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {esc.diretor || <span className="text-slate-400 italic">Sem diretor alocado</span>}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            (!esc.status || esc.status === 'ativo' || esc.status === 'Ativo') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {esc.status || 'Ativo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
