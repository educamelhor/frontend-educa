// src/components/VoiceAssistant.jsx

import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// ======= OPENAI CONFIGURAÇÃO =======
const OPENAI_API_KEY = "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"; // <-- Coloque sua chave real aqui

async function respostaIA(texto) {
  const endpoint = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: "gpt-3.5-turbo", // ou "gpt-4o" se sua chave permitir
    messages: [{ role: "user", content: texto }],
    max_tokens: 100,
    temperature: 0.6
  };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const resposta = data.choices?.[0]?.message?.content || "Não entendi.";
    return resposta;
  } catch (e) {
    return "Erro ao acessar IA.";
  }
}
// ======= FIM OPENAI =======


// API Web Speech (SpeechRecognition)
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

export default function VoiceAssistant() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  // Iniciar reconhecimento de voz
  const startListening = () => {
    if (!recognition) {
      alert("Reconhecimento de voz não suportado no seu navegador.");
      return;
    }
    setTranscript("");
    setListening(true);

    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const txt = event.results[0][0].transcript;
      setTranscript(txt);
      setListening(false);
      handleCommand(txt);
    };

    recognition.onerror = (event) => {
      setListening(false);
      alert("Erro ao reconhecer voz: " + event.error);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  // Parar reconhecimento (opcional)
  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // Responde e fala via SpeechSynthesis
  const speak = (text) => {
    setResponse(text);
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    window.speechSynthesis.speak(utter);
  };

  // Comandos e integração com IA
  const handleCommand = (txt) => {
    const comando = txt.toLowerCase();

    if (comando.includes("abrir alunos")) {
      speak("Abrindo a lista de alunos.");
      navigate("/secretaria/alunos");
    } else if (comando.includes("qual é o dia hoje")) {
      const dia = new Date().toLocaleDateString("pt-BR");
      speak("Hoje é " + dia);
    } else {
      speak("Só um momento, estou pensando...");
      respostaIA(comando).then(resposta => {
        speak(resposta);
      });
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow w-full max-w-xl mx-auto my-8">
      <h2 className="text-xl font-bold mb-4">Assistente de Voz (MVP)</h2>
      <div className="mb-2">
        <button
          className={`px-4 py-2 rounded ${listening ? "bg-red-500" : "bg-blue-600"} text-white`}
          onClick={listening ? stopListening : startListening}
        >
          {listening ? "Parar" : "Falar"}
        </button>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Comando reconhecido:</span> {transcript}
      </div>
      <div>
        <span className="font-semibold">Resposta da IA:</span> {response}
      </div>
    </div>
  );
}
