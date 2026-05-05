import React from "react";

export default function CapturePrivacidadePage() {
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: "800px",
      margin: "0 auto",
      padding: "32px 20px",
      color: "#1a1a1a",
      lineHeight: 1.75,
    }}>
      <style>{`
        .capture-badge {
          background: #2D6CDF;
          color: #fff;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: .8rem;
          font-weight: 700;
          display: inline-block;
          letter-spacing: .5px;
          margin-bottom: 12px;
        }
        .capture-privacy h1 {
          color: #2D6CDF;
          font-size: 1.75rem;
          border-bottom: 2px solid #2D6CDF;
          padding-bottom: 10px;
          margin-top: 0;
        }
        .capture-privacy h2 {
          color: #1a4a9f;
          font-size: 1.05rem;
          margin-top: 32px;
          margin-bottom: 8px;
        }
        .capture-privacy ul {
          padding-left: 20px;
        }
        .capture-privacy a {
          color: #2D6CDF;
          text-decoration: none;
        }
        .capture-privacy a:hover {
          text-decoration: underline;
        }
        .capture-footer {
          margin-top: 56px;
          font-size: .85rem;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .highlight-box {
          background: #EFF6FF;
          border-left: 4px solid #2D6CDF;
          padding: 12px 16px;
          border-radius: 0 8px 8px 0;
          margin: 16px 0;
          font-size: .95rem;
        }
      `}</style>

      <div className="capture-privacy">
        <span className="capture-badge">EDUCA-CAPTURE</span>
        <h1>Política de Privacidade</h1>
        <p><strong>Última atualização:</strong> Maio de 2026</p>

        <div className="highlight-box">
          <strong>Resumo:</strong> o EDUCA-CAPTURE <strong>não armazena nenhuma foto no dispositivo</strong>.
          As imagens são enviadas diretamente para o servidor da escola e apagadas da memória do app imediatamente após o envio.
        </div>

        <h2>1. O que é o EDUCA-CAPTURE?</h2>
        <p>
          O EDUCA-CAPTURE é um aplicativo exclusivo do ecossistema{" "}
          <strong>EDUCA.MELHOR</strong> destinado a funcionários autorizados de
          instituições de ensino (gestores, secretários e coordenadores). Sua
          única finalidade é capturar e transmitir fotos de alunos{" "}
          <strong>diretamente para a plataforma EDUCA.MELHOR</strong>, sem
          armazenar nenhuma imagem no dispositivo.
        </p>

        <h2>2. Dados Coletados</h2>
        <ul>
          <li>
            <strong>Fotos dos alunos:</strong> capturadas pela câmera e
            enviadas imediatamente ao servidor da escola via HTTPS.{" "}
            <em>Nenhuma foto é salva no aparelho.</em>
          </li>
          <li>
            <strong>Identificador do dispositivo (Device UID):</strong> gerado
            para autenticar o aparelho na escola. Não contém dados pessoais.
          </li>
          <li>
            <strong>Logs de auditoria:</strong> data/hora e ID do aluno
            fotografado, para rastreabilidade conforme a LGPD.
          </li>
        </ul>

        <h2>3. Finalidade do Tratamento</h2>
        <p>
          Os dados são tratados exclusivamente para identificação visual dos
          alunos na plataforma da escola (lista de chamada, boletins e
          comunicados), conforme consentimento coletado pela instituição de
          ensino contratante.
        </p>

        <h2>4. Compartilhamento de Dados</h2>
        <p>
          Os dados <strong>não são compartilhados com terceiros</strong>. As
          fotos são armazenadas nos servidores da EDUCA.MELHOR (DigitalOcean
          Spaces — infraestrutura com cobertura no Brasil) e acessíveis apenas
          pela escola contratante.
        </p>

        <h2>5. Retenção e Exclusão</h2>
        <p>
          As fotos permanecem enquanto o aluno estiver ativo na escola. Para
          solicitar a exclusão, acesse:{" "}
          <a
            href="https://sistemaeducamelhor.com.br/excluir-conta"
            target="_blank"
            rel="noopener noreferrer"
          >
            sistemaeducamelhor.com.br/excluir-conta
          </a>
          .
        </p>

        <h2>6. Segurança</h2>
        <p>
          O aplicativo utiliza autenticação de dispositivo por token
          criptografado (Device Token), aprovação obrigatória pelo gestor da
          escola e comunicação exclusiva via HTTPS.
        </p>

        <h2>7. Direitos do Titular (LGPD)</h2>
        <p>
          Responsáveis legais pelos alunos podem solicitar acesso, correção ou
          exclusão dos dados fotográficos pelo e-mail{" "}
          <a href="mailto:privacidade@educamelhor.com.br">
            privacidade@educamelhor.com.br
          </a>
          .
        </p>

        <h2>8. Contato e Suporte</h2>
        <p>
          EDUCA.MELHOR — Tecnologia Educacional
          <br />
          E-mail:{" "}
          <a href="mailto:suporte@educamelhor.com.br">
            suporte@educamelhor.com.br
          </a>
          <br />
          Site:{" "}
          <a
            href="https://sistemaeducamelhor.com.br"
            target="_blank"
            rel="noopener noreferrer"
          >
            sistemaeducamelhor.com.br
          </a>
        </p>

        <div className="capture-footer">
          © 2026 EDUCA.MELHOR — Todos os direitos reservados.
          <br />
          Este aplicativo é distribuído exclusivamente para instituições de
          ensino cadastradas na plataforma EDUCA.MELHOR.
        </div>
      </div>
    </div>
  );
}
