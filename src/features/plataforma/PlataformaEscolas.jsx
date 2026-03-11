import React from "react";

export default function PlataformaEscolas() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold text-slate-800">Plataforma (CEO) • Escolas</h1>
        <p className="text-slate-600 mt-2">
          V1: aqui vamos listar escolas, criar nova escola e gerar convite para Diretor.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="border rounded-xl p-4">
            <h2 className="font-semibold text-slate-800">Criar escola + diretor (V1)</h2>
            <p className="text-sm text-slate-600 mt-1">
              No próximo passo vamos conectar esta tela às rotas /api/plataforma.
            </p>
          </div>

          <div className="border rounded-xl p-4">
            <h2 className="font-semibold text-slate-800">Lista de escolas (V1)</h2>
            <p className="text-sm text-slate-600 mt-1">
              No próximo passo vamos consumir GET /api/plataforma/escolas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
