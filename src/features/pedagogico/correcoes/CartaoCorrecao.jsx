import React from "react";

export default function CartaoCorrecao({
  valores,
  numeroQuestao = 1,
  titulo = "Produção de uma notícia"
}) {
  const checked = (value, letra) => value === letra;

  const linhas = [
    { label: "Situação de correção", opcoes: ["A", "B", "C", "D", "E", "F", "G", "H", "I"], key: "situacao" },
    { label: "Competência I - Registro formal", opcoes: ["A", "B", "C", "D", "E"], key: "competencia_1" },
    { label: "Competência II - Coerência temática", opcoes: ["A", "B", "C", "D", "E"], key: "competencia_2" },
    { label: "Competência III - Gênero textual", opcoes: ["A", "B", "C", "D", "E"], key: "competencia_3" },
    { label: "Competência IV - Coesão", opcoes: ["A", "B", "C", "D", "E"], key: "competencia_4" }
  ];

  // Configuração de dimensões e alinhamentos
  const largura = 1093;
  const altura = 541;

  const alinhamentoEsquerda = 48; // Alinhamento dos elementos (linha, título, tabela)
  const paddingExt = 12;
  const quadSize = 25;
  const linhaHeight = 38;
  const tabelaWidth = largura - 2 * alinhamentoEsquerda;
  const tabelaTop = 95; // Espaço após o título
  const labelWidth = 290;
  const bolinhasOffset = 65;
  const bolinhaSize = 18;
  const gapBolinhas = 21;

  return (
    <div
      style={{
        width: largura,
        height: altura,
        background: "#fff",
        borderRadius: 5,
        fontFamily: "Arial, 'Segoe UI', sans-serif",
        position: "relative",
        padding: 0,
        boxSizing: "border-box"
      }}
    >
      {/* Quadrados pretos nos cantos */}
      <div style={{ position: "absolute", left: paddingExt, top: paddingExt, width: quadSize, height: quadSize, background: "#231f20" }} />
      <div style={{ position: "absolute", right: paddingExt, top: paddingExt, width: quadSize, height: quadSize, background: "#231f20" }} />
      <div style={{ position: "absolute", left: paddingExt, bottom: paddingExt, width: quadSize, height: quadSize, background: "#231f20" }} />
      <div style={{ position: "absolute", right: paddingExt, bottom: paddingExt, width: quadSize, height: quadSize, background: "#231f20" }} />

      {/* Linha horizontal topo */}
      <div style={{
        position: "absolute",
        left: alinhamentoEsquerda,
        right: alinhamentoEsquerda,
        top: 55, // Desce um pouco para alinhar visualmente com o topo dos quadrados
        borderTop: "2px solid #231f20"
      }}></div>

      {/* Título */}
      <div style={{
        position: "absolute",
        left: alinhamentoEsquerda, // Alinhado à linha do topo
        top: 58,                   // Logo abaixo da linha do topo
        fontWeight: 600,
        fontSize: 17,              // Menor e mais elegante
        fontFamily: "Quicksand, Arial, 'Segoe UI', sans-serif"
      }}>
        Questão {numeroQuestao.toString().padStart(2, "0")} - {titulo}
      </div>

      {/* Tabela customizada */}
      <div style={{
        position: "absolute",
        left: alinhamentoEsquerda, // Alinhado ao título e linha do topo
        top: tabelaTop,
        width: tabelaWidth,
        background: "#fff",
        padding: 0,
        boxSizing: "border-box",
        height: linhaHeight * linhas.length,
        display: "flex",
        alignItems: "stretch"
      }}>
        {/* Linhas pontilhadas */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: linhaHeight * linhas.length,
          borderLeft: "2px dashed #bcbcbc",
          zIndex: 2
        }} />
        <div style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: linhaHeight * linhas.length,
          borderRight: "2px dashed #bcbcbc",
          zIndex: 2
        }} />
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          borderTop: "2px dashed #bcbcbc",
          zIndex: 2
        }} />
        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          {linhas.map((linha, idx) => (
            <div key={linha.key} style={{
              display: "flex",
              alignItems: "center",
              height: linhaHeight,
              borderBottom: "2px dashed #bcbcbc",
              ...(idx === linhas.length - 1 && { borderBottom: "2px dashed #bcbcbc" })
            }}>
              {/* Label */}
              <div style={{
                width: labelWidth,
                minWidth: labelWidth,
                paddingLeft: 12,
                fontSize: 16,
                color: "#757575",
                fontWeight: 400,
                fontFamily: "Quicksand, Arial, 'Segoe UI', sans-serif",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                {linha.label}
              </div>
              {/* Espaçador para bolinhas */}
              <div style={{
                width: bolinhasOffset,
                minWidth: bolinhasOffset,
                flexShrink: 0
              }} />
              <div style={{
                display: "flex",
                flex: 1,
                gap: gapBolinhas,
                justifyContent: "flex-start"
              }}>
                {linha.opcoes.map(letra => (
                  <span
                    key={letra}
                    style={{
                      display: "inline-block",
                      textAlign: "center"
                    }}
                  >
                    <div style={{
                      width: bolinhaSize,
                      height: bolinhaSize,
                      border: "2px solid #333",
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: checked(valores[linha.key], letra) ? "#333" : "#fff"
                    }}>
                      <span style={{
                        color: checked(valores[linha.key], letra)
                          ? "#333"
                          : "rgba(50,50,50,0.28)",
                        opacity: checked(valores[linha.key], letra) ? 0 : 1,
                        fontWeight: 600,
                        fontSize: 13,
                        fontFamily: "Arial, 'Segoe UI', sans-serif",
                        transition: "opacity 0.2s"
                      }}>
                        {letra}
                      </span>
                    </div>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Código fixo */}
      <div style={{
        position: "absolute",
        right: paddingExt + 25,
        bottom: paddingExt,
        height: 32,
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.88)",
        padding: "0 8px 0 0"
      }}>
        <span style={{
          fontSize: 22,
          fontFamily: "monospace",
          letterSpacing: 2,
          lineHeight: "32px",
          display: "block"
        }}>
          2852638453
        </span>
      </div>
    </div>
  );
}
