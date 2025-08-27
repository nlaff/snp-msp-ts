import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [consent, setConsent] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [final, setFinal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, final]);

  async function sendMessage(text?: string) {
    if (!consent) {
      alert("Merci de cocher la case de consentement.");
      return;
    }
    const content = (text ?? input).trim();
    if (!content) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, { role: "user", content }] }),
    });

    const data = await res.json();
    setLoading(false);

    if (data?.ask) {
      setMessages((prev) => [...prev, { role: "assistant", content: data.ask }]);
      return;
    }

    if (data?.final) {
      setFinal(data.final);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Merci, j’ai tout ce qu’il faut. Je prépare votre résumé…" },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Je n’ai pas compris, pouvez-vous reformuler ?" },
    ]);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div className="logo">
          <img src="/Logo_MSP.png" alt="Logo MSP St. Martin sur le Pré" />
        </div>
        <div>
          <h1>MSP St. Martin sur le Pré – Assistant SNP</h1>
          <p className="subtitle">
            Parcours d’accès rapide aux soins non programmés — téléconsultation régulatrice & suivi.
          </p>
        </div>
      </div>

      <div className="card">
        <label>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />{" "}
          J’accepte que mes données soient transmises pour préparer la consultation
        </label>

        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={m.role}>
              <b>{m.role === "user" ? "Vous" : "Assistant"}</b>: {m.content}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {!final && (
          <>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Expliquez votre situation..."
            />
            <button onClick={() => sendMessage()} disabled={loading}>
              {loading ? "Envoi..." : "Envoyer"}
            </button>
          </>
        )}

        {final && (
          <div className="summary">
            <h3>Synthèse générée</h3>
            <pre>{JSON.stringify(final, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
