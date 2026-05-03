import React from "react";

const sections = [
  {
    num: "1",
    title: "Identificação do Controlador",
    content: (
      <>
        <p>A <strong>EDUCA.MELHOR</strong> é a controladora dos dados pessoais tratados por meio do aplicativo <strong>EDUCA Mobile</strong>, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei n.º 13.709/2018) e o Estatuto da Criança e do Adolescente (ECA — Lei n.º 8.069/1990).</p>
        <p style={{marginTop:8}}>Esta Política descreve como coletamos, usamos, armazenamos e protegemos os dados dos responsáveis legais e dos alunos cadastrados em instituições de ensino parceiras.</p>
      </>
    ),
  },
  {
    num: "2",
    title: "Dados Coletados e Finalidades",
    content: (
      <ul>
        <li><strong>Nome completo</strong> — identificação e autenticação do responsável</li>
        <li><strong>Endereço de e-mail</strong> — comunicações e recuperação de acesso</li>
        <li><strong>Número de telefone</strong> — autenticação via OTP (código de verificação)</li>
        <li><strong>CPF</strong> — vinculação ao aluno e à instituição de ensino</li>
        <li><strong>Dados acadêmicos do aluno</strong> — notas, frequência, comunicados escolares</li>
        <li><strong>Logs de uso do app</strong> — registros de acesso para segurança e auditoria (LGPD, Art. 6º)</li>
      </ul>
    ),
  },
  {
    num: "3",
    title: "Permissões do Dispositivo Móvel",
    content: (
      <ul>
        <li><strong>Câmera</strong> — exclusivamente para cadastro de imagem do aluno, mediante consentimento expresso</li>
        <li><strong>Biometria (Face ID / Impressão Digital)</strong> — autenticação segura via sistema operacional; nenhum dado biométrico é transmitido ou armazenado pela EDUCA.MELHOR</li>
        <li><strong>Notificações Push</strong> — comunicados e alertas da escola; desativável nas configurações do dispositivo</li>
        <li><strong>Armazenamento</strong> — somente para salvar documentos disponibilizados pela instituição</li>
      </ul>
    ),
  },
  {
    num: "4",
    title: "Base Legal do Tratamento",
    content: (
      <ul>
        <li><strong>Consentimento</strong> (Art. 7º, I) — para dados de menores e uso de imagem</li>
        <li><strong>Execução de contrato</strong> (Art. 7º, V) — para prestação dos serviços educacionais</li>
        <li><strong>Legítimo interesse</strong> (Art. 7º, IX) — para logs de segurança e auditoria</li>
        <li><strong>Cumprimento de obrigação legal</strong> (Art. 7º, II) — conforme exigências do ECA</li>
      </ul>
    ),
  },
  {
    num: "5",
    title: "Retenção e Exclusão de Dados",
    content: (
      <ul>
        <li>Dados cadastrais: enquanto houver vínculo ativo com a instituição de ensino</li>
        <li>Dados acadêmicos: até 5 (cinco) anos após o encerramento do vínculo escolar</li>
        <li>Logs de acesso: até 6 (seis) meses, conforme Marco Civil da Internet</li>
        <li>Termos de consentimento: prazo prescricional da obrigação (até 5 anos)</li>
      </ul>
    ),
  },
  {
    num: "6",
    title: "Direitos do Titular (LGPD)",
    content: (
      <ul>
        <li>Confirmação da existência de tratamento e acesso aos dados</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
        <li>Portabilidade dos dados a outro fornecedor de serviço</li>
        <li>Eliminação dos dados tratados com consentimento</li>
        <li>Revogação do consentimento, a qualquer momento</li>
        <li>Informação sobre compartilhamento com terceiros</li>
      </ul>
    ),
  },
  {
    num: "7",
    title: "Proteção de Dados de Menores",
    content: (
      <>
        <p>O EDUCA Mobile trata dados de crianças e adolescentes em conformidade com o ECA e a LGPD. Todo tratamento de dados de menores de 18 anos é realizado:</p>
        <ul style={{marginTop:8}}>
          <li>Mediante consentimento expresso do responsável legal, obtido eletronicamente com registro de data e hora (auditável)</li>
          <li>Com acesso restrito exclusivamente à instituição de ensino e ao responsável cadastrado</li>
          <li>Sem qualquer finalidade comercial, publicitária ou de compartilhamento com terceiros</li>
        </ul>
      </>
    ),
  },
  {
    num: "8",
    title: "Segurança da Informação",
    content: (
      <ul>
        <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
        <li>Autenticação segura com tokens JWT e OTP por SMS</li>
        <li>Acesso restrito por perfil de usuário</li>
        <li>Registro imutável de logs de consentimento e aceite de termos</li>
      </ul>
    ),
  },
  {
    num: "9",
    title: "Encarregado de Dados (DPO)",
    content: (
      <div style={{background:"#fff8f0",border:"1.5px solid #FFA133",borderRadius:10,padding:"16px 20px",marginTop:8}}>
        <p><strong>E-mail:</strong> <a href="mailto:dpo@sistemaeducamelhor.com.br" style={{color:"#e07b00",fontWeight:600}}>dpo@sistemaeducamelhor.com.br</a></p>
        <p style={{marginTop:6,fontSize:"0.88rem",color:"#777"}}>Prazo de resposta: até 15 dias úteis, conforme LGPD Art. 18.</p>
      </div>
    ),
  },
  {
    num: "10",
    title: "Alterações nesta Política",
    content: (
      <p>Esta Política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas por meio de notificação no aplicativo. O uso continuado do EDUCA Mobile após a comunicação implica aceitação da nova versão.</p>
    ),
  },
];

export default function PrivacidadePage() {
  return (
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",background:"#f5f7fa",minHeight:"100vh",color:"#1a1a2e",lineHeight:1.7}}>
      {/* Header */}
      <header style={{background:"#1e3a5f",color:"#fff",padding:"32px 24px",textAlign:"center"}}>
        <h1 style={{fontSize:"1.8rem",fontWeight:700,margin:0}}>Política de Privacidade</h1>
        <p style={{margin:"6px 0 0",opacity:.8,fontSize:"0.95rem"}}>EDUCA Mobile — Plataforma EDUCA.MELHOR</p>
        <span style={{display:"inline-block",background:"#FFA133",color:"#fff",fontSize:"0.75rem",fontWeight:700,padding:"4px 14px",borderRadius:20,marginTop:12}}>
          Versão 1.0 · Maio de 2025
        </span>
      </header>

      {/* Content */}
      <main style={{maxWidth:820,margin:"40px auto",padding:"0 20px 60px"}}>
        {sections.map((s) => (
          <div key={s.num} style={{background:"#fff",borderRadius:12,padding:"28px 32px",marginBottom:20,boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
            <h2 style={{color:"#1e3a5f",fontSize:"1.1rem",fontWeight:700,marginBottom:14,paddingBottom:10,borderBottom:"2px solid #e8edf5",margin:"0 0 14px"}}>
              <span style={{color:"#FFA133",marginRight:6}}>{s.num}.</span>{s.title}
            </h2>
            <div style={{fontSize:"0.95rem",color:"#3a3a5c"}}>
              {s.content}
            </div>
          </div>
        ))}

        {/* Nota não-rastreamento */}
        <div style={{background:"#eef4ff",borderLeft:"4px solid #1e3a5f",padding:"14px 18px",borderRadius:"0 8px 8px 0",fontSize:"0.9rem",color:"#3a3a5c"}}>
          Nenhum dado é utilizado para fins publicitários, de rastreamento ou compartilhado com terceiros para fins comerciais.
        </div>
      </main>

      {/* Footer */}
      <footer style={{textAlign:"center",padding:24,fontSize:"0.82rem",color:"#888",borderTop:"1px solid #e8edf5"}}>
        © 2025 EDUCA.MELHOR ·{" "}
        <a href="https://sistemaeducamelhor.com.br" style={{color:"#1e3a5f"}}>sistemaeducamelhor.com.br</a>
        {" "}·{" "}
        <a href="mailto:dpo@sistemaeducamelhor.com.br" style={{color:"#1e3a5f"}}>dpo@sistemaeducamelhor.com.br</a>
      </footer>
    </div>
  );
}
