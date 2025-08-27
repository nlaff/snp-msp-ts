import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState(false); // <- démarre l'UI de chat
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
    setInput("");

    // On calcule la conversation à envoyer à partir du dernier état
    let outgoing: Msg[] = [];
    setMessages((prev) => {
      outgoing = [...prev, { role: "user", content }];
      return outgoing;
    });

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: outgoing }),
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
      { role: "assistant", content: "Je n’ai pas bien compris. Motif, depuis quand et symptômes clés ?" },
    ]);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="page">
      {/* Bannière / entête */}
      <section className="banner card">
        <div className="logoBox">
          <img src="/Logo_MSP.png" alt="Logo MSP" />
        </div>
        <div className="headline">
          <h1>MSP St. Martin sur le Pré – Assistant SNP</h1>
          <p className="sub">
            Parcours d’accès rapide aux soins non programmés (SNP) — téléconsultation régulatrice & suivi.
          </p>
          <div className="palette">
            <span className="sw" style={{ background: "#2B8A84" }} />
            <span className="sw" style={{ background: "#A8C24A" }} />
            <span className="sw" style={{ background: "#B23A35" }} />
            <span className="sw" style={{ background: "#F08A2B" }} />
            <span className="sw" style={{ background: "#F2C23E" }} />
            <span className="sw" style={{ background: "#2B3E42" }} />
          </div>
        </div>
      </section>

      {/* Encadré consentement */}
      <section className="card">
        <h3>Avant de commencer</h3>
        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            J’accepte que mes informations soient utilisées pour{" "}
            <b>préparer la téléconsultation régulatrice</b>. Cet assistant ne remplace pas un avis médical.
            En cas d’urgence vitale, appelez le <b>15</b>.
          </span>
        </label>
      </section>

      {/* Choix du mode (audio placeholder / chat actif) */}
      {!started && (
        <section className="card">
          <h3>Comment souhaitez-vous démarrer ?</h3>
          <div className="btnRow">
            <button className="btn outline" disabled title="À venir">
              🎙️ Démarrer en audio
            </button>
            <button
              className="btn solid"
              onClick={() => {
                if (!consent) {
                  alert("Merci de cocher la case de consentement.");
                  return;
                }
                setStarted(true);
              }}
            >
              💬 Démarrer en chat (écrit)
            </button>
          </div>
          <p className="hint">
            Vous pouvez parler ou écrire, au choix (audio bientôt disponible). L’objectif est de comprendre
            rapidement votre situation et de préparer la consultation.
          </p>
        </section>
      )}

      {/* Zone de chat */}
      {started && (
        <section className="card">
          <h3>Assistant</h3>
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="author">{m.role === "user" ? "Vous" : "Assistant"}</div>
                <div className="bubble">{m.content}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {!final && (
            <div className="composer">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Expliquez votre situation (motif, depuis quand, symptômes)…"
              />
              <button className="btn solid" onClick={() => sendMessage()} disabled={loading}>
                {loading ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          )}

          {final && (
            <div className="summary">
              <h4>Synthèse générée</h4>
              <pre>{JSON.stringify(final, null, 2)}</pre>
            </div>
          )}
        </section>
      )}

      <footer className="footer">
        © MSP St. Martin sur le Pré — Assistant SNP (démo). Logo intégré. Couleurs proches de la charte.
      </footer>

      {/* Styles */}
      <style jsx>{`
        :global(html, body) {
          background: #f6f7f9;
          color: #1f2a30;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
        }
        .page {
          max-width: 980px;
          margin: 24px auto 48px;
          padding: 0 16px;
        }
        .card {
          background: #fff;
          border: 1px solid rgba(31, 42, 48, 0.08);
          border-radius: 14px;
          padding: 16px 18px;
          box-shadow: 0 2px 10px rgba(31, 42, 48, 0.06);
          margin-bottom: 16px;
        }

        /* Bannière */
        .banner {
          display: grid;
          grid-template-columns: 88px 1fr;
          align-items: center;
          gap: 16px;
          background: #e9f4f3;
          border-color: rgba(43, 138, 132, 0.25);
        }
        .logoBox {
          width: 88px;
          height: 88px;
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(31, 42, 48, 0.06);
        }
        .logoBox img {
          max-width: 100%;
          max-height: 100%;
          display: block;
        }
        .headline h1 {
          font-size: 22px;
          margin: 0 0 4px;
          line-height: 1.2;
        }
        .sub {
          margin: 0 0 8px;
          color: #51626a;
        }
        .palette { display: flex; gap: 6px; }
        .sw {
          width: 16px;
          height: 10px;
          border-radius: 4px;
          display: inline-block;
        }

        /* Consentement */
        .consent {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          line-height: 1.5;
          color: #2a363c;
        }
        .consent input {
          margin-top: 3px;
          transform: scale(1.15);
        }

        /* Boutons */
        .btnRow { display: flex; gap: 10px; }
        .btn {
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .btn.solid {
          background: #2b8a84;
          color: #fff;
          border: 1px solid #257a75;
        }
        .btn.solid:hover { filter: brightness(0.98); }
        .btn.outline {
          background: #fff;
          color: #2b3e42;
          border: 1px solid rgba(31,42,48,0.15);
        }
        .hint {
          color: #6a7b84;
          margin-top: 8px;
          font-size: 14px;
        }

        /* Chat */
        .messages {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 10px 0 12px;
          max-height: 360px;
          overflow: auto;
        }
        .msg { display: grid; grid-template-columns: 88px 1fr; align-items: start; gap: 10px; }
        .author { font-weight: 700; color: #51626a; }
        .bubble {
          background: #f3f6f7;
          border: 1px solid rgba(31,42,48,0.08);
          border-radius: 12px;
          padding: 10px 12px;
          white-space: pre-wrap;
        }
        .msg.user .author { color: #2b3e42; }
        .msg.user .bubble { background: #eef6f5; border-color: rgba(43,138,132,0.25); }

        .composer {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: start;
        }
        textarea {
          width: 100%;
          min-height: 82px;
          resize: vertical;
          border-radius: 10px;
          border: 1px solid rgba(31,42,48,0.15);
          padding: 10px 12px;
          font-size: 15px;
        }

        /* Synthèse */
        .summary pre {
          background: #0b0f12;
          color: #eaeef2;
          padding: 12px;
          border-radius: 10px;
          overflow: auto;
          font-size: 13px;
        }

        .footer {
          margin: 18px 4px 0;
          color: #85939a;
          font-size: 13px;
          text-align: center;
        }

        @media (max-width: 560px) {
          .banner { grid-template-columns: 64px 1fr; }
          .logoBox { width: 64px; height: 64px; }
          .msg { grid-template-columns: 74px 1fr; }
        }
      `}</style>
    </div>
  );
}
