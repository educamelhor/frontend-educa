import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function VerificarCarteirinha() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verifyToken() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/carteirinha/verificar/${token}`);
        const result = await response.json();

        if (result.ok) {
          setData(result.aluno);
        } else {
          setError(result.message || 'Token inválido.');
        }
      } catch (err) {
        setError('Erro ao conectar com o servidor.');
      } finally {
        setLoading(false);
      }
    }
    verifyToken();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white flex flex-col items-center justify-center p-6 font-sans">
      
      <div className="w-full max-w-md backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8 relative overflow-hidden transition-all duration-500">
        
        {/* Glow Effects */}
        <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-blue-500/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-purple-500/30 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col items-center">
          {error ? (
            <div className="flex flex-col items-center text-center space-y-4 py-8">
              <div className="bg-red-500/20 p-4 rounded-full border border-red-500/50">
                <XCircle size={48} className="text-red-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Documento Inválido</h1>
              <p className="text-gray-300 font-medium">{error}</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Status Badge */}
              <div className="flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-full font-semibold tracking-wide mb-8 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <CheckCircle size={20} />
                <span>DOCUMENTO VÁLIDO</span>
              </div>

              {/* Foto do Aluno */}
              <div className="w-36 h-36 rounded-2xl overflow-hidden border-4 border-white/20 mb-6 shadow-xl relative">
                {data.foto ? (
                  <img src={data.foto} alt="Foto do Estudante" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <span className="text-4xl text-gray-400">{data.nome.charAt(0)}</span>
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="w-full space-y-4">
                <div className="text-center mb-6">
                  <h1 className="text-3xl font-bold tracking-tight mb-1">{data.nome}</h1>
                  <p className="text-blue-300 font-medium text-sm tracking-widest uppercase">{data.escola_nome}</p>
                </div>

                <div className="bg-black/20 rounded-xl p-5 space-y-3 border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Matrícula</span>
                    <span className="font-medium">{data.matricula || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Turma / Série</span>
                    <span className="font-medium text-right">{data.turma_nome || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Data Nasc.</span>
                    <span className="font-medium">{data.data_nascimento || '-'}</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                  <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold block mb-1">Válido Até</span>
                  <span className="text-lg font-bold text-white tracking-widest">{data.validade}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-center opacity-50 text-sm">
        <p>Sistema Educacional EDUCA.MELHOR</p>
      </div>

    </div>
  );
}
