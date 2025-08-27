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

    // 👉 nouvelle liste envoyée à l’API et affichée localement
    const outgoing: Msg[] = [...messages, { role: "user" as const, content }];
    setMessages(outgoing);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: outgoing }),
    });

    const data = await res.json();
    setLoading(false);

    if (data?.ask) {
      setMessages((m) => [...m, { role: "assistant" as const, content: data.ask }]);
      return;
    }
    if (data?.final) {
      setFinal(data.final);
      setMessages((m) => [
        ...m,
        { role: "assistant" as const, content: "Merci, j’ai tout ce qu’il faut. Je prépare votre résumé…" },
      ]);
      return;
    }
    setMessages((m) => [
      ...m,
      { role: "assistant" as const, content: "Je n’ai pas compris, pouvez-vous reformuler ?" },
    ]);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const returnUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("return") || ""
      : "";

  function goToMadeforMed() {
    if (!final) return;
    if (final.triage === "URGENT_15") {
      alert("Signe d’alerte détecté. Veuillez appeler le 15.");
      return;
    }
    if (returnUrl) {
      const url = new URL(returnUrl);
      url.searchParams.set("snp_session_id", final.session_id);
      window.location.href = url.toString();
    } else {
      alert("Démo : ici on ouvrirait MadeforMed et on déposerait la synthèse dans le commentaire du RDV.");
    }
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="logo">
          {/* le fichier doit exister dans /public/logo_msp.png */}
          <img src="/logo_msp.png" alt="Logo MSP St. Martin sur le Pré" />
        </div>
        <div>
          <h1>MSP St. Martin sur le Pré – Assistant SNP</h1>
          <p className="subtitle">
            Parcours d’accès rapide aux soins non programmés — téléconsultation régulatrice & suivi.
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
      </div>

      {/* Consent */}
      <div className="card">
        <p className="title">Avant de commencer</p>
        <div className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <p>
            J’accepte que mes informations soient utilisées pour <b>préparer la téléconsultation régulatrice</b>. En cas
            d’urgence vitale, appelez le <b>15</b>.
          </p>
        </div>
      </div>

      {/* Chat */}
      <div className="card">
        <p className="title">Expliquez ce qui vous amène</p>

        <div className="chatbox">
          {messages.length === 0 && <p className="hint">Motif, depuis quand, symptômes, enfant/adulte…</p>}
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.content}
            </div>
          ))}
          {final && <div className="bubble assistant">Merci, j’ai tout ce qu’il faut. Je prépare votre résumé…</div>}
          <div ref={endRef} />
        </div>

        {!final && (
          <div className="row">
            <textarea
              placeholder="Ex. : Mon enfant a 39°C depuis 2 jours, tousse un peu et boit moins."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button className="btn primary" onClick={() => sendMessage()} disabled={loading}>
              Envoyer
            </button>
          </div>
        )}

        {loading && <p className="hint">⏳ L’IA réfléchit…</p>}
      </div>

      {/* Synthèse */}
      {final && (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="tag">Synthèse prête</span>
            <span className="hint">
              Durée estimée : <b>{final.estimated_slot_min} min</b>
            </span>
          </div>
          <div className="synth">
            <p>
              <b>Résumé patient</b>
            </p>
            <p style={{ marginTop: -6 }}>{final.summary_patient}</p>
            <hr />
            <p>
              <b>Résumé médecin</b>
            </p>
            <pre>{final.summary_md}</pre>
            <p className="hint">
              Priorité : <b>{final.triage}</b>
            </p>
          </div>
          <div className="row">
            <button className="btn primary" onClick={goToMadeforMed}>
              Réserver une téléconsultation régulatrice
            </button>
            <button
              className="btn secondary"
              onClick={() => {
                setMessages([]);
                setFinal(null);
                setInput("");
              }}
            >
              Recommencer
            </button>
          </div>
        </div>
      )}

      <div className="footer">© MSP St. Martin sur le Pré – Assistant SNP (démo)</div>

      {/* Styles */}
      <style jsx global>{`
        :root {
          --primary: #2b3e42;
          --secondary: #e8f3ef;
          --text: #17212a;
          --muted: #6b7280;
        }
        html,
        body {
          margin: 0;
          padding: 0;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        }
        .container {
          max-width: 980px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-radius: 16px;
          background: #e8f3ef;
          border: 1px solid rgba(0, 0, 0, 0.06);
        }
        .logo {
          width: 72px;
          height: 72px;
          border-radius: 12px;
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .logo img {
          max-width: 100%;
          max-height: 100%;
        }
        h1 {
          font-size: 26px;
          margin: 0;
          color: var(--text);
        }
        .subtitle {
          margin: 4px 0 0;
          color: var(--muted);
        }
        .palette {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }
        .sw {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
        .card {
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 18px 18px;
          margin: 14px 0;
          box-shadow: 0 8px 26px rgba(0, 0, 0, 0.05);
          background: #fff;
        }
        .title {
          font-weight: 700;
          margin: 0 0 8px;
        }
        .row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .btn {
          border: 0;
          border-radius: 14px;
          padding: 12px 16px;
          font-weight: 800;
          cursor: pointer;
        }
        .btn.primary {
          background: var(--primary);
          color: #fff;
        }
        .btn.secondary {
          background: #f0f2f5;
          color: #111;
        }
        .consent {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .consent p {
          margin: 0;
          color: var(--muted);
        }
        .hint {
          font-size: 13px;
          color: var(--muted);
        }
        textarea {
          flex: 1;
          min-height: 70px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          padding: 12px;
          font-size: 16px;
        }
        .chatbox {
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 12px;
          min-height: 180px;
          margin-bottom: 10px;
        }
        .bubble {
          max-width: 80%;
          padding: 8px 12px;
          border-radius: 12px;
          margin: 8px 0;
        }
        .bubble.user {
          margin-left: auto;
          background: #0b6e4f;
          color: #fff;
        }
        .bubble.assistant {
          margin-right: auto;
          background: #f5f5f5;
          color: #111;
        }
        .tag {
          display: inline-block;
          background: var(--secondary);
          color: var(--primary);
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        .synth {
          background: #fbfbfb;
          border: 1px dashed rgba(0, 0, 0, 0.15);
          padding: 12px;
          border-radius: 12px;
        }
        pre {
          white-space: pre-wrap;
          margin: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
          font-size: 13px;
          background: #fafafa;
          padding: 10px;
          border-radius: 8px;
        }
        hr {
          border: none;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }
        .footer {
          margin-top: 22px;
          color: var(--muted);
          font-size: 12px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
