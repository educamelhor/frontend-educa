# AGENTS.md — Regras do Projeto frontend-educa
> Estas regras são carregadas automaticamente em todas as sessões de AI.
> Elas existem para evitar bugs recorrentes causados por mudanças que afetam módulos isolados.

---

## 🔴 REGRA CRÍTICA — Módulo Professores › Conselho de Classe

### Isolamento obrigatório

O módulo `src/features/professores/conselho/` é **100% independente**.
Nunca edite arquivos de outros módulos para ajustar comportamentos do conselho do professor.

#### Arquivos que DEVEM existir nesta pasta (verifique antes de qualquer commit):

| Arquivo | Responsabilidade |
|---|---|
| `ConselhoClasseProfessor.jsx` | Componente raiz — usa `/api/professores/me/turmas` |
| `ModalFichaConselhoClasse.jsx` | EyeIcon → registros do conselho (`/api/conselho/registros`) |
| `ModalRelatorioPedagogicoProfessor.jsx` | IdentificationIcon → rel. pedagógico (sem Descrição/Reg.Interno) |
| `ModalNovaOcorrenciaPedagogicaProfessor.jsx` | Modal de criação de ocorrência pedagógica |
| `ModalZoomFotoProfessor.jsx` | Zoom de foto isolado |
| `index.js` | Barrel de proteção — importa todos os arquivos acima |

#### Verificação obrigatória antes de qualquer commit neste módulo:

```powershell
Get-ChildItem src/features/professores/conselho/ | Select-Object Name
# Deve listar EXATAMENTE os 6 arquivos acima
```

---

## 🔴 REGRA CRÍTICA — App.jsx › Rota `/professores/conselho`

A linha da rota do professor **DEVE** ser exatamente:

```jsx
<Route path="/professores/conselho" element={<RequireModulo modulo="professores"><ConselhoClasseProfessor /></RequireModulo>} />
```

**NUNCA** use `<ConselhoClasse />` nesta rota. `ConselhoClasse` é exclusivo da rota `/pedagogico/conselho`.

Verificação rápida:

```powershell
Select-String -Path "src/App.jsx" -Pattern "professores/conselho" | Select-Object Line
# Deve conter "ConselhoClasseProfessor", NUNCA "ConselhoClasse />"
```

---

## 🔴 REGRA CRÍTICA — Git: commits antes de qualquer operação de merge/pull

**NUNCA** execute `git pull`, `git merge` ou `git stash` com arquivos novos não commitados.

O fluxo obrigatório ao criar arquivos novos:

```
1. Criar o(s) arquivo(s)
2. git add <arquivos>
3. git commit -m "mensagem"
4. SOMENTE ENTÃO: git pull / git push
```

Se precisar sincronizar com o remoto ANTES de commitar:
```
git stash        # salva apenas arquivos rastreados
# ⚠️ git stash NÃO salva arquivos "Untracked" (novos não adicionados)
# Por isso: sempre git add + git commit antes de git stash
```

---

## 🟡 REGRA IMPORTANTE — Governança do módulo Professores › Conselho

| Funcionalidade | Professor | Coordenação/Direção |
|---|---|---|
| Ver suas turmas | ✅ (via `/professores/me/turmas`) | ✅ (via `/api/turmas`) |
| Ver turmas de outros professores | ❌ | ✅ |
| EyeIcon → Ficha do Conselho | ✅ | ✅ |
| DocumentTextIcon → Boletim | ✅ | ✅ |
| IdentificationIcon → Rel. Pedagógico | ✅ (sem Descrição/Reg.Interno) | ✅ (completo) |
| PencilIcon → Editar ocorrência | ❌ | ✅ |
| Campo Descrição | ❌ | ✅ |
| Campo Registro Interno | ❌ | ✅ |

---

## 🟡 REGRA IMPORTANTE — Foto do aluno e LGPD

O backend já aplica a regra de consentimento: quando `consentimento_imagem ≠ 1`,
os campos `foto` e `foto_url` chegam como `null` na resposta da API.

**No frontend:** se `aluno.foto` e `aluno.foto_url` forem `null` → exibir iniciais do nome.
**Nunca** tente acessar a foto diretamente por código ou por URL construída manualmente.

---

## 🟢 REFERÊNCIA — APIs do módulo Professores › Conselho

```
GET  /api/professores/me/turmas?ano=2026
     → { ok: true, turmas: [{ id, turma, turno, ... }] }
     ⚠️ Retorna OBJETO, não array. Use data.turmas, não data.

GET  /api/conselho/registros?aluno_codigo=&turma_id=
     → { ok: true, registros: [...] }

POST /api/conselho/registros
     body: { aluno_codigo, turma_id, texto }

PUT  /api/conselho/registros/:id
     body: { texto }

GET  /api/alunos/:id/ocorrencias-pedagogicas
POST /api/alunos/:id/ocorrencias-pedagogicas
     body: { data, categoria, motivo }
     ⚠️ Professor NÃO envia descricao nem registroInterno
```
