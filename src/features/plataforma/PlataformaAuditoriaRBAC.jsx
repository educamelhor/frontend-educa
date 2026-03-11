import React from "react";

export default function PlataformaAuditoriaRBAC() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold text-slate-800">Plataforma (CEO) • Auditoria RBAC</h1>
        <p className="text-slate-600 mt-2">
          V1: esta tela vai consultar a tabela rbac_auditoria (ALLOW/DENY) e permitir filtros.
        </p>

        <div className="mt-6 border rounded-xl p-4">
          <h2 className="font-semibold text-slate-800">Próximo passo</h2>
          <p className="text-sm text-slate-600 mt-1">
            Vamos criar um endpoint no backend para listar rbac_auditoria com filtros
            (ex.: escola_id, decisao, período) e consumir aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
