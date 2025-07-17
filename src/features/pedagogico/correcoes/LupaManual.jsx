import React, { useRef, useState } from "react";

export default function LupaManual({ src, width = 350, height = 495 }) {
  const [lupaAtiva, setLupaAtiva] = useState(false);        // Se está clicando e segurando para zoom
  const [mouseDentro, setMouseDentro] = useState(false);    // Se o mouse está na área
  const [lupaPos, setLupaPos] = useState({ x: width / 2, y: height / 2 });
  const containerRef = useRef();

  const lupaTamanho = 220;
  const zoom = 2;
  const areaExtra = 50;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(val, max));
  }

  function getPos(e) {
    const rect = containerRef.current.getBoundingClientRect();
    const minX = lupaTamanho / 2;
    const maxX = width + areaExtra * 2 - lupaTamanho / 2;
    const minY = lupaTamanho / 2;
    const maxY = height + areaExtra * 2 - lupaTamanho / 2;
    let x = clamp(e.clientX - rect.left, minX, maxX);
    let y = clamp(e.clientY - rect.top, minY, maxY);
    return { x, y };
  }

  function handleMouseMove(e) {
    setLupaPos(getPos(e));
  }

  function handleMouseDown(e) {
    if (e.button === 0) {
      setLupaAtiva(true);
      setLupaPos(getPos(e));
    }
  }

  function handleMouseUp() {
    setLupaAtiva(false);
  }

  function handleMouseLeave() {
    setMouseDentro(false);
    setLupaAtiva(false);
  }

  function handleMouseEnter() {
    setMouseDentro(true);
  }

  // Calcula o offset do zoom baseado na posição da lupa
  const offsetX = clamp(lupaPos.x - areaExtra, 0, width);
  const offsetY = clamp(lupaPos.y - areaExtra, 0, height);

  // 1. Nenhum cursor durante o zoom
  // 2. Cursor personalizado apenas quando mouseDentro e não está clicando
  // 3. Default em outros casos
  const cursorStyle = lupaAtiva
    ? 'none'
    : mouseDentro
      ? 'url("/lupa.png") 20 20, zoom-in'
      : "default";

  return (
    <div
      ref={containerRef}
      style={{
        width: width + areaExtra * 2,
        height: height + areaExtra * 2,
        position: "relative",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        cursor: cursorStyle,
        userSelect: "none"
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      tabIndex={0}
    >
      <img
        src={src}
        alt="Redação"
        width={width}
        height={height}
        style={{
          objectFit: "contain",
          borderRadius: 8,
          position: "absolute",
          top: areaExtra,
          left: areaExtra,
          pointerEvents: "none",
          userSelect: "none"
        }}
        draggable={false}
      />
      {/* Exibe a lupa de zoom só enquanto está clicando/segurando */}
      {lupaAtiva && (
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: lupaPos.x - lupaTamanho / 2,
            top: lupaPos.y - lupaTamanho / 2,
            width: lupaTamanho,
            height: lupaTamanho,
            borderRadius: "50%",
            border: "2px solid #1e40af",
            background:
              `url(${src}) -${offsetX * zoom - lupaTamanho / 2}px -${offsetY * zoom - lupaTamanho / 2}px / ${width * zoom}px ${height * zoom}px no-repeat`,
            backgroundColor: "#fff",
            boxShadow: "0 0 8px #1116",
            zIndex: 10,
            cursor: "none",  // Garante que nem dentro do círculo aparece cursor
            overflow: "hidden",
          }}
        ></div>
      )}
    </div>
  );
}
