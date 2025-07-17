import React from "react";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/700.css";

export default function HeaderGlobal() {
  const nomeEscola = "CEF04 - CCMDF";

  return (
    <div className="w-full px-8 py-5 bg-gradient-to-r from-blue-50 to-white shadow-md rounded-lg dark:from-gray-900 dark:to-gray-800 dark:shadow-lg">
      <h1
        className="text-4xl tracking-tight text-blue-900 dark:text-white"
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
        }}
      >
        {nomeEscola}
      </h1>
    </div>
  );
}
