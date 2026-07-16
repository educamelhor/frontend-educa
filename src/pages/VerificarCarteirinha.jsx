import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, User, Calendar, MapPin, Hash, BookOpen } from 'lucide-react';

export default function VerificarCarteirinha() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError('Token não encontrado na URL.');
        setLoading(false);
        return;
      }

      try {
        let baseUrl = import.meta.env.VITE_BACKEND_ORIGIN || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
        baseUrl = baseUrl.replace(/\/api\/?$/, ''); // Remove /api do final, caso exista
        
        const response = await fetch(`${baseUrl}/public/verificar-aluno/${token}`);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        
        {/* Header - Institucional */}
        <div className="bg-blue-800 p-4 text-center">
          <h2 className="text-white font-bold text-lg tracking-wide uppercase">EDUCA.MELHOR</h2>
          <p className="text-blue-200 text-xs mt-1">SISTEMA EDUCACIONAL</p>
        </div>

        <div className="p-6">
          {error ? (
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <XCircle size={64} className="text-red-500" strokeWidth={1.5} />
              <h1 className="text-2xl font-bold text-gray-800">❌ Carteirinha inválida</h1>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              
              <div className="mb-6 flex flex-col items-center text-center">
                <CheckCircle size={56} className="text-emerald-500 mb-3" strokeWidth={1.5} />
                <h1 className="text-xl font-bold text-emerald-600">✅ Aluno regularmente matriculado</h1>
              </div>

              {/* Foto do Aluno */}
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 mb-5 shadow-sm">
                {data.foto ? (
                  <img src={data.foto} alt="Foto do Estudante" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <User size={48} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="w-full space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{data.nome}</h2>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200 text-sm">
                  <div className="flex items-center text-gray-700">
                    <MapPin size={16} className="mr-3 text-blue-600" />
                    <span className="font-medium">{data.escola_nome}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-700">
                    <BookOpen size={16} className="mr-3 text-blue-600" />
                    <span>Turma: <span className="font-semibold">{data.turma || '-'}</span></span>
                  </div>

                  <div className="flex items-center text-gray-700">
                    <Hash size={16} className="mr-3 text-blue-600" />
                    <span>Matrícula: <span className="font-semibold">{data.matricula || '-'}</span></span>
                  </div>

                  <div className="flex items-center text-gray-700">
                    <Calendar size={16} className="mr-3 text-blue-600" />
                    <span>Ano Letivo: <span className="font-semibold">{data.ano_letivo || '-'}</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-3 text-center border-t border-gray-200">
          <p className="text-xs text-gray-500">Autenticidade garantida pelo sistema.</p>
        </div>
      </div>
    </div>
  );
}
